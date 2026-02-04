-- =====================================================
-- MIGRAÇÃO: ADAPTAR CRM EXISTENTE PARA NOVA ESTRUTURA
-- =====================================================
-- Esta migration adapta as tabelas crm_clientes e crm_clientes_contatos
-- existentes para o novo modelo crm_pessoas consolidado
-- =====================================================

-- =====================================================
-- PASSO 1: BACKUP DAS TABELAS EXISTENTES
-- =====================================================

-- Criar backup das tabelas antigas
CREATE TABLE IF NOT EXISTS crm_clientes_backup AS SELECT * FROM crm_clientes;
CREATE TABLE IF NOT EXISTS crm_clientes_contatos_backup AS SELECT * FROM crm_clientes_contatos;

-- =====================================================
-- PASSO 2: ADICIONAR NOVAS COLUNAS EM crm_clientes
-- =====================================================

-- Renomear para seguir padrão crm_pessoas
ALTER TABLE crm_clientes RENAME TO crm_pessoas;

-- Adicionar tipo_contato (todos clientes por padrão nas tabelas antigas)
ALTER TABLE crm_pessoas
ADD COLUMN IF NOT EXISTS tipo_contato TEXT NOT NULL DEFAULT 'cliente';

-- Adicionar constraint no tipo_contato
ALTER TABLE crm_pessoas
DROP CONSTRAINT IF EXISTS crm_pessoas_tipo_contato_check;

ALTER TABLE crm_pessoas
ADD CONSTRAINT crm_pessoas_tipo_contato_check
CHECK (tipo_contato IN (
    'cliente',
    'parte_contraria',
    'correspondente',
    'testemunha',
    'perito',
    'juiz',
    'promotor',
    'outros'
));

-- Renomear coluna 'tipo' para 'tipo_pessoa' (mais claro)
ALTER TABLE crm_pessoas RENAME COLUMN tipo TO tipo_pessoa;

-- Adicionar constraint no tipo_pessoa
ALTER TABLE crm_pessoas
DROP CONSTRAINT IF EXISTS crm_pessoas_tipo_pessoa_check;

ALTER TABLE crm_pessoas
ADD CONSTRAINT crm_pessoas_tipo_pessoa_check
CHECK (tipo_pessoa IN ('pf', 'pj'));

-- Adicionar colunas de contato (consolidando na tabela principal)
ALTER TABLE crm_pessoas ADD COLUMN IF NOT EXISTS telefone_principal TEXT;
ALTER TABLE crm_pessoas ADD COLUMN IF NOT EXISTS telefone_secundario TEXT;
ALTER TABLE crm_pessoas ADD COLUMN IF NOT EXISTS celular TEXT;
ALTER TABLE crm_pessoas ADD COLUMN IF NOT EXISTS email_principal TEXT;
ALTER TABLE crm_pessoas ADD COLUMN IF NOT EXISTS email_secundario TEXT;
ALTER TABLE crm_pessoas ADD COLUMN IF NOT EXISTS whatsapp TEXT;

-- Adicionar colunas de endereço
ALTER TABLE crm_pessoas ADD COLUMN IF NOT EXISTS cep TEXT;
ALTER TABLE crm_pessoas ADD COLUMN IF NOT EXISTS logradouro TEXT;
ALTER TABLE crm_pessoas ADD COLUMN IF NOT EXISTS numero TEXT;
ALTER TABLE crm_pessoas ADD COLUMN IF NOT EXISTS complemento TEXT;
ALTER TABLE crm_pessoas ADD COLUMN IF NOT EXISTS bairro TEXT;
ALTER TABLE crm_pessoas ADD COLUMN IF NOT EXISTS cidade TEXT;
ALTER TABLE crm_pessoas ADD COLUMN IF NOT EXISTS uf TEXT;

-- Adicionar constraint no UF (2 caracteres)
ALTER TABLE crm_pessoas
DROP CONSTRAINT IF EXISTS crm_pessoas_uf_check;

ALTER TABLE crm_pessoas
ADD CONSTRAINT crm_pessoas_uf_check
CHECK (LENGTH(uf) = 2 OR uf IS NULL);

-- Adicionar array de tags
ALTER TABLE crm_pessoas ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Atualizar constraint de status
ALTER TABLE crm_pessoas
DROP CONSTRAINT IF EXISTS crm_pessoas_status_check;

ALTER TABLE crm_pessoas
ADD CONSTRAINT crm_pessoas_status_check
CHECK (status IN ('ativo', 'inativo', 'prospecto', 'arquivado'));

-- Atualizar constraint de estado_civil
ALTER TABLE crm_pessoas
DROP CONSTRAINT IF EXISTS crm_pessoas_estado_civil_check;

ALTER TABLE crm_pessoas
ADD CONSTRAINT crm_pessoas_estado_civil_check
CHECK (estado_civil IN ('solteiro', 'casado', 'divorciado', 'viuvo', 'uniao_estavel', NULL));

-- Validação de CPF/CNPJ
ALTER TABLE crm_pessoas
DROP CONSTRAINT IF EXISTS cpf_cnpj_format;

ALTER TABLE crm_pessoas
ADD CONSTRAINT cpf_cnpj_format CHECK (
    cpf_cnpj IS NULL OR
    (tipo_pessoa = 'pf' AND LENGTH(REPLACE(REPLACE(cpf_cnpj, '.', ''), '-', '')) = 11) OR
    (tipo_pessoa = 'pj' AND LENGTH(REPLACE(REPLACE(REPLACE(cpf_cnpj, '.', ''), '-', ''), '/', '')) = 14)
);

-- =====================================================
-- PASSO 3: MIGRAR DADOS DE crm_clientes_contatos PARA crm_pessoas
-- =====================================================

-- Migrar telefones principais
UPDATE crm_pessoas p
SET telefone_principal = (
    SELECT valor
    FROM crm_clientes_contatos c
    WHERE c.cliente_id = p.id
      AND c.tipo = 'telefone'
      AND c.principal = true
    LIMIT 1
)
WHERE EXISTS (
    SELECT 1
    FROM crm_clientes_contatos c
    WHERE c.cliente_id = p.id
      AND c.tipo = 'telefone'
      AND c.principal = true
);

-- Migrar celular
UPDATE crm_pessoas p
SET celular = (
    SELECT valor
    FROM crm_clientes_contatos c
    WHERE c.cliente_id = p.id
      AND c.tipo = 'telefone'
      AND (c.label ILIKE '%celular%' OR c.label ILIKE '%móvel%')
    LIMIT 1
)
WHERE EXISTS (
    SELECT 1
    FROM crm_clientes_contatos c
    WHERE c.cliente_id = p.id
      AND c.tipo = 'telefone'
      AND (c.label ILIKE '%celular%' OR c.label ILIKE '%móvel%')
);

-- Migrar email principal
UPDATE crm_pessoas p
SET email_principal = (
    SELECT valor
    FROM crm_clientes_contatos c
    WHERE c.cliente_id = p.id
      AND c.tipo = 'email'
      AND c.principal = true
    LIMIT 1
)
WHERE EXISTS (
    SELECT 1
    FROM crm_clientes_contatos c
    WHERE c.cliente_id = p.id
      AND c.tipo = 'email'
      AND c.principal = true
);

-- Migrar endereço principal
UPDATE crm_pessoas p
SET
    logradouro = dados->>'logradouro',
    numero = dados->>'numero',
    complemento = dados->>'complemento',
    bairro = dados->>'bairro',
    cidade = dados->>'cidade',
    uf = dados->>'uf',
    cep = dados->>'cep'
FROM (
    SELECT
        cliente_id,
        jsonb_build_object(
            'logradouro', SPLIT_PART(valor, ',', 1),
            'cidade', SPLIT_PART(valor, ',', -2),
            'uf', SPLIT_PART(valor, ',', -1)
        ) as dados
    FROM crm_clientes_contatos
    WHERE tipo = 'endereco' AND principal = true
) enderecos
WHERE p.id = enderecos.cliente_id;

-- =====================================================
-- PASSO 4: CRIAR ÍNDICES OTIMIZADOS
-- =====================================================

-- Remover índices antigos se existirem
DROP INDEX IF EXISTS idx_crm_clientes_escritorio;
DROP INDEX IF EXISTS idx_crm_clientes_status;
DROP INDEX IF EXISTS idx_crm_clientes_responsavel;
DROP INDEX IF EXISTS idx_crm_clientes_cpf_cnpj;

-- Criar novos índices otimizados
CREATE INDEX IF NOT EXISTS idx_crm_pessoas_escritorio ON crm_pessoas(escritorio_id);
CREATE INDEX IF NOT EXISTS idx_crm_pessoas_tipo_contato ON crm_pessoas(tipo_contato);
CREATE INDEX IF NOT EXISTS idx_crm_pessoas_status ON crm_pessoas(status);
CREATE INDEX IF NOT EXISTS idx_crm_pessoas_responsavel ON crm_pessoas(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_crm_pessoas_cpf_cnpj ON crm_pessoas(cpf_cnpj) WHERE cpf_cnpj IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_pessoas_nome ON crm_pessoas USING gin(to_tsvector('portuguese', nome_completo));
CREATE INDEX IF NOT EXISTS idx_crm_pessoas_tags ON crm_pessoas USING gin(tags);

-- =====================================================
-- PASSO 5: ATUALIZAR FOREIGN KEYS EM OUTRAS TABELAS
-- =====================================================

-- Se houver referências em outras tabelas, atualizar aqui
-- Exemplo: processos, honorarios, etc
-- (será tratado quando integrarmos com outros módulos)

-- =====================================================
-- PASSO 6: MANTER crm_clientes_contatos PARA COMPATIBILIDADE
-- =====================================================

-- Manter a tabela crm_clientes_contatos por enquanto para compatibilidade
-- mas renomear o FK para referenciar crm_pessoas

ALTER TABLE crm_clientes_contatos
DROP CONSTRAINT IF EXISTS crm_clientes_contatos_cliente_id_fkey;

ALTER TABLE crm_clientes_contatos
ADD CONSTRAINT crm_clientes_contatos_pessoa_id_fkey
FOREIGN KEY (cliente_id) REFERENCES crm_pessoas(id) ON DELETE CASCADE;

-- Adicionar comentário explicativo
COMMENT ON TABLE crm_clientes_contatos IS 'DEPRECATED: Tabela mantida para compatibilidade. Novos contatos devem ser salvos diretamente em crm_pessoas';

-- =====================================================
-- COMENTÁRIOS NA TABELA
-- =====================================================

COMMENT ON TABLE crm_pessoas IS 'Cadastro único de todas as pessoas do sistema: clientes, partes contrárias, correspondentes, testemunhas, peritos, etc.';
COMMENT ON COLUMN crm_pessoas.tipo_pessoa IS 'Pessoa Física (pf) ou Pessoa Jurídica (pj)';
COMMENT ON COLUMN crm_pessoas.tipo_contato IS 'Classificação do contato no sistema';
COMMENT ON COLUMN crm_pessoas.cpf_cnpj IS 'CPF para PF (11 dígitos) ou CNPJ para PJ (14 dígitos)';
COMMENT ON COLUMN crm_pessoas.status IS 'Status do contato: prospecto (lead), ativo (cliente), inativo, arquivado';
COMMENT ON COLUMN crm_pessoas.origem IS 'Como conheceu o escritório';
COMMENT ON COLUMN crm_pessoas.tags IS 'Array de tags para segmentação';

-- =====================================================
RAISE NOTICE '✅ Migração concluída!';
RAISE NOTICE '- Tabela crm_clientes renomeada para crm_pessoas';
RAISE NOTICE '- Contatos migrados para colunas da tabela principal';
RAISE NOTICE '- Backup criado: crm_clientes_backup e crm_clientes_contatos_backup';
-- =====================================================
