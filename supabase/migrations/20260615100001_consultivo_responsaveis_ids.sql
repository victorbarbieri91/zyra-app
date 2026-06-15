-- ============================================================
-- M2 · Consultivo: múltiplos responsáveis
-- Mantém responsavel_id (principal) + adiciona responsaveis_ids
-- (co-responsáveis). Aditivo — existentes ficam com array vazio.
-- ============================================================

ALTER TABLE consultivo_consultas
  ADD COLUMN IF NOT EXISTS responsaveis_ids uuid[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN consultivo_consultas.responsaveis_ids IS
  'Co-responsáveis (além do responsavel_id principal). Lista de profiles.id.';
