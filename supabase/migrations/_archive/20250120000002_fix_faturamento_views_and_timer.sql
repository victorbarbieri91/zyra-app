-- =====================================================
-- CORREÇÃO: Views de Faturamento e Função de Timer
-- Data: 2025-01-20
-- =====================================================
-- Problemas corrigidos:
-- 1. Views referenciavam crm_clientes (renomeada para crm_pessoas)
-- 2. finalizar_timer não definia aprovado = true
-- 3. View não suportava timesheet vinculado a consulta
-- =====================================================

-- =====================================================
-- 1. CORRIGIR VIEW: v_lancamentos_prontos_faturar
-- =====================================================
-- Atualiza referências de crm_clientes para crm_pessoas
-- Adiciona suporte a timesheet vinculado a consulta

DROP VIEW IF EXISTS v_lancamentos_prontos_faturar;

CREATE OR REPLACE VIEW v_lancamentos_prontos_faturar AS
WITH honorarios_disponiveis AS (
  SELECT
    h.id AS lancamento_id,
    'honorario' AS tipo_lancamento,
    h.escritorio_id,
    h.cliente_id,
    c.nome_completo AS cliente_nome,
    h.descricao,
    h.valor_total AS valor,
    NULL::numeric AS horas,
    h.processo_id,
    h.consulta_id,
    h.tipo_honorario AS categoria,
    h.created_at,
    -- Dados do processo (se houver)
    p.numero_cnj AS processo_numero,
    p.numero_pasta AS processo_pasta,
    CASE
      WHEN p.autor IS NOT NULL AND p.reu IS NOT NULL THEN p.autor || ' vs ' || p.reu
      WHEN p.autor IS NOT NULL THEN p.autor
      ELSE NULL
    END AS partes_resumo
  FROM financeiro_honorarios h
  JOIN crm_pessoas c ON c.id = h.cliente_id
  LEFT JOIN processos_processos p ON p.id = h.processo_id
  WHERE h.status = 'aprovado'
    AND h.fatura_id IS NULL
),
-- Timesheet vinculado a PROCESSO
timesheet_processo AS (
  SELECT
    t.id AS lancamento_id,
    'timesheet' AS tipo_lancamento,
    t.escritorio_id,
    p.cliente_id,
    cli.nome_completo AS cliente_nome,
    t.atividade AS descricao,
    NULL::numeric AS valor,
    t.horas,
    t.processo_id,
    NULL::uuid AS consulta_id,
    'timesheet' AS categoria,
    t.created_at,
    -- Dados do processo
    p.numero_cnj AS processo_numero,
    p.numero_pasta AS processo_pasta,
    CASE
      WHEN p.autor IS NOT NULL AND p.reu IS NOT NULL THEN p.autor || ' vs ' || p.reu
      WHEN p.autor IS NOT NULL THEN p.autor
      ELSE NULL
    END AS partes_resumo
  FROM financeiro_timesheet t
  JOIN processos_processos p ON t.processo_id = p.id
  JOIN crm_pessoas cli ON cli.id = p.cliente_id
  WHERE t.faturavel = true
    AND t.faturado = false
    AND t.aprovado = true
    AND t.reprovado = false
    AND t.fatura_id IS NULL
    AND t.processo_id IS NOT NULL
),
-- Timesheet vinculado a CONSULTA
timesheet_consulta AS (
  SELECT
    t.id AS lancamento_id,
    'timesheet' AS tipo_lancamento,
    t.escritorio_id,
    c.cliente_id,
    cli.nome_completo AS cliente_nome,
    t.atividade AS descricao,
    NULL::numeric AS valor,
    t.horas,
    NULL::uuid AS processo_id,
    t.consulta_id,
    'timesheet' AS categoria,
    t.created_at,
    -- Dados da consulta (sem processo)
    NULL::text AS processo_numero,
    NULL::text AS processo_pasta,
    c.assunto AS partes_resumo  -- Usa assunto da consulta como resumo
  FROM financeiro_timesheet t
  JOIN consultivo_consultas c ON t.consulta_id = c.id
  JOIN crm_pessoas cli ON cli.id = c.cliente_id
  WHERE t.faturavel = true
    AND t.faturado = false
    AND t.aprovado = true
    AND t.reprovado = false
    AND t.fatura_id IS NULL
    AND t.consulta_id IS NOT NULL
    AND t.processo_id IS NULL  -- Evita duplicação se tiver ambos
)
SELECT * FROM honorarios_disponiveis
UNION ALL
SELECT * FROM timesheet_processo
UNION ALL
SELECT * FROM timesheet_consulta
ORDER BY cliente_nome, created_at DESC;

COMMENT ON VIEW v_lancamentos_prontos_faturar IS 'Honorários e timesheet aprovados e disponíveis para faturamento (corrigido para crm_pessoas)';

-- =====================================================
-- 2. CORRIGIR VIEW: v_faturas_geradas
-- =====================================================

DROP VIEW IF EXISTS v_faturas_geradas;

CREATE OR REPLACE VIEW v_faturas_geradas AS
SELECT
  f.id AS fatura_id,
  f.escritorio_id,
  f.numero_fatura,
  f.cliente_id,
  c.nome_completo AS cliente_nome,
  c.email_principal AS cliente_email,
  f.data_emissao,
  f.data_vencimento,
  f.valor_total,
  f.status,
  f.parcelado,
  f.numero_parcelas,
  f.observacoes,
  f.pdf_url,
  f.enviada_em,
  f.paga_em,
  f.gerada_automaticamente,
  -- Contadores de itens
  (SELECT COUNT(*) FROM financeiro_faturamento_itens fi WHERE fi.fatura_id = f.id AND fi.tipo_item = 'honorario') AS qtd_honorarios,
  (SELECT COUNT(*) FROM financeiro_faturamento_itens fi WHERE fi.fatura_id = f.id AND fi.tipo_item = 'timesheet') AS qtd_horas,
  -- Totalizadores por tipo
  (SELECT COALESCE(SUM(fi.valor_total), 0) FROM financeiro_faturamento_itens fi WHERE fi.fatura_id = f.id AND fi.tipo_item = 'honorario') AS total_honorarios,
  (SELECT COALESCE(SUM(fi.valor_total), 0) FROM financeiro_faturamento_itens fi WHERE fi.fatura_id = f.id AND fi.tipo_item = 'timesheet') AS total_horas,
  -- Total de horas
  (SELECT COALESCE(SUM(fi.quantidade), 0) FROM financeiro_faturamento_itens fi WHERE fi.fatura_id = f.id AND fi.tipo_item = 'timesheet') AS soma_horas,
  -- Timestamps
  f.created_at,
  f.updated_at,
  -- Categorização de urgência
  CASE
    WHEN f.status = 'paga' THEN 'pago'
    WHEN f.status = 'cancelada' THEN 'cancelado'
    WHEN f.status = 'rascunho' THEN 'rascunho'
    WHEN f.data_vencimento < CURRENT_DATE THEN 'vencido'
    WHEN f.data_vencimento <= CURRENT_DATE + INTERVAL '7 days' THEN 'vence_breve'
    ELSE 'normal'
  END AS categoria_status,
  -- Dias até vencimento
  CASE
    WHEN f.status IN ('paga', 'cancelada', 'rascunho') THEN NULL
    ELSE (f.data_vencimento - CURRENT_DATE)::INTEGER
  END AS dias_ate_vencimento
FROM financeiro_faturamento_faturas f
JOIN crm_pessoas c ON c.id = f.cliente_id
ORDER BY f.created_at DESC;

COMMENT ON VIEW v_faturas_geradas IS 'Faturas com informações consolidadas (corrigido para crm_pessoas)';

-- =====================================================
-- 3. CORRIGIR FUNÇÃO: finalizar_timer
-- =====================================================
-- Adiciona aprovado = true para que entre no disponível para faturar

CREATE OR REPLACE FUNCTION finalizar_timer(
  p_timer_id UUID,
  p_descricao TEXT DEFAULT NULL,
  p_ajuste_minutos INTEGER DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_timer RECORD;
  v_segundos_total INTEGER;
  v_horas NUMERIC(8,2);
  v_timesheet_id UUID;
  v_hora_fim TIMESTAMPTZ;
BEGIN
  -- Buscar timer
  SELECT * INTO v_timer FROM timers_ativos WHERE id = p_timer_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Timer não encontrado';
  END IF;

  -- Calcular tempo total
  IF v_timer.status = 'rodando' THEN
    v_segundos_total := v_timer.segundos_acumulados +
      EXTRACT(EPOCH FROM (NOW() - v_timer.hora_inicio))::INTEGER;
    v_hora_fim := NOW();
  ELSE
    v_segundos_total := v_timer.segundos_acumulados;
    v_hora_fim := v_timer.hora_pausa;
  END IF;

  -- Aplicar ajuste (pode ser positivo ou negativo)
  v_segundos_total := v_segundos_total + (p_ajuste_minutos * 60);

  -- Converter para horas (mínimo 0.01)
  v_horas := GREATEST(0.01, ROUND(v_segundos_total / 3600.0, 2));

  -- Criar registro no timesheet COM APROVADO = TRUE
  INSERT INTO financeiro_timesheet (
    escritorio_id,
    user_id,
    processo_id,
    consulta_id,
    tarefa_id,
    data_trabalho,
    horas,
    atividade,
    faturavel,
    aprovado,         -- NOVO: marca como aprovado
    reprovado,        -- NOVO: marca como não reprovado
    hora_inicio,
    hora_fim,
    origem
  ) VALUES (
    v_timer.escritorio_id,
    v_timer.user_id,
    v_timer.processo_id,
    v_timer.consulta_id,
    v_timer.tarefa_id,
    (v_timer.hora_inicio AT TIME ZONE 'America/Sao_Paulo')::DATE,
    v_horas,
    COALESCE(p_descricao, v_timer.descricao, v_timer.titulo),
    v_timer.faturavel,
    true,             -- NOVO: aprovado automaticamente
    false,            -- NOVO: não reprovado
    v_timer.hora_inicio,
    v_hora_fim,
    'timer'
  )
  RETURNING id INTO v_timesheet_id;

  -- Remover timer
  DELETE FROM timers_ativos WHERE id = p_timer_id;

  RETURN v_timesheet_id;
END;
$$;

COMMENT ON FUNCTION finalizar_timer IS 'Finaliza timer e cria registro APROVADO no timesheet (pronto para faturar)';

-- =====================================================
-- 4. CORRIGIR FUNÇÃO: registrar_tempo_retroativo
-- =====================================================
-- Também marca como aprovado

CREATE OR REPLACE FUNCTION registrar_tempo_retroativo(
  p_escritorio_id UUID,
  p_user_id UUID,
  p_data_trabalho DATE,
  p_hora_inicio TIME,
  p_hora_fim TIME,
  p_atividade TEXT,
  p_processo_id UUID DEFAULT NULL,
  p_consulta_id UUID DEFAULT NULL,
  p_tarefa_id UUID DEFAULT NULL,
  p_faturavel BOOLEAN DEFAULT true
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_horas NUMERIC(8,2);
  v_timesheet_id UUID;
  v_hora_inicio_ts TIMESTAMPTZ;
  v_hora_fim_ts TIMESTAMPTZ;
BEGIN
  -- Validar que tem processo ou consulta
  IF p_processo_id IS NULL AND p_consulta_id IS NULL THEN
    RAISE EXCEPTION 'Registro deve estar vinculado a um processo ou consulta';
  END IF;

  -- Validar horários
  IF p_hora_fim <= p_hora_inicio THEN
    RAISE EXCEPTION 'Hora fim deve ser maior que hora início';
  END IF;

  -- Calcular horas
  v_horas := ROUND(EXTRACT(EPOCH FROM (p_hora_fim - p_hora_inicio)) / 3600.0, 2);

  -- Construir timestamps completos
  v_hora_inicio_ts := (p_data_trabalho || ' ' || p_hora_inicio)::TIMESTAMPTZ;
  v_hora_fim_ts := (p_data_trabalho || ' ' || p_hora_fim)::TIMESTAMPTZ;

  -- Criar registro COM APROVADO = TRUE
  INSERT INTO financeiro_timesheet (
    escritorio_id,
    user_id,
    processo_id,
    consulta_id,
    tarefa_id,
    data_trabalho,
    horas,
    atividade,
    faturavel,
    aprovado,         -- NOVO
    reprovado,        -- NOVO
    hora_inicio,
    hora_fim,
    origem
  ) VALUES (
    p_escritorio_id,
    p_user_id,
    p_processo_id,
    p_consulta_id,
    p_tarefa_id,
    p_data_trabalho,
    v_horas,
    p_atividade,
    p_faturavel,
    true,             -- NOVO: aprovado automaticamente
    false,            -- NOVO: não reprovado
    v_hora_inicio_ts,
    v_hora_fim_ts,
    'retroativo'
  )
  RETURNING id INTO v_timesheet_id;

  RETURN v_timesheet_id;
END;
$$;

COMMENT ON FUNCTION registrar_tempo_retroativo IS 'Registra tempo retroativo APROVADO (pronto para faturar)';

-- =====================================================
-- 5. ATUALIZAR TIMESHEET EXISTENTE SEM APROVAÇÃO
-- =====================================================
-- Marca registros existentes de timer/retroativo como aprovados
-- (só os que ainda não foram faturados)

UPDATE financeiro_timesheet
SET aprovado = true, reprovado = false
WHERE origem IN ('timer', 'retroativo')
  AND aprovado = false
  AND faturado = false
  AND fatura_id IS NULL;

-- =====================================================
-- 6. CORRIGIR FUNÇÃO gerar_fatura_v2
-- =====================================================
-- Atualiza para buscar cliente via consulta também

CREATE OR REPLACE FUNCTION gerar_fatura_v2(
  p_escritorio_id UUID,
  p_cliente_id UUID,
  p_honorarios_ids UUID[] DEFAULT NULL,
  p_timesheet_ids UUID[] DEFAULT NULL,
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
  v_honorario RECORD;
  v_timesheet RECORD;
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

    -- Agrupar por atividade (suporta processo OU consulta)
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

COMMENT ON FUNCTION gerar_fatura_v2 IS 'Gera fatura consolidada com seleção de honorários e timesheet (suporta processo e consulta)';
