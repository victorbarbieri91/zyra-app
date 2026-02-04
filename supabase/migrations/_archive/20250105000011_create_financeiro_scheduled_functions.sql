-- =====================================================
-- MÓDULO FINANCEIRO - FUNÇÕES AGENDADAS (CRON)
-- =====================================================
-- Migration: Funções para execução automatizada via cron
-- - Atualizar status de parcelas vencidas (diário)
-- - Enviar lembretes de vencimento (diário)
-- - Processar faturamento automático (diário)
-- - Calcular métricas do dashboard (15 min)
-- - Enviar cobranças automáticas (diário)
-- =====================================================

-- =====================================================
-- FUNÇÃO: Processar parcelas vencidas
-- =====================================================

CREATE OR REPLACE FUNCTION processar_parcelas_vencidas()
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_count INTEGER;
BEGIN
  -- Atualizar status de parcelas
  v_count := atualizar_status_parcelas();

  -- Retornar resultado
  v_result := jsonb_build_object(
    'success', true,
    'parcelas_atualizadas', v_count,
    'executed_at', NOW()
  );

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'executed_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION processar_parcelas_vencidas IS 'Atualiza status de parcelas vencidas - executar diariamente';

-- =====================================================
-- FUNÇÃO: Enviar lembretes de vencimento
-- =====================================================

CREATE OR REPLACE FUNCTION enviar_lembretes_vencimento()
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_count INTEGER := 0;
  v_parcela RECORD;
BEGIN
  -- Buscar parcelas que vencem em 3, 7 ou 15 dias
  FOR v_parcela IN
    SELECT
      hp.id,
      hp.numero_parcela,
      hp.valor,
      hp.data_vencimento,
      h.numero_interno,
      h.responsavel_id,
      c.nome_completo AS cliente_nome,
      c.email AS cliente_email
    FROM honorarios_parcelas hp
    JOIN honorarios h ON h.id = hp.honorario_id
    JOIN clientes c ON c.id = h.cliente_id
    WHERE hp.status = 'pendente'
    AND hp.data_vencimento IN (
      CURRENT_DATE + INTERVAL '3 days',
      CURRENT_DATE + INTERVAL '7 days',
      CURRENT_DATE + INTERVAL '15 days'
    )
  LOOP
    -- Notificar responsável
    INSERT INTO notifications (
      user_id,
      tipo,
      titulo,
      mensagem,
      link,
      lida,
      prioridade
    ) VALUES (
      v_parcela.responsavel_id,
      'lembrete_vencimento',
      'Lembrete de Vencimento',
      'Parcela do cliente ' || v_parcela.cliente_nome ||
      ' vence em ' || TO_CHAR(v_parcela.data_vencimento, 'DD/MM/YYYY') ||
      '. Valor: R$ ' || TO_CHAR(v_parcela.valor, 'FM999G999G990D00'),
      '/financeiro/contas?tipo=receber',
      false,
      CASE
        WHEN v_parcela.data_vencimento = CURRENT_DATE + INTERVAL '3 days' THEN 'alta'
        ELSE 'media'
      END
    );

    -- TODO: Enviar email ao cliente (integrar com serviço de email)

    v_count := v_count + 1;
  END LOOP;

  -- Retornar resultado
  v_result := jsonb_build_object(
    'success', true,
    'lembretes_enviados', v_count,
    'executed_at', NOW()
  );

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'executed_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION enviar_lembretes_vencimento IS 'Envia lembretes de parcelas que vencem em 3, 7 ou 15 dias - executar diariamente';

-- =====================================================
-- FUNÇÃO: Processar faturamento automático
-- =====================================================

CREATE OR REPLACE FUNCTION processar_faturamento_automatico()
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_count INTEGER := 0;
  v_agendamento RECORD;
  v_fatura_id UUID;
  v_timesheet_ids UUID[];
  v_honorarios_ids UUID[];
BEGIN
  -- Buscar agendamentos para hoje
  FOR v_agendamento IN
    SELECT
      fa.id,
      fa.escritorio_id,
      fa.cliente_id,
      fa.dia_vencimento,
      fa.incluir_timesheet,
      fa.incluir_honorarios
    FROM faturas_agendamentos fa
    WHERE fa.ativo = true
    AND fa.proxima_execucao <= CURRENT_DATE
  LOOP
    -- Buscar timesheet aprovado não faturado
    IF v_agendamento.incluir_timesheet THEN
      SELECT ARRAY_AGG(t.id)
      INTO v_timesheet_ids
      FROM timesheet t
      WHERE (
        t.processo_id IN (SELECT id FROM processos WHERE cliente_id = v_agendamento.cliente_id)
        OR t.consulta_id IN (SELECT id FROM consultas WHERE cliente_id = v_agendamento.cliente_id)
      )
      AND t.aprovado = true
      AND t.faturado = false;
    END IF;

    -- Buscar honorários aprovados
    IF v_agendamento.incluir_honorarios THEN
      SELECT ARRAY_AGG(h.id)
      INTO v_honorarios_ids
      FROM honorarios h
      WHERE h.cliente_id = v_agendamento.cliente_id
      AND h.status = 'aprovado';
    END IF;

    -- Gerar fatura se houver itens
    IF COALESCE(array_length(v_timesheet_ids, 1), 0) > 0 OR
       COALESCE(array_length(v_honorarios_ids, 1), 0) > 0 THEN

      v_fatura_id := gerar_fatura(
        p_escritorio_id := v_agendamento.escritorio_id,
        p_cliente_id := v_agendamento.cliente_id,
        p_data_emissao := CURRENT_DATE,
        p_data_vencimento := DATE_TRUNC('month', CURRENT_DATE) +
          (v_agendamento.dia_vencimento - 1 || ' days')::INTERVAL,
        p_honorarios_ids := v_honorarios_ids,
        p_timesheet_ids := v_timesheet_ids,
        p_observacoes := 'Fatura gerada automaticamente'
      );

      v_count := v_count + 1;

      -- Atualizar próxima execução
      UPDATE faturas_agendamentos
      SET proxima_execucao = proxima_execucao + INTERVAL '1 month',
          ultima_execucao = CURRENT_DATE,
          updated_at = NOW()
      WHERE id = v_agendamento.id;
    END IF;
  END LOOP;

  -- Retornar resultado
  v_result := jsonb_build_object(
    'success', true,
    'faturas_geradas', v_count,
    'executed_at', NOW()
  );

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'executed_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION processar_faturamento_automatico IS 'Processa faturamento automático agendado - executar diariamente';

-- =====================================================
-- FUNÇÃO: Atualizar cache de métricas
-- =====================================================

CREATE OR REPLACE FUNCTION atualizar_cache_metricas()
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_count INTEGER := 0;
  v_escritorio RECORD;
  v_receita_mes NUMERIC;
  v_receita_mes_anterior NUMERIC;
  v_despesas_mes NUMERIC;
  v_pendente_receber NUMERIC;
  v_atrasado NUMERIC;
BEGIN
  -- Para cada escritório
  FOR v_escritorio IN SELECT id FROM escritorios LOOP

    -- Calcular receita do mês
    SELECT COALESCE(SUM(hp.valor_pago), 0)
    INTO v_receita_mes
    FROM honorarios_parcelas hp
    JOIN honorarios h ON h.id = hp.honorario_id
    WHERE h.escritorio_id = v_escritorio.id
    AND hp.status = 'pago'
    AND DATE_TRUNC('month', hp.data_pagamento) = DATE_TRUNC('month', CURRENT_DATE);

    -- Receita mês anterior
    SELECT COALESCE(SUM(hp.valor_pago), 0)
    INTO v_receita_mes_anterior
    FROM honorarios_parcelas hp
    JOIN honorarios h ON h.id = hp.honorario_id
    WHERE h.escritorio_id = v_escritorio.id
    AND hp.status = 'pago'
    AND DATE_TRUNC('month', hp.data_pagamento) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month');

    -- Despesas do mês
    SELECT COALESCE(SUM(valor), 0)
    INTO v_despesas_mes
    FROM despesas
    WHERE escritorio_id = v_escritorio.id
    AND status = 'pago'
    AND DATE_TRUNC('month', data_pagamento) = DATE_TRUNC('month', CURRENT_DATE);

    -- Pendente de receber
    SELECT COALESCE(SUM(hp.valor), 0)
    INTO v_pendente_receber
    FROM honorarios_parcelas hp
    JOIN honorarios h ON h.id = hp.honorario_id
    WHERE h.escritorio_id = v_escritorio.id
    AND hp.status = 'pendente';

    -- Atrasado
    SELECT COALESCE(SUM(hp.valor), 0)
    INTO v_atrasado
    FROM honorarios_parcelas hp
    JOIN honorarios h ON h.id = hp.honorario_id
    WHERE h.escritorio_id = v_escritorio.id
    AND hp.status = 'atrasado';

    -- Inserir ou atualizar cache
    INSERT INTO metricas_cache (
      escritorio_id,
      metrica_tipo,
      metrica_valor,
      metrica_data,
      metrica_metadata
    ) VALUES (
      v_escritorio.id,
      'financeiro_dashboard',
      jsonb_build_object(
        'receita_mes', v_receita_mes,
        'receita_mes_anterior', v_receita_mes_anterior,
        'despesas_mes', v_despesas_mes,
        'pendente_receber', v_pendente_receber,
        'atrasado', v_atrasado,
        'lucro_mes', v_receita_mes - v_despesas_mes,
        'variacao_receita', CASE
          WHEN v_receita_mes_anterior > 0
          THEN ((v_receita_mes - v_receita_mes_anterior) / v_receita_mes_anterior) * 100
          ELSE 0
        END
      ),
      CURRENT_DATE,
      jsonb_build_object('updated_at', NOW())
    )
    ON CONFLICT (escritorio_id, metrica_tipo, metrica_data)
    DO UPDATE SET
      metrica_valor = EXCLUDED.metrica_valor,
      metrica_metadata = EXCLUDED.metrica_metadata,
      updated_at = NOW();

    v_count := v_count + 1;
  END LOOP;

  -- Retornar resultado
  v_result := jsonb_build_object(
    'success', true,
    'escritorios_atualizados', v_count,
    'executed_at', NOW()
  );

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'executed_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION atualizar_cache_metricas IS 'Atualiza cache de métricas financeiras - executar a cada 15 minutos';

-- =====================================================
-- FUNÇÃO: Enviar cobranças automáticas
-- =====================================================

CREATE OR REPLACE FUNCTION enviar_cobrancas_automaticas()
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_count INTEGER := 0;
  v_parcela RECORD;
BEGIN
  -- Buscar parcelas atrasadas que não receberam cobrança nos últimos 7 dias
  FOR v_parcela IN
    SELECT
      hp.id AS parcela_id,
      hp.numero_parcela,
      hp.valor,
      hp.data_vencimento,
      hp.dias_atraso,
      h.numero_interno,
      h.responsavel_id,
      c.nome_completo AS cliente_nome,
      c.email AS cliente_email
    FROM honorarios_parcelas hp
    JOIN honorarios h ON h.id = hp.honorario_id
    JOIN clientes c ON c.id = h.cliente_id
    WHERE hp.status = 'atrasado'
    AND hp.dias_atraso >= 3
    AND NOT EXISTS (
      SELECT 1 FROM cobrancas_enviadas ce
      WHERE ce.parcela_id = hp.id
      AND ce.enviado_em > CURRENT_DATE - INTERVAL '7 days'
    )
  LOOP
    -- Registrar envio de cobrança
    INSERT INTO cobrancas_enviadas (
      tipo_cobranca,
      parcela_id,
      destinatario_email,
      assunto,
      mensagem
    ) VALUES (
      'parcela_atrasada',
      v_parcela.parcela_id,
      v_parcela.cliente_email,
      'Cobrança - Parcela em Atraso',
      'Prezado(a) ' || v_parcela.cliente_nome || ',

A parcela ' || v_parcela.numero_parcela || ' do contrato ' || v_parcela.numero_interno ||
' está em atraso há ' || v_parcela.dias_atraso || ' dias.

Valor: R$ ' || TO_CHAR(v_parcela.valor, 'FM999G999G990D00') ||
'
Vencimento: ' || TO_CHAR(v_parcela.data_vencimento, 'DD/MM/YYYY') ||
'

Por favor, regularize sua situação o quanto antes.

Atenciosamente.'
    );

    -- Notificar responsável
    INSERT INTO notifications (
      user_id,
      tipo,
      titulo,
      mensagem,
      link,
      lida
    ) VALUES (
      v_parcela.responsavel_id,
      'cobranca_enviada',
      'Cobrança Enviada',
      'Cobrança automática enviada para ' || v_parcela.cliente_nome ||
      ' (parcela ' || v_parcela.numero_parcela || ' - ' || v_parcela.dias_atraso || ' dias de atraso)',
      '/financeiro/contas?tipo=receber&status=atrasado',
      false
    );

    -- TODO: Integrar com serviço de email real

    v_count := v_count + 1;
  END LOOP;

  -- Retornar resultado
  v_result := jsonb_build_object(
    'success', true,
    'cobrancas_enviadas', v_count,
    'executed_at', NOW()
  );

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'executed_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION enviar_cobrancas_automaticas IS 'Envia cobranças automáticas para parcelas atrasadas - executar diariamente';

-- =====================================================
-- FUNÇÃO: Calcular juros em parcelas atrasadas
-- =====================================================

CREATE OR REPLACE FUNCTION calcular_juros_parcelas_atrasadas()
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_count INTEGER := 0;
  v_parcela RECORD;
  v_juros NUMERIC;
BEGIN
  -- Buscar parcelas atrasadas
  FOR v_parcela IN
    SELECT id, valor, dias_atraso
    FROM honorarios_parcelas
    WHERE status = 'atrasado'
    AND dias_atraso > 0
  LOOP
    -- Calcular juros (1% ao mês)
    v_juros := calcular_juros_atraso(v_parcela.id, 1.0);

    v_count := v_count + 1;
  END LOOP;

  -- Retornar resultado
  v_result := jsonb_build_object(
    'success', true,
    'parcelas_calculadas', v_count,
    'executed_at', NOW()
  );

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'executed_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION calcular_juros_parcelas_atrasadas IS 'Calcula juros em parcelas atrasadas - executar diariamente';

-- =====================================================
-- INSTRUÇÕES PARA CONFIGURAR CRON JOBS
-- =====================================================

/*
Para configurar os cron jobs no Supabase, use o seguinte SQL:

-- Executar diariamente às 6h (parcelas vencidas)
SELECT cron.schedule(
  'processar_parcelas_vencidas',
  '0 6 * * *',
  'SELECT processar_parcelas_vencidas()'
);

-- Executar diariamente às 8h (lembretes)
SELECT cron.schedule(
  'enviar_lembretes_vencimento',
  '0 8 * * *',
  'SELECT enviar_lembretes_vencimento()'
);

-- Executar diariamente às 9h (faturamento automático)
SELECT cron.schedule(
  'processar_faturamento_automatico',
  '0 9 * * *',
  'SELECT processar_faturamento_automatico()'
);

-- Executar a cada 15 minutos (cache de métricas)
SELECT cron.schedule(
  'atualizar_cache_metricas',
  '*/15 * * * *',
  'SELECT atualizar_cache_metricas()'
);

-- Executar diariamente às 10h (cobranças automáticas)
SELECT cron.schedule(
  'enviar_cobrancas_automaticas',
  '0 10 * * *',
  'SELECT enviar_cobrancas_automaticas()'
);

-- Executar diariamente às 7h (calcular juros)
SELECT cron.schedule(
  'calcular_juros_parcelas_atrasadas',
  '0 7 * * *',
  'SELECT calcular_juros_parcelas_atrasadas()'
);

-- Para visualizar jobs agendados:
SELECT * FROM cron.job;

-- Para desabilitar um job:
SELECT cron.unschedule('nome_do_job');
*/
