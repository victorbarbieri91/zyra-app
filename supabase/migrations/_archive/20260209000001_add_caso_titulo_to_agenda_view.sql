-- Adicionar caso_titulo + responsaveis_ids na view v_agenda_consolidada
-- caso_titulo: CONCAT(autor, ' x ', reu) para identificar o caso na sidebar
-- responsaveis_ids: array de UUIDs para filtro por responsável
-- todos_responsaveis: nomes agregados para exibição
-- TIMEZONE FIX: agenda_tarefas usa tipo 'date', que no UNION ALL com 'timestamptz'
-- sofre cast implícito para meia-noite UTC, causando dia anterior em SP.
-- Solução: cast explícito com AT TIME ZONE 'America/Sao_Paulo'

DROP VIEW IF EXISTS v_agenda_consolidada;

CREATE VIEW v_agenda_consolidada
WITH (security_invoker = true)
AS
-- TAREFAS
SELECT
  t.id,
  'tarefa' as tipo_entidade,
  t.titulo,
  t.descricao,
  t.data_inicio::timestamp AT TIME ZONE 'America/Sao_Paulo' as data_inicio,
  t.data_fim::timestamp AT TIME ZONE 'America/Sao_Paulo' as data_fim,
  false as dia_inteiro,
  t.cor,
  t.status,
  t.prioridade,
  t.tipo as subtipo,
  t.responsavel_id,
  p.nome_completo as responsavel_nome,
  t.responsaveis_ids,
  (SELECT string_agg(pr.nome_completo, ', ') FROM profiles pr WHERE pr.id = ANY(t.responsaveis_ids)) as todos_responsaveis,
  t.prazo_data_limite,
  NULL::boolean as prazo_cumprido,
  NULL::text as prazo_tipo,
  NULL::text as local,
  t.processo_id,
  proc.numero_cnj as processo_numero,
  CASE
    WHEN proc.id IS NOT NULL THEN CONCAT(proc.autor, ' x ', proc.reu)
    ELSE NULL
  END as caso_titulo,
  t.consultivo_id,
  cons.titulo as consultivo_titulo,
  t.recorrencia_id,
  t.escritorio_id,
  t.created_at,
  t.updated_at
FROM agenda_tarefas t
LEFT JOIN profiles p ON p.id = t.responsavel_id
LEFT JOIN processos_processos proc ON proc.id = t.processo_id
LEFT JOIN consultivo_consultas cons ON cons.id = t.consultivo_id
WHERE t.status != 'cancelada'

UNION ALL

-- EVENTOS
SELECT
  e.id,
  'evento' as tipo_entidade,
  e.titulo,
  e.descricao,
  e.data_inicio,
  e.data_fim,
  e.dia_inteiro,
  NULL::text as cor,
  e.status,
  'media' as prioridade,
  'compromisso' as subtipo,
  e.responsavel_id,
  p.nome_completo as responsavel_nome,
  e.responsaveis_ids,
  (SELECT string_agg(pr.nome_completo, ', ') FROM profiles pr WHERE pr.id = ANY(e.responsaveis_ids)) as todos_responsaveis,
  NULL::date as prazo_data_limite,
  NULL::boolean as prazo_cumprido,
  NULL::text as prazo_tipo,
  e.local,
  e.processo_id,
  proc.numero_cnj as processo_numero,
  CASE
    WHEN proc.id IS NOT NULL THEN CONCAT(proc.autor, ' x ', proc.reu)
    ELSE NULL
  END as caso_titulo,
  e.consultivo_id,
  cons.titulo as consultivo_titulo,
  e.recorrencia_id,
  e.escritorio_id,
  e.created_at,
  e.updated_at
FROM agenda_eventos e
LEFT JOIN profiles p ON p.id = e.responsavel_id
LEFT JOIN processos_processos proc ON proc.id = e.processo_id
LEFT JOIN consultivo_consultas cons ON cons.id = e.consultivo_id
WHERE e.status != 'cancelada'

UNION ALL

-- AUDIENCIAS
SELECT
  a.id,
  'audiencia' as tipo_entidade,
  a.titulo,
  a.observacoes as descricao,
  a.data_hora as data_inicio,
  (a.data_hora + (a.duracao_minutos || ' minutes')::interval) as data_fim,
  false as dia_inteiro,
  NULL::text as cor,
  a.status,
  'alta' as prioridade,
  a.tipo_audiencia as subtipo,
  a.responsavel_id,
  p.nome_completo as responsavel_nome,
  a.responsaveis_ids,
  (SELECT string_agg(pr.nome_completo, ', ') FROM profiles pr WHERE pr.id = ANY(a.responsaveis_ids)) as todos_responsaveis,
  NULL::date as prazo_data_limite,
  NULL::boolean as prazo_cumprido,
  NULL::text as prazo_tipo,
  COALESCE(a.endereco, a.forum, a.link_virtual) as local,
  a.processo_id,
  proc.numero_cnj as processo_numero,
  CASE
    WHEN proc.id IS NOT NULL THEN CONCAT(proc.autor, ' x ', proc.reu)
    ELSE NULL
  END as caso_titulo,
  NULL::uuid as consultivo_id,
  NULL::text as consultivo_titulo,
  NULL::uuid as recorrencia_id,
  a.escritorio_id,
  a.created_at,
  a.updated_at
FROM agenda_audiencias a
LEFT JOIN profiles p ON p.id = a.responsavel_id
LEFT JOIN processos_processos proc ON proc.id = a.processo_id
WHERE a.status NOT IN ('cancelada', 'remarcada');

-- Garantir permissoes para usuarios autenticados
GRANT SELECT ON v_agenda_consolidada TO authenticated;

COMMENT ON VIEW v_agenda_consolidada IS
  'View consolidada de agenda com SECURITY INVOKER, caso_titulo, responsaveis_ids e timezone fix para tarefas';
