-- =====================================================
-- MÓDULO CRM - MIGRATION 3: RELACIONAMENTO COM CLIENTES
-- =====================================================
-- Tabelas para gestão do relacionamento pós-conversão:
-- - Interações (timeline de contatos)
-- - Anexos de interações
-- - Relacionamentos entre pessoas
-- =====================================================

-- Tabela: Interações com Clientes
CREATE TABLE crm_interacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pessoa_id UUID NOT NULL REFERENCES crm_pessoas(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, -- quem registrou

    -- Tipo e Conteúdo
    tipo TEXT NOT NULL CHECK (tipo IN (
        'ligacao',
        'reuniao',
        'email',
        'whatsapp',
        'visita',
        'videochamada',
        'mensagem',
        'outros'
    )),
    assunto TEXT NOT NULL,
    descricao TEXT NOT NULL,

    -- Detalhes da Interação
    data_hora TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    duracao_minutos INTEGER, -- duração em minutos (para reuniões/ligações)
    resultado TEXT, -- ex: "Agendada audiência", "Cliente satisfeito", "Pagamento confirmado"
    participantes TEXT[], -- outros participantes além do user_id

    -- Follow-up
    follow_up BOOLEAN NOT NULL DEFAULT false,
    follow_up_data DATE,
    follow_up_descricao TEXT,
    follow_up_concluido BOOLEAN DEFAULT false,
    follow_up_concluido_em TIMESTAMPTZ,

    -- Vinculação Opcional
    processo_id UUID, -- vincula a um processo específico se aplicável
    oportunidade_id UUID REFERENCES crm_oportunidades(id) ON DELETE SET NULL,

    -- Metadados
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT follow_up_data_required CHECK (
        (follow_up = false) OR
        (follow_up = true AND follow_up_data IS NOT NULL)
    )
);

CREATE INDEX idx_crm_interacoes_pessoa ON crm_interacoes(pessoa_id, data_hora DESC);
CREATE INDEX idx_crm_interacoes_user ON crm_interacoes(user_id);
CREATE INDEX idx_crm_interacoes_tipo ON crm_interacoes(tipo);
CREATE INDEX idx_crm_interacoes_follow_up ON crm_interacoes(follow_up_data)
    WHERE follow_up = true AND follow_up_concluido = false;
CREATE INDEX idx_crm_interacoes_processo ON crm_interacoes(processo_id) WHERE processo_id IS NOT NULL;
CREATE INDEX idx_crm_interacoes_oportunidade ON crm_interacoes(oportunidade_id) WHERE oportunidade_id IS NOT NULL;

COMMENT ON TABLE crm_interacoes IS 'Timeline de interações e contatos com clientes';
COMMENT ON COLUMN crm_interacoes.resultado IS 'Resultado ou desfecho da interação';
COMMENT ON COLUMN crm_interacoes.follow_up IS 'Se requer acompanhamento futuro';
COMMENT ON COLUMN crm_interacoes.processo_id IS 'Vinculação opcional com processo específico';

-- Tabela: Anexos das Interações
CREATE TABLE crm_interacoes_anexos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interacao_id UUID NOT NULL REFERENCES crm_interacoes(id) ON DELETE CASCADE,

    -- Dados do Arquivo
    arquivo_nome TEXT NOT NULL,
    arquivo_url TEXT NOT NULL, -- URL do Supabase Storage
    arquivo_tipo TEXT NOT NULL, -- MIME type
    arquivo_tamanho INTEGER NOT NULL, -- tamanho em bytes

    -- Metadados
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_crm_interacoes_anexos_interacao ON crm_interacoes_anexos(interacao_id);

COMMENT ON TABLE crm_interacoes_anexos IS 'Arquivos anexados às interações (atas de reunião, propostas, contratos, etc)';

-- Tabela: Relacionamentos entre Pessoas
CREATE TABLE crm_relacionamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pessoa_origem_id UUID NOT NULL REFERENCES crm_pessoas(id) ON DELETE CASCADE,
    pessoa_destino_id UUID NOT NULL REFERENCES crm_pessoas(id) ON DELETE CASCADE,

    -- Tipo de Relacionamento
    tipo_relacionamento TEXT NOT NULL CHECK (tipo_relacionamento IN (
        'socio',
        'procurador',
        'representante_legal',
        'conjuge',
        'parente',
        'filial',
        'matriz',
        'contador',
        'fornecedor',
        'parceiro',
        'outros'
    )),
    descricao TEXT, -- detalhes adicionais do relacionamento
    observacoes TEXT,

    -- Metadados
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT nao_relacionar_consigo_mesmo CHECK (pessoa_origem_id != pessoa_destino_id),
    UNIQUE(pessoa_origem_id, pessoa_destino_id, tipo_relacionamento)
);

CREATE INDEX idx_crm_relacionamentos_origem ON crm_relacionamentos(pessoa_origem_id);
CREATE INDEX idx_crm_relacionamentos_destino ON crm_relacionamentos(pessoa_destino_id);
CREATE INDEX idx_crm_relacionamentos_tipo ON crm_relacionamentos(tipo_relacionamento);

COMMENT ON TABLE crm_relacionamentos IS 'Relacionamentos e vínculos entre pessoas do CRM';
COMMENT ON COLUMN crm_relacionamentos.tipo_relacionamento IS 'Tipo de vínculo entre as pessoas';

-- View auxiliar: buscar todos relacionamentos de uma pessoa (bidirecional)
CREATE OR REPLACE VIEW v_crm_relacionamentos_completos AS
SELECT
    r.id,
    r.pessoa_origem_id AS pessoa_id,
    r.pessoa_destino_id AS pessoa_relacionada_id,
    r.tipo_relacionamento,
    r.descricao,
    r.observacoes,
    r.created_at,
    'origem' AS direcao,
    p_dest.nome_completo AS pessoa_relacionada_nome,
    p_dest.tipo_pessoa AS pessoa_relacionada_tipo,
    p_dest.tipo_contato AS pessoa_relacionada_tipo_contato
FROM crm_relacionamentos r
JOIN crm_pessoas p_dest ON p_dest.id = r.pessoa_destino_id

UNION ALL

SELECT
    r.id,
    r.pessoa_destino_id AS pessoa_id,
    r.pessoa_origem_id AS pessoa_relacionada_id,
    r.tipo_relacionamento,
    r.descricao,
    r.observacoes,
    r.created_at,
    'destino' AS direcao,
    p_orig.nome_completo AS pessoa_relacionada_nome,
    p_orig.tipo_pessoa AS pessoa_relacionada_tipo,
    p_orig.tipo_contato AS pessoa_relacionada_tipo_contato
FROM crm_relacionamentos r
JOIN crm_pessoas p_orig ON p_orig.id = r.pessoa_origem_id;

COMMENT ON VIEW v_crm_relacionamentos_completos IS 'View bidirecional de relacionamentos (retorna vínculos partindo de e chegando em uma pessoa)';

-- Função: buscar última interação de uma pessoa
CREATE OR REPLACE FUNCTION get_ultima_interacao(p_pessoa_id UUID)
RETURNS TABLE (
    data_hora TIMESTAMPTZ,
    tipo TEXT,
    assunto TEXT,
    user_nome TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        i.data_hora,
        i.tipo,
        i.assunto,
        p.nome AS user_nome
    FROM crm_interacoes i
    JOIN profiles p ON p.id = i.user_id
    WHERE i.pessoa_id = p_pessoa_id
    ORDER BY i.data_hora DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_ultima_interacao IS 'Retorna a última interação registrada com uma pessoa';

-- Função: contar dias desde última interação
CREATE OR REPLACE FUNCTION dias_desde_ultima_interacao(p_pessoa_id UUID)
RETURNS INTEGER AS $$
DECLARE
    ultima_data TIMESTAMPTZ;
BEGIN
    SELECT MAX(data_hora) INTO ultima_data
    FROM crm_interacoes
    WHERE pessoa_id = p_pessoa_id;

    IF ultima_data IS NULL THEN
        RETURN NULL;
    END IF;

    RETURN EXTRACT(DAY FROM (NOW() - ultima_data))::INTEGER;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION dias_desde_ultima_interacao IS 'Retorna quantos dias se passaram desde a última interação com a pessoa';
