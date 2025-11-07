-- =====================================================
-- MÓDULO FINANCEIRO - ROW LEVEL SECURITY (RLS)
-- =====================================================
-- Migration: Políticas de segurança para acesso aos dados
-- - Usuários só acessam dados dos escritórios que pertencem
-- - Filtros baseados em user_escritorios_roles
-- - Permissões baseadas em roles (admin, financeiro, advogado, colaborador)
-- =====================================================

-- =====================================================
-- HABILITAR RLS EM TODAS AS TABELAS
-- =====================================================

ALTER TABLE honorarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE honorarios_parcelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE honorarios_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratos_honorarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratos_honorarios_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheet ENABLE ROW LEVEL SECURITY;
ALTER TABLE faturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE faturas_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE faturas_agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE despesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE contas_bancarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE conta_bancaria_lancamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE comissoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE metas_financeiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE cobrancas_enviadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE provisoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratos_recorrentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE conciliacoes_bancarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE lancamentos_bancarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_escritorios_roles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- HELPER FUNCTION: Verificar se usuário tem acesso ao escritório
-- =====================================================

CREATE OR REPLACE FUNCTION user_tem_acesso_escritorio(p_escritorio_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_escritorios_roles
    WHERE user_id = auth.uid()
    AND escritorio_id = p_escritorio_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- HELPER FUNCTION: Verificar role do usuário
-- =====================================================

CREATE OR REPLACE FUNCTION user_tem_role(p_escritorio_id UUID, p_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_escritorios_roles
    WHERE user_id = auth.uid()
    AND escritorio_id = p_escritorio_id
    AND role = p_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- HELPER FUNCTION: Verificar se é admin ou financeiro
-- =====================================================

CREATE OR REPLACE FUNCTION user_pode_gerenciar_financeiro(p_escritorio_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_escritorios_roles
    WHERE user_id = auth.uid()
    AND escritorio_id = p_escritorio_id
    AND role IN ('admin', 'financeiro')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- RLS: HONORÁRIOS
-- =====================================================

CREATE POLICY "Users can view honorarios from their escritorios"
ON honorarios FOR SELECT
USING (user_tem_acesso_escritorio(escritorio_id));

CREATE POLICY "Admin and financeiro can insert honorarios"
ON honorarios FOR INSERT
WITH CHECK (user_pode_gerenciar_financeiro(escritorio_id));

CREATE POLICY "Admin and financeiro can update honorarios"
ON honorarios FOR UPDATE
USING (user_pode_gerenciar_financeiro(escritorio_id));

CREATE POLICY "Admin can delete honorarios"
ON honorarios FOR DELETE
USING (user_tem_role(escritorio_id, 'admin'));

-- =====================================================
-- RLS: HONORÁRIOS PARCELAS
-- =====================================================

CREATE POLICY "Users can view parcelas from their escritorios"
ON honorarios_parcelas FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM honorarios h
    WHERE h.id = honorarios_parcelas.honorario_id
    AND user_tem_acesso_escritorio(h.escritorio_id)
  )
);

CREATE POLICY "Admin and financeiro can manage parcelas"
ON honorarios_parcelas FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM honorarios h
    WHERE h.id = honorarios_parcelas.honorario_id
    AND user_pode_gerenciar_financeiro(h.escritorio_id)
  )
);

-- =====================================================
-- RLS: CONTRATOS DE HONORÁRIOS
-- =====================================================

CREATE POLICY "Users can view contratos from their escritorios"
ON contratos_honorarios FOR SELECT
USING (user_tem_acesso_escritorio(escritorio_id));

CREATE POLICY "Admin and financeiro can manage contratos"
ON contratos_honorarios FOR ALL
USING (user_pode_gerenciar_financeiro(escritorio_id));

-- =====================================================
-- RLS: TIMESHEET
-- =====================================================

CREATE POLICY "Users can view their own timesheet"
ON timesheet FOR SELECT
USING (
  user_id = auth.uid()
  OR user_pode_gerenciar_financeiro(escritorio_id)
  OR EXISTS (
    SELECT 1 FROM user_escritorios_roles
    WHERE user_id = auth.uid()
    AND escritorio_id = timesheet.escritorio_id
    AND pode_aprovar_horas = true
  )
);

CREATE POLICY "Users can insert their own timesheet"
ON timesheet FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND user_tem_acesso_escritorio(escritorio_id)
);

CREATE POLICY "Users can update their own timesheet if not approved"
ON timesheet FOR UPDATE
USING (
  (user_id = auth.uid() AND aprovado = false AND faturado = false)
  OR user_pode_gerenciar_financeiro(escritorio_id)
  OR EXISTS (
    SELECT 1 FROM user_escritorios_roles
    WHERE user_id = auth.uid()
    AND escritorio_id = timesheet.escritorio_id
    AND pode_aprovar_horas = true
  )
);

CREATE POLICY "Admin and financeiro can delete timesheet"
ON timesheet FOR DELETE
USING (user_pode_gerenciar_financeiro(escritorio_id));

-- =====================================================
-- RLS: FATURAS
-- =====================================================

CREATE POLICY "Users can view faturas from their escritorios"
ON faturas FOR SELECT
USING (user_tem_acesso_escritorio(escritorio_id));

CREATE POLICY "Admin and financeiro can manage faturas"
ON faturas FOR ALL
USING (user_pode_gerenciar_financeiro(escritorio_id));

-- =====================================================
-- RLS: FATURAS ITENS
-- =====================================================

CREATE POLICY "Users can view faturas_itens from their escritorios"
ON faturas_itens FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM faturas f
    WHERE f.id = faturas_itens.fatura_id
    AND user_tem_acesso_escritorio(f.escritorio_id)
  )
);

CREATE POLICY "Admin and financeiro can manage faturas_itens"
ON faturas_itens FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM faturas f
    WHERE f.id = faturas_itens.fatura_id
    AND user_pode_gerenciar_financeiro(f.escritorio_id)
  )
);

-- =====================================================
-- RLS: DESPESAS
-- =====================================================

CREATE POLICY "Users can view despesas from their escritorios"
ON despesas FOR SELECT
USING (user_tem_acesso_escritorio(escritorio_id));

CREATE POLICY "Admin and financeiro can manage despesas"
ON despesas FOR ALL
USING (user_pode_gerenciar_financeiro(escritorio_id));

-- =====================================================
-- RLS: CONTAS BANCÁRIAS
-- =====================================================

CREATE POLICY "Users can view contas_bancarias from their escritorios"
ON contas_bancarias FOR SELECT
USING (user_tem_acesso_escritorio(escritorio_id));

CREATE POLICY "Admin and financeiro can manage contas_bancarias"
ON contas_bancarias FOR ALL
USING (user_pode_gerenciar_financeiro(escritorio_id));

-- =====================================================
-- RLS: LANÇAMENTOS BANCÁRIOS
-- =====================================================

CREATE POLICY "Users can view lancamentos from their escritorios"
ON conta_bancaria_lancamentos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM contas_bancarias cb
    WHERE cb.id = conta_bancaria_lancamentos.conta_bancaria_id
    AND user_tem_acesso_escritorio(cb.escritorio_id)
  )
);

CREATE POLICY "Admin and financeiro can manage lancamentos"
ON conta_bancaria_lancamentos FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM contas_bancarias cb
    WHERE cb.id = conta_bancaria_lancamentos.conta_bancaria_id
    AND user_pode_gerenciar_financeiro(cb.escritorio_id)
  )
);

-- =====================================================
-- RLS: PAGAMENTOS
-- =====================================================

CREATE POLICY "Users can view pagamentos from their escritorios"
ON pagamentos FOR SELECT
USING (user_tem_acesso_escritorio(escritorio_id));

CREATE POLICY "Admin and financeiro can manage pagamentos"
ON pagamentos FOR ALL
USING (user_pode_gerenciar_financeiro(escritorio_id));

-- =====================================================
-- RLS: COMISSÕES
-- =====================================================

CREATE POLICY "Users can view their own comissoes"
ON comissoes FOR SELECT
USING (
  user_id = auth.uid()
  OR user_pode_gerenciar_financeiro(escritorio_id)
);

CREATE POLICY "Admin and financeiro can manage comissoes"
ON comissoes FOR ALL
USING (user_pode_gerenciar_financeiro(escritorio_id));

-- =====================================================
-- RLS: METAS FINANCEIRAS
-- =====================================================

CREATE POLICY "Users can view metas from their escritorios"
ON metas_financeiras FOR SELECT
USING (user_tem_acesso_escritorio(escritorio_id));

CREATE POLICY "Admin and financeiro can manage metas"
ON metas_financeiras FOR ALL
USING (user_pode_gerenciar_financeiro(escritorio_id));

-- =====================================================
-- RLS: COBRANÇAS ENVIADAS
-- =====================================================

CREATE POLICY "Users can view cobrancas from their escritorios"
ON cobrancas_enviadas FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM honorarios_parcelas hp
    JOIN honorarios h ON h.id = hp.honorario_id
    WHERE hp.id = cobrancas_enviadas.parcela_id
    AND user_tem_acesso_escritorio(h.escritorio_id)
  )
  OR EXISTS (
    SELECT 1 FROM faturas f
    WHERE f.id = cobrancas_enviadas.fatura_id
    AND user_tem_acesso_escritorio(f.escritorio_id)
  )
);

CREATE POLICY "Admin and financeiro can manage cobrancas"
ON cobrancas_enviadas FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM honorarios_parcelas hp
    JOIN honorarios h ON h.id = hp.honorario_id
    WHERE hp.id = cobrancas_enviadas.parcela_id
    AND user_pode_gerenciar_financeiro(h.escritorio_id)
  )
  OR EXISTS (
    SELECT 1 FROM faturas f
    WHERE f.id = cobrancas_enviadas.fatura_id
    AND user_pode_gerenciar_financeiro(f.escritorio_id)
  )
);

-- =====================================================
-- RLS: PROVISÕES
-- =====================================================

CREATE POLICY "Users can view provisoes from their escritorios"
ON provisoes FOR SELECT
USING (user_tem_acesso_escritorio(escritorio_id));

CREATE POLICY "Admin and financeiro can manage provisoes"
ON provisoes FOR ALL
USING (user_pode_gerenciar_financeiro(escritorio_id));

-- =====================================================
-- RLS: CONTRATOS RECORRENTES
-- =====================================================

CREATE POLICY "Users can view contratos_recorrentes from their escritorios"
ON contratos_recorrentes FOR SELECT
USING (user_tem_acesso_escritorio(escritorio_id));

CREATE POLICY "Admin and financeiro can manage contratos_recorrentes"
ON contratos_recorrentes FOR ALL
USING (user_pode_gerenciar_financeiro(escritorio_id));

-- =====================================================
-- RLS: CONCILIAÇÕES BANCÁRIAS
-- =====================================================

CREATE POLICY "Users can view conciliacoes from their escritorios"
ON conciliacoes_bancarias FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM contas_bancarias cb
    WHERE cb.id = conciliacoes_bancarias.conta_bancaria_id
    AND user_tem_acesso_escritorio(cb.escritorio_id)
  )
);

CREATE POLICY "Admin and financeiro can manage conciliacoes"
ON conciliacoes_bancarias FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM contas_bancarias cb
    WHERE cb.id = conciliacoes_bancarias.conta_bancaria_id
    AND user_pode_gerenciar_financeiro(cb.escritorio_id)
  )
);

-- =====================================================
-- RLS: LANÇAMENTOS BANCÁRIOS (EXTRATO)
-- =====================================================

CREATE POLICY "Users can view lancamentos_bancarios from their escritorios"
ON lancamentos_bancarios FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM contas_bancarias cb
    WHERE cb.id = lancamentos_bancarios.conta_bancaria_id
    AND user_tem_acesso_escritorio(cb.escritorio_id)
  )
);

CREATE POLICY "Admin and financeiro can manage lancamentos_bancarios"
ON lancamentos_bancarios FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM contas_bancarias cb
    WHERE cb.id = lancamentos_bancarios.conta_bancaria_id
    AND user_pode_gerenciar_financeiro(cb.escritorio_id)
  )
);

-- =====================================================
-- RLS: USER ESCRITÓRIOS ROLES
-- =====================================================

CREATE POLICY "Users can view their own roles"
ON user_escritorios_roles FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admin can manage roles in their escritorios"
ON user_escritorios_roles FOR ALL
USING (
  user_tem_role(escritorio_id, 'admin')
);

-- =====================================================
-- RLS: HONORÁRIOS TIMELINE
-- =====================================================

CREATE POLICY "Users can view timeline from their escritorios"
ON honorarios_timeline FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM honorarios h
    WHERE h.id = honorarios_timeline.honorario_id
    AND user_tem_acesso_escritorio(h.escritorio_id)
  )
);

CREATE POLICY "System can insert timeline events"
ON honorarios_timeline FOR INSERT
WITH CHECK (true); -- Permitir inserção via triggers

-- =====================================================
-- RLS: FATURAS AGENDAMENTOS
-- =====================================================

CREATE POLICY "Users can view agendamentos from their escritorios"
ON faturas_agendamentos FOR SELECT
USING (user_tem_acesso_escritorio(escritorio_id));

CREATE POLICY "Admin and financeiro can manage agendamentos"
ON faturas_agendamentos FOR ALL
USING (user_pode_gerenciar_financeiro(escritorio_id));

-- =====================================================
-- RLS: CONTRATOS HONORÁRIOS CONFIG
-- =====================================================

CREATE POLICY "Users can view config from their escritorios"
ON contratos_honorarios_config FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM contratos_honorarios ch
    WHERE ch.id = contratos_honorarios_config.contrato_id
    AND user_tem_acesso_escritorio(ch.escritorio_id)
  )
);

CREATE POLICY "Admin and financeiro can manage config"
ON contratos_honorarios_config FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM contratos_honorarios ch
    WHERE ch.id = contratos_honorarios_config.contrato_id
    AND user_pode_gerenciar_financeiro(ch.escritorio_id)
  )
);

-- =====================================================
-- COMENTÁRIOS
-- =====================================================

COMMENT ON POLICY "Users can view honorarios from their escritorios" ON honorarios IS 'Usuários podem visualizar honorários dos escritórios que pertencem';
COMMENT ON POLICY "Admin and financeiro can insert honorarios" ON honorarios IS 'Admin e financeiro podem criar honorários';
COMMENT ON POLICY "Users can view their own timesheet" ON timesheet IS 'Usuários veem seu próprio timesheet, aprovadores veem todos';
COMMENT ON POLICY "Users can insert their own timesheet" ON timesheet IS 'Usuários podem criar seu próprio timesheet';
COMMENT ON POLICY "Users can view their own comissoes" ON comissoes IS 'Usuários veem suas próprias comissões';
