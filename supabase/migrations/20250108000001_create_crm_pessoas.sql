-- =====================================================
-- MÓDULO CRM - MIGRATION 1: TABELA PRINCIPAL DE PESSOAS
-- =====================================================
-- Tabela única para todos os contatos do sistema:
-- clientes, partes contrárias, correspondentes, testemunhas, peritos, etc.
-- =====================================================

-- Criar tabela crm_pessoas
CREATE TABLE crm_pessoas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    escritorio_id UUID NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,

    -- Tipo de Pessoa
    tipo_pessoa TEXT NOT NULL CHECK (tipo_pessoa IN ('pf', 'pj')), -- pessoa física ou jurídica
    tipo_contato TEXT NOT NULL CHECK (tipo_contato IN (
        'cliente',
        'parte_contraria',
        'correspondente',
        'testemunha',
        'perito',
        'juiz',
        'promotor',
        'outros'
    )),

    -- Dados Principais
    nome_completo TEXT NOT NULL, -- ou razão social para PJ
    nome_fantasia TEXT, -- para PJ
    cpf_cnpj TEXT UNIQUE,
    rg_ie TEXT,
    data_nascimento DATE,
    nacionalidade TEXT DEFAULT 'Brasileira',
    estado_civil TEXT CHECK (estado_civil IN ('solteiro', 'casado', 'divorciado', 'viuvo', 'uniao_estavel', NULL)),
    profissao TEXT,

    -- Contatos
    telefone_principal TEXT,
    telefone_secundario TEXT,
    celular TEXT,
    email_principal TEXT,
    email_secundario TEXT,
    whatsapp TEXT,

    -- Endereço
    cep TEXT,
    logradouro TEXT,
    numero TEXT,
    complemento TEXT,
    bairro TEXT,
    cidade TEXT,
    uf TEXT CHECK (LENGTH(uf) = 2 OR uf IS NULL),

    -- Dados CRM
    status TEXT NOT NULL DEFAULT 'prospecto' CHECK (status IN ('ativo', 'inativo', 'prospecto', 'arquivado')),
    origem TEXT, -- como conheceu: indicacao, google, instagram, site, etc
    responsavel_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    observacoes TEXT,
    tags TEXT[] DEFAULT '{}',

    -- Metadados
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    inativado_em TIMESTAMPTZ,
    motivo_inativacao TEXT,

    -- Índices para performance
    CONSTRAINT cpf_cnpj_format CHECK (
        cpf_cnpj IS NULL OR
        (tipo_pessoa = 'pf' AND LENGTH(REPLACE(REPLACE(cpf_cnpj, '.', ''), '-', '')) = 11) OR
        (tipo_pessoa = 'pj' AND LENGTH(REPLACE(REPLACE(REPLACE(cpf_cnpj, '.', ''), '-', ''), '/', '')) = 14)
    )
);

-- Índices para otimização de queries
CREATE INDEX idx_crm_pessoas_escritorio ON crm_pessoas(escritorio_id);
CREATE INDEX idx_crm_pessoas_tipo_contato ON crm_pessoas(tipo_contato);
CREATE INDEX idx_crm_pessoas_status ON crm_pessoas(status);
CREATE INDEX idx_crm_pessoas_responsavel ON crm_pessoas(responsavel_id);
CREATE INDEX idx_crm_pessoas_cpf_cnpj ON crm_pessoas(cpf_cnpj) WHERE cpf_cnpj IS NOT NULL;
CREATE INDEX idx_crm_pessoas_nome ON crm_pessoas USING gin(to_tsvector('portuguese', nome_completo));
CREATE INDEX idx_crm_pessoas_tags ON crm_pessoas USING gin(tags);

-- Comentários na tabela
COMMENT ON TABLE crm_pessoas IS 'Cadastro único de todas as pessoas do sistema: clientes, partes contrárias, correspondentes, testemunhas, peritos, etc.';
COMMENT ON COLUMN crm_pessoas.tipo_pessoa IS 'Pessoa Física (pf) ou Pessoa Jurídica (pj)';
COMMENT ON COLUMN crm_pessoas.tipo_contato IS 'Classificação do contato no sistema';
COMMENT ON COLUMN crm_pessoas.cpf_cnpj IS 'CPF para PF (11 dígitos) ou CNPJ para PJ (14 dígitos)';
COMMENT ON COLUMN crm_pessoas.status IS 'Status do contato: prospecto (lead), ativo (cliente), inativo, arquivado';
COMMENT ON COLUMN crm_pessoas.origem IS 'Como conheceu o escritório';
COMMENT ON COLUMN crm_pessoas.tags IS 'Array de tags para segmentação';
