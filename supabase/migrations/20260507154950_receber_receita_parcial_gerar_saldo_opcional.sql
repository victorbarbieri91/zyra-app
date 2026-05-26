-- Adiciona parâmetro p_gerar_saldo a receber_receita_parcial.
-- Quando p_gerar_saldo = false e há diferença entre o esperado e o recebido,
-- a cobrança é encerrada (status = 'pago') sem criar receita filha de saldo,
-- preservando o `valor` original (Opção A — perdão silencioso da diferença).

CREATE OR REPLACE FUNCTION receber_receita_parcial(
  p_receita_id UUID,
  p_valor_pago NUMERIC,
  p_nova_data_vencimento DATE DEFAULT NULL,
  p_conta_bancaria_id UUID DEFAULT NULL,
  p_forma_pagamento TEXT DEFAULT 'pix',
  p_data_pagamento DATE DEFAULT CURRENT_DATE,
  p_gerar_saldo BOOLEAN DEFAULT TRUE
) RETURNS UUID
LANGUAGE plpgsql AS $$
DECLARE
  v_receita RECORD;
  v_saldo NUMERIC;
  v_saldo_receita_id UUID := NULL;
BEGIN
  SELECT * INTO v_receita FROM financeiro_receitas WHERE id = p_receita_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Receita não encontrada: %', p_receita_id;
  END IF;

  IF v_receita.status IN ('pago'::receita_status_enum, 'cancelado'::receita_status_enum) THEN
    RAISE EXCEPTION 'Receita já está % e não pode receber pagamento', v_receita.status;
  END IF;

  v_saldo := v_receita.valor - COALESCE(v_receita.valor_pago, 0) - p_valor_pago;

  IF v_saldo > 0.01 AND p_gerar_saldo THEN
    -- Cobrar diferença: cria receita filha de saldo, marca pai como parcial
    IF p_nova_data_vencimento IS NULL THEN
      RAISE EXCEPTION 'Data de vencimento do saldo é obrigatória quando p_gerar_saldo = true';
    END IF;

    INSERT INTO financeiro_receitas (
      escritorio_id, tipo, cliente_id, processo_id, consulta_id, contrato_id,
      receita_origem_id, descricao, categoria, valor,
      data_competencia, data_vencimento, status, created_by
    ) VALUES (
      v_receita.escritorio_id, 'saldo'::receita_tipo_enum, v_receita.cliente_id,
      v_receita.processo_id, v_receita.consulta_id, v_receita.contrato_id,
      p_receita_id, 'Saldo - ' || v_receita.descricao, v_receita.categoria,
      ROUND(v_saldo, 2),
      DATE_TRUNC('month', p_nova_data_vencimento)::date, p_nova_data_vencimento,
      'pendente'::receita_status_enum, v_receita.created_by
    ) RETURNING id INTO v_saldo_receita_id;

    UPDATE financeiro_receitas
    SET valor_pago = COALESCE(valor_pago, 0) + p_valor_pago,
        status = 'parcial'::receita_status_enum,
        data_pagamento = COALESCE(p_data_pagamento, CURRENT_DATE),
        forma_pagamento = p_forma_pagamento,
        conta_bancaria_id = p_conta_bancaria_id,
        updated_at = now()
    WHERE id = p_receita_id;
  ELSE
    -- Encerra a cobrança (pagamento total OU perdão da diferença).
    -- Pagamento total: valor_pago = v_receita.valor (zera arredondamentos).
    -- Perdão (v_saldo > 0.01 AND NOT p_gerar_saldo): valor_pago = o que entrou de fato,
    --   `valor` permanece inalterado (preserva o contratado original).
    UPDATE financeiro_receitas
    SET valor_pago = CASE
          WHEN v_saldo > 0.01 THEN COALESCE(valor_pago, 0) + p_valor_pago
          ELSE v_receita.valor
        END,
        status = 'pago'::receita_status_enum,
        data_pagamento = COALESCE(p_data_pagamento, CURRENT_DATE),
        forma_pagamento = p_forma_pagamento,
        conta_bancaria_id = p_conta_bancaria_id,
        updated_at = now()
    WHERE id = p_receita_id;
  END IF;

  RETURN v_saldo_receita_id;
END;
$$;
