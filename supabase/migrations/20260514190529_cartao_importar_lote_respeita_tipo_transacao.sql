-- importar_lancamentos_cartao_em_lote agora respeita tipo_transacao:
-- créditos (estornos) entram com valor negativo. Compatível com payload
-- antigo (sem tipo_transacao) — default 'debito'.

CREATE OR REPLACE FUNCTION public.importar_lancamentos_cartao_em_lote(
  p_cartao_id uuid,
  p_mes_referencia date,
  p_transacoes jsonb
)
RETURNS TABLE(total_importados integer, lancamento_ids uuid[])
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_escritorio_id UUID;
  v_transacao JSONB;
  v_compra_id UUID;
  v_mes_ref DATE;
  v_lancamento_id UUID;
  v_ids UUID[] := '{}';
  v_count INTEGER := 0;
  v_tipo TEXT;
  v_parcela_numero INTEGER;
  v_parcela_total INTEGER;
  v_regra_id UUID;
  v_tipo_transacao TEXT;
  v_valor_raw NUMERIC;
  v_valor_final NUMERIC;
BEGIN
  SELECT escritorio_id INTO v_escritorio_id
  FROM cartoes_credito
  WHERE id = p_cartao_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cartão não encontrado: %', p_cartao_id;
  END IF;

  v_mes_ref := date_trunc('month', p_mes_referencia)::DATE;

  FOR v_transacao IN SELECT * FROM jsonb_array_elements(p_transacoes)
  LOOP
    v_compra_id := gen_random_uuid();

    v_tipo := COALESCE(v_transacao->>'tipo', 'unica');
    IF v_tipo NOT IN ('unica', 'parcelada', 'recorrente') THEN
      v_tipo := 'unica';
    END IF;

    v_parcela_numero := COALESCE((v_transacao->>'parcela_numero')::INTEGER, 1);
    v_parcela_total  := COALESCE((v_transacao->>'parcela_total')::INTEGER, 1);
    v_regra_id       := (v_transacao->>'regra_recorrencia_id')::UUID;
    v_tipo_transacao := LOWER(COALESCE(v_transacao->>'tipo_transacao', 'debito'));

    IF v_parcela_numero < 1 THEN v_parcela_numero := 1; END IF;
    IF v_parcela_total  < 1 THEN v_parcela_total  := 1; END IF;
    IF v_tipo = 'unica' THEN
      v_parcela_numero := 1;
      v_parcela_total  := 1;
    END IF;

    v_valor_raw := (v_transacao->>'valor')::NUMERIC;

    IF v_tipo_transacao = 'credito' THEN
      v_valor_final := -ABS(v_valor_raw);
    ELSE
      v_valor_final := ABS(v_valor_raw);
    END IF;

    INSERT INTO cartoes_credito_lancamentos (
      escritorio_id, cartao_id, descricao, categoria, fornecedor, valor,
      tipo, parcela_numero, parcela_total, compra_id,
      data_compra, mes_referencia, importado_de_fatura,
      recorrente_ativo, regra_recorrencia_id, periodo_referencia
    ) VALUES (
      v_escritorio_id,
      p_cartao_id,
      v_transacao->>'descricao',
      v_transacao->>'categoria',
      NULL,
      v_valor_final,
      v_tipo,
      v_parcela_numero,
      v_parcela_total,
      v_compra_id,
      (v_transacao->>'data_compra')::DATE,
      v_mes_ref,
      true,
      CASE WHEN v_tipo = 'recorrente' THEN true ELSE false END,
      v_regra_id,
      to_char(v_mes_ref, 'YYYY-MM')
    )
    RETURNING id INTO v_lancamento_id;

    v_ids := v_ids || v_lancamento_id;
    v_count := v_count + 1;
  END LOOP;

  RETURN QUERY SELECT v_count, v_ids;
END;
$function$;
