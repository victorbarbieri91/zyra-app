-- ============================================================
-- M1 · Consultivo: campo "tipo" (lista fechada)
-- Aditivo — não altera nenhuma das 206 linhas existentes.
-- Consultas antigas ficam com tipo NULL = "Não classificado".
-- ============================================================

CREATE TYPE tipo_consulta AS ENUM (
  'consulta_simples',
  'parecer_tecnico',
  'analise_contratual',
  'elaboracao_contrato',
  'due_diligence',
  'opiniao_legal',
  'notificacao_extrajudicial',
  'acordo',
  'assessoria_recorrente',
  'outro'
);

ALTER TABLE consultivo_consultas
  ADD COLUMN IF NOT EXISTS tipo tipo_consulta;

COMMENT ON COLUMN consultivo_consultas.tipo IS
  'Tipo da consulta (lista fechada). Nullable: consultas antigas ficam como "Não classificado".';
