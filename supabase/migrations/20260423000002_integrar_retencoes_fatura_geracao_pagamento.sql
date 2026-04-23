-- =============================================================================
-- Integração das retenções em gerar_fatura_v3, pagar_fatura e views
-- =============================================================================
-- - Consolida overloads de gerar_fatura_v3 (dropa o antigo)
-- - gerar_fatura_v3: ao final, chama atualizar_retencoes_fatura(id)
-- - pagar_fatura: decide quitação com COALESCE(valor_liquido, valor_total)
-- - v_faturas_geradas: expõe valor_liquido, total_retencoes
-- - v_extrato_financeiro: expõe valor_bruto, valor_liquido, total_retencoes
-- - get_faturas_geradas: expõe novos campos
-- =============================================================================

-- 1) Dropar overload antigo de gerar_fatura_v3
DROP FUNCTION IF EXISTS public.gerar_fatura_v3(uuid, uuid, uuid[], uuid[], uuid[], date, date, text, uuid);

-- 2) Recriar gerar_fatura_v3 (moderno) com chamada a atualizar_retencoes_fatura
CREATE OR REPLACE FUNCTION public.gerar_fatura_v3(
  p_escritorio_id uuid,
  p_cliente_id uuid,
  p_data_emissao date,
  p_data_vencimento date DEFAULT NULL::date,
  p_observacoes text DEFAULT NULL::text,
  p_honorarios_ids uuid[] DEFAULT NULL::uuid[],
  p_timesheet_ids uuid[] DEFAULT NULL::uuid[],
  p_fechamentos_ids uuid[] DEFAULT NULL::uuid[],
  p_user_id uuid DEFAULT NULL::uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
  v_valor_item NUMERIC;
  v_contrato_rec RECORD;
  v_subtotal_contrato NUMERIC;
  v_valor_ajustado NUMERIC;
  v_ajuste NUMERIC;
  v_fator NUMERIC;
  v_acumulado NUMERIC;
  v_total_items INTEGER;
  v_item_count INTEGER;
  v_new_itens JSONB;
  v_new_vh NUMERIC;
  v_new_val NUMERIC;
  v_idx INTEGER;
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

  -- Processar receitas (honorarios)
  IF p_honorarios_ids IS NOT NULL AND array_length(p_honorarios_ids, 1) > 0 THEN
    FOR v_receita IN
      SELECT r.id, r.descricao, r.valor, r.tipo, r.processo_id, r.consulta_id, r.contrato_id,
             p.numero_cnj as processo_numero, p.numero_pasta as processo_pasta,
             CASE
               WHEN r.processo_id IS NOT NULL THEN
                 COALESCE(
                   NULLIF(CONCAT_WS(' x ', NULLIF(p.autor, ''), NULLIF(p.reu, '')), ''),
                   p.objeto_acao, p.parte_contraria
                 )
               WHEN r.consulta_id IS NOT NULL THEN cc.titulo
               ELSE NULL
             END as caso_titulo
      FROM financeiro_receitas r
      LEFT JOIN processos_processos p ON p.id = r.processo_id
      LEFT JOIN consultivo_consultas cc ON cc.id = r.consulta_id
      WHERE r.id = ANY(p_honorarios_ids) AND r.cliente_id = p_cliente_id AND r.status = 'pendente' AND r.fatura_id IS NULL
    LOOP
      v_item := jsonb_build_object(
        'tipo', 'honorario', 'descricao', v_receita.descricao, 'valor', v_receita.valor,
        'processo_id', v_receita.processo_id, 'processo_numero', v_receita.processo_numero,
        'processo_pasta', v_receita.processo_pasta, 'partes_resumo', v_receita.caso_titulo,
        'caso_titulo', v_receita.caso_titulo, 'referencia_id', v_receita.id,
        'contrato_id', v_receita.contrato_id
      );
      v_itens_jsonb := v_itens_jsonb || v_item;
      v_valor_total := v_valor_total + v_receita.valor;
      UPDATE financeiro_receitas SET fatura_id = v_fatura_id, updated_at = NOW() WHERE id = v_receita.id;
    END LOOP;
  END IF;

  -- Processar timesheet
  IF p_timesheet_ids IS NOT NULL AND array_length(p_timesheet_ids, 1) > 0 THEN
    SELECT COALESCE((SELECT (c.config->>'valor_hora')::numeric FROM financeiro_contratos_honorarios c
      WHERE c.cliente_id = p_cliente_id AND c.ativo = true AND c.config->>'valor_hora' IS NOT NULL LIMIT 1), 400)
    INTO v_valor_hora;

    FOR v_timesheet IN
      SELECT t.id, t.atividade as descricao, t.processo_id, t.consulta_id, t.horas,
             t.data_trabalho, t.user_id,
             p.numero_cnj as processo_numero, p.numero_pasta as processo_pasta,
             COALESCE(p.contrato_id, cc.contrato_id) as contrato_id,
             CASE
               WHEN t.processo_id IS NOT NULL THEN
                 COALESCE(NULLIF(CONCAT_WS(' x ', NULLIF(p.autor, ''), NULLIF(p.reu, '')), ''), p.objeto_acao, p.parte_contraria)
               WHEN t.consulta_id IS NOT NULL THEN cc.titulo
               ELSE NULL
             END as caso_titulo,
             prof.nome_completo as profissional_nome,
             cargo.nome_display as cargo_nome
      FROM financeiro_timesheet t
      LEFT JOIN processos_processos p ON p.id = t.processo_id
      LEFT JOIN consultivo_consultas cc ON cc.id = t.consulta_id
      LEFT JOIN profiles prof ON prof.id = t.user_id
      LEFT JOIN escritorios_usuarios eu ON eu.user_id = t.user_id AND eu.escritorio_id = p_escritorio_id
      LEFT JOIN escritorios_cargos cargo ON cargo.id = eu.cargo_id
      WHERE t.id = ANY(p_timesheet_ids) AND t.aprovado = true AND NOT t.faturado AND t.fatura_id IS NULL
    LOOP
      v_valor_item := v_timesheet.horas * v_valor_hora;
      v_item := jsonb_build_object(
        'tipo', 'timesheet', 'descricao', v_timesheet.descricao, 'valor', v_valor_item,
        'horas', v_timesheet.horas, 'valor_hora', v_valor_hora,
        'processo_id', v_timesheet.processo_id, 'consulta_id', v_timesheet.consulta_id,
        'processo_numero', v_timesheet.processo_numero, 'processo_pasta', v_timesheet.processo_pasta,
        'partes_resumo', v_timesheet.caso_titulo, 'caso_titulo', v_timesheet.caso_titulo,
        'timesheet_id', v_timesheet.id, 'profissional_nome', v_timesheet.profissional_nome,
        'cargo_nome', v_timesheet.cargo_nome, 'data_trabalho', v_timesheet.data_trabalho,
        'user_id', v_timesheet.user_id, 'contrato_id', v_timesheet.contrato_id
      );
      v_itens_jsonb := v_itens_jsonb || v_item;
      v_valor_total := v_valor_total + v_valor_item;
      UPDATE financeiro_timesheet SET faturado = true, fatura_id = v_fatura_id, faturado_em = NOW() WHERE id = v_timesheet.id;
    END LOOP;

    -- Pós-processamento: limites contratuais
    FOR v_contrato_rec IN
      SELECT DISTINCT (item->>'contrato_id')::uuid AS cid
      FROM jsonb_array_elements(v_itens_jsonb) AS item
      WHERE item->>'tipo' = 'timesheet'
        AND item->>'contrato_id' IS NOT NULL
        AND item->>'contrato_id' != 'null'
    LOOP
      SELECT COALESCE(SUM((item->>'valor')::numeric), 0)
      INTO v_subtotal_contrato
      FROM jsonb_array_elements(v_itens_jsonb) AS item
      WHERE item->>'tipo' = 'timesheet'
        AND (item->>'contrato_id')::uuid = v_contrato_rec.cid;

      v_valor_ajustado := aplicar_limites_mensais(v_subtotal_contrato, v_contrato_rec.cid);
      v_ajuste := v_valor_ajustado - v_subtotal_contrato;

      IF v_ajuste = 0 THEN
        CONTINUE;
      END IF;

      IF v_ajuste > 0 THEN
        v_fator := v_valor_ajustado / v_subtotal_contrato;
        v_acumulado := 0;
        v_item_count := 0;

        SELECT count(*) INTO v_total_items
        FROM jsonb_array_elements(v_itens_jsonb) AS item
        WHERE item->>'tipo' = 'timesheet'
          AND (item->>'contrato_id')::uuid = v_contrato_rec.cid;

        v_new_itens := '[]'::jsonb;
        FOR v_idx IN 0..jsonb_array_length(v_itens_jsonb)-1 LOOP
          v_item := v_itens_jsonb->v_idx;
          IF v_item->>'tipo' = 'timesheet'
             AND v_item->>'contrato_id' IS NOT NULL
             AND (v_item->>'contrato_id')::uuid = v_contrato_rec.cid THEN
            v_item_count := v_item_count + 1;
            IF v_item_count < v_total_items THEN
              v_new_vh := ROUND((v_item->>'valor_hora')::numeric * v_fator, 2);
              v_new_val := ROUND((v_item->>'horas')::numeric * v_new_vh, 2);
              v_acumulado := v_acumulado + v_new_val;
            ELSE
              v_new_val := ROUND(v_valor_ajustado - v_acumulado, 2);
              v_new_vh := ROUND(v_new_val / (v_item->>'horas')::numeric, 2);
            END IF;
            v_item := v_item || jsonb_build_object(
              'valor_hora_original', (v_item->>'valor_hora')::numeric,
              'valor_hora', v_new_vh,
              'valor', v_new_val
            );
          END IF;
          v_new_itens := v_new_itens || jsonb_build_array(v_item);
        END LOOP;
        v_itens_jsonb := v_new_itens;
        v_valor_total := v_valor_total - v_subtotal_contrato + v_valor_ajustado;

      ELSE
        v_item := jsonb_build_object(
          'tipo', 'ajuste_contratual',
          'descricao', 'Ajuste maximo contratual',
          'valor', v_ajuste,
          'contrato_id', v_contrato_rec.cid,
          'subtotal_original', v_subtotal_contrato,
          'valor_limite', v_valor_ajustado
        );
        v_itens_jsonb := v_itens_jsonb || v_item;
        v_valor_total := v_valor_total + v_ajuste;
      END IF;
    END LOOP;
  END IF;

  -- Processar fechamentos de pasta
  IF p_fechamentos_ids IS NOT NULL AND array_length(p_fechamentos_ids, 1) > 0 THEN
    FOR v_fechamento IN
      SELECT fp.id, fp.competencia, fp.qtd_processos, fp.valor_unitario, fp.valor_total, fp.processos, fp.contrato_id
      FROM financeiro_fechamentos_pasta fp
      WHERE fp.id = ANY(p_fechamentos_ids) AND fp.cliente_id = p_cliente_id AND fp.status = 'aprovado' AND fp.fatura_id IS NULL
    LOOP
      v_item := jsonb_build_object('tipo', 'pasta', 'descricao', 'Honorários por pasta - ' || TO_CHAR(v_fechamento.competencia, 'MM/YYYY'),
        'valor', v_fechamento.valor_total, 'competencia', v_fechamento.competencia, 'qtd_processos', v_fechamento.qtd_processos,
        'valor_unitario', v_fechamento.valor_unitario, 'processos', v_fechamento.processos, 'fechamento_id', v_fechamento.id,
        'contrato_id', v_fechamento.contrato_id);
      v_itens_jsonb := v_itens_jsonb || v_item;
      v_valor_total := v_valor_total + v_fechamento.valor_total;
      UPDATE financeiro_fechamentos_pasta SET status = 'faturado', fatura_id = v_fatura_id, faturado_em = NOW() WHERE id = v_fechamento.id;
    END LOOP;
  END IF;

  UPDATE financeiro_faturamento_faturas
  SET valor_total = v_valor_total, itens = v_itens_jsonb, updated_at = NOW()
  WHERE id = v_fatura_id;

  -- NOVO: calcular e persistir retenções tributárias
  PERFORM public.atualizar_retencoes_fatura(v_fatura_id);

  IF p_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, tipo, titulo, mensagem, link, lida)
    VALUES (p_user_id, 'fatura_gerada', 'Fatura Gerada',
      'Fatura ' || v_numero_fatura || ' gerada com sucesso. Valor: R$ ' || TO_CHAR(v_valor_total, 'FM999G999G990D00'),
      '/dashboard/financeiro/faturamento', false);
  END IF;

  RETURN v_fatura_id;
END;
$function$;

-- 3) pagar_fatura: quitação pelo líquido quando houver retenção
CREATE OR REPLACE FUNCTION public.pagar_fatura(
  p_fatura_id uuid,
  p_valor_pago numeric,
  p_data_pagamento date,
  p_forma_pagamento text,
  p_conta_bancaria_id uuid DEFAULT NULL::uuid,
  p_user_id uuid DEFAULT NULL::uuid,
  p_comprovante_url text DEFAULT NULL::text,
  p_observacoes text DEFAULT NULL::text,
  p_data_vencimento_saldo date DEFAULT NULL::date
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_fatura RECORD;
  v_total_esperado NUMERIC;  -- NOVO: valor_liquido quando houver retenção, senão valor_total
  v_saldo_anterior NUMERIC;
  v_saldo_restante NUMERIC;
  v_novo_status TEXT;
  v_receita_existente_id UUID;
  v_receita_saldo_id UUID;
  v_excedente NUMERIC;
BEGIN
  SELECT id, escritorio_id, cliente_id, valor_total, valor_liquido, status, numero_fatura,
         descricao, data_vencimento, COALESCE(valor_pago, 0) AS valor_pago_atual,
         conta_bancaria_id
  INTO v_fatura
  FROM financeiro_faturamento_faturas
  WHERE id = p_fatura_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fatura não encontrada';
  END IF;

  IF v_fatura.status = 'paga' THEN
    RAISE EXCEPTION 'Fatura já está totalmente paga';
  END IF;

  IF v_fatura.status = 'cancelada' THEN
    RAISE EXCEPTION 'Fatura está cancelada';
  END IF;

  IF v_fatura.status = 'rascunho' THEN
    RAISE EXCEPTION 'Fatura está em rascunho, não pode receber pagamento';
  END IF;

  IF p_valor_pago <= 0 THEN
    RAISE EXCEPTION 'Valor do pagamento deve ser positivo';
  END IF;

  -- Total esperado considera o líquido quando há retenção
  v_total_esperado := COALESCE(v_fatura.valor_liquido, v_fatura.valor_total);
  v_saldo_anterior := v_fatura.valor_pago_atual;
  v_saldo_restante := v_total_esperado - v_saldo_anterior - p_valor_pago;

  IF v_saldo_restante > 0.01 THEN
    v_novo_status := 'parcialmente_paga';
  ELSE
    v_novo_status := 'paga';
  END IF;

  UPDATE financeiro_faturamento_faturas
  SET status = v_novo_status,
      valor_pago = CASE
        WHEN v_novo_status = 'paga' THEN v_total_esperado
        ELSE v_saldo_anterior + p_valor_pago
      END,
      paga_em = CASE WHEN v_novo_status = 'paga' THEN NOW() ELSE paga_em END,
      data_vencimento_saldo = CASE
        WHEN v_novo_status = 'parcialmente_paga' THEN COALESCE(p_data_vencimento_saldo, p_data_pagamento + INTERVAL '30 days')
        ELSE NULL
      END,
      updated_at = NOW()
  WHERE id = p_fatura_id;

  SELECT id INTO v_receita_existente_id
  FROM financeiro_receitas
  WHERE fatura_id = p_fatura_id
    AND status IN ('pendente', 'faturado', 'atrasado', 'parcial')
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_receita_existente_id IS NOT NULL THEN
    IF v_saldo_restante <= 0.01 THEN
      -- Pagamento total: receita fechada com valor_pago = valor_liquido (ou valor quando sem retenção)
      UPDATE financeiro_receitas
      SET status = 'pago',
          valor_pago = COALESCE(valor_liquido, valor),
          data_pagamento = p_data_pagamento,
          forma_pagamento = p_forma_pagamento::forma_pagamento_enum,
          conta_bancaria_id = COALESCE(p_conta_bancaria_id, conta_bancaria_id),
          observacoes = COALESCE(p_observacoes, observacoes),
          updated_at = NOW(),
          updated_by = p_user_id
      WHERE id = v_receita_existente_id;

      UPDATE financeiro_receitas
      SET status = 'pago',
          valor_pago = COALESCE(valor_liquido, valor),
          data_pagamento = p_data_pagamento,
          forma_pagamento = p_forma_pagamento::forma_pagamento_enum,
          conta_bancaria_id = COALESCE(p_conta_bancaria_id, conta_bancaria_id),
          updated_at = NOW(),
          updated_by = p_user_id
      WHERE fatura_id = p_fatura_id
        AND id != v_receita_existente_id
        AND status NOT IN ('pago', 'cancelado');
    ELSE
      -- Pagamento parcial: fixar valor/valor_pago ao que foi pago; saldo restante vira nova receita
      UPDATE financeiro_receitas
      SET status = 'pago',
          valor_pago = p_valor_pago,
          valor = p_valor_pago,
          data_pagamento = p_data_pagamento,
          forma_pagamento = p_forma_pagamento::forma_pagamento_enum,
          conta_bancaria_id = COALESCE(p_conta_bancaria_id, conta_bancaria_id),
          observacoes = COALESCE(observacoes, '') || CASE WHEN p_observacoes IS NOT NULL THEN ' | ' || p_observacoes ELSE '' END,
          updated_at = NOW(),
          updated_by = p_user_id
      WHERE id = v_receita_existente_id;

      INSERT INTO financeiro_receitas (
        escritorio_id, tipo, cliente_id, fatura_id, receita_origem_id,
        descricao, categoria, valor, data_competencia, data_vencimento,
        status, valor_pago, observacoes, created_by, updated_by
      ) VALUES (
        v_fatura.escritorio_id,
        'saldo',
        v_fatura.cliente_id,
        p_fatura_id,
        v_receita_existente_id,
        'Saldo restante - ' || v_fatura.numero_fatura,
        'honorarios',
        v_saldo_restante,
        p_data_pagamento,
        COALESCE(p_data_vencimento_saldo, p_data_pagamento + INTERVAL '30 days'),
        'pendente',
        0,
        'Saldo de pagamento parcial da fatura ' || v_fatura.numero_fatura,
        p_user_id,
        p_user_id
      ) RETURNING id INTO v_receita_saldo_id;
    END IF;
  ELSE
    -- Não há receita vinculada: criar uma para o pagamento
    INSERT INTO financeiro_receitas (
      escritorio_id, tipo, cliente_id, fatura_id,
      descricao, categoria, valor, data_competencia, data_vencimento,
      data_pagamento, status, valor_pago, forma_pagamento, conta_bancaria_id,
      observacoes, created_by, updated_by
    ) VALUES (
      v_fatura.escritorio_id,
      'honorario',
      v_fatura.cliente_id,
      p_fatura_id,
      COALESCE(v_fatura.descricao, 'Pagamento fatura ' || v_fatura.numero_fatura),
      'honorarios',
      CASE WHEN v_saldo_restante > 0.01 THEN p_valor_pago ELSE v_total_esperado END,
      v_fatura.data_vencimento,
      v_fatura.data_vencimento,
      p_data_pagamento,
      'pago',
      p_valor_pago,
      p_forma_pagamento::forma_pagamento_enum,
      COALESCE(p_conta_bancaria_id, v_fatura.conta_bancaria_id),
      p_observacoes,
      p_user_id,
      p_user_id
    );

    IF v_saldo_restante > 0.01 THEN
      INSERT INTO financeiro_receitas (
        escritorio_id, tipo, cliente_id, fatura_id,
        descricao, categoria, valor, data_competencia, data_vencimento,
        status, valor_pago, observacoes, created_by, updated_by
      ) VALUES (
        v_fatura.escritorio_id,
        'saldo',
        v_fatura.cliente_id,
        p_fatura_id,
        'Saldo restante - ' || v_fatura.numero_fatura,
        'honorarios',
        v_saldo_restante,
        p_data_pagamento,
        COALESCE(p_data_vencimento_saldo, p_data_pagamento + INTERVAL '30 days'),
        'pendente',
        0,
        'Saldo de pagamento parcial da fatura ' || v_fatura.numero_fatura,
        p_user_id,
        p_user_id
      );
    END IF;
  END IF;

  -- Após qualquer criação/atualização de receita, sincronizar bruto/líquido
  PERFORM public.atualizar_retencoes_fatura(p_fatura_id);

  -- Overpayment
  IF v_saldo_restante < -0.01 THEN
    v_excedente := ABS(v_saldo_restante);
    INSERT INTO financeiro_receitas (
      escritorio_id, tipo, cliente_id,
      descricao, categoria, valor, data_competencia, data_vencimento,
      data_pagamento, status, valor_pago, forma_pagamento, conta_bancaria_id,
      observacoes, created_by, updated_by
    ) VALUES (
      v_fatura.escritorio_id,
      'avulso',
      v_fatura.cliente_id,
      'Crédito excedente - ' || v_fatura.numero_fatura,
      'honorarios',
      v_excedente,
      p_data_pagamento,
      p_data_pagamento,
      p_data_pagamento,
      'pago',
      v_excedente,
      p_forma_pagamento::forma_pagamento_enum,
      COALESCE(p_conta_bancaria_id, v_fatura.conta_bancaria_id),
      'Valor excedente recebido na fatura ' || v_fatura.numero_fatura || COALESCE(' | ' || p_observacoes, ''),
      p_user_id,
      p_user_id
    );
  END IF;

  IF COALESCE(p_conta_bancaria_id, v_fatura.conta_bancaria_id) IS NOT NULL THEN
    UPDATE financeiro_contas_bancarias
    SET saldo_atual = saldo_atual + p_valor_pago,
        updated_at = NOW()
    WHERE id = COALESCE(p_conta_bancaria_id, v_fatura.conta_bancaria_id);
  END IF;

  RETURN p_fatura_id;
END;
$function$;

-- 4) Recriar v_faturas_geradas com valor_liquido e total_retencoes
CREATE OR REPLACE VIEW v_faturas_geradas AS
SELECT
  f.id AS fatura_id,
  f.escritorio_id,
  f.numero_fatura,
  f.cliente_id,
  COALESCE(p.nome_completo, 'Cliente não identificado'::text) AS cliente_nome,
  p.email AS cliente_email,
  f.data_emissao,
  f.data_vencimento,
  f.valor_total,
  COALESCE(f.valor_pago, 0::numeric) AS valor_pago,
  f.total_retencoes,
  COALESCE(f.valor_liquido, f.valor_total) AS valor_liquido,
  f.retencoes,
  f.status,
  f.parcelado,
  f.numero_parcelas,
  f.observacoes,
  f.pdf_url,
  f.enviada_em,
  f.paga_em,
  COALESCE(f.gerada_automaticamente, false) AS gerada_automaticamente,
  COALESCE((SELECT count(*)::integer FROM jsonb_array_elements(COALESCE(f.itens, '[]'::jsonb)) item(value) WHERE (item.value ->> 'tipo'::text) = 'honorario'::text), 0) AS qtd_honorarios,
  COALESCE((SELECT count(*)::integer FROM jsonb_array_elements(COALESCE(f.itens, '[]'::jsonb)) item(value) WHERE (item.value ->> 'tipo'::text) = 'timesheet'::text), 0) AS qtd_horas,
  COALESCE((SELECT sum((item.value ->> 'valor'::text)::numeric) FROM jsonb_array_elements(COALESCE(f.itens, '[]'::jsonb)) item(value) WHERE (item.value ->> 'tipo'::text) = 'honorario'::text), 0::numeric) AS total_honorarios,
  COALESCE((SELECT sum((item.value ->> 'valor'::text)::numeric) FROM jsonb_array_elements(COALESCE(f.itens, '[]'::jsonb)) item(value) WHERE (item.value ->> 'tipo'::text) = 'timesheet'::text), 0::numeric) AS total_horas,
  COALESCE((SELECT sum((item.value ->> 'horas'::text)::numeric) FROM jsonb_array_elements(COALESCE(f.itens, '[]'::jsonb)) item(value) WHERE (item.value ->> 'tipo'::text) = 'timesheet'::text), 0::numeric) AS soma_horas,
  f.created_at,
  f.updated_at,
  CASE
    WHEN f.status = 'paga'::text THEN 'pago'::text
    WHEN f.status = 'cancelada'::text THEN 'cancelado'::text
    WHEN f.status = 'parcialmente_paga'::text AND f.data_vencimento_saldo IS NOT NULL AND f.data_vencimento_saldo < CURRENT_DATE THEN 'parcial_vencido'::text
    WHEN f.status = 'parcialmente_paga'::text THEN 'parcial'::text
    WHEN (f.status = ANY (ARRAY['emitida'::text, 'enviada'::text])) AND f.data_vencimento < CURRENT_DATE THEN 'atrasado'::text
    WHEN f.status = ANY (ARRAY['emitida'::text, 'enviada'::text, 'rascunho'::text]) THEN 'pendente'::text
    ELSE f.status
  END AS categoria_status,
  CASE
    WHEN f.status = 'parcialmente_paga'::text AND f.data_vencimento_saldo IS NOT NULL THEN f.data_vencimento_saldo - CURRENT_DATE
    WHEN f.data_vencimento IS NOT NULL THEN f.data_vencimento - CURRENT_DATE
    ELSE NULL::integer
  END AS dias_ate_vencimento,
  f.conta_bancaria_id,
  f.data_vencimento_saldo
FROM financeiro_faturamento_faturas f
LEFT JOIN crm_pessoas p ON p.id = f.cliente_id
WHERE user_has_access_to_grupo(f.escritorio_id);

-- 5) Atualizar get_faturas_geradas para incluir novos campos
DROP FUNCTION IF EXISTS public.get_faturas_geradas(uuid);
CREATE OR REPLACE FUNCTION public.get_faturas_geradas(p_escritorio_id uuid)
RETURNS TABLE(
  fatura_id uuid, escritorio_id uuid, numero_fatura text,
  cliente_id uuid, cliente_nome text, cliente_email text,
  data_emissao date, data_vencimento date,
  valor_total numeric, valor_pago numeric,
  total_retencoes numeric, valor_liquido numeric, retencoes jsonb,
  status text, parcelado boolean, numero_parcelas integer,
  observacoes text, pdf_url text,
  enviada_em timestamptz, paga_em timestamptz,
  gerada_automaticamente boolean,
  qtd_honorarios integer, qtd_horas integer,
  total_honorarios numeric, total_horas numeric, soma_horas numeric,
  created_at timestamptz, updated_at timestamptz,
  categoria_status text, dias_ate_vencimento integer
)
LANGUAGE plpgsql SECURITY DEFINER AS $function$
BEGIN
  RETURN QUERY
  SELECT
    v.fatura_id, v.escritorio_id, v.numero_fatura,
    v.cliente_id, v.cliente_nome, v.cliente_email,
    v.data_emissao, v.data_vencimento,
    v.valor_total, v.valor_pago,
    v.total_retencoes, v.valor_liquido, v.retencoes,
    v.status, v.parcelado, v.numero_parcelas,
    v.observacoes, v.pdf_url,
    v.enviada_em, v.paga_em,
    v.gerada_automaticamente,
    v.qtd_honorarios, v.qtd_horas,
    v.total_honorarios, v.total_horas, v.soma_horas,
    v.created_at, v.updated_at,
    v.categoria_status, v.dias_ate_vencimento
  FROM v_faturas_geradas v
  WHERE v.escritorio_id = p_escritorio_id
  ORDER BY v.created_at DESC;
END;
$function$;

-- 6) Recriar v_extrato_financeiro com valor_bruto, valor_liquido, total_retencoes
CREATE OR REPLACE VIEW v_extrato_financeiro AS
  -- Bloco 1: receitas (podem ser ligadas a fatura)
  SELECT r.id,
    r.escritorio_id,
    'receita'::text AS tipo_movimento,
    CASE
        WHEN r.status = 'pago'::receita_status_enum THEN 'efetivado'::text
        WHEN r.status = 'parcial'::receita_status_enum THEN 'parcial'::text
        WHEN r.status = 'atrasado'::receita_status_enum THEN 'vencido'::text
        ELSE 'pendente'::text
    END AS status,
    r.tipo::text AS origem,
    r.categoria::text AS categoria,
    r.descricao,
    r.valor,
    r.valor_pago,
    COALESCE(r.valor_bruto, r.valor) AS valor_bruto,
    COALESCE(r.valor_liquido, r.valor) AS valor_liquido,
    r.total_retencoes,
    COALESCE(r.data_pagamento, r.data_vencimento) AS data_referencia,
    r.data_vencimento,
    r.data_pagamento AS data_efetivacao,
    COALESCE(c_r.nome_completo, 'Avulsa'::text) AS entidade,
    r.conta_bancaria_id,
    (cb_r.banco || ' - '::text) || cb_r.numero_conta AS conta_bancaria_nome,
    r.id AS origem_id,
    r.processo_id,
    r.cliente_id,
    NULL::uuid AS aprovado_por,
    NULL::timestamptz AS data_aprovacao,
    NULL::text AS motivo_rejeicao,
    NULL::date AS data_pagamento_programada,
    NULL::text AS observacoes_financeiro,
    NULL::boolean AS auto_pagamento
  FROM financeiro_receitas r
    LEFT JOIN crm_pessoas c_r ON c_r.id = r.cliente_id
    LEFT JOIN financeiro_contas_bancarias cb_r ON cb_r.id = r.conta_bancaria_id
  WHERE r.status <> 'cancelado'::receita_status_enum
    AND (r.fatura_id IS NULL OR (EXISTS (
      SELECT 1 FROM financeiro_faturamento_faturas ff
      WHERE ff.id = r.fatura_id AND (ff.status = ANY (ARRAY['parcialmente_paga'::text, 'paga'::text]))
    )))
    AND user_has_access_to_grupo(r.escritorio_id)
    AND NOT (EXISTS (
      SELECT 1 FROM financeiro_levantamentos fl
      WHERE fl.receita_id = r.id AND fl.status <> 'cancelado'::text
    ))
    AND NOT (EXISTS (
      SELECT 1 FROM financeiro_notas_debito nd
      WHERE nd.receita_id = r.id AND (nd.status <> ALL (ARRAY['rascunho'::nota_debito_status, 'cancelada'::nota_debito_status]))
    ))
UNION ALL
  -- Bloco 2: faturas não totalmente pagas
  SELECT f.id,
    f.escritorio_id,
    'receita'::text AS tipo_movimento,
    CASE
        WHEN f.status = 'paga'::text THEN 'efetivado'::text
        WHEN f.status = 'parcialmente_paga'::text AND f.data_vencimento_saldo IS NOT NULL AND f.data_vencimento_saldo < CURRENT_DATE THEN 'vencido'::text
        WHEN f.status = 'parcialmente_paga'::text THEN 'parcial'::text
        WHEN f.status = 'atrasada'::text THEN 'vencido'::text
        WHEN (f.status = ANY (ARRAY['emitida'::text, 'enviada'::text])) AND f.data_vencimento < CURRENT_DATE THEN 'vencido'::text
        WHEN f.status = 'cancelada'::text THEN 'cancelado'::text
        ELSE 'pendente'::text
    END AS status,
    'fatura'::text AS origem,
    'fatura'::text AS categoria,
    COALESCE(f.descricao, 'Fatura '::text || f.numero_fatura) AS descricao,
    f.valor_total AS valor,
    COALESCE(f.valor_pago, 0::numeric) AS valor_pago,
    f.valor_total AS valor_bruto,
    COALESCE(f.valor_liquido, f.valor_total) AS valor_liquido,
    f.total_retencoes,
    COALESCE(f.paga_em::date,
      CASE
        WHEN f.status = 'parcialmente_paga'::text AND f.data_vencimento_saldo IS NOT NULL THEN f.data_vencimento_saldo
        ELSE f.data_vencimento
      END) AS data_referencia,
    CASE
      WHEN f.status = 'parcialmente_paga'::text AND f.data_vencimento_saldo IS NOT NULL THEN f.data_vencimento_saldo
      ELSE f.data_vencimento
    END AS data_vencimento,
    f.paga_em::date AS data_efetivacao,
    c.nome_completo AS entidade,
    f.conta_bancaria_id,
    (cb_f.banco || ' - '::text) || cb_f.numero_conta AS conta_bancaria_nome,
    f.id AS origem_id,
    NULL::uuid AS processo_id,
    f.cliente_id,
    NULL::uuid AS aprovado_por,
    NULL::timestamptz AS data_aprovacao,
    NULL::text AS motivo_rejeicao,
    NULL::date AS data_pagamento_programada,
    NULL::text AS observacoes_financeiro,
    NULL::boolean AS auto_pagamento
  FROM financeiro_faturamento_faturas f
    LEFT JOIN crm_pessoas c ON c.id = f.cliente_id
    LEFT JOIN financeiro_contas_bancarias cb_f ON cb_f.id = f.conta_bancaria_id
  WHERE (f.status <> ALL (ARRAY['rascunho'::text, 'cancelada'::text, 'paga'::text, 'parcialmente_paga'::text]))
    AND user_has_access_to_grupo(f.escritorio_id)
UNION ALL
  -- Bloco 3: despesas
  SELECT d.id,
    d.escritorio_id,
    'despesa'::text AS tipo_movimento,
    CASE
        WHEN d.status = 'pago'::despesa_status_enum THEN 'efetivado'::text
        WHEN d.status = 'liberado'::despesa_status_enum THEN 'liberado'::text
        WHEN d.status = 'agendado'::despesa_status_enum THEN 'agendado'::text
        WHEN COALESCE(d.data_pagamento_programada, d.data_vencimento) < CURRENT_DATE AND d.status = 'pendente'::despesa_status_enum THEN 'vencido'::text
        ELSE 'pendente'::text
    END AS status,
    CASE
      WHEN d.categoria = 'cartao_credito'::despesa_categoria_enum THEN 'cartao_credito'::text
      ELSE 'despesa'::text
    END AS origem,
    d.categoria::text AS categoria,
    d.descricao,
    d.valor,
    CASE WHEN d.status = 'pago'::despesa_status_enum THEN d.valor ELSE NULL::numeric END AS valor_pago,
    d.valor AS valor_bruto,
    d.valor AS valor_liquido,
    0::numeric AS total_retencoes,
    COALESCE(d.data_pagamento, d.data_pagamento_programada, d.data_vencimento) AS data_referencia,
    COALESCE(d.data_pagamento_programada, d.data_vencimento) AS data_vencimento,
    d.data_pagamento AS data_efetivacao,
    d.fornecedor AS entidade,
    d.conta_bancaria_id,
    (cb_d.banco || ' - '::text) || cb_d.numero_conta AS conta_bancaria_nome,
    d.id AS origem_id,
    d.processo_id,
    d.cliente_id,
    d.aprovado_por,
    d.data_aprovacao,
    d.motivo_rejeicao,
    d.data_pagamento_programada,
    d.observacoes_financeiro,
    d.auto_pagamento
  FROM financeiro_despesas d
    LEFT JOIN financeiro_contas_bancarias cb_d ON cb_d.id = d.conta_bancaria_id
  WHERE d.status <> 'cancelado'::despesa_status_enum AND user_has_access_to_grupo(d.escritorio_id)
UNION ALL
  -- Bloco 4: transferências saída
  SELECT t.id,
    t.escritorio_id,
    'transferencia_saida'::text AS tipo_movimento,
    'efetivado'::text AS status,
    'transferencia'::text AS origem,
    'transferencia'::text AS categoria,
    COALESCE(t.descricao, (('Transferência de '::text || cb_orig.banco) || ' para '::text) || cb_dest.banco) AS descricao,
    t.valor,
    t.valor AS valor_pago,
    t.valor AS valor_bruto,
    t.valor AS valor_liquido,
    0::numeric AS total_retencoes,
    t.data_transferencia AS data_referencia,
    t.data_transferencia AS data_vencimento,
    t.data_transferencia AS data_efetivacao,
    (cb_dest.banco || ' - '::text) || cb_dest.numero_conta AS entidade,
    t.conta_origem_id AS conta_bancaria_id,
    (cb_orig.banco || ' - '::text) || cb_orig.numero_conta AS conta_bancaria_nome,
    t.id AS origem_id,
    NULL::uuid AS processo_id,
    NULL::uuid AS cliente_id,
    NULL::uuid AS aprovado_por,
    NULL::timestamptz AS data_aprovacao,
    NULL::text AS motivo_rejeicao,
    NULL::date AS data_pagamento_programada,
    NULL::text AS observacoes_financeiro,
    NULL::boolean AS auto_pagamento
  FROM financeiro_transferencias t
    JOIN financeiro_contas_bancarias cb_orig ON cb_orig.id = t.conta_origem_id
    JOIN financeiro_contas_bancarias cb_dest ON cb_dest.id = t.conta_destino_id
  WHERE user_has_access_to_grupo(t.escritorio_id)
UNION ALL
  -- Bloco 5: transferências entrada
  SELECT t.id,
    t.escritorio_id,
    'transferencia_entrada'::text AS tipo_movimento,
    'efetivado'::text AS status,
    'transferencia'::text AS origem,
    'transferencia'::text AS categoria,
    COALESCE(t.descricao, 'Transferência de '::text || cb_orig.banco) AS descricao,
    t.valor,
    t.valor AS valor_pago,
    t.valor AS valor_bruto,
    t.valor AS valor_liquido,
    0::numeric AS total_retencoes,
    t.data_transferencia AS data_referencia,
    t.data_transferencia AS data_vencimento,
    t.data_transferencia AS data_efetivacao,
    (cb_orig.banco || ' - '::text) || cb_orig.numero_conta AS entidade,
    t.conta_destino_id AS conta_bancaria_id,
    (cb_dest.banco || ' - '::text) || cb_dest.numero_conta AS conta_bancaria_nome,
    t.id AS origem_id,
    NULL::uuid AS processo_id,
    NULL::uuid AS cliente_id,
    NULL::uuid AS aprovado_por,
    NULL::timestamptz AS data_aprovacao,
    NULL::text AS motivo_rejeicao,
    NULL::date AS data_pagamento_programada,
    NULL::text AS observacoes_financeiro,
    NULL::boolean AS auto_pagamento
  FROM financeiro_transferencias t
    JOIN financeiro_contas_bancarias cb_orig ON cb_orig.id = t.conta_origem_id
    JOIN financeiro_contas_bancarias cb_dest ON cb_dest.id = t.conta_destino_id
  WHERE user_has_access_to_grupo(t.escritorio_id)
UNION ALL
  -- Bloco 6: notas de débito
  SELECT nd.id,
    nd.escritorio_id,
    'receita'::text AS tipo_movimento,
    CASE
        WHEN nd.status = 'paga'::nota_debito_status THEN 'efetivado'::text
        WHEN nd.status = 'parcialmente_paga'::nota_debito_status AND nd.data_vencimento_saldo IS NOT NULL AND nd.data_vencimento_saldo < CURRENT_DATE THEN 'vencido'::text
        WHEN nd.status = 'parcialmente_paga'::nota_debito_status THEN 'parcial'::text
        WHEN nd.data_vencimento < CURRENT_DATE AND (nd.status = ANY (ARRAY['emitida'::nota_debito_status, 'enviada'::nota_debito_status])) THEN 'vencido'::text
        ELSE 'pendente'::text
    END AS status,
    'nota_debito'::text AS origem,
    'custas_reembolsadas'::text AS categoria,
    'Nota de Débito '::text || nd.numero AS descricao,
    nd.valor_total AS valor,
    COALESCE(nd.valor_pago, 0::numeric) AS valor_pago,
    nd.valor_total AS valor_bruto,
    nd.valor_total AS valor_liquido,
    0::numeric AS total_retencoes,
    COALESCE(nd.data_pagamento,
      CASE
        WHEN nd.status = 'parcialmente_paga'::nota_debito_status AND nd.data_vencimento_saldo IS NOT NULL THEN nd.data_vencimento_saldo
        ELSE nd.data_vencimento
      END) AS data_referencia,
    CASE
      WHEN nd.status = 'parcialmente_paga'::nota_debito_status AND nd.data_vencimento_saldo IS NOT NULL THEN nd.data_vencimento_saldo
      ELSE nd.data_vencimento
    END AS data_vencimento,
    nd.data_pagamento AS data_efetivacao,
    c_nd.nome_completo AS entidade,
    nd.conta_bancaria_id,
    (cb_nd.banco || ' - '::text) || cb_nd.numero_conta AS conta_bancaria_nome,
    nd.id AS origem_id,
    NULL::uuid AS processo_id,
    nd.cliente_id,
    NULL::uuid AS aprovado_por,
    NULL::timestamptz AS data_aprovacao,
    NULL::text AS motivo_rejeicao,
    NULL::date AS data_pagamento_programada,
    NULL::text AS observacoes_financeiro,
    NULL::boolean AS auto_pagamento
  FROM financeiro_notas_debito nd
    LEFT JOIN crm_pessoas c_nd ON c_nd.id = nd.cliente_id
    LEFT JOIN financeiro_contas_bancarias cb_nd ON cb_nd.id = nd.conta_bancaria_id
  WHERE (nd.status <> ALL (ARRAY['rascunho'::nota_debito_status, 'cancelada'::nota_debito_status]))
    AND user_has_access_to_grupo(nd.escritorio_id)
UNION ALL
  -- Bloco 7: levantamentos
  SELECT l.id,
    l.escritorio_id,
    'levantamento'::text AS tipo_movimento,
    CASE
        WHEN l.status = 'cancelado'::text THEN 'cancelado'::text
        WHEN l.status = 'concluido'::text THEN 'efetivado'::text
        WHEN l.status = 'parcial'::text THEN 'parcial'::text
        ELSE 'pendente'::text
    END AS status,
    'levantamento'::text AS origem,
    l.origem AS categoria,
    l.descricao,
    l.valor_total AS valor,
    CASE WHEN l.retencao_recebida THEN l.valor_retido ELSE 0::numeric END AS valor_pago,
    l.valor_total AS valor_bruto,
    l.valor_total AS valor_liquido,
    0::numeric AS total_retencoes,
    l.data_levantamento AS data_referencia,
    l.data_levantamento AS data_vencimento,
    CASE WHEN l.status = 'concluido'::text THEN l.data_levantamento ELSE NULL::date END AS data_efetivacao,
    c_l.nome_completo AS entidade,
    l.conta_bancaria_id,
    (cb_l.banco || ' - '::text) || cb_l.numero_conta AS conta_bancaria_nome,
    l.id AS origem_id,
    l.processo_id,
    l.cliente_id,
    NULL::uuid AS aprovado_por,
    NULL::timestamptz AS data_aprovacao,
    NULL::text AS motivo_rejeicao,
    NULL::date AS data_pagamento_programada,
    NULL::text AS observacoes_financeiro,
    NULL::boolean AS auto_pagamento
  FROM financeiro_levantamentos l
    LEFT JOIN crm_pessoas c_l ON c_l.id = l.cliente_id
    LEFT JOIN financeiro_contas_bancarias cb_l ON cb_l.id = l.conta_bancaria_id
  WHERE l.status <> 'cancelado'::text AND user_has_access_to_grupo(l.escritorio_id);
