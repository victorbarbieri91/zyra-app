-- =====================================================
-- MÓDULO CRM - MIGRATION 2: FUNIL DE VENDAS
-- =====================================================
-- Tabelas para gestão do funil de vendas:
-- - Etapas personalizáveis do funil
-- - Oportunidades (propostas/negociações)
-- - Atividades das oportunidades (timeline)
-- =====================================================

-- Tabela: Etapas do Funil
CREATE TABLE crm_funil_etapas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    escritorio_id UUID NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,
    nome TEXT NOT NULL, -- ex: "Lead", "Proposta Enviada", "Negociação", "Fechado"
    descricao TEXT,
    ordem INTEGER NOT NULL, -- ordem de exibição no funil
    cor TEXT NOT NULL DEFAULT '#64748b', -- cor hex para visualização
    ativo BOOLEAN NOT NULL DEFAULT true,
    tipo TEXT NOT NULL DEFAULT 'em_andamento' CHECK (tipo IN ('em_andamento', 'ganho', 'perdido')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(escritorio_id, ordem),
    UNIQUE(escritorio_id, nome)
);

CREATE INDEX idx_crm_funil_etapas_escritorio ON crm_funil_etapas(escritorio_id);
CREATE INDEX idx_crm_funil_etapas_ordem ON crm_funil_etapas(escritorio_id, ordem) WHERE ativo = true;

COMMENT ON TABLE crm_funil_etapas IS 'Etapas personalizáveis do funil de vendas por escritório';
COMMENT ON COLUMN crm_funil_etapas.tipo IS 'Tipo da etapa: em_andamento (etapas do funil), ganho (fechamento positivo), perdido (fechamento negativo)';

-- Tabela: Oportunidades (Propostas/Negociações)
CREATE TABLE crm_oportunidades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    escritorio_id UUID NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,
    pessoa_id UUID NOT NULL REFERENCES crm_pessoas(id) ON DELETE CASCADE,

    -- Dados da Oportunidade
    titulo TEXT NOT NULL, -- ex: "Ação Trabalhista - Empresa ABC"
    descricao TEXT,
    valor_estimado NUMERIC(15, 2),
    probabilidade INTEGER CHECK (probabilidade >= 0 AND probabilidade <= 100), -- 0-100%

    -- Controle do Funil
    etapa_id UUID NOT NULL REFERENCES crm_funil_etapas(id) ON DELETE RESTRICT,
    responsavel_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,

    -- Origem e Classificação
    origem TEXT, -- indicacao, site, google, instagram, facebook, linkedin, evento, outros
    indicado_por UUID REFERENCES crm_pessoas(id) ON DELETE SET NULL, -- quem indicou
    area_juridica TEXT, -- área de atuação: trabalhista, civil, empresarial, etc
    tags TEXT[] DEFAULT '{}',

    -- Datas
    data_abertura DATE NOT NULL DEFAULT CURRENT_DATE,
    data_prevista_fechamento DATE,
    data_fechamento DATE,

    -- Resultado
    resultado TEXT CHECK (resultado IN ('ganho', 'perdido', 'cancelado', NULL)),
    motivo_perda TEXT, -- motivo se perdeu
    valor_fechado NUMERIC(15, 2), -- valor real se ganhou

    -- Metadados
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT data_fechamento_valid CHECK (
        (resultado IS NULL AND data_fechamento IS NULL) OR
        (resultado IS NOT NULL AND data_fechamento IS NOT NULL)
    )
);

CREATE INDEX idx_crm_oportunidades_escritorio ON crm_oportunidades(escritorio_id);
CREATE INDEX idx_crm_oportunidades_pessoa ON crm_oportunidades(pessoa_id);
CREATE INDEX idx_crm_oportunidades_etapa ON crm_oportunidades(etapa_id);
CREATE INDEX idx_crm_oportunidades_responsavel ON crm_oportunidades(responsavel_id);
CREATE INDEX idx_crm_oportunidades_resultado ON crm_oportunidades(resultado);
CREATE INDEX idx_crm_oportunidades_data_abertura ON crm_oportunidades(data_abertura DESC);
CREATE INDEX idx_crm_oportunidades_tags ON crm_oportunidades USING gin(tags);

COMMENT ON TABLE crm_oportunidades IS 'Oportunidades de negócio (propostas e negociações) do funil de vendas';
COMMENT ON COLUMN crm_oportunidades.probabilidade IS 'Probabilidade de fechamento (0-100%)';
COMMENT ON COLUMN crm_oportunidades.resultado IS 'Resultado final: ganho (virou cliente), perdido, cancelado';

-- Tabela: Atividades das Oportunidades (Timeline)
CREATE TABLE crm_oportunidades_atividades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    oportunidade_id UUID NOT NULL REFERENCES crm_oportunidades(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Tipo e Conteúdo
    tipo TEXT NOT NULL CHECK (tipo IN (
        'nota',
        'ligacao',
        'reuniao',
        'email',
        'whatsapp',
        'proposta_enviada',
        'contrato_enviado',
        'mudanca_etapa',
        'alteracao_valor',
        'outros'
    )),
    titulo TEXT,
    descricao TEXT NOT NULL,

    -- Dados Adicionais
    dados_extras JSONB, -- dados estruturados específicos por tipo

    -- Metadados
    data_hora TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_crm_oportunidades_atividades_oportunidade ON crm_oportunidades_atividades(oportunidade_id, data_hora DESC);
CREATE INDEX idx_crm_oportunidades_atividades_user ON crm_oportunidades_atividades(user_id);
CREATE INDEX idx_crm_oportunidades_atividades_tipo ON crm_oportunidades_atividades(tipo);

COMMENT ON TABLE crm_oportunidades_atividades IS 'Timeline de atividades e interações de cada oportunidade';
COMMENT ON COLUMN crm_oportunidades_atividades.dados_extras IS 'Dados estruturados específicos: etapa_anterior, etapa_nova, valor_anterior, valor_novo, etc';

-- Função auxiliar: calcular tempo na etapa atual
CREATE OR REPLACE FUNCTION get_tempo_na_etapa(oportunidade_id UUID)
RETURNS INTERVAL AS $$
DECLARE
    ultima_mudanca TIMESTAMPTZ;
BEGIN
    -- Busca a última mudança de etapa
    SELECT data_hora INTO ultima_mudanca
    FROM crm_oportunidades_atividades
    WHERE oportunidades_atividades.oportunidade_id = get_tempo_na_etapa.oportunidade_id
      AND tipo = 'mudanca_etapa'
    ORDER BY data_hora DESC
    LIMIT 1;

    -- Se nunca mudou de etapa, considera a data de criação
    IF ultima_mudanca IS NULL THEN
        SELECT created_at INTO ultima_mudanca
        FROM crm_oportunidades
        WHERE id = get_tempo_na_etapa.oportunidade_id;
    END IF;

    RETURN NOW() - ultima_mudanca;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_tempo_na_etapa IS 'Calcula há quanto tempo a oportunidade está na etapa atual';
