-- =====================================================
-- Migration: Tabela de Depósitos Judiciais
-- Descrição: Cria tabela para gerenciar depósitos
-- recursais, embargo, caução e outros depósitos
-- vinculados a processos
-- =====================================================

-- Tabela principal de depósitos
CREATE TABLE processos_depositos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id UUID NOT NULL REFERENCES processos_processos(id) ON DELETE CASCADE,
  escritorio_id UUID NOT NULL REFERENCES escritorios(id),

  -- Dados do depósito
  tipo TEXT NOT NULL CHECK (tipo IN ('recursal', 'embargo', 'caucao', 'outro')),
  descricao TEXT,
  valor NUMERIC(15,2) NOT NULL,
  data_deposito DATE NOT NULL,

  -- Conta/Origem
  banco TEXT,
  agencia TEXT,
  conta TEXT,
  numero_guia TEXT,

  -- Situação
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'levantado', 'convertido', 'perdido')),
  data_levantamento DATE,
  valor_levantado NUMERIC(15,2),
  observacoes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Índices
CREATE INDEX idx_depositos_processo ON processos_depositos(processo_id);
CREATE INDEX idx_depositos_escritorio ON processos_depositos(escritorio_id);
CREATE INDEX idx_depositos_status ON processos_depositos(status);
CREATE INDEX idx_depositos_tipo ON processos_depositos(tipo);

-- Trigger para updated_at
CREATE TRIGGER set_updated_at_depositos
  BEFORE UPDATE ON processos_depositos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- RLS Policies
-- =====================================================
ALTER TABLE processos_depositos ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem ver depósitos do próprio escritório
CREATE POLICY "Usuarios podem ver depositos do proprio escritorio"
  ON processos_depositos
  FOR SELECT
  USING (
    escritorio_id IN (
      SELECT escritorio_id FROM escritorios_usuarios
      WHERE user_id = auth.uid() AND ativo = true
    )
  );

-- Policy: Usuários podem inserir depósitos no próprio escritório
CREATE POLICY "Usuarios podem inserir depositos no proprio escritorio"
  ON processos_depositos
  FOR INSERT
  WITH CHECK (
    escritorio_id IN (
      SELECT escritorio_id FROM escritorios_usuarios
      WHERE user_id = auth.uid() AND ativo = true
    )
  );

-- Policy: Usuários podem atualizar depósitos do próprio escritório
CREATE POLICY "Usuarios podem atualizar depositos do proprio escritorio"
  ON processos_depositos
  FOR UPDATE
  USING (
    escritorio_id IN (
      SELECT escritorio_id FROM escritorios_usuarios
      WHERE user_id = auth.uid() AND ativo = true
    )
  );

-- Policy: Usuários podem deletar depósitos do próprio escritório
CREATE POLICY "Usuarios podem deletar depositos do proprio escritorio"
  ON processos_depositos
  FOR DELETE
  USING (
    escritorio_id IN (
      SELECT escritorio_id FROM escritorios_usuarios
      WHERE user_id = auth.uid() AND ativo = true
    )
  );

-- =====================================================
-- View para resumo de depósitos por processo
-- =====================================================
CREATE OR REPLACE VIEW vw_depositos_resumo AS
SELECT
  processo_id,
  COUNT(*) FILTER (WHERE status = 'ativo') AS total_ativos,
  COUNT(*) FILTER (WHERE status = 'levantado') AS total_levantados,
  COUNT(*) FILTER (WHERE status = 'convertido') AS total_convertidos,
  COUNT(*) FILTER (WHERE status = 'perdido') AS total_perdidos,
  COALESCE(SUM(valor) FILTER (WHERE status = 'ativo'), 0) AS valor_ativo,
  COALESCE(SUM(valor_levantado) FILTER (WHERE status = 'levantado'), 0) AS valor_levantado,
  COALESCE(SUM(valor) FILTER (WHERE status = 'convertido'), 0) AS valor_convertido,
  COALESCE(SUM(valor) FILTER (WHERE status = 'perdido'), 0) AS valor_perdido
FROM processos_depositos
GROUP BY processo_id;

GRANT SELECT ON vw_depositos_resumo TO authenticated;

-- Comentários
COMMENT ON TABLE processos_depositos IS 'Depósitos judiciais vinculados a processos (recursais, embargo, caução, etc.)';
COMMENT ON COLUMN processos_depositos.tipo IS 'Tipo do depósito: recursal, embargo, caucao, outro';
COMMENT ON COLUMN processos_depositos.status IS 'Status: ativo (aguardando), levantado (sacado), convertido (perdeu), perdido';
COMMENT ON COLUMN processos_depositos.numero_guia IS 'Número da guia de depósito judicial';
