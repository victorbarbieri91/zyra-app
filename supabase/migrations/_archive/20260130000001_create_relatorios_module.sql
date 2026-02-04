-- ============================================
-- MIGRATION: Modulo de Relatorios de Processos
-- ============================================
-- Cria tabelas para geracao de relatorios de processos para clientes
-- com templates salvos e historico de relatorios gerados

-- ============================================
-- 1. Templates de Relatorio (configuracoes de colunas salvas)
-- ============================================
CREATE TABLE IF NOT EXISTS relatorios_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    escritorio_id UUID NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    descricao TEXT,
    -- Array de campos selecionados: ["numero_cnj", "area", "status", "resumo_ia"]
    colunas TEXT[] NOT NULL DEFAULT '{}',
    incluir_logo BOOLEAN NOT NULL DEFAULT true,
    criado_por UUID REFERENCES profiles(id) ON DELETE SET NULL,
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_relatorios_templates_escritorio
    ON relatorios_templates(escritorio_id);
CREATE INDEX IF NOT EXISTS idx_relatorios_templates_ativo
    ON relatorios_templates(escritorio_id, ativo) WHERE ativo = true;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_relatorios_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_relatorios_templates_updated_at ON relatorios_templates;
CREATE TRIGGER trg_relatorios_templates_updated_at
    BEFORE UPDATE ON relatorios_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_relatorios_templates_updated_at();

-- ============================================
-- 2. Historico de Relatorios Gerados
-- ============================================
CREATE TABLE IF NOT EXISTS relatorios_gerados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    escritorio_id UUID NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,
    template_id UUID REFERENCES relatorios_templates(id) ON DELETE SET NULL,
    titulo TEXT NOT NULL,
    -- Clientes selecionados (pode ser um ou varios)
    clientes_ids UUID[] NOT NULL DEFAULT '{}',
    -- Processos incluidos
    processos_ids UUID[] DEFAULT '{}',
    -- Colunas usadas (snapshot no momento da geracao)
    colunas_usadas TEXT[] DEFAULT '{}',
    -- Resumos IA gerados (JSON: { "processo_id": "resumo texto" })
    resumos_ia JSONB DEFAULT '{}',
    -- Arquivo gerado
    arquivo_url TEXT,
    arquivo_nome TEXT,
    -- Status
    status TEXT NOT NULL DEFAULT 'concluido' CHECK (status IN ('gerando', 'concluido', 'erro')),
    erro_mensagem TEXT,
    -- Metadados
    gerado_por UUID REFERENCES profiles(id) ON DELETE SET NULL,
    andamentos_salvos BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_relatorios_gerados_escritorio
    ON relatorios_gerados(escritorio_id);
CREATE INDEX IF NOT EXISTS idx_relatorios_gerados_created
    ON relatorios_gerados(escritorio_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_relatorios_gerados_clientes
    ON relatorios_gerados USING GIN(clientes_ids);

-- ============================================
-- 3. RLS Policies
-- ============================================

-- Habilitar RLS
ALTER TABLE relatorios_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE relatorios_gerados ENABLE ROW LEVEL SECURITY;

-- Funcao auxiliar para verificar acesso ao escritorio
CREATE OR REPLACE FUNCTION user_has_access_to_escritorio_relatorios(p_escritorio_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM escritorios_usuarios
        WHERE user_id = auth.uid()
        AND escritorio_id = p_escritorio_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies para relatorios_templates
DROP POLICY IF EXISTS "select_relatorios_templates" ON relatorios_templates;
CREATE POLICY "select_relatorios_templates" ON relatorios_templates
    FOR SELECT TO authenticated
    USING (user_has_access_to_escritorio_relatorios(escritorio_id));

DROP POLICY IF EXISTS "insert_relatorios_templates" ON relatorios_templates;
CREATE POLICY "insert_relatorios_templates" ON relatorios_templates
    FOR INSERT TO authenticated
    WITH CHECK (user_has_access_to_escritorio_relatorios(escritorio_id));

DROP POLICY IF EXISTS "update_relatorios_templates" ON relatorios_templates;
CREATE POLICY "update_relatorios_templates" ON relatorios_templates
    FOR UPDATE TO authenticated
    USING (user_has_access_to_escritorio_relatorios(escritorio_id));

DROP POLICY IF EXISTS "delete_relatorios_templates" ON relatorios_templates;
CREATE POLICY "delete_relatorios_templates" ON relatorios_templates
    FOR DELETE TO authenticated
    USING (user_has_access_to_escritorio_relatorios(escritorio_id));

-- Policies para relatorios_gerados
DROP POLICY IF EXISTS "select_relatorios_gerados" ON relatorios_gerados;
CREATE POLICY "select_relatorios_gerados" ON relatorios_gerados
    FOR SELECT TO authenticated
    USING (user_has_access_to_escritorio_relatorios(escritorio_id));

DROP POLICY IF EXISTS "insert_relatorios_gerados" ON relatorios_gerados;
CREATE POLICY "insert_relatorios_gerados" ON relatorios_gerados
    FOR INSERT TO authenticated
    WITH CHECK (user_has_access_to_escritorio_relatorios(escritorio_id));

DROP POLICY IF EXISTS "update_relatorios_gerados" ON relatorios_gerados;
CREATE POLICY "update_relatorios_gerados" ON relatorios_gerados
    FOR UPDATE TO authenticated
    USING (user_has_access_to_escritorio_relatorios(escritorio_id));

-- ============================================
-- 4. Storage Bucket para Relatorios
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'relatorios',
    'relatorios',
    false,
    52428800, -- 50MB max
    ARRAY['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Usuarios podem fazer upload de relatorios" ON storage.objects;
CREATE POLICY "Usuarios podem fazer upload de relatorios" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'relatorios' AND
        (storage.foldername(name))[1] IN (
            SELECT escritorio_id::text FROM escritorios_usuarios WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Usuarios podem ver relatorios do escritorio" ON storage.objects;
CREATE POLICY "Usuarios podem ver relatorios do escritorio" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'relatorios' AND
        (storage.foldername(name))[1] IN (
            SELECT escritorio_id::text FROM escritorios_usuarios WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Usuarios podem deletar relatorios do escritorio" ON storage.objects;
CREATE POLICY "Usuarios podem deletar relatorios do escritorio" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'relatorios' AND
        (storage.foldername(name))[1] IN (
            SELECT escritorio_id::text FROM escritorios_usuarios WHERE user_id = auth.uid()
        )
    );

-- ============================================
-- 5. Comentarios nas tabelas
-- ============================================
COMMENT ON TABLE relatorios_templates IS 'Templates de relatorios com configuracoes de colunas salvas';
COMMENT ON TABLE relatorios_gerados IS 'Historico de relatorios gerados para clientes';

COMMENT ON COLUMN relatorios_templates.colunas IS 'Array de campos a incluir no relatorio: numero_cnj, area, status, resumo_ia, etc';
COMMENT ON COLUMN relatorios_gerados.resumos_ia IS 'JSON com resumos gerados pela IA: { "processo_id": "texto do resumo" }';
COMMENT ON COLUMN relatorios_gerados.andamentos_salvos IS 'Se os andamentos da IA foram salvos nas movimentacoes dos processos';
