-- =====================================================
-- MÓDULO FINANCEIRO - FUNÇÕES DE FATURAMENTO
-- =====================================================
-- Migration: Funções para gestão de faturamento
-- - gerar_fatura (criação inteligente de fatura)
-- - desmanchar_fatura (desfazer fatura)
-- - enviar_fatura (marcar fatura como enviada)
-- - pagar_fatura (registrar pagamento)
-- - agendar_faturamento_automatico (agendamento)
-- - cancelar_agendamento_faturamento
-- =====================================================

-- =====================================================
-- GERAR FATURA
-- =====================================================

CREATE OR REPLACE FUNCTION gerar_fatura(
  p_escritorio_id UUID,
  p_cliente_id UUID,
  p_data_emissao DATE DEFAULT CURRENT_DATE,
  p_data_vencimento DATE DEFAULT NULL,
  p_honorarios_ids UUID[] DEFAULT NULL,
  p_timesheet_ids UUID[] DEFAULT NULL,
  p_despesas_ids UUID[] DEFAULT NULL,
  p_parcelado BOOLEAN DEFAULT false,
  p_numero_parcelas INTEGER DEFAULT 1,
  p_observacoes TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_fatura_id UUID;
  v_numero_fatura TEXT;
  v_contador INTEGER;
  v_valor_total NUMERIC := 0;
  v_honorario_id UUID;
  v_timesheet_id UUID;
  v_despesa_id UUID;
  v_item RECORD;
  v_parcela_numero INTEGER;
  v_parcela_valor NUMERIC;
  v_parcela_vencimento DATE;
BEGIN
  -- Validações
  IF p_data_vencimento IS NULL THEN
    p_data_vencimento := p_data_emissao + INTERVAL '30 days';
  END IF;

  IF p_honorarios_ids IS NULL AND p_timesheet_ids IS NULL AND p_despesas_ids IS NULL THEN
    RAISE EXCEPTION 'Fatura deve conter pelo menos um item (honorário, timesheet ou despesa)';
  END IF;

  -- Gerar número de fatura sequencial
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero_fatura FROM 'FAT-\d{4}-(\d+)') AS INTEGER)), 0) + 1
  INTO v_contador
  FROM faturas
  WHERE escritorio_id = p_escritorio_id
  AND numero_fatura LIKE 'FAT-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-%';

  v_numero_fatura := 'FAT-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(v_contador::TEXT, 3, '0');

  -- Criar fatura
  INSERT INTO faturas (
    escritorio_id,
    cliente_id,
    numero_fatura,
    data_emissao,
    data_vencimento,
    status,
    parcelado,
    numero_parcelas,
    observacoes,
    gerada_automaticamente
  ) VALUES (
    p_escritorio_id,
    p_cliente_id,
    v_numero_fatura,
    p_data_emissao,
    p_data_vencimento,
    'rascunho',
    p_parcelado,
    p_numero_parcelas,
    p_observacoes,
    false
  ) RETURNING id INTO v_fatura_id;

  -- Adicionar honorários
  IF p_honorarios_ids IS NOT NULL THEN
    FOREACH v_honorario_id IN ARRAY p_honorarios_ids LOOP
      SELECT
        h.id,
        h.descricao,
        h.valor_total,
        h.tipo_honorario
      INTO v_item
      FROM honorarios h
      WHERE h.id = v_honorario_id
      AND h.cliente_id = p_cliente_id
      AND h.status = 'aprovado';

      IF FOUND THEN
        INSERT INTO faturas_itens (
          fatura_id,
          tipo_item,
          descricao,
          quantidade,
          valor_unitario,
          valor_total,
          referencia_id
        ) VALUES (
          v_fatura_id,
          'honorario',
          v_item.descricao,
          1,
          v_item.valor_total,
          v_item.valor_total,
          v_honorario_id
        );

        v_valor_total := v_valor_total + v_item.valor_total;

        -- Atualizar honorário
        UPDATE honorarios
        SET status = 'faturado',
            fatura_id = v_fatura_id,
            updated_at = NOW()
        WHERE id = v_honorario_id;
      END IF;
    END LOOP;
  END IF;

  -- Adicionar timesheet
  IF p_timesheet_ids IS NOT NULL THEN
    -- Agrupar por tipo de atividade
    FOR v_item IN
      SELECT
        t.atividade,
        SUM(t.horas) AS total_horas,
        AVG((
          SELECT ch.valor_hora
          FROM contratos_honorarios_config ch
          JOIN contratos_honorarios cont ON cont.id = ch.contrato_id
          WHERE cont.cliente_id = p_cliente_id
          AND ch.tipo_config = 'hora'
          AND cont.ativo = true
          LIMIT 1
        )) AS valor_hora
      FROM timesheet t
      WHERE t.id = ANY(p_timesheet_ids)
      AND t.aprovado = true
      AND NOT t.faturado
      GROUP BY t.atividade
    LOOP
      INSERT INTO faturas_itens (
        fatura_id,
        tipo_item,
        descricao,
        quantidade,
        valor_unitario,
        valor_total,
        timesheet_ids
      ) VALUES (
        v_fatura_id,
        'timesheet',
        v_item.atividade,
        v_item.total_horas,
        COALESCE(v_item.valor_hora, 0),
        v_item.total_horas * COALESCE(v_item.valor_hora, 0),
        p_timesheet_ids
      );

      v_valor_total := v_valor_total + (v_item.total_horas * COALESCE(v_item.valor_hora, 0));
    END LOOP;

    -- Marcar timesheet como faturado
    UPDATE timesheet
    SET faturado = true,
        fatura_id = v_fatura_id,
        faturado_em = NOW()
    WHERE id = ANY(p_timesheet_ids);
  END IF;

  -- Adicionar despesas (reembolsáveis)
  IF p_despesas_ids IS NOT NULL THEN
    FOREACH v_despesa_id IN ARRAY p_despesas_ids LOOP
      SELECT
        d.id,
        d.descricao,
        d.valor,
        d.categoria
      INTO v_item
      FROM despesas d
      WHERE d.id = v_despesa_id
      AND d.escritorio_id = p_escritorio_id
      AND d.reembolsavel = true
      AND d.status = 'pago';

      IF FOUND THEN
        INSERT INTO faturas_itens (
          fatura_id,
          tipo_item,
          descricao,
          quantidade,
          valor_unitario,
          valor_total,
          referencia_id
        ) VALUES (
          v_fatura_id,
          'despesa',
          'Reembolso: ' || v_item.descricao,
          1,
          v_item.valor,
          v_item.valor,
          v_despesa_id
        );

        v_valor_total := v_valor_total + v_item.valor;

        -- Marcar despesa como faturada
        UPDATE despesas
        SET faturado = true,
            fatura_id = v_fatura_id
        WHERE id = v_despesa_id;
      END IF;
    END LOOP;
  END IF;

  -- Atualizar valor total da fatura
  UPDATE faturas
  SET valor_total = v_valor_total,
      status = 'emitida',
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
      '/financeiro/faturas/' || v_fatura_id,
      false
    );
  END IF;

  RETURN v_fatura_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION gerar_fatura IS 'Gera fatura consolidando honorários, timesheet e despesas';

-- =====================================================
-- DESMANCHAR FATURA
-- =====================================================

CREATE OR REPLACE FUNCTION desmanchar_fatura(
  p_fatura_id UUID,
  p_user_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_fatura RECORD;
  v_item RECORD;
BEGIN
  -- Buscar fatura
  SELECT * INTO v_fatura FROM faturas WHERE id = p_fatura_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fatura não encontrada';
  END IF;

  -- Validar status
  IF v_fatura.status NOT IN ('rascunho', 'emitida') THEN
    RAISE EXCEPTION 'Apenas faturas em rascunho ou emitidas podem ser desmanchadas';
  END IF;

  -- Reverter honorários
  UPDATE honorarios
  SET status = 'aprovado',
      fatura_id = NULL,
      updated_at = NOW()
  WHERE fatura_id = p_fatura_id;

  -- Reverter timesheet
  UPDATE timesheet
  SET faturado = false,
      fatura_id = NULL,
      faturado_em = NULL,
      updated_at = NOW()
  WHERE fatura_id = p_fatura_id;

  -- Reverter despesas
  UPDATE despesas
  SET faturado = false,
      fatura_id = NULL
  WHERE fatura_id = p_fatura_id;

  -- Deletar itens da fatura
  DELETE FROM faturas_itens WHERE fatura_id = p_fatura_id;

  -- Atualizar fatura
  UPDATE faturas
  SET status = 'cancelada',
      updated_at = NOW()
  WHERE id = p_fatura_id;

  -- Notificar
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
      'fatura_desmanchada',
      'Fatura Desmanchada',
      'Fatura ' || v_fatura.numero_fatura || ' foi desmanchada e seus itens liberados',
      '/financeiro/faturas',
      false
    );
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION desmanchar_fatura IS 'Desfaz fatura e libera itens para novo faturamento';

-- =====================================================
-- ENVIAR FATURA
-- =====================================================

CREATE OR REPLACE FUNCTION enviar_fatura(
  p_fatura_id UUID,
  p_email_destino TEXT,
  p_mensagem TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_fatura RECORD;
BEGIN
  -- Buscar fatura
  SELECT * INTO v_fatura FROM faturas WHERE id = p_fatura_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fatura não encontrada';
  END IF;

  -- Validar status
  IF v_fatura.status NOT IN ('emitida', 'enviada') THEN
    RAISE EXCEPTION 'Apenas faturas emitidas podem ser enviadas';
  END IF;

  -- Atualizar fatura
  UPDATE faturas
  SET status = 'enviada',
      enviada_em = NOW(),
      updated_at = NOW()
  WHERE id = p_fatura_id;

  -- Registrar envio (para histórico)
  INSERT INTO cobrancas_enviadas (
    tipo_cobranca,
    destinatario_email,
    assunto,
    mensagem,
    fatura_id
  ) VALUES (
    'fatura',
    p_email_destino,
    'Fatura ' || v_fatura.numero_fatura,
    COALESCE(p_mensagem, 'Segue em anexo a fatura de honorários.'),
    p_fatura_id
  );

  -- TODO: Integrar com serviço de email real (SendGrid, AWS SES, etc)

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
      'fatura_enviada',
      'Fatura Enviada',
      'Fatura ' || v_fatura.numero_fatura || ' enviada para ' || p_email_destino,
      '/financeiro/faturas/' || p_fatura_id,
      false
    );
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION enviar_fatura IS 'Marca fatura como enviada e registra envio';

-- =====================================================
-- PAGAR FATURA
-- =====================================================

CREATE OR REPLACE FUNCTION pagar_fatura(
  p_fatura_id UUID,
  p_valor_pago NUMERIC,
  p_data_pagamento DATE DEFAULT CURRENT_DATE,
  p_forma_pagamento TEXT,
  p_conta_bancaria_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_fatura RECORD;
  v_pagamento_id UUID;
BEGIN
  -- Buscar fatura
  SELECT * INTO v_fatura FROM faturas WHERE id = p_fatura_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fatura não encontrada';
  END IF;

  -- Validar status
  IF v_fatura.status NOT IN ('emitida', 'enviada', 'atrasada') THEN
    RAISE EXCEPTION 'Status da fatura não permite pagamento';
  END IF;

  -- Registrar pagamento
  INSERT INTO pagamentos (
    escritorio_id,
    tipo_pagamento,
    valor,
    data_pagamento,
    forma_pagamento,
    conta_bancaria_id,
    fatura_id,
    observacoes
  ) VALUES (
    v_fatura.escritorio_id,
    'recebimento',
    p_valor_pago,
    p_data_pagamento,
    p_forma_pagamento,
    p_conta_bancaria_id,
    p_fatura_id,
    'Pagamento de fatura ' || v_fatura.numero_fatura
  ) RETURNING id INTO v_pagamento_id;

  -- Atualizar fatura
  UPDATE faturas
  SET status = 'paga',
      paga_em = p_data_pagamento,
      updated_at = NOW()
  WHERE id = p_fatura_id;

  -- Se houver conta bancária, lançar entrada
  IF p_conta_bancaria_id IS NOT NULL THEN
    INSERT INTO conta_bancaria_lancamentos (
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
      'receita',
      'pagamento',
      v_pagamento_id,
      (SELECT saldo_atual + p_valor_pago FROM contas_bancarias WHERE id = p_conta_bancaria_id)
    );

    -- Atualizar saldo
    UPDATE contas_bancarias
    SET saldo_atual = saldo_atual + p_valor_pago
    WHERE id = p_conta_bancaria_id;
  END IF;

  -- Notificar
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
      'Fatura ' || v_fatura.numero_fatura || ' recebida. Valor: R$ ' || TO_CHAR(p_valor_pago, 'FM999G999G990D00'),
      '/financeiro/faturas/' || p_fatura_id,
      false
    );
  END IF;

  RETURN v_pagamento_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION pagar_fatura IS 'Registra pagamento de fatura e lança em conta bancária';

-- =====================================================
-- AGENDAR FATURAMENTO AUTOMÁTICO
-- =====================================================

CREATE OR REPLACE FUNCTION agendar_faturamento_automatico(
  p_cliente_id UUID,
  p_dia_faturamento INTEGER,
  p_dia_vencimento INTEGER,
  p_incluir_timesheet BOOLEAN DEFAULT true,
  p_incluir_honorarios BOOLEAN DEFAULT true,
  p_ativo BOOLEAN DEFAULT true
) RETURNS UUID AS $$
DECLARE
  v_agendamento_id UUID;
  v_escritorio_id UUID;
BEGIN
  -- Validações
  IF p_dia_faturamento < 1 OR p_dia_faturamento > 28 THEN
    RAISE EXCEPTION 'Dia de faturamento deve estar entre 1 e 28';
  END IF;

  IF p_dia_vencimento < 1 OR p_dia_vencimento > 28 THEN
    RAISE EXCEPTION 'Dia de vencimento deve estar entre 1 e 28';
  END IF;

  -- Buscar escritório do cliente
  SELECT escritorio_id INTO v_escritorio_id
  FROM clientes
  WHERE id = p_cliente_id;

  -- Inserir agendamento
  INSERT INTO faturas_agendamentos (
    escritorio_id,
    cliente_id,
    dia_faturamento,
    dia_vencimento,
    incluir_timesheet,
    incluir_honorarios,
    ativo,
    proxima_execucao
  ) VALUES (
    v_escritorio_id,
    p_cliente_id,
    p_dia_faturamento,
    p_dia_vencimento,
    p_incluir_timesheet,
    p_incluir_honorarios,
    p_ativo,
    -- Calcular próxima execução
    CASE
      WHEN p_dia_faturamento > EXTRACT(DAY FROM CURRENT_DATE)
      THEN DATE_TRUNC('month', CURRENT_DATE) + (p_dia_faturamento - 1 || ' days')::INTERVAL
      ELSE DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month') + (p_dia_faturamento - 1 || ' days')::INTERVAL
    END
  ) RETURNING id INTO v_agendamento_id;

  RETURN v_agendamento_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION agendar_faturamento_automatico IS 'Agenda faturamento automático mensal para cliente';

-- =====================================================
-- CANCELAR AGENDAMENTO DE FATURAMENTO
-- =====================================================

CREATE OR REPLACE FUNCTION cancelar_agendamento_faturamento(
  p_agendamento_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE faturas_agendamentos
  SET ativo = false,
      updated_at = NOW()
  WHERE id = p_agendamento_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cancelar_agendamento_faturamento IS 'Cancela agendamento de faturamento automático';
