-- ============================================================================
-- Migração: Agenda — modelo materializado para recorrências
-- ============================================================================
-- Objetivo: Substituir a expansão virtual em runtime por instâncias reais
-- em agenda_tarefas e agenda_eventos. Janela rolante de 6 meses mantida
-- por trigger (ao criar/editar regra) + cron diário.
--
-- Garantias de segurança:
--   - Zero DELETE em dados existentes.
--   - Zero UPDATE em linhas existentes (exceto total_criados, contador).
--   - Backup completo das 3 tabelas é criado no início da migration.
--   - Operações idempotentes via INSERT ... WHERE NOT EXISTS.
--
-- Rollback: ver plano em /Users/victortavolarobarbieri/.claude/plans/
-- ============================================================================

-- ============================================================================
-- 1. BACKUP — snapshot pré-migration (mantém até OK explícito do usuário)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public._backup_agenda_recorrencias_20260511
  AS SELECT * FROM public.agenda_recorrencias;

CREATE TABLE IF NOT EXISTS public._backup_agenda_tarefas_20260511
  AS SELECT * FROM public.agenda_tarefas;

CREATE TABLE IF NOT EXISTS public._backup_agenda_eventos_20260511
  AS SELECT * FROM public.agenda_eventos;

COMMENT ON TABLE public._backup_agenda_recorrencias_20260511 IS
  'Backup pré-migração (2026-05-11) — modelo virtual → materializado. Pode ser dropado após validação.';
COMMENT ON TABLE public._backup_agenda_tarefas_20260511 IS
  'Backup pré-migração (2026-05-11) — modelo virtual → materializado. Pode ser dropado após validação.';
COMMENT ON TABLE public._backup_agenda_eventos_20260511 IS
  'Backup pré-migração (2026-05-11) — modelo virtual → materializado. Pode ser dropado após validação.';


-- ============================================================================
-- 2. FUNÇÃO AUXILIAR: proxima_data_recorrencia
-- ============================================================================
-- Calcula a próxima data válida a partir da atual, respeitando frequência
-- e intervalo da regra. Avança em granularidade fina (1 dia) para semanal
-- com múltiplos dias da semana, e em saltos maiores para outras frequências.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.proxima_data_recorrencia(
  p_regra agenda_recorrencias,
  p_data_atual date
)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $function$
DECLARE
  v_proxima date;
BEGIN
  CASE p_regra.regra_frequencia
    WHEN 'diaria' THEN
      v_proxima := p_data_atual + (COALESCE(p_regra.regra_intervalo, 1) || ' days')::interval;

    WHEN 'semanal' THEN
      -- Se há dias da semana definidos, avança 1 dia para permitir o loop iterar
      IF p_regra.regra_dias_semana IS NOT NULL
         AND array_length(p_regra.regra_dias_semana, 1) > 0 THEN
        v_proxima := p_data_atual + 1;
      ELSE
        v_proxima := p_data_atual + (7 * COALESCE(p_regra.regra_intervalo, 1) || ' days')::interval;
      END IF;

    WHEN 'mensal' THEN
      v_proxima := (p_data_atual + (COALESCE(p_regra.regra_intervalo, 1) || ' months')::interval)::date;
      IF p_regra.regra_dia_mes IS NOT NULL THEN
        -- Ajustar para o dia específico (cap no último dia do mês se necessário)
        v_proxima := LEAST(
          make_date(EXTRACT(YEAR FROM v_proxima)::int, EXTRACT(MONTH FROM v_proxima)::int, p_regra.regra_dia_mes),
          (date_trunc('month', v_proxima) + interval '1 month - 1 day')::date
        );
      END IF;

    WHEN 'anual' THEN
      v_proxima := (p_data_atual + (COALESCE(p_regra.regra_intervalo, 1) || ' years')::interval)::date;
      IF p_regra.regra_mes IS NOT NULL AND p_regra.regra_dia_mes IS NOT NULL THEN
        v_proxima := LEAST(
          make_date(EXTRACT(YEAR FROM v_proxima)::int, p_regra.regra_mes, p_regra.regra_dia_mes),
          (date_trunc('month', make_date(EXTRACT(YEAR FROM v_proxima)::int, p_regra.regra_mes, 1)) + interval '1 month - 1 day')::date
        );
      END IF;

    ELSE
      v_proxima := p_data_atual + 1;
  END CASE;

  RETURN v_proxima;
END;
$function$;


-- ============================================================================
-- 3. FUNÇÃO: materializar_recorrencia_agenda
-- ============================================================================
-- Materializa as instâncias faltantes de uma regra dentro da janela
-- [CURRENT_DATE, CURRENT_DATE + horizonte meses]. Idempotente.
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
  v_data_str         text;
  v_count            integer := 0;
  v_rows             integer;
  v_tabela           text;
  v_template         jsonb;
  v_responsaveis_ids uuid[];
  v_responsavel_id   uuid;
  v_processo_id      uuid;
  v_consultivo_id    uuid;
  v_hora             time;
  v_data_inicio_ts   timestamptz;
  v_dia_dow          integer;
BEGIN
  -- 1) Carregar regra ativa
  SELECT * INTO v_regra
    FROM agenda_recorrencias
   WHERE id = p_regra_id AND ativo = true;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  IF v_regra.entidade_tipo NOT IN ('tarefa', 'evento') THEN
    RETURN 0;
  END IF;

  v_tabela := CASE v_regra.entidade_tipo
                WHEN 'tarefa' THEN 'agenda_tarefas'
                WHEN 'evento' THEN 'agenda_eventos'
              END;

  v_template := COALESCE(v_regra.template_dados, '{}'::jsonb);

  -- 2) Validar FKs do template (template pode referenciar entidades deletadas)
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

  -- 3) Resolver responsaveis_ids (array uuid)
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

  -- 4) Calcular janela
  v_inicio := GREATEST(v_regra.data_inicio, CURRENT_DATE);
  v_fim := CURRENT_DATE + (p_horizonte_meses || ' months')::interval;

  IF v_regra.data_fim IS NOT NULL AND v_regra.data_fim < v_fim THEN
    v_fim := v_regra.data_fim;
  END IF;

  IF v_inicio > v_fim THEN
    RETURN 0;
  END IF;

  -- 5) Iterar datas dentro da janela respeitando a frequência
  v_data := v_inicio;

  WHILE v_data <= v_fim LOOP
    -- Respeitar max_ocorrencias (se definido)
    IF v_regra.max_ocorrencias IS NOT NULL
       AND v_regra.total_criados + v_count >= v_regra.max_ocorrencias THEN
      EXIT;
    END IF;

    -- Pular datas em exclusoes
    IF v_data = ANY(COALESCE(v_regra.exclusoes, ARRAY[]::date[])) THEN
      v_data := proxima_data_recorrencia(v_regra, v_data);
      CONTINUE;
    END IF;

    -- Pular finais de semana se regra_apenas_uteis
    IF COALESCE(v_regra.regra_apenas_uteis, false) THEN
      v_dia_dow := EXTRACT(DOW FROM v_data)::int;
      IF v_dia_dow IN (0, 6) THEN
        v_data := v_data + 1;
        CONTINUE;
      END IF;
    END IF;

    -- Validar dias_semana para frequência semanal
    IF v_regra.regra_frequencia = 'semanal'
       AND v_regra.regra_dias_semana IS NOT NULL
       AND array_length(v_regra.regra_dias_semana, 1) > 0 THEN
      v_dia_dow := EXTRACT(DOW FROM v_data)::int;
      IF NOT (v_dia_dow = ANY(v_regra.regra_dias_semana)) THEN
        v_data := v_data + 1;
        CONTINUE;
      END IF;
    END IF;

    -- INSERT idempotente
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
         WHERE recorrencia_id = v_regra.id
           AND data_inicio = v_data
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
         WHERE recorrencia_id = v_regra.id
           AND data_inicio::date = v_data
      );

      GET DIAGNOSTICS v_rows = ROW_COUNT;
      v_count := v_count + v_rows;
    END IF;

    -- Próxima data na sequência
    v_data := proxima_data_recorrencia(v_regra, v_data);
  END LOOP;

  -- Atualizar contador (idempotente, baseado no count real)
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


-- ============================================================================
-- 4. FUNÇÃO: estender_janela_recorrencias_agenda
-- ============================================================================
-- Itera todas as regras ativas e materializa instâncias na janela.
-- Usada pelo cron diário e pelo backfill inicial.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.estender_janela_recorrencias_agenda(
  p_horizonte_meses int DEFAULT 6
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_regra_id uuid;
  v_total    integer := 0;
  v_count    integer;
BEGIN
  FOR v_regra_id IN
    SELECT id FROM agenda_recorrencias
     WHERE ativo = true
       AND entidade_tipo IN ('tarefa', 'evento')
       AND (data_fim IS NULL OR data_fim >= CURRENT_DATE)
  LOOP
    BEGIN
      v_count := materializar_recorrencia_agenda(v_regra_id, p_horizonte_meses);
      v_total := v_total + v_count;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Erro ao materializar recorrencia %: %', v_regra_id, SQLERRM;
    END;
  END LOOP;

  RETURN v_total;
END;
$function$;


-- ============================================================================
-- 5. FUNÇÃO: atualizar_regra_serie_agenda
-- ============================================================================
-- Atualiza a regra e propaga para instâncias pendentes a partir de p_data_corte
-- (null = toda a série a partir de hoje). Preserva instâncias terminadas.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.atualizar_regra_serie_agenda(
  p_regra_id            uuid,
  p_data_corte          date    DEFAULT NULL,
  p_template_dados      jsonb   DEFAULT NULL,
  p_template_nome       text    DEFAULT NULL,
  p_template_descricao  text    DEFAULT NULL,
  p_regra_frequencia    text    DEFAULT NULL,
  p_regra_intervalo     int     DEFAULT NULL,
  p_regra_dias_semana   int[]   DEFAULT NULL,
  p_regra_dia_mes       int     DEFAULT NULL,
  p_regra_mes           int     DEFAULT NULL,
  p_regra_hora          time    DEFAULT NULL,
  p_data_fim            date    DEFAULT NULL,
  p_data_fim_explicito  boolean DEFAULT false  -- se true, aplica p_data_fim mesmo se null (limpa data_fim)
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_regra_antes      agenda_recorrencias%ROWTYPE;
  v_regra_depois     agenda_recorrencias%ROWTYPE;
  v_corte            date;
  v_count_update     integer := 0;
  v_count_delete     integer := 0;
  v_count_insert     integer := 0;
  v_freq_mudou       boolean;
  v_template         jsonb;
  v_responsaveis_ids uuid[];
  v_responsavel_id   uuid;
BEGIN
  SELECT * INTO v_regra_antes FROM agenda_recorrencias WHERE id = p_regra_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Regra de recorrência % não encontrada', p_regra_id;
  END IF;

  v_corte := COALESCE(p_data_corte, CURRENT_DATE);

  -- Atualizar a regra (campos não-null)
  UPDATE agenda_recorrencias
     SET template_dados     = COALESCE(p_template_dados, template_dados),
         template_nome      = COALESCE(p_template_nome, template_nome),
         template_descricao = COALESCE(p_template_descricao, template_descricao),
         regra_frequencia   = COALESCE(p_regra_frequencia, regra_frequencia),
         regra_intervalo    = COALESCE(p_regra_intervalo, regra_intervalo),
         regra_dias_semana  = COALESCE(p_regra_dias_semana, regra_dias_semana),
         regra_dia_mes      = COALESCE(p_regra_dia_mes, regra_dia_mes),
         regra_mes          = COALESCE(p_regra_mes, regra_mes),
         regra_hora         = COALESCE(p_regra_hora, regra_hora),
         data_fim           = CASE WHEN p_data_fim_explicito THEN p_data_fim ELSE COALESCE(p_data_fim, data_fim) END,
         updated_at         = now()
   WHERE id = p_regra_id
  RETURNING * INTO v_regra_depois;

  -- Detectar se a frequência ou os dias/dia_mes/mes mudaram
  v_freq_mudou := (v_regra_antes.regra_frequencia    IS DISTINCT FROM v_regra_depois.regra_frequencia)
               OR (v_regra_antes.regra_intervalo     IS DISTINCT FROM v_regra_depois.regra_intervalo)
               OR (v_regra_antes.regra_dias_semana   IS DISTINCT FROM v_regra_depois.regra_dias_semana)
               OR (v_regra_antes.regra_dia_mes       IS DISTINCT FROM v_regra_depois.regra_dia_mes)
               OR (v_regra_antes.regra_mes           IS DISTINCT FROM v_regra_depois.regra_mes);

  v_template := v_regra_depois.template_dados;

  -- Resolver responsaveis
  IF jsonb_typeof(v_template->'responsaveis_ids') = 'array' THEN
    SELECT COALESCE(array_agg((value::text)::uuid), ARRAY[]::uuid[])
      INTO v_responsaveis_ids
      FROM jsonb_array_elements_text(v_template->'responsaveis_ids') AS value;
  ELSE
    v_responsaveis_ids := ARRAY[]::uuid[];
  END IF;
  v_responsavel_id := COALESCE(
    NULLIF(v_template->>'responsavel_id', '')::uuid,
    (SELECT v_responsaveis_ids[1])
  );

  -- Propagar para instâncias pendentes >= corte
  IF v_regra_depois.entidade_tipo = 'tarefa' THEN
    UPDATE agenda_tarefas
       SET titulo           = COALESCE(v_template->>'titulo', titulo),
           descricao        = v_template->>'descricao',
           tipo             = COALESCE(v_template->>'tipo', tipo),
           prioridade       = COALESCE(v_template->>'prioridade', prioridade),
           responsavel_id   = v_responsavel_id,
           responsaveis_ids = v_responsaveis_ids,
           cor              = v_template->>'cor',
           processo_id      = NULLIF(v_template->>'processo_id', '')::uuid,
           consultivo_id    = NULLIF(v_template->>'consultivo_id', '')::uuid,
           updated_at       = now()
     WHERE recorrencia_id = p_regra_id
       AND status = 'pendente'
       AND data_inicio >= v_corte;

    GET DIAGNOSTICS v_count_update = ROW_COUNT;

    -- Se a frequência mudou, refazer datas: apaga pendentes futuras e re-materializa
    IF v_freq_mudou THEN
      DELETE FROM agenda_tarefas
       WHERE recorrencia_id = p_regra_id
         AND status = 'pendente'
         AND data_inicio >= v_corte;
      GET DIAGNOSTICS v_count_delete = ROW_COUNT;

      v_count_insert := materializar_recorrencia_agenda(p_regra_id, 6);
    END IF;

  ELSIF v_regra_depois.entidade_tipo = 'evento' THEN
    UPDATE agenda_eventos
       SET titulo           = COALESCE(v_template->>'titulo', titulo),
           descricao        = v_template->>'descricao',
           tipo             = COALESCE(v_template->>'tipo', tipo),
           local            = v_template->>'local',
           responsavel_id   = v_responsavel_id,
           responsaveis_ids = v_responsaveis_ids,
           cor              = COALESCE(v_template->>'cor', cor),
           processo_id      = NULLIF(v_template->>'processo_id', '')::uuid,
           consultivo_id    = NULLIF(v_template->>'consultivo_id', '')::uuid,
           updated_at       = now()
     WHERE recorrencia_id = p_regra_id
       AND status = 'agendado'
       AND data_inicio::date >= v_corte;

    GET DIAGNOSTICS v_count_update = ROW_COUNT;

    IF v_freq_mudou THEN
      DELETE FROM agenda_eventos
       WHERE recorrencia_id = p_regra_id
         AND status = 'agendado'
         AND data_inicio::date >= v_corte;
      GET DIAGNOSTICS v_count_delete = ROW_COUNT;

      v_count_insert := materializar_recorrencia_agenda(p_regra_id, 6);
    END IF;
  END IF;

  RETURN v_count_update + v_count_insert;
END;
$function$;


-- ============================================================================
-- 6. FUNÇÃO: excluir_regra_serie_agenda
-- ============================================================================
-- Desativa a regra (ou recorta data_fim) e remove instâncias pendentes
-- a partir do corte. Preserva concluídas, em_andamento, em_pausa, canceladas.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.excluir_regra_serie_agenda(
  p_regra_id   uuid,
  p_data_corte date DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_regra       agenda_recorrencias%ROWTYPE;
  v_corte       date;
  v_count       integer := 0;
BEGIN
  SELECT * INTO v_regra FROM agenda_recorrencias WHERE id = p_regra_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Regra de recorrência % não encontrada', p_regra_id;
  END IF;

  v_corte := COALESCE(p_data_corte, CURRENT_DATE);

  -- Desativar regra ou recortar data_fim
  IF p_data_corte IS NULL THEN
    UPDATE agenda_recorrencias
       SET ativo = false, updated_at = now()
     WHERE id = p_regra_id;
  ELSE
    UPDATE agenda_recorrencias
       SET data_fim = v_corte - 1, updated_at = now()
     WHERE id = p_regra_id;
  END IF;

  -- Deletar instâncias pendentes a partir do corte
  IF v_regra.entidade_tipo = 'tarefa' THEN
    DELETE FROM agenda_tarefas
     WHERE recorrencia_id = p_regra_id
       AND status = 'pendente'
       AND data_inicio >= v_corte;
    GET DIAGNOSTICS v_count = ROW_COUNT;

  ELSIF v_regra.entidade_tipo = 'evento' THEN
    DELETE FROM agenda_eventos
     WHERE recorrencia_id = p_regra_id
       AND status = 'agendado'
       AND data_inicio::date >= v_corte;
    GET DIAGNOSTICS v_count = ROW_COUNT;
  END IF;

  RETURN v_count;
END;
$function$;


-- ============================================================================
-- 7. FUNÇÃO: excluir_ocorrencia_agenda
-- ============================================================================
-- Remove uma instância específica e adiciona sua data em exclusoes
-- (para o cron não recriar). Atômica.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.excluir_ocorrencia_agenda(
  p_instancia_id uuid,
  p_tabela       text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_recorrencia_id uuid;
  v_data           date;
BEGIN
  IF p_tabela NOT IN ('agenda_tarefas', 'agenda_eventos') THEN
    RAISE EXCEPTION 'Tabela inválida: %', p_tabela;
  END IF;

  IF p_tabela = 'agenda_tarefas' THEN
    SELECT recorrencia_id, data_inicio
      INTO v_recorrencia_id, v_data
      FROM agenda_tarefas WHERE id = p_instancia_id;

    DELETE FROM agenda_tarefas WHERE id = p_instancia_id;
  ELSE
    SELECT recorrencia_id, data_inicio::date
      INTO v_recorrencia_id, v_data
      FROM agenda_eventos WHERE id = p_instancia_id;

    DELETE FROM agenda_eventos WHERE id = p_instancia_id;
  END IF;

  IF v_recorrencia_id IS NOT NULL AND v_data IS NOT NULL THEN
    UPDATE agenda_recorrencias
       SET exclusoes = (
             SELECT array_agg(DISTINCT d ORDER BY d)
               FROM unnest(COALESCE(exclusoes, ARRAY[]::date[]) || ARRAY[v_data]) AS d
           ),
           updated_at = now()
     WHERE id = v_recorrencia_id;
  END IF;
END;
$function$;


-- ============================================================================
-- 8. TRIGGER: materializa automaticamente ao criar/atualizar regra
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trg_materializar_recorrencia_agenda()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.ativo = true AND NEW.entidade_tipo IN ('tarefa', 'evento') THEN
    PERFORM materializar_recorrencia_agenda(NEW.id, 6);
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trigger_materializar_recorrencia_agenda ON public.agenda_recorrencias;

CREATE TRIGGER trigger_materializar_recorrencia_agenda
AFTER INSERT OR UPDATE OF
  data_inicio, data_fim, regra_frequencia, regra_intervalo,
  regra_dias_semana, regra_dia_mes, regra_mes, regra_hora,
  exclusoes, ativo, max_ocorrencias, regra_apenas_uteis,
  template_dados, template_nome
ON public.agenda_recorrencias
FOR EACH ROW
EXECUTE FUNCTION public.trg_materializar_recorrencia_agenda();


-- ============================================================================
-- 9. CRON JOB: estende janela diariamente
-- ============================================================================
-- Roda às 4h da manhã. Janela avança 1 dia/dia. Idempotente via NOT EXISTS.
-- ============================================================================
-- Remover job anterior (se existir) e recriar
SELECT cron.unschedule(jobid)
  FROM cron.job
 WHERE jobname = 'materializar-recorrencias-agenda';

SELECT cron.schedule(
  'materializar-recorrencias-agenda',
  '0 4 * * *',
  $cron$SELECT public.estender_janela_recorrencias_agenda(6);$cron$
);


-- ============================================================================
-- 10. BACKFILL: aplicar para regras existentes
-- ============================================================================
-- Não toca em linhas existentes (NOT EXISTS protege). Cria as faltantes
-- até 6 meses no futuro.
-- ============================================================================
SELECT public.estender_janela_recorrencias_agenda(6) AS instancias_criadas_pelo_backfill;


-- ============================================================================
-- 11. CLEANUP: remover RPC obsoleta
-- ============================================================================
DROP FUNCTION IF EXISTS public.processar_recorrencias_diarias();


-- ============================================================================
-- Comentários finais
-- ============================================================================
COMMENT ON FUNCTION public.materializar_recorrencia_agenda IS
  'Materializa instâncias de uma regra de agenda dentro da janela de horizonte_meses. Idempotente via WHERE NOT EXISTS.';
COMMENT ON FUNCTION public.estender_janela_recorrencias_agenda IS
  'Itera todas as regras ativas da agenda e materializa as instâncias faltantes. Chamada pelo cron diário.';
COMMENT ON FUNCTION public.atualizar_regra_serie_agenda IS
  'Atualiza regra de recorrência e propaga para instâncias pendentes futuras. Preserva instâncias terminadas.';
COMMENT ON FUNCTION public.excluir_regra_serie_agenda IS
  'Desativa regra (ou recorta data_fim) e remove instâncias pendentes a partir do corte. Preserva históricas.';
COMMENT ON FUNCTION public.excluir_ocorrencia_agenda IS
  'Remove uma instância específica e adiciona sua data em exclusoes da regra (para o cron não recriar).';
