-- Migration: Criar tabela publicacoes_associados para integração AASP
-- Permite cadastrar múltiplos advogados com suas chaves API individuais

-- 1. Criar tabela de associados
CREATE TABLE IF NOT EXISTS publicacoes_associados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id UUID NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  oab_numero TEXT NOT NULL,
  oab_uf TEXT NOT NULL DEFAULT 'SP',
  aasp_chave TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  ultima_sync TIMESTAMPTZ,
  publicacoes_sync_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(escritorio_id, oab_numero, oab_uf)
);

-- 2. Adicionar coluna associado_id na tabela de publicações
ALTER TABLE publicacoes_publicacoes
ADD COLUMN IF NOT EXISTS associado_id UUID REFERENCES publicacoes_associados(id) ON DELETE SET NULL;

-- 3. Criar índices
CREATE INDEX IF NOT EXISTS idx_publicacoes_associados_escritorio
ON publicacoes_associados(escritorio_id);

CREATE INDEX IF NOT EXISTS idx_publicacoes_associados_ativo
ON publicacoes_associados(escritorio_id, ativo) WHERE ativo = true;

CREATE INDEX IF NOT EXISTS idx_publicacoes_publicacoes_associado
ON publicacoes_publicacoes(associado_id);

-- 4. Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_publicacoes_associados_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_publicacoes_associados_updated_at ON publicacoes_associados;
CREATE TRIGGER trigger_update_publicacoes_associados_updated_at
  BEFORE UPDATE ON publicacoes_associados
  FOR EACH ROW
  EXECUTE FUNCTION update_publicacoes_associados_updated_at();

-- 5. RLS Policies
ALTER TABLE publicacoes_associados ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem ver associados do próprio escritório
CREATE POLICY "Usuarios podem ver associados do proprio escritorio"
ON publicacoes_associados FOR SELECT
USING (
  escritorio_id IN (
    SELECT escritorio_id FROM profiles WHERE id = auth.uid()
  )
);

-- Policy: Usuários podem inserir associados no próprio escritório
CREATE POLICY "Usuarios podem inserir associados no proprio escritorio"
ON publicacoes_associados FOR INSERT
WITH CHECK (
  escritorio_id IN (
    SELECT escritorio_id FROM profiles WHERE id = auth.uid()
  )
);

-- Policy: Usuários podem atualizar associados do próprio escritório
CREATE POLICY "Usuarios podem atualizar associados do proprio escritorio"
ON publicacoes_associados FOR UPDATE
USING (
  escritorio_id IN (
    SELECT escritorio_id FROM profiles WHERE id = auth.uid()
  )
);

-- Policy: Usuários podem deletar associados do próprio escritório
CREATE POLICY "Usuarios podem deletar associados do proprio escritorio"
ON publicacoes_associados FOR DELETE
USING (
  escritorio_id IN (
    SELECT escritorio_id FROM profiles WHERE id = auth.uid()
  )
);

-- 6. Comentários
COMMENT ON TABLE publicacoes_associados IS 'Cadastro de advogados associados para integração AASP';
COMMENT ON COLUMN publicacoes_associados.aasp_chave IS 'Chave API individual do associado na AASP';
COMMENT ON COLUMN publicacoes_associados.ultima_sync IS 'Data/hora da última sincronização bem-sucedida';
COMMENT ON COLUMN publicacoes_associados.publicacoes_sync_count IS 'Total de publicações sincronizadas para este associado';
