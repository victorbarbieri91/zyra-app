-- Adiciona parametro p_data_pagamento ao RPC receber_receita_parcial
-- para que o ModalRecebimento possa passar a data de efetivacao escolhida pelo usuario
-- (antes usava CURRENT_DATE fixo)

CREATE OR REPLACE FUNCTION receber_receita_parcial(
  p_receita_id UUID,
  p_valor_pago NUMERIC,
  p_nova_data_vencimento DATE,
  p_conta_bancaria_id UUID,
  p_forma_pagamento TEXT DEFAULT 'pix',
  p_data_pagamento DATE DEFAULT CURRENT_DATE
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

  IF v_saldo > 0.01 THEN
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
    UPDATE financeiro_receitas
    SET valor_pago = v_receita.valor,
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
