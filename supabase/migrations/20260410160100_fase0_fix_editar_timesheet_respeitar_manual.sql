-- =====================================================
-- FASE 0: Corrigir editar_timesheet para respeitar escolha manual
-- =====================================================
-- Adiciona parâmetro p_faturavel_manual e marca faturavel_auto=false quando true.
-- Drop e recreate é necessário porque adicionar novo parâmetro com default
-- não é compatível com CREATE OR REPLACE quando há mudança de assinatura.
-- =====================================================

DROP FUNCTION IF EXISTS public.editar_timesheet(
  uuid, numeric, text, boolean, uuid, date, time without time zone,
  time without time zone, uuid, uuid, uuid, boolean
);

CREATE OR REPLACE FUNCTION public.editar_timesheet(
  p_timesheet_id uuid,
  p_horas numeric,
  p_atividade text,
  p_faturavel boolean,
  p_editado_por uuid,
  p_data_trabalho date DEFAULT NULL::date,
  p_hora_inicio time without time zone DEFAULT NULL::time without time zone,
  p_hora_fim time without time zone DEFAULT NULL::time without time zone,
  p_processo_id uuid DEFAULT NULL::uuid,
  p_consulta_id uuid DEFAULT NULL::uuid,
  p_ato_tipo_id uuid DEFAULT NULL::uuid,
  p_atualizar_campos_extras boolean DEFAULT false,
  p_faturavel_manual boolean DEFAULT NULL::boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_data DATE;
  v_hora_inicio TIMESTAMPTZ;
  v_hora_fim TIMESTAMPTZ;
BEGIN
  IF p_horas IS NULL OR p_horas <= 0 THEN
    RAISE EXCEPTION 'Horas deve ser maior que zero';
  END IF;

  IF p_atividade IS NULL OR LENGTH(TRIM(p_atividade)) < 3 THEN
    RAISE EXCEPTION 'Atividade deve ter pelo menos 3 caracteres';
  END IF;

  IF p_atualizar_campos_extras AND p_processo_id IS NULL AND p_consulta_id IS NULL THEN
    RAISE EXCEPTION 'Registro deve estar vinculado a um processo ou consulta';
  END IF;

  IF p_atualizar_campos_extras THEN
    SELECT COALESCE(p_data_trabalho, ft.data_trabalho) INTO v_data
    FROM financeiro_timesheet ft WHERE ft.id = p_timesheet_id;

    IF p_hora_inicio IS NOT NULL THEN
      v_hora_inicio := (v_data || ' ' || p_hora_inicio::TEXT)::TIMESTAMPTZ;
    ELSE
      v_hora_inicio := NULL;
    END IF;

    IF p_hora_fim IS NOT NULL THEN
      v_hora_fim := (v_data || ' ' || p_hora_fim::TEXT)::TIMESTAMPTZ;
    ELSE
      v_hora_fim := NULL;
    END IF;

    UPDATE financeiro_timesheet
    SET
      horas = p_horas,
      atividade = TRIM(p_atividade),
      faturavel = COALESCE(p_faturavel, faturavel),
      faturavel_auto = CASE WHEN p_faturavel_manual = true THEN false ELSE faturavel_auto END,
      faturavel_manual = COALESCE(p_faturavel_manual, faturavel_manual),
      data_trabalho = COALESCE(p_data_trabalho, data_trabalho),
      hora_inicio = v_hora_inicio,
      hora_fim = v_hora_fim,
      processo_id = p_processo_id,
      consulta_id = p_consulta_id,
      ato_tipo_id = p_ato_tipo_id,
      editado = true,
      editado_em = NOW(),
      editado_por = p_editado_por,
      updated_at = NOW()
    WHERE id = p_timesheet_id
      AND aprovado = false
      AND reprovado = false
      AND faturado = false;
  ELSE
    UPDATE financeiro_timesheet
    SET
      horas = p_horas,
      atividade = TRIM(p_atividade),
      faturavel = COALESCE(p_faturavel, faturavel),
      faturavel_auto = CASE WHEN p_faturavel_manual = true THEN false ELSE faturavel_auto END,
      faturavel_manual = COALESCE(p_faturavel_manual, faturavel_manual),
      editado = true,
      editado_em = NOW(),
      editado_por = p_editado_por,
      updated_at = NOW()
    WHERE id = p_timesheet_id
      AND aprovado = false
      AND reprovado = false
      AND faturado = false;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Timesheet nao pode ser editado. Verifique se ja foi aprovado, reprovado ou faturado.';
  END IF;
END;
$function$;

COMMENT ON FUNCTION public.editar_timesheet IS
  'Edita um registro de timesheet pendente. Aceita p_faturavel_manual opcional: quando true, marca faturavel_auto=false e faturavel_manual=true para que a trigger respeite a escolha do usuário (correção Bug 2).';
