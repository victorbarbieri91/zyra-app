-- Aposenta gerar_lancamentos_recorrentes (modelo lazy).
-- Materializar_regra + cron estender_horizonte_recorrentes mantêm os
-- lançamentos materializados, então as funções obter_* não precisam
-- mais invocar geração on-demand.

CREATE OR REPLACE FUNCTION public.obter_fatura_atual_cartao(p_cartao_id uuid)
RETURNS TABLE(
  fatura_id uuid,
  mes_referencia date,
  data_vencimento date,
  valor_total numeric,
  status text,
  total_lancamentos integer,
  dias_para_vencimento integer
)
LANGUAGE plpgsql
AS $function$
DECLARE
  v_mes_atual DATE;
  v_calc_vencimento DATE;
  v_cartao RECORD;
  v_ultimo_dia_mes DATE;
BEGIN
  v_mes_atual := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  SELECT * INTO v_cartao FROM cartoes_credito WHERE id = p_cartao_id;
  IF NOT FOUND THEN RETURN; END IF;

  v_ultimo_dia_mes := (DATE_TRUNC('month', v_mes_atual) + INTERVAL '1 month - 1 day')::DATE;
  IF v_cartao.dia_vencimento > EXTRACT(DAY FROM v_ultimo_dia_mes)::INT THEN
    v_calc_vencimento := v_ultimo_dia_mes;
  ELSE
    v_calc_vencimento := make_date(EXTRACT(YEAR FROM v_mes_atual)::INT, EXTRACT(MONTH FROM v_mes_atual)::INT, v_cartao.dia_vencimento);
  END IF;

  RETURN QUERY
  SELECT f.id AS fatura_id, v_mes_atual AS mes_referencia,
    COALESCE(f.data_vencimento, v_calc_vencimento) AS data_vencimento,
    COALESCE((SELECT SUM(l.valor) FROM cartoes_credito_lancamentos l WHERE l.cartao_id = p_cartao_id AND l.mes_referencia = v_mes_atual), 0::NUMERIC) AS valor_total,
    COALESCE(f.status, 'pendente')::TEXT AS status,
    (SELECT COUNT(*)::INTEGER FROM cartoes_credito_lancamentos l WHERE l.cartao_id = p_cartao_id AND l.mes_referencia = v_mes_atual) AS total_lancamentos,
    (COALESCE(f.data_vencimento, v_calc_vencimento) - CURRENT_DATE)::INTEGER AS dias_para_vencimento
  FROM (SELECT 1) AS dummy
  LEFT JOIN cartoes_credito_faturas f ON f.cartao_id = p_cartao_id AND f.mes_referencia = v_mes_atual
  LIMIT 1;
END;
$function$;


CREATE OR REPLACE FUNCTION public.obter_lancamentos_mes(p_cartao_id uuid, p_mes_referencia date)
RETURNS TABLE(
  id uuid, descricao text, categoria text, fornecedor text, valor numeric, tipo text,
  parcela_numero integer, parcela_total integer, compra_id uuid, data_compra date,
  mes_referencia date, recorrente_ativo boolean, recorrente_data_fim date, fatura_id uuid
)
LANGUAGE plpgsql
AS $function$
DECLARE
  v_mes DATE := DATE_TRUNC('month', p_mes_referencia)::DATE;
BEGIN
  RETURN QUERY
  SELECT l.id, l.descricao, l.categoria, l.fornecedor, l.valor, l.tipo,
    l.parcela_numero, l.parcela_total, l.compra_id, l.data_compra,
    l.mes_referencia, l.recorrente_ativo, l.recorrente_data_fim, l.fatura_id
  FROM cartoes_credito_lancamentos l
  WHERE l.cartao_id = p_cartao_id AND l.mes_referencia = v_mes
  ORDER BY l.data_compra, l.descricao;
END;
$function$;


CREATE OR REPLACE FUNCTION public.criar_ou_atualizar_fatura_cartao(p_cartao_id uuid, p_mes_referencia date)
RETURNS uuid
LANGUAGE plpgsql
AS $function$
DECLARE
  v_cartao RECORD;
  v_fatura_id UUID;
  v_despesa_id UUID;
  v_valor_total NUMERIC;
  v_data_vencimento DATE;
  v_ultimo_dia_mes DATE;
  v_descricao_fatura TEXT;
  v_mes DATE := DATE_TRUNC('month', p_mes_referencia)::DATE;
BEGIN
  SELECT * INTO v_cartao FROM cartoes_credito WHERE id = p_cartao_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cartao nao encontrado: %', p_cartao_id;
  END IF;

  v_ultimo_dia_mes := (DATE_TRUNC('month', v_mes) + INTERVAL '1 month - 1 day')::DATE;
  IF v_cartao.dia_vencimento > EXTRACT(DAY FROM v_ultimo_dia_mes)::INT THEN
    v_data_vencimento := v_ultimo_dia_mes;
  ELSE
    v_data_vencimento := make_date(EXTRACT(YEAR FROM v_mes)::INT, EXTRACT(MONTH FROM v_mes)::INT, v_cartao.dia_vencimento);
  END IF;

  SELECT COALESCE(SUM(valor), 0) INTO v_valor_total
  FROM cartoes_credito_lancamentos WHERE cartao_id = p_cartao_id AND mes_referencia = v_mes;

  SELECT id, despesa_id INTO v_fatura_id, v_despesa_id
  FROM cartoes_credito_faturas WHERE cartao_id = p_cartao_id AND mes_referencia = v_mes;

  v_descricao_fatura := 'Fatura ' || v_cartao.nome || ' - ' || TO_CHAR(v_mes, 'MM/YYYY');

  IF v_fatura_id IS NULL THEN
    INSERT INTO cartoes_credito_faturas (escritorio_id, cartao_id, mes_referencia, data_vencimento, valor_total, status)
    VALUES (v_cartao.escritorio_id, p_cartao_id, v_mes, v_data_vencimento, v_valor_total, 'pendente')
    RETURNING id INTO v_fatura_id;
  ELSE
    UPDATE cartoes_credito_faturas
    SET valor_total = v_valor_total, data_vencimento = v_data_vencimento, updated_at = NOW()
    WHERE id = v_fatura_id AND status != 'paga';
  END IF;

  UPDATE cartoes_credito_lancamentos
  SET fatura_id = v_fatura_id, updated_at = NOW()
  WHERE cartao_id = p_cartao_id AND mes_referencia = v_mes AND (fatura_id IS NULL OR fatura_id != v_fatura_id);

  IF v_valor_total > 0 THEN
    IF v_despesa_id IS NULL THEN
      INSERT INTO financeiro_despesas (escritorio_id, categoria, fornecedor, descricao, valor, data_vencimento, status)
      VALUES (v_cartao.escritorio_id, 'cartao_credito', v_cartao.banco || ' - ' || v_cartao.nome, v_descricao_fatura, v_valor_total, v_data_vencimento, 'pendente')
      RETURNING id INTO v_despesa_id;
      UPDATE cartoes_credito_faturas SET despesa_id = v_despesa_id WHERE id = v_fatura_id;
    ELSE
      UPDATE financeiro_despesas SET valor = v_valor_total, descricao = v_descricao_fatura, data_vencimento = v_data_vencimento, updated_at = NOW()
      WHERE id = v_despesa_id AND status != 'pago';
    END IF;
  END IF;

  RETURN v_fatura_id;
END;
$function$;


DROP FUNCTION IF EXISTS public.gerar_lancamentos_recorrentes(uuid, date);
