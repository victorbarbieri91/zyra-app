-- ============================================================
-- Atributo "pessoal" em tarefas e compromissos
-- ============================================================
-- 1) Schema: coluna booleana `pessoal` em agenda_tarefas / agenda_eventos
-- 2) RLS SELECT: itens pessoais só visíveis ao criador/responsáveis
-- 3) v_agenda_consolidada: expõe tipo real dos eventos (antes hardcoded
--    'compromisso') e nova coluna `pessoal`
-- 4) Reclassificação retroativa dos pessoais já cadastrados
--    no escritório Polycarpo Advogados (preservando `tipo` original)
-- ============================================================

-- 1) Schema
ALTER TABLE agenda_tarefas
  ADD COLUMN IF NOT EXISTS pessoal boolean NOT NULL DEFAULT false;

ALTER TABLE agenda_eventos
  ADD COLUMN IF NOT EXISTS pessoal boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_agenda_tarefas_pessoal_criador
  ON agenda_tarefas(escritorio_id, criado_por) WHERE pessoal = true;

CREATE INDEX IF NOT EXISTS idx_agenda_eventos_pessoal_criador
  ON agenda_eventos(escritorio_id, criado_por) WHERE pessoal = true;

COMMENT ON COLUMN agenda_tarefas.pessoal IS
  'Quando true, a tarefa é privada do criador/responsáveis. RLS restringe visibilidade.';
COMMENT ON COLUMN agenda_eventos.pessoal IS
  'Quando true, o compromisso é privado do criador/responsáveis. RLS restringe visibilidade.';

-- 2) RLS SELECT policies
DROP POLICY IF EXISTS "Usuarios podem ver tarefas do escritorio" ON agenda_tarefas;
CREATE POLICY "Usuarios podem ver tarefas do escritorio"
  ON agenda_tarefas FOR SELECT
  USING (
    user_has_access_to_grupo(escritorio_id)
    AND (
      pessoal = false
      OR criado_por = auth.uid()
      OR responsavel_id = auth.uid()
      OR auth.uid() = ANY(responsaveis_ids)
    )
  );

DROP POLICY IF EXISTS "Usuarios podem ver eventos do escritorio" ON agenda_eventos;
CREATE POLICY "Usuarios podem ver eventos do escritorio"
  ON agenda_eventos FOR SELECT
  USING (
    user_has_access_to_grupo(escritorio_id)
    AND (
      pessoal = false
      OR criado_por = auth.uid()
      OR responsavel_id = auth.uid()
      OR auth.uid() = ANY(responsaveis_ids)
    )
  );

-- 3) View v_agenda_consolidada
CREATE OR REPLACE VIEW v_agenda_consolidada WITH (security_invoker = true) AS
 SELECT t.id,
    'tarefa'::text AS tipo_entidade,
    t.titulo,
    t.descricao,
        CASE
            WHEN (t.tipo = 'fixa'::text) THEN ((CURRENT_DATE)::timestamp without time zone AT TIME ZONE 'America/Sao_Paulo'::text)
            ELSE ((t.data_inicio)::timestamp without time zone AT TIME ZONE 'America/Sao_Paulo'::text)
        END AS data_inicio,
        CASE
            WHEN (t.tipo = 'fixa'::text) THEN NULL::timestamp with time zone
            ELSE ((t.data_fim)::timestamp without time zone AT TIME ZONE 'America/Sao_Paulo'::text)
        END AS data_fim,
    false AS dia_inteiro,
    t.cor,
        CASE
            WHEN ((t.tipo = 'fixa'::text) AND (t.fixa_status_data = CURRENT_DATE)) THEN t.status
            WHEN (t.tipo = 'fixa'::text) THEN 'pendente'::text
            ELSE t.status
        END AS status,
    t.prioridade,
    t.tipo AS subtipo,
    t.responsavel_id,
    p.nome_completo AS responsavel_nome,
    t.responsaveis_ids,
    ( SELECT string_agg(pr.nome_completo, ', '::text) AS string_agg
           FROM profiles pr
          WHERE (pr.id = ANY (t.responsaveis_ids))) AS todos_responsaveis,
    t.prazo_data_limite,
    NULL::boolean AS prazo_cumprido,
    NULL::text AS prazo_tipo,
    NULL::text AS local,
    t.processo_id,
    proc.numero_cnj AS processo_numero,
        CASE
            WHEN (proc.id IS NOT NULL) THEN concat(proc.autor, ' x ', proc.reu)
            ELSE NULL::text
        END AS caso_titulo,
    t.consultivo_id,
    cons.titulo AS consultivo_titulo,
    t.recorrencia_id,
    t.escritorio_id,
    t.created_at,
    t.updated_at,
    t.pessoal
   FROM (((agenda_tarefas t
     LEFT JOIN profiles p ON ((p.id = t.responsavel_id)))
     LEFT JOIN processos_processos proc ON ((proc.id = t.processo_id)))
     LEFT JOIN consultivo_consultas cons ON ((cons.id = t.consultivo_id)))
  WHERE (t.status <> 'cancelada'::text)
UNION ALL
 SELECT e.id,
    'evento'::text AS tipo_entidade,
    e.titulo,
    e.descricao,
    e.data_inicio,
    e.data_fim,
    e.dia_inteiro,
    NULL::text AS cor,
    e.status,
    'media'::text AS prioridade,
    e.tipo AS subtipo,
    e.responsavel_id,
    p.nome_completo AS responsavel_nome,
    e.responsaveis_ids,
    ( SELECT string_agg(pr.nome_completo, ', '::text) AS string_agg
           FROM profiles pr
          WHERE (pr.id = ANY (e.responsaveis_ids))) AS todos_responsaveis,
    NULL::date AS prazo_data_limite,
    NULL::boolean AS prazo_cumprido,
    NULL::text AS prazo_tipo,
    e.local,
    e.processo_id,
    proc.numero_cnj AS processo_numero,
        CASE
            WHEN (proc.id IS NOT NULL) THEN concat(proc.autor, ' x ', proc.reu)
            ELSE NULL::text
        END AS caso_titulo,
    e.consultivo_id,
    cons.titulo AS consultivo_titulo,
    e.recorrencia_id,
    e.escritorio_id,
    e.created_at,
    e.updated_at,
    e.pessoal
   FROM (((agenda_eventos e
     LEFT JOIN profiles p ON ((p.id = e.responsavel_id)))
     LEFT JOIN processos_processos proc ON ((proc.id = e.processo_id)))
     LEFT JOIN consultivo_consultas cons ON ((cons.id = e.consultivo_id)))
  WHERE (e.status <> 'cancelada'::text)
UNION ALL
 SELECT a.id,
    'audiencia'::text AS tipo_entidade,
    a.titulo,
    a.observacoes AS descricao,
    a.data_hora AS data_inicio,
    (a.data_hora + ((a.duracao_minutos || ' minutes'::text))::interval) AS data_fim,
    false AS dia_inteiro,
    NULL::text AS cor,
    a.status,
    'alta'::text AS prioridade,
    a.tipo_audiencia AS subtipo,
    a.responsavel_id,
    p.nome_completo AS responsavel_nome,
    a.responsaveis_ids,
    ( SELECT string_agg(pr.nome_completo, ', '::text) AS string_agg
           FROM profiles pr
          WHERE (pr.id = ANY (a.responsaveis_ids))) AS todos_responsaveis,
    NULL::date AS prazo_data_limite,
    NULL::boolean AS prazo_cumprido,
    NULL::text AS prazo_tipo,
    COALESCE(a.endereco, a.forum, a.link_virtual) AS local,
    a.processo_id,
    proc.numero_cnj AS processo_numero,
        CASE
            WHEN (proc.id IS NOT NULL) THEN concat(proc.autor, ' x ', proc.reu)
            ELSE NULL::text
        END AS caso_titulo,
    NULL::uuid AS consultivo_id,
    NULL::text AS consultivo_titulo,
    NULL::uuid AS recorrencia_id,
    a.escritorio_id,
    a.created_at,
    a.updated_at,
    false AS pessoal
   FROM ((agenda_audiencias a
     LEFT JOIN profiles p ON ((p.id = a.responsavel_id)))
     LEFT JOIN processos_processos proc ON ((proc.id = a.processo_id)))
  WHERE (a.status <> ALL (ARRAY['cancelada'::text, 'remarcada'::text]));

-- 4) Reclassificação retroativa — Polycarpo Advogados
UPDATE agenda_tarefas
SET pessoal = true, updated_at = now()
WHERE escritorio_id = 'f2568999-0ae6-47db-9293-a6f1672ed421'
  AND pessoal = false
  AND (
    titulo ILIKE 'Aula de franc%'
    OR titulo ILIKE 'Treino%'
    OR titulo ILIKE 'Curso Sorbonne%'
    OR titulo ILIKE 'Preparar Aula de Franc%'
    OR titulo ILIKE 'Reunião Comissão ESG Board Academy%'
    OR titulo ILIKE 'SORBONNE%'
  );

UPDATE agenda_eventos
SET pessoal = true, updated_at = now()
WHERE escritorio_id = 'f2568999-0ae6-47db-9293-a6f1672ed421'
  AND pessoal = false
  AND (
    titulo ILIKE 'Aula de Franc%'
    OR titulo ILIKE 'Curso Sorbonne%'
  );
