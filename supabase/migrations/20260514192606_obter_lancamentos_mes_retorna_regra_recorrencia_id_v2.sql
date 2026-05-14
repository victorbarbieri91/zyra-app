-- obter_lancamentos_mes passa a expor regra_recorrencia_id e demais
-- colunas necessárias para o modal de edição em série identificar
-- lançamentos vinculados a uma regra.

DROP FUNCTION IF EXISTS public.obter_lancamentos_mes(uuid, date);

CREATE OR REPLACE FUNCTION public.obter_lancamentos_mes(p_cartao_id uuid, p_mes_referencia date)
RETURNS TABLE(
  id uuid,
  descricao text,
  categoria text,
  fornecedor text,
  valor numeric,
  tipo text,
  parcela_numero integer,
  parcela_total integer,
  compra_id uuid,
  data_compra date,
  mes_referencia date,
  recorrente_ativo boolean,
  recorrente_data_fim date,
  fatura_id uuid,
  regra_recorrencia_id uuid,
  periodo_referencia text,
  processo_id uuid,
  consulta_id uuid,
  documento_fiscal text,
  observacoes text,
  comprovante_url text
)
LANGUAGE plpgsql
AS $function$
DECLARE
  v_mes DATE := DATE_TRUNC('month', p_mes_referencia)::DATE;
BEGIN
  RETURN QUERY
  SELECT l.id, l.descricao, l.categoria, l.fornecedor, l.valor, l.tipo,
    l.parcela_numero, l.parcela_total, l.compra_id, l.data_compra,
    l.mes_referencia, l.recorrente_ativo, l.recorrente_data_fim, l.fatura_id,
    l.regra_recorrencia_id, l.periodo_referencia,
    l.processo_id, l.consulta_id, l.documento_fiscal, l.observacoes, l.comprovante_url
  FROM cartoes_credito_lancamentos l
  WHERE l.cartao_id = p_cartao_id AND l.mes_referencia = v_mes
  ORDER BY l.data_compra, l.descricao;
END;
$function$;
