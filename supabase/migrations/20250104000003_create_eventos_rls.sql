-- Módulo: Agenda - Row Level Security (RLS)
-- Políticas de segurança para controle de acesso aos dados

-- ============================================
-- HABILITAR RLS
-- ============================================

ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos_audiencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos_prazos ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos_participantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos_lembretes ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos_recorrencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos_categorias_vinculo ENABLE ROW LEVEL SECURITY;
ALTER TABLE feriados ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS - EVENTOS
-- ============================================

-- SELECT: Usuários veem eventos do próprio escritório OU onde são participantes
CREATE POLICY "Usuários veem eventos do escritório ou onde participam"
    ON eventos FOR SELECT
    USING (
        escritorio_id IN (
            SELECT escritorio_id FROM profiles WHERE id = auth.uid()
        )
        OR id IN (
            SELECT evento_id FROM eventos_participantes
            WHERE user_id = auth.uid()
        )
    );

-- INSERT: Usuários podem criar eventos no próprio escritório
CREATE POLICY "Usuários criam eventos no próprio escritório"
    ON eventos FOR INSERT
    WITH CHECK (
        escritorio_id IN (
            SELECT escritorio_id FROM profiles WHERE id = auth.uid()
        )
    );

-- UPDATE: Usuários editam eventos que criaram ou são responsáveis
CREATE POLICY "Usuários editam eventos criados ou sob responsabilidade"
    ON eventos FOR UPDATE
    USING (
        criado_por = auth.uid()
        OR responsavel_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'admin'
            AND escritorio_id = eventos.escritorio_id
        )
    );

-- DELETE: Apenas criador ou admin pode deletar
CREATE POLICY "Apenas criador ou admin deleta eventos"
    ON eventos FOR DELETE
    USING (
        criado_por = auth.uid()
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'admin'
            AND escritorio_id = eventos.escritorio_id
        )
    );

-- ============================================
-- POLÍTICAS - EVENTOS_AUDIENCIAS
-- ============================================

CREATE POLICY "Acesso a audiências vinculadas a eventos acessíveis"
    ON eventos_audiencias FOR ALL
    USING (
        evento_id IN (
            SELECT id FROM eventos
        )
    );

-- ============================================
-- POLÍTICAS - EVENTOS_PRAZOS
-- ============================================

CREATE POLICY "Acesso a prazos vinculados a eventos acessíveis"
    ON eventos_prazos FOR ALL
    USING (
        evento_id IN (
            SELECT id FROM eventos
        )
    );

-- ============================================
-- POLÍTICAS - EVENTOS_PARTICIPANTES
-- ============================================

CREATE POLICY "Acesso a participantes de eventos acessíveis"
    ON eventos_participantes FOR ALL
    USING (
        evento_id IN (
            SELECT id FROM eventos
        )
    );

-- ============================================
-- POLÍTICAS - EVENTOS_LEMBRETES
-- ============================================

-- Usuários veem/editam apenas próprios lembretes
CREATE POLICY "Usuários gerenciam próprios lembretes"
    ON eventos_lembretes FOR ALL
    USING (user_id = auth.uid());

-- ============================================
-- POLÍTICAS - EVENTOS_RECORRENCIA
-- ============================================

-- Recorrência acessível se pelo menos um evento vinculado for acessível
CREATE POLICY "Acesso a recorrência de eventos acessíveis"
    ON eventos_recorrencia FOR ALL
    USING (
        id IN (
            SELECT recorrencia_id FROM eventos
            WHERE recorrencia_id IS NOT NULL
        )
    );

-- ============================================
-- POLÍTICAS - EVENTOS_CATEGORIAS
-- ============================================

-- SELECT: Usuários veem categorias do próprio escritório
CREATE POLICY "Usuários veem categorias do escritório"
    ON eventos_categorias FOR SELECT
    USING (
        escritorio_id IN (
            SELECT escritorio_id FROM profiles WHERE id = auth.uid()
        )
    );

-- INSERT/UPDATE/DELETE: Apenas admins gerenciam categorias
CREATE POLICY "Admins gerenciam categorias"
    ON eventos_categorias FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'admin'
            AND escritorio_id = eventos_categorias.escritorio_id
        )
    );

-- ============================================
-- POLÍTICAS - EVENTOS_CATEGORIAS_VINCULO
-- ============================================

CREATE POLICY "Acesso a vínculos de categorias acessíveis"
    ON eventos_categorias_vinculo FOR ALL
    USING (
        evento_id IN (
            SELECT id FROM eventos
        )
    );

-- ============================================
-- POLÍTICAS - FERIADOS
-- ============================================

-- Feriados são públicos (SELECT para todos)
CREATE POLICY "Feriados são públicos"
    ON feriados FOR SELECT
    USING (true);

-- Apenas admins inserem/editam feriados
CREATE POLICY "Apenas admins gerenciam feriados"
    ON feriados FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

CREATE POLICY "Apenas admins atualizam feriados"
    ON feriados FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

CREATE POLICY "Apenas admins deletam feriados"
    ON feriados FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- ============================================
-- GRANTS
-- ============================================

-- Conceder acesso às views
GRANT SELECT ON v_agenda_dia TO authenticated;
GRANT SELECT ON v_prazos_vencendo TO authenticated;
GRANT SELECT ON v_disponibilidade_equipe TO authenticated;

-- ============================================
-- COMENTÁRIOS
-- ============================================

COMMENT ON POLICY "Usuários veem eventos do escritório ou onde participam" ON eventos IS
    'Usuários têm acesso a eventos do próprio escritório ou eventos onde foram adicionados como participantes';

COMMENT ON POLICY "Usuários criam eventos no próprio escritório" ON eventos IS
    'Usuários podem criar eventos apenas no escritório ao qual pertencem';

COMMENT ON POLICY "Usuários editam eventos criados ou sob responsabilidade" ON eventos IS
    'Usuários podem editar eventos que criaram, pelos quais são responsáveis, ou se forem administradores';

COMMENT ON POLICY "Apenas criador ou admin deleta eventos" ON eventos IS
    'Apenas o criador do evento ou administradores do escritório podem deletar eventos';
