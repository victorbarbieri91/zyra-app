-- ============================================================================
-- Migração: Corrigir cálculo de "a cada N semanas" quando há dias_semana
-- ============================================================================
-- Bug: para frequência 'semanal' com regra_dias_semana definido,
-- materializar_recorrencia_agenda ignorava regra_intervalo (>1). Resultado:
-- regra "a cada 2 semanas, segunda" gerava todas as segundas (toda semana)
-- em vez de a cada 14 dias.
--
-- Causa: o loop interno avança 1 dia por vez e filtra por dias_semana, mas
-- não verificava se a "semana" corrente é múltipla de regra_intervalo.
--
-- Correção: nova checagem após o filtro de dias_semana —
--   v_semanas_desde := (v_data - v_regra.data_inicio) / 7
--   pular dia se (v_semanas_desde % regra_intervalo) != 0.
--
-- Validado com a regra do Victor "Revisar - Automação de temas tributários"
-- (regra_intervalo=2, dias_semana=[1]): antes gerava 26 segundas em 6 meses,
-- agora gera 13 (a cada 14 dias) — comportamento correto.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.materializar_recorrencia_agenda(
  p_regra_id uuid,
  p_horizonte_meses int DEFAULT 6
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_regra            agenda_recorrencias%ROWTYPE;
  v_inicio           date;
  v_fim              date;
  v_data             date;
  v_count            integer := 0;
  v_rows             integer;
  v_template         jsonb;
  v_responsaveis_ids uuid[];
  v_responsavel_id   uuid;
  v_processo_id      uuid;
  v_consultivo_id    uuid;
  v_hora             time;
  v_data_inicio_ts   timestamptz;
  v_dia_dow          integer;
  v_semanas_desde    integer;
BEGIN
  SELECT * INTO v_regra FROM agenda_recorrencias WHERE id = p_regra_id AND ativo = true;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  IF v_regra.entidade_tipo NOT IN ('tarefa', 'evento') THEN
    RETURN 0;
  END IF;

  v_template := COALESCE(v_regra.template_dados, '{}'::jsonb);

  v_processo_id := NULLIF(v_template->>'processo_id', '')::uuid;
  IF v_processo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM processos_processos WHERE id = v_processo_id) THEN
      v_processo_id := NULL;
    END IF;
  END IF;

  v_consultivo_id := NULLIF(v_template->>'consultivo_id', '')::uuid;
  IF v_consultivo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM consultivo_consultas WHERE id = v_consultivo_id) THEN
      v_consultivo_id := NULL;
    END IF;
  END IF;

  IF jsonb_typeof(v_template->'responsaveis_ids') = 'array' THEN
    SELECT COALESCE(array_agg((value::text)::uuid), ARRAY[]::uuid[])
      INTO v_responsaveis_ids
      FROM jsonb_array_elements_text(v_template->'responsaveis_ids') AS value;
  ELSE
    v_responsaveis_ids := ARRAY[]::uuid[];
  END IF;

  v_responsavel_id := NULLIF(v_template->>'responsavel_id', '')::uuid;
  IF v_responsavel_id IS NULL AND array_length(v_responsaveis_ids, 1) > 0 THEN
    v_responsavel_id := v_responsaveis_ids[1];
  END IF;

  v_hora := COALESCE(v_regra.regra_hora, '09:00'::time);

  v_inicio := GREATEST(v_regra.data_inicio, CURRENT_DATE);
  v_fim := (CURRENT_DATE + (p_horizonte_meses || ' months')::interval)::date;
  IF v_regra.data_fim IS NOT NULL AND v_regra.data_fim < v_fim THEN
    v_fim := v_regra.data_fim;
  END IF;
  IF v_inicio > v_fim THEN
    RETURN 0;
  END IF;

  v_data := v_inicio;

  WHILE v_data <= v_fim LOOP
    IF v_regra.max_ocorrencias IS NOT NULL
       AND v_regra.total_criados + v_count >= v_regra.max_ocorrencias THEN
      EXIT;
    END IF;

    IF v_data = ANY(COALESCE(v_regra.exclusoes, ARRAY[]::date[])) THEN
      v_data := proxima_data_recorrencia(v_regra, v_data);
      CONTINUE;
    END IF;

    IF COALESCE(v_regra.regra_apenas_uteis, false) THEN
      v_dia_dow := EXTRACT(DOW FROM v_data)::int;
      IF v_dia_dow IN (0, 6) THEN
        v_data := v_data + 1;
        CONTINUE;
      END IF;
    END IF;

    IF v_regra.regra_frequencia = 'semanal'
       AND v_regra.regra_dias_semana IS NOT NULL
       AND array_length(v_regra.regra_dias_semana, 1) > 0 THEN
      v_dia_dow := EXTRACT(DOW FROM v_data)::int;
      IF NOT (v_dia_dow = ANY(v_regra.regra_dias_semana)) THEN
        v_data := v_data + 1;
        CONTINUE;
      END IF;

      -- "A cada N semanas": só gera quando o índice da semana
      -- (contado a partir de data_inicio da regra) for múltiplo de N.
      IF COALESCE(v_regra.regra_intervalo, 1) > 1 THEN
        v_semanas_desde := ((v_data - v_regra.data_inicio) / 7)::int;
        IF (v_semanas_desde % v_regra.regra_intervalo) != 0 THEN
          v_data := v_data + 1;
          CONTINUE;
        END IF;
      END IF;
    END IF;

    IF v_regra.entidade_tipo = 'tarefa' THEN
      INSERT INTO agenda_tarefas (
        escritorio_id, recorrencia_id, status,
        titulo, descricao, tipo, prioridade,
        data_inicio, data_fim,
        responsavel_id, responsaveis_ids,
        cor, processo_id, consultivo_id,
        prazo_data_limite, prazo_dias_uteis,
        pessoal
      )
      SELECT
        v_regra.escritorio_id, v_regra.id, 'pendente',
        COALESCE(v_template->>'titulo', v_regra.template_nome),
        v_template->>'descricao',
        COALESCE(v_template->>'tipo', 'outro'),
        COALESCE(v_template->>'prioridade', 'media'),
        v_data,
        NULLIF(v_template->>'data_fim', '')::date,
        v_responsavel_id, v_responsaveis_ids,
        v_template->>'cor', v_processo_id, v_consultivo_id,
        NULLIF(v_template->>'prazo_data_limite', '')::date,
        COALESCE((v_template->>'prazo_dias_uteis')::boolean, true),
        COALESCE((v_template->>'pessoal')::boolean, false)
      WHERE NOT EXISTS (
        SELECT 1 FROM agenda_tarefas
         WHERE recorrencia_id = v_regra.id AND data_inicio = v_data
      );
      GET DIAGNOSTICS v_rows = ROW_COUNT;
      v_count := v_count + v_rows;

    ELSIF v_regra.entidade_tipo = 'evento' THEN
      v_data_inicio_ts := (v_data::text || ' ' || v_hora::text)::timestamptz;
      INSERT INTO agenda_eventos (
        escritorio_id, recorrencia_id, status,
        titulo, descricao, tipo,
        data_inicio, dia_inteiro, local,
        responsavel_id, responsaveis_ids,
        cor, processo_id, consultivo_id,
        pessoal
      )
      SELECT
        v_regra.escritorio_id, v_regra.id, 'agendado',
        COALESCE(v_template->>'titulo', v_regra.template_nome),
        v_template->>'descricao',
        COALESCE(v_template->>'tipo', 'compromisso'),
        v_data_inicio_ts,
        COALESCE((v_template->>'dia_inteiro')::boolean, false),
        v_template->>'local',
        v_responsavel_id, v_responsaveis_ids,
        COALESCE(v_template->>'cor', '#6366F1'),
        v_processo_id, v_consultivo_id,
        COALESCE((v_template->>'pessoal')::boolean, false)
      WHERE NOT EXISTS (
        SELECT 1 FROM agenda_eventos
         WHERE recorrencia_id = v_regra.id AND data_inicio::date = v_data
      );
      GET DIAGNOSTICS v_rows = ROW_COUNT;
      v_count := v_count + v_rows;
    END IF;

    v_data := proxima_data_recorrencia(v_regra, v_data);
  END LOOP;

  UPDATE agenda_recorrencias
     SET total_criados = (
           CASE v_regra.entidade_tipo
             WHEN 'tarefa' THEN (SELECT COUNT(*) FROM agenda_tarefas WHERE recorrencia_id = v_regra.id)
             WHEN 'evento' THEN (SELECT COUNT(*) FROM agenda_eventos WHERE recorrencia_id = v_regra.id)
           END
         ),
         ultima_execucao = CURRENT_DATE,
         updated_at = now()
   WHERE id = v_regra.id;

  RETURN v_count;
END;
$function$;

-- Re-materializar a regra do Victor com a função corrigida
DELETE FROM agenda_tarefas WHERE recorrencia_id = '0bf894db-df06-4d6a-bbb9-9d6b52834a36';
SELECT public.materializar_recorrencia_agenda('0bf894db-df06-4d6a-bbb9-9d6b52834a36', 6);
