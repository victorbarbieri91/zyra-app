-- Remove despesa_id do retorno de obter_resumo_fatura_cartao_mes.
-- A coluna foi dropada no Caminho B; a função antiga ainda referenciava
-- f.despesa_id no SELECT, causando erro de runtime.

DROP FUNCTION IF EXISTS public.obter_resumo_fatura_cartao_mes(uuid, text);

CREATE OR REPLACE FUNCTION public.obter_resumo_fatura_cartao_mes(
  p_cartao_id uuid,
  p_mes_vencimento text
)
RETURNS TABLE(
  fatura_id uuid,
  valor_total numeric,
  status text,
  total_lancamentos integer,
  data_vencimento date
)
LANGUAGE plpgsql
AS $function$
DECLARE
  v_mes DATE := (p_mes_vencimento || '-01')::DATE;
  v_cartao RECORD;
  v_calc_venc DATE;
  v_ultimo_dia DATE;
BEGIN
  SELECT * INTO v_cartao FROM cartoes_credito WHERE id = p_cartao_id;
  IF NOT FOUND THEN RETURN; END IF;

  v_ultimo_dia := (DATE_TRUNC('month', v_mes) + INTERVAL '1 month - 1 day')::DATE;
  v_calc_venc := CASE
    WHEN v_cartao.dia_vencimento > EXTRACT(DAY FROM v_ultimo_dia)::INT THEN v_ultimo_dia
    ELSE make_date(EXTRACT(YEAR FROM v_mes)::INT, EXTRACT(MONTH FROM v_mes)::INT, v_cartao.dia_vencimento)
  END;

  RETURN QUERY
  SELECT
    f.id,
    COALESCE(f.valor_total, 0::NUMERIC),
    COALESCE(f.status, 'pendente')::TEXT,
    COALESCE((SELECT COUNT(*)::INT FROM cartoes_credito_lancamentos l
               WHERE l.cartao_id = p_cartao_id AND l.mes_referencia = v_mes), 0),
    COALESCE(f.data_vencimento, v_calc_venc)
  FROM (SELECT 1) dummy
  LEFT JOIN cartoes_credito_faturas f ON f.cartao_id = p_cartao_id AND f.mes_referencia = v_mes
  LIMIT 1;
END;
$function$;
