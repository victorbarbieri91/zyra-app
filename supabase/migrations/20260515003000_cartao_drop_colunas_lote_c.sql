-- ============================================================================
-- LOTE C — Drop de colunas com UI ativa mas zero uso em produção:
--   - cartoes_credito_lancamentos.consulta_id (0/606)
--   - cartoes_credito_lancamentos.documento_fiscal (0/606)
--   - cartoes_credito_lancamentos.comprovante_url (0/606)
--   - cartoes_credito_lancamentos.observacoes (0/606)
--   - cartoes_credito_faturas.observacoes (0/36)
--
-- Mantidos:
--   - cartoes_credito.observacoes (2/10 preenchidos)
--   - cartoes_credito_lancamentos.processo_id (feature ativa para vinculação
--     de compra a processo)
--
-- Refatora criar_lancamento_cartao e obter_lancamentos_mes para refletir
-- a remoção das colunas.
-- ============================================================================

ALTER TABLE cartoes_credito_lancamentos DROP COLUMN IF EXISTS consulta_id;
ALTER TABLE cartoes_credito_lancamentos DROP COLUMN IF EXISTS documento_fiscal;
ALTER TABLE cartoes_credito_lancamentos DROP COLUMN IF EXISTS comprovante_url;
ALTER TABLE cartoes_credito_lancamentos DROP COLUMN IF EXISTS observacoes;
ALTER TABLE cartoes_credito_faturas DROP COLUMN IF EXISTS observacoes;

DROP FUNCTION IF EXISTS public.criar_lancamento_cartao(uuid, text, text, text, numeric, text, integer, date, date, uuid, uuid, text, text, boolean, integer);

CREATE OR REPLACE FUNCTION public.criar_lancamento_cartao(
  p_cartao_id uuid,
  p_descricao text,
  p_categoria text,
  p_fornecedor text DEFAULT NULL::text,
  p_valor numeric DEFAULT 0,
  p_tipo text DEFAULT 'unica'::text,
  p_parcelas integer DEFAULT 1,
  p_data_compra date DEFAULT CURRENT_DATE,
  p_mes_referencia date DEFAULT NULL::date,
  p_processo_id uuid DEFAULT NULL::uuid,
  p_importado_de_fatura boolean DEFAULT false,
  p_parcela_inicial integer DEFAULT 1
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_cartao RECORD;
  v_compra_id UUID;
  v_mes_ref DATE;
  v_valor_parcela NUMERIC;
  v_regra_id UUID;
  v_vigencia_fim DATE;
BEGIN
  SELECT * INTO v_cartao FROM cartoes_credito WHERE id = p_cartao_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cartão não encontrado'; END IF;

  IF p_valor <= 0 THEN RAISE EXCEPTION 'Valor deve ser maior que zero'; END IF;
  IF p_tipo NOT IN ('unica', 'parcelada', 'recorrente') THEN
    RAISE EXCEPTION 'Tipo inválido: %. Use: unica, parcelada, recorrente', p_tipo;
  END IF;
  IF p_tipo = 'parcelada' AND p_parcelas < 2 THEN
    RAISE EXCEPTION 'Parcelado deve ter pelo menos 2 parcelas';
  END IF;
  IF p_parcela_inicial < 1 OR p_parcela_inicial > p_parcelas THEN
    RAISE EXCEPTION 'Parcela inicial deve estar entre 1 e %', p_parcelas;
  END IF;

  v_compra_id := gen_random_uuid();

  IF p_mes_referencia IS NOT NULL THEN
    v_mes_ref := DATE_TRUNC('month', p_mes_referencia)::DATE;
  ELSE
    v_mes_ref := calcular_mes_referencia_cartao(p_cartao_id, p_data_compra);
  END IF;

  IF p_tipo = 'parcelada' AND p_parcelas > 1 THEN
    v_valor_parcela := ROUND(p_valor / p_parcelas, 2);
  ELSE
    v_valor_parcela := p_valor;
  END IF;

  IF p_tipo = 'unica' THEN
    INSERT INTO cartoes_credito_lancamentos (
      escritorio_id, cartao_id, descricao, categoria, fornecedor, valor,
      tipo, parcela_numero, parcela_total, compra_id, data_compra, mes_referencia,
      processo_id, importado_de_fatura, periodo_referencia
    ) VALUES (
      v_cartao.escritorio_id, p_cartao_id, p_descricao, p_categoria, p_fornecedor, v_valor_parcela,
      'unica', 1, 1, v_compra_id, p_data_compra, v_mes_ref,
      p_processo_id, p_importado_de_fatura, to_char(v_mes_ref, 'YYYY-MM')
    );

  ELSIF p_tipo = 'parcelada' THEN
    v_vigencia_fim := (v_mes_ref + ((p_parcelas - p_parcela_inicial) || ' months')::INTERVAL)::DATE;

    INSERT INTO financeiro_regras_recorrencia (
      escritorio_id, tipo_entidade, descricao, categoria, fornecedor,
      valor_atual, frequencia, dia_vencimento, vigencia_inicio, vigencia_fim,
      ativo, is_parcelamento, parcela_total, parcela_inicio,
      valor_total_original, cartao_id, compra_id, processo_id
    ) VALUES (
      v_cartao.escritorio_id, 'cartao', p_descricao, p_categoria, p_fornecedor,
      v_valor_parcela, 'mensal', EXTRACT(DAY FROM p_data_compra)::INT,
      v_mes_ref, v_vigencia_fim,
      true, true, p_parcelas, p_parcela_inicial,
      p_valor, p_cartao_id, v_compra_id, p_processo_id
    ) RETURNING id INTO v_regra_id;

  ELSIF p_tipo = 'recorrente' THEN
    INSERT INTO financeiro_regras_recorrencia (
      escritorio_id, tipo_entidade, descricao, categoria, fornecedor,
      valor_atual, frequencia, dia_vencimento, vigencia_inicio, vigencia_fim,
      ativo, is_parcelamento, cartao_id, compra_id, processo_id
    ) VALUES (
      v_cartao.escritorio_id, 'cartao', p_descricao, p_categoria, p_fornecedor,
      v_valor_parcela, 'mensal', EXTRACT(DAY FROM p_data_compra)::INT,
      v_mes_ref, NULL,
      true, false, p_cartao_id, v_compra_id, p_processo_id
    ) RETURNING id INTO v_regra_id;

  END IF;

  RETURN v_compra_id;
END;
$function$;

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
  fatura_id uuid,
  regra_recorrencia_id uuid,
  periodo_referencia text,
  processo_id uuid
)
LANGUAGE plpgsql
AS $function$
DECLARE
  v_mes DATE := DATE_TRUNC('month', p_mes_referencia)::DATE;
BEGIN
  RETURN QUERY
  SELECT l.id, l.descricao, l.categoria, l.fornecedor, l.valor, l.tipo,
    l.parcela_numero, l.parcela_total, l.compra_id, l.data_compra,
    l.mes_referencia, l.recorrente_ativo, l.fatura_id,
    l.regra_recorrencia_id, l.periodo_referencia, l.processo_id
  FROM cartoes_credito_lancamentos l
  WHERE l.cartao_id = p_cartao_id AND l.mes_referencia = v_mes
  ORDER BY l.data_compra, l.descricao;
END;
$function$;
