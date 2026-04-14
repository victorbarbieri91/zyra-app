-- ============================================================
-- Fix: v_timesheet_profissional estava retornando dados brutos
-- ============================================================
-- Causa: a view usava NOT EXISTS em subquery que herdava a RLS
-- de agenda_tarefas/agenda_eventos (via security_invoker=true).
-- Como a RLS esconde tarefas pessoais de terceiros, a subquery
-- NOT EXISTS retornava 0 linhas para itens pessoais de outros,
-- e as horas permaneciam na view.
--
-- Solução: funções SECURITY DEFINER que consultam os IDs pessoais
-- sem RLS. A view usa essas funções no WHERE. Segurança mantida:
-- a view em si continua security_invoker, e filtra por escritorio_id
-- automaticamente via RLS da tabela financeiro_timesheet.
-- ============================================================

CREATE OR REPLACE FUNCTION is_agenda_pessoal_tarefa(p_tarefa_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM agenda_tarefas
    WHERE id = p_tarefa_id AND pessoal = true
  );
$$;

CREATE OR REPLACE FUNCTION is_agenda_pessoal_evento(p_evento_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM agenda_eventos
    WHERE id = p_evento_id AND pessoal = true
  );
$$;

GRANT EXECUTE ON FUNCTION is_agenda_pessoal_tarefa(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_agenda_pessoal_evento(uuid) TO authenticated, anon;

COMMENT ON FUNCTION is_agenda_pessoal_tarefa IS
  'SECURITY DEFINER para permitir que v_timesheet_profissional filtre horas de tarefas pessoais de qualquer usuário, sem depender da RLS que restringe visibilidade.';
COMMENT ON FUNCTION is_agenda_pessoal_evento IS
  'SECURITY DEFINER para permitir que v_timesheet_profissional filtre horas de eventos pessoais de qualquer usuário, sem depender da RLS que restringe visibilidade.';

CREATE OR REPLACE VIEW v_timesheet_profissional
  WITH (security_invoker = true) AS
SELECT t.*
FROM financeiro_timesheet t
WHERE
  (t.tarefa_id IS NULL OR NOT is_agenda_pessoal_tarefa(t.tarefa_id))
  AND (t.evento_id IS NULL OR NOT is_agenda_pessoal_evento(t.evento_id));
