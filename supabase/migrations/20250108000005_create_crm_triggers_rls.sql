-- =====================================================
-- MÓDULO CRM - MIGRATION 5: TRIGGERS E RLS POLICIES
-- =====================================================
-- Triggers automáticos e políticas de segurança
-- =====================================================

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger: Atualizar updated_at em crm_pessoas
CREATE OR REPLACE FUNCTION trigger_update_crm_pessoas_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_crm_pessoas_timestamp
    BEFORE UPDATE ON crm_pessoas
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_crm_pessoas_timestamp();

COMMENT ON TRIGGER update_crm_pessoas_timestamp ON crm_pessoas IS 'Atualiza automaticamente o campo updated_at';

-- Trigger: Atualizar updated_at em crm_funil_etapas
CREATE TRIGGER update_crm_funil_etapas_timestamp
    BEFORE UPDATE ON crm_funil_etapas
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_crm_pessoas_timestamp();

-- Trigger: Atualizar updated_at em crm_oportunidades
CREATE TRIGGER update_crm_oportunidades_timestamp
    BEFORE UPDATE ON crm_oportunidades
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_crm_pessoas_timestamp();

-- Trigger: Atualizar updated_at em crm_interacoes
CREATE TRIGGER update_crm_interacoes_timestamp
    BEFORE UPDATE ON crm_interacoes
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_crm_pessoas_timestamp();

-- Trigger: Registrar mudança de etapa automaticamente
CREATE OR REPLACE FUNCTION trigger_log_oportunidade_mudanca_etapa()
RETURNS TRIGGER AS $$
BEGIN
    -- Se a etapa mudou, registrar atividade
    IF OLD.etapa_id IS DISTINCT FROM NEW.etapa_id THEN
        -- A atividade será registrada pela function mover_oportunidade_etapa
        -- Este trigger é para mudanças diretas que não passam pela function
        IF NOT EXISTS (
            SELECT 1 FROM crm_oportunidades_atividades
            WHERE oportunidade_id = NEW.id
              AND tipo = 'mudanca_etapa'
              AND created_at > NOW() - INTERVAL '1 second'
        ) THEN
            INSERT INTO crm_oportunidades_atividades (
                oportunidade_id,
                user_id,
                tipo,
                titulo,
                descricao,
                dados_extras
            )
            SELECT
                NEW.id,
                NEW.responsavel_id, -- usa responsável como fallback
                'mudanca_etapa',
                'Etapa atualizada',
                'Oportunidade movida de ' || e_old.nome || ' para ' || e_new.nome,
                jsonb_build_object(
                    'etapa_anterior_id', OLD.etapa_id,
                    'etapa_anterior_nome', e_old.nome,
                    'nova_etapa_id', NEW.etapa_id,
                    'nova_etapa_nome', e_new.nome
                )
            FROM crm_funil_etapas e_old, crm_funil_etapas e_new
            WHERE e_old.id = OLD.etapa_id
              AND e_new.id = NEW.etapa_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_oportunidade_mudanca_etapa
    AFTER UPDATE ON crm_oportunidades
    FOR EACH ROW
    WHEN (OLD.etapa_id IS DISTINCT FROM NEW.etapa_id)
    EXECUTE FUNCTION trigger_log_oportunidade_mudanca_etapa();

COMMENT ON TRIGGER log_oportunidade_mudanca_etapa ON crm_oportunidades IS 'Registra automaticamente mudanças de etapa';

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE crm_pessoas ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_funil_etapas ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_oportunidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_oportunidades_atividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_interacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_interacoes_anexos ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_relacionamentos ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLICIES: crm_pessoas
-- =====================================================

-- SELECT: usuários veem pessoas do próprio escritório
CREATE POLICY "Users can view pessoas from their escritorio"
    ON crm_pessoas FOR SELECT
    USING (
        escritorio_id IN (
            SELECT escritorio_id FROM profiles WHERE id = auth.uid()
        )
    );

-- INSERT: usuários podem criar pessoas no próprio escritório
CREATE POLICY "Users can insert pessoas in their escritorio"
    ON crm_pessoas FOR INSERT
    WITH CHECK (
        escritorio_id IN (
            SELECT escritorio_id FROM profiles WHERE id = auth.uid()
        )
    );

-- UPDATE: usuários podem atualizar pessoas do próprio escritório
CREATE POLICY "Users can update pessoas from their escritorio"
    ON crm_pessoas FOR UPDATE
    USING (
        escritorio_id IN (
            SELECT escritorio_id FROM profiles WHERE id = auth.uid()
        )
    )
    WITH CHECK (
        escritorio_id IN (
            SELECT escritorio_id FROM profiles WHERE id = auth.uid()
        )
    );

-- DELETE: apenas admins podem deletar
CREATE POLICY "Only admins can delete pessoas"
    ON crm_pessoas FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
              AND papel IN ('admin', 'socio')
              AND escritorio_id = crm_pessoas.escritorio_id
        )
    );

-- =====================================================
-- POLICIES: crm_funil_etapas
-- =====================================================

CREATE POLICY "Users can view funil etapas from their escritorio"
    ON crm_funil_etapas FOR SELECT
    USING (
        escritorio_id IN (
            SELECT escritorio_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage funil etapas"
    ON crm_funil_etapas FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
              AND papel IN ('admin', 'socio')
              AND escritorio_id = crm_funil_etapas.escritorio_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
              AND papel IN ('admin', 'socio')
              AND escritorio_id = crm_funil_etapas.escritorio_id
        )
    );

-- =====================================================
-- POLICIES: crm_oportunidades
-- =====================================================

CREATE POLICY "Users can view oportunidades from their escritorio"
    ON crm_oportunidades FOR SELECT
    USING (
        escritorio_id IN (
            SELECT escritorio_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert oportunidades in their escritorio"
    ON crm_oportunidades FOR INSERT
    WITH CHECK (
        escritorio_id IN (
            SELECT escritorio_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update their oportunidades or all if admin"
    ON crm_oportunidades FOR UPDATE
    USING (
        escritorio_id IN (
            SELECT escritorio_id FROM profiles WHERE id = auth.uid()
        )
        AND (
            responsavel_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM profiles
                WHERE id = auth.uid()
                  AND papel IN ('admin', 'socio')
            )
        )
    )
    WITH CHECK (
        escritorio_id IN (
            SELECT escritorio_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can delete oportunidades"
    ON crm_oportunidades FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
              AND papel IN ('admin', 'socio')
              AND escritorio_id = crm_oportunidades.escritorio_id
        )
    );

-- =====================================================
-- POLICIES: crm_oportunidades_atividades
-- =====================================================

CREATE POLICY "Users can view atividades from oportunidades they can access"
    ON crm_oportunidades_atividades FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM crm_oportunidades o
            JOIN profiles p ON p.escritorio_id = o.escritorio_id
            WHERE o.id = crm_oportunidades_atividades.oportunidade_id
              AND p.id = auth.uid()
        )
    );

CREATE POLICY "Users can insert atividades in oportunidades they can access"
    ON crm_oportunidades_atividades FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM crm_oportunidades o
            JOIN profiles p ON p.escritorio_id = o.escritorio_id
            WHERE o.id = crm_oportunidades_atividades.oportunidade_id
              AND p.id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own atividades"
    ON crm_oportunidades_atividades FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own atividades"
    ON crm_oportunidades_atividades FOR DELETE
    USING (user_id = auth.uid());

-- =====================================================
-- POLICIES: crm_interacoes
-- =====================================================

CREATE POLICY "Users can view interacoes from pessoas they can access"
    ON crm_interacoes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM crm_pessoas p
            JOIN profiles prof ON prof.escritorio_id = p.escritorio_id
            WHERE p.id = crm_interacoes.pessoa_id
              AND prof.id = auth.uid()
        )
    );

CREATE POLICY "Users can insert interacoes for pessoas they can access"
    ON crm_interacoes FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM crm_pessoas p
            JOIN profiles prof ON prof.escritorio_id = p.escritorio_id
            WHERE p.id = crm_interacoes.pessoa_id
              AND prof.id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own interacoes"
    ON crm_interacoes FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own interacoes"
    ON crm_interacoes FOR DELETE
    USING (user_id = auth.uid());

-- =====================================================
-- POLICIES: crm_interacoes_anexos
-- =====================================================

CREATE POLICY "Users can view anexos from interacoes they can access"
    ON crm_interacoes_anexos FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM crm_interacoes i
            JOIN crm_pessoas p ON p.id = i.pessoa_id
            JOIN profiles prof ON prof.escritorio_id = p.escritorio_id
            WHERE i.id = crm_interacoes_anexos.interacao_id
              AND prof.id = auth.uid()
        )
    );

CREATE POLICY "Users can manage anexos from their interacoes"
    ON crm_interacoes_anexos FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM crm_interacoes i
            WHERE i.id = crm_interacoes_anexos.interacao_id
              AND i.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM crm_interacoes i
            WHERE i.id = crm_interacoes_anexos.interacao_id
              AND i.user_id = auth.uid()
        )
    );

-- =====================================================
-- POLICIES: crm_relacionamentos
-- =====================================================

CREATE POLICY "Users can view relacionamentos from pessoas they can access"
    ON crm_relacionamentos FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM crm_pessoas p
            JOIN profiles prof ON prof.escritorio_id = p.escritorio_id
            WHERE (p.id = crm_relacionamentos.pessoa_origem_id OR p.id = crm_relacionamentos.pessoa_destino_id)
              AND prof.id = auth.uid()
        )
    );

CREATE POLICY "Users can manage relacionamentos for pessoas they can access"
    ON crm_relacionamentos FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM crm_pessoas p
            JOIN profiles prof ON prof.escritorio_id = p.escritorio_id
            WHERE (p.id = crm_relacionamentos.pessoa_origem_id OR p.id = crm_relacionamentos.pessoa_destino_id)
              AND prof.id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM crm_pessoas p1
            JOIN crm_pessoas p2 ON p1.escritorio_id = p2.escritorio_id
            JOIN profiles prof ON prof.escritorio_id = p1.escritorio_id
            WHERE p1.id = crm_relacionamentos.pessoa_origem_id
              AND p2.id = crm_relacionamentos.pessoa_destino_id
              AND prof.id = auth.uid()
        )
    );

-- =====================================================
-- ÍNDICES ADICIONAIS PARA PERFORMANCE COM RLS
-- =====================================================

-- Índice para facilitar lookup de escritorio_id do usuário
CREATE INDEX IF NOT EXISTS idx_profiles_user_escritorio
    ON profiles(id, escritorio_id);

-- Comentários finais
COMMENT ON POLICY "Users can view pessoas from their escritorio" ON crm_pessoas
    IS 'Usuários visualizam apenas pessoas do próprio escritório';

COMMENT ON POLICY "Only admins can delete pessoas" ON crm_pessoas
    IS 'Apenas admins e sócios podem excluir pessoas';
