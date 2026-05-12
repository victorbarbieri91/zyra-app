-- ============================================================================
-- Migração: Refinar excluir_regra_serie_agenda + cleanup pendentes Flávia
-- ============================================================================
-- Bug anterior: filtrava data_inicio >= CURRENT_DATE mesmo em "Toda a série",
-- impedindo o usuário de limpar pendentes passadas (caso Flávia: Aula de
-- Francês com tarefas pendentes em 15/04 e 16/04 que sobraram da bagunça do
-- modelo virtual antigo).
--
-- Nova semântica:
--   * p_data_corte = NULL  → "Toda a série": DELETE pendentes (qualquer data) + ativo=false
--   * p_data_corte = data  → "Desta em diante": DELETE pendentes >= data + data_fim = data-1
--
-- Em ambos os casos, preserva status terminais (concluida, em_andamento,
-- em_pausa, cancelada). Para eventos é o mesmo padrão (status terminal =
-- realizado/cancelado).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.excluir_regra_serie_agenda(
  p_regra_id   uuid,
  p_data_corte date DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_regra agenda_recorrencias%ROWTYPE;
  v_count integer := 0;
BEGIN
  SELECT * INTO v_regra FROM agenda_recorrencias WHERE id = p_regra_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Regra de recorrência % não encontrada', p_regra_id;
  END IF;

  IF p_data_corte IS NULL THEN
    -- Toda a série: desativa regra e deleta TODAS pendentes (sem filtro de data)
    UPDATE agenda_recorrencias SET ativo = false, updated_at = now() WHERE id = p_regra_id;

    IF v_regra.entidade_tipo = 'tarefa' THEN
      DELETE FROM agenda_tarefas
       WHERE recorrencia_id = p_regra_id AND status = 'pendente';
      GET DIAGNOSTICS v_count = ROW_COUNT;
    ELSIF v_regra.entidade_tipo = 'evento' THEN
      DELETE FROM agenda_eventos
       WHERE recorrencia_id = p_regra_id AND status = 'agendado';
      GET DIAGNOSTICS v_count = ROW_COUNT;
    END IF;
  ELSE
    -- Desta em diante: recorta data_fim e deleta pendentes >= data_corte
    UPDATE agenda_recorrencias SET data_fim = p_data_corte - 1, updated_at = now() WHERE id = p_regra_id;

    IF v_regra.entidade_tipo = 'tarefa' THEN
      DELETE FROM agenda_tarefas
       WHERE recorrencia_id = p_regra_id AND status = 'pendente' AND data_inicio >= p_data_corte;
      GET DIAGNOSTICS v_count = ROW_COUNT;
    ELSIF v_regra.entidade_tipo = 'evento' THEN
      DELETE FROM agenda_eventos
       WHERE recorrencia_id = p_regra_id AND status = 'agendado' AND data_inicio::date >= p_data_corte;
      GET DIAGNOSTICS v_count = ROW_COUNT;
    END IF;
  END IF;

  RETURN v_count;
END;
$function$;

-- Cleanup das 2 pendentes da Flávia em "Aula de Francês"
-- 15/04 (id 86ccf5d5) e 16/04 (id a67537e9) — passadas, status pendente,
-- lixo do modelo virtual antigo. exclusoes da regra já contêm 15/04 e 16/04.
DELETE FROM agenda_tarefas
 WHERE id IN (
   '86ccf5d5-2c5d-42f3-8cee-f058f33ccf53',
   'a67537e9-3fa5-46c8-b920-7465a22e3db0'
 );
