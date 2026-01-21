-- =====================================================
-- MÓDULO CARTÕES DE CRÉDITO - POLÍTICAS RLS
-- =====================================================
-- Migration: Row Level Security para as tabelas de cartões
-- =====================================================

-- =====================================================
-- 1. HABILITAR RLS EM TODAS AS TABELAS
-- =====================================================

ALTER TABLE cartoes_credito ENABLE ROW LEVEL SECURITY;
ALTER TABLE cartoes_credito_despesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE cartoes_credito_parcelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE cartoes_credito_faturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE cartoes_credito_importacoes ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. POLÍTICAS PARA cartoes_credito
-- =====================================================

-- SELECT: Usuários veem cartões dos seus escritórios
DROP POLICY IF EXISTS "cartoes_credito_select_policy" ON cartoes_credito;
CREATE POLICY "cartoes_credito_select_policy"
  ON cartoes_credito FOR SELECT
  USING (
    escritorio_id IN (
      SELECT escritorio_id
      FROM user_escritorios_roles
      WHERE user_id = auth.uid()
        AND ativo = true
    )
  );

-- INSERT: Apenas admin e financeiro podem criar cartões
DROP POLICY IF EXISTS "cartoes_credito_insert_policy" ON cartoes_credito;
CREATE POLICY "cartoes_credito_insert_policy"
  ON cartoes_credito FOR INSERT
  WITH CHECK (
    escritorio_id IN (
      SELECT escritorio_id
      FROM user_escritorios_roles
      WHERE user_id = auth.uid()
        AND ativo = true
        AND role IN ('admin', 'financeiro')
    )
  );

-- UPDATE: Apenas admin e financeiro podem editar cartões
DROP POLICY IF EXISTS "cartoes_credito_update_policy" ON cartoes_credito;
CREATE POLICY "cartoes_credito_update_policy"
  ON cartoes_credito FOR UPDATE
  USING (
    escritorio_id IN (
      SELECT escritorio_id
      FROM user_escritorios_roles
      WHERE user_id = auth.uid()
        AND ativo = true
        AND role IN ('admin', 'financeiro')
    )
  );

-- DELETE: Apenas admin pode excluir cartões
DROP POLICY IF EXISTS "cartoes_credito_delete_policy" ON cartoes_credito;
CREATE POLICY "cartoes_credito_delete_policy"
  ON cartoes_credito FOR DELETE
  USING (
    escritorio_id IN (
      SELECT escritorio_id
      FROM user_escritorios_roles
      WHERE user_id = auth.uid()
        AND ativo = true
        AND role = 'admin'
    )
  );

-- =====================================================
-- 3. POLÍTICAS PARA cartoes_credito_despesas
-- =====================================================

-- SELECT: Usuários veem despesas dos seus escritórios
DROP POLICY IF EXISTS "cartoes_despesas_select_policy" ON cartoes_credito_despesas;
CREATE POLICY "cartoes_despesas_select_policy"
  ON cartoes_credito_despesas FOR SELECT
  USING (
    escritorio_id IN (
      SELECT escritorio_id
      FROM user_escritorios_roles
      WHERE user_id = auth.uid()
        AND ativo = true
    )
  );

-- INSERT: Admin e financeiro podem criar despesas
DROP POLICY IF EXISTS "cartoes_despesas_insert_policy" ON cartoes_credito_despesas;
CREATE POLICY "cartoes_despesas_insert_policy"
  ON cartoes_credito_despesas FOR INSERT
  WITH CHECK (
    escritorio_id IN (
      SELECT escritorio_id
      FROM user_escritorios_roles
      WHERE user_id = auth.uid()
        AND ativo = true
        AND role IN ('admin', 'financeiro')
    )
  );

-- UPDATE: Admin e financeiro podem editar despesas
DROP POLICY IF EXISTS "cartoes_despesas_update_policy" ON cartoes_credito_despesas;
CREATE POLICY "cartoes_despesas_update_policy"
  ON cartoes_credito_despesas FOR UPDATE
  USING (
    escritorio_id IN (
      SELECT escritorio_id
      FROM user_escritorios_roles
      WHERE user_id = auth.uid()
        AND ativo = true
        AND role IN ('admin', 'financeiro')
    )
  );

-- DELETE: Admin e financeiro podem excluir despesas
DROP POLICY IF EXISTS "cartoes_despesas_delete_policy" ON cartoes_credito_despesas;
CREATE POLICY "cartoes_despesas_delete_policy"
  ON cartoes_credito_despesas FOR DELETE
  USING (
    escritorio_id IN (
      SELECT escritorio_id
      FROM user_escritorios_roles
      WHERE user_id = auth.uid()
        AND ativo = true
        AND role IN ('admin', 'financeiro')
    )
  );

-- =====================================================
-- 4. POLÍTICAS PARA cartoes_credito_parcelas
-- =====================================================

-- SELECT: Através da despesa (via JOIN)
DROP POLICY IF EXISTS "cartoes_parcelas_select_policy" ON cartoes_credito_parcelas;
CREATE POLICY "cartoes_parcelas_select_policy"
  ON cartoes_credito_parcelas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cartoes_credito_despesas d
      WHERE d.id = cartoes_credito_parcelas.despesa_id
        AND d.escritorio_id IN (
          SELECT escritorio_id
          FROM user_escritorios_roles
          WHERE user_id = auth.uid()
            AND ativo = true
        )
    )
  );

-- INSERT: Através da despesa
DROP POLICY IF EXISTS "cartoes_parcelas_insert_policy" ON cartoes_credito_parcelas;
CREATE POLICY "cartoes_parcelas_insert_policy"
  ON cartoes_credito_parcelas FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cartoes_credito_despesas d
      WHERE d.id = cartoes_credito_parcelas.despesa_id
        AND d.escritorio_id IN (
          SELECT escritorio_id
          FROM user_escritorios_roles
          WHERE user_id = auth.uid()
            AND ativo = true
            AND role IN ('admin', 'financeiro')
        )
    )
  );

-- UPDATE: Através da despesa
DROP POLICY IF EXISTS "cartoes_parcelas_update_policy" ON cartoes_credito_parcelas;
CREATE POLICY "cartoes_parcelas_update_policy"
  ON cartoes_credito_parcelas FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM cartoes_credito_despesas d
      WHERE d.id = cartoes_credito_parcelas.despesa_id
        AND d.escritorio_id IN (
          SELECT escritorio_id
          FROM user_escritorios_roles
          WHERE user_id = auth.uid()
            AND ativo = true
            AND role IN ('admin', 'financeiro')
        )
    )
  );

-- DELETE: Através da despesa
DROP POLICY IF EXISTS "cartoes_parcelas_delete_policy" ON cartoes_credito_parcelas;
CREATE POLICY "cartoes_parcelas_delete_policy"
  ON cartoes_credito_parcelas FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM cartoes_credito_despesas d
      WHERE d.id = cartoes_credito_parcelas.despesa_id
        AND d.escritorio_id IN (
          SELECT escritorio_id
          FROM user_escritorios_roles
          WHERE user_id = auth.uid()
            AND ativo = true
            AND role IN ('admin', 'financeiro')
        )
    )
  );

-- =====================================================
-- 5. POLÍTICAS PARA cartoes_credito_faturas
-- =====================================================

-- SELECT: Usuários veem faturas dos seus escritórios
DROP POLICY IF EXISTS "cartoes_faturas_select_policy" ON cartoes_credito_faturas;
CREATE POLICY "cartoes_faturas_select_policy"
  ON cartoes_credito_faturas FOR SELECT
  USING (
    escritorio_id IN (
      SELECT escritorio_id
      FROM user_escritorios_roles
      WHERE user_id = auth.uid()
        AND ativo = true
    )
  );

-- INSERT: Admin e financeiro podem criar faturas
DROP POLICY IF EXISTS "cartoes_faturas_insert_policy" ON cartoes_credito_faturas;
CREATE POLICY "cartoes_faturas_insert_policy"
  ON cartoes_credito_faturas FOR INSERT
  WITH CHECK (
    escritorio_id IN (
      SELECT escritorio_id
      FROM user_escritorios_roles
      WHERE user_id = auth.uid()
        AND ativo = true
        AND role IN ('admin', 'financeiro')
    )
  );

-- UPDATE: Admin e financeiro podem editar faturas
DROP POLICY IF EXISTS "cartoes_faturas_update_policy" ON cartoes_credito_faturas;
CREATE POLICY "cartoes_faturas_update_policy"
  ON cartoes_credito_faturas FOR UPDATE
  USING (
    escritorio_id IN (
      SELECT escritorio_id
      FROM user_escritorios_roles
      WHERE user_id = auth.uid()
        AND ativo = true
        AND role IN ('admin', 'financeiro')
    )
  );

-- DELETE: Apenas admin pode excluir faturas
DROP POLICY IF EXISTS "cartoes_faturas_delete_policy" ON cartoes_credito_faturas;
CREATE POLICY "cartoes_faturas_delete_policy"
  ON cartoes_credito_faturas FOR DELETE
  USING (
    escritorio_id IN (
      SELECT escritorio_id
      FROM user_escritorios_roles
      WHERE user_id = auth.uid()
        AND ativo = true
        AND role = 'admin'
    )
  );

-- =====================================================
-- 6. POLÍTICAS PARA cartoes_credito_importacoes
-- =====================================================

-- SELECT: Usuários veem importações dos seus escritórios
DROP POLICY IF EXISTS "cartoes_importacoes_select_policy" ON cartoes_credito_importacoes;
CREATE POLICY "cartoes_importacoes_select_policy"
  ON cartoes_credito_importacoes FOR SELECT
  USING (
    escritorio_id IN (
      SELECT escritorio_id
      FROM user_escritorios_roles
      WHERE user_id = auth.uid()
        AND ativo = true
    )
  );

-- INSERT: Admin e financeiro podem criar importações
DROP POLICY IF EXISTS "cartoes_importacoes_insert_policy" ON cartoes_credito_importacoes;
CREATE POLICY "cartoes_importacoes_insert_policy"
  ON cartoes_credito_importacoes FOR INSERT
  WITH CHECK (
    escritorio_id IN (
      SELECT escritorio_id
      FROM user_escritorios_roles
      WHERE user_id = auth.uid()
        AND ativo = true
        AND role IN ('admin', 'financeiro')
    )
  );

-- UPDATE: Admin e financeiro podem editar importações
DROP POLICY IF EXISTS "cartoes_importacoes_update_policy" ON cartoes_credito_importacoes;
CREATE POLICY "cartoes_importacoes_update_policy"
  ON cartoes_credito_importacoes FOR UPDATE
  USING (
    escritorio_id IN (
      SELECT escritorio_id
      FROM user_escritorios_roles
      WHERE user_id = auth.uid()
        AND ativo = true
        AND role IN ('admin', 'financeiro')
    )
  );

-- DELETE: Admin pode excluir importações
DROP POLICY IF EXISTS "cartoes_importacoes_delete_policy" ON cartoes_credito_importacoes;
CREATE POLICY "cartoes_importacoes_delete_policy"
  ON cartoes_credito_importacoes FOR DELETE
  USING (
    escritorio_id IN (
      SELECT escritorio_id
      FROM user_escritorios_roles
      WHERE user_id = auth.uid()
        AND ativo = true
        AND role = 'admin'
    )
  );

-- =====================================================
-- 7. GRANTS PARA SERVICE ROLE (funções internas)
-- =====================================================

-- Permitir que funções internas executem sem restrição de RLS
GRANT ALL ON cartoes_credito TO service_role;
GRANT ALL ON cartoes_credito_despesas TO service_role;
GRANT ALL ON cartoes_credito_parcelas TO service_role;
GRANT ALL ON cartoes_credito_faturas TO service_role;
GRANT ALL ON cartoes_credito_importacoes TO service_role;

-- =====================================================
-- 8. ÍNDICES ADICIONAIS PARA PERFORMANCE DE RLS
-- =====================================================

-- Índice para acelerar busca de roles por user_id
CREATE INDEX IF NOT EXISTS idx_user_escritorios_roles_user_ativo
  ON user_escritorios_roles(user_id, ativo)
  WHERE ativo = true;
