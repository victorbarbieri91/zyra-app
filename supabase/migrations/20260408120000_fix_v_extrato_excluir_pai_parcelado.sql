-- Corrigir view v_extrato_financeiro: excluir honorários-pai parcelados
-- que são registros de controle (o trigger gera as parcelas filhas com contrato_id).
-- Sem esse filtro, o valor cheio do contrato aparece duplicado junto com as parcelas.
-- Bug reportado pelo escritório Savedra & Rito.

CREATE OR REPLACE VIEW v_extrato_financeiro AS

-- Receitas (financeiro_receitas)
SELECT
  r.id,
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
  AND (r.parcelado = false OR r.tipo != 'honorario'::receita_tipo_enum)
  AND (r.fatura_id IS NULL OR (EXISTS (
    SELECT 1 FROM financeiro_faturamento_faturas ff
    WHERE ff.id = r.fatura_id AND (ff.status = ANY (ARRAY['parcialmente_paga'::text, 'paga'::text]))
  )))
  AND user_has_access_to_grupo(r.escritorio_id)
  AND NOT (EXISTS (
    SELECT 1 FROM financeiro_levantamentos fl
    WHERE fl.receita_id = r.id AND fl.status <> 'cancelado'::text
  ))

UNION ALL

-- Faturas
SELECT
  f.id,
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

-- Despesas
SELECT
  d.id,
  d.escritorio_id,
  'despesa'::text AS tipo_movimento,
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
  d.descricao,
  d.valor,
  CASE
    WHEN d.status = 'pago'::despesa_status_enum THEN d.valor
    ELSE NULL::numeric
  END AS valor_pago,
  COALESCE(d.data_pagamento, d.data_pagamento_programada, d.data_vencimento) AS data_referencia,
  COALESCE(d.data_pagamento_programada, d.data_vencimento) AS data_vencimento,
  d.data_pagamento AS data_efetivacao,
  d.fornecedor AS entidade,
  d.conta_bancaria_id,
  (cb_d.banco || ' - '::text) || cb_d.numero_conta AS conta_bancaria_nome,
  d.id AS origem_id,
  d.processo_id,
  d.cliente_id,
  d.aprovado_por,
  d.data_aprovacao,
  d.motivo_rejeicao,
  d.data_pagamento_programada,
  d.observacoes_financeiro,
  d.auto_pagamento
FROM financeiro_despesas d
LEFT JOIN financeiro_contas_bancarias cb_d ON cb_d.id = d.conta_bancaria_id
WHERE d.status <> 'cancelado'::despesa_status_enum
  AND user_has_access_to_grupo(d.escritorio_id)

UNION ALL

-- Transferências (saída)
SELECT
  t.id,
  t.escritorio_id,
  'transferencia_saida'::text AS tipo_movimento,
  'efetivado'::text AS status,
  'transferencia'::text AS origem,
  'transferencia'::text AS categoria,
  COALESCE(t.descricao, (('Transferência de '::text || cb_orig.banco) || ' para '::text) || cb_dest.banco) AS descricao,
  t.valor,
  t.valor AS valor_pago,
  t.data_transferencia AS data_referencia,
  t.data_transferencia AS data_vencimento,
  t.data_transferencia AS data_efetivacao,
  (cb_dest.banco || ' - '::text) || cb_dest.numero_conta AS entidade,
  t.conta_origem_id AS conta_bancaria_id,
  (cb_orig.banco || ' - '::text) || cb_orig.numero_conta AS conta_bancaria_nome,
  t.id AS origem_id,
  NULL::uuid AS processo_id,
  NULL::uuid AS cliente_id,
  NULL::uuid AS aprovado_por,
  NULL::timestamp with time zone AS data_aprovacao,
  NULL::text AS motivo_rejeicao,
  NULL::date AS data_pagamento_programada,
  NULL::text AS observacoes_financeiro,
  NULL::boolean AS auto_pagamento
FROM financeiro_transferencias t
JOIN financeiro_contas_bancarias cb_orig ON cb_orig.id = t.conta_origem_id
JOIN financeiro_contas_bancarias cb_dest ON cb_dest.id = t.conta_destino_id
WHERE user_has_access_to_grupo(t.escritorio_id)

UNION ALL

-- Transferências (entrada)
SELECT
  t.id,
  t.escritorio_id,
  'transferencia_entrada'::text AS tipo_movimento,
  'efetivado'::text AS status,
  'transferencia'::text AS origem,
  'transferencia'::text AS categoria,
  COALESCE(t.descricao, 'Transferência de '::text || cb_orig.banco) AS descricao,
  t.valor,
  t.valor AS valor_pago,
  t.data_transferencia AS data_referencia,
  t.data_transferencia AS data_vencimento,
  t.data_transferencia AS data_efetivacao,
  (cb_orig.banco || ' - '::text) || cb_orig.numero_conta AS entidade,
  t.conta_destino_id AS conta_bancaria_id,
  (cb_dest.banco || ' - '::text) || cb_dest.numero_conta AS conta_bancaria_nome,
  t.id AS origem_id,
  NULL::uuid AS processo_id,
  NULL::uuid AS cliente_id,
  NULL::uuid AS aprovado_por,
  NULL::timestamp with time zone AS data_aprovacao,
  NULL::text AS motivo_rejeicao,
  NULL::date AS data_pagamento_programada,
  NULL::text AS observacoes_financeiro,
  NULL::boolean AS auto_pagamento
FROM financeiro_transferencias t
JOIN financeiro_contas_bancarias cb_orig ON cb_orig.id = t.conta_origem_id
JOIN financeiro_contas_bancarias cb_dest ON cb_dest.id = t.conta_destino_id
WHERE user_has_access_to_grupo(t.escritorio_id)

UNION ALL

-- Notas de Débito
SELECT
  nd.id,
  nd.escritorio_id,
  'receita'::text AS tipo_movimento,
  CASE
    WHEN nd.status = 'paga'::nota_debito_status THEN 'efetivado'::text
    WHEN nd.data_vencimento < CURRENT_DATE AND (nd.status = ANY (ARRAY['emitida'::nota_debito_status, 'enviada'::nota_debito_status])) THEN 'vencido'::text
    ELSE 'pendente'::text
  END AS status,
  'nota_debito'::text AS origem,
  'custas_reembolsadas'::text AS categoria,
  'Nota de Débito '::text || nd.numero AS descricao,
  nd.valor_total AS valor,
  CASE
    WHEN nd.status = 'paga'::nota_debito_status THEN nd.valor_total
    ELSE NULL::numeric
  END AS valor_pago,
  COALESCE(nd.data_pagamento, nd.data_vencimento) AS data_referencia,
  nd.data_vencimento,
  nd.data_pagamento AS data_efetivacao,
  c_nd.nome_completo AS entidade,
  nd.conta_bancaria_id,
  (cb_nd.banco || ' - '::text) || cb_nd.numero_conta AS conta_bancaria_nome,
  nd.id AS origem_id,
  NULL::uuid AS processo_id,
  nd.cliente_id,
  NULL::uuid AS aprovado_por,
  NULL::timestamp with time zone AS data_aprovacao,
  NULL::text AS motivo_rejeicao,
  NULL::date AS data_pagamento_programada,
  NULL::text AS observacoes_financeiro,
  NULL::boolean AS auto_pagamento
FROM financeiro_notas_debito nd
LEFT JOIN crm_pessoas c_nd ON c_nd.id = nd.cliente_id
LEFT JOIN financeiro_contas_bancarias cb_nd ON cb_nd.id = nd.conta_bancaria_id
WHERE (nd.status <> ALL (ARRAY['rascunho'::nota_debito_status, 'cancelada'::nota_debito_status]))
  AND user_has_access_to_grupo(nd.escritorio_id)

UNION ALL

-- Levantamentos
SELECT
  l.id,
  l.escritorio_id,
  'levantamento'::text AS tipo_movimento,
  CASE
    WHEN l.status = 'cancelado'::text THEN 'cancelado'::text
    WHEN l.status = 'concluido'::text THEN 'efetivado'::text
    WHEN l.status = 'parcial'::text THEN 'parcial'::text
    ELSE 'pendente'::text
  END AS status,
  'levantamento'::text AS origem,
  l.origem AS categoria,
  l.descricao,
  l.valor_total AS valor,
  CASE
    WHEN l.retencao_recebida THEN l.valor_retido
    ELSE 0::numeric
  END AS valor_pago,
  l.data_levantamento AS data_referencia,
  l.data_levantamento AS data_vencimento,
  CASE
    WHEN l.status = 'concluido'::text THEN l.data_levantamento
    ELSE NULL::date
  END AS data_efetivacao,
  c_l.nome_completo AS entidade,
  l.conta_bancaria_id,
  (cb_l.banco || ' - '::text) || cb_l.numero_conta AS conta_bancaria_nome,
  l.id AS origem_id,
  l.processo_id,
  l.cliente_id,
  NULL::uuid AS aprovado_por,
  NULL::timestamp with time zone AS data_aprovacao,
  NULL::text AS motivo_rejeicao,
  NULL::date AS data_pagamento_programada,
  NULL::text AS observacoes_financeiro,
  NULL::boolean AS auto_pagamento
FROM financeiro_levantamentos l
LEFT JOIN crm_pessoas c_l ON c_l.id = l.cliente_id
LEFT JOIN financeiro_contas_bancarias cb_l ON cb_l.id = l.conta_bancaria_id
WHERE l.status <> 'cancelado'::text
  AND user_has_access_to_grupo(l.escritorio_id);

COMMENT ON VIEW v_extrato_financeiro IS
'Visão unificada de receitas e despesas para a página de extrato financeiro. Exclui honorários-pai parcelados (apenas parcelas filhas aparecem).';
