-- Fase 1 — Simplifica atualizar_retencoes_fatura
-- A função passa a APENAS atualizar a fatura. Removido o bloco que propagava retenção
-- proporcional para receitas filhas — fonte do bug retenção dupla (FAT-015) e
-- retenção concentrada (FAT-021). Retenção é da fatura, não das receitas que a compõem.

CREATE OR REPLACE FUNCTION public.atualizar_retencoes_fatura(p_fatura_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_retencoes JSONB;
  v_total_retencoes NUMERIC;
  v_valor_liquido NUMERIC;
BEGIN
  v_retencoes := public.calcular_retencoes_fatura(p_fatura_id);
  v_total_retencoes := (v_retencoes->>'total_retencoes')::numeric;
  v_valor_liquido := (v_retencoes->>'valor_liquido')::numeric;

  UPDATE financeiro_faturamento_faturas
  SET total_retencoes = v_total_retencoes,
      valor_liquido = v_valor_liquido,
      retencoes = v_retencoes,
      updated_at = NOW()
  WHERE id = p_fatura_id;
END;
$function$;

COMMENT ON FUNCTION public.atualizar_retencoes_fatura IS 'Calcula e persiste retenções APENAS na fatura. Retenção é da fatura — receitas filhas não recebem propagação (evita bug de retenção dupla).';
