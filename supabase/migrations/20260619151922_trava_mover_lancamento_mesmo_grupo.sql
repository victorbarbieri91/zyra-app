-- Bloqueia mover uma despesa/receita para um escritório de OUTRO grupo.
-- A edição de série (atualizar_regra_em_serie) já validava isso; aqui fechamos
-- a brecha da edição de instância única, que confia apenas na RLS de permissão.
-- A RLS continua responsável por validar a PERMISSÃO no escritório destino;
-- este trigger impõe somente o limite de MESMO GRUPO.

CREATE OR REPLACE FUNCTION public.validar_mesmo_grupo_ao_mover_lancamento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_grupo_atual uuid;
  v_grupo_novo uuid;
BEGIN
  IF NEW.escritorio_id IS DISTINCT FROM OLD.escritorio_id THEN
    SELECT COALESCE(grupo_id, id) INTO v_grupo_atual FROM escritorios WHERE id = OLD.escritorio_id;
    SELECT COALESCE(grupo_id, id) INTO v_grupo_novo  FROM escritorios WHERE id = NEW.escritorio_id;

    IF v_grupo_atual IS DISTINCT FROM v_grupo_novo THEN
      RAISE EXCEPTION 'Escritório destino não pertence ao mesmo grupo do escritório atual';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.validar_mesmo_grupo_ao_mover_lancamento() IS
  'Trigger BEFORE UPDATE OF escritorio_id em financeiro_despesas/financeiro_receitas. Impede mover um lançamento para um escritório de outro grupo (mistura de dados entre grupos). Permissão continua a cargo da RLS.';

DROP TRIGGER IF EXISTS trg_validar_mesmo_grupo_mover_despesa ON public.financeiro_despesas;
CREATE TRIGGER trg_validar_mesmo_grupo_mover_despesa
  BEFORE UPDATE OF escritorio_id ON public.financeiro_despesas
  FOR EACH ROW EXECUTE FUNCTION public.validar_mesmo_grupo_ao_mover_lancamento();

DROP TRIGGER IF EXISTS trg_validar_mesmo_grupo_mover_receita ON public.financeiro_receitas;
CREATE TRIGGER trg_validar_mesmo_grupo_mover_receita
  BEFORE UPDATE OF escritorio_id ON public.financeiro_receitas
  FOR EACH ROW EXECUTE FUNCTION public.validar_mesmo_grupo_ao_mover_lancamento();
