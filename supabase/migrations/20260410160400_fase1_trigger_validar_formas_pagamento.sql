-- =====================================================
-- FASE 1.2: Trigger de validação de formas_pagamento
-- =====================================================
-- PostgreSQL não aceita subquery em CHECK constraint, então a validação
-- vai como trigger BEFORE INSERT/UPDATE — bloqueia escritas inválidas e
-- mantém forma_cobranca sincronizada com formas_pagamento[0] como fallback.
-- =====================================================

CREATE OR REPLACE FUNCTION public.trigger_validar_formas_pagamento()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_invalid_count integer;
  v_primeira_forma text;
BEGIN
  -- 1. formas_pagamento não pode ser NULL
  IF NEW.formas_pagamento IS NULL THEN
    -- Backfill defensivo: se vier NULL mas tiver forma_cobranca, derivar
    IF NEW.forma_cobranca IS NOT NULL THEN
      NEW.formas_pagamento := jsonb_build_array(
        jsonb_build_object('forma', NEW.forma_cobranca, 'ordem', 0)
      );
    ELSE
      RAISE EXCEPTION 'formas_pagamento é obrigatório (forma_cobranca também não foi informado)';
    END IF;
  END IF;

  -- 2. Tem que ser array
  IF jsonb_typeof(NEW.formas_pagamento) != 'array' THEN
    RAISE EXCEPTION 'formas_pagamento deve ser um array jsonb, recebido: %', jsonb_typeof(NEW.formas_pagamento);
  END IF;

  -- 3. Array não pode ser vazio
  IF jsonb_array_length(NEW.formas_pagamento) = 0 THEN
    RAISE EXCEPTION 'formas_pagamento não pode ser um array vazio';
  END IF;

  -- 4. Validar que cada elemento tem chave "forma" com valor válido
  SELECT COUNT(*) INTO v_invalid_count
  FROM jsonb_array_elements(NEW.formas_pagamento) elem
  WHERE elem->>'forma' IS NULL
     OR elem->>'forma' NOT IN ('fixo','por_hora','por_cargo','por_pasta','por_ato','por_etapa','misto','pro_bono');

  IF v_invalid_count > 0 THEN
    RAISE EXCEPTION 'formas_pagamento contém % forma(s) inválida(s). Valores aceitos: fixo, por_hora, por_cargo, por_pasta, por_ato, por_etapa, misto, pro_bono', v_invalid_count;
  END IF;

  -- 5. Sincronizar forma_cobranca (legado) com a primeira forma do array
  -- Durante a janela de coexistência da Fase 5, mantemos os dois sempre alinhados.
  v_primeira_forma := NEW.formas_pagamento->0->>'forma';

  IF NEW.forma_cobranca IS DISTINCT FROM v_primeira_forma THEN
    NEW.forma_cobranca := v_primeira_forma;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_validar_formas_pagamento ON financeiro_contratos_honorarios;

CREATE TRIGGER trg_validar_formas_pagamento
BEFORE INSERT OR UPDATE ON financeiro_contratos_honorarios
FOR EACH ROW
EXECUTE FUNCTION trigger_validar_formas_pagamento();

COMMENT ON FUNCTION public.trigger_validar_formas_pagamento IS
  'Valida formas_pagamento (não nulo, array, não vazio, formas válidas) e mantém forma_cobranca sincronizada com formas_pagamento[0]->>"forma" durante a janela de coexistência da Fase 5.';
