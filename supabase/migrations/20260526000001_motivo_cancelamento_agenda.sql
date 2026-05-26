-- ============================================================================
-- Motivo de cancelamento em tarefas, compromissos e audiências
-- ============================================================================
--
-- 1. Adiciona coluna motivo_cancelamento em agenda_tarefas/eventos/audiencias.
-- 2. Cria 3 RPCs SECURITY DEFINER que centralizam o cancelamento:
--      - cancelar_agenda_instancia: cancela 1 ocorrência (qualquer tipo).
--      - cancelar_agenda_serie:     cancela toda a série de uma recorrência.
--      - cancelar_agenda_lote:      cancela tarefas + audiências em lote,
--                                   usada pelo fluxo de encerrar processo.
--
-- Todas as RPCs validam motivo não-vazio e, quando o item está vinculado a um
-- processo (processo_id IS NOT NULL), inserem 1 entrada em processos_historico
-- com a ação 'cancelamento_*' apropriada. Se o item está vinculado só a
-- consultivo (ou a nenhum), o motivo fica preservado em motivo_cancelamento
-- mas NÃO gera entrada de histórico (Consultivo não tem tabela de auditoria
-- equivalente ainda).
--
-- FONTE DA VERDADE: para que cancelamentos apareçam no Histórico de Auditoria
-- do processo, é OBRIGATÓRIO usar estas RPCs. UPDATE direto em agenda_* NÃO
-- gera entrada no histórico.
-- ============================================================================

-- 1. Colunas de motivo --------------------------------------------------------

ALTER TABLE public.agenda_tarefas    ADD COLUMN IF NOT EXISTS motivo_cancelamento text;
ALTER TABLE public.agenda_eventos    ADD COLUMN IF NOT EXISTS motivo_cancelamento text;
ALTER TABLE public.agenda_audiencias ADD COLUMN IF NOT EXISTS motivo_cancelamento text;

COMMENT ON COLUMN public.agenda_tarefas.motivo_cancelamento    IS 'Motivo informado pelo usuário ao cancelar (preservado mesmo se o histórico for purgado).';
COMMENT ON COLUMN public.agenda_eventos.motivo_cancelamento    IS 'Motivo informado pelo usuário ao cancelar.';
COMMENT ON COLUMN public.agenda_audiencias.motivo_cancelamento IS 'Motivo informado pelo usuário ao cancelar.';

-- 2. RPC: cancelar_agenda_instancia -------------------------------------------

CREATE OR REPLACE FUNCTION public.cancelar_agenda_instancia(
  p_tabela text,
  p_id     uuid,
  p_motivo text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id        uuid;
  v_user_nome      text;
  v_status_novo    text;
  v_status_old     text;
  v_processo_id    uuid;
  v_escritorio_id  uuid;
  v_titulo         text;
  v_tipo_label     text;
  v_acao           text;
BEGIN
  -- Validações -----------------------------------------------------
  IF p_tabela NOT IN ('agenda_tarefas','agenda_eventos','agenda_audiencias') THEN
    RAISE EXCEPTION 'Tabela inválida: %', p_tabela;
  END IF;
  IF p_id IS NULL THEN
    RAISE EXCEPTION 'ID é obrigatório.';
  END IF;
  IF length(trim(coalesce(p_motivo,''))) = 0 THEN
    RAISE EXCEPTION 'Motivo do cancelamento é obrigatório.';
  END IF;

  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado.';
  END IF;

  -- Status novo e label por tipo -----------------------------------
  IF p_tabela = 'agenda_eventos' THEN
    v_status_novo := 'cancelado';
    v_tipo_label  := 'Compromisso';
    v_acao        := 'cancelamento_evento';
  ELSIF p_tabela = 'agenda_audiencias' THEN
    v_status_novo := 'cancelada';
    v_tipo_label  := 'Audiência';
    v_acao        := 'cancelamento_audiencia';
  ELSE
    v_status_novo := 'cancelada';
    v_tipo_label  := 'Tarefa';
    v_acao        := 'cancelamento_tarefa';
  END IF;

  SELECT nome_completo INTO v_user_nome FROM public.profiles WHERE id = v_user_id;

  -- Captura o estado anterior antes do UPDATE ---------------------
  EXECUTE format(
    'SELECT status, processo_id, escritorio_id, titulo FROM public.%I WHERE id = %L',
    p_tabela, p_id
  )
  INTO v_status_old, v_processo_id, v_escritorio_id, v_titulo;

  IF v_titulo IS NULL AND v_status_old IS NULL THEN
    RAISE EXCEPTION 'Item não encontrado: %', p_id;
  END IF;

  -- UPDATE -------------------------------------------------------
  EXECUTE format(
    'UPDATE public.%I
       SET status = %L,
           cancelado_em = now(),
           cancelado_por = %L,
           motivo_cancelamento = %L
     WHERE id = %L',
    p_tabela, v_status_novo, v_user_id, p_motivo, p_id
  );

  -- Insere entrada no histórico apenas se vinculado a processo ------
  IF v_processo_id IS NOT NULL THEN
    INSERT INTO public.processos_historico (
      processo_id, escritorio_id, acao, descricao,
      campo_alterado, valor_anterior, valor_novo,
      user_id, user_nome
    ) VALUES (
      v_processo_id, v_escritorio_id, v_acao,
      format('%s "%s" cancelada por %s. Motivo: %s',
             v_tipo_label, v_titulo, coalesce(v_user_nome,'usuário'), p_motivo),
      'status', v_status_old, v_status_novo,
      v_user_id, v_user_nome
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancelar_agenda_instancia(text, uuid, text) TO authenticated;

COMMENT ON FUNCTION public.cancelar_agenda_instancia(text, uuid, text) IS
  'Cancela 1 ocorrência de tarefa/compromisso/audiência. Grava motivo e registra entrada em processos_historico quando o item está vinculado a processo.';

-- 3. RPC: cancelar_agenda_serie -----------------------------------------------

CREATE OR REPLACE FUNCTION public.cancelar_agenda_serie(
  p_tabela          text,
  p_recorrencia_id  uuid,
  p_motivo          text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id        uuid;
  v_user_nome      text;
  v_status_novo    text;
  v_status_done    text;
  v_count          integer := 0;
  v_processo_id    uuid;
  v_escritorio_id  uuid;
  v_titulo         text;
  v_tipo_label     text;
  v_tipo_plural    text;
  v_acao           text;
BEGIN
  -- Validações -----------------------------------------------------
  IF p_tabela NOT IN ('agenda_tarefas','agenda_eventos') THEN
    RAISE EXCEPTION 'Cancelamento de série só é suportado para tarefas e compromissos.';
  END IF;
  IF p_recorrencia_id IS NULL THEN
    RAISE EXCEPTION 'Recorrência é obrigatória.';
  END IF;
  IF length(trim(coalesce(p_motivo,''))) = 0 THEN
    RAISE EXCEPTION 'Motivo do cancelamento é obrigatório.';
  END IF;

  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado.';
  END IF;

  IF p_tabela = 'agenda_eventos' THEN
    v_status_novo := 'cancelado';
    v_status_done := 'realizado';
    v_tipo_label  := 'compromisso';
    v_tipo_plural := 'compromissos';
    v_acao        := 'cancelamento_serie_evento';
  ELSE
    v_status_novo := 'cancelada';
    v_status_done := 'concluida';
    v_tipo_label  := 'tarefa';
    v_tipo_plural := 'tarefas';
    v_acao        := 'cancelamento_serie_tarefa';
  END IF;

  SELECT nome_completo INTO v_user_nome FROM public.profiles WHERE id = v_user_id;

  -- UPDATE em todas as ocorrências da série -----------------------
  EXECUTE format(
    'WITH updated AS (
       UPDATE public.%I
          SET status = %L,
              cancelado_em = now(),
              cancelado_por = %L,
              motivo_cancelamento = %L
        WHERE recorrencia_id = %L
          AND status NOT IN (%L, %L)
        RETURNING processo_id, escritorio_id, titulo
     )
     SELECT count(*)::int,
            (array_agg(processo_id)   FILTER (WHERE processo_id   IS NOT NULL))[1],
            (array_agg(escritorio_id) FILTER (WHERE escritorio_id IS NOT NULL))[1],
            (array_agg(titulo))[1]
       FROM updated',
    p_tabela, v_status_novo, v_user_id, p_motivo,
    p_recorrencia_id, v_status_novo, v_status_done
  )
  INTO v_count, v_processo_id, v_escritorio_id, v_titulo;

  -- Desativa a regra de recorrência -------------------------------
  UPDATE public.agenda_recorrencias
     SET ativo = false
   WHERE id = p_recorrencia_id;

  -- 1 entrada consolidada no histórico, se vinculada a processo --
  IF v_processo_id IS NOT NULL AND v_count > 0 THEN
    INSERT INTO public.processos_historico (
      processo_id, escritorio_id, acao, descricao,
      campo_alterado, valor_anterior, valor_novo,
      user_id, user_nome
    ) VALUES (
      v_processo_id, v_escritorio_id, v_acao,
      format('Série de %s %s "%s" cancelada por %s. Motivo: %s',
             v_count,
             CASE WHEN v_count = 1 THEN v_tipo_label ELSE v_tipo_plural END,
             coalesce(v_titulo,'(sem título)'),
             coalesce(v_user_nome,'usuário'),
             p_motivo),
      'status', NULL, v_status_novo,
      v_user_id, v_user_nome
    );
  END IF;

  RETURN jsonb_build_object('cancelled_count', v_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancelar_agenda_serie(text, uuid, text) TO authenticated;

COMMENT ON FUNCTION public.cancelar_agenda_serie(text, uuid, text) IS
  'Cancela toda a série de uma recorrência (tarefas ou compromissos). Aplica o mesmo motivo a todas as ocorrências e gera 1 entrada consolidada em processos_historico.';

-- 4. RPC: cancelar_agenda_lote ------------------------------------------------

CREATE OR REPLACE FUNCTION public.cancelar_agenda_lote(
  p_tarefa_ids    uuid[],
  p_audiencia_ids uuid[],
  p_motivo        text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id   uuid;
  v_user_nome text;
  v_t_count   integer := 0;
  v_a_count   integer := 0;
  v_proc      record;
BEGIN
  IF length(trim(coalesce(p_motivo,''))) = 0 THEN
    RAISE EXCEPTION 'Motivo do cancelamento é obrigatório.';
  END IF;

  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado.';
  END IF;

  SELECT nome_completo INTO v_user_nome FROM public.profiles WHERE id = v_user_id;

  -- Cancela tarefas em lote ---------------------------------------
  IF p_tarefa_ids IS NOT NULL AND array_length(p_tarefa_ids, 1) > 0 THEN
    WITH updated AS (
      UPDATE public.agenda_tarefas
         SET status = 'cancelada',
             cancelado_em = now(),
             cancelado_por = v_user_id,
             motivo_cancelamento = p_motivo
       WHERE id = ANY(p_tarefa_ids)
       RETURNING 1
    )
    SELECT count(*) INTO v_t_count FROM updated;
  END IF;

  -- Cancela audiências em lote ------------------------------------
  IF p_audiencia_ids IS NOT NULL AND array_length(p_audiencia_ids, 1) > 0 THEN
    WITH updated AS (
      UPDATE public.agenda_audiencias
         SET status = 'cancelada',
             cancelado_em = now(),
             cancelado_por = v_user_id,
             motivo_cancelamento = p_motivo
       WHERE id = ANY(p_audiencia_ids)
       RETURNING 1
    )
    SELECT count(*) INTO v_a_count FROM updated;
  END IF;

  -- Entradas consolidadas por processo afetado --------------------
  -- (No fluxo de encerrar processo, na prática só há 1 processo; a query é defensiva.)
  FOR v_proc IN
    SELECT processo_id,
           max(escritorio_id) AS escritorio_id,
           sum(CASE WHEN origem = 'tarefa'    THEN 1 ELSE 0 END) AS n_t,
           sum(CASE WHEN origem = 'audiencia' THEN 1 ELSE 0 END) AS n_a
      FROM (
        SELECT processo_id, escritorio_id, 'tarefa'::text AS origem
          FROM public.agenda_tarefas
         WHERE id = ANY(coalesce(p_tarefa_ids, ARRAY[]::uuid[]))
           AND processo_id IS NOT NULL
        UNION ALL
        SELECT processo_id, escritorio_id, 'audiencia'::text AS origem
          FROM public.agenda_audiencias
         WHERE id = ANY(coalesce(p_audiencia_ids, ARRAY[]::uuid[]))
           AND processo_id IS NOT NULL
      ) afetados
     GROUP BY processo_id
  LOOP
    INSERT INTO public.processos_historico (
      processo_id, escritorio_id, acao, descricao,
      campo_alterado, valor_anterior, valor_novo,
      user_id, user_nome
    ) VALUES (
      v_proc.processo_id, v_proc.escritorio_id,
      'cancelamento_lote_encerramento',
      format('%s tarefa(s) e %s audiência(s) canceladas automaticamente pelo encerramento do processo. Motivo: %s',
             v_proc.n_t, v_proc.n_a, p_motivo),
      'status', NULL, 'cancelada',
      v_user_id, v_user_nome
    );
  END LOOP;

  RETURN jsonb_build_object(
    'tarefas_canceladas',    v_t_count,
    'audiencias_canceladas', v_a_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancelar_agenda_lote(uuid[], uuid[], text) TO authenticated;

COMMENT ON FUNCTION public.cancelar_agenda_lote(uuid[], uuid[], text) IS
  'Cancela tarefas + audiências em lote. Usada pelo fluxo de encerrar processo. Gera 1 entrada consolidada em processos_historico por processo afetado.';
