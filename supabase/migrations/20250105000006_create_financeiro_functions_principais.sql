-- =====================================================
-- MÓDULO FINANCEIRO - FUNÇÕES PRINCIPAIS
-- =====================================================
-- Migration: Funções de negócio principais
-- - criar_honorario (criação de honorário com parcelas)
-- - lancar_etapa_honorario (lançamento de etapas pagas)
-- - aprovar_timesheet (aprovação de horas)
-- - reprovar_timesheet (reprovação de horas)
-- - faturar_horas (faturamento de timesheet)
-- - calcular_comissao (cálculo de comissões)
-- - atualizar_status_parcelas (atualização de status por vencimento)
-- - calcular_juros_atraso (cálculo de juros em parcelas)
-- =====================================================

-- =====================================================
-- CRIAR HONORÁRIO COM PARCELAS
-- =====================================================

CREATE OR REPLACE FUNCTION criar_honorario(
  p_escritorio_id UUID,
  p_cliente_id UUID,
  p_processo_id UUID DEFAULT NULL,
  p_consulta_id UUID DEFAULT NULL,
  p_tipo_honorario TEXT,
  p_valor_total NUMERIC,
  p_descricao TEXT,
  p_responsavel_id UUID,
  p_parcelado BOOLEAN DEFAULT false,
  p_numero_parcelas INTEGER DEFAULT 1,
  p_data_vencimento_primeira DATE DEFAULT NULL,
  p_etapas JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_honorario_id UUID;
  v_numero_interno TEXT;
  v_contador INTEGER;
  v_parcela_numero INTEGER;
  v_parcela_valor NUMERIC;
  v_parcela_vencimento DATE;
  v_etapa JSONB;
BEGIN
  -- Validações
  IF p_processo_id IS NULL AND p_consulta_id IS NULL THEN
    RAISE EXCEPTION 'Honorário deve estar vinculado a um Processo ou Consulta';
  END IF;

  IF p_tipo_honorario NOT IN ('fixo', 'hora', 'exito', 'misto') THEN
    RAISE EXCEPTION 'Tipo de honorário inválido';
  END IF;

  IF p_parcelado AND p_numero_parcelas < 2 THEN
    RAISE EXCEPTION 'Honorário parcelado deve ter pelo menos 2 parcelas';
  END IF;

  -- Gerar número interno sequencial
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero_interno FROM 'HON-\d{4}-(\d+)') AS INTEGER)), 0) + 1
  INTO v_contador
  FROM honorarios
  WHERE escritorio_id = p_escritorio_id
  AND numero_interno LIKE 'HON-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-%';

  v_numero_interno := 'HON-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(v_contador::TEXT, 3, '0');

  -- Inserir honorário
  INSERT INTO honorarios (
    escritorio_id,
    cliente_id,
    processo_id,
    consulta_id,
    tipo_honorario,
    valor_total,
    descricao,
    responsavel_id,
    numero_interno,
    parcelado,
    numero_parcelas,
    status,
    etapas_valores
  ) VALUES (
    p_escritorio_id,
    p_cliente_id,
    p_processo_id,
    p_consulta_id,
    p_tipo_honorario,
    p_valor_total,
    p_descricao,
    p_responsavel_id,
    v_numero_interno,
    p_parcelado,
    p_numero_parcelas,
    'rascunho',
    p_etapas
  ) RETURNING id INTO v_honorario_id;

  -- Criar parcelas
  IF p_parcelado THEN
    v_parcela_valor := ROUND(p_valor_total / p_numero_parcelas, 2);
    v_parcela_vencimento := COALESCE(p_data_vencimento_primeira, CURRENT_DATE + INTERVAL '30 days');

    FOR v_parcela_numero IN 1..p_numero_parcelas LOOP
      -- Ajustar última parcela para compensar arredondamentos
      IF v_parcela_numero = p_numero_parcelas THEN
        v_parcela_valor := p_valor_total - (v_parcela_valor * (p_numero_parcelas - 1));
      END IF;

      INSERT INTO honorarios_parcelas (
        honorario_id,
        numero_parcela,
        valor,
        data_vencimento,
        status
      ) VALUES (
        v_honorario_id,
        v_parcela_numero,
        v_parcela_valor,
        v_parcela_vencimento + ((v_parcela_numero - 1) * INTERVAL '30 days'),
        'pendente'
      );
    END LOOP;
  ELSE
    -- Parcela única
    INSERT INTO honorarios_parcelas (
      honorario_id,
      numero_parcela,
      valor,
      data_vencimento,
      status
    ) VALUES (
      v_honorario_id,
      1,
      p_valor_total,
      COALESCE(p_data_vencimento_primeira, CURRENT_DATE + INTERVAL '30 days'),
      'pendente'
    );
  END IF;

  -- Registrar na timeline
  INSERT INTO honorarios_timeline (
    honorario_id,
    evento,
    dados,
    user_id
  ) VALUES (
    v_honorario_id,
    'criado',
    jsonb_build_object(
      'numero_interno', v_numero_interno,
      'valor_total', p_valor_total,
      'tipo', p_tipo_honorario
    ),
    p_responsavel_id
  );

  RETURN v_honorario_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION criar_honorario IS 'Cria honorário com parcelas automáticas';

-- =====================================================
-- LANÇAR ETAPA DE HONORÁRIO
-- =====================================================

CREATE OR REPLACE FUNCTION lancar_etapa_honorario(
  p_honorario_id UUID,
  p_etapa_nome TEXT,
  p_valor_etapa NUMERIC,
  p_data_conclusao DATE DEFAULT CURRENT_DATE,
  p_user_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_etapas JSONB;
  v_etapa_index INTEGER;
  v_etapa JSONB;
  v_etapa_encontrada BOOLEAN := false;
BEGIN
  -- Buscar honorário e etapas
  SELECT etapas_valores INTO v_etapas
  FROM honorarios
  WHERE id = p_honorario_id;

  IF v_etapas IS NULL THEN
    RAISE EXCEPTION 'Honorário não possui etapas configuradas';
  END IF;

  -- Procurar etapa e marcar como paga
  FOR v_etapa_index IN 0..(jsonb_array_length(v_etapas) - 1) LOOP
    v_etapa := v_etapas->v_etapa_index;

    IF v_etapa->>'etapa' = p_etapa_nome AND (v_etapa->>'paga')::BOOLEAN = false THEN
      v_etapa := jsonb_set(v_etapa, '{paga}', 'true');
      v_etapa := jsonb_set(v_etapa, '{data_pagamento}', to_jsonb(p_data_conclusao::TEXT));
      v_etapas := jsonb_set(v_etapas, ARRAY[v_etapa_index::TEXT], v_etapa);
      v_etapa_encontrada := true;
      EXIT;
    END IF;
  END LOOP;

  IF NOT v_etapa_encontrada THEN
    RAISE EXCEPTION 'Etapa não encontrada ou já paga';
  END IF;

  -- Atualizar honorário
  UPDATE honorarios
  SET etapas_valores = v_etapas,
      updated_at = NOW()
  WHERE id = p_honorario_id;

  -- Registrar na timeline
  INSERT INTO honorarios_timeline (
    honorario_id,
    evento,
    dados,
    user_id
  ) VALUES (
    p_honorario_id,
    'etapa_lancada',
    jsonb_build_object(
      'etapa', p_etapa_nome,
      'valor', p_valor_etapa,
      'data_conclusao', p_data_conclusao
    ),
    p_user_id
  );

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION lancar_etapa_honorario IS 'Lança etapa paga de honorário baseado em êxito/misto';

-- =====================================================
-- APROVAR TIMESHEET
-- =====================================================

CREATE OR REPLACE FUNCTION aprovar_timesheet(
  p_timesheet_ids UUID[],
  p_aprovado_por UUID,
  p_observacoes TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_timesheet_id UUID;
BEGIN
  FOREACH v_timesheet_id IN ARRAY p_timesheet_ids LOOP
    UPDATE timesheet
    SET aprovado = true,
        aprovado_por = p_aprovado_por,
        aprovado_em = NOW(),
        reprovado = false,
        updated_at = NOW()
    WHERE id = v_timesheet_id
    AND aprovado = false
    AND reprovado = false;

    IF FOUND THEN
      v_count := v_count + 1;
    END IF;
  END LOOP;

  -- Criar notificação para os colaboradores
  INSERT INTO notifications (
    user_id,
    tipo,
    titulo,
    mensagem,
    link,
    lida
  )
  SELECT DISTINCT
    t.user_id,
    'timesheet_aprovado',
    'Timesheet Aprovado',
    'Suas horas de ' || TO_CHAR(t.data_trabalho, 'DD/MM/YYYY') || ' foram aprovadas',
    '/financeiro/timesheet',
    false
  FROM timesheet t
  WHERE t.id = ANY(p_timesheet_ids);

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION aprovar_timesheet IS 'Aprova múltiplos registros de timesheet';

-- =====================================================
-- REPROVAR TIMESHEET
-- =====================================================

CREATE OR REPLACE FUNCTION reprovar_timesheet(
  p_timesheet_ids UUID[],
  p_reprovado_por UUID,
  p_justificativa TEXT
) RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_timesheet_id UUID;
BEGIN
  IF p_justificativa IS NULL OR LENGTH(TRIM(p_justificativa)) < 10 THEN
    RAISE EXCEPTION 'Justificativa de reprovação é obrigatória (mínimo 10 caracteres)';
  END IF;

  FOREACH v_timesheet_id IN ARRAY p_timesheet_ids LOOP
    UPDATE timesheet
    SET reprovado = true,
        reprovado_por = p_reprovado_por,
        reprovado_em = NOW(),
        justificativa_reprovacao = p_justificativa,
        aprovado = false,
        updated_at = NOW()
    WHERE id = v_timesheet_id
    AND aprovado = false
    AND reprovado = false;

    IF FOUND THEN
      v_count := v_count + 1;
    END IF;
  END LOOP;

  -- Criar notificação para os colaboradores
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
    t.user_id,
    'timesheet_reprovado',
    'Timesheet Reprovado',
    'Suas horas de ' || TO_CHAR(t.data_trabalho, 'DD/MM/YYYY') || ' foram reprovadas. Motivo: ' || p_justificativa,
    '/financeiro/timesheet',
    false,
    'alta'
  FROM timesheet t
  WHERE t.id = ANY(p_timesheet_ids);

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION reprovar_timesheet IS 'Reprova múltiplos registros de timesheet com justificativa';

-- =====================================================
-- FATURAR HORAS (TIMESHEET)
-- =====================================================

CREATE OR REPLACE FUNCTION faturar_horas(
  p_timesheet_ids UUID[],
  p_fatura_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_timesheet_id UUID;
  v_total_horas NUMERIC := 0;
BEGIN
  -- Validar que todos os timesheets estão aprovados
  IF EXISTS (
    SELECT 1 FROM timesheet
    WHERE id = ANY(p_timesheet_ids)
    AND (aprovado = false OR faturado = true)
  ) THEN
    RAISE EXCEPTION 'Apenas timesheets aprovados e não faturados podem ser incluídos na fatura';
  END IF;

  -- Marcar timesheets como faturados
  FOREACH v_timesheet_id IN ARRAY p_timesheet_ids LOOP
    UPDATE timesheet
    SET faturado = true,
        fatura_id = p_fatura_id,
        faturado_em = NOW(),
        updated_at = NOW()
    WHERE id = v_timesheet_id;

    -- Acumular horas
    SELECT SUM(horas) INTO v_total_horas
    FROM timesheet
    WHERE id = ANY(p_timesheet_ids);
  END LOOP;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION faturar_horas IS 'Marca timesheet como faturado e vincula à fatura';

-- =====================================================
-- CALCULAR COMISSÃO
-- =====================================================

CREATE OR REPLACE FUNCTION calcular_comissao(
  p_pagamento_id UUID
) RETURNS VOID AS $$
DECLARE
  v_pagamento RECORD;
  v_honorario RECORD;
  v_percentual NUMERIC;
  v_valor_comissao NUMERIC;
BEGIN
  -- Buscar dados do pagamento
  SELECT
    p.id,
    p.valor,
    p.honorario_parcela_id,
    hp.honorario_id
  INTO v_pagamento
  FROM pagamentos p
  JOIN honorarios_parcelas hp ON hp.id = p.honorario_parcela_id
  WHERE p.id = p_pagamento_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Buscar honorário e responsável
  SELECT
    h.id,
    h.responsavel_id,
    h.escritorio_id
  INTO v_honorario
  FROM honorarios h
  WHERE h.id = v_pagamento.honorario_id;

  -- Buscar configuração de comissão
  SELECT percentual_comissao INTO v_percentual
  FROM user_escritorios_roles
  WHERE user_id = v_honorario.responsavel_id
  AND escritorio_id = v_honorario.escritorio_id;

  IF v_percentual IS NULL OR v_percentual <= 0 THEN
    RETURN; -- Sem comissão configurada
  END IF;

  -- Calcular valor
  v_valor_comissao := ROUND((v_pagamento.valor * v_percentual / 100), 2);

  -- Inserir comissão
  INSERT INTO comissoes (
    escritorio_id,
    user_id,
    honorario_id,
    pagamento_id,
    valor_base,
    percentual,
    valor_comissao,
    status
  ) VALUES (
    v_honorario.escritorio_id,
    v_honorario.responsavel_id,
    v_honorario.id,
    p_pagamento_id,
    v_pagamento.valor,
    v_percentual,
    v_valor_comissao,
    'pendente'
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Log error mas não falha a transação principal
    RAISE NOTICE 'Erro ao calcular comissão: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION calcular_comissao IS 'Calcula e registra comissão sobre pagamento';

-- =====================================================
-- ATUALIZAR STATUS DE PARCELAS (por vencimento)
-- =====================================================

CREATE OR REPLACE FUNCTION atualizar_status_parcelas()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  -- Atualizar parcelas vencidas
  UPDATE honorarios_parcelas
  SET status = 'atrasado',
      dias_atraso = CURRENT_DATE - data_vencimento,
      updated_at = NOW()
  WHERE status = 'pendente'
  AND data_vencimento < CURRENT_DATE;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Criar notificações para parcelas recém-atrasadas
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
    h.responsavel_id,
    'parcela_atrasada',
    'Parcela em Atraso',
    'Cliente ' || c.nome_completo || ' possui parcela vencida em ' || TO_CHAR(hp.data_vencimento, 'DD/MM/YYYY'),
    '/financeiro/contas?tipo=receber&status=atrasado',
    false,
    'alta'
  FROM honorarios_parcelas hp
  JOIN honorarios h ON h.id = hp.honorario_id
  JOIN clientes c ON c.id = h.cliente_id
  WHERE hp.status = 'atrasado'
  AND hp.dias_atraso = 1; -- Apenas no primeiro dia de atraso

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION atualizar_status_parcelas IS 'Atualiza status de parcelas vencidas (executar diariamente)';

-- =====================================================
-- CALCULAR JUROS DE ATRASO
-- =====================================================

CREATE OR REPLACE FUNCTION calcular_juros_atraso(
  p_parcela_id UUID,
  p_percentual_mes NUMERIC DEFAULT 1.0
) RETURNS NUMERIC AS $$
DECLARE
  v_parcela RECORD;
  v_juros NUMERIC;
BEGIN
  SELECT valor, dias_atraso
  INTO v_parcela
  FROM honorarios_parcelas
  WHERE id = p_parcela_id
  AND status = 'atrasado';

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Juros simples: valor * (percentual/30) * dias
  v_juros := ROUND(
    v_parcela.valor * (p_percentual_mes / 30.0) * v_parcela.dias_atraso,
    2
  );

  -- Atualizar parcela com juros
  UPDATE honorarios_parcelas
  SET juros_aplicados = v_juros,
      updated_at = NOW()
  WHERE id = p_parcela_id;

  RETURN v_juros;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION calcular_juros_atraso IS 'Calcula juros simples sobre parcela atrasada';
