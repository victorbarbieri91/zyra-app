-- ============================================================================
-- CAMINHO B — Fatura como fonte única (sem espelhar em financeiro_despesas)
--
-- Objetivos:
--   1. Trigger nova garante fatura existe sempre que nasce um lançamento
--   2. criar_ou_atualizar_fatura_cartao deixa de tocar financeiro_despesas
--   3. trigger_recalcular_total_fatura_lancamentos só atualiza fatura
--   4. Drop sync_pagamento_fatura_cartao (não precisa mais espelhar)
--   5. Drop cron + função fechar_faturas_automatico
--   6. Cleanup: apaga as 29 despesas-espelho vinculadas a fatura,
--      preserva as 46 despesas avulsas categoria='cartao_credito' do user
--   7. Reescreve v_extrato_financeiro: branch despesas continua igual,
--      adiciona branch nova lendo de cartoes_credito_faturas
-- ============================================================================

-- ============================================================================
-- 1.1. Trigger AFTER INSERT em cartoes_credito_lancamentos
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trg_garantir_fatura_cartao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  IF NEW.cartao_id IS NOT NULL AND NEW.mes_referencia IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM cartoes_credito_faturas f
        WHERE f.cartao_id = NEW.cartao_id AND f.mes_referencia = NEW.mes_referencia
     )
  THEN
    PERFORM criar_ou_atualizar_fatura_cartao(NEW.cartao_id, NEW.mes_referencia);
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trigger_garantir_fatura_cartao ON public.cartoes_credito_lancamentos;

CREATE TRIGGER trigger_garantir_fatura_cartao
AFTER INSERT ON public.cartoes_credito_lancamentos
FOR EACH ROW EXECUTE FUNCTION public.trg_garantir_fatura_cartao();

-- ============================================================================
-- 1.2. Simplificar criar_ou_atualizar_fatura_cartao
--      (não mexe mais em financeiro_despesas)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.criar_ou_atualizar_fatura_cartao(
  p_cartao_id uuid,
  p_mes_referencia date
)
RETURNS uuid
LANGUAGE plpgsql
AS $function$
DECLARE
  v_cartao RECORD;
  v_fatura_id UUID;
  v_valor_total NUMERIC;
  v_data_vencimento DATE;
  v_ultimo_dia_mes DATE;
  v_mes DATE := DATE_TRUNC('month', p_mes_referencia)::DATE;
BEGIN
  SELECT * INTO v_cartao FROM cartoes_credito WHERE id = p_cartao_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cartao nao encontrado: %', p_cartao_id;
  END IF;

  v_ultimo_dia_mes := (DATE_TRUNC('month', v_mes) + INTERVAL '1 month - 1 day')::DATE;
  IF v_cartao.dia_vencimento > EXTRACT(DAY FROM v_ultimo_dia_mes)::INT THEN
    v_data_vencimento := v_ultimo_dia_mes;
  ELSE
    v_data_vencimento := make_date(EXTRACT(YEAR FROM v_mes)::INT, EXTRACT(MONTH FROM v_mes)::INT, v_cartao.dia_vencimento);
  END IF;

  SELECT COALESCE(SUM(valor), 0) INTO v_valor_total
  FROM cartoes_credito_lancamentos WHERE cartao_id = p_cartao_id AND mes_referencia = v_mes;

  SELECT id INTO v_fatura_id
  FROM cartoes_credito_faturas WHERE cartao_id = p_cartao_id AND mes_referencia = v_mes;

  IF v_fatura_id IS NULL THEN
    INSERT INTO cartoes_credito_faturas (escritorio_id, cartao_id, mes_referencia, data_vencimento, valor_total, status)
    VALUES (v_cartao.escritorio_id, p_cartao_id, v_mes, v_data_vencimento, v_valor_total, 'pendente')
    RETURNING id INTO v_fatura_id;
  ELSE
    UPDATE cartoes_credito_faturas
    SET valor_total = v_valor_total, data_vencimento = v_data_vencimento, updated_at = NOW()
    WHERE id = v_fatura_id AND status != 'paga';
  END IF;

  UPDATE cartoes_credito_lancamentos
  SET fatura_id = v_fatura_id, updated_at = NOW()
  WHERE cartao_id = p_cartao_id AND mes_referencia = v_mes AND (fatura_id IS NULL OR fatura_id != v_fatura_id);

  RETURN v_fatura_id;
END;
$function$;

-- ============================================================================
-- 1.3. Simplificar trigger_recalcular_total_fatura_lancamentos
--      (só atualiza fatura, não financeiro_despesas)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trigger_recalcular_total_fatura_lancamentos()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_fatura_id UUID;
  v_novo_total NUMERIC;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_fatura_id := OLD.fatura_id;
  ELSE
    v_fatura_id := NEW.fatura_id;
  END IF;

  IF v_fatura_id IS NOT NULL THEN
    SELECT COALESCE(SUM(valor), 0) INTO v_novo_total
    FROM cartoes_credito_lancamentos WHERE fatura_id = v_fatura_id;

    UPDATE cartoes_credito_faturas SET valor_total = v_novo_total, updated_at = NOW()
    WHERE id = v_fatura_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- ============================================================================
-- 1.4. Drop sync_pagamento_fatura_cartao
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_sync_pagamento_fatura ON public.financeiro_despesas;
DROP FUNCTION IF EXISTS public.sync_pagamento_fatura_cartao();

-- ============================================================================
-- 1.5. Drop cron + função fechar_faturas_automatico
-- ============================================================================

DO $$
BEGIN
  PERFORM cron.unschedule('fechar-faturas-cartao');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Cron fechar-faturas-cartao não existia ou já foi removido';
END $$;

DROP FUNCTION IF EXISTS public.fechar_faturas_automatico();

-- ============================================================================
-- 1.6. Cleanup: preservar dados de pagamento na fatura antes de apagar despesa
-- ============================================================================

-- Preserva data_pagamento, forma_pagamento e status na fatura
UPDATE cartoes_credito_faturas f
   SET data_pagamento = COALESCE(f.data_pagamento, d.data_pagamento),
       forma_pagamento = COALESCE(f.forma_pagamento, d.forma_pagamento::text),
       status = CASE WHEN d.status = 'pago'::despesa_status_enum THEN 'paga' ELSE f.status END,
       updated_at = NOW()
  FROM financeiro_despesas d
 WHERE f.despesa_id = d.id;

-- Apaga APENAS as 29 despesas vinculadas a fatura (não as 46 avulsas)
DELETE FROM financeiro_despesas
 WHERE id IN (
   SELECT despesa_id FROM cartoes_credito_faturas WHERE despesa_id IS NOT NULL
 );

-- Drop coluna despesa_id (não tem mais sentido)
ALTER TABLE cartoes_credito_faturas DROP COLUMN IF EXISTS despesa_id;

-- ============================================================================
-- 1.7. Reescrever v_extrato_financeiro
-- ============================================================================
-- IMPORTANTE: branch de despesas (#3) NÃO filtra cartao_credito.
-- As 46 despesas avulsas com categoria='cartao_credito' continuam aparecendo.
-- A duplicação não acontece porque as 29 espelho foram apagadas no item 1.6.

CREATE OR REPLACE VIEW public.v_extrato_financeiro
WITH (security_invoker = on)
AS
-- 1. RECEITAS
SELECT r.id, r.escritorio_id, 'receita'::text AS tipo_movimento,
  CASE
    WHEN r.status = 'pago'::receita_status_enum THEN 'efetivado'::text
    WHEN r.status = 'parcial'::receita_status_enum THEN 'parcial'::text
    WHEN r.status = 'atrasado'::receita_status_enum THEN 'vencido'::text
    ELSE 'pendente'::text
  END AS status,
  r.tipo::text AS origem,
  r.categoria::text AS categoria,
  r.descricao, r.valor, r.valor_pago,
  COALESCE(r.valor_bruto, r.valor) AS valor_bruto,
  CASE
    WHEN r.status = 'pago'::receita_status_enum AND r.valor_pago IS NOT NULL AND r.valor_pago > 0::numeric THEN r.valor_pago
    ELSE COALESCE(r.valor_liquido, r.valor)
  END AS valor_liquido,
  r.total_retencoes,
  COALESCE(r.data_pagamento, r.data_vencimento) AS data_referencia,
  r.data_vencimento, r.data_pagamento AS data_efetivacao,
  COALESCE(c_r.nome_completo, 'Avulsa'::text) AS entidade,
  r.conta_bancaria_id,
  (cb_r.banco || ' - '::text) || cb_r.numero_conta AS conta_bancaria_nome,
  r.id AS origem_id, r.processo_id, r.cliente_id,
  NULL::uuid AS aprovado_por, NULL::timestamp with time zone AS data_aprovacao,
  NULL::text AS motivo_rejeicao, NULL::date AS data_pagamento_programada,
  NULL::text AS observacoes_financeiro, NULL::boolean AS auto_pagamento
FROM financeiro_receitas r
LEFT JOIN crm_pessoas c_r ON c_r.id = r.cliente_id
LEFT JOIN financeiro_contas_bancarias cb_r ON cb_r.id = r.conta_bancaria_id
WHERE r.status <> 'cancelado'::receita_status_enum
  AND (r.fatura_id IS NULL OR (EXISTS (
    SELECT 1 FROM financeiro_faturamento_faturas ff
    WHERE ff.id = r.fatura_id AND (ff.status = ANY (ARRAY['parcialmente_paga'::text, 'paga'::text]))
  )))
  AND user_has_access_to_grupo(r.escritorio_id)
  AND NOT (EXISTS (
    SELECT 1 FROM financeiro_levantamentos fl
    WHERE fl.receita_id = r.id AND fl.status <> 'cancelado'::text
  ))
  AND NOT (EXISTS (
    SELECT 1 FROM financeiro_notas_debito nd
    WHERE nd.receita_id = r.id AND (nd.status <> ALL (ARRAY['rascunho'::nota_debito_status, 'cancelada'::nota_debito_status]))
  ))

UNION ALL

-- 2. FATURAS DE FATURAMENTO (cliente)
SELECT f.id, f.escritorio_id, 'receita'::text AS tipo_movimento,
  CASE
    WHEN f.status = 'paga'::text THEN 'efetivado'::text
    WHEN f.status = 'parcialmente_paga'::text AND f.data_vencimento_saldo IS NOT NULL AND f.data_vencimento_saldo < CURRENT_DATE THEN 'vencido'::text
    WHEN f.status = 'parcialmente_paga'::text THEN 'parcial'::text
    WHEN f.status = 'atrasada'::text THEN 'vencido'::text
    WHEN (f.status = ANY (ARRAY['emitida'::text, 'enviada'::text])) AND f.data_vencimento < CURRENT_DATE THEN 'vencido'::text
    WHEN f.status = 'cancelada'::text THEN 'cancelado'::text
    ELSE 'pendente'::text
  END AS status,
  'fatura'::text AS origem, 'fatura'::text AS categoria,
  COALESCE(f.descricao, 'Fatura '::text || f.numero_fatura) AS descricao,
  f.valor_total AS valor, COALESCE(f.valor_pago, 0::numeric) AS valor_pago,
  f.valor_total AS valor_bruto, COALESCE(f.valor_liquido, f.valor_total) AS valor_liquido,
  f.total_retencoes,
  COALESCE(f.paga_em::date,
    CASE WHEN f.status = 'parcialmente_paga'::text AND f.data_vencimento_saldo IS NOT NULL THEN f.data_vencimento_saldo
         ELSE f.data_vencimento END) AS data_referencia,
  CASE WHEN f.status = 'parcialmente_paga'::text AND f.data_vencimento_saldo IS NOT NULL THEN f.data_vencimento_saldo
       ELSE f.data_vencimento END AS data_vencimento,
  f.paga_em::date AS data_efetivacao,
  c.nome_completo AS entidade,
  f.conta_bancaria_id,
  (cb_f.banco || ' - '::text) || cb_f.numero_conta AS conta_bancaria_nome,
  f.id AS origem_id, NULL::uuid AS processo_id, f.cliente_id,
  NULL::uuid AS aprovado_por, NULL::timestamp with time zone AS data_aprovacao,
  NULL::text AS motivo_rejeicao, NULL::date AS data_pagamento_programada,
  NULL::text AS observacoes_financeiro, NULL::boolean AS auto_pagamento
FROM financeiro_faturamento_faturas f
LEFT JOIN crm_pessoas c ON c.id = f.cliente_id
LEFT JOIN financeiro_contas_bancarias cb_f ON cb_f.id = f.conta_bancaria_id
WHERE (f.status <> ALL (ARRAY['rascunho'::text, 'cancelada'::text, 'paga'::text, 'parcialmente_paga'::text]))
  AND user_has_access_to_grupo(f.escritorio_id)

UNION ALL

-- 3. DESPESAS (inclui as 46 avulsas categoria='cartao_credito' criadas pelo user)
SELECT d.id, d.escritorio_id, 'despesa'::text AS tipo_movimento,
  CASE
    WHEN d.status = 'pago'::despesa_status_enum THEN 'efetivado'::text
    WHEN d.status = 'liberado'::despesa_status_enum THEN 'liberado'::text
    WHEN d.status = 'agendado'::despesa_status_enum THEN 'agendado'::text
    WHEN COALESCE(d.data_pagamento_programada, d.data_vencimento) < CURRENT_DATE AND d.status = 'pendente'::despesa_status_enum THEN 'vencido'::text
    ELSE 'pendente'::text
  END AS status,
  CASE
    WHEN d.categoria = 'cartao_credito'::despesa_categoria_enum THEN 'cartao_credito'::text
    ELSE 'despesa'::text
  END AS origem,
  d.categoria::text AS categoria,
  d.descricao, d.valor,
  CASE WHEN d.status = 'pago'::despesa_status_enum THEN d.valor ELSE NULL::numeric END AS valor_pago,
  d.valor AS valor_bruto, d.valor AS valor_liquido,
  0::numeric AS total_retencoes,
  COALESCE(d.data_pagamento, d.data_pagamento_programada, d.data_vencimento) AS data_referencia,
  COALESCE(d.data_pagamento_programada, d.data_vencimento) AS data_vencimento,
  d.data_pagamento AS data_efetivacao,
  d.fornecedor AS entidade,
  d.conta_bancaria_id,
  (cb_d.banco || ' - '::text) || cb_d.numero_conta AS conta_bancaria_nome,
  d.id AS origem_id, d.processo_id, d.cliente_id,
  d.aprovado_por, d.data_aprovacao, d.motivo_rejeicao,
  d.data_pagamento_programada, d.observacoes_financeiro, d.auto_pagamento
FROM financeiro_despesas d
LEFT JOIN financeiro_contas_bancarias cb_d ON cb_d.id = d.conta_bancaria_id
WHERE d.status <> 'cancelado'::despesa_status_enum
  AND user_has_access_to_grupo(d.escritorio_id)

UNION ALL

-- 4. TRANSFERÊNCIAS SAÍDA
SELECT t.id, t.escritorio_id, 'transferencia_saida'::text AS tipo_movimento,
  'efetivado'::text AS status, 'transferencia'::text AS origem, 'transferencia'::text AS categoria,
  COALESCE(t.descricao, (('Transferência de '::text || cb_orig.banco) || ' para '::text) || cb_dest.banco) AS descricao,
  t.valor, t.valor AS valor_pago, t.valor AS valor_bruto, t.valor AS valor_liquido,
  0::numeric AS total_retencoes,
  t.data_transferencia AS data_referencia, t.data_transferencia AS data_vencimento, t.data_transferencia AS data_efetivacao,
  (cb_dest.banco || ' - '::text) || cb_dest.numero_conta AS entidade,
  t.conta_origem_id AS conta_bancaria_id,
  (cb_orig.banco || ' - '::text) || cb_orig.numero_conta AS conta_bancaria_nome,
  t.id AS origem_id, NULL::uuid AS processo_id, NULL::uuid AS cliente_id,
  NULL::uuid AS aprovado_por, NULL::timestamp with time zone AS data_aprovacao,
  NULL::text AS motivo_rejeicao, NULL::date AS data_pagamento_programada,
  NULL::text AS observacoes_financeiro, NULL::boolean AS auto_pagamento
FROM financeiro_transferencias t
JOIN financeiro_contas_bancarias cb_orig ON cb_orig.id = t.conta_origem_id
JOIN financeiro_contas_bancarias cb_dest ON cb_dest.id = t.conta_destino_id
WHERE user_has_access_to_grupo(t.escritorio_id)

UNION ALL

-- 5. TRANSFERÊNCIAS ENTRADA
SELECT t.id, t.escritorio_id, 'transferencia_entrada'::text AS tipo_movimento,
  'efetivado'::text AS status, 'transferencia'::text AS origem, 'transferencia'::text AS categoria,
  COALESCE(t.descricao, 'Transferência de '::text || cb_orig.banco) AS descricao,
  t.valor, t.valor AS valor_pago, t.valor AS valor_bruto, t.valor AS valor_liquido,
  0::numeric AS total_retencoes,
  t.data_transferencia AS data_referencia, t.data_transferencia AS data_vencimento, t.data_transferencia AS data_efetivacao,
  (cb_orig.banco || ' - '::text) || cb_orig.numero_conta AS entidade,
  t.conta_destino_id AS conta_bancaria_id,
  (cb_dest.banco || ' - '::text) || cb_dest.numero_conta AS conta_bancaria_nome,
  t.id AS origem_id, NULL::uuid AS processo_id, NULL::uuid AS cliente_id,
  NULL::uuid AS aprovado_por, NULL::timestamp with time zone AS data_aprovacao,
  NULL::text AS motivo_rejeicao, NULL::date AS data_pagamento_programada,
  NULL::text AS observacoes_financeiro, NULL::boolean AS auto_pagamento
FROM financeiro_transferencias t
JOIN financeiro_contas_bancarias cb_orig ON cb_orig.id = t.conta_origem_id
JOIN financeiro_contas_bancarias cb_dest ON cb_dest.id = t.conta_destino_id
WHERE user_has_access_to_grupo(t.escritorio_id)

UNION ALL

-- 6. NOTAS DE DÉBITO
SELECT nd.id, nd.escritorio_id, 'receita'::text AS tipo_movimento,
  CASE
    WHEN nd.status = 'paga'::nota_debito_status THEN 'efetivado'::text
    WHEN nd.status = 'parcialmente_paga'::nota_debito_status AND nd.data_vencimento_saldo IS NOT NULL AND nd.data_vencimento_saldo < CURRENT_DATE THEN 'vencido'::text
    WHEN nd.status = 'parcialmente_paga'::nota_debito_status THEN 'parcial'::text
    WHEN nd.data_vencimento < CURRENT_DATE AND (nd.status = ANY (ARRAY['emitida'::nota_debito_status, 'enviada'::nota_debito_status])) THEN 'vencido'::text
    ELSE 'pendente'::text
  END AS status,
  'nota_debito'::text AS origem, 'custas_reembolsadas'::text AS categoria,
  'Nota de Débito '::text || nd.numero AS descricao,
  nd.valor_total AS valor, COALESCE(nd.valor_pago, 0::numeric) AS valor_pago,
  nd.valor_total AS valor_bruto, nd.valor_total AS valor_liquido,
  0::numeric AS total_retencoes,
  COALESCE(nd.data_pagamento,
    CASE WHEN nd.status = 'parcialmente_paga'::nota_debito_status AND nd.data_vencimento_saldo IS NOT NULL THEN nd.data_vencimento_saldo
         ELSE nd.data_vencimento END) AS data_referencia,
  CASE WHEN nd.status = 'parcialmente_paga'::nota_debito_status AND nd.data_vencimento_saldo IS NOT NULL THEN nd.data_vencimento_saldo
       ELSE nd.data_vencimento END AS data_vencimento,
  nd.data_pagamento AS data_efetivacao,
  c_nd.nome_completo AS entidade,
  nd.conta_bancaria_id,
  (cb_nd.banco || ' - '::text) || cb_nd.numero_conta AS conta_bancaria_nome,
  nd.id AS origem_id, NULL::uuid AS processo_id, nd.cliente_id,
  NULL::uuid AS aprovado_por, NULL::timestamp with time zone AS data_aprovacao,
  NULL::text AS motivo_rejeicao, NULL::date AS data_pagamento_programada,
  NULL::text AS observacoes_financeiro, NULL::boolean AS auto_pagamento
FROM financeiro_notas_debito nd
LEFT JOIN crm_pessoas c_nd ON c_nd.id = nd.cliente_id
LEFT JOIN financeiro_contas_bancarias cb_nd ON cb_nd.id = nd.conta_bancaria_id
WHERE (nd.status <> ALL (ARRAY['rascunho'::nota_debito_status, 'cancelada'::nota_debito_status]))
  AND user_has_access_to_grupo(nd.escritorio_id)

UNION ALL

-- 7. LEVANTAMENTOS
SELECT l.id, l.escritorio_id, 'levantamento'::text AS tipo_movimento,
  CASE
    WHEN l.status = 'cancelado'::text THEN 'cancelado'::text
    WHEN l.status = 'concluido'::text THEN 'efetivado'::text
    WHEN l.status = 'parcial'::text THEN 'parcial'::text
    ELSE 'pendente'::text
  END AS status,
  'levantamento'::text AS origem, l.origem AS categoria,
  l.descricao, l.valor_total AS valor,
  CASE WHEN l.retencao_recebida THEN l.valor_retido ELSE 0::numeric END AS valor_pago,
  l.valor_total AS valor_bruto, l.valor_total AS valor_liquido,
  0::numeric AS total_retencoes,
  l.data_levantamento AS data_referencia, l.data_levantamento AS data_vencimento,
  CASE WHEN l.status = 'concluido'::text THEN l.data_levantamento ELSE NULL::date END AS data_efetivacao,
  c_l.nome_completo AS entidade,
  l.conta_bancaria_id,
  (cb_l.banco || ' - '::text) || cb_l.numero_conta AS conta_bancaria_nome,
  l.id AS origem_id, l.processo_id, l.cliente_id,
  NULL::uuid AS aprovado_por, NULL::timestamp with time zone AS data_aprovacao,
  NULL::text AS motivo_rejeicao, NULL::date AS data_pagamento_programada,
  NULL::text AS observacoes_financeiro, NULL::boolean AS auto_pagamento
FROM financeiro_levantamentos l
LEFT JOIN crm_pessoas c_l ON c_l.id = l.cliente_id
LEFT JOIN financeiro_contas_bancarias cb_l ON cb_l.id = l.conta_bancaria_id
WHERE l.status <> 'cancelado'::text
  AND user_has_access_to_grupo(l.escritorio_id)

UNION ALL

-- 8. FATURAS DE CARTÃO DE CRÉDITO (NOVO — fonte única)
SELECT
  f.id,
  f.escritorio_id,
  'despesa'::text AS tipo_movimento,
  CASE
    WHEN f.status = 'paga' THEN 'efetivado'::text
    WHEN f.data_vencimento < CURRENT_DATE AND f.status = 'pendente' THEN 'vencido'::text
    ELSE 'pendente'::text
  END AS status,
  'cartao_credito'::text AS origem,
  'cartao_credito'::text AS categoria,
  'Fatura ' || c.nome || ' - ' || TO_CHAR(f.mes_referencia, 'MM/YYYY') AS descricao,
  f.valor_total AS valor,
  CASE WHEN f.status = 'paga' THEN f.valor_total ELSE NULL::numeric END AS valor_pago,
  f.valor_total AS valor_bruto,
  f.valor_total AS valor_liquido,
  0::numeric AS total_retencoes,
  COALESCE(f.data_pagamento, f.data_vencimento) AS data_referencia,
  f.data_vencimento,
  f.data_pagamento AS data_efetivacao,
  c.banco || ' - ' || c.nome AS entidade,
  NULL::uuid AS conta_bancaria_id,
  NULL::text AS conta_bancaria_nome,
  f.id AS origem_id,
  NULL::uuid AS processo_id,
  NULL::uuid AS cliente_id,
  NULL::uuid AS aprovado_por,
  NULL::timestamp with time zone AS data_aprovacao,
  NULL::text AS motivo_rejeicao,
  NULL::date AS data_pagamento_programada,
  NULL::text AS observacoes_financeiro,
  NULL::boolean AS auto_pagamento
FROM cartoes_credito_faturas f
JOIN cartoes_credito c ON c.id = f.cartao_id
WHERE f.valor_total > 0
  AND user_has_access_to_grupo(f.escritorio_id);
