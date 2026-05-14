-- Estende atualizar_regra_em_serie e excluir_regra_em_serie para
-- reconhecer tipo_entidade='cartao'.
--
-- "Pendente" em cartão = lançamento cuja fatura ainda não está 'paga'
-- (ou que não está vinculado a fatura). Lançamentos de faturas pagas
-- NUNCA são tocados (preserva histórico).

CREATE OR REPLACE FUNCTION public.atualizar_regra_em_serie(
  p_regra_id uuid,
  p_descricao text DEFAULT NULL::text,
  p_valor numeric DEFAULT NULL::numeric,
  p_categoria text DEFAULT NULL::text,
  p_fornecedor text DEFAULT NULL::text,
  p_dia_vencimento integer DEFAULT NULL::integer,
  p_conta_bancaria_id uuid DEFAULT NULL::uuid,
  p_observacoes text DEFAULT NULL::text,
  p_data_corte date DEFAULT NULL::date,
  p_escritorio_id uuid DEFAULT NULL::uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_regra RECORD;
  v_count integer := 0;
  v_descricao_limpa text;
  v_grupo_atual uuid;
  v_grupo_novo uuid;
BEGIN
  SELECT * INTO v_regra FROM financeiro_regras_recorrencia WHERE id = p_regra_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Regra de recorrência não encontrada: %', p_regra_id;
  END IF;

  IF p_escritorio_id IS NOT NULL AND p_escritorio_id <> v_regra.escritorio_id THEN
    IF NOT public.user_pode_gerenciar_financeiro(p_escritorio_id) THEN
      RAISE EXCEPTION 'Sem permissão para mover lançamento para o escritório destino';
    END IF;

    SELECT COALESCE(grupo_id, id) INTO v_grupo_atual FROM escritorios WHERE id = v_regra.escritorio_id;
    SELECT COALESCE(grupo_id, id) INTO v_grupo_novo  FROM escritorios WHERE id = p_escritorio_id;

    IF v_grupo_atual IS DISTINCT FROM v_grupo_novo THEN
      RAISE EXCEPTION 'Escritório destino não pertence ao mesmo grupo do escritório atual';
    END IF;
  END IF;

  IF p_descricao IS NOT NULL THEN
    v_descricao_limpa := regexp_replace(
      p_descricao,
      '\s*\((Parcela\s+\d+/\d+|Fixa\s+(mensal|bimestral|trimestral|semestral|anual))\)\s*$',
      '',
      'i'
    );
  END IF;

  UPDATE financeiro_regras_recorrencia
     SET descricao         = COALESCE(v_descricao_limpa, descricao),
         valor_atual       = COALESCE(p_valor, valor_atual),
         categoria         = COALESCE(p_categoria, categoria),
         fornecedor        = COALESCE(p_fornecedor, fornecedor),
         dia_vencimento    = COALESCE(p_dia_vencimento, dia_vencimento),
         conta_bancaria_id = COALESCE(p_conta_bancaria_id, conta_bancaria_id),
         escritorio_id     = COALESCE(p_escritorio_id, escritorio_id),
         updated_at        = now()
   WHERE id = p_regra_id;

  SELECT * INTO v_regra FROM financeiro_regras_recorrencia WHERE id = p_regra_id;

  IF v_regra.tipo_entidade = 'despesa' THEN
    UPDATE financeiro_despesas
       SET descricao = CASE
             WHEN v_regra.is_parcelamento AND numero_parcela IS NOT NULL
                  AND v_regra.parcela_total IS NOT NULL THEN
               v_regra.descricao || ' (Parcela ' || numero_parcela || '/' || v_regra.parcela_total || ')'
             WHEN NOT v_regra.is_parcelamento THEN
               v_regra.descricao || ' (Fixa ' || v_regra.frequencia::text || ')'
             ELSE COALESCE(v_descricao_limpa, descricao)
           END,
           valor             = COALESCE(p_valor, valor),
           categoria         = COALESCE(p_categoria::despesa_categoria_enum, categoria),
           fornecedor        = COALESCE(p_fornecedor, fornecedor),
           conta_bancaria_id = COALESCE(p_conta_bancaria_id, conta_bancaria_id),
           escritorio_id     = COALESCE(p_escritorio_id, escritorio_id),
           data_vencimento   = CASE
             WHEN p_dia_vencimento IS NOT NULL THEN
               make_date(
                 EXTRACT(YEAR FROM data_vencimento)::int,
                 EXTRACT(MONTH FROM data_vencimento)::int,
                 LEAST(p_dia_vencimento,
                   EXTRACT(DAY FROM (date_trunc('month', data_vencimento) + interval '1 month - 1 day'))::int)
               )
             ELSE data_vencimento
           END,
           updated_at = now()
     WHERE regra_recorrencia_id = p_regra_id
       AND status IN ('pendente'::despesa_status_enum,
                      'agendado'::despesa_status_enum,
                      'liberado'::despesa_status_enum)
       AND (p_data_corte IS NULL OR data_vencimento >= p_data_corte);
    GET DIAGNOSTICS v_count = ROW_COUNT;

  ELSIF v_regra.tipo_entidade = 'receita' THEN
    UPDATE financeiro_receitas
       SET descricao = CASE
             WHEN NOT v_regra.is_parcelamento THEN
               v_regra.descricao || ' (Fixa ' || v_regra.frequencia::text || ')'
             ELSE COALESCE(v_descricao_limpa, descricao)
           END,
           valor             = COALESCE(p_valor, valor),
           categoria         = COALESCE(p_categoria::receita_categoria_enum, categoria),
           observacoes       = COALESCE(p_observacoes, observacoes),
           conta_bancaria_id = COALESCE(p_conta_bancaria_id, conta_bancaria_id),
           escritorio_id     = COALESCE(p_escritorio_id, escritorio_id),
           data_vencimento   = CASE
             WHEN p_dia_vencimento IS NOT NULL THEN
               make_date(
                 EXTRACT(YEAR FROM data_vencimento)::int,
                 EXTRACT(MONTH FROM data_vencimento)::int,
                 LEAST(p_dia_vencimento,
                   EXTRACT(DAY FROM (date_trunc('month', data_vencimento) + interval '1 month - 1 day'))::int)
               )
             ELSE data_vencimento
           END,
           updated_at = now()
     WHERE regra_recorrencia_id = p_regra_id
       AND status = 'pendente'::receita_status_enum
       AND (p_data_corte IS NULL OR data_vencimento >= p_data_corte);
    GET DIAGNOSTICS v_count = ROW_COUNT;

  ELSIF v_regra.tipo_entidade = 'cartao' THEN
    UPDATE cartoes_credito_lancamentos l
       SET descricao         = COALESCE(v_descricao_limpa, l.descricao),
           valor             = COALESCE(p_valor, l.valor),
           categoria         = COALESCE(p_categoria, l.categoria),
           fornecedor        = COALESCE(p_fornecedor, l.fornecedor),
           escritorio_id     = COALESCE(p_escritorio_id, l.escritorio_id),
           updated_at        = now()
     WHERE l.regra_recorrencia_id = p_regra_id
       AND NOT EXISTS (
         SELECT 1 FROM cartoes_credito_faturas f
          WHERE f.id = l.fatura_id AND f.status = 'paga'
       )
       AND (p_data_corte IS NULL OR l.mes_referencia >= p_data_corte);
    GET DIAGNOSTICS v_count = ROW_COUNT;
  END IF;

  IF v_regra.is_parcelamento THEN
    PERFORM public.recalcular_valor_total_parcelamento(p_regra_id);
  END IF;

  RETURN v_count;
END;
$function$;


CREATE OR REPLACE FUNCTION public.excluir_regra_em_serie(
  p_regra_id uuid,
  p_data_corte date DEFAULT NULL::date
)
RETURNS TABLE(regra_removida boolean, instancias_removidas integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_regra RECORD;
  v_count integer := 0;
  v_max_parcela integer;
  v_max_data date;
BEGIN
  SELECT * INTO v_regra FROM financeiro_regras_recorrencia WHERE id = p_regra_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0;
    RETURN;
  END IF;

  IF v_regra.tipo_entidade = 'despesa' THEN
    DELETE FROM financeiro_despesas
     WHERE regra_recorrencia_id = p_regra_id
       AND status IN ('pendente'::despesa_status_enum,
                      'agendado'::despesa_status_enum,
                      'liberado'::despesa_status_enum)
       AND (p_data_corte IS NULL OR data_vencimento >= p_data_corte);
    GET DIAGNOSTICS v_count = ROW_COUNT;

  ELSIF v_regra.tipo_entidade = 'receita' THEN
    DELETE FROM financeiro_receitas
     WHERE regra_recorrencia_id = p_regra_id
       AND status = 'pendente'::receita_status_enum
       AND (p_data_corte IS NULL OR data_vencimento >= p_data_corte);
    GET DIAGNOSTICS v_count = ROW_COUNT;

  ELSIF v_regra.tipo_entidade = 'cartao' THEN
    DELETE FROM cartoes_credito_lancamentos l
     WHERE l.regra_recorrencia_id = p_regra_id
       AND NOT EXISTS (
         SELECT 1 FROM cartoes_credito_faturas f
          WHERE f.id = l.fatura_id AND f.status = 'paga'
       )
       AND (p_data_corte IS NULL OR l.mes_referencia >= p_data_corte);
    GET DIAGNOSTICS v_count = ROW_COUNT;
  END IF;

  IF p_data_corte IS NULL THEN
    UPDATE financeiro_regras_recorrencia
       SET ativo = false, updated_at = now()
     WHERE id = p_regra_id;
  ELSE
    IF v_regra.is_parcelamento THEN
      IF v_regra.tipo_entidade = 'despesa' THEN
        SELECT MAX(numero_parcela), MAX(data_vencimento)
          INTO v_max_parcela, v_max_data
          FROM financeiro_despesas
         WHERE regra_recorrencia_id = p_regra_id;
      ELSIF v_regra.tipo_entidade = 'receita' THEN
        SELECT COUNT(*)::int, MAX(data_vencimento)
          INTO v_max_parcela, v_max_data
          FROM financeiro_receitas
         WHERE regra_recorrencia_id = p_regra_id;
      ELSIF v_regra.tipo_entidade = 'cartao' THEN
        SELECT MAX(parcela_numero), MAX(mes_referencia)
          INTO v_max_parcela, v_max_data
          FROM cartoes_credito_lancamentos
         WHERE regra_recorrencia_id = p_regra_id;
      END IF;

      UPDATE financeiro_regras_recorrencia
         SET parcela_total = COALESCE(v_max_parcela, 0),
             vigencia_fim  = v_max_data,
             updated_at    = now()
       WHERE id = p_regra_id;

      PERFORM public.recalcular_valor_total_parcelamento(p_regra_id);
    ELSE
      UPDATE financeiro_regras_recorrencia
         SET vigencia_fim = (p_data_corte - INTERVAL '1 day')::date,
             updated_at   = now()
       WHERE id = p_regra_id;
    END IF;
  END IF;

  RETURN QUERY SELECT (p_data_corte IS NULL), v_count;
END;
$function$;
