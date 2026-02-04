-- Migration: Add processo_id and consultivo_id to agenda_tarefas and agenda_eventos
-- Description: Adds foreign key columns to link agenda items to processos and consultivo modules
-- Date: 2025-01-14

-- =====================================================
-- PART 1: Add columns to agenda_tarefas
-- =====================================================

-- Add processo_id column
ALTER TABLE agenda_tarefas
ADD COLUMN IF NOT EXISTS processo_id uuid REFERENCES processos_processos(id) ON DELETE SET NULL;

-- Add consultivo_id column
ALTER TABLE agenda_tarefas
ADD COLUMN IF NOT EXISTS consultivo_id uuid REFERENCES consultivo_consultas(id) ON DELETE SET NULL;

-- Add check constraint to ensure only one vinculação type at a time
ALTER TABLE agenda_tarefas
ADD CONSTRAINT agenda_tarefas_single_vinculacao_check
CHECK (
  (processo_id IS NULL AND consultivo_id IS NULL) OR  -- No vinculação
  (processo_id IS NOT NULL AND consultivo_id IS NULL) OR  -- Only processo
  (processo_id IS NULL AND consultivo_id IS NOT NULL)     -- Only consultivo
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_agenda_tarefas_processo_id
ON agenda_tarefas(processo_id)
WHERE processo_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agenda_tarefas_consultivo_id
ON agenda_tarefas(consultivo_id)
WHERE consultivo_id IS NOT NULL;

-- =====================================================
-- PART 2: Add columns to agenda_eventos
-- =====================================================

-- Add processo_id column
ALTER TABLE agenda_eventos
ADD COLUMN IF NOT EXISTS processo_id uuid REFERENCES processos_processos(id) ON DELETE SET NULL;

-- Add consultivo_id column
ALTER TABLE agenda_eventos
ADD COLUMN IF NOT EXISTS consultivo_id uuid REFERENCES consultivo_consultas(id) ON DELETE SET NULL;

-- Add check constraint to ensure only one vinculação type at a time
ALTER TABLE agenda_eventos
ADD CONSTRAINT agenda_eventos_single_vinculacao_check
CHECK (
  (processo_id IS NULL AND consultivo_id IS NULL) OR  -- No vinculação
  (processo_id IS NOT NULL AND consultivo_id IS NULL) OR  -- Only processo
  (processo_id IS NULL AND consultivo_id IS NOT NULL)     -- Only consultivo
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_agenda_eventos_processo_id
ON agenda_eventos(processo_id)
WHERE processo_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agenda_eventos_consultivo_id
ON agenda_eventos(consultivo_id)
WHERE consultivo_id IS NOT NULL;

-- =====================================================
-- PART 3: Add comments for documentation
-- =====================================================

COMMENT ON COLUMN agenda_tarefas.processo_id IS 'Foreign key to processos_processos - links tarefa to a legal process';
COMMENT ON COLUMN agenda_tarefas.consultivo_id IS 'Foreign key to consultivo_consultas - links tarefa to a consultivo case';
COMMENT ON COLUMN agenda_eventos.processo_id IS 'Foreign key to processos_processos - links evento to a legal process';
COMMENT ON COLUMN agenda_eventos.consultivo_id IS 'Foreign key to consultivo_consultas - links evento to a consultivo case';
