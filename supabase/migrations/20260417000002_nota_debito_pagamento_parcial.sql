-- Suporte a pagamento parcial de Nota de Debito
-- Replica o padrao de fatura: status 'parcialmente_paga', valor_pago, data_vencimento_saldo

-- 1. Adicionar 'parcialmente_paga' ao enum
ALTER TYPE nota_debito_status ADD VALUE IF NOT EXISTS 'parcialmente_paga' AFTER 'enviada';

-- 2. Adicionar campos para tracking de pagamento parcial
ALTER TABLE financeiro_notas_debito
  ADD COLUMN IF NOT EXISTS valor_pago NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS data_vencimento_saldo DATE;

-- 3. Atualizar sync trigger para incluir 'parcial'
CREATE OR REPLACE FUNCTION sync_nota_debito_from_receita()
RETURNS TRIGGER AS $$
BEGIN
  -- Receita paga -> ND paga
  IF NEW.status = 'pago'::receita_status_enum AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE financeiro_notas_debito
    SET status = 'paga'::nota_debito_status,
        data_pagamento = COALESCE(NEW.data_pagamento, CURRENT_DATE),
        valor_pago = NEW.valor,
        conta_bancaria_id = COALESCE(NEW.conta_bancaria_id, conta_bancaria_id),
        updated_at = NOW()
    WHERE receita_id = NEW.id
      AND status NOT IN ('paga'::nota_debito_status, 'cancelada'::nota_debito_status);
  END IF;

  -- Receita parcial -> ND parcialmente_paga
  IF NEW.status = 'parcial'::receita_status_enum AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE financeiro_notas_debito
    SET status = 'parcialmente_paga'::nota_debito_status,
        valor_pago = COALESCE(NEW.valor_pago, 0),
        conta_bancaria_id = COALESCE(NEW.conta_bancaria_id, conta_bancaria_id),
        updated_at = NOW()
    WHERE receita_id = NEW.id
      AND status NOT IN ('paga'::nota_debito_status, 'cancelada'::nota_debito_status);
  END IF;

  -- Receita cancelada -> ND cancelada
  IF NEW.status = 'cancelado'::receita_status_enum AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE financeiro_notas_debito
    SET status = 'cancelada'::nota_debito_status,
        updated_at = NOW()
    WHERE receita_id = NEW.id
      AND status <> 'cancelada'::nota_debito_status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
