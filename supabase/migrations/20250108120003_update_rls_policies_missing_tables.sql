-- ============================================================================
-- MIGRATION: Atualizar RLS Policies para tabelas com novo escritorio_id
-- Prioridade: CRÍTICA
-- Impacto: Segurança multi-tenancy
-- Tabelas: 30 tabelas que receberam escritorio_id
-- ============================================================================

BEGIN;

-- ============================================================================
-- FUNÇÃO HELPER: Verificar se usuário pertence ao escritório
-- ============================================================================

CREATE OR REPLACE FUNCTION user_has_access_to_escritorio(p_escritorio_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_escritorios_roles uer
    WHERE uer.user_id = auth.uid()
    AND uer.escritorio_id = p_escritorio_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 1. AGENDA
-- ============================================================================

-- agenda_tarefas_checklist
ALTER TABLE agenda_tarefas_checklist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access their escritorio data" ON agenda_tarefas_checklist;
CREATE POLICY "Users can access their escritorio data"
ON agenda_tarefas_checklist
FOR ALL
USING (user_has_access_to_escritorio(escritorio_id))
WITH CHECK (user_has_access_to_escritorio(escritorio_id));

-- ============================================================================
-- 2. CRM
-- ============================================================================

-- crm_interacoes
ALTER TABLE crm_interacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access their escritorio data" ON crm_interacoes;
CREATE POLICY "Users can access their escritorio data"
ON crm_interacoes
FOR ALL
USING (user_has_access_to_escritorio(escritorio_id))
WITH CHECK (user_has_access_to_escritorio(escritorio_id));

-- crm_interacoes_anexos
ALTER TABLE crm_interacoes_anexos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access their escritorio data" ON crm_interacoes_anexos;
CREATE POLICY "Users can access their escritorio data"
ON crm_interacoes_anexos
FOR ALL
USING (user_has_access_to_escritorio(escritorio_id))
WITH CHECK (user_has_access_to_escritorio(escritorio_id));

-- crm_oportunidades_atividades
ALTER TABLE crm_oportunidades_atividades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access their escritorio data" ON crm_oportunidades_atividades;
CREATE POLICY "Users can access their escritorio data"
ON crm_oportunidades_atividades
FOR ALL
USING (user_has_access_to_escritorio(escritorio_id))
WITH CHECK (user_has_access_to_escritorio(escritorio_id));

-- crm_relacionamentos
ALTER TABLE crm_relacionamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access their escritorio data" ON crm_relacionamentos;
CREATE POLICY "Users can access their escritorio data"
ON crm_relacionamentos
FOR ALL
USING (user_has_access_to_escritorio(escritorio_id))
WITH CHECK (user_has_access_to_escritorio(escritorio_id));

-- crm_clientes_contatos (se existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crm_clientes_contatos') THEN
    ALTER TABLE crm_clientes_contatos ENABLE ROW LEVEL SECURITY;

    EXECUTE 'DROP POLICY IF EXISTS "Users can access their escritorio data" ON crm_clientes_contatos';
    EXECUTE 'CREATE POLICY "Users can access their escritorio data" ON crm_clientes_contatos FOR ALL USING (user_has_access_to_escritorio(escritorio_id)) WITH CHECK (user_has_access_to_escritorio(escritorio_id))';
  END IF;
END $$;

-- ============================================================================
-- 3. PROCESSOS
-- ============================================================================

-- processos_partes
ALTER TABLE processos_partes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access their escritorio data" ON processos_partes;
CREATE POLICY "Users can access their escritorio data"
ON processos_partes
FOR ALL
USING (user_has_access_to_escritorio(escritorio_id))
WITH CHECK (user_has_access_to_escritorio(escritorio_id));

-- processos_historico
ALTER TABLE processos_historico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access their escritorio data" ON processos_historico;
CREATE POLICY "Users can access their escritorio data"
ON processos_historico
FOR ALL
USING (user_has_access_to_escritorio(escritorio_id))
WITH CHECK (user_has_access_to_escritorio(escritorio_id));

-- ============================================================================
-- 4. CONSULTIVO
-- ============================================================================

-- consultivo_analise
ALTER TABLE consultivo_analise ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access their escritorio data" ON consultivo_analise;
CREATE POLICY "Users can access their escritorio data"
ON consultivo_analise
FOR ALL
USING (user_has_access_to_escritorio(escritorio_id))
WITH CHECK (user_has_access_to_escritorio(escritorio_id));

-- consultivo_documentos
ALTER TABLE consultivo_documentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access their escritorio data" ON consultivo_documentos;
CREATE POLICY "Users can access their escritorio data"
ON consultivo_documentos
FOR ALL
USING (user_has_access_to_escritorio(escritorio_id))
WITH CHECK (user_has_access_to_escritorio(escritorio_id));

-- consultivo_equipe
ALTER TABLE consultivo_equipe ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access their escritorio data" ON consultivo_equipe;
CREATE POLICY "Users can access their escritorio data"
ON consultivo_equipe
FOR ALL
USING (user_has_access_to_escritorio(escritorio_id))
WITH CHECK (user_has_access_to_escritorio(escritorio_id));

-- consultivo_referencias
ALTER TABLE consultivo_referencias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access their escritorio data" ON consultivo_referencias;
CREATE POLICY "Users can access their escritorio data"
ON consultivo_referencias
FOR ALL
USING (user_has_access_to_escritorio(escritorio_id))
WITH CHECK (user_has_access_to_escritorio(escritorio_id));

-- consultivo_timeline
ALTER TABLE consultivo_timeline ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access their escritorio data" ON consultivo_timeline;
CREATE POLICY "Users can access their escritorio data"
ON consultivo_timeline
FOR ALL
USING (user_has_access_to_escritorio(escritorio_id))
WITH CHECK (user_has_access_to_escritorio(escritorio_id));

-- consultivo_timesheet
ALTER TABLE consultivo_timesheet ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access their escritorio data" ON consultivo_timesheet;
CREATE POLICY "Users can access their escritorio data"
ON consultivo_timesheet
FOR ALL
USING (user_has_access_to_escritorio(escritorio_id))
WITH CHECK (user_has_access_to_escritorio(escritorio_id));

-- ============================================================================
-- 5. FINANCEIRO
-- ============================================================================

-- financeiro_honorarios_parcelas
ALTER TABLE financeiro_honorarios_parcelas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access their escritorio data" ON financeiro_honorarios_parcelas;
CREATE POLICY "Users can access their escritorio data"
ON financeiro_honorarios_parcelas
FOR ALL
USING (user_has_access_to_escritorio(escritorio_id))
WITH CHECK (user_has_access_to_escritorio(escritorio_id));

-- financeiro_honorarios_timeline
ALTER TABLE financeiro_honorarios_timeline ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access their escritorio data" ON financeiro_honorarios_timeline;
CREATE POLICY "Users can access their escritorio data"
ON financeiro_honorarios_timeline
FOR ALL
USING (user_has_access_to_escritorio(escritorio_id))
WITH CHECK (user_has_access_to_escritorio(escritorio_id));

-- financeiro_contas_lancamentos
ALTER TABLE financeiro_contas_lancamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access their escritorio data" ON financeiro_contas_lancamentos;
CREATE POLICY "Users can access their escritorio data"
ON financeiro_contas_lancamentos
FOR ALL
USING (user_has_access_to_escritorio(escritorio_id))
WITH CHECK (user_has_access_to_escritorio(escritorio_id));

-- financeiro_contas_conciliacoes
ALTER TABLE financeiro_contas_conciliacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access their escritorio data" ON financeiro_contas_conciliacoes;
CREATE POLICY "Users can access their escritorio data"
ON financeiro_contas_conciliacoes
FOR ALL
USING (user_has_access_to_escritorio(escritorio_id))
WITH CHECK (user_has_access_to_escritorio(escritorio_id));

-- financeiro_contas_importacoes
ALTER TABLE financeiro_contas_importacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access their escritorio data" ON financeiro_contas_importacoes;
CREATE POLICY "Users can access their escritorio data"
ON financeiro_contas_importacoes
FOR ALL
USING (user_has_access_to_escritorio(escritorio_id))
WITH CHECK (user_has_access_to_escritorio(escritorio_id));

-- financeiro_faturamento_itens
ALTER TABLE financeiro_faturamento_itens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access their escritorio data" ON financeiro_faturamento_itens;
CREATE POLICY "Users can access their escritorio data"
ON financeiro_faturamento_itens
FOR ALL
USING (user_has_access_to_escritorio(escritorio_id))
WITH CHECK (user_has_access_to_escritorio(escritorio_id));

-- financeiro_faturamento_cobrancas
ALTER TABLE financeiro_faturamento_cobrancas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access their escritorio data" ON financeiro_faturamento_cobrancas;
CREATE POLICY "Users can access their escritorio data"
ON financeiro_faturamento_cobrancas
FOR ALL
USING (user_has_access_to_escritorio(escritorio_id))
WITH CHECK (user_has_access_to_escritorio(escritorio_id));

-- financeiro_contratos_honorarios_config
ALTER TABLE financeiro_contratos_honorarios_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access their escritorio data" ON financeiro_contratos_honorarios_config;
CREATE POLICY "Users can access their escritorio data"
ON financeiro_contratos_honorarios_config
FOR ALL
USING (user_has_access_to_escritorio(escritorio_id))
WITH CHECK (user_has_access_to_escritorio(escritorio_id));

-- financeiro_dashboard_notificacoes
ALTER TABLE financeiro_dashboard_notificacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access their escritorio data" ON financeiro_dashboard_notificacoes;
CREATE POLICY "Users can access their escritorio data"
ON financeiro_dashboard_notificacoes
FOR ALL
USING (user_has_access_to_escritorio(escritorio_id))
WITH CHECK (user_has_access_to_escritorio(escritorio_id));

-- ============================================================================
-- 6. PUBLICAÇÕES
-- ============================================================================

-- publicacoes_analises
ALTER TABLE publicacoes_analises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access their escritorio data" ON publicacoes_analises;
CREATE POLICY "Users can access their escritorio data"
ON publicacoes_analises
FOR ALL
USING (user_has_access_to_escritorio(escritorio_id))
WITH CHECK (user_has_access_to_escritorio(escritorio_id));

-- publicacoes_historico
ALTER TABLE publicacoes_historico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access their escritorio data" ON publicacoes_historico;
CREATE POLICY "Users can access their escritorio data"
ON publicacoes_historico
FOR ALL
USING (user_has_access_to_escritorio(escritorio_id))
WITH CHECK (user_has_access_to_escritorio(escritorio_id));

-- publicacoes_notificacoes
ALTER TABLE publicacoes_notificacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access their escritorio data" ON publicacoes_notificacoes;
CREATE POLICY "Users can access their escritorio data"
ON publicacoes_notificacoes
FOR ALL
USING (user_has_access_to_escritorio(escritorio_id))
WITH CHECK (user_has_access_to_escritorio(escritorio_id));

-- publicacoes_tratamentos
ALTER TABLE publicacoes_tratamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access their escritorio data" ON publicacoes_tratamentos;
CREATE POLICY "Users can access their escritorio data"
ON publicacoes_tratamentos
FOR ALL
USING (user_has_access_to_escritorio(escritorio_id))
WITH CHECK (user_has_access_to_escritorio(escritorio_id));

-- ============================================================================
-- 7. PEÇAS
-- ============================================================================

-- pecas_relacoes
ALTER TABLE pecas_relacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access their escritorio data" ON pecas_relacoes;
CREATE POLICY "Users can access their escritorio data"
ON pecas_relacoes
FOR ALL
USING (user_has_access_to_escritorio(escritorio_id))
WITH CHECK (user_has_access_to_escritorio(escritorio_id));

-- pecas_templates_jurisprudencias
ALTER TABLE pecas_templates_jurisprudencias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access their escritorio data" ON pecas_templates_jurisprudencias;
CREATE POLICY "Users can access their escritorio data"
ON pecas_templates_jurisprudencias
FOR ALL
USING (user_has_access_to_escritorio(escritorio_id))
WITH CHECK (user_has_access_to_escritorio(escritorio_id));

-- pecas_templates_teses
ALTER TABLE pecas_templates_teses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access their escritorio data" ON pecas_templates_teses;
CREATE POLICY "Users can access their escritorio data"
ON pecas_templates_teses
FOR ALL
USING (user_has_access_to_escritorio(escritorio_id))
WITH CHECK (user_has_access_to_escritorio(escritorio_id));

-- ============================================================================
-- 8. RESUMO FINAL
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'RLS POLICIES ATUALIZADAS: 30 tabelas protegidas';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Multi-tenancy completo implementado!';
  RAISE NOTICE '============================================================';
END $$;

COMMIT;
