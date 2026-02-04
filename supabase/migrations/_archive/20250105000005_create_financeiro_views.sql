-- =====================================================
-- MÓDULO FINANCEIRO - VIEWS CONSOLIDADAS
-- =====================================================
-- Migration: Views para consultas e relatórios
-- - v_contas_receber_pagar (unificação de contas)
-- - v_extrato_conta_bancaria (extrato virtual)
-- - v_saldos_contas_bancarias (saldos consolidados)
-- - v_timesheet_pendente_aprovacao (timesheet para aprovar)
-- - v_clientes_prontos_faturar (faturamento inteligente)
-- - v_faturas_dashboard (métricas de faturas)
-- - v_fluxo_caixa (projeção de fluxo de caixa)
-- - v_dre (demonstração de resultados)
-- - v_inadimplencia (análise de inadimplência)
-- - v_receita_por_area (receita por área jurídica)
-- - v_receita_por_advogado (receita por advogado)
-- =====================================================

-- =====================================================
-- CONTAS A RECEBER E PAGAR (UNIFICADO)
-- =====================================================

CREATE OR REPLACE VIEW v_contas_receber_pagar AS
-- CONTAS A RECEBER (parcelas de honorários)
SELECT
  hp.id,
  hp.honorario_id AS origem_id,
  'receber' AS tipo_conta,
  'honorario' AS categoria,
  h.escritorio_id,
  h.cliente_id,
  c.nome_completo AS cliente_fornecedor,
  h.numero_interno AS documento_referencia,
  h.descricao,
  hp.numero_parcela,
  hp.valor,
  hp.data_vencimento,
  hp.data_pagamento,
  hp.valor_pago,
  hp.status,
  hp.forma_pagamento,
  hp.dias_atraso,
  hp.juros_aplicados,
  hp.observacoes,
  CASE
    WHEN hp.status = 'atrasado' THEN 'urgente'
    WHEN hp.data_vencimento <= CURRENT_DATE + INTERVAL '7 days' AND hp.status = 'pendente' THEN 'proximo'
    ELSE 'normal'
  END AS prioridade,
  hp.created_at
FROM honorarios_parcelas hp
JOIN honorarios h ON h.id = hp.honorario_id
JOIN clientes c ON c.id = h.cliente_id
WHERE hp.status IN ('pendente', 'atrasado')

UNION ALL

-- CONTAS A PAGAR (despesas)
SELECT
  d.id,
  d.id AS origem_id,
  'pagar' AS tipo_conta,
  d.categoria,
  d.escritorio_id,
  NULL AS cliente_id,
  d.fornecedor AS cliente_fornecedor,
  d.documento_fiscal AS documento_referencia,
  d.descricao,
  NULL AS numero_parcela,
  d.valor,
  d.data_vencimento,
  d.data_pagamento,
  d.valor AS valor_pago, -- despesas não têm valor_pago separado
  d.status,
  d.forma_pagamento,
  CASE
    WHEN d.status = 'pendente' AND d.data_vencimento < CURRENT_DATE
    THEN CURRENT_DATE - d.data_vencimento
    ELSE 0
  END AS dias_atraso,
  NULL AS juros_aplicados,
  NULL AS observacoes,
  CASE
    WHEN d.status = 'pendente' AND d.data_vencimento < CURRENT_DATE THEN 'urgente'
    WHEN d.data_vencimento <= CURRENT_DATE + INTERVAL '7 days' AND d.status = 'pendente' THEN 'proximo'
    ELSE 'normal'
  END AS prioridade,
  d.created_at
FROM despesas d
WHERE d.status = 'pendente';

COMMENT ON VIEW v_contas_receber_pagar IS 'Visão unificada de contas a receber e pagar com filtros inteligentes';

-- =====================================================
-- EXTRATO VIRTUAL DE CONTA BANCÁRIA
-- =====================================================

CREATE OR REPLACE VIEW v_extrato_conta_bancaria AS
SELECT
  l.id,
  l.conta_bancaria_id,
  cb.escritorio_id,
  cb.banco,
  cb.numero_conta,
  l.tipo,
  l.valor,
  l.data_lancamento,
  l.descricao,
  l.categoria,
  l.saldo_apos_lancamento,
  l.origem_tipo,
  l.origem_id,
  l.transferencia_id,
  l.comprovante_url,
  l.conciliado,
  l.conciliado_em,
  l.observacoes,
  -- Dados da origem (se for pagamento)
  CASE
    WHEN l.origem_tipo = 'pagamento' THEN p.forma_pagamento
    ELSE NULL
  END AS forma_pagamento_origem,
  -- Dados da transferência (se for transferência)
  CASE
    WHEN l.origem_tipo = 'transferencia' THEN (
      SELECT cb2.banco || ' - ' || cb2.numero_conta
      FROM conta_bancaria_lancamentos l2
      JOIN contas_bancarias cb2 ON cb2.id = l2.conta_bancaria_id
      WHERE l2.transferencia_id = l.transferencia_id
      AND l2.id != l.id
      LIMIT 1
    )
    ELSE NULL
  END AS conta_destino_origem,
  l.created_at
FROM conta_bancaria_lancamentos l
JOIN contas_bancarias cb ON cb.id = l.conta_bancaria_id
LEFT JOIN pagamentos p ON p.id = l.origem_id AND l.origem_tipo = 'pagamento'
ORDER BY l.data_lancamento DESC, l.created_at DESC;

COMMENT ON VIEW v_extrato_conta_bancaria IS 'Extrato virtual com detalhes de todas as movimentações';

-- =====================================================
-- SALDOS CONSOLIDADOS DE CONTAS BANCÁRIAS
-- =====================================================

CREATE OR REPLACE VIEW v_saldos_contas_bancarias AS
SELECT
  cb.id,
  cb.escritorio_id,
  e.nome AS nome_escritorio,
  cb.banco,
  cb.tipo_conta,
  cb.agencia,
  cb.numero_conta,
  cb.saldo_atual,
  cb.saldo_inicial,
  cb.conta_principal,
  cb.ativa,
  -- Movimentações do dia
  COALESCE(SUM(CASE
    WHEN l.tipo IN ('entrada', 'transferencia_entrada') AND l.data_lancamento = CURRENT_DATE
    THEN l.valor ELSE 0
  END), 0) AS entradas_dia,
  COALESCE(SUM(CASE
    WHEN l.tipo IN ('saida', 'transferencia_saida') AND l.data_lancamento = CURRENT_DATE
    THEN l.valor ELSE 0
  END), 0) AS saidas_dia,
  -- Movimentações do mês
  COALESCE(SUM(CASE
    WHEN l.tipo IN ('entrada', 'transferencia_entrada')
    AND DATE_TRUNC('month', l.data_lancamento) = DATE_TRUNC('month', CURRENT_DATE)
    THEN l.valor ELSE 0
  END), 0) AS entradas_mes,
  COALESCE(SUM(CASE
    WHEN l.tipo IN ('saida', 'transferencia_saida')
    AND DATE_TRUNC('month', l.data_lancamento) = DATE_TRUNC('month', CURRENT_DATE)
    THEN l.valor ELSE 0
  END), 0) AS saidas_mes,
  -- Última movimentação
  (SELECT MAX(l2.data_lancamento)
   FROM conta_bancaria_lancamentos l2
   WHERE l2.conta_bancaria_id = cb.id) AS ultima_movimentacao,
  cb.data_abertura,
  cb.created_at
FROM contas_bancarias cb
JOIN escritorios e ON e.id = cb.escritorio_id
LEFT JOIN conta_bancaria_lancamentos l ON l.conta_bancaria_id = cb.id
WHERE cb.ativa = true
GROUP BY cb.id, e.nome;

COMMENT ON VIEW v_saldos_contas_bancarias IS 'Saldos e movimentações consolidadas por conta bancária';

-- =====================================================
-- TIMESHEET PENDENTE DE APROVAÇÃO
-- =====================================================

CREATE OR REPLACE VIEW v_timesheet_pendente_aprovacao AS
SELECT
  t.id,
  t.escritorio_id,
  e.nome AS nome_escritorio,
  t.user_id,
  p.nome_completo AS colaborador_nome,
  t.processo_id,
  proc.numero_processo,
  proc.titulo AS processo_titulo,
  t.consulta_id,
  cons.titulo AS consulta_titulo,
  t.data_trabalho,
  t.horas,
  t.atividade,
  t.faturavel,
  t.faturado,
  t.aprovado,
  t.reprovado,
  t.justificativa_reprovacao,
  -- Dados do cliente
  CASE
    WHEN t.processo_id IS NOT NULL THEN (SELECT c.nome_completo FROM clientes c WHERE c.id = proc.cliente_id)
    WHEN t.consulta_id IS NOT NULL THEN (SELECT c.nome_completo FROM clientes c WHERE c.id = cons.cliente_id)
    ELSE NULL
  END AS cliente_nome,
  -- Valor estimado (se houver config de valor/hora)
  (SELECT ch.valor_hora
   FROM contratos_honorarios_config ch
   JOIN contratos_honorarios cont ON cont.id = ch.contrato_id
   WHERE cont.cliente_id = COALESCE(proc.cliente_id, cons.cliente_id)
   AND ch.tipo_config = 'hora'
   AND cont.ativo = true
   LIMIT 1
  ) * t.horas AS valor_estimado,
  -- Semana de trabalho
  DATE_TRUNC('week', t.data_trabalho)::DATE AS semana_trabalho,
  t.created_at,
  t.updated_at
FROM timesheet t
JOIN escritorios e ON e.id = t.escritorio_id
JOIN profiles p ON p.id = t.user_id
LEFT JOIN processos proc ON proc.id = t.processo_id
LEFT JOIN consultas cons ON cons.id = t.consulta_id
WHERE t.aprovado = false AND t.reprovado = false
ORDER BY t.data_trabalho DESC, t.created_at DESC;

COMMENT ON VIEW v_timesheet_pendente_aprovacao IS 'Timesheet aguardando aprovação com dados completos';

-- =====================================================
-- CLIENTES PRONTOS PARA FATURAR
-- =====================================================

CREATE OR REPLACE VIEW v_clientes_prontos_faturar AS
SELECT
  c.id AS cliente_id,
  c.escritorio_id,
  e.nome AS nome_escritorio,
  c.nome_completo AS cliente_nome,
  c.tipo_pessoa,
  c.cpf_cnpj,
  c.email,
  c.telefone,
  -- Total de horas aprovadas não faturadas
  COALESCE(SUM(CASE WHEN t.faturavel AND NOT t.faturado THEN t.horas ELSE 0 END), 0) AS horas_faturar,
  -- Valor estimado de horas
  COALESCE(SUM(
    CASE
      WHEN t.faturavel AND NOT t.faturado
      THEN t.horas * COALESCE((
        SELECT ch.valor_hora
        FROM contratos_honorarios_config ch
        JOIN contratos_honorarios cont ON cont.id = ch.contrato_id
        WHERE cont.cliente_id = c.id
        AND ch.tipo_config = 'hora'
        AND cont.ativo = true
        LIMIT 1
      ), 0)
      ELSE 0
    END
  ), 0) AS valor_horas,
  -- Honorários aprovados não faturados
  COALESCE((
    SELECT COUNT(*)
    FROM honorarios h
    WHERE h.cliente_id = c.id
    AND h.status = 'aprovado'
  ), 0) AS honorarios_aprovados,
  COALESCE((
    SELECT SUM(h.valor_total)
    FROM honorarios h
    WHERE h.cliente_id = c.id
    AND h.status = 'aprovado'
  ), 0) AS valor_honorarios,
  -- Total a faturar
  COALESCE(SUM(
    CASE
      WHEN t.faturavel AND NOT t.faturado
      THEN t.horas * COALESCE((
        SELECT ch.valor_hora
        FROM contratos_honorarios_config ch
        JOIN contratos_honorarios cont ON cont.id = ch.contrato_id
        WHERE cont.cliente_id = c.id
        AND ch.tipo_config = 'hora'
        AND cont.ativo = true
        LIMIT 1
      ), 0)
      ELSE 0
    END
  ), 0) + COALESCE((
    SELECT SUM(h.valor_total)
    FROM honorarios h
    WHERE h.cliente_id = c.id
    AND h.status = 'aprovado'
  ), 0) AS total_faturar,
  -- Última fatura
  (SELECT MAX(f.data_emissao)
   FROM faturas f
   WHERE f.cliente_id = c.id) AS ultima_fatura,
  -- Contrato ativo
  (SELECT cont.id
   FROM contratos_honorarios cont
   WHERE cont.cliente_id = c.id
   AND cont.ativo = true
   LIMIT 1) AS contrato_ativo_id
FROM clientes c
JOIN escritorios e ON e.id = c.escritorio_id
LEFT JOIN timesheet t ON (
  t.processo_id IN (SELECT id FROM processos WHERE cliente_id = c.id)
  OR t.consulta_id IN (SELECT id FROM consultas WHERE cliente_id = c.id)
) AND t.aprovado = true
WHERE c.ativo = true
GROUP BY c.id, e.nome
HAVING (
  -- Tem horas para faturar
  COALESCE(SUM(CASE WHEN t.faturavel AND NOT t.faturado THEN t.horas ELSE 0 END), 0) > 0
  OR
  -- Tem honorários aprovados
  EXISTS (SELECT 1 FROM honorarios h WHERE h.cliente_id = c.id AND h.status = 'aprovado')
)
ORDER BY total_faturar DESC;

COMMENT ON VIEW v_clientes_prontos_faturar IS 'Clientes com itens prontos para faturamento';

-- =====================================================
-- DASHBOARD DE FATURAS
-- =====================================================

CREATE OR REPLACE VIEW v_faturas_dashboard AS
SELECT
  f.id,
  f.escritorio_id,
  e.nome AS nome_escritorio,
  f.numero_fatura,
  f.cliente_id,
  c.nome_completo AS cliente_nome,
  f.data_emissao,
  f.data_vencimento,
  f.valor_total,
  f.status,
  f.parcelado,
  f.numero_parcelas,
  f.gerada_automaticamente,
  -- Quantidade de itens
  (SELECT COUNT(*) FROM faturas_itens fi WHERE fi.fatura_id = f.id) AS qtd_itens,
  -- Dias até vencimento
  CASE
    WHEN f.status IN ('emitida', 'enviada')
    THEN f.data_vencimento - CURRENT_DATE
    ELSE NULL
  END AS dias_vencimento,
  -- Categoria de urgência
  CASE
    WHEN f.status = 'atrasada' THEN 'atrasada'
    WHEN f.status IN ('emitida', 'enviada') AND f.data_vencimento <= CURRENT_DATE + INTERVAL '7 days' THEN 'vence_semana'
    WHEN f.status IN ('emitida', 'enviada') AND f.data_vencimento <= CURRENT_DATE + INTERVAL '15 days' THEN 'vence_quinzena'
    WHEN f.status = 'paga' THEN 'paga'
    ELSE 'normal'
  END AS categoria_urgencia,
  f.enviada_em,
  f.paga_em,
  f.created_at,
  f.updated_at
FROM faturas f
JOIN escritorios e ON e.id = f.escritorio_id
JOIN clientes c ON c.id = f.cliente_id
ORDER BY f.data_emissao DESC;

COMMENT ON VIEW v_faturas_dashboard IS 'Dashboard de faturas com categorização de urgência';

-- =====================================================
-- FLUXO DE CAIXA (PROJEÇÃO)
-- =====================================================

CREATE OR REPLACE VIEW v_fluxo_caixa AS
WITH datas_projecao AS (
  SELECT generate_series(
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '90 days',
    INTERVAL '1 day'
  )::DATE AS data
),
entradas_projetadas AS (
  SELECT
    hp.data_vencimento AS data,
    h.escritorio_id,
    SUM(hp.valor) AS valor
  FROM honorarios_parcelas hp
  JOIN honorarios h ON h.id = hp.honorario_id
  WHERE hp.status IN ('pendente', 'atrasado')
  GROUP BY hp.data_vencimento, h.escritorio_id
),
saidas_projetadas AS (
  SELECT
    d.data_vencimento AS data,
    d.escritorio_id,
    SUM(d.valor) AS valor
  FROM despesas d
  WHERE d.status = 'pendente'
  GROUP BY d.data_vencimento, d.escritorio_id
)
SELECT
  dp.data,
  e.id AS escritorio_id,
  e.nome AS nome_escritorio,
  COALESCE(ep.valor, 0) AS entradas,
  COALESCE(sp.valor, 0) AS saidas,
  COALESCE(ep.valor, 0) - COALESCE(sp.valor, 0) AS saldo_dia,
  -- Saldo acumulado (simplificado - em produção seria função com saldo inicial)
  SUM(COALESCE(ep.valor, 0) - COALESCE(sp.valor, 0)) OVER (
    PARTITION BY e.id
    ORDER BY dp.data
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) AS saldo_acumulado
FROM datas_projecao dp
CROSS JOIN escritorios e
LEFT JOIN entradas_projetadas ep ON ep.data = dp.data AND ep.escritorio_id = e.id
LEFT JOIN saidas_projetadas sp ON sp.data = dp.data AND sp.escritorio_id = e.id
ORDER BY e.id, dp.data;

COMMENT ON VIEW v_fluxo_caixa IS 'Projeção de fluxo de caixa para 90 dias';

-- =====================================================
-- DRE (DEMONSTRAÇÃO DE RESULTADOS)
-- =====================================================

CREATE OR REPLACE VIEW v_dre AS
WITH receitas AS (
  SELECT
    h.escritorio_id,
    DATE_TRUNC('month', hp.data_pagamento) AS mes_referencia,
    SUM(hp.valor_pago) AS valor
  FROM honorarios_parcelas hp
  JOIN honorarios h ON h.id = hp.honorario_id
  WHERE hp.status = 'pago'
  GROUP BY h.escritorio_id, DATE_TRUNC('month', hp.data_pagamento)
),
despesas_pagas AS (
  SELECT
    escritorio_id,
    DATE_TRUNC('month', data_pagamento) AS mes_referencia,
    categoria,
    SUM(valor) AS valor
  FROM despesas
  WHERE status = 'pago'
  GROUP BY escritorio_id, DATE_TRUNC('month', data_pagamento), categoria
)
SELECT
  e.id AS escritorio_id,
  e.nome AS nome_escritorio,
  COALESCE(r.mes_referencia, d.mes_referencia) AS mes_referencia,
  COALESCE(r.valor, 0) AS receita_bruta,
  COALESCE(SUM(CASE WHEN d.categoria = 'impostos' THEN d.valor ELSE 0 END), 0) AS impostos,
  COALESCE(r.valor, 0) - COALESCE(SUM(CASE WHEN d.categoria = 'impostos' THEN d.valor ELSE 0 END), 0) AS receita_liquida,
  COALESCE(SUM(CASE WHEN d.categoria = 'folha' THEN d.valor ELSE 0 END), 0) AS despesas_pessoal,
  COALESCE(SUM(CASE WHEN d.categoria IN ('aluguel', 'tecnologia', 'material') THEN d.valor ELSE 0 END), 0) AS despesas_operacionais,
  COALESCE(SUM(CASE WHEN d.categoria IN ('marketing', 'capacitacao') THEN d.valor ELSE 0 END), 0) AS despesas_administrativas,
  COALESCE(SUM(d.valor), 0) AS despesas_totais,
  COALESCE(r.valor, 0) - COALESCE(SUM(d.valor), 0) AS resultado_liquido,
  CASE
    WHEN COALESCE(r.valor, 0) > 0
    THEN ((COALESCE(r.valor, 0) - COALESCE(SUM(d.valor), 0)) / r.valor) * 100
    ELSE 0
  END AS margem_liquida
FROM escritorios e
LEFT JOIN receitas r ON r.escritorio_id = e.id
LEFT JOIN despesas_pagas d ON d.escritorio_id = e.id AND d.mes_referencia = r.mes_referencia
WHERE COALESCE(r.mes_referencia, d.mes_referencia) >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '12 months')
GROUP BY e.id, e.nome, r.mes_referencia, d.mes_referencia, r.valor
ORDER BY e.id, mes_referencia DESC;

COMMENT ON VIEW v_dre IS 'Demonstração de Resultados do Exercício (DRE) mensal';

-- =====================================================
-- INADIMPLÊNCIA
-- =====================================================

CREATE OR REPLACE VIEW v_inadimplencia AS
SELECT
  h.escritorio_id,
  e.nome AS nome_escritorio,
  c.id AS cliente_id,
  c.nome_completo AS cliente_nome,
  c.cpf_cnpj,
  c.telefone,
  c.email,
  COUNT(hp.id) AS parcelas_atrasadas,
  SUM(hp.valor) AS valor_total_atrasado,
  MIN(hp.data_vencimento) AS vencimento_mais_antigo,
  MAX(hp.data_vencimento) AS vencimento_mais_recente,
  MAX(hp.dias_atraso) AS maior_atraso_dias,
  AVG(hp.dias_atraso) AS media_atraso_dias,
  -- Última interação/cobrança
  (SELECT MAX(ce.enviado_em)
   FROM cobrancas_enviadas ce
   WHERE ce.parcela_id IN (
     SELECT id FROM honorarios_parcelas WHERE honorario_id IN (
       SELECT id FROM honorarios WHERE cliente_id = c.id
     )
   )
  ) AS ultima_cobranca,
  -- Score de risco (simplificado)
  CASE
    WHEN MAX(hp.dias_atraso) > 90 THEN 'critico'
    WHEN MAX(hp.dias_atraso) > 60 THEN 'alto'
    WHEN MAX(hp.dias_atraso) > 30 THEN 'medio'
    ELSE 'baixo'
  END AS risco
FROM honorarios_parcelas hp
JOIN honorarios h ON h.id = hp.honorario_id
JOIN clientes c ON c.id = h.cliente_id
JOIN escritorios e ON e.id = h.escritorio_id
WHERE hp.status = 'atrasado'
GROUP BY h.escritorio_id, e.nome, c.id, c.nome_completo, c.cpf_cnpj, c.telefone, c.email
ORDER BY valor_total_atrasado DESC;

COMMENT ON VIEW v_inadimplencia IS 'Análise de inadimplência por cliente';

-- =====================================================
-- RECEITA POR ÁREA JURÍDICA
-- =====================================================

CREATE OR REPLACE VIEW v_receita_por_area AS
SELECT
  h.escritorio_id,
  e.nome AS nome_escritorio,
  p.area_atuacao,
  DATE_TRUNC('month', hp.data_pagamento) AS mes_referencia,
  COUNT(DISTINCT h.id) AS qtd_honorarios,
  COUNT(DISTINCT h.cliente_id) AS qtd_clientes,
  SUM(hp.valor_pago) AS receita_total,
  AVG(hp.valor_pago) AS ticket_medio
FROM honorarios_parcelas hp
JOIN honorarios h ON h.id = hp.honorario_id
JOIN escritorios e ON e.id = h.escritorio_id
LEFT JOIN processos p ON p.id = h.processo_id
WHERE hp.status = 'pago'
AND p.area_atuacao IS NOT NULL
GROUP BY h.escritorio_id, e.nome, p.area_atuacao, DATE_TRUNC('month', hp.data_pagamento)
ORDER BY mes_referencia DESC, receita_total DESC;

COMMENT ON VIEW v_receita_por_area IS 'Receita por área de atuação jurídica';

-- =====================================================
-- RECEITA POR ADVOGADO
-- =====================================================

CREATE OR REPLACE VIEW v_receita_por_advogado AS
SELECT
  h.escritorio_id,
  e.nome AS nome_escritorio,
  h.responsavel_id,
  prof.nome_completo AS advogado_nome,
  DATE_TRUNC('month', hp.data_pagamento) AS mes_referencia,
  COUNT(DISTINCT h.id) AS qtd_honorarios,
  COUNT(DISTINCT h.cliente_id) AS qtd_clientes,
  SUM(hp.valor_pago) AS receita_total,
  AVG(hp.valor_pago) AS ticket_medio,
  -- Horas trabalhadas (se for cobrança por hora)
  (SELECT SUM(t.horas)
   FROM timesheet t
   WHERE t.user_id = h.responsavel_id
   AND DATE_TRUNC('month', t.data_trabalho) = DATE_TRUNC('month', hp.data_pagamento)
   AND t.faturado = true
  ) AS horas_faturadas,
  -- Valor por hora efetivo
  CASE
    WHEN (SELECT SUM(t.horas)
          FROM timesheet t
          WHERE t.user_id = h.responsavel_id
          AND DATE_TRUNC('month', t.data_trabalho) = DATE_TRUNC('month', hp.data_pagamento)
          AND t.faturado = true) > 0
    THEN SUM(hp.valor_pago) / (SELECT SUM(t.horas)
                                FROM timesheet t
                                WHERE t.user_id = h.responsavel_id
                                AND DATE_TRUNC('month', t.data_trabalho) = DATE_TRUNC('month', hp.data_pagamento)
                                AND t.faturado = true)
    ELSE NULL
  END AS valor_hora_efetivo
FROM honorarios_parcelas hp
JOIN honorarios h ON h.id = hp.honorario_id
JOIN escritorios e ON e.id = h.escritorio_id
JOIN profiles prof ON prof.id = h.responsavel_id
WHERE hp.status = 'pago'
GROUP BY h.escritorio_id, e.nome, h.responsavel_id, prof.nome_completo, DATE_TRUNC('month', hp.data_pagamento)
ORDER BY mes_referencia DESC, receita_total DESC;

COMMENT ON VIEW v_receita_por_advogado IS 'Receita e produtividade por advogado';
