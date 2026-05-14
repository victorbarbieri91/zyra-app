-- Substituir o índice parcial pelo unique completo, para permitir
-- ON CONFLICT (regra_recorrencia_id, periodo_referencia) DO NOTHING
-- usado por materializar_regra.
-- Em PG17 NULLs são distintos por padrão, então não afeta lançamentos avulsos.

DROP INDEX IF EXISTS public.idx_cartao_lanc_regra_periodo;

CREATE UNIQUE INDEX idx_cartao_lanc_regra_periodo
  ON public.cartoes_credito_lancamentos (regra_recorrencia_id, periodo_referencia);
