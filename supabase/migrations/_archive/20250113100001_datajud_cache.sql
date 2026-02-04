-- Migration: DataJud Cache
-- Data: 2025-01-13
-- Descricao: Tabela para cache de consultas a API publica do DataJud (CNJ)

-- =====================================================
-- TABELA: datajud_consultas
-- =====================================================

CREATE TABLE datajud_consultas (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identificacao
  numero_cnj text NOT NULL UNIQUE,
  tribunal text,

  -- Dados da consulta
  dados_normalizados jsonb NOT NULL,

  -- Controle de cache
  consultado_em timestamptz NOT NULL DEFAULT now(),
  expira_em timestamptz NOT NULL,

  -- Auditoria
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Indices
CREATE INDEX idx_datajud_consultas_numero ON datajud_consultas(numero_cnj);
CREATE INDEX idx_datajud_consultas_expira ON datajud_consultas(expira_em);
CREATE INDEX idx_datajud_consultas_tribunal ON datajud_consultas(tribunal);

-- Comentario
COMMENT ON TABLE datajud_consultas IS 'Cache de consultas a API publica do DataJud (CNJ) para evitar requisicoes repetidas';

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE datajud_consultas ENABLE ROW LEVEL SECURITY;

-- Politica: qualquer usuario autenticado pode consultar o cache
CREATE POLICY "Usuarios autenticados podem ler cache DataJud"
  ON datajud_consultas
  FOR SELECT
  TO authenticated
  USING (true);

-- Politica: qualquer usuario autenticado pode inserir no cache
CREATE POLICY "Usuarios autenticados podem inserir no cache DataJud"
  ON datajud_consultas
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Politica: qualquer usuario autenticado pode atualizar o cache
CREATE POLICY "Usuarios autenticados podem atualizar cache DataJud"
  ON datajud_consultas
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Politica: qualquer usuario autenticado pode deletar do cache
CREATE POLICY "Usuarios autenticados podem deletar cache DataJud"
  ON datajud_consultas
  FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- FUNCAO: Limpar cache expirado
-- =====================================================

CREATE OR REPLACE FUNCTION limpar_cache_datajud_expirado()
RETURNS integer AS $$
DECLARE
  registros_deletados integer;
BEGIN
  DELETE FROM datajud_consultas
  WHERE expira_em < now();

  GET DIAGNOSTICS registros_deletados = ROW_COUNT;

  RETURN registros_deletados;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION limpar_cache_datajud_expirado IS 'Remove registros de cache do DataJud que ja expiraram. Retorna quantidade de registros removidos.';

-- =====================================================
-- GRANT para funcao de limpeza
-- =====================================================

-- Permitir que funcoes agendadas executem a limpeza
GRANT EXECUTE ON FUNCTION limpar_cache_datajud_expirado() TO authenticated;
GRANT EXECUTE ON FUNCTION limpar_cache_datajud_expirado() TO service_role;
