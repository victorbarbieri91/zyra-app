-- ============================================
-- MIGRATION: Adicionar coluna escavador_monitoramento_id
-- ============================================
-- Adiciona coluna para armazenar o ID do monitoramento no Escavador

-- Adicionar coluna escavador_monitoramento_id na tabela processos_processos
ALTER TABLE processos_processos
ADD COLUMN IF NOT EXISTS escavador_monitoramento_id INTEGER;

-- Criar indice para buscar processos monitorados
CREATE INDEX IF NOT EXISTS idx_processos_escavador_monitoramento
ON processos_processos(escavador_monitoramento_id)
WHERE escavador_monitoramento_id IS NOT NULL;

-- Comentario da coluna
COMMENT ON COLUMN processos_processos.escavador_monitoramento_id IS 'ID do monitoramento no Escavador API para acompanhamento de movimentacoes';
