-- =====================================================
-- MIGRATION: Portfolio - RLS Policies
-- Módulo: Portfólio (Catálogo de Produtos Jurídicos)
-- Data: 2025-01-13
-- =====================================================

-- =====================================================
-- 1. HABILITAR RLS EM TODAS AS TABELAS
-- =====================================================
ALTER TABLE portfolio_produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_produtos_fases ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_produtos_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_produtos_equipe_papeis ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_produtos_precos ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_produtos_recursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_produtos_versoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_projetos ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_projetos_fases ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_projetos_fases_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_projetos_equipe ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_projetos_aprendizados ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_metricas ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. FUNCTION: Verificar acesso ao escritório
-- =====================================================
CREATE OR REPLACE FUNCTION user_tem_acesso_escritorio_portfolio(p_escritorio_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND escritorio_id = p_escritorio_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. POLICIES: portfolio_produtos
-- =====================================================

-- SELECT: Usuários podem ver produtos do seu escritório
CREATE POLICY "portfolio_produtos_select"
  ON portfolio_produtos
  FOR SELECT
  USING (user_tem_acesso_escritorio_portfolio(escritorio_id));

-- INSERT: Usuários podem criar produtos no seu escritório
CREATE POLICY "portfolio_produtos_insert"
  ON portfolio_produtos
  FOR INSERT
  WITH CHECK (user_tem_acesso_escritorio_portfolio(escritorio_id));

-- UPDATE: Usuários podem atualizar produtos do seu escritório
CREATE POLICY "portfolio_produtos_update"
  ON portfolio_produtos
  FOR UPDATE
  USING (user_tem_acesso_escritorio_portfolio(escritorio_id))
  WITH CHECK (user_tem_acesso_escritorio_portfolio(escritorio_id));

-- DELETE: Usuários podem deletar produtos do seu escritório
CREATE POLICY "portfolio_produtos_delete"
  ON portfolio_produtos
  FOR DELETE
  USING (user_tem_acesso_escritorio_portfolio(escritorio_id));

-- =====================================================
-- 4. POLICIES: portfolio_produtos_fases
-- =====================================================

-- SELECT: Baseado no produto
CREATE POLICY "portfolio_produtos_fases_select"
  ON portfolio_produtos_fases
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM portfolio_produtos p
      WHERE p.id = produto_id
        AND user_tem_acesso_escritorio_portfolio(p.escritorio_id)
    )
  );

-- INSERT: Baseado no produto
CREATE POLICY "portfolio_produtos_fases_insert"
  ON portfolio_produtos_fases
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM portfolio_produtos p
      WHERE p.id = produto_id
        AND user_tem_acesso_escritorio_portfolio(p.escritorio_id)
    )
  );

-- UPDATE: Baseado no produto
CREATE POLICY "portfolio_produtos_fases_update"
  ON portfolio_produtos_fases
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM portfolio_produtos p
      WHERE p.id = produto_id
        AND user_tem_acesso_escritorio_portfolio(p.escritorio_id)
    )
  );

-- DELETE: Baseado no produto
CREATE POLICY "portfolio_produtos_fases_delete"
  ON portfolio_produtos_fases
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM portfolio_produtos p
      WHERE p.id = produto_id
        AND user_tem_acesso_escritorio_portfolio(p.escritorio_id)
    )
  );

-- =====================================================
-- 5. POLICIES: portfolio_produtos_checklist
-- =====================================================

-- SELECT: Baseado na fase -> produto
CREATE POLICY "portfolio_produtos_checklist_select"
  ON portfolio_produtos_checklist
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM portfolio_produtos_fases f
      JOIN portfolio_produtos p ON p.id = f.produto_id
      WHERE f.id = fase_id
        AND user_tem_acesso_escritorio_portfolio(p.escritorio_id)
    )
  );

-- INSERT
CREATE POLICY "portfolio_produtos_checklist_insert"
  ON portfolio_produtos_checklist
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM portfolio_produtos_fases f
      JOIN portfolio_produtos p ON p.id = f.produto_id
      WHERE f.id = fase_id
        AND user_tem_acesso_escritorio_portfolio(p.escritorio_id)
    )
  );

-- UPDATE
CREATE POLICY "portfolio_produtos_checklist_update"
  ON portfolio_produtos_checklist
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM portfolio_produtos_fases f
      JOIN portfolio_produtos p ON p.id = f.produto_id
      WHERE f.id = fase_id
        AND user_tem_acesso_escritorio_portfolio(p.escritorio_id)
    )
  );

-- DELETE
CREATE POLICY "portfolio_produtos_checklist_delete"
  ON portfolio_produtos_checklist
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM portfolio_produtos_fases f
      JOIN portfolio_produtos p ON p.id = f.produto_id
      WHERE f.id = fase_id
        AND user_tem_acesso_escritorio_portfolio(p.escritorio_id)
    )
  );

-- =====================================================
-- 6. POLICIES: portfolio_produtos_equipe_papeis
-- =====================================================

CREATE POLICY "portfolio_produtos_equipe_papeis_select"
  ON portfolio_produtos_equipe_papeis FOR SELECT
  USING (EXISTS (SELECT 1 FROM portfolio_produtos p WHERE p.id = produto_id AND user_tem_acesso_escritorio_portfolio(p.escritorio_id)));

CREATE POLICY "portfolio_produtos_equipe_papeis_insert"
  ON portfolio_produtos_equipe_papeis FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM portfolio_produtos p WHERE p.id = produto_id AND user_tem_acesso_escritorio_portfolio(p.escritorio_id)));

CREATE POLICY "portfolio_produtos_equipe_papeis_update"
  ON portfolio_produtos_equipe_papeis FOR UPDATE
  USING (EXISTS (SELECT 1 FROM portfolio_produtos p WHERE p.id = produto_id AND user_tem_acesso_escritorio_portfolio(p.escritorio_id)));

CREATE POLICY "portfolio_produtos_equipe_papeis_delete"
  ON portfolio_produtos_equipe_papeis FOR DELETE
  USING (EXISTS (SELECT 1 FROM portfolio_produtos p WHERE p.id = produto_id AND user_tem_acesso_escritorio_portfolio(p.escritorio_id)));

-- =====================================================
-- 7. POLICIES: portfolio_produtos_precos
-- =====================================================

CREATE POLICY "portfolio_produtos_precos_select"
  ON portfolio_produtos_precos FOR SELECT
  USING (EXISTS (SELECT 1 FROM portfolio_produtos p WHERE p.id = produto_id AND user_tem_acesso_escritorio_portfolio(p.escritorio_id)));

CREATE POLICY "portfolio_produtos_precos_insert"
  ON portfolio_produtos_precos FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM portfolio_produtos p WHERE p.id = produto_id AND user_tem_acesso_escritorio_portfolio(p.escritorio_id)));

CREATE POLICY "portfolio_produtos_precos_update"
  ON portfolio_produtos_precos FOR UPDATE
  USING (EXISTS (SELECT 1 FROM portfolio_produtos p WHERE p.id = produto_id AND user_tem_acesso_escritorio_portfolio(p.escritorio_id)));

CREATE POLICY "portfolio_produtos_precos_delete"
  ON portfolio_produtos_precos FOR DELETE
  USING (EXISTS (SELECT 1 FROM portfolio_produtos p WHERE p.id = produto_id AND user_tem_acesso_escritorio_portfolio(p.escritorio_id)));

-- =====================================================
-- 8. POLICIES: portfolio_produtos_recursos
-- =====================================================

CREATE POLICY "portfolio_produtos_recursos_select"
  ON portfolio_produtos_recursos FOR SELECT
  USING (EXISTS (SELECT 1 FROM portfolio_produtos p WHERE p.id = produto_id AND user_tem_acesso_escritorio_portfolio(p.escritorio_id)));

CREATE POLICY "portfolio_produtos_recursos_insert"
  ON portfolio_produtos_recursos FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM portfolio_produtos p WHERE p.id = produto_id AND user_tem_acesso_escritorio_portfolio(p.escritorio_id)));

CREATE POLICY "portfolio_produtos_recursos_update"
  ON portfolio_produtos_recursos FOR UPDATE
  USING (EXISTS (SELECT 1 FROM portfolio_produtos p WHERE p.id = produto_id AND user_tem_acesso_escritorio_portfolio(p.escritorio_id)));

CREATE POLICY "portfolio_produtos_recursos_delete"
  ON portfolio_produtos_recursos FOR DELETE
  USING (EXISTS (SELECT 1 FROM portfolio_produtos p WHERE p.id = produto_id AND user_tem_acesso_escritorio_portfolio(p.escritorio_id)));

-- =====================================================
-- 9. POLICIES: portfolio_produtos_versoes
-- =====================================================

CREATE POLICY "portfolio_produtos_versoes_select"
  ON portfolio_produtos_versoes FOR SELECT
  USING (EXISTS (SELECT 1 FROM portfolio_produtos p WHERE p.id = produto_id AND user_tem_acesso_escritorio_portfolio(p.escritorio_id)));

CREATE POLICY "portfolio_produtos_versoes_insert"
  ON portfolio_produtos_versoes FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM portfolio_produtos p WHERE p.id = produto_id AND user_tem_acesso_escritorio_portfolio(p.escritorio_id)));

-- Versões não podem ser atualizadas ou deletadas (histórico imutável)

-- =====================================================
-- 10. POLICIES: portfolio_projetos
-- =====================================================

CREATE POLICY "portfolio_projetos_select"
  ON portfolio_projetos FOR SELECT
  USING (user_tem_acesso_escritorio_portfolio(escritorio_id));

CREATE POLICY "portfolio_projetos_insert"
  ON portfolio_projetos FOR INSERT
  WITH CHECK (user_tem_acesso_escritorio_portfolio(escritorio_id));

CREATE POLICY "portfolio_projetos_update"
  ON portfolio_projetos FOR UPDATE
  USING (user_tem_acesso_escritorio_portfolio(escritorio_id))
  WITH CHECK (user_tem_acesso_escritorio_portfolio(escritorio_id));

CREATE POLICY "portfolio_projetos_delete"
  ON portfolio_projetos FOR DELETE
  USING (user_tem_acesso_escritorio_portfolio(escritorio_id));

-- =====================================================
-- 11. POLICIES: portfolio_projetos_fases
-- =====================================================

CREATE POLICY "portfolio_projetos_fases_select"
  ON portfolio_projetos_fases FOR SELECT
  USING (EXISTS (SELECT 1 FROM portfolio_projetos p WHERE p.id = projeto_id AND user_tem_acesso_escritorio_portfolio(p.escritorio_id)));

CREATE POLICY "portfolio_projetos_fases_insert"
  ON portfolio_projetos_fases FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM portfolio_projetos p WHERE p.id = projeto_id AND user_tem_acesso_escritorio_portfolio(p.escritorio_id)));

CREATE POLICY "portfolio_projetos_fases_update"
  ON portfolio_projetos_fases FOR UPDATE
  USING (EXISTS (SELECT 1 FROM portfolio_projetos p WHERE p.id = projeto_id AND user_tem_acesso_escritorio_portfolio(p.escritorio_id)));

CREATE POLICY "portfolio_projetos_fases_delete"
  ON portfolio_projetos_fases FOR DELETE
  USING (EXISTS (SELECT 1 FROM portfolio_projetos p WHERE p.id = projeto_id AND user_tem_acesso_escritorio_portfolio(p.escritorio_id)));

-- =====================================================
-- 12. POLICIES: portfolio_projetos_fases_checklist
-- =====================================================

CREATE POLICY "portfolio_projetos_fases_checklist_select"
  ON portfolio_projetos_fases_checklist FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM portfolio_projetos_fases f
    JOIN portfolio_projetos p ON p.id = f.projeto_id
    WHERE f.id = fase_projeto_id AND user_tem_acesso_escritorio_portfolio(p.escritorio_id)
  ));

CREATE POLICY "portfolio_projetos_fases_checklist_insert"
  ON portfolio_projetos_fases_checklist FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM portfolio_projetos_fases f
    JOIN portfolio_projetos p ON p.id = f.projeto_id
    WHERE f.id = fase_projeto_id AND user_tem_acesso_escritorio_portfolio(p.escritorio_id)
  ));

CREATE POLICY "portfolio_projetos_fases_checklist_update"
  ON portfolio_projetos_fases_checklist FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM portfolio_projetos_fases f
    JOIN portfolio_projetos p ON p.id = f.projeto_id
    WHERE f.id = fase_projeto_id AND user_tem_acesso_escritorio_portfolio(p.escritorio_id)
  ));

CREATE POLICY "portfolio_projetos_fases_checklist_delete"
  ON portfolio_projetos_fases_checklist FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM portfolio_projetos_fases f
    JOIN portfolio_projetos p ON p.id = f.projeto_id
    WHERE f.id = fase_projeto_id AND user_tem_acesso_escritorio_portfolio(p.escritorio_id)
  ));

-- =====================================================
-- 13. POLICIES: portfolio_projetos_equipe
-- =====================================================

CREATE POLICY "portfolio_projetos_equipe_select"
  ON portfolio_projetos_equipe FOR SELECT
  USING (EXISTS (SELECT 1 FROM portfolio_projetos p WHERE p.id = projeto_id AND user_tem_acesso_escritorio_portfolio(p.escritorio_id)));

CREATE POLICY "portfolio_projetos_equipe_insert"
  ON portfolio_projetos_equipe FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM portfolio_projetos p WHERE p.id = projeto_id AND user_tem_acesso_escritorio_portfolio(p.escritorio_id)));

CREATE POLICY "portfolio_projetos_equipe_update"
  ON portfolio_projetos_equipe FOR UPDATE
  USING (EXISTS (SELECT 1 FROM portfolio_projetos p WHERE p.id = projeto_id AND user_tem_acesso_escritorio_portfolio(p.escritorio_id)));

CREATE POLICY "portfolio_projetos_equipe_delete"
  ON portfolio_projetos_equipe FOR DELETE
  USING (EXISTS (SELECT 1 FROM portfolio_projetos p WHERE p.id = projeto_id AND user_tem_acesso_escritorio_portfolio(p.escritorio_id)));

-- =====================================================
-- 14. POLICIES: portfolio_projetos_aprendizados
-- =====================================================

CREATE POLICY "portfolio_projetos_aprendizados_select"
  ON portfolio_projetos_aprendizados FOR SELECT
  USING (EXISTS (SELECT 1 FROM portfolio_projetos p WHERE p.id = projeto_id AND user_tem_acesso_escritorio_portfolio(p.escritorio_id)));

CREATE POLICY "portfolio_projetos_aprendizados_insert"
  ON portfolio_projetos_aprendizados FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM portfolio_projetos p WHERE p.id = projeto_id AND user_tem_acesso_escritorio_portfolio(p.escritorio_id)));

CREATE POLICY "portfolio_projetos_aprendizados_update"
  ON portfolio_projetos_aprendizados FOR UPDATE
  USING (EXISTS (SELECT 1 FROM portfolio_projetos p WHERE p.id = projeto_id AND user_tem_acesso_escritorio_portfolio(p.escritorio_id)));

CREATE POLICY "portfolio_projetos_aprendizados_delete"
  ON portfolio_projetos_aprendizados FOR DELETE
  USING (EXISTS (SELECT 1 FROM portfolio_projetos p WHERE p.id = projeto_id AND user_tem_acesso_escritorio_portfolio(p.escritorio_id)));

-- =====================================================
-- 15. POLICIES: portfolio_metricas
-- =====================================================

CREATE POLICY "portfolio_metricas_select"
  ON portfolio_metricas FOR SELECT
  USING (user_tem_acesso_escritorio_portfolio(escritorio_id));

CREATE POLICY "portfolio_metricas_insert"
  ON portfolio_metricas FOR INSERT
  WITH CHECK (user_tem_acesso_escritorio_portfolio(escritorio_id));

CREATE POLICY "portfolio_metricas_update"
  ON portfolio_metricas FOR UPDATE
  USING (user_tem_acesso_escritorio_portfolio(escritorio_id));

-- =====================================================
-- 16. ENABLE REALTIME
-- =====================================================

-- Habilitar realtime para tabelas principais
ALTER PUBLICATION supabase_realtime ADD TABLE portfolio_produtos;
ALTER PUBLICATION supabase_realtime ADD TABLE portfolio_projetos;
ALTER PUBLICATION supabase_realtime ADD TABLE portfolio_projetos_fases;
ALTER PUBLICATION supabase_realtime ADD TABLE portfolio_projetos_aprendizados;

-- =====================================================
-- 17. COMMENTS
-- =====================================================
COMMENT ON FUNCTION user_tem_acesso_escritorio_portfolio IS 'Verifica se usuário tem acesso ao escritório para módulo Portfolio';
