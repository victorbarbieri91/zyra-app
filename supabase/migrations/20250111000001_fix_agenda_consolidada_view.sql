-- Recriar a view consolidada incluindo o campo 'local'
-- Isso corrige o problema onde o campo local não estava disponível para o frontend

DROP VIEW IF EXISTS v_agenda_consolidada;

CREATE OR REPLACE VIEW v_agenda_consolidada AS
-- TAREFAS
SELECT
  t.id,
  'tarefa' as tipo_entidade,
  t.titulo,
  t.descricao,
  t.data_inicio,
  t.data_fim,
  false as dia_inteiro,
  t.cor,
  t.status,
  t.prioridade,
  t.tipo as subtipo,
  t.responsavel_id,
  p.nome_completo as responsavel_nome,
  t.progresso_percentual,
  t.prazo_data_limite,
  t.prazo_cumprido,
  NULL::text as local, -- Tarefas não têm local
  t.escritorio_id,
  t.created_at,
  t.updated_at
FROM agenda_tarefas t
LEFT JOIN profiles p ON p.id = t.responsavel_id
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
  e.cor,
  e.status,
  'media' as prioridade,
  'compromisso' as subtipo,
  e.responsavel_id,
  p.nome_completo as responsavel_nome,
  NULL as progresso_percentual,
  NULL as prazo_data_limite,
  NULL as prazo_cumprido,
  e.local, -- Eventos têm campo local
  e.escritorio_id,
  e.created_at,
  e.updated_at
FROM agenda_eventos e
LEFT JOIN profiles p ON p.id = e.responsavel_id
WHERE e.status != 'cancelada'

UNION ALL

-- AUDIÊNCIAS
SELECT
  a.id,
  'audiencia' as tipo_entidade,
  a.titulo,
  a.descricao,
  a.data_hora as data_inicio,
  (a.data_hora + (a.duracao_minutos || ' minutes')::interval) as data_fim,
  false as dia_inteiro,
  COALESCE(a.cor, '#10b981') as cor,
  a.status,
  'alta' as prioridade,
  a.tipo_audiencia as subtipo,
  a.responsavel_id,
  p.nome_completo as responsavel_nome,
  NULL as progresso_percentual,
  NULL as prazo_data_limite,
  NULL as prazo_cumprido,
  COALESCE(a.endereco, a.forum, a.link_virtual) as local, -- Audiências: usar endereço, fórum ou link virtual
  a.escritorio_id,
  a.created_at,
  a.updated_at
FROM agenda_audiencias a
LEFT JOIN profiles p ON p.id = a.responsavel_id
WHERE a.status NOT IN ('cancelada', 'remarcada');

COMMENT ON VIEW v_agenda_consolidada IS 'View consolidada de todas as entidades de agenda incluindo campo local';
