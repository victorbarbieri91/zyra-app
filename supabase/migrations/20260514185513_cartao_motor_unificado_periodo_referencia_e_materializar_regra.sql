-- ============================================================================
-- Motor unificado de parcela/fixo para cartão de crédito
--
-- 1. Coluna periodo_referencia em cartoes_credito_lancamentos
-- 2. Backfill a partir de mes_referencia
-- 3. Unique index (regra_recorrencia_id, periodo_referencia)
-- 4. Estende materializar_regra para reconhecer tipo_entidade='cartao'
-- 5. Atualiza trigger_materializar_regra para acionar em cartão também
-- ============================================================================

ALTER TABLE cartoes_credito_lancamentos
  ADD COLUMN IF NOT EXISTS periodo_referencia text;

UPDATE cartoes_credito_lancamentos
   SET periodo_referencia = to_char(mes_referencia, 'YYYY-MM')
 WHERE periodo_referencia IS NULL
   AND regra_recorrencia_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cartao_lanc_regra_periodo
  ON cartoes_credito_lancamentos (regra_recorrencia_id, periodo_referencia)
  WHERE regra_recorrencia_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.materializar_regra(p_regra_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_regra RECORD;
  v_count integer := 0;
  v_mes date;
  v_mes_fim date;
  v_periodo text;
  v_meses_diff integer;
  v_parcela_num integer;
  v_data_venc date;
  v_ultimo_dia date;
  v_dia_vcto integer;
  v_desc text;
  v_rows integer;
BEGIN
  SELECT * INTO v_regra
    FROM financeiro_regras_recorrencia
   WHERE id = p_regra_id AND ativo = true;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  IF v_regra.tipo_entidade NOT IN ('despesa','receita','cartao') THEN
    RETURN 0;
  END IF;

  IF v_regra.is_parcelamento THEN
    v_mes_fim := COALESCE(
      v_regra.vigencia_fim,
      (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '12 months')::date
    );
  ELSE
    v_mes_fim := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '12 months')::date;
  END IF;

  v_mes := DATE_TRUNC('month', v_regra.vigencia_inicio)::date;

  WHILE v_mes <= v_mes_fim LOOP
    EXIT WHEN v_regra.vigencia_fim IS NOT NULL AND v_mes > v_regra.vigencia_fim;

    v_periodo := to_char(v_mes, 'YYYY-MM');
    v_meses_diff := (EXTRACT(YEAR FROM v_mes)::int * 12 + EXTRACT(MONTH FROM v_mes)::int)
                  - (EXTRACT(YEAR FROM v_regra.vigencia_inicio)::int * 12
                     + EXTRACT(MONTH FROM v_regra.vigencia_inicio)::int);

    IF v_regra.is_parcelamento THEN
      v_parcela_num := COALESCE(v_regra.parcela_inicio, 1) + v_meses_diff;
      EXIT WHEN v_parcela_num > v_regra.parcela_total;
      v_desc := v_regra.descricao || ' (Parcela ' || v_parcela_num || '/' || v_regra.parcela_total || ')';
    ELSE
      v_desc := v_regra.descricao || ' (Fixa ' || v_regra.frequencia::text || ')';
    END IF;

    v_ultimo_dia := (v_mes + INTERVAL '1 month - 1 day')::date;
    v_dia_vcto := LEAST(v_regra.dia_vencimento, EXTRACT(DAY FROM v_ultimo_dia)::int);
    v_data_venc := make_date(
      EXTRACT(YEAR FROM v_mes)::int,
      EXTRACT(MONTH FROM v_mes)::int,
      v_dia_vcto
    );

    IF v_regra.tipo_entidade = 'despesa' THEN
      INSERT INTO financeiro_despesas (
        escritorio_id, categoria, descricao, valor,
        data_vencimento, status, fornecedor,
        conta_bancaria_id, processo_id, cliente_id, consulta_id,
        regra_recorrencia_id, periodo_referencia, numero_parcela
      ) VALUES (
        v_regra.escritorio_id,
        v_regra.categoria::despesa_categoria_enum,
        v_desc,
        v_regra.valor_atual,
        v_data_venc,
        'pendente'::despesa_status_enum,
        v_regra.fornecedor,
        v_regra.conta_bancaria_id,
        v_regra.processo_id,
        v_regra.cliente_id,
        v_regra.consulta_id,
        v_regra.id,
        v_periodo,
        CASE WHEN v_regra.is_parcelamento THEN v_parcela_num ELSE NULL END
      )
      ON CONFLICT (regra_recorrencia_id, periodo_referencia) DO NOTHING;

      GET DIAGNOSTICS v_rows = ROW_COUNT;
      v_count := v_count + v_rows;

    ELSIF v_regra.tipo_entidade = 'receita' THEN
      INSERT INTO financeiro_receitas (
        escritorio_id, tipo, categoria, descricao, valor,
        data_competencia, data_vencimento, status,
        cliente_id, processo_id, consulta_id, contrato_id,
        conta_bancaria_id, regra_recorrencia_id, periodo_referencia
      ) VALUES (
        v_regra.escritorio_id,
        'avulso'::receita_tipo_enum,
        v_regra.categoria::receita_categoria_enum,
        v_desc,
        v_regra.valor_atual,
        v_data_venc,
        v_data_venc,
        'pendente'::receita_status_enum,
        v_regra.cliente_id,
        v_regra.processo_id,
        v_regra.consulta_id,
        v_regra.contrato_id,
        v_regra.conta_bancaria_id,
        v_regra.id,
        v_periodo
      )
      ON CONFLICT (regra_recorrencia_id, periodo_referencia) DO NOTHING;

      GET DIAGNOSTICS v_rows = ROW_COUNT;
      v_count := v_count + v_rows;

    ELSIF v_regra.tipo_entidade = 'cartao' THEN
      INSERT INTO cartoes_credito_lancamentos (
        escritorio_id, cartao_id, descricao, categoria, fornecedor, valor,
        tipo, parcela_numero, parcela_total, compra_id,
        data_compra, mes_referencia, recorrente_ativo,
        regra_recorrencia_id, processo_id, periodo_referencia,
        importado_de_fatura
      ) VALUES (
        v_regra.escritorio_id,
        v_regra.cartao_id,
        v_regra.descricao,
        v_regra.categoria,
        v_regra.fornecedor,
        v_regra.valor_atual,
        CASE WHEN v_regra.is_parcelamento THEN 'parcelada' ELSE 'recorrente' END,
        CASE WHEN v_regra.is_parcelamento THEN v_parcela_num ELSE 1 END,
        CASE WHEN v_regra.is_parcelamento THEN v_regra.parcela_total ELSE 1 END,
        COALESCE(v_regra.compra_id, gen_random_uuid()),
        v_regra.vigencia_inicio,
        v_mes,
        NOT v_regra.is_parcelamento,
        v_regra.id,
        v_regra.processo_id,
        v_periodo,
        false
      )
      ON CONFLICT (regra_recorrencia_id, periodo_referencia) DO NOTHING;

      GET DIAGNOSTICS v_rows = ROW_COUNT;
      v_count := v_count + v_rows;
    END IF;

    v_mes := v_mes + INTERVAL '1 month';
  END LOOP;

  RETURN v_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trigger_materializar_regra()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.ativo = true AND NEW.tipo_entidade IN ('despesa','receita','cartao') THEN
    PERFORM public.materializar_regra(NEW.id);
  END IF;
  RETURN NEW;
END;
$function$;
