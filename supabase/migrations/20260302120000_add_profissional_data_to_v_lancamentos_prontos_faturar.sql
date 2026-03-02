-- Adicionar profissional_nome, cargo_nome e data_trabalho à view v_lancamentos_prontos_faturar
-- para exibição na pré-visualização da fatura

CREATE OR REPLACE VIEW v_lancamentos_prontos_faturar AS

-- Receitas (honorários e parcelas)
SELECT
  r.id AS lancamento_id,
  'honorario'::text AS tipo_lancamento,
  r.escritorio_id,
  r.cliente_id,
  c.nome_completo AS cliente_nome,
  c.email AS cliente_email,
  r.descricao,
  r.valor,
  NULL::numeric AS horas,
  r.processo_id,
  r.consulta_id,
  p.numero_cnj AS processo_numero,
  p.numero_pasta AS processo_pasta,
  CASE
    WHEN r.processo_id IS NOT NULL THEN NULLIF(TRIM(BOTH FROM concat_ws(' x ', NULLIF(p.autor, ''), NULLIF(p.reu, ''))), '')
    WHEN r.consulta_id IS NOT NULL THEN cons_r.titulo
    ELSE NULL::text
  END AS partes_resumo,
  r.categoria::text AS categoria,
  r.tipo::text AS subtipo,
  r.data_vencimento,
  r.created_at,
  NULL::uuid AS fechamento_id,
  NULL::integer AS qtd_processos,
  NULL::numeric AS valor_unitario,
  NULL::jsonb AS processos_lista,
  NULL::date AS competencia,
  NULL::text AS profissional_nome,
  NULL::text AS cargo_nome,
  NULL::date AS data_trabalho
FROM financeiro_receitas r
LEFT JOIN crm_pessoas c ON c.id = r.cliente_id
LEFT JOIN processos_processos p ON p.id = r.processo_id
LEFT JOIN consultivo_consultas cons_r ON cons_r.id = r.consulta_id
WHERE r.status = 'pendente'
  AND r.tipo IN ('honorario', 'parcela', 'avulso', 'saldo')
  AND r.fatura_id IS NULL
  AND (r.parcelado = false OR r.tipo != 'honorario')
  AND user_has_access_to_grupo(r.escritorio_id)

UNION ALL

-- Timesheet (horas trabalhadas) — com profissional e data
SELECT
  t.id AS lancamento_id,
  'timesheet'::text AS tipo_lancamento,
  t.escritorio_id,
  COALESCE(
    (cont_proc.grupo_clientes->>'cliente_pagador_id')::uuid,
    (cont_cons.grupo_clientes->>'cliente_pagador_id')::uuid,
    p.cliente_id,
    cons.cliente_id
  ) AS cliente_id,
  COALESCE(cpagador_proc.nome_completo, cpagador_cons.nome_completo, c_proc.nome_completo, c_cons.nome_completo) AS cliente_nome,
  COALESCE(cpagador_proc.email, cpagador_cons.email, c_proc.email, c_cons.email) AS cliente_email,
  t.atividade AS descricao,
  t.horas * COALESCE(get_valor_hora_efetivo(COALESCE(p.contrato_id, cons.contrato_id), t.user_id), 0) AS valor,
  t.horas,
  t.processo_id,
  t.consulta_id,
  p.numero_cnj AS processo_numero,
  p.numero_pasta AS processo_pasta,
  CASE
    WHEN t.processo_id IS NOT NULL THEN NULLIF(TRIM(BOTH FROM concat_ws(' x ', NULLIF(p.autor, ''), NULLIF(p.reu, ''))), '')
    WHEN t.consulta_id IS NOT NULL THEN cons.titulo
    ELSE NULL::text
  END AS partes_resumo,
  'timesheet'::text AS categoria,
  NULL::text AS subtipo,
  t.data_trabalho AS data_vencimento,
  t.created_at,
  NULL::uuid AS fechamento_id,
  NULL::integer AS qtd_processos,
  NULL::numeric AS valor_unitario,
  NULL::jsonb AS processos_lista,
  NULL::date AS competencia,
  pr.nome_completo AS profissional_nome,
  cargo.nome_display AS cargo_nome,
  t.data_trabalho
FROM financeiro_timesheet t
LEFT JOIN processos_processos p ON p.id = t.processo_id
LEFT JOIN crm_pessoas c_proc ON c_proc.id = p.cliente_id
LEFT JOIN financeiro_contratos_honorarios cont_proc ON cont_proc.id = p.contrato_id
LEFT JOIN crm_pessoas cpagador_proc ON cpagador_proc.id = ((cont_proc.grupo_clientes->>'cliente_pagador_id')::uuid)
LEFT JOIN consultivo_consultas cons ON cons.id = t.consulta_id
LEFT JOIN crm_pessoas c_cons ON c_cons.id = cons.cliente_id
LEFT JOIN financeiro_contratos_honorarios cont_cons ON cont_cons.id = cons.contrato_id
LEFT JOIN crm_pessoas cpagador_cons ON cpagador_cons.id = ((cont_cons.grupo_clientes->>'cliente_pagador_id')::uuid)
LEFT JOIN profiles pr ON pr.id = t.user_id
LEFT JOIN escritorios_usuarios eu ON eu.user_id = t.user_id AND eu.escritorio_id = t.escritorio_id
LEFT JOIN escritorios_cargos cargo ON cargo.id = eu.cargo_id
WHERE t.faturavel = true AND t.faturado = false AND t.aprovado = true AND user_has_access_to_grupo(t.escritorio_id)

UNION ALL

-- Despesas reembolsáveis
SELECT
  d.id AS lancamento_id,
  'despesa'::text AS tipo_lancamento,
  d.escritorio_id,
  COALESCE(
    (cont_proc.grupo_clientes->>'cliente_pagador_id')::uuid,
    (cont_cons.grupo_clientes->>'cliente_pagador_id')::uuid,
    d.cliente_id,
    p.cliente_id,
    cons.cliente_id
  ) AS cliente_id,
  COALESCE(cpagador_proc.nome_completo, cpagador_cons.nome_completo, c.nome_completo, c_proc.nome_completo, c_cons.nome_completo) AS cliente_nome,
  COALESCE(cpagador_proc.email, cpagador_cons.email, c.email, c_proc.email, c_cons.email) AS cliente_email,
  d.descricao,
  d.valor,
  NULL::numeric AS horas,
  d.processo_id,
  d.consultivo_id AS consulta_id,
  p.numero_cnj AS processo_numero,
  p.numero_pasta AS processo_pasta,
  CASE
    WHEN d.processo_id IS NOT NULL THEN NULLIF(TRIM(BOTH FROM concat_ws(' x ', NULLIF(p.autor, ''), NULLIF(p.reu, ''))), '')
    WHEN d.consultivo_id IS NOT NULL THEN cons.titulo
    ELSE NULL::text
  END AS partes_resumo,
  d.categoria::text AS categoria,
  'reembolso'::text AS subtipo,
  d.data_vencimento,
  d.created_at,
  NULL::uuid AS fechamento_id,
  NULL::integer AS qtd_processos,
  NULL::numeric AS valor_unitario,
  NULL::jsonb AS processos_lista,
  NULL::date AS competencia,
  NULL::text AS profissional_nome,
  NULL::text AS cargo_nome,
  NULL::date AS data_trabalho
FROM financeiro_despesas d
LEFT JOIN crm_pessoas c ON c.id = d.cliente_id
LEFT JOIN processos_processos p ON p.id = d.processo_id
LEFT JOIN crm_pessoas c_proc ON c_proc.id = p.cliente_id
LEFT JOIN financeiro_contratos_honorarios cont_proc ON cont_proc.id = p.contrato_id
LEFT JOIN crm_pessoas cpagador_proc ON cpagador_proc.id = ((cont_proc.grupo_clientes->>'cliente_pagador_id')::uuid)
LEFT JOIN consultivo_consultas cons ON cons.id = d.consultivo_id
LEFT JOIN crm_pessoas c_cons ON c_cons.id = cons.cliente_id
LEFT JOIN financeiro_contratos_honorarios cont_cons ON cont_cons.id = cons.contrato_id
LEFT JOIN crm_pessoas cpagador_cons ON cpagador_cons.id = ((cont_cons.grupo_clientes->>'cliente_pagador_id')::uuid)
WHERE d.reembolsavel = true AND d.reembolsado = false AND d.status = 'pago' AND user_has_access_to_grupo(d.escritorio_id)

UNION ALL

-- Fechamentos de pasta
SELECT
  fp.id AS lancamento_id,
  'pasta'::text AS tipo_lancamento,
  fp.escritorio_id,
  fp.cliente_id,
  c.nome_completo AS cliente_nome,
  c.email AS cliente_email,
  'Honorários por pasta - ' || to_char(fp.competencia::timestamp with time zone, 'MM/YYYY') AS descricao,
  fp.valor_total AS valor,
  NULL::numeric AS horas,
  NULL::uuid AS processo_id,
  NULL::uuid AS consulta_id,
  NULL::text AS processo_numero,
  NULL::text AS processo_pasta,
  NULL::text AS partes_resumo,
  'pasta'::text AS categoria,
  'pasta'::text AS subtipo,
  (fp.competencia + '1 mon'::interval)::date AS data_vencimento,
  fp.created_at,
  fp.id AS fechamento_id,
  fp.qtd_processos,
  fp.valor_unitario,
  fp.processos AS processos_lista,
  fp.competencia,
  NULL::text AS profissional_nome,
  NULL::text AS cargo_nome,
  NULL::date AS data_trabalho
FROM financeiro_fechamentos_pasta fp
LEFT JOIN crm_pessoas c ON c.id = fp.cliente_id
WHERE fp.status = 'aprovado' AND fp.fatura_id IS NULL AND user_has_access_to_grupo(fp.escritorio_id);

COMMENT ON VIEW v_lancamentos_prontos_faturar IS
  'Unifica receitas, timesheet e despesas prontos para faturar. Timesheet inclui profissional_nome, cargo_nome e data_trabalho para exibição na pré-visualização.';
