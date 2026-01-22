-- Migration: Atualizar views do financeiro
-- Data: 2025-01-22
-- Descrição: Atualiza views para usar a nova tabela financeiro_receitas

-- ============================================================
-- 1. VIEW: LANÇAMENTOS PRONTOS PARA FATURAR
-- ============================================================
-- Esta view é usada pelo módulo de faturamento para listar itens
-- que podem ser incluídos em faturas

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
  p.numero_cnj as processo_numero,
  p.numero_pasta as processo_pasta,
  CONCAT(p.autor, ' x ', p.reu) as partes_resumo,
  r.categoria,
  r.tipo as subtipo, -- honorario, parcela, avulso
  r.data_vencimento,
  r.created_at
FROM financeiro_receitas r
LEFT JOIN crm_pessoas c ON c.id = r.cliente_id
LEFT JOIN processos_processos p ON p.id = r.processo_id
WHERE r.status = 'pendente'
  AND r.tipo IN ('honorario', 'parcela', 'avulso', 'saldo')
  AND r.fatura_id IS NULL
  AND (r.parcelado = false OR r.tipo != 'honorario') -- Não mostra honorário parcelado (só as parcelas)

UNION ALL

-- Timesheet (horas trabalhadas)
SELECT
  t.id as lancamento_id,
  'timesheet' as tipo_lancamento,
  t.escritorio_id,
  t.cliente_id,
  c.nome_completo as cliente_nome,
  c.email as cliente_email,
  t.descricao,
  t.valor_calculado as valor,
  t.horas,
  t.processo_id,
  p.numero_cnj as processo_numero,
  p.numero_pasta as processo_pasta,
  CONCAT(p.autor, ' x ', p.reu) as partes_resumo,
  'timesheet' as categoria,
  NULL as subtipo,
  t.data_trabalho as data_vencimento,
  t.created_at
FROM financeiro_timesheet t
LEFT JOIN crm_pessoas c ON c.id = t.cliente_id
LEFT JOIN processos_processos p ON p.id = t.processo_id
WHERE t.faturavel = true
  AND t.faturado = false
  AND t.aprovado = true

UNION ALL

-- Despesas reembolsáveis
SELECT
  d.id as lancamento_id,
  'despesa' as tipo_lancamento,
  d.escritorio_id,
  d.cliente_id,
  c.nome_completo as cliente_nome,
  c.email as cliente_email,
  d.descricao,
  d.valor,
  NULL::numeric as horas,
  d.processo_id,
  p.numero_cnj as processo_numero,
  p.numero_pasta as processo_pasta,
  CONCAT(p.autor, ' x ', p.reu) as partes_resumo,
  d.categoria,
  'reembolso' as subtipo,
  d.data_vencimento,
  d.created_at
FROM financeiro_despesas d
LEFT JOIN crm_pessoas c ON c.id = d.cliente_id
LEFT JOIN processos_processos p ON p.id = d.processo_id
WHERE d.reembolsavel = true
  AND d.reembolsado = false
  AND d.status = 'pago'; -- Só reembolsa despesas já pagas

COMMENT ON VIEW v_lancamentos_prontos_faturar IS
'Unifica receitas, timesheet e despesas reembolsáveis que podem ser incluídos em faturas';

-- ============================================================
-- 2. VIEW: CONTAS A RECEBER/PAGAR
-- ============================================================

CREATE OR REPLACE VIEW v_contas_receber_pagar AS
-- Contas a receber (receitas pendentes)
SELECT
  r.id,
  'receber' as tipo_conta,
  r.escritorio_id,
  r.descricao,
  r.valor - COALESCE(r.valor_pago, 0) as valor, -- Valor em aberto
  r.data_vencimento,
  r.status,
  r.dias_atraso,
  c.nome_completo as cliente_fornecedor,
  r.cliente_id,
  NULL::uuid as fornecedor_id,
  r.processo_id,
  r.categoria
FROM financeiro_receitas r
LEFT JOIN crm_pessoas c ON c.id = r.cliente_id
WHERE r.status IN ('pendente', 'atrasado', 'parcial')
  AND r.tipo IN ('honorario', 'parcela', 'avulso', 'saldo')
  AND (r.parcelado = false OR r.tipo != 'honorario')

UNION ALL

-- Contas a pagar (despesas pendentes)
SELECT
  d.id,
  'pagar' as tipo_conta,
  d.escritorio_id,
  d.descricao,
  d.valor,
  d.data_vencimento,
  d.status,
  CASE
    WHEN d.data_vencimento < CURRENT_DATE AND d.status = 'pendente'
    THEN (CURRENT_DATE - d.data_vencimento)::integer
    ELSE 0
  END as dias_atraso,
  d.fornecedor as cliente_fornecedor,
  NULL::uuid as cliente_id,
  NULL::uuid as fornecedor_id,
  d.processo_id,
  d.categoria
FROM financeiro_despesas d
WHERE d.status = 'pendente';

COMMENT ON VIEW v_contas_receber_pagar IS
'Visão consolidada de contas a receber e pagar para o dashboard financeiro';

-- ============================================================
-- 3. VIEW: EXTRATO FINANCEIRO UNIFICADO
-- ============================================================

CREATE OR REPLACE VIEW v_extrato_financeiro AS
-- Receitas
SELECT
  r.id,
  r.escritorio_id,
  'receita' as tipo_movimento,
  CASE
    WHEN r.status = 'pago' THEN 'efetivado'
    WHEN r.status = 'parcial' THEN 'parcial'
    WHEN r.status = 'atrasado' THEN 'vencido'
    ELSE 'pendente'
  END as status,
  r.tipo as origem,
  r.categoria,
  r.descricao,
  r.valor,
  r.valor_pago,
  COALESCE(r.data_pagamento, r.data_vencimento) as data_referencia,
  r.data_vencimento,
  r.data_pagamento as data_efetivacao,
  c.nome_completo as entidade,
  r.conta_bancaria_id,
  r.id as origem_id,
  r.processo_id,
  r.cliente_id
FROM financeiro_receitas r
LEFT JOIN crm_pessoas c ON c.id = r.cliente_id
WHERE r.tipo IN ('honorario', 'parcela', 'avulso', 'saldo')
  AND (r.parcelado = false OR r.tipo != 'honorario')

UNION ALL

-- Despesas
SELECT
  d.id,
  d.escritorio_id,
  'despesa' as tipo_movimento,
  CASE
    WHEN d.status = 'pago' THEN 'efetivado'
    WHEN d.data_vencimento < CURRENT_DATE AND d.status = 'pendente' THEN 'vencido'
    ELSE 'pendente'
  END as status,
  CASE
    WHEN d.categoria = 'cartao_credito' THEN 'cartao_credito'
    ELSE 'despesa'
  END as origem,
  d.categoria,
  d.descricao,
  d.valor,
  CASE WHEN d.status = 'pago' THEN d.valor ELSE NULL END as valor_pago,
  COALESCE(d.data_pagamento, d.data_vencimento) as data_referencia,
  d.data_vencimento,
  d.data_pagamento as data_efetivacao,
  d.fornecedor as entidade,
  NULL::uuid as conta_bancaria_id,
  d.id as origem_id,
  d.processo_id,
  d.cliente_id
FROM financeiro_despesas d;

COMMENT ON VIEW v_extrato_financeiro IS
'Visão unificada de receitas e despesas para a página de extrato financeiro';

-- ============================================================
-- 4. VIEW: MÉTRICAS DO DASHBOARD
-- ============================================================

CREATE OR REPLACE VIEW v_dashboard_financeiro_metricas AS
SELECT
  r.escritorio_id,

  -- Receitas do mês atual
  COALESCE(SUM(
    CASE WHEN r.data_pagamento >= DATE_TRUNC('month', CURRENT_DATE)
         AND r.status IN ('pago', 'parcial')
    THEN r.valor_pago END
  ), 0) as receita_mes,

  -- Despesas do mês atual
  (SELECT COALESCE(SUM(d.valor), 0)
   FROM financeiro_despesas d
   WHERE d.escritorio_id = r.escritorio_id
     AND d.data_pagamento >= DATE_TRUNC('month', CURRENT_DATE)
     AND d.status = 'pago') as despesas_mes,

  -- Pendente de receber
  COALESCE(SUM(
    CASE WHEN r.status IN ('pendente', 'atrasado', 'parcial')
    THEN r.valor - COALESCE(r.valor_pago, 0) END
  ), 0) as pendente_receber,

  -- Atrasado
  COALESCE(SUM(
    CASE WHEN r.status = 'atrasado'
    THEN r.valor - COALESCE(r.valor_pago, 0) END
  ), 0) as atrasado,

  -- Contagem de receitas
  COUNT(CASE WHEN r.status IN ('pendente', 'atrasado', 'parcial') THEN 1 END) as qtd_pendentes,
  COUNT(CASE WHEN r.status = 'atrasado' THEN 1 END) as qtd_atrasados

FROM financeiro_receitas r
WHERE r.tipo IN ('honorario', 'parcela', 'avulso', 'saldo')
  AND (r.parcelado = false OR r.tipo != 'honorario')
GROUP BY r.escritorio_id;

COMMENT ON VIEW v_dashboard_financeiro_metricas IS
'Métricas consolidadas para o dashboard financeiro';

-- ============================================================
-- 5. VIEW: RECEITAS POR CONTRATO
-- ============================================================

CREATE OR REPLACE VIEW v_receitas_por_contrato AS
SELECT
  c.id as contrato_id,
  c.escritorio_id,
  c.cliente_id,
  c.numero_contrato,

  -- Valor total previsto
  COALESCE(SUM(r.valor), 0) as valor_total,

  -- Valor recebido
  COALESCE(SUM(r.valor_pago), 0) as valor_recebido,

  -- Valor pendente
  COALESCE(SUM(
    CASE WHEN r.status IN ('pendente', 'atrasado', 'parcial')
    THEN r.valor - COALESCE(r.valor_pago, 0) END
  ), 0) as valor_pendente,

  -- Contagem de parcelas
  COUNT(r.id) as total_parcelas,
  COUNT(CASE WHEN r.status = 'pago' THEN 1 END) as parcelas_pagas,

  -- Inadimplência
  BOOL_OR(r.status = 'atrasado') as inadimplente,
  MAX(r.dias_atraso) as maior_atraso,

  -- Próxima parcela
  MIN(CASE WHEN r.status IN ('pendente', 'atrasado') THEN r.data_vencimento END) as proxima_parcela

FROM financeiro_contratos_honorarios c
LEFT JOIN financeiro_receitas r ON r.contrato_id = c.id
  AND r.tipo IN ('honorario', 'parcela', 'avulso')
  AND (r.parcelado = false OR r.tipo != 'honorario')
GROUP BY c.id, c.escritorio_id, c.cliente_id, c.numero_contrato;

COMMENT ON VIEW v_receitas_por_contrato IS
'Agregação de receitas por contrato para a página de contratos';
