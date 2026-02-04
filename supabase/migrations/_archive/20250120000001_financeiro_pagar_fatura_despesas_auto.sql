-- =====================================================
-- MÓDULO FINANCEIRO - PAGAMENTO DE FATURA E DESPESAS AUTOMÁTICAS
-- =====================================================
-- Migration: Corrige fluxo financeiro end-to-end
-- - RPC pagar_fatura: registra pagamento e lança na conta bancária
-- - Atualiza gerar_fatura_v2: inclui despesas reembolsáveis automaticamente
-- =====================================================

-- =====================================================
-- FUNÇÃO: PAGAR FATURA
-- =====================================================
-- Registra pagamento de fatura e lança automaticamente na conta bancária

CREATE OR REPLACE FUNCTION pagar_fatura(
  p_fatura_id UUID,
  p_valor_pago NUMERIC,
  p_data_pagamento DATE,
  p_forma_pagamento TEXT,
  p_conta_bancaria_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_comprovante_url TEXT DEFAULT NULL,
  p_observacoes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_fatura RECORD;
  v_pagamento_id UUID;
  v_lancamento_id UUID;
BEGIN
  -- Buscar fatura
  SELECT * INTO v_fatura
  FROM financeiro_faturamento_faturas
  WHERE id = p_fatura_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fatura não encontrada';
  END IF;

  -- Validar status (apenas faturas emitidas, enviadas ou atrasadas podem ser pagas)
  IF v_fatura.status NOT IN ('emitida', 'enviada', 'atrasada') THEN
    RAISE EXCEPTION 'Apenas faturas emitidas, enviadas ou atrasadas podem ser pagas. Status atual: %', v_fatura.status;
  END IF;

  -- Validar valor
  IF p_valor_pago <= 0 THEN
    RAISE EXCEPTION 'Valor do pagamento deve ser maior que zero';
  END IF;

  -- Registrar pagamento na tabela de pagamentos
  INSERT INTO financeiro_contas_pagamentos (
    escritorio_id,
    tipo_pagamento,
    valor,
    data_pagamento,
    forma_pagamento,
    conta_bancaria_id,
    fatura_id,
    comprovante_url,
    observacoes
  ) VALUES (
    v_fatura.escritorio_id,
    'recebimento',
    p_valor_pago,
    p_data_pagamento,
    p_forma_pagamento,
    p_conta_bancaria_id,
    p_fatura_id,
    p_comprovante_url,
    p_observacoes
  ) RETURNING id INTO v_pagamento_id;

  -- Atualizar status da fatura
  UPDATE financeiro_faturamento_faturas
  SET status = 'paga',
      paga_em = p_data_pagamento,
      updated_at = NOW()
  WHERE id = p_fatura_id;

  -- Se conta bancária foi informada, lançar entrada automaticamente
  IF p_conta_bancaria_id IS NOT NULL THEN
    -- Criar lançamento na conta bancária
    INSERT INTO financeiro_contas_lancamentos (
      conta_bancaria_id,
      tipo,
      valor,
      data_lancamento,
      descricao,
      categoria,
      origem_tipo,
      origem_id,
      saldo_apos_lancamento
    ) VALUES (
      p_conta_bancaria_id,
      'entrada',
      p_valor_pago,
      p_data_pagamento,
      'Recebimento - Fatura ' || v_fatura.numero_fatura,
      'receita_honorarios',
      'pagamento',
      v_pagamento_id,
      (SELECT saldo_atual + p_valor_pago FROM financeiro_contas_bancarias WHERE id = p_conta_bancaria_id)
    ) RETURNING id INTO v_lancamento_id;

    -- Atualizar saldo da conta bancária
    UPDATE financeiro_contas_bancarias
    SET saldo_atual = saldo_atual + p_valor_pago,
        updated_at = NOW()
    WHERE id = p_conta_bancaria_id;
  END IF;

  -- Atualizar honorários vinculados para status 'pago'
  UPDATE financeiro_honorarios
  SET status = 'pago',
      updated_at = NOW()
  WHERE fatura_id = p_fatura_id
    AND status = 'faturado';

  -- Notificar usuário
  IF p_user_id IS NOT NULL THEN
    INSERT INTO notifications (
      user_id,
      tipo,
      titulo,
      mensagem,
      link,
      lida
    ) VALUES (
      p_user_id,
      'fatura_paga',
      'Fatura Paga',
      'Fatura ' || v_fatura.numero_fatura || ' foi paga. Valor: R$ ' || TO_CHAR(p_valor_pago, 'FM999G999G990D00'),
      '/dashboard/financeiro/faturamento',
      false
    );
  END IF;

  RETURN v_pagamento_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION pagar_fatura IS 'Registra pagamento de fatura e lança automaticamente na conta bancária';

-- =====================================================
-- ATUALIZAR FUNÇÃO: GERAR FATURA V2 COM DESPESAS
-- =====================================================
-- Inclui despesas reembolsáveis pagas automaticamente

CREATE OR REPLACE FUNCTION gerar_fatura_v2(
  p_escritorio_id UUID,
  p_cliente_id UUID,
  p_honorarios_ids UUID[] DEFAULT NULL,
  p_timesheet_ids UUID[] DEFAULT NULL,
  p_data_emissao DATE DEFAULT CURRENT_DATE,
  p_data_vencimento DATE DEFAULT NULL,
  p_observacoes TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_incluir_despesas_reembolsaveis BOOLEAN DEFAULT true
) RETURNS UUID AS $$
DECLARE
  v_fatura_id UUID;
  v_numero_fatura TEXT;
  v_contador INTEGER;
  v_valor_total NUMERIC := 0;
  v_honorario RECORD;
  v_timesheet RECORD;
  v_despesa RECORD;
  v_valor_hora NUMERIC;
BEGIN
  -- Validações
  IF p_data_vencimento IS NULL THEN
    p_data_vencimento := p_data_emissao + INTERVAL '30 days';
  END IF;

  IF (p_honorarios_ids IS NULL OR array_length(p_honorarios_ids, 1) IS NULL)
     AND (p_timesheet_ids IS NULL OR array_length(p_timesheet_ids, 1) IS NULL) THEN
    RAISE EXCEPTION 'Fatura deve conter pelo menos um item (honorário ou timesheet)';
  END IF;

  -- Gerar número de fatura sequencial
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero_fatura FROM 'FAT-\d{4}-(\d+)') AS INTEGER)), 0) + 1
  INTO v_contador
  FROM financeiro_faturamento_faturas
  WHERE escritorio_id = p_escritorio_id
  AND numero_fatura LIKE 'FAT-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-%';

  v_numero_fatura := 'FAT-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(v_contador::TEXT, 3, '0');

  -- Criar fatura
  INSERT INTO financeiro_faturamento_faturas (
    escritorio_id,
    cliente_id,
    numero_fatura,
    data_emissao,
    data_vencimento,
    status,
    observacoes,
    gerada_automaticamente,
    valor_total
  ) VALUES (
    p_escritorio_id,
    p_cliente_id,
    v_numero_fatura,
    p_data_emissao,
    p_data_vencimento,
    'emitida',
    p_observacoes,
    false,
    0
  ) RETURNING id INTO v_fatura_id;

  -- Adicionar honorários selecionados
  IF p_honorarios_ids IS NOT NULL AND array_length(p_honorarios_ids, 1) > 0 THEN
    FOR v_honorario IN
      SELECT
        h.id,
        h.descricao,
        h.valor_total,
        h.tipo_honorario,
        h.processo_id,
        h.consulta_id
      FROM financeiro_honorarios h
      WHERE h.id = ANY(p_honorarios_ids)
        AND h.cliente_id = p_cliente_id
        AND h.status = 'aprovado'
        AND h.fatura_id IS NULL
    LOOP
      INSERT INTO financeiro_faturamento_itens (
        fatura_id,
        tipo_item,
        descricao,
        processo_id,
        consulta_id,
        quantidade,
        valor_unitario,
        valor_total,
        referencia_id
      ) VALUES (
        v_fatura_id,
        'honorario',
        v_honorario.descricao,
        v_honorario.processo_id,
        v_honorario.consulta_id,
        1,
        v_honorario.valor_total,
        v_honorario.valor_total,
        v_honorario.id
      );

      v_valor_total := v_valor_total + v_honorario.valor_total;

      -- Atualizar honorário
      UPDATE financeiro_honorarios
      SET status = 'faturado',
          fatura_id = v_fatura_id,
          updated_at = NOW()
      WHERE id = v_honorario.id;
    END LOOP;
  END IF;

  -- Adicionar timesheet selecionado
  IF p_timesheet_ids IS NOT NULL AND array_length(p_timesheet_ids, 1) > 0 THEN
    -- Buscar valor hora do contrato do cliente
    SELECT COALESCE(
      (SELECT ch.valor_hora
       FROM financeiro_contratos_honorarios_config ch
       JOIN financeiro_contratos_honorarios cont ON cont.id = ch.contrato_id
       WHERE cont.cliente_id = p_cliente_id
       AND ch.tipo_config = 'hora'
       AND cont.ativo = true
       LIMIT 1),
      400 -- Valor padrão se não houver contrato
    ) INTO v_valor_hora;

    -- Agrupar por atividade
    FOR v_timesheet IN
      SELECT
        t.atividade,
        t.processo_id,
        t.consulta_id,
        SUM(t.horas) AS total_horas,
        array_agg(t.id) AS ids
      FROM financeiro_timesheet t
      WHERE t.id = ANY(p_timesheet_ids)
        AND t.aprovado = true
        AND NOT t.faturado
        AND t.fatura_id IS NULL
      GROUP BY t.atividade, t.processo_id, t.consulta_id
    LOOP
      INSERT INTO financeiro_faturamento_itens (
        fatura_id,
        tipo_item,
        descricao,
        processo_id,
        consulta_id,
        quantidade,
        valor_unitario,
        valor_total,
        timesheet_ids
      ) VALUES (
        v_fatura_id,
        'timesheet',
        v_timesheet.atividade,
        v_timesheet.processo_id,
        v_timesheet.consulta_id,
        v_timesheet.total_horas,
        v_valor_hora,
        v_timesheet.total_horas * v_valor_hora,
        to_jsonb(v_timesheet.ids)
      );

      v_valor_total := v_valor_total + (v_timesheet.total_horas * v_valor_hora);

      -- Marcar timesheet como faturado
      UPDATE financeiro_timesheet
      SET faturado = true,
          fatura_id = v_fatura_id,
          faturado_em = NOW()
      WHERE id = ANY(v_timesheet.ids);
    END LOOP;
  END IF;

  -- =====================================================
  -- NOVO: Incluir despesas reembolsáveis automaticamente
  -- =====================================================
  IF p_incluir_despesas_reembolsaveis THEN
    FOR v_despesa IN
      SELECT
        d.id,
        d.descricao,
        d.valor,
        d.categoria,
        d.processo_id,
        d.consulta_id
      FROM financeiro_despesas d
      WHERE d.escritorio_id = p_escritorio_id
        AND d.reembolsavel = true
        AND d.status = 'pago'
        AND (d.faturado = false OR d.faturado IS NULL)
        AND d.fatura_id IS NULL
        -- Despesa deve estar vinculada a um processo do cliente
        AND (
          d.processo_id IN (
            SELECT p.id FROM processos_processos p WHERE p.cliente_id = p_cliente_id
          )
          OR d.consulta_id IN (
            SELECT c.id FROM consultivo_consultas c WHERE c.cliente_id = p_cliente_id
          )
        )
    LOOP
      INSERT INTO financeiro_faturamento_itens (
        fatura_id,
        tipo_item,
        descricao,
        processo_id,
        consulta_id,
        quantidade,
        valor_unitario,
        valor_total,
        referencia_id
      ) VALUES (
        v_fatura_id,
        'despesa',
        'Reembolso: ' || v_despesa.descricao,
        v_despesa.processo_id,
        v_despesa.consulta_id,
        1,
        v_despesa.valor,
        v_despesa.valor,
        v_despesa.id
      );

      v_valor_total := v_valor_total + v_despesa.valor;

      -- Marcar despesa como faturada
      UPDATE financeiro_despesas
      SET faturado = true,
          fatura_id = v_fatura_id,
          updated_at = NOW()
      WHERE id = v_despesa.id;
    END LOOP;
  END IF;

  -- Atualizar valor total da fatura
  UPDATE financeiro_faturamento_faturas
  SET valor_total = v_valor_total,
      updated_at = NOW()
  WHERE id = v_fatura_id;

  -- Notificar usuário
  IF p_user_id IS NOT NULL THEN
    INSERT INTO notifications (
      user_id,
      tipo,
      titulo,
      mensagem,
      link,
      lida
    ) VALUES (
      p_user_id,
      'fatura_gerada',
      'Fatura Gerada',
      'Fatura ' || v_numero_fatura || ' gerada com sucesso. Valor: R$ ' || TO_CHAR(v_valor_total, 'FM999G999G990D00'),
      '/dashboard/financeiro/faturamento',
      false
    );
  END IF;

  RETURN v_fatura_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION gerar_fatura_v2 IS 'Gera fatura consolidada com honorários, timesheet e despesas reembolsáveis automáticas';

-- =====================================================
-- VIEW: DESPESAS REEMBOLSÁVEIS PENDENTES
-- =====================================================
-- Mostra despesas reembolsáveis pagas ainda não faturadas

CREATE OR REPLACE VIEW v_despesas_reembolsaveis_pendentes AS
SELECT
  d.id,
  d.escritorio_id,
  d.descricao,
  d.valor,
  d.categoria,
  d.data_pagamento,
  d.processo_id,
  d.consulta_id,
  p.numero_cnj AS processo_numero,
  p.cliente_id,
  c.nome_completo AS cliente_nome
FROM financeiro_despesas d
LEFT JOIN processos_processos p ON p.id = d.processo_id
LEFT JOIN crm_pessoas c ON c.id = p.cliente_id
WHERE d.reembolsavel = true
  AND d.status = 'pago'
  AND (d.faturado = false OR d.faturado IS NULL)
  AND d.fatura_id IS NULL
ORDER BY d.data_pagamento DESC;

COMMENT ON VIEW v_despesas_reembolsaveis_pendentes IS 'Despesas reembolsáveis pagas aguardando faturamento';

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
GRANT EXECUTE ON FUNCTION pagar_fatura TO authenticated;
GRANT SELECT ON v_despesas_reembolsaveis_pendentes TO authenticated;
