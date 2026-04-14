-- ============================================================
-- View v_timesheet_profissional
-- ============================================================
-- Exclui lançamentos de timesheet vinculados a tarefas/eventos
-- marcados como pessoais. Usada em métricas coletivas do
-- dashboard (Performance da Equipe, Meus Números não-cobráveis,
-- Dashboard Financeiro).
--
-- NÃO USAR em: aprovação de timesheet, edição individual,
-- tabs por processo/consultivo, ou v_lancamentos_prontos_faturar
-- (esses contextos precisam ver o timesheet bruto).
-- ============================================================

CREATE OR REPLACE VIEW v_timesheet_profissional
  WITH (security_invoker = true) AS
SELECT t.*
FROM financeiro_timesheet t
WHERE
  NOT EXISTS (
    SELECT 1 FROM agenda_tarefas at
    WHERE at.id = t.tarefa_id AND at.pessoal = true
  )
  AND NOT EXISTS (
    SELECT 1 FROM agenda_eventos ae
    WHERE ae.id = t.evento_id AND ae.pessoal = true
  );

COMMENT ON VIEW v_timesheet_profissional IS
  'Timesheet excluindo lançamentos vinculados a tarefas/eventos pessoais. Usado em métricas coletivas (Performance da Equipe, KPIs do escritório, Dashboard Financeiro). NÃO usar em fluxos de aprovação, edição individual ou tabs por-pasta — nesses casos usar diretamente financeiro_timesheet.';

CREATE INDEX IF NOT EXISTS idx_timesheet_tarefa_id_not_null
  ON financeiro_timesheet(tarefa_id) WHERE tarefa_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_timesheet_evento_id_not_null
  ON financeiro_timesheet(evento_id) WHERE evento_id IS NOT NULL;
