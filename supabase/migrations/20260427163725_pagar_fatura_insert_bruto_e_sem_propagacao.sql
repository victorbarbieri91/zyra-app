-- Fase 1 — Fix do INSERT em pagar_fatura
-- Quando não há receita pré-existente, INSERT da nova receita usa valor = bruto da fatura
-- (não líquido). Preenche valor_bruto/valor_liquido/total_retencoes espelhando a fatura.
-- Remove chamada redundante a atualizar_retencoes_fatura no final (causa do bug retenção dupla).

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
  v_total_esperado NUMERIC;
  v_saldo_anterior NUMERIC;
  v_saldo_restante NUMERIC;
  v_novo_status TEXT;
  v_receita_existente_id UUID;
  v_receita_saldo_id UUID;
  v_excedente NUMERIC;
BEGIN
  SELECT id, escritorio_id, cliente_id, valor_total, valor_liquido, total_retencoes, status, numero_fatura,
         descricao, data_vencimento, COALESCE(valor_pago, 0) AS valor_pago_atual,
         conta_bancaria_id
  INTO v_fatura
  FROM financeiro_faturamento_faturas
  WHERE id = p_fatura_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Fatura não encontrada'; END IF;
  IF v_fatura.status = 'paga' THEN RAISE EXCEPTION 'Fatura já está totalmente paga'; END IF;
  IF v_fatura.status = 'cancelada' THEN RAISE EXCEPTION 'Fatura está cancelada'; END IF;
  IF v_fatura.status = 'rascunho' THEN RAISE EXCEPTION 'Fatura está em rascunho, não pode receber pagamento'; END IF;
  IF p_valor_pago <= 0 THEN RAISE EXCEPTION 'Valor do pagamento deve ser positivo'; END IF;

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
        v_fatura.escritorio_id, 'saldo', v_fatura.cliente_id, p_fatura_id, v_receita_existente_id,
        'Saldo restante - ' || v_fatura.numero_fatura, 'honorarios',
        v_saldo_restante, p_data_pagamento,
        COALESCE(p_data_vencimento_saldo, p_data_pagamento + INTERVAL '30 days'),
        'pendente', 0,
        'Saldo de pagamento parcial da fatura ' || v_fatura.numero_fatura,
        p_user_id, p_user_id
      ) RETURNING id INTO v_receita_saldo_id;
    END IF;
  ELSE
    -- Não há receita pré-existente: cria nova representando o pagamento.
    -- valor = BRUTO da fatura. valor_pago = líquido pago.
    INSERT INTO financeiro_receitas (
      escritorio_id, tipo, cliente_id, fatura_id,
      descricao, categoria, valor, data_competencia, data_vencimento,
      data_pagamento, status, valor_pago, forma_pagamento, conta_bancaria_id,
      observacoes, created_by, updated_by,
      valor_bruto, valor_liquido, total_retencoes
    ) VALUES (
      v_fatura.escritorio_id, 'honorario', v_fatura.cliente_id, p_fatura_id,
      COALESCE(v_fatura.descricao, 'Pagamento fatura ' || v_fatura.numero_fatura),
      'honorarios',
      CASE WHEN v_saldo_restante > 0.01 THEN p_valor_pago ELSE v_fatura.valor_total END,
      v_fatura.data_vencimento, v_fatura.data_vencimento, p_data_pagamento,
      'pago', p_valor_pago,
      p_forma_pagamento::forma_pagamento_enum,
      COALESCE(p_conta_bancaria_id, v_fatura.conta_bancaria_id),
      p_observacoes, p_user_id, p_user_id,
      v_fatura.valor_total,
      COALESCE(v_fatura.valor_liquido, v_fatura.valor_total),
      COALESCE(v_fatura.total_retencoes, 0)
    );

    IF v_saldo_restante > 0.01 THEN
      INSERT INTO financeiro_receitas (
        escritorio_id, tipo, cliente_id, fatura_id,
        descricao, categoria, valor, data_competencia, data_vencimento,
        status, valor_pago, observacoes, created_by, updated_by
      ) VALUES (
        v_fatura.escritorio_id, 'saldo', v_fatura.cliente_id, p_fatura_id,
        'Saldo restante - ' || v_fatura.numero_fatura, 'honorarios',
        v_saldo_restante, p_data_pagamento,
        COALESCE(p_data_vencimento_saldo, p_data_pagamento + INTERVAL '30 days'),
        'pendente', 0,
        'Saldo de pagamento parcial da fatura ' || v_fatura.numero_fatura,
        p_user_id, p_user_id
      );
    END IF;
  END IF;

  -- REMOVIDO: PERFORM public.atualizar_retencoes_fatura(p_fatura_id);
  -- A fatura já tem retenção persistida desde a geração, e a função propagaria
  -- retenção indevidamente para receitas filhas (causa do bug retenção dupla na FAT-015).

  IF v_saldo_restante < -0.01 THEN
    v_excedente := ABS(v_saldo_restante);
    INSERT INTO financeiro_receitas (
      escritorio_id, tipo, cliente_id,
      descricao, categoria, valor, data_competencia, data_vencimento,
      data_pagamento, status, valor_pago, forma_pagamento, conta_bancaria_id,
      observacoes, created_by, updated_by
    ) VALUES (
      v_fatura.escritorio_id, 'avulso', v_fatura.cliente_id,
      'Crédito excedente - ' || v_fatura.numero_fatura, 'honorarios',
      v_excedente, p_data_pagamento, p_data_pagamento, p_data_pagamento,
      'pago', v_excedente, p_forma_pagamento::forma_pagamento_enum,
      COALESCE(p_conta_bancaria_id, v_fatura.conta_bancaria_id),
      'Valor excedente recebido na fatura ' || v_fatura.numero_fatura || COALESCE(' | ' || p_observacoes, ''),
      p_user_id, p_user_id
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
