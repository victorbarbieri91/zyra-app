-- Trigger de sincronização: quando a receita-sombra de uma Nota de Débito é
-- atualizada, propaga o estado para a própria nota.
--
-- Motivação: a receita criada por useNotasDebito.criarNota é a "escrituração
-- financeira" da nota. Vários fluxos podem atualizar essa receita (modal de
-- recebimento, pagamento em massa, edição manual, futuras telas). Sem este
-- trigger, a ND vinculada poderia ficar em estado divergente — ex: receita já
-- está paga, mas a ND continua "enviada".
--
-- O trigger só atua quando a receita está vinculada a uma ND ATIVA (não
-- rascunho/cancelada). A direção é unidirecional: receita -> nota. Não há
-- trigger no sentido oposto, portanto não há risco de loop.

CREATE OR REPLACE FUNCTION sync_nota_debito_from_receita() RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Sincronizar pagamento: receita -> pago, ND -> paga
  IF NEW.status = 'pago'::receita_status_enum AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE financeiro_notas_debito
    SET status = 'paga'::nota_debito_status,
        data_pagamento = COALESCE(NEW.data_pagamento, CURRENT_DATE),
        conta_bancaria_id = COALESCE(NEW.conta_bancaria_id, conta_bancaria_id),
        updated_at = NOW()
    WHERE receita_id = NEW.id
      AND status NOT IN ('paga'::nota_debito_status, 'cancelada'::nota_debito_status);
  END IF;

  -- Sincronizar cancelamento: receita -> cancelado, ND -> cancelada
  IF NEW.status = 'cancelado'::receita_status_enum AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE financeiro_notas_debito
    SET status = 'cancelada'::nota_debito_status,
        updated_at = NOW()
    WHERE receita_id = NEW.id
      AND status <> 'cancelada'::nota_debito_status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_nota_debito_from_receita ON financeiro_receitas;

CREATE TRIGGER trg_sync_nota_debito_from_receita
AFTER UPDATE ON financeiro_receitas
FOR EACH ROW
WHEN (NEW.status IS DISTINCT FROM OLD.status)
EXECUTE FUNCTION sync_nota_debito_from_receita();
