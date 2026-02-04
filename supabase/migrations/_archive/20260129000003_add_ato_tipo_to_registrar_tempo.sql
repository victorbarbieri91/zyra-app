-- =====================================================
-- MIGRATION: Adicionar p_ato_tipo_id à função registrar_tempo_retroativo
-- =====================================================
-- Atualiza a função para suportar o parâmetro ato_tipo_id
-- para contratos por_ato com modalidade hora
-- =====================================================

CREATE OR REPLACE FUNCTION registrar_tempo_retroativo(
  p_escritorio_id UUID,
  p_user_id UUID,
  p_data_trabalho DATE,
  p_hora_inicio TIME,
  p_hora_fim TIME,
  p_atividade TEXT,
  p_processo_id UUID DEFAULT NULL,
  p_consulta_id UUID DEFAULT NULL,
  p_tarefa_id UUID DEFAULT NULL,
  p_faturavel BOOLEAN DEFAULT true,
  p_faturavel_manual BOOLEAN DEFAULT false,
  p_ato_tipo_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_horas NUMERIC(8,2);
  v_timesheet_id UUID;
  v_hora_inicio_ts TIMESTAMPTZ;
  v_hora_fim_ts TIMESTAMPTZ;
BEGIN
  -- Validar que tem processo ou consulta
  IF p_processo_id IS NULL AND p_consulta_id IS NULL THEN
    RAISE EXCEPTION 'Registro deve estar vinculado a um processo ou consulta';
  END IF;

  -- Validar horários
  IF p_hora_fim <= p_hora_inicio THEN
    RAISE EXCEPTION 'Hora fim deve ser maior que hora início';
  END IF;

  -- Calcular horas
  v_horas := ROUND(EXTRACT(EPOCH FROM (p_hora_fim - p_hora_inicio)) / 3600.0, 2);

  -- Construir timestamps completos
  v_hora_inicio_ts := (p_data_trabalho || ' ' || p_hora_inicio)::TIMESTAMPTZ;
  v_hora_fim_ts := (p_data_trabalho || ' ' || p_hora_fim)::TIMESTAMPTZ;

  -- Criar registro COM APROVADO = TRUE
  -- Nota: O trigger trg_timesheet_atualizar_acumulado_ato irá calcular
  -- automaticamente a faturabilidade para atos modo hora
  INSERT INTO financeiro_timesheet (
    escritorio_id,
    user_id,
    processo_id,
    consulta_id,
    tarefa_id,
    ato_tipo_id,
    data_trabalho,
    horas,
    atividade,
    faturavel,
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
    p_ato_tipo_id,
    p_data_trabalho,
    v_horas,
    p_atividade,
    p_faturavel,
    p_faturavel_manual,
    true,
    v_hora_inicio_ts,
    v_hora_fim_ts,
    'retroativo'
  )
  RETURNING id INTO v_timesheet_id;

  RETURN v_timesheet_id;
END;
$$;

COMMENT ON FUNCTION registrar_tempo_retroativo IS
  'Registra tempo retroativo APROVADO (pronto para faturar). Suporta ato_tipo_id para contratos por_ato modo hora';

-- =====================================================
-- Verificar se as colunas faturavel_manual e faturavel_auto existem
-- =====================================================
DO $$
BEGIN
  -- Coluna faturavel_manual
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'financeiro_timesheet'
    AND column_name = 'faturavel_manual'
  ) THEN
    ALTER TABLE financeiro_timesheet
    ADD COLUMN faturavel_manual BOOLEAN DEFAULT false;

    COMMENT ON COLUMN financeiro_timesheet.faturavel_manual IS
      'Indica se o usuário sobrescreveu manualmente o valor de faturavel';
  END IF;

  -- Coluna faturavel_auto (usada pelo trigger de atos hora)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'financeiro_timesheet'
    AND column_name = 'faturavel_auto'
  ) THEN
    ALTER TABLE financeiro_timesheet
    ADD COLUMN faturavel_auto BOOLEAN DEFAULT false;

    COMMENT ON COLUMN financeiro_timesheet.faturavel_auto IS
      'Indica se o faturavel foi calculado automaticamente pelo sistema (trigger de atos hora)';
  END IF;
END;
$$;
