-- =============================================================================
-- Backfill: recalcular retenções de todas as faturas existentes
-- =============================================================================
-- Usa a config fiscal atual do escritório. Para faturas cuja config não suporte
-- retenções (sem config, Simples Nacional, PF), a função devolve neutro
-- (valor_liquido = valor_total, total_retencoes = 0).
-- =============================================================================

DO $$
DECLARE
  v_fatura RECORD;
  v_contador INTEGER := 0;
BEGIN
  FOR v_fatura IN
    SELECT id FROM financeiro_faturamento_faturas
    WHERE retencoes IS NULL OR valor_liquido IS NULL
  LOOP
    BEGIN
      PERFORM public.atualizar_retencoes_fatura(v_fatura.id);
      v_contador := v_contador + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Falha ao processar fatura %: %', v_fatura.id, SQLERRM;
    END;
  END LOOP;
  RAISE NOTICE 'Backfill concluído: % faturas processadas', v_contador;
END;
$$;

-- Garantir fallback neutro onde ainda estiver NULL (ex: erro acima)
UPDATE financeiro_faturamento_faturas
SET valor_liquido = valor_total
WHERE valor_liquido IS NULL;

UPDATE financeiro_receitas
SET valor_liquido = valor,
    valor_bruto = valor
WHERE valor_liquido IS NULL;
