-- =====================================================
-- MÓDULO FINANCEIRO - TRIGGERS
-- =====================================================
-- Migration: Triggers para automações e validações
-- - Atualizar timestamps
-- - Calcular comissões automaticamente
-- - Notificar mudanças de status
-- - Validar dados
-- - Atualizar contadores
-- =====================================================

-- =====================================================
-- TRIGGER: Atualizar updated_at automaticamente
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar em todas as tabelas financeiras
CREATE TRIGGER set_updated_at BEFORE UPDATE ON honorarios FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON honorarios_parcelas FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON contratos_honorarios FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON timesheet FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON faturas FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON despesas FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON contas_bancarias FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON conta_bancaria_lancamentos FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- =====================================================
-- TRIGGER: Calcular comissão ao receber pagamento
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_calcular_comissao_pagamento()
RETURNS TRIGGER AS $$
BEGIN
  -- Apenas se for recebimento de honorário
  IF NEW.tipo_pagamento = 'recebimento' AND NEW.honorario_parcela_id IS NOT NULL THEN
    PERFORM calcular_comissao(NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calcular_comissao_pagamento
AFTER INSERT ON pagamentos
FOR EACH ROW
EXECUTE FUNCTION trigger_calcular_comissao_pagamento();

COMMENT ON TRIGGER calcular_comissao_pagamento ON pagamentos IS 'Calcula comissão automaticamente ao registrar pagamento';

-- =====================================================
-- TRIGGER: Notificar aprovação de honorário
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_notificar_honorario_aprovado()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'aprovado' AND OLD.status != 'aprovado' THEN
    INSERT INTO notifications (
      user_id,
      tipo,
      titulo,
      mensagem,
      link,
      lida
    ) VALUES (
      NEW.responsavel_id,
      'honorario_aprovado',
      'Honorário Aprovado',
      'Honorário ' || NEW.numero_interno || ' foi aprovado e está pronto para faturamento',
      '/financeiro/honorarios/' || NEW.id,
      false
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notificar_honorario_aprovado
AFTER UPDATE ON honorarios
FOR EACH ROW
EXECUTE FUNCTION trigger_notificar_honorario_aprovado();

-- =====================================================
-- TRIGGER: Atualizar dias de atraso em parcelas
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_atualizar_dias_atraso()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'atrasado' THEN
    NEW.dias_atraso := CURRENT_DATE - NEW.data_vencimento;
  ELSE
    NEW.dias_atraso := 0;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER atualizar_dias_atraso
BEFORE INSERT OR UPDATE ON honorarios_parcelas
FOR EACH ROW
EXECUTE FUNCTION trigger_atualizar_dias_atraso();

-- =====================================================
-- TRIGGER: Validar timesheet antes de inserir
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_validar_timesheet()
RETURNS TRIGGER AS $$
BEGIN
  -- Validar horas
  IF NEW.horas <= 0 OR NEW.horas > 24 THEN
    RAISE EXCEPTION 'Horas devem estar entre 0 e 24';
  END IF;

  -- Validar que tem processo OU consulta (não ambos, não nenhum)
  IF (NEW.processo_id IS NULL AND NEW.consulta_id IS NULL) THEN
    RAISE EXCEPTION 'Timesheet deve estar vinculado a um Processo ou Consulta';
  END IF;

  IF (NEW.processo_id IS NOT NULL AND NEW.consulta_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Timesheet não pode estar vinculado a Processo E Consulta simultaneamente';
  END IF;

  -- Validar data de trabalho não futura
  IF NEW.data_trabalho > CURRENT_DATE THEN
    RAISE EXCEPTION 'Data de trabalho não pode ser futura';
  END IF;

  -- Validar escritório do processo/consulta
  IF NEW.processo_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM processos p
      WHERE p.id = NEW.processo_id
      AND p.escritorio_id = NEW.escritorio_id
    ) THEN
      RAISE EXCEPTION 'Processo não pertence ao escritório selecionado';
    END IF;
  END IF;

  IF NEW.consulta_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM consultas c
      WHERE c.id = NEW.consulta_id
      AND c.escritorio_id = NEW.escritorio_id
    ) THEN
      RAISE EXCEPTION 'Consulta não pertence ao escritório selecionado';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validar_timesheet
BEFORE INSERT OR UPDATE ON timesheet
FOR EACH ROW
EXECUTE FUNCTION trigger_validar_timesheet();

-- =====================================================
-- TRIGGER: Prevenir edição de timesheet aprovado/faturado
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_proteger_timesheet_aprovado()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.faturado = true THEN
    RAISE EXCEPTION 'Timesheet já faturado não pode ser modificado';
  END IF;

  IF OLD.aprovado = true AND NEW.aprovado = false AND NEW.reprovado = false THEN
    RAISE EXCEPTION 'Timesheet aprovado só pode ser reprovado com justificativa';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER proteger_timesheet_aprovado
BEFORE UPDATE ON timesheet
FOR EACH ROW
EXECUTE FUNCTION trigger_proteger_timesheet_aprovado();

-- =====================================================
-- TRIGGER: Validar fatura antes de emitir
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_validar_fatura()
RETURNS TRIGGER AS $$
BEGIN
  -- Validar que fatura tem itens
  IF NEW.status IN ('emitida', 'enviada') THEN
    IF NOT EXISTS (SELECT 1 FROM faturas_itens WHERE fatura_id = NEW.id) THEN
      RAISE EXCEPTION 'Fatura não pode ser emitida sem itens';
    END IF;

    IF NEW.valor_total <= 0 THEN
      RAISE EXCEPTION 'Fatura não pode ser emitida com valor zero ou negativo';
    END IF;
  END IF;

  -- Validar vencimento
  IF NEW.data_vencimento < NEW.data_emissao THEN
    RAISE EXCEPTION 'Data de vencimento não pode ser anterior à data de emissão';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validar_fatura
BEFORE UPDATE ON faturas
FOR EACH ROW
EXECUTE FUNCTION trigger_validar_fatura();

-- =====================================================
-- TRIGGER: Atualizar status de fatura para atrasada
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_atualizar_status_fatura_atrasada()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('emitida', 'enviada') AND NEW.data_vencimento < CURRENT_DATE THEN
    NEW.status := 'atrasada';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER atualizar_status_fatura_atrasada
BEFORE UPDATE ON faturas
FOR EACH ROW
EXECUTE FUNCTION trigger_atualizar_status_fatura_atrasada();

-- =====================================================
-- TRIGGER: Notificar vencimento de fatura
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_notificar_fatura_vencimento()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'atrasada' AND OLD.status != 'atrasada' THEN
    -- Notificar responsável
    INSERT INTO notifications (
      user_id,
      tipo,
      titulo,
      mensagem,
      link,
      lida,
      prioridade
    )
    SELECT
      h.responsavel_id,
      'fatura_atrasada',
      'Fatura Vencida',
      'Fatura ' || NEW.numero_fatura || ' do cliente ' || c.nome_completo || ' está vencida',
      '/financeiro/faturas/' || NEW.id,
      false,
      'alta'
    FROM clientes c
    LEFT JOIN honorarios h ON h.cliente_id = c.id AND h.fatura_id = NEW.id
    WHERE c.id = NEW.cliente_id
    LIMIT 1;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notificar_fatura_vencimento
AFTER UPDATE ON faturas
FOR EACH ROW
EXECUTE FUNCTION trigger_notificar_fatura_vencimento();

-- =====================================================
-- TRIGGER: Validar despesa
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_validar_despesa()
RETURNS TRIGGER AS $$
BEGIN
  -- Validar valor
  IF NEW.valor <= 0 THEN
    RAISE EXCEPTION 'Valor da despesa deve ser maior que zero';
  END IF;

  -- Validar categoria
  IF NEW.categoria NOT IN ('aluguel', 'folha', 'impostos', 'tecnologia', 'marketing', 'material', 'capacitacao', 'outros') THEN
    RAISE EXCEPTION 'Categoria de despesa inválida';
  END IF;

  -- Se for reembolsável, deve ter processo ou consulta
  IF NEW.reembolsavel = true AND NEW.processo_id IS NULL AND NEW.consulta_id IS NULL THEN
    RAISE EXCEPTION 'Despesa reembolsável deve estar vinculada a Processo ou Consulta';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validar_despesa
BEFORE INSERT OR UPDATE ON despesas
FOR EACH ROW
EXECUTE FUNCTION trigger_validar_despesa();

-- =====================================================
-- TRIGGER: Registrar lançamento bancário ao pagar despesa
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_lancar_despesa_conta()
RETURNS TRIGGER AS $$
BEGIN
  -- Se despesa foi marcada como paga e tem conta bancária
  IF NEW.status = 'pago' AND OLD.status != 'pago' AND NEW.conta_bancaria_id IS NOT NULL THEN
    -- Criar lançamento de saída
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
      NEW.conta_bancaria_id,
      'saida',
      NEW.valor,
      COALESCE(NEW.data_pagamento, CURRENT_DATE),
      NEW.descricao,
      NEW.categoria,
      'despesa',
      NEW.id,
      (SELECT saldo_atual - NEW.valor FROM contas_bancarias WHERE id = NEW.conta_bancaria_id)
    );

    -- Atualizar saldo da conta
    UPDATE contas_bancarias
    SET saldo_atual = saldo_atual - NEW.valor,
        updated_at = NOW()
    WHERE id = NEW.conta_bancaria_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lancar_despesa_conta
AFTER UPDATE ON despesas
FOR EACH ROW
EXECUTE FUNCTION trigger_lancar_despesa_conta();

-- =====================================================
-- TRIGGER: Validar conta bancária
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_validar_conta_bancaria()
RETURNS TRIGGER AS $$
BEGIN
  -- Validar apenas uma conta principal por escritório
  IF NEW.conta_principal = true THEN
    UPDATE contas_bancarias
    SET conta_principal = false
    WHERE escritorio_id = NEW.escritorio_id
    AND id != NEW.id
    AND conta_principal = true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validar_conta_bancaria
BEFORE INSERT OR UPDATE ON contas_bancarias
FOR EACH ROW
EXECUTE FUNCTION trigger_validar_conta_bancaria();

-- =====================================================
-- TRIGGER: Validar transferência
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_validar_lancamento_transferencia()
RETURNS TRIGGER AS $$
BEGIN
  -- Se for transferência, deve ter transferencia_id
  IF NEW.tipo IN ('transferencia_entrada', 'transferencia_saida') AND NEW.transferencia_id IS NULL THEN
    RAISE EXCEPTION 'Lançamento de transferência deve ter transferencia_id';
  END IF;

  -- Validar saldo após lançamento não pode ficar extremamente negativo (limite de -10000)
  IF NEW.saldo_apos_lancamento < -10000 THEN
    RAISE WARNING 'Atenção: Saldo após lançamento muito negativo (R$ %)', NEW.saldo_apos_lancamento;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validar_lancamento_transferencia
BEFORE INSERT ON conta_bancaria_lancamentos
FOR EACH ROW
EXECUTE FUNCTION trigger_validar_lancamento_transferencia();

-- =====================================================
-- TRIGGER: Validar meta financeira
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_validar_meta_financeira()
RETURNS TRIGGER AS $$
BEGIN
  -- Validar período
  IF NEW.data_fim <= NEW.data_inicio THEN
    RAISE EXCEPTION 'Data fim deve ser posterior à data início';
  END IF;

  -- Validar valor
  IF NEW.valor_meta <= 0 THEN
    RAISE EXCEPTION 'Valor da meta deve ser maior que zero';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validar_meta_financeira
BEFORE INSERT OR UPDATE ON metas_financeiras
FOR EACH ROW
EXECUTE FUNCTION trigger_validar_meta_financeira();

-- =====================================================
-- TRIGGER: Atualizar progresso de meta
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_atualizar_progresso_meta()
RETURNS TRIGGER AS $$
DECLARE
  v_meta RECORD;
  v_realizado NUMERIC;
  v_percentual NUMERIC;
BEGIN
  -- Buscar metas ativas que podem ser afetadas por este pagamento
  FOR v_meta IN
    SELECT m.*
    FROM metas_financeiras m
    WHERE m.ativa = true
    AND m.data_inicio <= CURRENT_DATE
    AND m.data_fim >= CURRENT_DATE
    AND m.escritorio_id IN (
      SELECT escritorio_id
      FROM pagamentos
      WHERE id = NEW.id
    )
  LOOP
    -- Calcular realizado baseado no tipo de meta
    IF v_meta.tipo_meta = 'receita' THEN
      SELECT COALESCE(SUM(p.valor), 0)
      INTO v_realizado
      FROM pagamentos p
      WHERE p.escritorio_id = v_meta.escritorio_id
      AND p.tipo_pagamento = 'recebimento'
      AND p.data_pagamento BETWEEN v_meta.data_inicio AND v_meta.data_fim;

    ELSIF v_meta.tipo_meta = 'despesa' THEN
      SELECT COALESCE(SUM(d.valor), 0)
      INTO v_realizado
      FROM despesas d
      WHERE d.escritorio_id = v_meta.escritorio_id
      AND d.status = 'pago'
      AND d.data_pagamento BETWEEN v_meta.data_inicio AND v_meta.data_fim;
    END IF;

    -- Calcular percentual
    v_percentual := (v_realizado / v_meta.valor_meta) * 100;

    -- Atualizar meta
    UPDATE metas_financeiras
    SET valor_realizado = v_realizado,
        percentual_atingido = v_percentual,
        updated_at = NOW()
    WHERE id = v_meta.id;

    -- Notificar se atingiu meta
    IF v_percentual >= 100 AND v_meta.percentual_atingido < 100 THEN
      INSERT INTO notifications (
        user_id,
        tipo,
        titulo,
        mensagem,
        link,
        lida,
        prioridade
      )
      SELECT DISTINCT
        uer.user_id,
        'meta_atingida',
        'Meta Atingida! 🎯',
        'A meta "' || v_meta.descricao || '" foi alcançada!',
        '/financeiro/metas',
        false,
        'alta'
      FROM user_escritorios_roles uer
      WHERE uer.escritorio_id = v_meta.escritorio_id
      AND uer.role IN ('admin', 'financeiro');
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER atualizar_progresso_meta
AFTER INSERT OR UPDATE ON pagamentos
FOR EACH ROW
EXECUTE FUNCTION trigger_atualizar_progresso_meta();

COMMENT ON TRIGGER atualizar_progresso_meta ON pagamentos IS 'Atualiza progresso de metas financeiras ao registrar pagamentos';
