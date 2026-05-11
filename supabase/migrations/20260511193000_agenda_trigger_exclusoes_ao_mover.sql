-- ============================================================================
-- Migração: Trigger automática para registrar exclusão ao mover ocorrência
-- ============================================================================
-- Quando uma instância materializada de recorrência tem `data_inicio` alterada
-- (via drag-and-drop, edição manual, ou qualquer UPDATE), a data ORIGINAL é
-- adicionada em `agenda_recorrencias.exclusoes`. Isso impede que o cron diário
-- (`estender_janela_recorrencias_agenda`) recrie a data abandonada.
--
-- Cobre todos os caminhos (frontend + backend + queries manuais).
-- Não interfere com `atualizar_regra_serie_agenda` nem `materializar_recorrencia_agenda`
-- (que fazem DELETE + INSERT, não UPDATE de data).
-- ============================================================================

-- ============================================================================
-- 1. FUNÇÃO: tg_add_exclusao_on_move
-- ============================================================================
CREATE OR REPLACE FUNCTION public.tg_add_exclusao_on_move()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_data_antiga date;
BEGIN
  -- Linhas sem recorrência: ignora
  IF NEW.recorrencia_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Determina a data antiga conforme a tabela (tarefas: date; eventos: timestamptz)
  IF TG_TABLE_NAME = 'agenda_tarefas' THEN
    IF OLD.data_inicio = NEW.data_inicio THEN
      RETURN NEW;
    END IF;
    v_data_antiga := OLD.data_inicio;
  ELSIF TG_TABLE_NAME = 'agenda_eventos' THEN
    IF OLD.data_inicio::date = NEW.data_inicio::date THEN
      RETURN NEW;
    END IF;
    v_data_antiga := OLD.data_inicio::date;
  ELSE
    RETURN NEW;
  END IF;

  -- Adiciona a data antiga em exclusoes (idempotente via DISTINCT)
  UPDATE agenda_recorrencias
     SET exclusoes = (
           SELECT array_agg(DISTINCT d ORDER BY d)
             FROM unnest(COALESCE(exclusoes, ARRAY[]::date[]) || ARRAY[v_data_antiga]) AS d
         ),
         updated_at = now()
   WHERE id = NEW.recorrencia_id;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.tg_add_exclusao_on_move() IS
  'Trigger: ao mover instância recorrente (UPDATE de data_inicio), adiciona a data original em agenda_recorrencias.exclusoes para impedir recriação pelo cron diário.';

-- ============================================================================
-- 2. TRIGGERS: AFTER UPDATE OF data_inicio
-- ============================================================================
DROP TRIGGER IF EXISTS trg_tarefa_add_exclusao_on_move ON public.agenda_tarefas;
CREATE TRIGGER trg_tarefa_add_exclusao_on_move
AFTER UPDATE OF data_inicio ON public.agenda_tarefas
FOR EACH ROW
EXECUTE FUNCTION public.tg_add_exclusao_on_move();

DROP TRIGGER IF EXISTS trg_evento_add_exclusao_on_move ON public.agenda_eventos;
CREATE TRIGGER trg_evento_add_exclusao_on_move
AFTER UPDATE OF data_inicio ON public.agenda_eventos
FOR EACH ROW
EXECUTE FUNCTION public.tg_add_exclusao_on_move();

-- ============================================================================
-- 3. CLEANUP: remover 14/05 duplicada da regra "Ver marketing"
-- ============================================================================
-- Esta tarefa foi recriada acidentalmente durante o diagnóstico de hoje (21:23:06),
-- depois que o user havia movido a quinta 14/05 para sexta 15/05 (21:18 + drag).
-- Adiciona-se 14/05 nas exclusoes para o cron não recriar.

DELETE FROM agenda_tarefas
 WHERE id = '7f0f4429-f84c-45b3-9147-f8510f3b6ea6';

UPDATE agenda_recorrencias
   SET exclusoes = (
         SELECT array_agg(DISTINCT d ORDER BY d)
           FROM unnest(COALESCE(exclusoes, ARRAY[]::date[]) || ARRAY['2026-05-14'::date]) AS d
       ),
       updated_at = now()
 WHERE id = 'da557f07-4f7e-4d79-a88b-6ce32fd9e459';
