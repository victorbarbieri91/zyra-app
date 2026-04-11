-- =====================================================
-- FASE 0: Corrigir Bug 2 (override silencioso de faturavel_manual)
-- =====================================================
-- Quando o usuário marca manualmente "Cobrável" ou "Não Cobrável" no modal
-- de timesheet, a função registrar_tempo_retroativo recebia p_faturavel_manual=true
-- mas NÃO setava faturavel_auto. A trigger trg_timesheet_set_faturavel via
-- faturavel_auto IS NULL, caía no ramo "calcular automaticamente" e
-- sobrescrevia a escolha do usuário.
--
-- Correção: quando p_faturavel_manual = true, setar faturavel_auto = false
-- explicitamente, satisfazendo a condição da trigger que respeita escolha manual.
-- =====================================================

CREATE OR REPLACE FUNCTION public.registrar_tempo_retroativo(
  p_escritorio_id uuid,
  p_user_id uuid,
  p_data_trabalho date,
  p_hora_inicio time without time zone DEFAULT NULL::time without time zone,
  p_hora_fim time without time zone DEFAULT NULL::time without time zone,
  p_atividade text DEFAULT ''::text,
  p_processo_id uuid DEFAULT NULL::uuid,
  p_consulta_id uuid DEFAULT NULL::uuid,
  p_tarefa_id uuid DEFAULT NULL::uuid,
  p_faturavel boolean DEFAULT true,
  p_faturavel_manual boolean DEFAULT false,
  p_ato_tipo_id uuid DEFAULT NULL::uuid,
  p_horas numeric DEFAULT NULL::numeric,
  p_audiencia_id uuid DEFAULT NULL::uuid,
  p_evento_id uuid DEFAULT NULL::uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_horas NUMERIC(8,2);
  v_timesheet_id UUID;
  v_hora_inicio_ts TIMESTAMPTZ;
  v_hora_fim_ts TIMESTAMPTZ;
  v_faturavel_auto BOOLEAN;
BEGIN
  -- Validar que tem processo ou consulta
  IF p_processo_id IS NULL AND p_consulta_id IS NULL THEN
    RAISE EXCEPTION 'Registro deve estar vinculado a um processo ou consulta';
  END IF;

  -- Validar atividade
  IF p_atividade IS NULL OR TRIM(p_atividade) = '' THEN
    RAISE EXCEPTION 'Informe a atividade realizada';
  END IF;

  -- MODO DURAÇÃO: p_horas fornecido diretamente
  IF p_horas IS NOT NULL THEN
    IF p_horas <= 0 THEN
      RAISE EXCEPTION 'Horas deve ser maior que zero';
    END IF;
    v_horas := ROUND(p_horas, 2);
    v_hora_inicio_ts := NULL;
    v_hora_fim_ts := NULL;

  -- MODO HORÁRIO: calcular a partir de início/fim
  ELSIF p_hora_inicio IS NOT NULL AND p_hora_fim IS NOT NULL THEN
    IF p_hora_fim <= p_hora_inicio THEN
      RAISE EXCEPTION 'Hora fim deve ser maior que hora início';
    END IF;
    v_horas := ROUND(EXTRACT(EPOCH FROM (p_hora_fim - p_hora_inicio)) / 3600.0, 2);
    v_hora_inicio_ts := (p_data_trabalho || ' ' || p_hora_inicio)::TIMESTAMPTZ;
    v_hora_fim_ts := (p_data_trabalho || ' ' || p_hora_fim)::TIMESTAMPTZ;

  ELSE
    RAISE EXCEPTION 'Informe horário (início e fim) ou duração em horas';
  END IF;

  -- CORREÇÃO BUG 2: quando o usuário escolheu manualmente, setar faturavel_auto = false
  -- para que a trigger trg_timesheet_set_faturavel respeite a escolha e não sobrescreva.
  -- Quando não é manual (faturavel calculado pelo padrão do contrato), deixar NULL
  -- para a trigger calcular automaticamente.
  IF p_faturavel_manual = true THEN
    v_faturavel_auto := false;
  ELSE
    v_faturavel_auto := NULL;
  END IF;

  -- Criar registro pendente de aprovação
  INSERT INTO financeiro_timesheet (
    escritorio_id,
    user_id,
    processo_id,
    consulta_id,
    tarefa_id,
    audiencia_id,
    evento_id,
    ato_tipo_id,
    data_trabalho,
    horas,
    atividade,
    faturavel,
    faturavel_auto,
    faturavel_manual,
    aprovado,
    hora_inicio,
    hora_fim,
    origem
  ) VALUES (
    p_escritorio_id,
    p_user_id,
    p_processo_id,
    p_consulta_id,
    p_tarefa_id,
    p_audiencia_id,
    p_evento_id,
    p_ato_tipo_id,
    p_data_trabalho,
    v_horas,
    p_atividade,
    p_faturavel,
    v_faturavel_auto,
    p_faturavel_manual,
    false,
    v_hora_inicio_ts,
    v_hora_fim_ts,
    'retroativo'
  )
  RETURNING id INTO v_timesheet_id;

  RETURN v_timesheet_id;
END;
$function$;

COMMENT ON FUNCTION public.registrar_tempo_retroativo IS
  'Registra tempo retroativo. Quando p_faturavel_manual=true, força faturavel_auto=false para que a trigger trg_timesheet_set_faturavel respeite a escolha manual e não sobrescreva com o padrão do contrato (correção do Bug 2 - override silencioso).';
