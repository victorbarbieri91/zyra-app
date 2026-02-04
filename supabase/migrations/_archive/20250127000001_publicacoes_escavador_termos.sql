-- ============================================
-- Migration: Adicionar suporte a Escavador por Termo
-- Sistema unificado de publicações: AASP + Escavador
-- ============================================

-- 1. Adicionar novos campos na tabela de publicações
ALTER TABLE publicacoes_publicacoes
ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'aasp'
  CHECK (source_type IN ('aasp', 'escavador_termo', 'manual')),
ADD COLUMN IF NOT EXISTS escavador_aparicao_id TEXT,
ADD COLUMN IF NOT EXISTS escavador_monitoramento_id TEXT,
ADD COLUMN IF NOT EXISTS confianca_vinculacao DECIMAL(3,2) DEFAULT 1.00;

-- Comentários
COMMENT ON COLUMN publicacoes_publicacoes.source_type IS 'Fonte da publicação: aasp, escavador_termo ou manual';
COMMENT ON COLUMN publicacoes_publicacoes.escavador_aparicao_id IS 'ID único da aparição no Escavador';
COMMENT ON COLUMN publicacoes_publicacoes.escavador_monitoramento_id IS 'ID do monitoramento que capturou esta publicação';
COMMENT ON COLUMN publicacoes_publicacoes.confianca_vinculacao IS 'Confiança da vinculação automática com processo (0.00 a 1.00)';

-- Índice para busca por source_type
CREATE INDEX IF NOT EXISTS idx_publicacoes_source_type
ON publicacoes_publicacoes(escritorio_id, source_type);

-- Índice para evitar duplicatas do Escavador
CREATE UNIQUE INDEX IF NOT EXISTS idx_publicacoes_escavador_aparicao
ON publicacoes_publicacoes(escavador_aparicao_id)
WHERE escavador_aparicao_id IS NOT NULL;

-- ============================================
-- 2. Criar tabela de termos monitorados no Escavador
-- ============================================
CREATE TABLE IF NOT EXISTS publicacoes_termos_escavador (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id UUID NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,

  -- Dados do termo
  termo TEXT NOT NULL,
  descricao TEXT,
  variacoes TEXT[] DEFAULT '{}',
  termos_auxiliares JSONB DEFAULT '[]',

  -- IDs dos diários oficiais a monitorar (se vazio, monitora todos)
  origens_ids INTEGER[] DEFAULT '{}',

  -- Dados do monitoramento no Escavador
  escavador_monitoramento_id TEXT,
  escavador_status TEXT DEFAULT 'pendente'
    CHECK (escavador_status IN ('pendente', 'ativo', 'pausado', 'erro', 'removido')),
  escavador_erro TEXT,

  -- Estatísticas
  total_aparicoes INTEGER DEFAULT 0,
  ultima_aparicao TIMESTAMPTZ,
  ultima_sync TIMESTAMPTZ,

  -- Controle
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraint: termo único por escritório
  UNIQUE(escritorio_id, termo)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_termos_escavador_escritorio
ON publicacoes_termos_escavador(escritorio_id);

CREATE INDEX IF NOT EXISTS idx_termos_escavador_ativo
ON publicacoes_termos_escavador(escritorio_id, ativo)
WHERE ativo = true;

CREATE INDEX IF NOT EXISTS idx_termos_escavador_monitoramento
ON publicacoes_termos_escavador(escavador_monitoramento_id)
WHERE escavador_monitoramento_id IS NOT NULL;

-- Comentários
COMMENT ON TABLE publicacoes_termos_escavador IS 'Configuração de termos monitorados no Escavador para publicações em diários oficiais';
COMMENT ON COLUMN publicacoes_termos_escavador.termo IS 'Termo a ser monitorado (nome do advogado, escritório, etc)';
COMMENT ON COLUMN publicacoes_termos_escavador.variacoes IS 'Variações do termo (ex: João Silva, J. Silva)';
COMMENT ON COLUMN publicacoes_termos_escavador.termos_auxiliares IS 'Filtros adicionais no formato [["deve conter", "termo"], ["não deve conter", "termo"]]';
COMMENT ON COLUMN publicacoes_termos_escavador.origens_ids IS 'IDs dos diários oficiais no Escavador (vazio = todos)';
COMMENT ON COLUMN publicacoes_termos_escavador.escavador_monitoramento_id IS 'ID do monitoramento criado no Escavador';

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_termos_escavador_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_termos_escavador_updated_at ON publicacoes_termos_escavador;
CREATE TRIGGER trigger_update_termos_escavador_updated_at
  BEFORE UPDATE ON publicacoes_termos_escavador
  FOR EACH ROW
  EXECUTE FUNCTION update_termos_escavador_updated_at();

-- ============================================
-- 3. RLS Policies para termos
-- ============================================
ALTER TABLE publicacoes_termos_escavador ENABLE ROW LEVEL SECURITY;

-- Select: usuários veem termos do próprio escritório
CREATE POLICY "Usuarios podem ver termos do proprio escritorio"
ON publicacoes_termos_escavador FOR SELECT
USING (
  escritorio_id IN (
    SELECT escritorio_id FROM profiles WHERE id = auth.uid()
  )
);

-- Insert: usuários podem inserir termos no próprio escritório
CREATE POLICY "Usuarios podem inserir termos no proprio escritorio"
ON publicacoes_termos_escavador FOR INSERT
WITH CHECK (
  escritorio_id IN (
    SELECT escritorio_id FROM profiles WHERE id = auth.uid()
  )
);

-- Update: usuários podem atualizar termos do próprio escritório
CREATE POLICY "Usuarios podem atualizar termos do proprio escritorio"
ON publicacoes_termos_escavador FOR UPDATE
USING (
  escritorio_id IN (
    SELECT escritorio_id FROM profiles WHERE id = auth.uid()
  )
);

-- Delete: usuários podem deletar termos do próprio escritório
CREATE POLICY "Usuarios podem deletar termos do proprio escritorio"
ON publicacoes_termos_escavador FOR DELETE
USING (
  escritorio_id IN (
    SELECT escritorio_id FROM profiles WHERE id = auth.uid()
  )
);

-- ============================================
-- 4. Tabela de log de sincronizações Escavador
-- ============================================
CREATE TABLE IF NOT EXISTS publicacoes_sync_escavador (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id UUID NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,
  termo_id UUID REFERENCES publicacoes_termos_escavador(id) ON DELETE SET NULL,

  tipo TEXT NOT NULL CHECK (tipo IN ('manual', 'automatica', 'callback')),
  data_inicio TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_fim TIMESTAMPTZ,

  publicacoes_novas INTEGER DEFAULT 0,
  publicacoes_duplicadas INTEGER DEFAULT 0,
  publicacoes_vinculadas INTEGER DEFAULT 0,

  sucesso BOOLEAN,
  erro_mensagem TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para busca por escritório
CREATE INDEX IF NOT EXISTS idx_sync_escavador_escritorio
ON publicacoes_sync_escavador(escritorio_id, created_at DESC);

-- RLS
ALTER TABLE publicacoes_sync_escavador ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios podem ver syncs do proprio escritorio"
ON publicacoes_sync_escavador FOR SELECT
USING (
  escritorio_id IN (
    SELECT escritorio_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Usuarios podem inserir syncs no proprio escritorio"
ON publicacoes_sync_escavador FOR INSERT
WITH CHECK (
  escritorio_id IN (
    SELECT escritorio_id FROM profiles WHERE id = auth.uid()
  )
);

-- ============================================
-- 5. Função para extrair número CNJ do texto
-- ============================================
CREATE OR REPLACE FUNCTION extrair_numero_cnj(texto TEXT)
RETURNS TEXT AS $$
DECLARE
  resultado TEXT;
BEGIN
  -- Padrão CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO
  SELECT (regexp_matches(texto, '\d{7}-\d{2}\.\d{4}\.\d{1}\.\d{2}\.\d{4}', 'g'))[1]
  INTO resultado;

  RETURN resultado;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION extrair_numero_cnj IS 'Extrai o primeiro número de processo no formato CNJ encontrado no texto';

-- ============================================
-- 6. Função para vincular publicação a processo automaticamente
-- ============================================
CREATE OR REPLACE FUNCTION vincular_publicacao_processo()
RETURNS TRIGGER AS $$
DECLARE
  numero_cnj_extraido TEXT;
  processo_encontrado UUID;
BEGIN
  -- Se já tem processo_id ou não tem texto, não faz nada
  IF NEW.processo_id IS NOT NULL OR NEW.texto_completo IS NULL THEN
    RETURN NEW;
  END IF;

  -- Se já tem numero_processo, usa ele
  IF NEW.numero_processo IS NOT NULL THEN
    numero_cnj_extraido := NEW.numero_processo;
  ELSE
    -- Extrai do texto
    numero_cnj_extraido := extrair_numero_cnj(NEW.texto_completo);

    -- Atualiza o numero_processo se extraiu
    IF numero_cnj_extraido IS NOT NULL THEN
      NEW.numero_processo := numero_cnj_extraido;
    END IF;
  END IF;

  -- Se tem número CNJ, tenta vincular
  IF numero_cnj_extraido IS NOT NULL THEN
    SELECT id INTO processo_encontrado
    FROM processos_processos
    WHERE escritorio_id = NEW.escritorio_id
      AND numero_cnj = numero_cnj_extraido
    LIMIT 1;

    IF processo_encontrado IS NOT NULL THEN
      NEW.processo_id := processo_encontrado;
      NEW.confianca_vinculacao := 1.00;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para vincular automaticamente
DROP TRIGGER IF EXISTS trigger_vincular_publicacao_processo ON publicacoes_publicacoes;
CREATE TRIGGER trigger_vincular_publicacao_processo
  BEFORE INSERT ON publicacoes_publicacoes
  FOR EACH ROW
  EXECUTE FUNCTION vincular_publicacao_processo();

COMMENT ON FUNCTION vincular_publicacao_processo IS 'Vincula automaticamente publicação a processo existente baseado no número CNJ';
