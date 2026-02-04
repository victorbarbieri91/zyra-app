-- =====================================================
-- MÓDULO FINANCEIRO - FUNÇÕES DE CONTA BANCÁRIA
-- =====================================================
-- Migration: Funções para gestão de contas bancárias
-- - transferir_entre_contas (transferência entre contas)
-- - lancar_entrada_manual (lançamento manual de entrada)
-- - lancar_saida_manual (lançamento manual de saída)
-- - atualizar_saldo_conta (recalcular saldo)
-- - conciliar_lancamento (conciliação bancária)
-- =====================================================

-- =====================================================
-- TRANSFERIR ENTRE CONTAS
-- =====================================================

CREATE OR REPLACE FUNCTION transferir_entre_contas(
  p_conta_origem_id UUID,
  p_conta_destino_id UUID,
  p_valor NUMERIC,
  p_descricao TEXT,
  p_data_transferencia DATE DEFAULT CURRENT_DATE,
  p_user_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_transferencia_id UUID;
  v_conta_origem RECORD;
  v_conta_destino RECORD;
BEGIN
  -- Validações
  IF p_valor <= 0 THEN
    RAISE EXCEPTION 'Valor da transferência deve ser maior que zero';
  END IF;

  -- Buscar contas
  SELECT * INTO v_conta_origem FROM contas_bancarias WHERE id = p_conta_origem_id;
  SELECT * INTO v_conta_destino FROM contas_bancarias WHERE id = p_conta_destino_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conta origem ou destino não encontrada';
  END IF;

  -- Validar mesmo escritório
  IF v_conta_origem.escritorio_id != v_conta_destino.escritorio_id THEN
    RAISE EXCEPTION 'Transferências apenas entre contas do mesmo escritório';
  END IF;

  -- Validar saldo
  IF v_conta_origem.saldo_atual < p_valor THEN
    RAISE EXCEPTION 'Saldo insuficiente na conta origem';
  END IF;

  -- Gerar ID único para a transferência
  v_transferencia_id := gen_random_uuid();

  -- Lançamento de SAÍDA na conta origem
  INSERT INTO conta_bancaria_lancamentos (
    conta_bancaria_id,
    tipo,
    valor,
    data_lancamento,
    descricao,
    categoria,
    origem_tipo,
    transferencia_id,
    saldo_apos_lancamento
  ) VALUES (
    p_conta_origem_id,
    'transferencia_saida',
    p_valor,
    p_data_transferencia,
    p_descricao,
    'transferencia',
    'transferencia',
    v_transferencia_id,
    v_conta_origem.saldo_atual - p_valor
  );

  -- Lançamento de ENTRADA na conta destino
  INSERT INTO conta_bancaria_lancamentos (
    conta_bancaria_id,
    tipo,
    valor,
    data_lancamento,
    descricao,
    categoria,
    origem_tipo,
    transferencia_id,
    saldo_apos_lancamento
  ) VALUES (
    p_conta_destino_id,
    'transferencia_entrada',
    p_valor,
    p_data_transferencia,
    p_descricao,
    'transferencia',
    'transferencia',
    v_transferencia_id,
    v_conta_destino.saldo_atual + p_valor
  );

  -- Atualizar saldos
  UPDATE contas_bancarias
  SET saldo_atual = saldo_atual - p_valor,
      updated_at = NOW()
  WHERE id = p_conta_origem_id;

  UPDATE contas_bancarias
  SET saldo_atual = saldo_atual + p_valor,
      updated_at = NOW()
  WHERE id = p_conta_destino_id;

  -- Notificação
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
      'transferencia_realizada',
      'Transferência Realizada',
      'Transferência de R$ ' || TO_CHAR(p_valor, 'FM999G999G990D00') || ' realizada com sucesso',
      '/financeiro/contas-bancarias',
      false
    );
  END IF;

  RETURN v_transferencia_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION transferir_entre_contas IS 'Realiza transferência entre contas do mesmo escritório';

-- =====================================================
-- LANÇAR ENTRADA MANUAL
-- =====================================================

CREATE OR REPLACE FUNCTION lancar_entrada_manual(
  p_conta_bancaria_id UUID,
  p_valor NUMERIC,
  p_descricao TEXT,
  p_categoria TEXT,
  p_data_lancamento DATE DEFAULT CURRENT_DATE,
  p_comprovante_url TEXT DEFAULT NULL,
  p_observacoes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_lancamento_id UUID;
  v_conta RECORD;
  v_novo_saldo NUMERIC;
BEGIN
  -- Validações
  IF p_valor <= 0 THEN
    RAISE EXCEPTION 'Valor deve ser maior que zero';
  END IF;

  IF p_categoria NOT IN ('receita', 'transferencia', 'correcao', 'outro') THEN
    RAISE EXCEPTION 'Categoria inválida para entrada manual';
  END IF;

  -- Buscar conta
  SELECT * INTO v_conta FROM contas_bancarias WHERE id = p_conta_bancaria_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conta bancária não encontrada';
  END IF;

  IF NOT v_conta.ativa THEN
    RAISE EXCEPTION 'Conta bancária inativa';
  END IF;

  -- Calcular novo saldo
  v_novo_saldo := v_conta.saldo_atual + p_valor;

  -- Inserir lançamento
  INSERT INTO conta_bancaria_lancamentos (
    conta_bancaria_id,
    tipo,
    valor,
    data_lancamento,
    descricao,
    categoria,
    origem_tipo,
    saldo_apos_lancamento,
    comprovante_url,
    observacoes
  ) VALUES (
    p_conta_bancaria_id,
    'entrada',
    p_valor,
    p_data_lancamento,
    p_descricao,
    p_categoria,
    'manual',
    v_novo_saldo,
    p_comprovante_url,
    p_observacoes
  ) RETURNING id INTO v_lancamento_id;

  -- Atualizar saldo da conta
  UPDATE contas_bancarias
  SET saldo_atual = v_novo_saldo,
      updated_at = NOW()
  WHERE id = p_conta_bancaria_id;

  RETURN v_lancamento_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION lancar_entrada_manual IS 'Lança entrada manual em conta bancária';

-- =====================================================
-- LANÇAR SAÍDA MANUAL
-- =====================================================

CREATE OR REPLACE FUNCTION lancar_saida_manual(
  p_conta_bancaria_id UUID,
  p_valor NUMERIC,
  p_descricao TEXT,
  p_categoria TEXT,
  p_data_lancamento DATE DEFAULT CURRENT_DATE,
  p_comprovante_url TEXT DEFAULT NULL,
  p_observacoes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_lancamento_id UUID;
  v_conta RECORD;
  v_novo_saldo NUMERIC;
BEGIN
  -- Validações
  IF p_valor <= 0 THEN
    RAISE EXCEPTION 'Valor deve ser maior que zero';
  END IF;

  IF p_categoria NOT IN ('despesa', 'transferencia', 'correcao', 'taxa', 'outro') THEN
    RAISE EXCEPTION 'Categoria inválida para saída manual';
  END IF;

  -- Buscar conta
  SELECT * INTO v_conta FROM contas_bancarias WHERE id = p_conta_bancaria_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conta bancária não encontrada';
  END IF;

  IF NOT v_conta.ativa THEN
    RAISE EXCEPTION 'Conta bancária inativa';
  END IF;

  -- Calcular novo saldo
  v_novo_saldo := v_conta.saldo_atual - p_valor;

  -- Permitir saldo negativo mas avisar
  IF v_novo_saldo < 0 THEN
    RAISE NOTICE 'Atenção: Esta operação deixará a conta com saldo negativo';
  END IF;

  -- Inserir lançamento
  INSERT INTO conta_bancaria_lancamentos (
    conta_bancaria_id,
    tipo,
    valor,
    data_lancamento,
    descricao,
    categoria,
    origem_tipo,
    saldo_apos_lancamento,
    comprovante_url,
    observacoes
  ) VALUES (
    p_conta_bancaria_id,
    'saida',
    p_valor,
    p_data_lancamento,
    p_descricao,
    p_categoria,
    'manual',
    v_novo_saldo,
    p_comprovante_url,
    p_observacoes
  ) RETURNING id INTO v_lancamento_id;

  -- Atualizar saldo da conta
  UPDATE contas_bancarias
  SET saldo_atual = v_novo_saldo,
      updated_at = NOW()
  WHERE id = p_conta_bancaria_id;

  RETURN v_lancamento_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION lancar_saida_manual IS 'Lança saída manual em conta bancária';

-- =====================================================
-- ATUALIZAR SALDO DA CONTA (RECALCULAR)
-- =====================================================

CREATE OR REPLACE FUNCTION atualizar_saldo_conta(
  p_conta_bancaria_id UUID
) RETURNS NUMERIC AS $$
DECLARE
  v_conta RECORD;
  v_saldo_calculado NUMERIC;
BEGIN
  -- Buscar conta
  SELECT * INTO v_conta FROM contas_bancarias WHERE id = p_conta_bancaria_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conta bancária não encontrada';
  END IF;

  -- Calcular saldo baseado no saldo inicial + lançamentos
  SELECT
    v_conta.saldo_inicial +
    COALESCE(SUM(
      CASE
        WHEN tipo IN ('entrada', 'transferencia_entrada') THEN valor
        WHEN tipo IN ('saida', 'transferencia_saida') THEN -valor
        ELSE 0
      END
    ), 0)
  INTO v_saldo_calculado
  FROM conta_bancaria_lancamentos
  WHERE conta_bancaria_id = p_conta_bancaria_id;

  -- Atualizar conta
  UPDATE contas_bancarias
  SET saldo_atual = v_saldo_calculado,
      updated_at = NOW()
  WHERE id = p_conta_bancaria_id;

  RETURN v_saldo_calculado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION atualizar_saldo_conta IS 'Recalcula saldo da conta baseado em lançamentos';

-- =====================================================
-- CONCILIAR LANÇAMENTO
-- =====================================================

CREATE OR REPLACE FUNCTION conciliar_lancamento(
  p_lancamento_sistema_id UUID,
  p_lancamento_banco_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_lanc_sistema RECORD;
  v_lanc_banco RECORD;
BEGIN
  -- Buscar lançamentos
  SELECT * INTO v_lanc_sistema
  FROM conta_bancaria_lancamentos
  WHERE id = p_lancamento_sistema_id;

  SELECT * INTO v_lanc_banco
  FROM lancamentos_bancarios
  WHERE id = p_lancamento_banco_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lançamento não encontrado';
  END IF;

  -- Validar mesma conta
  IF v_lanc_sistema.conta_bancaria_id != v_lanc_banco.conta_bancaria_id THEN
    RAISE EXCEPTION 'Lançamentos de contas diferentes';
  END IF;

  -- Marcar como conciliados
  UPDATE conta_bancaria_lancamentos
  SET conciliado = true,
      conciliado_em = NOW(),
      updated_at = NOW()
  WHERE id = p_lancamento_sistema_id;

  UPDATE lancamentos_bancarios
  SET conciliado = true,
      conciliado_com_id = p_lancamento_sistema_id,
      updated_at = NOW()
  WHERE id = p_lancamento_banco_id;

  -- Registrar conciliação
  INSERT INTO conciliacoes_bancarias (
    conta_bancaria_id,
    periodo_inicio,
    periodo_fim,
    saldo_inicial,
    saldo_final,
    total_entradas,
    total_saidas,
    divergencias,
    observacoes
  ) VALUES (
    v_lanc_sistema.conta_bancaria_id,
    v_lanc_banco.data_lancamento,
    v_lanc_banco.data_lancamento,
    0, -- Seria calculado em conciliação completa
    0,
    CASE WHEN v_lanc_banco.tipo = 'credito' THEN v_lanc_banco.valor ELSE 0 END,
    CASE WHEN v_lanc_banco.tipo = 'debito' THEN v_lanc_banco.valor ELSE 0 END,
    0,
    'Conciliação individual'
  ) ON CONFLICT DO NOTHING; -- Evita duplicatas

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION conciliar_lancamento IS 'Concilia lançamento do sistema com extrato bancário';

-- =====================================================
-- IMPORTAR EXTRATO OFX
-- =====================================================

CREATE OR REPLACE FUNCTION importar_extrato_ofx(
  p_conta_bancaria_id UUID,
  p_arquivo_conteudo TEXT,
  p_user_id UUID
) RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_linha TEXT;
  v_data DATE;
  v_descricao TEXT;
  v_valor NUMERIC;
  v_tipo TEXT;
BEGIN
  -- Esta é uma função simplificada
  -- Em produção, seria necessário parser OFX completo
  -- Por enquanto, apenas registra importação

  INSERT INTO notifications (
    user_id,
    tipo,
    titulo,
    mensagem,
    link,
    lida
  ) VALUES (
    p_user_id,
    'extrato_importado',
    'Extrato Importado',
    'Importação de extrato OFX iniciada',
    '/financeiro/contas-bancarias',
    false
  );

  -- TODO: Implementar parser OFX real
  RAISE NOTICE 'Função de importação OFX será implementada com parser completo';

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION importar_extrato_ofx IS 'Importa extrato bancário formato OFX (a implementar)';
