-- =============================================================================
-- Retenções tributárias: colunas de persistência + função de cálculo única
-- =============================================================================
-- Persiste retenção de fatura no banco (hoje só existe em runtime no PDF via
-- src/hooks/useFaturaImpressao.ts). A função SQL calcular_retencoes_fatura()
-- é porta direta de calcularImpostosLucroPresumido() em src/types/escritorio.ts
-- e preserva integralmente as regras:
--   * PF sem retenção
--   * Optante Simples: apenas IRRF
--   * PJ normal: IRRF ≥ R$10 individual; PIS+COFINS+CSLL só se soma ≥ R$10
--   * Itens de contrato com exportacao=true saem da base de retenção
--   * ISS/INSS quando retido_na_fonte=true
-- =============================================================================

-- 1. Colunas de retenção na fatura
ALTER TABLE financeiro_faturamento_faturas
  ADD COLUMN IF NOT EXISTS total_retencoes NUMERIC(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_liquido NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS retencoes JSONB;

COMMENT ON COLUMN financeiro_faturamento_faturas.total_retencoes IS 'Soma das retenções tributárias (IRRF+PIS+COFINS+CSLL+ISS+INSS) efetivamente retidas';
COMMENT ON COLUMN financeiro_faturamento_faturas.valor_liquido IS 'valor_total - total_retencoes. Valor que o cliente efetivamente paga.';
COMMENT ON COLUMN financeiro_faturamento_faturas.retencoes IS 'Detalhamento por imposto: {base_calculo, valor_exportacao, irrf:{aliquota,valor,retido}, pis, cofins, csll, iss, inss}';

-- 2. Colunas de retenção na receita (espelham a fatura para facilitar extrato)
ALTER TABLE financeiro_receitas
  ADD COLUMN IF NOT EXISTS valor_bruto NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS total_retencoes NUMERIC(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_liquido NUMERIC(18,2);

COMMENT ON COLUMN financeiro_receitas.valor_bruto IS 'Valor bruto quando receita vem de fatura com retenção; caso contrário igual a valor';
COMMENT ON COLUMN financeiro_receitas.valor_liquido IS 'Valor que o cliente efetivamente paga; igual a valor quando sem retenção';

-- 3. Função encapsulada: calcula retenções de uma fatura específica
CREATE OR REPLACE FUNCTION public.calcular_retencoes_fatura(p_fatura_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_fatura RECORD;
  v_cliente RECORD;
  v_config JSONB;
  v_regime TEXT;
  v_impostos JSONB;
  v_valor_exportacao NUMERIC := 0;
  v_base_retencao NUMERIC;

  -- alíquotas
  v_a_irrf NUMERIC;  v_at_irrf BOOLEAN; v_r_irrf BOOLEAN;
  v_a_pis NUMERIC;   v_at_pis BOOLEAN;  v_r_pis BOOLEAN;
  v_a_cofins NUMERIC;v_at_cofins BOOLEAN;v_r_cofins BOOLEAN;
  v_a_csll NUMERIC;  v_at_csll BOOLEAN; v_r_csll BOOLEAN;
  v_a_iss NUMERIC;   v_at_iss BOOLEAN;  v_r_iss BOOLEAN;
  v_a_inss NUMERIC;  v_at_inss BOOLEAN; v_r_inss BOOLEAN;

  -- valores brutos calculados
  v_irrf NUMERIC := 0;
  v_pis NUMERIC := 0;
  v_cofins NUMERIC := 0;
  v_csll NUMERIC := 0;
  v_iss NUMERIC := 0;
  v_inss NUMERIC := 0;

  -- flags de retenção efetiva
  v_irrf_ret BOOLEAN := FALSE;
  v_pis_ret BOOLEAN := FALSE;
  v_cofins_ret BOOLEAN := FALSE;
  v_csll_ret BOOLEAN := FALSE;
  v_iss_ret BOOLEAN := FALSE;
  v_inss_ret BOOLEAN := FALSE;

  v_is_simples BOOLEAN;
  v_pcs_retido BOOLEAN;

  v_total_retencoes NUMERIC := 0;
  v_valor_liquido NUMERIC;

  -- Limite federal: cada tipo de retenção só vale se ≥ R$10
  c_valor_minimo CONSTANT NUMERIC := 10;
BEGIN
  -- Buscar fatura + escritório + cliente
  SELECT f.id, f.valor_total, f.itens, f.escritorio_id, f.cliente_id,
         e.config AS escritorio_config
  INTO v_fatura
  FROM financeiro_faturamento_faturas f
  JOIN escritorios e ON e.id = f.escritorio_id
  WHERE f.id = p_fatura_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fatura não encontrada: %', p_fatura_id;
  END IF;

  SELECT tipo_pessoa::text AS tipo_pessoa, COALESCE(optante_simples, FALSE) AS optante_simples
  INTO v_cliente
  FROM crm_pessoas
  WHERE id = v_fatura.cliente_id;

  v_config := COALESCE(v_fatura.escritorio_config->'fiscal', '{}'::jsonb);
  v_regime := v_config->>'regime_tributario';

  -- Sem config fiscal ou sem exibição: neutro
  IF v_config = '{}'::jsonb OR COALESCE((v_config->>'exibir_impostos_fatura')::boolean, FALSE) = FALSE THEN
    RETURN jsonb_build_object(
      'base_calculo', v_fatura.valor_total,
      'valor_exportacao', 0,
      'total_retencoes', 0,
      'valor_liquido', v_fatura.valor_total,
      'irrf',   jsonb_build_object('aliquota', 0, 'valor', 0, 'retido', FALSE),
      'pis',    jsonb_build_object('aliquota', 0, 'valor', 0, 'retido', FALSE),
      'cofins', jsonb_build_object('aliquota', 0, 'valor', 0, 'retido', FALSE),
      'csll',   jsonb_build_object('aliquota', 0, 'valor', 0, 'retido', FALSE),
      'iss',    jsonb_build_object('aliquota', 0, 'valor', 0, 'retido', FALSE),
      'inss',   jsonb_build_object('aliquota', 0, 'valor', 0, 'retido', FALSE)
    );
  END IF;

  -- Simples Nacional: sem retenção na fatura (tributação via DAS)
  IF v_regime = 'simples_nacional' THEN
    RETURN jsonb_build_object(
      'base_calculo', v_fatura.valor_total,
      'valor_exportacao', 0,
      'total_retencoes', 0,
      'valor_liquido', v_fatura.valor_total,
      'irrf',   jsonb_build_object('aliquota', 0, 'valor', 0, 'retido', FALSE),
      'pis',    jsonb_build_object('aliquota', 0, 'valor', 0, 'retido', FALSE),
      'cofins', jsonb_build_object('aliquota', 0, 'valor', 0, 'retido', FALSE),
      'csll',   jsonb_build_object('aliquota', 0, 'valor', 0, 'retido', FALSE),
      'iss',    jsonb_build_object('aliquota', 0, 'valor', 0, 'retido', FALSE),
      'inss',   jsonb_build_object('aliquota', 0, 'valor', 0, 'retido', FALSE)
    );
  END IF;

  -- A partir daqui: regime Lucro Presumido
  IF v_regime IS DISTINCT FROM 'lucro_presumido' THEN
    -- Regimes não suportados: neutro
    RETURN jsonb_build_object(
      'base_calculo', v_fatura.valor_total,
      'valor_exportacao', 0,
      'total_retencoes', 0,
      'valor_liquido', v_fatura.valor_total,
      'irrf',   jsonb_build_object('aliquota', 0, 'valor', 0, 'retido', FALSE),
      'pis',    jsonb_build_object('aliquota', 0, 'valor', 0, 'retido', FALSE),
      'cofins', jsonb_build_object('aliquota', 0, 'valor', 0, 'retido', FALSE),
      'csll',   jsonb_build_object('aliquota', 0, 'valor', 0, 'retido', FALSE),
      'iss',    jsonb_build_object('aliquota', 0, 'valor', 0, 'retido', FALSE),
      'inss',   jsonb_build_object('aliquota', 0, 'valor', 0, 'retido', FALSE)
    );
  END IF;

  -- PF: nenhuma retenção
  IF COALESCE(v_cliente.tipo_pessoa, 'pj') = 'pf' THEN
    RETURN jsonb_build_object(
      'base_calculo', v_fatura.valor_total,
      'valor_exportacao', 0,
      'total_retencoes', 0,
      'valor_liquido', v_fatura.valor_total,
      'irrf',   jsonb_build_object('aliquota', 0, 'valor', 0, 'retido', FALSE),
      'pis',    jsonb_build_object('aliquota', 0, 'valor', 0, 'retido', FALSE),
      'cofins', jsonb_build_object('aliquota', 0, 'valor', 0, 'retido', FALSE),
      'csll',   jsonb_build_object('aliquota', 0, 'valor', 0, 'retido', FALSE),
      'iss',    jsonb_build_object('aliquota', 0, 'valor', 0, 'retido', FALSE),
      'inss',   jsonb_build_object('aliquota', 0, 'valor', 0, 'retido', FALSE)
    );
  END IF;

  -- Ler alíquotas de impostos
  v_impostos := v_config->'lucro_presumido'->'impostos';

  v_a_irrf   := COALESCE((v_impostos->'irrf'->>'aliquota')::numeric, 0);
  v_at_irrf  := COALESCE((v_impostos->'irrf'->>'ativo')::boolean, FALSE);
  v_r_irrf   := COALESCE((v_impostos->'irrf'->>'retido_na_fonte')::boolean, FALSE);

  v_a_pis    := COALESCE((v_impostos->'pis'->>'aliquota')::numeric, 0);
  v_at_pis   := COALESCE((v_impostos->'pis'->>'ativo')::boolean, FALSE);
  v_r_pis    := COALESCE((v_impostos->'pis'->>'retido_na_fonte')::boolean, FALSE);

  v_a_cofins := COALESCE((v_impostos->'cofins'->>'aliquota')::numeric, 0);
  v_at_cofins:= COALESCE((v_impostos->'cofins'->>'ativo')::boolean, FALSE);
  v_r_cofins := COALESCE((v_impostos->'cofins'->>'retido_na_fonte')::boolean, FALSE);

  v_a_csll   := COALESCE((v_impostos->'csll'->>'aliquota')::numeric, 0);
  v_at_csll  := COALESCE((v_impostos->'csll'->>'ativo')::boolean, FALSE);
  v_r_csll   := COALESCE((v_impostos->'csll'->>'retido_na_fonte')::boolean, FALSE);

  v_a_iss    := COALESCE((v_impostos->'iss'->>'aliquota')::numeric, 0);
  v_at_iss   := COALESCE((v_impostos->'iss'->>'ativo')::boolean, FALSE);
  v_r_iss    := COALESCE((v_impostos->'iss'->>'retido_na_fonte')::boolean, FALSE);

  v_a_inss   := COALESCE((v_impostos->'inss'->>'aliquota')::numeric, 0);
  v_at_inss  := COALESCE((v_impostos->'inss'->>'ativo')::boolean, FALSE);
  v_r_inss   := COALESCE((v_impostos->'inss'->>'retido_na_fonte')::boolean, FALSE);

  -- Valor de itens vinculados a contrato com exportacao=true (isentos de retenção)
  SELECT COALESCE(SUM((item->>'valor')::numeric), 0)
  INTO v_valor_exportacao
  FROM jsonb_array_elements(COALESCE(v_fatura.itens, '[]'::jsonb)) AS item
  WHERE item->>'contrato_id' IS NOT NULL
    AND item->>'contrato_id' <> 'null'
    AND EXISTS (
      SELECT 1 FROM financeiro_contratos_honorarios c
      WHERE c.id = (item->>'contrato_id')::uuid
        AND c.exportacao = TRUE
    );

  v_base_retencao := v_fatura.valor_total - v_valor_exportacao;
  IF v_base_retencao < 0 THEN
    v_base_retencao := 0;
  END IF;

  -- Cálculo bruto dos tributos sobre a base
  IF v_at_irrf THEN v_irrf := v_base_retencao * (v_a_irrf / 100); END IF;
  IF v_at_pis  THEN v_pis  := v_base_retencao * (v_a_pis / 100);  END IF;
  IF v_at_cofins THEN v_cofins := v_base_retencao * (v_a_cofins / 100); END IF;
  IF v_at_csll THEN v_csll := v_base_retencao * (v_a_csll / 100); END IF;
  IF v_at_iss  THEN v_iss  := v_base_retencao * (v_a_iss / 100);  END IF;
  IF v_at_inss THEN v_inss := v_base_retencao * (v_a_inss / 100); END IF;

  -- Regras de retenção efetiva (valor mínimo R$10)
  v_irrf_ret := v_r_irrf AND v_irrf >= c_valor_minimo;
  v_pcs_retido := (v_pis + v_cofins + v_csll) >= c_valor_minimo;
  v_pis_ret    := v_r_pis AND v_pcs_retido;
  v_cofins_ret := v_r_cofins AND v_pcs_retido;
  v_csll_ret   := v_r_csll AND v_pcs_retido;
  v_iss_ret    := v_r_iss;
  v_inss_ret   := v_r_inss;

  -- Optante Simples: apenas IRRF (PIS/COFINS/CSLL zerados)
  v_is_simples := COALESCE(v_cliente.optante_simples, FALSE);
  IF v_is_simples THEN
    v_pis_ret := FALSE;
    v_cofins_ret := FALSE;
    v_csll_ret := FALSE;
  END IF;

  -- Totalizar retenções efetivas
  v_total_retencoes :=
      (CASE WHEN v_irrf_ret   THEN v_irrf   ELSE 0 END)
    + (CASE WHEN v_pis_ret    THEN v_pis    ELSE 0 END)
    + (CASE WHEN v_cofins_ret THEN v_cofins ELSE 0 END)
    + (CASE WHEN v_csll_ret   THEN v_csll   ELSE 0 END)
    + (CASE WHEN v_iss_ret    THEN v_iss    ELSE 0 END)
    + (CASE WHEN v_inss_ret   THEN v_inss   ELSE 0 END);

  -- Líquido sempre sobre o total da fatura (exportação entra no bruto mas não no cálculo)
  v_valor_liquido := v_fatura.valor_total - v_total_retencoes;

  RETURN jsonb_build_object(
    'base_calculo', ROUND(v_base_retencao, 2),
    'valor_exportacao', ROUND(v_valor_exportacao, 2),
    'total_retencoes', ROUND(v_total_retencoes, 2),
    'valor_liquido', ROUND(v_valor_liquido, 2),
    'irrf',   jsonb_build_object('aliquota', v_a_irrf,   'valor', ROUND(CASE WHEN v_irrf_ret   THEN v_irrf   ELSE 0 END, 2), 'retido', v_irrf_ret),
    'pis',    jsonb_build_object('aliquota', v_a_pis,    'valor', ROUND(CASE WHEN v_pis_ret    THEN v_pis    ELSE 0 END, 2), 'retido', v_pis_ret),
    'cofins', jsonb_build_object('aliquota', v_a_cofins, 'valor', ROUND(CASE WHEN v_cofins_ret THEN v_cofins ELSE 0 END, 2), 'retido', v_cofins_ret),
    'csll',   jsonb_build_object('aliquota', v_a_csll,   'valor', ROUND(CASE WHEN v_csll_ret   THEN v_csll   ELSE 0 END, 2), 'retido', v_csll_ret),
    'iss',    jsonb_build_object('aliquota', v_a_iss,    'valor', ROUND(CASE WHEN v_iss_ret    THEN v_iss    ELSE 0 END, 2), 'retido', v_iss_ret),
    'inss',   jsonb_build_object('aliquota', v_a_inss,   'valor', ROUND(CASE WHEN v_inss_ret   THEN v_inss   ELSE 0 END, 2), 'retido', v_inss_ret)
  );
END;
$function$;

COMMENT ON FUNCTION public.calcular_retencoes_fatura IS 'Fonte única do cálculo de retenções tributárias da fatura. Porta fiel de calcularImpostosLucroPresumido() em src/types/escritorio.ts';

-- 4. Atualizar colunas persistidas da fatura e suas receitas filhas
CREATE OR REPLACE FUNCTION public.atualizar_retencoes_fatura(p_fatura_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_retencoes JSONB;
  v_valor_total NUMERIC;
  v_total_retencoes NUMERIC;
  v_valor_liquido NUMERIC;
  v_soma_receitas NUMERIC;
  v_receita RECORD;
  v_fator NUMERIC;
BEGIN
  v_retencoes := public.calcular_retencoes_fatura(p_fatura_id);
  v_total_retencoes := (v_retencoes->>'total_retencoes')::numeric;
  v_valor_liquido := (v_retencoes->>'valor_liquido')::numeric;

  SELECT valor_total INTO v_valor_total
  FROM financeiro_faturamento_faturas
  WHERE id = p_fatura_id;

  UPDATE financeiro_faturamento_faturas
  SET total_retencoes = v_total_retencoes,
      valor_liquido = v_valor_liquido,
      retencoes = v_retencoes,
      updated_at = NOW()
  WHERE id = p_fatura_id;

  -- Propagar para receitas filhas (rateio proporcional quando há múltiplas receitas)
  SELECT COALESCE(SUM(valor), 0) INTO v_soma_receitas
  FROM financeiro_receitas
  WHERE fatura_id = p_fatura_id;

  IF v_soma_receitas > 0 THEN
    FOR v_receita IN
      SELECT id, valor
      FROM financeiro_receitas
      WHERE fatura_id = p_fatura_id
    LOOP
      v_fator := v_receita.valor / v_soma_receitas;
      UPDATE financeiro_receitas
      SET valor_bruto = v_receita.valor,
          total_retencoes = ROUND(v_total_retencoes * v_fator, 2),
          valor_liquido = ROUND(v_receita.valor - (v_total_retencoes * v_fator), 2),
          updated_at = NOW()
      WHERE id = v_receita.id;
    END LOOP;
  END IF;
END;
$function$;

COMMENT ON FUNCTION public.atualizar_retencoes_fatura IS 'Calcula e persiste retenções na fatura + rateia nas receitas filhas';
