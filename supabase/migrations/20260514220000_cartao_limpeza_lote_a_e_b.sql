-- ============================================================================
-- Limpeza do módulo Cartão de Crédito
--
-- LOTE A — Drops seguros (nada usa):
--   1. RPCs obsoletas:
--      - criar_despesa_cartao (substituída por criar_lancamento_cartao)
--      - obter_ou_criar_fatura_cartao (substituída por criar_ou_atualizar_fatura_cartao)
--      - calcular_data_fechamento_cartao (não usada por ninguém)
--      - limpar_faturas_storage_antigas (órfã, sem cron)
--   2. Colunas zeradas em produção e sem refs no frontend:
--      - cartoes_credito_lancamentos.recorrente_data_fim (0/606 em produção)
--      - cartoes_credito_faturas.pdf_url (0/36)
--      - cartoes_credito_importacoes.fatura_id (0/90)
--      - cartoes_credito_importacoes.transacoes_duplicadas (0/90)
--
-- LOTE B — Simplificação de leitura:
--   - obter_fatura_atual_cartao e obter_resumo_fatura_cartao_mes passam a
--     usar f.valor_total direto (trigger já mantém sincronizado).
--   - Também resolve o bug atual: obter_resumo_fatura_cartao_mes chamava
--     gerar_lancamentos_recorrentes que foi dropada na refatoração anterior.
-- ============================================================================

DROP FUNCTION IF EXISTS public.criar_despesa_cartao(uuid, uuid, text, text, numeric, integer, date, text, uuid, text, text, boolean, text);
DROP FUNCTION IF EXISTS public.obter_ou_criar_fatura_cartao(uuid, date);
DROP FUNCTION IF EXISTS public.calcular_data_fechamento_cartao(integer, integer, date);
DROP FUNCTION IF EXISTS public.limpar_faturas_storage_antigas();

ALTER TABLE cartoes_credito_lancamentos DROP COLUMN IF EXISTS recorrente_data_fim;
ALTER TABLE cartoes_credito_faturas DROP COLUMN IF EXISTS pdf_url;
ALTER TABLE cartoes_credito_importacoes DROP COLUMN IF EXISTS fatura_id;
ALTER TABLE cartoes_credito_importacoes DROP COLUMN IF EXISTS transacoes_duplicadas;

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
  v_mes_atual DATE := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  v_cartao RECORD;
  v_calc_venc DATE;
  v_ultimo_dia DATE;
BEGIN
  SELECT * INTO v_cartao FROM cartoes_credito WHERE id = p_cartao_id;
  IF NOT FOUND THEN RETURN; END IF;

  v_ultimo_dia := (DATE_TRUNC('month', v_mes_atual) + INTERVAL '1 month - 1 day')::DATE;
  v_calc_venc := CASE
    WHEN v_cartao.dia_vencimento > EXTRACT(DAY FROM v_ultimo_dia)::INT THEN v_ultimo_dia
    ELSE make_date(EXTRACT(YEAR FROM v_mes_atual)::INT, EXTRACT(MONTH FROM v_mes_atual)::INT, v_cartao.dia_vencimento)
  END;

  RETURN QUERY
  SELECT
    f.id,
    v_mes_atual,
    COALESCE(f.data_vencimento, v_calc_venc),
    COALESCE(f.valor_total, 0::NUMERIC),
    COALESCE(f.status, 'pendente')::TEXT,
    COALESCE((SELECT COUNT(*)::INT FROM cartoes_credito_lancamentos l
               WHERE l.cartao_id = p_cartao_id AND l.mes_referencia = v_mes_atual), 0),
    (COALESCE(f.data_vencimento, v_calc_venc) - CURRENT_DATE)::INT
  FROM (SELECT 1) dummy
  LEFT JOIN cartoes_credito_faturas f ON f.cartao_id = p_cartao_id AND f.mes_referencia = v_mes_atual
  LIMIT 1;
END;
$function$;


CREATE OR REPLACE FUNCTION public.obter_resumo_fatura_cartao_mes(
  p_cartao_id uuid,
  p_mes_vencimento text
)
RETURNS TABLE(
  fatura_id uuid,
  valor_total numeric,
  status text,
  total_lancamentos integer,
  data_vencimento date,
  despesa_id uuid
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
    COALESCE(f.data_vencimento, v_calc_venc),
    f.despesa_id
  FROM (SELECT 1) dummy
  LEFT JOIN cartoes_credito_faturas f ON f.cartao_id = p_cartao_id AND f.mes_referencia = v_mes
  LIMIT 1;
END;
$function$;
