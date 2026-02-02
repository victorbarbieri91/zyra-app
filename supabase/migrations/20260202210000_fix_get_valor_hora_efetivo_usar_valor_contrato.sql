-- ============================================================
-- FIX: get_valor_hora_efetivo e v_lancamentos_prontos_faturar
--
-- PROBLEMA: A view chamava a função duas vezes com COALESCE no resultado.
-- Quando processo_id era NULL, a função retornava o valor padrão do cargo
-- (R$ 1.150) em vez de usar o contrato da consulta.
--
-- SOLUÇÃO:
-- 1. Função: valor_negociado (campo input) > valor_padrao (referência)
-- 2. View: COALESCE no contrato_id ANTES de chamar a função
--
-- O CONTRATO É A REGRA! Sempre usar o valor configurado nele.
-- ============================================================

-- 1. FUNÇÃO CORRIGIDA
CREATE OR REPLACE FUNCTION get_valor_hora_efetivo(
  p_contrato_id UUID,
  p_user_id UUID
) RETURNS NUMERIC AS $$
DECLARE
  v_valor NUMERIC;
  v_cargo_id UUID;
  v_config JSONB;
  v_valor_cargo JSONB;
BEGIN
  -- Buscar cargo do usuário (priorizar entrada COM cargo definido)
  SELECT cargo_id INTO v_cargo_id
  FROM escritorios_usuarios
  WHERE user_id = p_user_id
  AND cargo_id IS NOT NULL
  LIMIT 1;

  -- Se temos contrato, buscar config
  IF p_contrato_id IS NOT NULL THEN
    SELECT config INTO v_config
    FROM financeiro_contratos_honorarios
    WHERE id = p_contrato_id;

    -- 1. Tentar valor do cargo no config.valores_por_cargo do contrato
    IF v_cargo_id IS NOT NULL AND v_config IS NOT NULL AND v_config->'valores_por_cargo' IS NOT NULL THEN
      -- Buscar o objeto do cargo específico no array
      SELECT elem INTO v_valor_cargo
      FROM jsonb_array_elements(v_config->'valores_por_cargo') AS elem
      WHERE (elem->>'cargo_id')::uuid = v_cargo_id
      LIMIT 1;

      IF v_valor_cargo IS NOT NULL THEN
        -- CORRETO: valor_negociado é o valor configurado NO CONTRATO (campo input)
        -- valor_padrao é apenas referência visual do cargo (fallback)
        v_valor := COALESCE(
          (v_valor_cargo->>'valor_negociado')::numeric,
          (v_valor_cargo->>'valor_padrao')::numeric
        );
        IF v_valor IS NOT NULL THEN
          RETURN v_valor;
        END IF;
      END IF;
    END IF;

    -- 2. Tentar valor_hora genérico do config (para contratos por_hora)
    IF v_config IS NOT NULL AND v_config->>'valor_hora' IS NOT NULL THEN
      v_valor := (v_config->>'valor_hora')::numeric;
      IF v_valor IS NOT NULL THEN
        RETURN v_valor;
      END IF;
    END IF;
  END IF;

  -- 3. Fallback: valor padrão do cargo no escritório
  IF v_cargo_id IS NOT NULL THEN
    SELECT valor_hora_padrao INTO v_valor
    FROM escritorios_cargos
    WHERE id = v_cargo_id;

    IF v_valor IS NOT NULL THEN
      RETURN v_valor;
    END IF;
  END IF;

  -- 4. Fallback final
  RETURN 400;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_valor_hora_efetivo IS
  'Retorna valor hora efetivo: valor_negociado do contrato (campo input) > valor_padrao (referência) > padrão do cargo > R$400';

-- 2. VIEW CORRIGIDA
CREATE OR REPLACE VIEW v_lancamentos_prontos_faturar AS
-- Receitas (honorários e parcelas)
SELECT
  r.id as lancamento_id,
  'honorario' as tipo_lancamento,
  r.escritorio_id,
  r.cliente_id,
  c.nome_completo as cliente_nome,
  c.email as cliente_email,
  r.descricao,
  r.valor,
  NULL::numeric as horas,
  r.processo_id,
  r.consulta_id,
  p.numero_cnj as processo_numero,
  p.numero_pasta as processo_pasta,
  CONCAT(p.autor, ' x ', p.reu) as partes_resumo,
  r.categoria::text as categoria,
  r.tipo::text as subtipo,
  r.data_vencimento,
  r.created_at,
  NULL::uuid as fechamento_id,
  NULL::integer as qtd_processos,
  NULL::numeric as valor_unitario,
  NULL::jsonb as processos_lista,
  NULL::date as competencia
FROM financeiro_receitas r
LEFT JOIN crm_pessoas c ON c.id = r.cliente_id
LEFT JOIN processos_processos p ON p.id = r.processo_id
WHERE r.status = 'pendente'
  AND r.tipo IN ('honorario', 'parcela', 'avulso', 'saldo')
  AND r.fatura_id IS NULL
  AND (r.parcelado = false OR r.tipo != 'honorario')

UNION ALL

-- Timesheet (horas trabalhadas) - CORRIGIDO: COALESCE no contrato_id
SELECT
  t.id as lancamento_id,
  'timesheet' as tipo_lancamento,
  t.escritorio_id,
  COALESCE(
    (cont_proc.grupo_clientes->>'cliente_pagador_id')::uuid,
    (cont_cons.grupo_clientes->>'cliente_pagador_id')::uuid,
    p.cliente_id,
    cons.cliente_id
  ) as cliente_id,
  COALESCE(cpagador_proc.nome_completo, cpagador_cons.nome_completo, c_proc.nome_completo, c_cons.nome_completo) as cliente_nome,
  COALESCE(cpagador_proc.email, cpagador_cons.email, c_proc.email, c_cons.email) as cliente_email,
  t.atividade as descricao,
  -- CORRIGIDO: Usar COALESCE no contrato_id, não no resultado da função
  t.horas * COALESCE(
    get_valor_hora_efetivo(COALESCE(p.contrato_id, cons.contrato_id), t.user_id),
    0
  ) as valor,
  t.horas,
  t.processo_id,
  t.consulta_id,
  p.numero_cnj as processo_numero,
  p.numero_pasta as processo_pasta,
  CONCAT(p.autor, ' x ', p.reu) as partes_resumo,
  'timesheet' as categoria,
  NULL::text as subtipo,
  t.data_trabalho as data_vencimento,
  t.created_at,
  NULL::uuid as fechamento_id,
  NULL::integer as qtd_processos,
  NULL::numeric as valor_unitario,
  NULL::jsonb as processos_lista,
  NULL::date as competencia
FROM financeiro_timesheet t
LEFT JOIN processos_processos p ON p.id = t.processo_id
LEFT JOIN crm_pessoas c_proc ON c_proc.id = p.cliente_id
LEFT JOIN financeiro_contratos_honorarios cont_proc ON cont_proc.id = p.contrato_id
LEFT JOIN crm_pessoas cpagador_proc ON cpagador_proc.id = (cont_proc.grupo_clientes->>'cliente_pagador_id')::uuid
LEFT JOIN consultivo_consultas cons ON cons.id = t.consulta_id
LEFT JOIN crm_pessoas c_cons ON c_cons.id = cons.cliente_id
LEFT JOIN financeiro_contratos_honorarios cont_cons ON cont_cons.id = cons.contrato_id
LEFT JOIN crm_pessoas cpagador_cons ON cpagador_cons.id = (cont_cons.grupo_clientes->>'cliente_pagador_id')::uuid
WHERE t.faturavel = true
  AND t.faturado = false
  AND t.aprovado = true

UNION ALL

-- Despesas reembolsáveis
SELECT
  d.id as lancamento_id,
  'despesa' as tipo_lancamento,
  d.escritorio_id,
  COALESCE(
    (cont_proc.grupo_clientes->>'cliente_pagador_id')::uuid,
    (cont_cons.grupo_clientes->>'cliente_pagador_id')::uuid,
    d.cliente_id,
    p.cliente_id,
    cons.cliente_id
  ) as cliente_id,
  COALESCE(cpagador_proc.nome_completo, cpagador_cons.nome_completo, c.nome_completo, c_proc.nome_completo, c_cons.nome_completo) as cliente_nome,
  COALESCE(cpagador_proc.email, cpagador_cons.email, c.email, c_proc.email, c_cons.email) as cliente_email,
  d.descricao,
  d.valor,
  NULL::numeric as horas,
  d.processo_id,
  d.consultivo_id as consulta_id,
  p.numero_cnj as processo_numero,
  p.numero_pasta as processo_pasta,
  CONCAT(p.autor, ' x ', p.reu) as partes_resumo,
  d.categoria::text as categoria,
  'reembolso' as subtipo,
  d.data_vencimento,
  d.created_at,
  NULL::uuid as fechamento_id,
  NULL::integer as qtd_processos,
  NULL::numeric as valor_unitario,
  NULL::jsonb as processos_lista,
  NULL::date as competencia
FROM financeiro_despesas d
LEFT JOIN crm_pessoas c ON c.id = d.cliente_id
LEFT JOIN processos_processos p ON p.id = d.processo_id
LEFT JOIN crm_pessoas c_proc ON c_proc.id = p.cliente_id
LEFT JOIN financeiro_contratos_honorarios cont_proc ON cont_proc.id = p.contrato_id
LEFT JOIN crm_pessoas cpagador_proc ON cpagador_proc.id = (cont_proc.grupo_clientes->>'cliente_pagador_id')::uuid
LEFT JOIN consultivo_consultas cons ON cons.id = d.consultivo_id
LEFT JOIN crm_pessoas c_cons ON c_cons.id = cons.cliente_id
LEFT JOIN financeiro_contratos_honorarios cont_cons ON cont_cons.id = cons.contrato_id
LEFT JOIN crm_pessoas cpagador_cons ON cpagador_cons.id = (cont_cons.grupo_clientes->>'cliente_pagador_id')::uuid
WHERE d.reembolsavel = true
  AND d.reembolsado = false
  AND d.status = 'pago'

UNION ALL

-- Fechamentos de pasta
SELECT
  fp.id as lancamento_id,
  'pasta' as tipo_lancamento,
  fp.escritorio_id,
  fp.cliente_id,
  c.nome_completo as cliente_nome,
  c.email as cliente_email,
  'Honorários por pasta - ' || TO_CHAR(fp.competencia, 'MM/YYYY') as descricao,
  fp.valor_total as valor,
  NULL::numeric as horas,
  NULL::uuid as processo_id,
  NULL::uuid as consulta_id,
  NULL::text as processo_numero,
  NULL::text as processo_pasta,
  NULL::text as partes_resumo,
  'pasta' as categoria,
  'pasta' as subtipo,
  (fp.competencia + INTERVAL '1 month')::date as data_vencimento,
  fp.created_at,
  fp.id as fechamento_id,
  fp.qtd_processos,
  fp.valor_unitario,
  fp.processos as processos_lista,
  fp.competencia
FROM financeiro_fechamentos_pasta fp
LEFT JOIN crm_pessoas c ON c.id = fp.cliente_id
WHERE fp.status = 'aprovado'
  AND fp.fatura_id IS NULL;

COMMENT ON VIEW v_lancamentos_prontos_faturar IS
  'Unifica receitas, timesheet e despesas reembolsáveis prontos para faturar. Usa contrato do processo OU da consulta para calcular valor_hora.';
