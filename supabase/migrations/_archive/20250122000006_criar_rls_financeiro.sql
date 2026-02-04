-- Migration: Criar RLS policies para novas tabelas financeiras
-- Data: 2025-01-22
-- Descrição: Políticas de segurança para financeiro_receitas e reconciliação

-- ============================================================
-- 1. HABILITAR RLS NAS TABELAS
-- ============================================================

ALTER TABLE financeiro_receitas ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro_reconciliacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro_reconciliacao_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro_extrato_importacoes ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. FUNÇÃO HELPER: VERIFICAR ACESSO AO ESCRITÓRIO
-- ============================================================

-- Usa a função existente ou cria se não existir
CREATE OR REPLACE FUNCTION auth.user_has_access_to_escritorio(p_escritorio_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND escritorio_id = p_escritorio_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- 3. RLS: FINANCEIRO_RECEITAS
-- ============================================================

-- Política SELECT
DROP POLICY IF EXISTS receitas_select_policy ON financeiro_receitas;
CREATE POLICY receitas_select_policy ON financeiro_receitas
  FOR SELECT
  USING (
    auth.user_has_access_to_escritorio(escritorio_id)
  );

-- Política INSERT
DROP POLICY IF EXISTS receitas_insert_policy ON financeiro_receitas;
CREATE POLICY receitas_insert_policy ON financeiro_receitas
  FOR INSERT
  WITH CHECK (
    auth.user_has_access_to_escritorio(escritorio_id)
  );

-- Política UPDATE
DROP POLICY IF EXISTS receitas_update_policy ON financeiro_receitas;
CREATE POLICY receitas_update_policy ON financeiro_receitas
  FOR UPDATE
  USING (
    auth.user_has_access_to_escritorio(escritorio_id)
  )
  WITH CHECK (
    auth.user_has_access_to_escritorio(escritorio_id)
  );

-- Política DELETE
DROP POLICY IF EXISTS receitas_delete_policy ON financeiro_receitas;
CREATE POLICY receitas_delete_policy ON financeiro_receitas
  FOR DELETE
  USING (
    auth.user_has_access_to_escritorio(escritorio_id)
  );

-- ============================================================
-- 4. RLS: FINANCEIRO_RECONCILIACAO
-- ============================================================

-- Política SELECT
DROP POLICY IF EXISTS reconciliacao_select_policy ON financeiro_reconciliacao;
CREATE POLICY reconciliacao_select_policy ON financeiro_reconciliacao
  FOR SELECT
  USING (
    auth.user_has_access_to_escritorio(escritorio_id)
  );

-- Política INSERT
DROP POLICY IF EXISTS reconciliacao_insert_policy ON financeiro_reconciliacao;
CREATE POLICY reconciliacao_insert_policy ON financeiro_reconciliacao
  FOR INSERT
  WITH CHECK (
    auth.user_has_access_to_escritorio(escritorio_id)
  );

-- Política UPDATE
DROP POLICY IF EXISTS reconciliacao_update_policy ON financeiro_reconciliacao;
CREATE POLICY reconciliacao_update_policy ON financeiro_reconciliacao
  FOR UPDATE
  USING (
    auth.user_has_access_to_escritorio(escritorio_id)
  )
  WITH CHECK (
    auth.user_has_access_to_escritorio(escritorio_id)
  );

-- Política DELETE
DROP POLICY IF EXISTS reconciliacao_delete_policy ON financeiro_reconciliacao;
CREATE POLICY reconciliacao_delete_policy ON financeiro_reconciliacao
  FOR DELETE
  USING (
    auth.user_has_access_to_escritorio(escritorio_id)
  );

-- ============================================================
-- 5. RLS: FINANCEIRO_RECONCILIACAO_ITENS
-- ============================================================

-- Política SELECT (via join com reconciliacao)
DROP POLICY IF EXISTS reconciliacao_itens_select_policy ON financeiro_reconciliacao_itens;
CREATE POLICY reconciliacao_itens_select_policy ON financeiro_reconciliacao_itens
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM financeiro_reconciliacao r
      WHERE r.id = reconciliacao_id
      AND auth.user_has_access_to_escritorio(r.escritorio_id)
    )
  );

-- Política INSERT
DROP POLICY IF EXISTS reconciliacao_itens_insert_policy ON financeiro_reconciliacao_itens;
CREATE POLICY reconciliacao_itens_insert_policy ON financeiro_reconciliacao_itens
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM financeiro_reconciliacao r
      WHERE r.id = reconciliacao_id
      AND auth.user_has_access_to_escritorio(r.escritorio_id)
    )
  );

-- Política UPDATE
DROP POLICY IF EXISTS reconciliacao_itens_update_policy ON financeiro_reconciliacao_itens;
CREATE POLICY reconciliacao_itens_update_policy ON financeiro_reconciliacao_itens
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM financeiro_reconciliacao r
      WHERE r.id = reconciliacao_id
      AND auth.user_has_access_to_escritorio(r.escritorio_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM financeiro_reconciliacao r
      WHERE r.id = reconciliacao_id
      AND auth.user_has_access_to_escritorio(r.escritorio_id)
    )
  );

-- Política DELETE
DROP POLICY IF EXISTS reconciliacao_itens_delete_policy ON financeiro_reconciliacao_itens;
CREATE POLICY reconciliacao_itens_delete_policy ON financeiro_reconciliacao_itens
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM financeiro_reconciliacao r
      WHERE r.id = reconciliacao_id
      AND auth.user_has_access_to_escritorio(r.escritorio_id)
    )
  );

-- ============================================================
-- 6. RLS: FINANCEIRO_EXTRATO_IMPORTACOES
-- ============================================================

-- Política SELECT
DROP POLICY IF EXISTS extrato_importacoes_select_policy ON financeiro_extrato_importacoes;
CREATE POLICY extrato_importacoes_select_policy ON financeiro_extrato_importacoes
  FOR SELECT
  USING (
    auth.user_has_access_to_escritorio(escritorio_id)
  );

-- Política INSERT
DROP POLICY IF EXISTS extrato_importacoes_insert_policy ON financeiro_extrato_importacoes;
CREATE POLICY extrato_importacoes_insert_policy ON financeiro_extrato_importacoes
  FOR INSERT
  WITH CHECK (
    auth.user_has_access_to_escritorio(escritorio_id)
  );

-- Política UPDATE
DROP POLICY IF EXISTS extrato_importacoes_update_policy ON financeiro_extrato_importacoes;
CREATE POLICY extrato_importacoes_update_policy ON financeiro_extrato_importacoes
  FOR UPDATE
  USING (
    auth.user_has_access_to_escritorio(escritorio_id)
  )
  WITH CHECK (
    auth.user_has_access_to_escritorio(escritorio_id)
  );

-- Política DELETE
DROP POLICY IF EXISTS extrato_importacoes_delete_policy ON financeiro_extrato_importacoes;
CREATE POLICY extrato_importacoes_delete_policy ON financeiro_extrato_importacoes
  FOR DELETE
  USING (
    auth.user_has_access_to_escritorio(escritorio_id)
  );

-- ============================================================
-- 7. GRANT PERMISSÕES PARA authenticated
-- ============================================================

-- Tabela financeiro_receitas
GRANT SELECT, INSERT, UPDATE, DELETE ON financeiro_receitas TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Tabela financeiro_reconciliacao
GRANT SELECT, INSERT, UPDATE, DELETE ON financeiro_reconciliacao TO authenticated;

-- Tabela financeiro_reconciliacao_itens
GRANT SELECT, INSERT, UPDATE, DELETE ON financeiro_reconciliacao_itens TO authenticated;

-- Tabela financeiro_extrato_importacoes
GRANT SELECT, INSERT, UPDATE, DELETE ON financeiro_extrato_importacoes TO authenticated;

-- Views
GRANT SELECT ON v_lancamentos_prontos_faturar TO authenticated;
GRANT SELECT ON v_contas_receber_pagar TO authenticated;
GRANT SELECT ON v_extrato_financeiro TO authenticated;
GRANT SELECT ON v_dashboard_financeiro_metricas TO authenticated;
GRANT SELECT ON v_receitas_por_contrato TO authenticated;
GRANT SELECT ON v_despesas_reembolsaveis_pendentes TO authenticated;

-- Funções
GRANT EXECUTE ON FUNCTION calcular_proximo_vencimento TO authenticated;
GRANT EXECUTE ON FUNCTION receber_receita_parcial TO authenticated;
GRANT EXECUTE ON FUNCTION receber_receita TO authenticated;
GRANT EXECUTE ON FUNCTION gerar_lancamentos_recorrentes TO authenticated;
GRANT EXECUTE ON FUNCTION atualizar_receitas_atrasadas TO authenticated;
GRANT EXECUTE ON FUNCTION criar_receita TO authenticated;
GRANT EXECUTE ON FUNCTION auto_match_reconciliacao TO authenticated;
GRANT EXECUTE ON FUNCTION calcular_saldo_reconciliacao TO authenticated;
GRANT EXECUTE ON FUNCTION calcular_hash_extrato TO authenticated;
