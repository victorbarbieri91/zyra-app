-- Migration: Add processo_titulo (autor x réu) to v_timesheet_aprovacao view
-- Purpose: Show process parties as title in timesheet, similar to consultivo title
-- Note: Must DROP + CREATE because PostgreSQL doesn't allow adding columns in the middle with CREATE OR REPLACE

DROP VIEW IF EXISTS v_timesheet_aprovacao;

CREATE VIEW v_timesheet_aprovacao AS
SELECT
  t.id,
  t.escritorio_id,
  e.nome AS nome_escritorio,
  t.user_id,
  p.nome_completo AS colaborador_nome,
  t.processo_id,
  proc.numero_cnj AS numero_processo,
  proc.numero_pasta AS processo_pasta,
  CASE
    WHEN proc.id IS NOT NULL AND proc.reu IS NOT NULL AND proc.reu != '' THEN
      CONCAT(proc.autor, ' x ', proc.reu)
    WHEN proc.id IS NOT NULL THEN
      proc.autor
    ELSE NULL
  END AS processo_titulo,
  t.consulta_id,
  cons.titulo AS consulta_titulo,
  t.tarefa_id,
  t.data_trabalho,
  t.hora_inicio,
  t.hora_fim,
  t.horas,
  t.atividade,
  t.origem,
  t.faturavel,
  t.faturavel_auto,
  t.faturado,
  t.fatura_id,
  t.aprovado,
  t.aprovado_por,
  t.aprovado_em,
  t.reprovado,
  t.reprovado_por,
  t.reprovado_em,
  t.justificativa_reprovacao,
  CASE
    WHEN t.aprovado = true THEN 'aprovado'
    WHEN t.reprovado = true THEN 'reprovado'
    ELSE 'pendente'
  END AS status,
  CASE
    WHEN t.processo_id IS NOT NULL THEN (
      SELECT c.nome_completo
      FROM crm_pessoas c
      WHERE c.id = proc.cliente_id
    )
    WHEN t.consulta_id IS NOT NULL THEN (
      SELECT c.nome_completo
      FROM crm_pessoas c
      WHERE c.id = cons.cliente_id
    )
    ELSE NULL
  END AS cliente_nome,
  COALESCE(proc.contrato_id, cons.contrato_id) AS contrato_id,
  COALESCE(
    (SELECT ch.forma_cobranca FROM financeiro_contratos_honorarios ch WHERE ch.id = proc.contrato_id),
    (SELECT ch.forma_cobranca FROM financeiro_contratos_honorarios ch WHERE ch.id = cons.contrato_id)
  ) AS forma_cobranca_contrato,
  get_valor_hora_efetivo(
    COALESCE(proc.contrato_id, cons.contrato_id),
    t.user_id
  ) AS valor_hora_calculado,
  t.horas * get_valor_hora_efetivo(
    COALESCE(proc.contrato_id, cons.contrato_id),
    t.user_id
  ) AS valor_total_estimado,
  t.editado,
  t.editado_em,
  t.editado_por,
  t.created_at,
  t.updated_at
FROM financeiro_timesheet t
JOIN escritorios e ON e.id = t.escritorio_id
JOIN profiles p ON p.id = t.user_id
LEFT JOIN processos_processos proc ON proc.id = t.processo_id
LEFT JOIN consultivo_consultas cons ON cons.id = t.consulta_id
ORDER BY t.data_trabalho DESC, t.created_at DESC;

COMMENT ON VIEW v_timesheet_aprovacao IS
  'View completa de timesheet com status calculado, info de contrato, valores e título do processo para aprovação';

GRANT SELECT ON v_timesheet_aprovacao TO authenticated;
