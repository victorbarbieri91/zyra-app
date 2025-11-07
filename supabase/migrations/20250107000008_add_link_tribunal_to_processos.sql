-- Migration: Adicionar coluna link_tribunal à tabela processos_processos
-- Description: Adiciona campo para armazenar o link direto para a página do processo no site do tribunal
-- Created: 2025-01-07

-- Adicionar coluna link_tribunal
ALTER TABLE processos_processos
ADD COLUMN link_tribunal TEXT;

-- Adicionar comentário na coluna
COMMENT ON COLUMN processos_processos.link_tribunal IS 'URL para acesso direto ao processo no site do tribunal';

-- Criar índice para facilitar buscas (opcional, mas recomendado)
CREATE INDEX IF NOT EXISTS idx_processos_processos_link_tribunal
ON processos_processos(link_tribunal)
WHERE link_tribunal IS NOT NULL;
