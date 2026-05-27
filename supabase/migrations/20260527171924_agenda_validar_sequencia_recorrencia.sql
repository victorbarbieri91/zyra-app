-- ============================================================================
-- Migração: Corrigir bug de "tarefa fantasma" em recorrências de agenda
-- ============================================================================
-- BUG: a função materializar_recorrencia_agenda começa o loop em v_inicio =
-- GREATEST(data_inicio_regra, CURRENT_DATE) e INSERE uma instância nessa data
-- ANTES de validar se ela pertence à sequência da regra. Para regras mensais
-- (e anuais, semanais sem dias_semana com intervalo>1, diárias com intervalo>1),
-- isso cria uma "instância fantasma" todo dia que o cron roda, em uma data que
-- não bate com a sequência cadastrada.
--
-- O cron diário (4h) amplificava o estrago em 30x. Confirmado em 4 regras
-- mensais ativas (Dádiva, INSS, INPI Tributalyze, Karina).
--
-- CORREÇÕES nesta migração:
-- 1. Função proxima_data_recorrencia: tratar regra_dia_mes=99 (último dia)
-- 2. Função materializar_recorrencia_agenda: adicionar bloco de validação de
--    sequência antes do INSERT (mesmo padrão do filtro de dias_semana existente)
-- 3. Cron: trocar de diário (0 4 * * *) para mensal (0 4 1 * *), horizonte 6
--    meses preservado (oscilação entre 5-6 meses é invisível ao usuário)
-- 4. Limpeza cirúrgica: deletar fantasmas pendentes/canceladas, deletar
--    duplicata 16/06 Dádiva, limpar exclusoes que correspondem a fantasmas
-- 5. Re-materializar as 4 regras corrompidas (idempotente via NOT EXISTS)
-- ============================================================================


-- ============================================================================
-- 1. proxima_data_recorrencia: tratar dia_mes=99 (último dia do mês)
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
      IF p_regra.regra_dias_semana IS NOT NULL
         AND array_length(p_regra.regra_dias_semana, 1) > 0 THEN
        v_proxima := p_data_atual + 1;
      ELSE
        v_proxima := p_data_atual + (7 * COALESCE(p_regra.regra_intervalo, 1) || ' days')::interval;
      END IF;

    WHEN 'mensal' THEN
      v_proxima := (p_data_atual + (COALESCE(p_regra.regra_intervalo, 1) || ' months')::interval)::date;
      IF p_regra.regra_dia_mes IS NOT NULL THEN
        IF p_regra.regra_dia_mes = 99 THEN
          -- 99 = último dia do mês
          v_proxima := (date_trunc('month', v_proxima) + interval '1 month - 1 day')::date;
        ELSE
          v_proxima := LEAST(
            make_date(EXTRACT(YEAR FROM v_proxima)::int, EXTRACT(MONTH FROM v_proxima)::int, p_regra.regra_dia_mes),
            (date_trunc('month', v_proxima) + interval '1 month - 1 day')::date
          );
        END IF;
      END IF;

    WHEN 'anual' THEN
      v_proxima := (p_data_atual + (COALESCE(p_regra.regra_intervalo, 1) || ' years')::interval)::date;
      IF p_regra.regra_mes IS NOT NULL AND p_regra.regra_dia_mes IS NOT NULL THEN
        IF p_regra.regra_dia_mes = 99 THEN
          v_proxima := (date_trunc('month', make_date(EXTRACT(YEAR FROM v_proxima)::int, p_regra.regra_mes, 1)) + interval '1 month - 1 day')::date;
        ELSE
          v_proxima := LEAST(
            make_date(EXTRACT(YEAR FROM v_proxima)::int, p_regra.regra_mes, p_regra.regra_dia_mes),
            (date_trunc('month', make_date(EXTRACT(YEAR FROM v_proxima)::int, p_regra.regra_mes, 1)) + interval '1 month - 1 day')::date
          );
        END IF;
      END IF;

    ELSE
      v_proxima := p_data_atual + 1;
  END CASE;

  RETURN v_proxima;
END;
$function$;


-- ============================================================================
-- 2. materializar_recorrencia_agenda: validar sequência antes do INSERT
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
  v_dia_atual        integer;
  v_ultimo_dia_mes   integer;
  v_meses_desde      integer;
  v_anos_desde       integer;
  v_dias_desde       integer;
  v_meses_avancar    integer;
  v_anos_avancar     integer;
  v_dias_avancar     integer;
  v_resto            integer;
  v_aux              date;
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

    -- Pular datas em exclusoes
    IF v_data = ANY(COALESCE(v_regra.exclusoes, ARRAY[]::date[])) THEN
      v_data := proxima_data_recorrencia(v_regra, v_data);
      CONTINUE;
    END IF;

    -- Pular fins de semana se apenas_uteis
    IF COALESCE(v_regra.regra_apenas_uteis, false) THEN
      v_dia_dow := EXTRACT(DOW FROM v_data)::int;
      IF v_dia_dow IN (0, 6) THEN
        v_data := v_data + 1;
        CONTINUE;
      END IF;
    END IF;

    -- Filtro existente: semanal com dias_semana
    IF v_regra.regra_frequencia = 'semanal'
       AND v_regra.regra_dias_semana IS NOT NULL
       AND array_length(v_regra.regra_dias_semana, 1) > 0 THEN
      v_dia_dow := EXTRACT(DOW FROM v_data)::int;
      IF NOT (v_dia_dow = ANY(v_regra.regra_dias_semana)) THEN
        v_data := v_data + 1;
        CONTINUE;
      END IF;

      IF COALESCE(v_regra.regra_intervalo, 1) > 1 THEN
        v_semanas_desde := ((v_data - v_regra.data_inicio) / 7)::int;
        IF (v_semanas_desde % v_regra.regra_intervalo) != 0 THEN
          v_data := v_data + 1;
          CONTINUE;
        END IF;
      END IF;
    END IF;

    -- ========================================================================
    -- NOVO: Validação de sequência por frequência
    -- ========================================================================
    -- Garante que v_data realmente pertence à sequência da regra, mesmo
    -- quando v_inicio = CURRENT_DATE não está alinhado.
    -- Quando v_data NÃO bate: avança pra próxima data válida e CONTINUE.
    -- ========================================================================

    IF v_regra.regra_frequencia = 'mensal' THEN
      -- Valida dia do mês
      IF v_regra.regra_dia_mes IS NOT NULL THEN
        v_dia_atual := EXTRACT(DAY FROM v_data)::int;
        v_ultimo_dia_mes := EXTRACT(DAY FROM (date_trunc('month', v_data) + interval '1 month - 1 day')::date)::int;

        IF v_regra.regra_dia_mes = 99 THEN
          -- 99 = último dia
          IF v_dia_atual <> v_ultimo_dia_mes THEN
            v_data := proxima_data_recorrencia(v_regra, v_data);
            CONTINUE;
          END IF;
        ELSE
          -- aceita dia exato OU cap em mês curto (regra dia 30 caindo em fev)
          IF v_dia_atual <> v_regra.regra_dia_mes
             AND NOT (v_regra.regra_dia_mes > v_ultimo_dia_mes AND v_dia_atual = v_ultimo_dia_mes) THEN
            v_data := proxima_data_recorrencia(v_regra, v_data);
            CONTINUE;
          END IF;
        END IF;
      END IF;

      -- Valida intervalo (meses desde data_inicio múltiplo de intervalo)
      IF COALESCE(v_regra.regra_intervalo, 1) > 1 THEN
        v_meses_desde := (EXTRACT(YEAR FROM v_data)::int - EXTRACT(YEAR FROM v_regra.data_inicio)::int) * 12
                       + (EXTRACT(MONTH FROM v_data)::int - EXTRACT(MONTH FROM v_regra.data_inicio)::int);
        v_resto := v_meses_desde % v_regra.regra_intervalo;
        IF v_resto <> 0 THEN
          -- Avança (intervalo - resto) meses para alinhar à sequência
          v_meses_avancar := v_regra.regra_intervalo - v_resto;
          v_aux := (v_data + (v_meses_avancar || ' months')::interval)::date;
          IF v_regra.regra_dia_mes IS NOT NULL AND v_regra.regra_dia_mes <> 99 THEN
            v_data := LEAST(
              make_date(EXTRACT(YEAR FROM v_aux)::int, EXTRACT(MONTH FROM v_aux)::int, v_regra.regra_dia_mes),
              (date_trunc('month', v_aux) + interval '1 month - 1 day')::date
            );
          ELSIF v_regra.regra_dia_mes = 99 THEN
            v_data := (date_trunc('month', v_aux) + interval '1 month - 1 day')::date;
          ELSE
            v_data := v_aux;
          END IF;
          CONTINUE;
        END IF;
      END IF;

    ELSIF v_regra.regra_frequencia = 'anual' THEN
      -- Valida mês + dia
      IF v_regra.regra_mes IS NOT NULL AND v_regra.regra_dia_mes IS NOT NULL THEN
        v_dia_atual := EXTRACT(DAY FROM v_data)::int;
        v_ultimo_dia_mes := EXTRACT(DAY FROM (date_trunc('month', v_data) + interval '1 month - 1 day')::date)::int;

        IF EXTRACT(MONTH FROM v_data)::int <> v_regra.regra_mes THEN
          v_data := proxima_data_recorrencia(v_regra, v_data);
          CONTINUE;
        END IF;

        IF v_regra.regra_dia_mes = 99 THEN
          IF v_dia_atual <> v_ultimo_dia_mes THEN
            v_data := proxima_data_recorrencia(v_regra, v_data);
            CONTINUE;
          END IF;
        ELSE
          IF v_dia_atual <> v_regra.regra_dia_mes
             AND NOT (v_regra.regra_dia_mes > v_ultimo_dia_mes AND v_dia_atual = v_ultimo_dia_mes) THEN
            v_data := proxima_data_recorrencia(v_regra, v_data);
            CONTINUE;
          END IF;
        END IF;
      END IF;

      -- Valida intervalo (anos desde data_inicio múltiplo de intervalo)
      IF COALESCE(v_regra.regra_intervalo, 1) > 1 THEN
        v_anos_desde := EXTRACT(YEAR FROM v_data)::int - EXTRACT(YEAR FROM v_regra.data_inicio)::int;
        v_resto := v_anos_desde % v_regra.regra_intervalo;
        IF v_resto <> 0 THEN
          v_anos_avancar := v_regra.regra_intervalo - v_resto;
          v_aux := (v_data + (v_anos_avancar || ' years')::interval)::date;
          IF v_regra.regra_mes IS NOT NULL AND v_regra.regra_dia_mes IS NOT NULL AND v_regra.regra_dia_mes <> 99 THEN
            v_data := LEAST(
              make_date(EXTRACT(YEAR FROM v_aux)::int, v_regra.regra_mes, v_regra.regra_dia_mes),
              (date_trunc('month', make_date(EXTRACT(YEAR FROM v_aux)::int, v_regra.regra_mes, 1)) + interval '1 month - 1 day')::date
            );
          ELSE
            v_data := v_aux;
          END IF;
          CONTINUE;
        END IF;
      END IF;

    ELSIF v_regra.regra_frequencia = 'semanal'
          AND (v_regra.regra_dias_semana IS NULL OR array_length(v_regra.regra_dias_semana, 1) = 0)
          AND COALESCE(v_regra.regra_intervalo, 1) > 1 THEN
      -- Semanal sem dias_semana com intervalo > 1: alinhar à sequência
      v_dias_desde := (v_data - v_regra.data_inicio)::int;
      v_resto := v_dias_desde % (7 * v_regra.regra_intervalo);
      IF v_resto <> 0 THEN
        v_dias_avancar := (7 * v_regra.regra_intervalo) - v_resto;
        v_data := v_data + v_dias_avancar;
        CONTINUE;
      END IF;

    ELSIF v_regra.regra_frequencia = 'diaria'
          AND COALESCE(v_regra.regra_intervalo, 1) > 1 THEN
      -- Diaria com intervalo > 1: alinhar à sequência
      v_dias_desde := (v_data - v_regra.data_inicio)::int;
      v_resto := v_dias_desde % v_regra.regra_intervalo;
      IF v_resto <> 0 THEN
        v_dias_avancar := v_regra.regra_intervalo - v_resto;
        v_data := v_data + v_dias_avancar;
        CONTINUE;
      END IF;
    END IF;

    -- ========================================================================
    -- INSERT idempotente (mesmo bloco original)
    -- ========================================================================
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


-- ============================================================================
-- 3. Cron: trocar de diário para mensal (dia 1, 4h)
-- ============================================================================
-- Antes: 0 4 * * *  (todo dia 4h) — amplifica bugs em 30x
-- Depois: 0 4 1 * * (todo dia 1 do mês, 4h)
-- Trigger trg_materializar_recorrencia_agenda continua materializando
-- imediatamente quando uma regra é criada/editada (caminho principal).
-- Cron mensal serve apenas para estender a "ponta" da janela rolante.
-- ============================================================================
SELECT cron.unschedule(jobid)
  FROM cron.job
 WHERE jobname = 'materializar-recorrencias-agenda';

SELECT cron.schedule(
  'materializar-recorrencias-agenda',
  '0 4 1 * *',
  $cron$SELECT public.estender_janela_recorrencias_agenda(6);$cron$
);


-- ============================================================================
-- 4. Limpeza cirúrgica de fantasmas
-- ============================================================================

-- 4a) Deletar instâncias fantasmas pendentes/canceladas
-- Critério: regra mensal com regra_dia_mes definido + status em (pendente, cancelada)
-- + data_inicio cuja dia NÃO bate com regra_dia_mes (considerando cap em meses curtos)
DELETE FROM agenda_tarefas t
USING agenda_recorrencias r
WHERE t.recorrencia_id = r.id
  AND r.regra_frequencia = 'mensal'
  AND r.regra_dia_mes IS NOT NULL
  AND r.regra_dia_mes <> 99
  AND t.status IN ('pendente', 'cancelada')
  AND EXTRACT(DAY FROM t.data_inicio)::int <> r.regra_dia_mes
  AND NOT (
    r.regra_dia_mes > EXTRACT(DAY FROM (date_trunc('month', t.data_inicio) + interval '1 month - 1 day')::date)::int
    AND EXTRACT(DAY FROM t.data_inicio)::int = EXTRACT(DAY FROM (date_trunc('month', t.data_inicio) + interval '1 month - 1 day')::date)::int
  );

-- 4b) Deletar duplicata 16/06/2026 da regra Dádiva (manter a mais antiga)
DELETE FROM agenda_tarefas
 WHERE id IN (
   SELECT id FROM agenda_tarefas
    WHERE recorrencia_id = '54b7fa3b-9e10-41cc-ae4a-0e1fe9d0de7c'
      AND data_inicio = '2026-06-16'
    ORDER BY created_at DESC
    LIMIT 1
 );

-- 4c) Limpeza cirúrgica de exclusoes: para cada regra mensal, manter em
-- exclusoes APENAS datas que coincidiriam com a sequência da regra (podem
-- ter sido exclusões manuais legítimas). Datas que jamais seriam ocorrências
-- válidas (fantasmas deletadas) são removidas.
UPDATE agenda_recorrencias r
   SET exclusoes = COALESCE(
         (SELECT array_agg(d ORDER BY d)
            FROM unnest(r.exclusoes) AS d
           WHERE
             -- Mantém datas que batem com regra_dia_mes (exclusão legítima)
             EXTRACT(DAY FROM d)::int = r.regra_dia_mes
             -- OU mantém cap em mês curto
             OR (
               r.regra_dia_mes > EXTRACT(DAY FROM (date_trunc('month', d) + interval '1 month - 1 day')::date)::int
               AND EXTRACT(DAY FROM d)::int = EXTRACT(DAY FROM (date_trunc('month', d) + interval '1 month - 1 day')::date)::int
             )
         ),
         ARRAY[]::date[]
       ),
       updated_at = now()
 WHERE regra_frequencia = 'mensal'
   AND regra_dia_mes IS NOT NULL
   AND regra_dia_mes <> 99
   AND exclusoes IS NOT NULL
   AND array_length(exclusoes, 1) > 0;


-- ============================================================================
-- 5. Re-materializar as 4 regras corrompidas (idempotente via NOT EXISTS)
-- ============================================================================
-- Garante que a janela rolante de 6 meses está cheia conforme a regra correta,
-- após a limpeza. Usa a função já corrigida (validação de sequência).
-- ============================================================================
SELECT public.materializar_recorrencia_agenda('54b7fa3b-9e10-41cc-ae4a-0e1fe9d0de7c'::uuid, 6);  -- Dádiva
SELECT public.materializar_recorrencia_agenda('c0dfe0b1-d621-46bb-bdc0-69d8f4dde533'::uuid, 6);  -- INSS
SELECT public.materializar_recorrencia_agenda('391fd62d-a1f1-4b2d-af9a-37c0f6c0d651'::uuid, 6);  -- INPI Tributalyze
SELECT public.materializar_recorrencia_agenda('4b0879a8-2bb8-44a5-b985-78ee2d847fcb'::uuid, 6);  -- Karina

COMMENT ON FUNCTION public.materializar_recorrencia_agenda IS
  'Materializa instâncias de uma regra de agenda dentro da janela de horizonte_meses. Idempotente via WHERE NOT EXISTS. Após 2026-05: valida sequência por frequência (mensal, anual, semanal, diaria) antes do INSERT para evitar "instâncias fantasmas" quando v_inicio = CURRENT_DATE não está alinhado.';
