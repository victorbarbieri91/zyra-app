-- ============================================================
-- FIX: gerar_fatura_v3 - Remove referência a colunas inexistentes
-- (valor_calculado, total_honorarios, total_horas, soma_horas)
-- ============================================================

CREATE OR REPLACE FUNCTION gerar_fatura_v3(
  p_escritorio_id UUID,
  p_cliente_id UUID,
  p_honorarios_ids UUID[] DEFAULT NULL,
  p_timesheet_ids UUID[] DEFAULT NULL,
  p_fechamentos_ids UUID[] DEFAULT NULL,
  p_data_emissao DATE DEFAULT CURRENT_DATE,
  p_data_vencimento DATE DEFAULT NULL,
  p_observacoes TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_fatura_id UUID;
  v_numero_fatura TEXT;
  v_contador INTEGER;
  v_valor_total NUMERIC := 0;
  v_receita RECORD;
  v_timesheet RECORD;
  v_fechamento RECORD;
  v_valor_hora NUMERIC;
  v_itens_jsonb JSONB := '[]'::jsonb;
  v_item JSONB;
  v_valor_item NUMERIC;
BEGIN
  IF p_data_vencimento IS NULL THEN
    p_data_vencimento := p_data_emissao + INTERVAL '30 days';
  END IF;

  IF (p_honorarios_ids IS NULL OR array_length(p_honorarios_ids, 1) IS NULL)
     AND (p_timesheet_ids IS NULL OR array_length(p_timesheet_ids, 1) IS NULL)
     AND (p_fechamentos_ids IS NULL OR array_length(p_fechamentos_ids, 1) IS NULL) THEN
    RAISE EXCEPTION 'Fatura deve conter pelo menos um item (receita, timesheet ou pasta)';
  END IF;

  SELECT COALESCE(MAX(CAST(SUBSTRING(numero_fatura FROM 'FAT-\d{4}-(\d+)') AS INTEGER)), 0) + 1
  INTO v_contador
  FROM financeiro_faturamento_faturas
  WHERE escritorio_id = p_escritorio_id
  AND numero_fatura LIKE 'FAT-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-%';

  v_numero_fatura := 'FAT-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(v_contador::TEXT, 3, '0');

  INSERT INTO financeiro_faturamento_faturas (
    escritorio_id, cliente_id, numero_fatura, data_emissao, data_vencimento,
    status, observacoes, gerada_automaticamente, valor_total, itens
  ) VALUES (
    p_escritorio_id, p_cliente_id, v_numero_fatura, p_data_emissao, p_data_vencimento,
    'emitida', p_observacoes, false, 0, '[]'::jsonb
  ) RETURNING id INTO v_fatura_id;

  -- Processar receitas (honorários)
  IF p_honorarios_ids IS NOT NULL AND array_length(p_honorarios_ids, 1) > 0 THEN
    FOR v_receita IN
      SELECT r.id, r.descricao, r.valor, r.tipo, r.processo_id, p.numero_cnj as processo_numero,
             p.numero_pasta as processo_pasta, CONCAT(p.autor, ' x ', p.reu) as partes_resumo
      FROM financeiro_receitas r
      LEFT JOIN processos_processos p ON p.id = r.processo_id
      WHERE r.id = ANY(p_honorarios_ids) AND r.cliente_id = p_cliente_id AND r.status = 'pendente' AND r.fatura_id IS NULL
    LOOP
      v_item := jsonb_build_object('tipo', 'honorario', 'descricao', v_receita.descricao, 'valor', v_receita.valor,
        'processo_id', v_receita.processo_id, 'processo_numero', v_receita.processo_numero,
        'processo_pasta', v_receita.processo_pasta, 'partes_resumo', v_receita.partes_resumo, 'referencia_id', v_receita.id);
      v_itens_jsonb := v_itens_jsonb || v_item;
      v_valor_total := v_valor_total + v_receita.valor;

      UPDATE financeiro_receitas SET fatura_id = v_fatura_id, updated_at = NOW() WHERE id = v_receita.id;
    END LOOP;
  END IF;

  -- Processar timesheet
  IF p_timesheet_ids IS NOT NULL AND array_length(p_timesheet_ids, 1) > 0 THEN
    -- Buscar valor_hora do contrato do cliente (ou usar default 400)
    SELECT COALESCE((SELECT (c.config->>'valor_hora')::numeric FROM financeiro_contratos_honorarios c
      WHERE c.cliente_id = p_cliente_id AND c.ativo = true AND c.config->>'valor_hora' IS NOT NULL LIMIT 1), 400)
    INTO v_valor_hora;

    FOR v_timesheet IN
      SELECT t.id, t.atividade as descricao, t.processo_id, t.consulta_id, t.horas,
             p.numero_cnj as processo_numero, p.numero_pasta as processo_pasta, CONCAT(p.autor, ' x ', p.reu) as partes_resumo
      FROM financeiro_timesheet t
      LEFT JOIN processos_processos p ON p.id = t.processo_id
      WHERE t.id = ANY(p_timesheet_ids) AND t.aprovado = true AND NOT t.faturado AND t.fatura_id IS NULL
    LOOP
      -- Calcular valor: horas * valor_hora
      v_valor_item := v_timesheet.horas * v_valor_hora;

      v_item := jsonb_build_object('tipo', 'timesheet', 'descricao', v_timesheet.descricao,
        'valor', v_valor_item,
        'horas', v_timesheet.horas, 'valor_hora', v_valor_hora, 'processo_id', v_timesheet.processo_id,
        'consulta_id', v_timesheet.consulta_id, 'processo_numero', v_timesheet.processo_numero,
        'processo_pasta', v_timesheet.processo_pasta, 'partes_resumo', v_timesheet.partes_resumo, 'timesheet_id', v_timesheet.id);
      v_itens_jsonb := v_itens_jsonb || v_item;
      v_valor_total := v_valor_total + v_valor_item;

      UPDATE financeiro_timesheet SET faturado = true, fatura_id = v_fatura_id, faturado_em = NOW() WHERE id = v_timesheet.id;
    END LOOP;
  END IF;

  -- Processar fechamentos de pasta
  IF p_fechamentos_ids IS NOT NULL AND array_length(p_fechamentos_ids, 1) > 0 THEN
    FOR v_fechamento IN
      SELECT fp.id, fp.competencia, fp.qtd_processos, fp.valor_unitario, fp.valor_total, fp.processos
      FROM financeiro_fechamentos_pasta fp
      WHERE fp.id = ANY(p_fechamentos_ids) AND fp.cliente_id = p_cliente_id AND fp.status = 'aprovado' AND fp.fatura_id IS NULL
    LOOP
      v_item := jsonb_build_object('tipo', 'pasta', 'descricao', 'Honorários por pasta - ' || TO_CHAR(v_fechamento.competencia, 'MM/YYYY'),
        'valor', v_fechamento.valor_total, 'competencia', v_fechamento.competencia, 'qtd_processos', v_fechamento.qtd_processos,
        'valor_unitario', v_fechamento.valor_unitario, 'processos', v_fechamento.processos, 'fechamento_id', v_fechamento.id);
      v_itens_jsonb := v_itens_jsonb || v_item;
      v_valor_total := v_valor_total + v_fechamento.valor_total;

      UPDATE financeiro_fechamentos_pasta SET status = 'faturado', fatura_id = v_fatura_id, faturado_em = NOW() WHERE id = v_fechamento.id;
    END LOOP;
  END IF;

  -- Atualizar fatura com valor total e itens
  UPDATE financeiro_faturamento_faturas
  SET valor_total = v_valor_total, itens = v_itens_jsonb, updated_at = NOW()
  WHERE id = v_fatura_id;

  IF p_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, tipo, titulo, mensagem, link, lida)
    VALUES (p_user_id, 'fatura_gerada', 'Fatura Gerada',
      'Fatura ' || v_numero_fatura || ' gerada com sucesso. Valor: R$ ' || TO_CHAR(v_valor_total, 'FM999G999G990D00'),
      '/dashboard/financeiro/faturamento', false);
  END IF;

  RETURN v_fatura_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION gerar_fatura_v3 IS 'Gera fatura consolidada com honorários, timesheet E fechamentos por pasta';
