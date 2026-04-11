-- =====================================================
-- FASE 1.3: Helper contrato_tem_forma
-- =====================================================
-- Verifica se um contrato tem uma forma específica configurada em formas_pagamento.
-- Encapsula a iteração sobre o jsonb para simplificar as funções consumidoras.
-- =====================================================

CREATE OR REPLACE FUNCTION public.contrato_tem_forma(p_contrato_id uuid, p_forma text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM financeiro_contratos_honorarios c,
         jsonb_array_elements(c.formas_pagamento) f
    WHERE c.id = p_contrato_id
      AND f->>'forma' = p_forma
      AND c.ativo = true
  );
$function$;

COMMENT ON FUNCTION public.contrato_tem_forma IS
  'Retorna true se o contrato tem a forma especificada em formas_pagamento. Helper canônico usado pelas funções de cálculo financeiro.';

GRANT EXECUTE ON FUNCTION public.contrato_tem_forma TO authenticated;

-- =====================================================
-- FASE 1.4: Reescrever calcular_faturavel_timesheet
-- =====================================================
-- Nova lógica baseada em formas_pagamento (array) ao invés de forma_cobranca (enum):
-- 1. Sem contrato → cobrável (mantém comportamento atual)
-- 2. Contém pro_bono → não cobrável (pro_bono prevalece)
-- 3. Contém por_hora OU por_cargo → cobrável (qualquer modo de hora torna a hora faturável)
-- 4. Contém misto → usa horas_faturaveis flag
-- 5. Caso contrário → não cobrável (apenas mensalidade/atos/etapas — horas embutidas)
-- =====================================================

CREATE OR REPLACE FUNCTION public.calcular_faturavel_timesheet(
  p_processo_id uuid DEFAULT NULL::uuid,
  p_consulta_id uuid DEFAULT NULL::uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $function$
DECLARE
  v_contrato_id uuid;
  v_formas jsonb;
  v_horas_faturaveis boolean;
  v_ativo boolean;
BEGIN
  -- Sem processo nem consulta → cobrável (comportamento legado)
  IF p_processo_id IS NULL AND p_consulta_id IS NULL THEN
    RETURN true;
  END IF;

  -- Resolver contrato (processo tem prioridade sobre consulta)
  IF p_processo_id IS NOT NULL THEN
    SELECT contrato_id INTO v_contrato_id
    FROM processos_processos
    WHERE id = p_processo_id;
  END IF;

  IF v_contrato_id IS NULL AND p_consulta_id IS NOT NULL THEN
    SELECT contrato_id INTO v_contrato_id
    FROM consultivo_consultas
    WHERE id = p_consulta_id;
  END IF;

  -- Sem contrato vinculado → cobrável (default)
  IF v_contrato_id IS NULL THEN
    RETURN true;
  END IF;

  -- Buscar formas configuradas e flag de horas (para misto)
  SELECT formas_pagamento, horas_faturaveis, ativo
    INTO v_formas, v_horas_faturaveis, v_ativo
    FROM financeiro_contratos_honorarios
   WHERE id = v_contrato_id;

  -- Contrato inativo ou sem formas → cobrável (default conservador)
  IF NOT COALESCE(v_ativo, false) THEN
    RETURN true;
  END IF;

  IF v_formas IS NULL OR jsonb_typeof(v_formas) != 'array' OR jsonb_array_length(v_formas) = 0 THEN
    RETURN true;
  END IF;

  -- REGRA 1: pro_bono prevalece sobre tudo
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_formas) f
    WHERE f->>'forma' = 'pro_bono'
  ) THEN
    RETURN false;
  END IF;

  -- REGRA 2: qualquer modo de hora torna cobrável
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_formas) f
    WHERE f->>'forma' IN ('por_hora', 'por_cargo')
  ) THEN
    RETURN true;
  END IF;

  -- REGRA 3: misto usa o flag horas_faturaveis do contrato
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_formas) f
    WHERE f->>'forma' = 'misto'
  ) THEN
    RETURN COALESCE(v_horas_faturaveis, true);
  END IF;

  -- REGRA 4: outras formas (fixo, por_pasta, por_ato, por_etapa)
  -- significam que as horas estão embutidas no escopo principal — não são cobráveis por padrão
  RETURN false;
END;
$function$;

COMMENT ON FUNCTION public.calcular_faturavel_timesheet IS
  'Determina se uma hora de timesheet é faturável baseado nas formas configuradas em formas_pagamento do contrato vinculado. Reconhece contratos híbridos: se há por_hora ou por_cargo no array, a hora vira cobrável independente das outras formas presentes (ex: por_pasta + por_cargo). pro_bono prevalece. Default conservador (true) quando não há contrato.';
