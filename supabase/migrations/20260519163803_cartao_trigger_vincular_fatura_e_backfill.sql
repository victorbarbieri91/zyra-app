-- Fix: trigger_garantir_fatura_cartao não estava vinculando lançamentos
-- subsequentes do mesmo mês. Só o primeiro era vinculado (porque a chamada
-- a criar_ou_atualizar_fatura_cartao só rodava quando a fatura ainda não
-- existia). Os 2º, 3º, ... ficavam com fatura_id=NULL.
--
-- Nova lógica:
--   1. Encontra fatura do mês (cria se não existir)
--   2. SEMPRE vincula NEW.id à fatura via UPDATE

CREATE OR REPLACE FUNCTION public.trg_garantir_fatura_cartao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_fatura_id uuid;
BEGIN
  IF NEW.cartao_id IS NULL OR NEW.mes_referencia IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_fatura_id
  FROM cartoes_credito_faturas
  WHERE cartao_id = NEW.cartao_id AND mes_referencia = NEW.mes_referencia;

  IF v_fatura_id IS NULL THEN
    v_fatura_id := criar_ou_atualizar_fatura_cartao(NEW.cartao_id, NEW.mes_referencia);
  END IF;

  IF NEW.fatura_id IS DISTINCT FROM v_fatura_id THEN
    UPDATE cartoes_credito_lancamentos
       SET fatura_id = v_fatura_id, updated_at = NOW()
     WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$function$;

-- Backfill: vincular órfãos existentes
UPDATE cartoes_credito_lancamentos l
   SET fatura_id = f.id, updated_at = NOW()
  FROM cartoes_credito_faturas f
 WHERE l.fatura_id IS NULL
   AND f.cartao_id = l.cartao_id
   AND f.mes_referencia = l.mes_referencia;

-- Backfill: recalcular valor_total das faturas (a trigger só dispara em
-- INSERT/UPDATE/DELETE; órfãos antigos não atualizavam).
UPDATE cartoes_credito_faturas f
   SET valor_total = COALESCE(
         (SELECT SUM(l.valor) FROM cartoes_credito_lancamentos l
           WHERE l.cartao_id = f.cartao_id AND l.mes_referencia = f.mes_referencia),
         0
       ),
       updated_at = NOW();
