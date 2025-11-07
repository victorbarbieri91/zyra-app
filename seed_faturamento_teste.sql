-- =====================================================
-- SEED: DADOS DE TESTE PARA FATURAMENTO
-- =====================================================
-- Este script cria lançamentos de teste para o módulo de faturamento
-- Inclui: honorários, timesheet e faturas geradas
-- =====================================================

-- Variáveis (ajustar conforme seu ambiente)
DO $$
DECLARE
  v_escritorio_id UUID := 'f2568999-0ae6-47db-9293-a6f1672ed421';
  v_user_id UUID := 'a7aebc01-3bc4-4f1d-a0c6-cddd0ac0941a';
  v_cliente_1 UUID := '97462dc1-1145-46ad-96eb-f284ee0c4c5b';
  v_cliente_2 UUID := 'd6a1888a-89e5-4c8c-b585-3cd6024fe351';
  v_cliente_3 UUID := '50896d5b-f5c3-45d8-8e17-2ec7f2a83e5d';
  v_processo_1 UUID := 'f54892e8-c1f1-4979-b14f-bbf9f4afe0f8';
  v_processo_2 UUID := '1321578e-176d-42b4-9ccb-b0a0b131f797';
  v_processo_3 UUID := '2ef5dbda-3f8c-40c6-baac-906d6bd49057';
  v_honorario_id UUID;
  v_timesheet_id UUID;
  v_fatura_id UUID;
BEGIN
  -- =====================================================
  -- HONORÁRIOS APROVADOS (PRONTOS PARA FATURAR)
  -- =====================================================

  -- Cliente 1 - 2 honorários
  INSERT INTO financeiro_honorarios (
    escritorio_id, cliente_id, processo_id, tipo_honorario,
    valor_total, descricao, responsavel_id, numero_interno, status
  ) VALUES
  (v_escritorio_id, v_cliente_1, v_processo_1, 'contratual',
   25000.00, 'Honorários contratuais - Ação Trabalhista', v_user_id, 'HON-2025-001', 'aprovado'),
  (v_escritorio_id, v_cliente_1, v_processo_1, 'exito',
   50000.00, 'Honorários de êxito - Sentença favorável', v_user_id, 'HON-2025-002', 'aprovado');

  -- Cliente 2 - 1 honorário
  INSERT INTO financeiro_honorarios (
    escritorio_id, cliente_id, processo_id, tipo_honorario,
    valor_total, descricao, responsavel_id, numero_interno, status
  ) VALUES
  (v_escritorio_id, v_cliente_2, v_processo_2, 'fixo',
   15000.00, 'Honorários fixos - Consultoria jurídica', v_user_id, 'HON-2025-003', 'aprovado');

  -- Cliente 3 - 1 honorário
  INSERT INTO financeiro_honorarios (
    escritorio_id, cliente_id, processo_id, tipo_honorario,
    valor_total, descricao, responsavel_id, numero_interno, status
  ) VALUES
  (v_escritorio_id, v_cliente_3, v_processo_3, 'contratual',
   30000.00, 'Honorários contratuais - Processo Cível', v_user_id, 'HON-2025-004', 'aprovado');

  -- =====================================================
  -- TIMESHEET APROVADO (PRONTOS PARA FATURAR)
  -- =====================================================

  -- Cliente 1 - 30 horas
  INSERT INTO financeiro_timesheet (
    escritorio_id, user_id, processo_id, data_trabalho, horas,
    atividade, faturavel, aprovado, aprovado_por, aprovado_em
  ) VALUES
  (v_escritorio_id, v_user_id, v_processo_1, CURRENT_DATE - INTERVAL '10 days', 8.0,
   'Elaboração de petição inicial', true, true, v_user_id, NOW()),
  (v_escritorio_id, v_user_id, v_processo_1, CURRENT_DATE - INTERVAL '8 days', 6.5,
   'Análise de documentação', true, true, v_user_id, NOW()),
  (v_escritorio_id, v_user_id, v_processo_1, CURRENT_DATE - INTERVAL '5 days', 4.0,
   'Audiência de conciliação', true, true, v_user_id, NOW()),
  (v_escritorio_id, v_user_id, v_processo_1, CURRENT_DATE - INTERVAL '3 days', 5.5,
   'Elaboração de contestação', true, true, v_user_id, NOW()),
  (v_escritorio_id, v_user_id, v_processo_1, CURRENT_DATE - INTERVAL '1 day', 6.0,
   'Pesquisa jurisprudencial', true, true, v_user_id, NOW());

  -- Cliente 2 - 20 horas
  INSERT INTO financeiro_timesheet (
    escritorio_id, user_id, processo_id, data_trabalho, horas,
    atividade, faturavel, aprovado, aprovado_por, aprovado_em
  ) VALUES
  (v_escritorio_id, v_user_id, v_processo_2, CURRENT_DATE - INTERVAL '12 days', 7.0,
   'Reunião com cliente', true, true, v_user_id, NOW()),
  (v_escritorio_id, v_user_id, v_processo_2, CURRENT_DATE - INTERVAL '9 days', 5.5,
   'Redação de parecer jurídico', true, true, v_user_id, NOW()),
  (v_escritorio_id, v_user_id, v_processo_2, CURRENT_DATE - INTERVAL '6 days', 4.0,
   'Análise de contrato', true, true, v_user_id, NOW()),
  (v_escritorio_id, v_user_id, v_processo_2, CURRENT_DATE - INTERVAL '2 days', 3.5,
   'Revisão de documentos', true, true, v_user_id, NOW());

  -- Cliente 3 - 15 horas
  INSERT INTO financeiro_timesheet (
    escritorio_id, user_id, processo_id, data_trabalho, horas,
    atividade, faturavel, aprovado, aprovado_por, aprovado_em
  ) VALUES
  (v_escritorio_id, v_user_id, v_processo_3, CURRENT_DATE - INTERVAL '7 days', 8.0,
   'Audiência e sustentação oral', true, true, v_user_id, NOW()),
  (v_escritorio_id, v_user_id, v_processo_3, CURRENT_DATE - INTERVAL '4 days', 4.5,
   'Elaboração de recurso', true, true, v_user_id, NOW()),
  (v_escritorio_id, v_user_id, v_processo_3, CURRENT_DATE - INTERVAL '1 day', 2.5,
   'Acompanhamento processual', true, true, v_user_id, NOW());

  -- =====================================================
  -- FATURAS GERADAS (PARA TESTE NA ABA "FATURADOS")
  -- =====================================================

  -- Fatura 1 - Cliente 1 (com 1 honorário + horas)
  SELECT gerar_fatura_v2(
    p_escritorio_id := v_escritorio_id,
    p_cliente_id := v_cliente_1,
    p_honorarios_ids := NULL, -- Vamos deixar sem honorários nesta para testar
    p_timesheet_ids := (
      SELECT array_agg(id)
      FROM financeiro_timesheet
      WHERE processo_id = v_processo_1
      AND aprovado = true
      AND NOT faturado
      LIMIT 3
    ),
    p_data_emissao := CURRENT_DATE - INTERVAL '15 days',
    p_data_vencimento := CURRENT_DATE + INTERVAL '15 days',
    p_observacoes := 'Fatura de teste - Cliente 1',
    p_user_id := v_user_id
  ) INTO v_fatura_id;

  RAISE NOTICE 'Fatura 1 criada: %', v_fatura_id;

  -- Fatura 2 - Cliente 2 (com 1 honorário)
  SELECT gerar_fatura_v2(
    p_escritorio_id := v_escritorio_id,
    p_cliente_id := v_cliente_2,
    p_honorarios_ids := ARRAY[
      (SELECT id FROM financeiro_honorarios WHERE cliente_id = v_cliente_2 AND status = 'aprovado' LIMIT 1)
    ],
    p_timesheet_ids := NULL,
    p_data_emissao := CURRENT_DATE - INTERVAL '10 days',
    p_data_vencimento := CURRENT_DATE + INTERVAL '20 days',
    p_observacoes := 'Fatura de teste - Cliente 2',
    p_user_id := v_user_id
  ) INTO v_fatura_id;

  RAISE NOTICE 'Fatura 2 criada: %', v_fatura_id;

  RAISE NOTICE '===== SEED CONCLUÍDO =====';
  RAISE NOTICE 'Honorários criados: 4 (Cliente 1: 2, Cliente 2: 1, Cliente 3: 1)';
  RAISE NOTICE 'Timesheet criado: 12 entradas (Cliente 1: 5, Cliente 2: 4, Cliente 3: 3)';
  RAISE NOTICE 'Faturas criadas: 2 (Cliente 1: horas, Cliente 2: honorário)';
  RAISE NOTICE 'Prontos para faturar: Cliente 1 (2 honorários + 2 horas restantes), Cliente 2 (4 horas), Cliente 3 (1 honorário + 3 horas)';
END $$;
