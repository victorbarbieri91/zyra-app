-- Fase 1 — Ajuste em v_extrato_financeiro
-- No bloco de receitas, valor_liquido passa a refletir o que efetivamente entrou
-- no caixa quando a receita está paga (= valor_pago, líquido recebido).
-- Antes mostrava sempre o valor (bruto), causando confusão em receitas vinculadas
-- a fatura com retenção (FAT-015 entrou R$ 603,57, mas extrato mostrava R$ 633).
-- Para receitas pendentes/atrasadas, valor_liquido continua sendo valor (a receber).

CREATE OR REPLACE VIEW v_extrato_financeiro AS
  -- Bloco 1: receitas (avulsas e vinculadas a fatura paga/parcialmente_paga)
  SELECT r.id,
    r.escritorio_id,
    'receita'::text AS tipo_movimento,
    CASE
        WHEN r.status = 'pago'::receita_status_enum THEN 'efetivado'::text
        WHEN r.status = 'parcial'::receita_status_enum THEN 'parcial'::text
        WHEN r.status = 'atrasado'::receita_status_enum THEN 'vencido'::text
        ELSE 'pendente'::text
    END AS status,
    r.tipo::text AS origem,
    r.categoria::text AS categoria,
    r.descricao,
    r.valor,
    r.valor_pago,
    COALESCE(r.valor_bruto, r.valor) AS valor_bruto,
    -- valor_liquido = caixa real: valor_pago quando pago, valor quando pendente
    CASE
        WHEN r.status = 'pago'::receita_status_enum AND r.valor_pago IS NOT NULL AND r.valor_pago > 0 THEN r.valor_pago
        ELSE COALESCE(r.valor_liquido, r.valor)
    END AS valor_liquido,
    r.total_retencoes,
    COALESCE(r.data_pagamento, r.data_vencimento) AS data_referencia,
    r.data_vencimento,
    r.data_pagamento AS data_efetivacao,
    COALESCE(c_r.nome_completo, 'Avulsa'::text) AS entidade,
    r.conta_bancaria_id,
    (cb_r.banco || ' - '::text) || cb_r.numero_conta AS conta_bancaria_nome,
    r.id AS origem_id,
    r.processo_id,
    r.cliente_id,
    NULL::uuid AS aprovado_por,
    NULL::timestamp with time zone AS data_aprovacao,
    NULL::text AS motivo_rejeicao,
    NULL::date AS data_pagamento_programada,
    NULL::text AS observacoes_financeiro,
    NULL::boolean AS auto_pagamento
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
  -- Bloco 2: faturas em aberto
  SELECT f.id,
    f.escritorio_id,
    'receita'::text AS tipo_movimento,
    CASE
        WHEN f.status = 'paga'::text THEN 'efetivado'::text
        WHEN f.status = 'parcialmente_paga'::text AND f.data_vencimento_saldo IS NOT NULL AND f.data_vencimento_saldo < CURRENT_DATE THEN 'vencido'::text
        WHEN f.status = 'parcialmente_paga'::text THEN 'parcial'::text
        WHEN f.status = 'atrasada'::text THEN 'vencido'::text
        WHEN (f.status = ANY (ARRAY['emitida'::text, 'enviada'::text])) AND f.data_vencimento < CURRENT_DATE THEN 'vencido'::text
        WHEN f.status = 'cancelada'::text THEN 'cancelado'::text
        ELSE 'pendente'::text
    END AS status,
    'fatura'::text AS origem,
    'fatura'::text AS categoria,
    COALESCE(f.descricao, 'Fatura '::text || f.numero_fatura) AS descricao,
    f.valor_total AS valor,
    COALESCE(f.valor_pago, 0::numeric) AS valor_pago,
    f.valor_total AS valor_bruto,
    COALESCE(f.valor_liquido, f.valor_total) AS valor_liquido,
    f.total_retencoes,
    COALESCE(f.paga_em::date,
        CASE
            WHEN f.status = 'parcialmente_paga'::text AND f.data_vencimento_saldo IS NOT NULL THEN f.data_vencimento_saldo
            ELSE f.data_vencimento
        END) AS data_referencia,
    CASE
        WHEN f.status = 'parcialmente_paga'::text AND f.data_vencimento_saldo IS NOT NULL THEN f.data_vencimento_saldo
        ELSE f.data_vencimento
    END AS data_vencimento,
    f.paga_em::date AS data_efetivacao,
    c.nome_completo AS entidade,
    f.conta_bancaria_id,
    (cb_f.banco || ' - '::text) || cb_f.numero_conta AS conta_bancaria_nome,
    f.id AS origem_id,
    NULL::uuid AS processo_id,
    f.cliente_id,
    NULL::uuid AS aprovado_por,
    NULL::timestamp with time zone AS data_aprovacao,
    NULL::text AS motivo_rejeicao,
    NULL::date AS data_pagamento_programada,
    NULL::text AS observacoes_financeiro,
    NULL::boolean AS auto_pagamento
   FROM financeiro_faturamento_faturas f
     LEFT JOIN crm_pessoas c ON c.id = f.cliente_id
     LEFT JOIN financeiro_contas_bancarias cb_f ON cb_f.id = f.conta_bancaria_id
  WHERE (f.status <> ALL (ARRAY['rascunho'::text, 'cancelada'::text, 'paga'::text, 'parcialmente_paga'::text]))
    AND user_has_access_to_grupo(f.escritorio_id)
UNION ALL
  -- Bloco 3: despesas
  SELECT d.id, d.escritorio_id, 'despesa'::text,
    CASE
        WHEN d.status = 'pago'::despesa_status_enum THEN 'efetivado'::text
        WHEN d.status = 'liberado'::despesa_status_enum THEN 'liberado'::text
        WHEN d.status = 'agendado'::despesa_status_enum THEN 'agendado'::text
        WHEN COALESCE(d.data_pagamento_programada, d.data_vencimento) < CURRENT_DATE AND d.status = 'pendente'::despesa_status_enum THEN 'vencido'::text
        ELSE 'pendente'::text
    END,
    CASE WHEN d.categoria = 'cartao_credito'::despesa_categoria_enum THEN 'cartao_credito'::text ELSE 'despesa'::text END,
    d.categoria::text, d.descricao, d.valor,
    CASE WHEN d.status = 'pago'::despesa_status_enum THEN d.valor ELSE NULL::numeric END,
    d.valor, d.valor, 0::numeric,
    COALESCE(d.data_pagamento, d.data_pagamento_programada, d.data_vencimento),
    COALESCE(d.data_pagamento_programada, d.data_vencimento),
    d.data_pagamento, d.fornecedor, d.conta_bancaria_id,
    (cb_d.banco || ' - '::text) || cb_d.numero_conta,
    d.id, d.processo_id, d.cliente_id,
    d.aprovado_por, d.data_aprovacao, d.motivo_rejeicao,
    d.data_pagamento_programada, d.observacoes_financeiro, d.auto_pagamento
   FROM financeiro_despesas d
     LEFT JOIN financeiro_contas_bancarias cb_d ON cb_d.id = d.conta_bancaria_id
  WHERE d.status <> 'cancelado'::despesa_status_enum AND user_has_access_to_grupo(d.escritorio_id)
UNION ALL
  -- Bloco 4: transferências saída
  SELECT t.id, t.escritorio_id, 'transferencia_saida'::text, 'efetivado'::text,
    'transferencia'::text, 'transferencia'::text,
    COALESCE(t.descricao, (('Transferência de '::text || cb_orig.banco) || ' para '::text) || cb_dest.banco),
    t.valor, t.valor, t.valor, t.valor, 0::numeric,
    t.data_transferencia, t.data_transferencia, t.data_transferencia,
    (cb_dest.banco || ' - '::text) || cb_dest.numero_conta,
    t.conta_origem_id, (cb_orig.banco || ' - '::text) || cb_orig.numero_conta,
    t.id, NULL::uuid, NULL::uuid,
    NULL::uuid, NULL::timestamp with time zone, NULL::text, NULL::date, NULL::text, NULL::boolean
   FROM financeiro_transferencias t
     JOIN financeiro_contas_bancarias cb_orig ON cb_orig.id = t.conta_origem_id
     JOIN financeiro_contas_bancarias cb_dest ON cb_dest.id = t.conta_destino_id
  WHERE user_has_access_to_grupo(t.escritorio_id)
UNION ALL
  -- Bloco 5: transferências entrada
  SELECT t.id, t.escritorio_id, 'transferencia_entrada'::text, 'efetivado'::text,
    'transferencia'::text, 'transferencia'::text,
    COALESCE(t.descricao, 'Transferência de '::text || cb_orig.banco),
    t.valor, t.valor, t.valor, t.valor, 0::numeric,
    t.data_transferencia, t.data_transferencia, t.data_transferencia,
    (cb_orig.banco || ' - '::text) || cb_orig.numero_conta,
    t.conta_destino_id, (cb_dest.banco || ' - '::text) || cb_dest.numero_conta,
    t.id, NULL::uuid, NULL::uuid,
    NULL::uuid, NULL::timestamp with time zone, NULL::text, NULL::date, NULL::text, NULL::boolean
   FROM financeiro_transferencias t
     JOIN financeiro_contas_bancarias cb_orig ON cb_orig.id = t.conta_origem_id
     JOIN financeiro_contas_bancarias cb_dest ON cb_dest.id = t.conta_destino_id
  WHERE user_has_access_to_grupo(t.escritorio_id)
UNION ALL
  -- Bloco 6: notas de débito
  SELECT nd.id, nd.escritorio_id, 'receita'::text,
    CASE
        WHEN nd.status = 'paga'::nota_debito_status THEN 'efetivado'::text
        WHEN nd.status = 'parcialmente_paga'::nota_debito_status AND nd.data_vencimento_saldo IS NOT NULL AND nd.data_vencimento_saldo < CURRENT_DATE THEN 'vencido'::text
        WHEN nd.status = 'parcialmente_paga'::nota_debito_status THEN 'parcial'::text
        WHEN nd.data_vencimento < CURRENT_DATE AND (nd.status = ANY (ARRAY['emitida'::nota_debito_status, 'enviada'::nota_debito_status])) THEN 'vencido'::text
        ELSE 'pendente'::text
    END,
    'nota_debito'::text, 'custas_reembolsadas'::text,
    'Nota de Débito '::text || nd.numero,
    nd.valor_total, COALESCE(nd.valor_pago, 0::numeric),
    nd.valor_total, nd.valor_total, 0::numeric,
    COALESCE(nd.data_pagamento,
      CASE WHEN nd.status = 'parcialmente_paga'::nota_debito_status AND nd.data_vencimento_saldo IS NOT NULL THEN nd.data_vencimento_saldo ELSE nd.data_vencimento END),
    CASE WHEN nd.status = 'parcialmente_paga'::nota_debito_status AND nd.data_vencimento_saldo IS NOT NULL THEN nd.data_vencimento_saldo ELSE nd.data_vencimento END,
    nd.data_pagamento, c_nd.nome_completo, nd.conta_bancaria_id,
    (cb_nd.banco || ' - '::text) || cb_nd.numero_conta,
    nd.id, NULL::uuid, nd.cliente_id,
    NULL::uuid, NULL::timestamp with time zone, NULL::text, NULL::date, NULL::text, NULL::boolean
   FROM financeiro_notas_debito nd
     LEFT JOIN crm_pessoas c_nd ON c_nd.id = nd.cliente_id
     LEFT JOIN financeiro_contas_bancarias cb_nd ON cb_nd.id = nd.conta_bancaria_id
  WHERE (nd.status <> ALL (ARRAY['rascunho'::nota_debito_status, 'cancelada'::nota_debito_status]))
    AND user_has_access_to_grupo(nd.escritorio_id)
UNION ALL
  -- Bloco 7: levantamentos
  SELECT l.id, l.escritorio_id, 'levantamento'::text,
    CASE
        WHEN l.status = 'cancelado'::text THEN 'cancelado'::text
        WHEN l.status = 'concluido'::text THEN 'efetivado'::text
        WHEN l.status = 'parcial'::text THEN 'parcial'::text
        ELSE 'pendente'::text
    END,
    'levantamento'::text, l.origem, l.descricao,
    l.valor_total,
    CASE WHEN l.retencao_recebida THEN l.valor_retido ELSE 0::numeric END,
    l.valor_total, l.valor_total, 0::numeric,
    l.data_levantamento, l.data_levantamento,
    CASE WHEN l.status = 'concluido'::text THEN l.data_levantamento ELSE NULL::date END,
    c_l.nome_completo, l.conta_bancaria_id,
    (cb_l.banco || ' - '::text) || cb_l.numero_conta,
    l.id, l.processo_id, l.cliente_id,
    NULL::uuid, NULL::timestamp with time zone, NULL::text, NULL::date, NULL::text, NULL::boolean
   FROM financeiro_levantamentos l
     LEFT JOIN crm_pessoas c_l ON c_l.id = l.cliente_id
     LEFT JOIN financeiro_contas_bancarias cb_l ON cb_l.id = l.conta_bancaria_id
  WHERE l.status <> 'cancelado'::text AND user_has_access_to_grupo(l.escritorio_id);
