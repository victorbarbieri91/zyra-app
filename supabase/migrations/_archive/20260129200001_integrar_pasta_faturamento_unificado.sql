-- Migration: Integrar Fechamento por Pasta no Faturamento Unificado
-- Data: 2026-01-29
-- Descrição: Integra fechamentos por pasta na view de lançamentos prontos para faturar
--            e ajusta o fluxo para ser unificado (sem aba separada)

-- ============================================================
-- 1. ATUALIZAR VIEW: LANÇAMENTOS PRONTOS PARA FATURAR
-- ============================================================
-- Adiciona fechamentos aprovados como mais um tipo de lançamento

CREATE OR REPLACE VIEW v_lancamentos_prontos_faturar AS
-- Receitas (honorários e parcelas)
SELECT
  r.id as lancamento_id,
  'honorario' as tipo_lancamento,
  r.escritorio_id,
  r.cliente_id,
  c.nome_completo as cliente_nome,
  c.email as cliente_email,
  r.descricao,
  r.valor,
  NULL::numeric as horas,
  r.processo_id,
  p.numero_cnj as processo_numero,
  p.numero_pasta as processo_pasta,
  CONCAT(p.autor, ' x ', p.reu) as partes_resumo,
  r.categoria::text as categoria,
  r.tipo::text as subtipo,
  r.data_vencimento,
  r.created_at,
  -- Campos específicos para pasta (NULL para outros tipos)
  NULL::uuid as fechamento_id,
  NULL::integer as qtd_processos,
  NULL::numeric as valor_unitario,
  NULL::jsonb as processos_lista,
  NULL::date as competencia
FROM financeiro_receitas r
LEFT JOIN crm_pessoas c ON c.id = r.cliente_id
LEFT JOIN processos_processos p ON p.id = r.processo_id
WHERE r.status = 'pendente'
  AND r.tipo IN ('honorario', 'parcela', 'avulso', 'saldo')
  AND r.fatura_id IS NULL
  AND (r.parcelado = false OR r.tipo != 'honorario')

UNION ALL

-- Timesheet (horas trabalhadas) - usa cliente do processo ou grupo_clientes
SELECT
  t.id as lancamento_id,
  'timesheet' as tipo_lancamento,
  t.escritorio_id,
  COALESCE((cont.grupo_clientes->>'cliente_pagador_id')::uuid, p.cliente_id) as cliente_id,
  COALESCE(cpagador.nome_completo, c.nome_completo) as cliente_nome,
  COALESCE(cpagador.email, c.email) as cliente_email,
  t.atividade as descricao,
  t.horas * get_valor_hora_efetivo(p.contrato_id, t.user_id) as valor,
  t.horas,
  t.processo_id,
  p.numero_cnj as processo_numero,
  p.numero_pasta as processo_pasta,
  CONCAT(p.autor, ' x ', p.reu) as partes_resumo,
  'timesheet' as categoria,
  NULL as subtipo,
  t.data_trabalho as data_vencimento,
  t.created_at,
  -- Campos específicos para pasta (NULL para outros tipos)
  NULL::uuid as fechamento_id,
  NULL::integer as qtd_processos,
  NULL::numeric as valor_unitario,
  NULL::jsonb as processos_lista,
  NULL::date as competencia
FROM financeiro_timesheet t
LEFT JOIN processos_processos p ON p.id = t.processo_id
LEFT JOIN crm_pessoas c ON c.id = p.cliente_id
LEFT JOIN financeiro_contratos_honorarios cont ON cont.id = p.contrato_id
LEFT JOIN crm_pessoas cpagador ON cpagador.id = (cont.grupo_clientes->>'cliente_pagador_id')::uuid
WHERE t.faturavel = true
  AND t.faturado = false
  AND t.aprovado = true

UNION ALL

-- Despesas reembolsáveis - usa cliente do processo ou grupo_clientes
SELECT
  d.id as lancamento_id,
  'despesa' as tipo_lancamento,
  d.escritorio_id,
  COALESCE((cont.grupo_clientes->>'cliente_pagador_id')::uuid, d.cliente_id, p.cliente_id) as cliente_id,
  COALESCE(cpagador.nome_completo, c.nome_completo) as cliente_nome,
  COALESCE(cpagador.email, c.email) as cliente_email,
  d.descricao,
  d.valor,
  NULL::numeric as horas,
  d.processo_id,
  p.numero_cnj as processo_numero,
  p.numero_pasta as processo_pasta,
  CONCAT(p.autor, ' x ', p.reu) as partes_resumo,
  d.categoria::text as categoria,
  'reembolso' as subtipo,
  d.data_vencimento,
  d.created_at,
  -- Campos específicos para pasta (NULL para outros tipos)
  NULL::uuid as fechamento_id,
  NULL::integer as qtd_processos,
  NULL::numeric as valor_unitario,
  NULL::jsonb as processos_lista,
  NULL::date as competencia
FROM financeiro_despesas d
LEFT JOIN processos_processos p ON p.id = d.processo_id
LEFT JOIN crm_pessoas c ON c.id = COALESCE(d.cliente_id, p.cliente_id)
LEFT JOIN financeiro_contratos_honorarios cont ON cont.id = p.contrato_id
LEFT JOIN crm_pessoas cpagador ON cpagador.id = (cont.grupo_clientes->>'cliente_pagador_id')::uuid
WHERE d.reembolsavel = true
  AND d.reembolsado = false
  AND d.status = 'pago'

UNION ALL

-- Fechamentos por pasta (NOVO!)
SELECT
  fp.id as lancamento_id,
  'pasta' as tipo_lancamento,
  fp.escritorio_id,
  fp.cliente_id,
  c.nome_completo as cliente_nome,
  c.email as cliente_email,
  'Honorários por pasta - ' || TO_CHAR(fp.competencia, 'MM/YYYY') as descricao,
  fp.valor_total as valor,
  NULL::numeric as horas,
  NULL::uuid as processo_id,
  NULL as processo_numero,
  NULL as processo_pasta,
  NULL as partes_resumo,
  'pasta' as categoria,
  'pasta' as subtipo,
  (fp.competencia + INTERVAL '1 month')::date as data_vencimento,
  fp.created_at,
  -- Campos específicos para pasta
  fp.id as fechamento_id,
  fp.qtd_processos,
  fp.valor_unitario,
  fp.processos as processos_lista,
  fp.competencia
FROM financeiro_fechamentos_pasta fp
LEFT JOIN crm_pessoas c ON c.id = fp.cliente_id
WHERE fp.status = 'aprovado'
  AND fp.fatura_id IS NULL;

COMMENT ON VIEW v_lancamentos_prontos_faturar IS
'Unifica receitas, timesheet, despesas reembolsáveis e fechamentos por pasta que podem ser incluídos em faturas';

-- ============================================================
-- 2. ATUALIZAR FUNÇÃO: EXECUTAR FECHAMENTO MENSAL
-- ============================================================
-- Agora cria direto como 'aprovado' (sem etapa de aprovação manual)

CREATE OR REPLACE FUNCTION executar_fechamento_mensal_pasta(p_competencia DATE DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  v_competencia DATE := DATE_TRUNC('month', COALESCE(p_competencia, CURRENT_DATE));
  v_contrato RECORD;
  v_processos JSONB;
  v_qtd INTEGER;
  v_fechamentos_criados INTEGER := 0;
BEGIN
  FOR v_contrato IN
    SELECT
      c.id,
      c.escritorio_id,
      c.cliente_id,
      c.config,
      c.numero_contrato
    FROM financeiro_contratos_honorarios c
    WHERE c.forma_cobranca = 'por_pasta'
      AND c.ativo = true
      AND (c.config->>'valor_por_processo')::numeric > 0
      AND (
        (c.config->>'limite_meses') IS NULL
        OR COALESCE((c.config->>'meses_cobrados')::int, 0) < (c.config->>'limite_meses')::int
      )
      AND NOT EXISTS (
        SELECT 1 FROM financeiro_fechamentos_pasta fp
        WHERE fp.contrato_id = c.id
          AND fp.competencia = v_competencia
          AND fp.status != 'cancelado'
      )
  LOOP
    SELECT
      COALESCE(jsonb_agg(jsonb_build_object(
        'id', p.id,
        'numero_cnj', p.numero_cnj,
        'numero_pasta', p.numero_pasta,
        'titulo', COALESCE(p.titulo, 'Processo ' || COALESCE(p.numero_pasta, p.numero_cnj)),
        'cliente_nome', (SELECT nome_completo FROM crm_pessoas WHERE id = p.cliente_id)
      )), '[]'::jsonb),
      COUNT(*)::integer
    INTO v_processos, v_qtd
    FROM processos_processos p
    WHERE p.contrato_id = v_contrato.id
      AND p.status = 'ativo';

    IF v_qtd > 0 THEN
      INSERT INTO financeiro_fechamentos_pasta (
        escritorio_id, contrato_id, cliente_id, competencia,
        qtd_processos, valor_unitario, valor_total, processos,
        status, aprovado_em
      ) VALUES (
        v_contrato.escritorio_id, v_contrato.id, v_contrato.cliente_id, v_competencia,
        v_qtd, (v_contrato.config->>'valor_por_processo')::numeric,
        v_qtd * (v_contrato.config->>'valor_por_processo')::numeric,
        v_processos, 'aprovado', NOW()
      );

      UPDATE financeiro_contratos_honorarios
      SET config = config || jsonb_build_object(
        'meses_cobrados', COALESCE((config->>'meses_cobrados')::int, 0) + 1
      )
      WHERE id = v_contrato.id;

      v_fechamentos_criados := v_fechamentos_criados + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'competencia', v_competencia, 'fechamentos_criados', v_fechamentos_criados);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 3. FUNÇÃO: MARCAR FECHAMENTO COMO FATURADO
-- ============================================================

CREATE OR REPLACE FUNCTION marcar_fechamento_faturado(p_fechamento_id UUID, p_fatura_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE financeiro_fechamentos_pasta
  SET status = 'faturado', fatura_id = p_fatura_id, faturado_em = NOW()
  WHERE id = p_fechamento_id AND status = 'aprovado';
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 4. FUNÇÃO: REMOVER PROCESSO DO FECHAMENTO (atualizada)
-- ============================================================

CREATE OR REPLACE FUNCTION remover_processo_fechamento(p_fechamento_id UUID, p_processo_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_fechamento RECORD;
  v_novo_processos JSONB;
  v_novo_qtd INTEGER;
BEGIN
  SELECT * INTO v_fechamento
  FROM financeiro_fechamentos_pasta
  WHERE id = p_fechamento_id AND status = 'aprovado' AND fatura_id IS NULL;

  IF NOT FOUND THEN RETURN FALSE; END IF;

  SELECT jsonb_agg(p), COUNT(*)::integer
  INTO v_novo_processos, v_novo_qtd
  FROM jsonb_array_elements(v_fechamento.processos) p
  WHERE (p->>'id')::uuid != p_processo_id;

  IF v_novo_qtd = 0 OR v_novo_processos IS NULL THEN
    UPDATE financeiro_fechamentos_pasta SET status = 'cancelado' WHERE id = p_fechamento_id;
    RETURN TRUE;
  END IF;

  UPDATE financeiro_fechamentos_pasta
  SET processos = v_novo_processos, qtd_processos = v_novo_qtd, valor_total = v_novo_qtd * valor_unitario
  WHERE id = p_fechamento_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 5. REMOVER FUNÇÃO OBSOLETA
-- ============================================================

DROP FUNCTION IF EXISTS gerar_fatura_fechamento_pasta(UUID, UUID);

-- ============================================================
-- 6. FUNÇÃO: GERAR FATURA V3 (com suporte a pasta)
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
  v_total_honorarios NUMERIC := 0;
  v_total_horas NUMERIC := 0;
  v_soma_horas NUMERIC := 0;
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
      v_total_honorarios := v_total_honorarios + v_receita.valor;

      UPDATE financeiro_receitas SET fatura_id = v_fatura_id, updated_at = NOW() WHERE id = v_receita.id;
    END LOOP;
  END IF;

  -- Processar timesheet
  IF p_timesheet_ids IS NOT NULL AND array_length(p_timesheet_ids, 1) > 0 THEN
    SELECT COALESCE((SELECT (c.config->>'valor_hora')::numeric FROM financeiro_contratos_honorarios c
      WHERE c.cliente_id = p_cliente_id AND c.ativo = true AND c.config->>'valor_hora' IS NOT NULL LIMIT 1), 400)
    INTO v_valor_hora;

    FOR v_timesheet IN
      SELECT t.id, t.atividade as descricao, t.processo_id, t.consulta_id, t.horas, t.valor_calculado,
             p.numero_cnj as processo_numero, p.numero_pasta as processo_pasta, CONCAT(p.autor, ' x ', p.reu) as partes_resumo
      FROM financeiro_timesheet t
      LEFT JOIN processos_processos p ON p.id = t.processo_id
      WHERE t.id = ANY(p_timesheet_ids) AND t.aprovado = true AND NOT t.faturado AND t.fatura_id IS NULL
    LOOP
      v_item := jsonb_build_object('tipo', 'timesheet', 'descricao', v_timesheet.descricao,
        'valor', COALESCE(v_timesheet.valor_calculado, v_timesheet.horas * v_valor_hora),
        'horas', v_timesheet.horas, 'valor_hora', v_valor_hora, 'processo_id', v_timesheet.processo_id,
        'consulta_id', v_timesheet.consulta_id, 'processo_numero', v_timesheet.processo_numero,
        'processo_pasta', v_timesheet.processo_pasta, 'partes_resumo', v_timesheet.partes_resumo, 'timesheet_id', v_timesheet.id);
      v_itens_jsonb := v_itens_jsonb || v_item;
      v_valor_total := v_valor_total + COALESCE(v_timesheet.valor_calculado, v_timesheet.horas * v_valor_hora);
      v_total_horas := v_total_horas + COALESCE(v_timesheet.valor_calculado, v_timesheet.horas * v_valor_hora);
      v_soma_horas := v_soma_horas + v_timesheet.horas;

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

  UPDATE financeiro_faturamento_faturas
  SET valor_total = v_valor_total, itens = v_itens_jsonb, total_honorarios = v_total_honorarios,
      total_horas = v_total_horas, soma_horas = v_soma_horas, updated_at = NOW()
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
