-- =====================================================
-- TIMESHEET APROVACAO IMPROVEMENTS
-- =====================================================
-- 1. Nova view v_timesheet_aprovacao que retorna todos os status
-- 2. Nova funcao RPC editar_timesheet para edicao durante revisao
-- =====================================================

CREATE OR REPLACE VIEW v_timesheet_aprovacao AS
SELECT
  t.id,
  t.escritorio_id,
  e.nome AS nome_escritorio,
  t.user_id,
  p.nome_completo AS colaborador_nome,
  t.processo_id,
  proc.numero_cnj AS numero_processo,
  proc.numero_pasta AS processo_pasta,
  t.consulta_id,
  cons.titulo AS consulta_titulo,
  t.data_trabalho,
  t.hora_inicio,
  t.hora_fim,
  t.horas,
  t.atividade,
  t.faturavel,
  t.faturado,
  t.aprovado,
  t.aprovado_por,
  t.aprovado_em,
  t.reprovado,
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

COMMENT ON VIEW v_timesheet_aprovacao IS 'View completa de timesheet com campo status calculado para filtros de aprovacao';

-- =====================================================
-- FUNCAO PARA EDITAR TIMESHEET DURANTE REVISAO
-- =====================================================

CREATE OR REPLACE FUNCTION editar_timesheet(
  p_timesheet_id UUID,
  p_horas NUMERIC,
  p_atividade TEXT,
  p_faturavel BOOLEAN,
  p_editado_por UUID
) RETURNS void AS $$
BEGIN
  IF p_horas IS NULL OR p_horas <= 0 THEN
    RAISE EXCEPTION 'Horas deve ser maior que zero';
  END IF;

  IF p_atividade IS NULL OR LENGTH(TRIM(p_atividade)) < 3 THEN
    RAISE EXCEPTION 'Atividade deve ter pelo menos 3 caracteres';
  END IF;

  UPDATE financeiro_timesheet
  SET
    horas = p_horas,
    atividade = TRIM(p_atividade),
    faturavel = COALESCE(p_faturavel, faturavel),
    editado = true,
    editado_em = NOW(),
    editado_por = p_editado_por,
    updated_at = NOW()
  WHERE id = p_timesheet_id
    AND aprovado = false
    AND reprovado = false
    AND faturado = false;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Timesheet nao pode ser editado. Verifique se ja foi aprovado, reprovado ou faturado.';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION editar_timesheet IS 'Edita um registro de timesheet pendente durante o processo de revisao';

GRANT EXECUTE ON FUNCTION editar_timesheet TO authenticated;
