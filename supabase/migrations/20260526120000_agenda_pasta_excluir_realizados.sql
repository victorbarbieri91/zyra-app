-- Esconde compromissos/audiências realizados da agenda lateral
-- de processos e pastas consultivas. Tarefas concluídas já eram filtradas.
-- Convenção do sistema:
--   evento.status     ∈ {agendado, cancelado, realizado}
--   audiencia.status  ∈ {agendada, cancelada, realizada, remarcada}
--   tarefa.status     ∈ {pendente, em_andamento, em_pausa, concluida, cancelada}

CREATE OR REPLACE FUNCTION public.get_agenda_processo(p_processo_id uuid)
 RETURNS TABLE(id uuid, tipo_entidade text, titulo text, descricao text, data_inicio timestamp with time zone, data_fim timestamp with time zone, dia_inteiro boolean, cor text, status text, prioridade text, subtipo text, responsavel_id uuid, responsavel_nome text, responsaveis_nomes text[], prazo_data_limite date, prazo_cumprido boolean, prazo_tipo text, local text, processo_id uuid, processo_numero text, consultivo_id uuid, consultivo_titulo text, recorrencia_id uuid, escritorio_id uuid, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_escritorio_id UUID;
BEGIN
  SELECT pp.escritorio_id INTO v_escritorio_id
  FROM processos_processos pp
  WHERE pp.id = p_processo_id;

  IF v_escritorio_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY

  -- TAREFAS (exclui cancelada E concluida)
  SELECT
    t.id,
    'tarefa'::TEXT AS tipo_entidade,
    t.titulo,
    t.descricao,
    (t.data_inicio + TIME '12:00:00') AT TIME ZONE 'America/Sao_Paulo' AS data_inicio,
    CASE WHEN t.data_fim IS NOT NULL
      THEN (t.data_fim + TIME '12:00:00') AT TIME ZONE 'America/Sao_Paulo'
      ELSE NULL
    END AS data_fim,
    false AS dia_inteiro,
    t.cor,
    t.status,
    t.prioridade,
    t.tipo AS subtipo,
    t.responsaveis_ids[1] AS responsavel_id,
    (SELECT pf.nome_completo FROM profiles pf WHERE pf.id = t.responsaveis_ids[1]) AS responsavel_nome,
    (SELECT array_agg(pf.nome_completo ORDER BY pf.nome_completo)
     FROM profiles pf WHERE pf.id = ANY(t.responsaveis_ids)) AS responsaveis_nomes,
    t.prazo_data_limite,
    NULL::BOOLEAN AS prazo_cumprido,
    NULL::TEXT AS prazo_tipo,
    NULL::TEXT AS local,
    t.processo_id,
    proc.numero_cnj AS processo_numero,
    t.consultivo_id,
    cons.titulo AS consultivo_titulo,
    t.recorrencia_id,
    t.escritorio_id,
    t.created_at,
    t.updated_at
  FROM agenda_tarefas t
  LEFT JOIN processos_processos proc ON proc.id = t.processo_id
  LEFT JOIN consultivo_consultas cons ON cons.id = t.consultivo_id
  WHERE t.processo_id = p_processo_id
    AND t.escritorio_id = v_escritorio_id
    AND t.status NOT IN ('cancelada', 'concluida')

  UNION ALL

  -- EVENTOS (exclui cancelado E realizado)
  SELECT
    e.id,
    'evento'::TEXT AS tipo_entidade,
    e.titulo,
    e.descricao,
    e.data_inicio,
    e.data_fim,
    e.dia_inteiro,
    NULL::TEXT AS cor,
    COALESCE(e.status, 'agendado') AS status,
    'media'::TEXT AS prioridade,
    COALESCE(e.tipo, 'compromisso') AS subtipo,
    e.responsaveis_ids[1] AS responsavel_id,
    (SELECT pf.nome_completo FROM profiles pf WHERE pf.id = e.responsaveis_ids[1]) AS responsavel_nome,
    (SELECT array_agg(pf.nome_completo ORDER BY pf.nome_completo)
     FROM profiles pf WHERE pf.id = ANY(e.responsaveis_ids)) AS responsaveis_nomes,
    NULL::DATE AS prazo_data_limite,
    NULL::BOOLEAN AS prazo_cumprido,
    NULL::TEXT AS prazo_tipo,
    e.local,
    e.processo_id,
    proc.numero_cnj AS processo_numero,
    e.consultivo_id,
    cons.titulo AS consultivo_titulo,
    e.recorrencia_id,
    e.escritorio_id,
    e.created_at,
    e.updated_at
  FROM agenda_eventos e
  LEFT JOIN processos_processos proc ON proc.id = e.processo_id
  LEFT JOIN consultivo_consultas cons ON cons.id = e.consultivo_id
  WHERE e.processo_id = p_processo_id
    AND e.escritorio_id = v_escritorio_id
    AND COALESCE(e.status, 'agendado') NOT IN ('cancelado', 'realizado')

  UNION ALL

  -- AUDIÊNCIAS (exclui cancelada, remarcada E realizada)
  SELECT
    a.id,
    'audiencia'::TEXT AS tipo_entidade,
    a.titulo,
    a.observacoes AS descricao,
    a.data_hora AS data_inicio,
    a.data_hora + (a.duracao_minutos || ' minutes')::INTERVAL AS data_fim,
    false AS dia_inteiro,
    a.cor,
    a.status,
    'alta'::TEXT AS prioridade,
    a.tipo_audiencia AS subtipo,
    a.responsaveis_ids[1] AS responsavel_id,
    (SELECT pf.nome_completo FROM profiles pf WHERE pf.id = a.responsaveis_ids[1]) AS responsavel_nome,
    (SELECT array_agg(pf.nome_completo ORDER BY pf.nome_completo)
     FROM profiles pf WHERE pf.id = ANY(a.responsaveis_ids)) AS responsaveis_nomes,
    NULL::DATE AS prazo_data_limite,
    NULL::BOOLEAN AS prazo_cumprido,
    NULL::TEXT AS prazo_tipo,
    COALESCE(a.endereco, a.forum, a.link_virtual) AS local,
    a.processo_id,
    proc.numero_cnj AS processo_numero,
    a.consultivo_id,
    cons.titulo AS consultivo_titulo,
    NULL::UUID AS recorrencia_id,
    a.escritorio_id,
    a.created_at,
    a.updated_at
  FROM agenda_audiencias a
  LEFT JOIN processos_processos proc ON proc.id = a.processo_id
  LEFT JOIN consultivo_consultas cons ON cons.id = a.consultivo_id
  WHERE a.processo_id = p_processo_id
    AND a.escritorio_id = v_escritorio_id
    AND a.status NOT IN ('cancelada', 'remarcada', 'realizada')

  ORDER BY data_inicio ASC;
END;
$function$;


CREATE OR REPLACE FUNCTION public.get_agenda_consultivo(p_consultivo_id uuid)
 RETURNS TABLE(id uuid, tipo_entidade text, titulo text, descricao text, data_inicio timestamp with time zone, data_fim timestamp with time zone, dia_inteiro boolean, cor text, status text, prioridade text, subtipo text, responsavel_id uuid, responsavel_nome text, prazo_data_limite date, prazo_cumprido boolean, prazo_tipo text, local text, processo_id uuid, processo_numero text, consultivo_id uuid, consultivo_titulo text, recorrencia_id uuid, escritorio_id uuid, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_escritorio_id UUID;
  v_user_escritorio_id UUID;
BEGIN
  SELECT cc.escritorio_id INTO v_escritorio_id
  FROM consultivo_consultas cc
  WHERE cc.id = p_consultivo_id;

  SELECT eu.escritorio_id INTO v_user_escritorio_id
  FROM escritorios_usuarios eu
  WHERE eu.user_id = auth.uid()
    AND eu.escritorio_id = v_escritorio_id
    AND eu.ativo = true;

  IF v_user_escritorio_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY

  -- TAREFAS (exclui cancelada E concluida)
  SELECT
    t.id,
    'tarefa'::TEXT AS tipo_entidade,
    t.titulo,
    t.descricao,
    (t.data_inicio + TIME '12:00:00') AT TIME ZONE 'America/Sao_Paulo' AS data_inicio,
    CASE WHEN t.data_fim IS NOT NULL
      THEN (t.data_fim + TIME '12:00:00') AT TIME ZONE 'America/Sao_Paulo'
      ELSE NULL
    END AS data_fim,
    false AS dia_inteiro,
    t.cor,
    t.status,
    t.prioridade,
    t.tipo AS subtipo,
    t.responsaveis_ids[1] AS responsavel_id,
    (SELECT pf.nome_completo FROM profiles pf WHERE pf.id = t.responsaveis_ids[1]) AS responsavel_nome,
    t.prazo_data_limite,
    NULL::BOOLEAN AS prazo_cumprido,
    NULL::TEXT AS prazo_tipo,
    NULL::TEXT AS local,
    t.processo_id,
    proc.numero_cnj AS processo_numero,
    t.consultivo_id,
    cons.titulo AS consultivo_titulo,
    t.recorrencia_id,
    t.escritorio_id,
    t.created_at,
    t.updated_at
  FROM agenda_tarefas t
  LEFT JOIN processos_processos proc ON proc.id = t.processo_id
  LEFT JOIN consultivo_consultas cons ON cons.id = t.consultivo_id
  WHERE t.consultivo_id = p_consultivo_id
    AND t.status NOT IN ('cancelada', 'concluida')

  UNION ALL

  -- EVENTOS (exclui cancelado E realizado)
  SELECT
    e.id,
    'evento'::TEXT AS tipo_entidade,
    e.titulo,
    e.descricao,
    e.data_inicio,
    e.data_fim,
    e.dia_inteiro,
    NULL::TEXT AS cor,
    COALESCE(e.status, 'agendado') AS status,
    'media'::TEXT AS prioridade,
    COALESCE(e.tipo, 'compromisso') AS subtipo,
    e.responsaveis_ids[1] AS responsavel_id,
    (SELECT pf.nome_completo FROM profiles pf WHERE pf.id = e.responsaveis_ids[1]) AS responsavel_nome,
    NULL::DATE AS prazo_data_limite,
    NULL::BOOLEAN AS prazo_cumprido,
    NULL::TEXT AS prazo_tipo,
    e.local,
    e.processo_id,
    proc.numero_cnj AS processo_numero,
    e.consultivo_id,
    cons.titulo AS consultivo_titulo,
    e.recorrencia_id,
    e.escritorio_id,
    e.created_at,
    e.updated_at
  FROM agenda_eventos e
  LEFT JOIN processos_processos proc ON proc.id = e.processo_id
  LEFT JOIN consultivo_consultas cons ON cons.id = e.consultivo_id
  WHERE e.consultivo_id = p_consultivo_id
    AND COALESCE(e.status, 'agendado') NOT IN ('cancelado', 'realizado')

  UNION ALL

  -- AUDIÊNCIAS (exclui cancelada, remarcada E realizada)
  SELECT
    a.id,
    'audiencia'::TEXT AS tipo_entidade,
    a.titulo,
    a.observacoes AS descricao,
    a.data_hora AS data_inicio,
    a.data_hora + (a.duracao_minutos || ' minutes')::INTERVAL AS data_fim,
    false AS dia_inteiro,
    a.cor,
    a.status,
    'alta'::TEXT AS prioridade,
    a.tipo_audiencia AS subtipo,
    a.responsaveis_ids[1] AS responsavel_id,
    (SELECT pf.nome_completo FROM profiles pf WHERE pf.id = a.responsaveis_ids[1]) AS responsavel_nome,
    NULL::DATE AS prazo_data_limite,
    NULL::BOOLEAN AS prazo_cumprido,
    NULL::TEXT AS prazo_tipo,
    COALESCE(a.endereco, a.forum, a.link_virtual) AS local,
    a.processo_id,
    proc.numero_cnj AS processo_numero,
    a.consultivo_id,
    cons.titulo AS consultivo_titulo,
    NULL::UUID AS recorrencia_id,
    a.escritorio_id,
    a.created_at,
    a.updated_at
  FROM agenda_audiencias a
  LEFT JOIN processos_processos proc ON proc.id = a.processo_id
  LEFT JOIN consultivo_consultas cons ON cons.id = a.consultivo_id
  WHERE a.consultivo_id = p_consultivo_id
    AND a.status NOT IN ('cancelada', 'remarcada', 'realizada')

  ORDER BY data_inicio ASC;

END;
$function$;
