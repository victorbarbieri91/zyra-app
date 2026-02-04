-- Migration: Timesheet por Hora Fixa + Limites Mensais
-- Adiciona suporte para:
-- 1. Contratos com taxa única por hora (por_hora) - aplicável a toda equipe
-- 2. Limites mensais (mínimo e máximo) para contratos por_hora e por_cargo

-- =====================================================
-- FUNÇÃO: aplicar_limites_mensais
-- Aplica limites de valor mínimo e máximo mensal
-- =====================================================

CREATE OR REPLACE FUNCTION aplicar_limites_mensais(
  p_valor_calculado NUMERIC,
  p_contrato_id UUID
) RETURNS NUMERIC AS $$
DECLARE
  v_min NUMERIC;
  v_max NUMERIC;
BEGIN
  -- Buscar limites do config JSONB do contrato
  SELECT
    (config->>'valor_minimo_mensal')::NUMERIC,
    (config->>'valor_maximo_mensal')::NUMERIC
  INTO v_min, v_max
  FROM financeiro_contratos_honorarios
  WHERE id = p_contrato_id;

  -- Aplicar mínimo (se configurado e valor abaixo)
  IF v_min IS NOT NULL AND p_valor_calculado < v_min THEN
    RETURN v_min;
  END IF;

  -- Aplicar máximo (se configurado e valor acima)
  IF v_max IS NOT NULL AND p_valor_calculado > v_max THEN
    RETURN v_max;
  END IF;

  -- Retornar valor original se não há limites aplicáveis
  RETURN p_valor_calculado;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION aplicar_limites_mensais IS 'Aplica limites de valor mínimo e máximo mensal para contratos por_hora e por_cargo. Lógica: MIN(MAX(valor, minimo), maximo)';

-- =====================================================
-- FUNÇÃO: get_valor_hora_contrato
-- Obtém o valor hora de um contrato (para por_hora)
-- =====================================================

CREATE OR REPLACE FUNCTION get_valor_hora_contrato(
  p_contrato_id UUID
) RETURNS NUMERIC AS $$
DECLARE
  v_valor NUMERIC;
BEGIN
  SELECT (config->>'valor_hora')::NUMERIC
  INTO v_valor
  FROM financeiro_contratos_honorarios
  WHERE id = p_contrato_id
    AND forma_cobranca = 'por_hora';

  RETURN v_valor;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_valor_hora_contrato IS 'Obtém o valor hora configurado em contratos do tipo por_hora';

-- =====================================================
-- FUNÇÃO: calcular_valor_timesheet_mensal
-- Calcula o valor total de timesheet para um contrato/mês
-- aplicando os limites mensais quando configurados
-- =====================================================

CREATE OR REPLACE FUNCTION calcular_valor_timesheet_mensal(
  p_contrato_id UUID,
  p_mes DATE
) RETURNS TABLE (
  total_horas NUMERIC,
  valor_hora_usado NUMERIC,
  valor_bruto NUMERIC,
  valor_final NUMERIC,
  aplicou_minimo BOOLEAN,
  aplicou_maximo BOOLEAN
) AS $$
DECLARE
  v_forma_cobranca TEXT;
  v_total_horas NUMERIC := 0;
  v_valor_hora NUMERIC := 0;
  v_valor_bruto NUMERIC := 0;
  v_valor_final NUMERIC := 0;
  v_min NUMERIC;
  v_max NUMERIC;
  v_aplicou_minimo BOOLEAN := FALSE;
  v_aplicou_maximo BOOLEAN := FALSE;
BEGIN
  -- Buscar forma de cobrança e limites
  SELECT
    fch.forma_cobranca,
    (fch.config->>'valor_hora')::NUMERIC,
    (fch.config->>'valor_minimo_mensal')::NUMERIC,
    (fch.config->>'valor_maximo_mensal')::NUMERIC
  INTO v_forma_cobranca, v_valor_hora, v_min, v_max
  FROM financeiro_contratos_honorarios fch
  WHERE fch.id = p_contrato_id;

  -- Se não é por_hora nem por_cargo, retornar vazio
  IF v_forma_cobranca NOT IN ('por_hora', 'por_cargo') THEN
    RETURN;
  END IF;

  -- Calcular total de horas aprovadas no mês
  -- (busca processos vinculados ao contrato)
  SELECT COALESCE(SUM(ft.horas), 0)
  INTO v_total_horas
  FROM financeiro_timesheet ft
  JOIN processos_processos pp ON pp.id = ft.processo_id
  WHERE pp.contrato_id = p_contrato_id
    AND ft.aprovado = TRUE
    AND ft.faturado = FALSE
    AND ft.faturavel = TRUE
    AND DATE_TRUNC('month', ft.data_trabalho) = DATE_TRUNC('month', p_mes);

  -- Para por_cargo, precisaria calcular com valores por cargo
  -- Por simplicidade, aqui usamos o valor_hora do contrato se disponível
  -- Em produção, isso deveria somar por cargo
  IF v_forma_cobranca = 'por_cargo' THEN
    -- TODO: Implementar soma por cargo quando necessário
    -- Por enquanto, apenas retorna as horas sem cálculo de valor
    v_valor_bruto := 0;
    v_valor_final := 0;
  ELSE
    -- por_hora: usar taxa única
    IF v_valor_hora IS NOT NULL THEN
      v_valor_bruto := v_total_horas * v_valor_hora;
      v_valor_final := v_valor_bruto;

      -- Aplicar limites
      IF v_min IS NOT NULL AND v_valor_final < v_min THEN
        v_valor_final := v_min;
        v_aplicou_minimo := TRUE;
      END IF;

      IF v_max IS NOT NULL AND v_valor_final > v_max THEN
        v_valor_final := v_max;
        v_aplicou_maximo := TRUE;
      END IF;
    END IF;
  END IF;

  RETURN QUERY SELECT
    v_total_horas,
    v_valor_hora,
    v_valor_bruto,
    v_valor_final,
    v_aplicou_minimo,
    v_aplicou_maximo;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calcular_valor_timesheet_mensal IS 'Calcula o valor total de timesheet para um contrato em um mês, aplicando limites min/max quando configurados';

-- =====================================================
-- Atualizar calcular_faturavel_timesheet para incluir por_hora
-- =====================================================

CREATE OR REPLACE FUNCTION calcular_faturavel_timesheet(
  p_processo_id uuid,
  p_consulta_id uuid
) RETURNS boolean AS $$
DECLARE
  v_contrato_id uuid;
  v_forma_cobranca text;
  v_horas_faturaveis boolean;
BEGIN
  -- Tentar obter contrato do processo
  IF p_processo_id IS NOT NULL THEN
    SELECT contrato_id INTO v_contrato_id
    FROM processos_processos
    WHERE id = p_processo_id;
  END IF;

  -- Se não tem processo ou processo sem contrato, tentar consulta
  IF v_contrato_id IS NULL AND p_consulta_id IS NOT NULL THEN
    SELECT contrato_id INTO v_contrato_id
    FROM consultivo_consultas
    WHERE id = p_consulta_id;
  END IF;

  -- Sem contrato, assume faturável
  IF v_contrato_id IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Obter forma de cobrança e config do contrato
  SELECT forma_cobranca, horas_faturaveis
  INTO v_forma_cobranca, v_horas_faturaveis
  FROM financeiro_contratos_honorarios
  WHERE id = v_contrato_id;

  -- Determinar se é faturável baseado na forma de cobrança
  CASE v_forma_cobranca
    WHEN 'por_hora' THEN RETURN TRUE;  -- Nova forma: horas são faturáveis
    WHEN 'por_cargo' THEN RETURN TRUE;
    WHEN 'fixo' THEN RETURN FALSE;
    WHEN 'por_pasta' THEN RETURN FALSE;
    WHEN 'por_ato' THEN RETURN FALSE;
    WHEN 'por_etapa' THEN RETURN FALSE;
    WHEN 'misto' THEN
      -- Para misto, usa configuração do contrato
      RETURN COALESCE(v_horas_faturaveis, TRUE);
    ELSE RETURN TRUE;
  END CASE;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calcular_faturavel_timesheet IS 'Determina se horas de timesheet são faturáveis baseado no tipo de contrato. por_hora e por_cargo = TRUE, fixo/por_pasta/por_ato/por_etapa = FALSE, misto = configurável';
