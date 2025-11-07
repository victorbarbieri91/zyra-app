-- =====================================================
-- MÓDULO FINANCEIRO - MELHORIAS DE FATURAMENTO
-- =====================================================
-- Migration: Views e funções para faturamento melhorado
-- - v_lancamentos_prontos_faturar (honorários e timesheet disponíveis)
-- - v_faturas_geradas (faturas com detalhes consolidados)
-- - Atualização função desmanchar_fatura
-- =====================================================

-- =====================================================
-- VIEW: LANÇAMENTOS PRONTOS PARA FATURAR
-- =====================================================
-- Consolida honorários e timesheet disponíveis por cliente

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
    NULL AS horas,
    h.processo_id,
    h.consulta_id,
    h.tipo_honorario AS categoria,
    h.created_at
  FROM financeiro_honorarios h
  JOIN crm_clientes c ON c.id = h.cliente_id
  WHERE h.status = 'aprovado'
    AND h.fatura_id IS NULL
),
timesheet_disponivel AS (
  SELECT
    t.id AS lancamento_id,
    'timesheet' AS tipo_lancamento,
    t.escritorio_id,
    t.processo_id AS referencia_id,
    p.cliente_id,
    cli.nome_completo AS cliente_nome,
    t.atividade AS descricao,
    NULL AS valor,
    t.horas,
    t.processo_id,
    NULL::uuid AS consulta_id,
    'timesheet' AS categoria,
    t.created_at
  FROM financeiro_timesheet t
  JOIN processos p ON p.id = t.processo_id
  JOIN crm_clientes cli ON cli.id = p.cliente_id
  WHERE t.faturavel = true
    AND t.faturado = false
    AND t.aprovado = true
    AND t.reprovado = false
    AND t.fatura_id IS NULL
    AND t.processo_id IS NOT NULL
)
SELECT * FROM honorarios_disponiveis
UNION ALL
SELECT * FROM timesheet_disponivel
ORDER BY cliente_nome, created_at DESC;

COMMENT ON VIEW v_lancamentos_prontos_faturar IS 'Honorários e timesheet aprovados e disponíveis para faturamento';

-- =====================================================
-- VIEW: FATURAS GERADAS
-- =====================================================
-- Lista faturas com informações consolidadas e itens

CREATE OR REPLACE VIEW v_faturas_geradas AS
SELECT
  f.id AS fatura_id,
  f.escritorio_id,
  f.numero_fatura,
  f.cliente_id,
  c.nome_completo AS cliente_nome,
  c.email AS cliente_email,
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
JOIN crm_clientes c ON c.id = f.cliente_id
ORDER BY f.created_at DESC;

COMMENT ON VIEW v_faturas_geradas IS 'Faturas com informações consolidadas e contadores de itens';

-- =====================================================
-- ATUALIZAR FUNÇÃO: DESMANCHAR FATURA
-- =====================================================
-- Modificação para retornar itens ao estado "pronto para faturar"
-- em vez de cancelar a fatura

DROP FUNCTION IF EXISTS desmanchar_fatura(UUID, UUID);

CREATE OR REPLACE FUNCTION desmanchar_fatura(
  p_fatura_id UUID,
  p_user_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_fatura RECORD;
  v_item RECORD;
BEGIN
  -- Buscar fatura
  SELECT * INTO v_fatura FROM financeiro_faturamento_faturas WHERE id = p_fatura_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fatura não encontrada';
  END IF;

  -- Validar status (permitir desmanchar rascunho, emitida e enviada)
  IF v_fatura.status NOT IN ('rascunho', 'emitida', 'enviada') THEN
    RAISE EXCEPTION 'Apenas faturas em rascunho, emitidas ou enviadas podem ser desmanchadas. Status atual: %', v_fatura.status;
  END IF;

  -- Reverter honorários
  UPDATE financeiro_honorarios
  SET status = 'aprovado',
      fatura_id = NULL,
      updated_at = NOW()
  WHERE fatura_id = p_fatura_id;

  -- Reverter timesheet
  UPDATE financeiro_timesheet
  SET faturado = false,
      fatura_id = NULL,
      faturado_em = NULL,
      updated_at = NOW()
  WHERE fatura_id = p_fatura_id;

  -- Reverter despesas (se houver)
  UPDATE financeiro_despesas
  SET faturado = false,
      fatura_id = NULL
  WHERE fatura_id = p_fatura_id;

  -- Deletar itens da fatura
  DELETE FROM financeiro_faturamento_itens WHERE fatura_id = p_fatura_id;

  -- Atualizar fatura para rascunho (em vez de cancelar)
  UPDATE financeiro_faturamento_faturas
  SET status = 'cancelada',
      cancelada_em = NOW(),
      cancelada_por = p_user_id,
      motivo_cancelamento = 'Fatura desmanchada - itens retornaram para faturamento',
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
      'Fatura ' || v_fatura.numero_fatura || ' foi desmanchada e seus itens estão disponíveis para novo faturamento',
      '/dashboard/financeiro/faturamento',
      false
    );
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION desmanchar_fatura IS 'Desfaz fatura e retorna itens ao estado "pronto para faturar"';

-- =====================================================
-- NOVA FUNÇÃO: GERAR FATURA V2 (COM SELEÇÃO DE ITENS)
-- =====================================================
-- Versão melhorada que aceita arrays específicos de IDs

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

COMMENT ON FUNCTION gerar_fatura_v2 IS 'Gera fatura consolidada com seleção específica de honorários e timesheet';
