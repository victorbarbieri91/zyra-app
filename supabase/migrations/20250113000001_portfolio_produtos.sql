-- =====================================================
-- MIGRATION: Portfolio - Tabelas de Produtos
-- Módulo: Portfólio (Catálogo de Produtos Jurídicos)
-- Data: 2025-01-13
-- =====================================================

-- =====================================================
-- 1. TABELA PRINCIPAL: portfolio_produtos
-- =====================================================
CREATE TABLE IF NOT EXISTS portfolio_produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id UUID NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,

  -- Identificação
  codigo TEXT NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  descricao_comercial TEXT, -- Texto de marketing para PDF

  -- Classificação
  area_juridica TEXT NOT NULL CHECK (area_juridica IN (
    'tributario', 'societario', 'trabalhista', 'civel', 'outro'
  )),
  categoria TEXT,
  tags TEXT[] DEFAULT '{}',

  -- Visual
  icone TEXT, -- Nome do ícone Lucide
  cor TEXT, -- Cor hex para exibição
  imagem_url TEXT, -- Imagem de capa para PDF

  -- Status
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN (
    'rascunho', 'ativo', 'inativo', 'arquivado'
  )),
  visivel_catalogo BOOLEAN DEFAULT false,

  -- Estimativas
  duracao_estimada_dias INTEGER,
  complexidade TEXT CHECK (complexidade IN ('baixa', 'media', 'alta')),

  -- Versionamento
  versao_atual INTEGER DEFAULT 1,

  -- Auditoria
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),

  UNIQUE(escritorio_id, codigo)
);

-- Indexes
CREATE INDEX idx_portfolio_produtos_escritorio ON portfolio_produtos(escritorio_id);
CREATE INDEX idx_portfolio_produtos_area ON portfolio_produtos(area_juridica);
CREATE INDEX idx_portfolio_produtos_status ON portfolio_produtos(status);
CREATE INDEX idx_portfolio_produtos_visivel ON portfolio_produtos(visivel_catalogo) WHERE visivel_catalogo = true;

-- =====================================================
-- 2. TABELA: portfolio_produtos_fases
-- =====================================================
CREATE TABLE IF NOT EXISTS portfolio_produtos_fases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL REFERENCES portfolio_produtos(id) ON DELETE CASCADE,

  -- Ordem e identificação
  ordem INTEGER NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,

  -- Duração
  duracao_estimada_dias INTEGER,
  prazo_tipo TEXT DEFAULT 'dias_uteis' CHECK (prazo_tipo IN ('dias_corridos', 'dias_uteis')),

  -- Dependências
  fase_dependencia_id UUID REFERENCES portfolio_produtos_fases(id),

  -- Integração com Agenda
  criar_evento_agenda BOOLEAN DEFAULT false,
  evento_titulo_template TEXT, -- Ex: "{produto} - {fase} - {cliente}"
  evento_descricao_template TEXT,

  -- Visual
  cor TEXT,
  icone TEXT,

  -- Auditoria
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(produto_id, ordem)
);

-- Indexes
CREATE INDEX idx_portfolio_fases_produto ON portfolio_produtos_fases(produto_id);

-- =====================================================
-- 3. TABELA: portfolio_produtos_checklist
-- =====================================================
CREATE TABLE IF NOT EXISTS portfolio_produtos_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fase_id UUID NOT NULL REFERENCES portfolio_produtos_fases(id) ON DELETE CASCADE,

  -- Ordem e conteúdo
  ordem INTEGER NOT NULL,
  item TEXT NOT NULL,
  obrigatorio BOOLEAN DEFAULT false,

  -- Auto-criação de tarefa
  criar_tarefa BOOLEAN DEFAULT false,
  tarefa_prazo_dias INTEGER,

  -- Auditoria
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(fase_id, ordem)
);

-- Indexes
CREATE INDEX idx_portfolio_checklist_fase ON portfolio_produtos_checklist(fase_id);

-- =====================================================
-- 4. TABELA: portfolio_produtos_equipe_papeis
-- =====================================================
CREATE TABLE IF NOT EXISTS portfolio_produtos_equipe_papeis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL REFERENCES portfolio_produtos(id) ON DELETE CASCADE,

  -- Definição do papel
  nome TEXT NOT NULL,
  descricao TEXT,
  obrigatorio BOOLEAN DEFAULT false,
  quantidade_minima INTEGER DEFAULT 1,
  habilidades_requeridas TEXT[] DEFAULT '{}',

  -- Auditoria
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(produto_id, nome)
);

-- Indexes
CREATE INDEX idx_portfolio_papeis_produto ON portfolio_produtos_equipe_papeis(produto_id);

-- =====================================================
-- 5. TABELA: portfolio_produtos_precos
-- =====================================================
CREATE TABLE IF NOT EXISTS portfolio_produtos_precos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL REFERENCES portfolio_produtos(id) ON DELETE CASCADE,

  -- Tipo de precificação
  tipo TEXT NOT NULL CHECK (tipo IN (
    'fixo',      -- Valor fixo único
    'faixa',     -- Range (mínimo-máximo)
    'por_fase',  -- Valor por fase
    'hora',      -- Por hora
    'exito'      -- Êxito (percentual)
  )),

  -- Valores para tipo 'fixo'
  valor_fixo NUMERIC(15,2),

  -- Valores para tipo 'faixa'
  valor_minimo NUMERIC(15,2),
  valor_maximo NUMERIC(15,2),

  -- Valores para tipo 'hora'
  valor_hora NUMERIC(15,2),
  horas_estimadas NUMERIC(8,2),

  -- Valores para tipo 'exito'
  percentual_exito NUMERIC(5,2),

  -- Valores para tipo 'por_fase' (JSONB: {fase_id: valor})
  valores_por_fase JSONB,

  -- Identificação da opção
  nome_opcao TEXT, -- Ex: "Padrão", "Premium", "Essencial"
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  padrao BOOLEAN DEFAULT false, -- Opção padrão de precificação

  -- Auditoria
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_portfolio_precos_produto ON portfolio_produtos_precos(produto_id);
CREATE INDEX idx_portfolio_precos_ativo ON portfolio_produtos_precos(ativo) WHERE ativo = true;

-- =====================================================
-- 6. TABELA: portfolio_produtos_recursos
-- =====================================================
CREATE TABLE IF NOT EXISTS portfolio_produtos_recursos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL REFERENCES portfolio_produtos(id) ON DELETE CASCADE,

  -- Tipo de recurso
  tipo TEXT NOT NULL CHECK (tipo IN (
    'template',       -- Template de documento
    'checklist',      -- Checklist detalhado
    'modelo',         -- Modelo/minuta
    'referencia',     -- Material de referência
    'material_apoio'  -- Material de apoio geral
  )),

  -- Identificação
  nome TEXT NOT NULL,
  descricao TEXT,

  -- Arquivo
  arquivo_url TEXT,
  arquivo_nome TEXT,
  arquivo_tipo TEXT,

  -- Vínculo opcional com fase
  fase_id UUID REFERENCES portfolio_produtos_fases(id) ON DELETE SET NULL,

  -- Auditoria
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_portfolio_recursos_produto ON portfolio_produtos_recursos(produto_id);
CREATE INDEX idx_portfolio_recursos_fase ON portfolio_produtos_recursos(fase_id);

-- =====================================================
-- 7. TABELA: portfolio_produtos_versoes
-- =====================================================
CREATE TABLE IF NOT EXISTS portfolio_produtos_versoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL REFERENCES portfolio_produtos(id) ON DELETE CASCADE,

  -- Versão
  versao INTEGER NOT NULL,
  snapshot JSONB NOT NULL, -- Estado completo do produto
  alteracoes TEXT, -- Resumo das alterações
  motivo TEXT, -- Motivo da nova versão

  -- Auditoria
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),

  UNIQUE(produto_id, versao)
);

-- Indexes
CREATE INDEX idx_portfolio_versoes_produto ON portfolio_produtos_versoes(produto_id);

-- =====================================================
-- 8. TRIGGERS: updated_at automático
-- =====================================================

-- Trigger para portfolio_produtos
CREATE OR REPLACE FUNCTION update_portfolio_produtos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_portfolio_produtos_updated_at
  BEFORE UPDATE ON portfolio_produtos
  FOR EACH ROW
  EXECUTE FUNCTION update_portfolio_produtos_updated_at();

-- =====================================================
-- 9. COMMENTS (Documentação)
-- =====================================================
COMMENT ON TABLE portfolio_produtos IS 'Catálogo de produtos/serviços jurídicos do escritório';
COMMENT ON TABLE portfolio_produtos_fases IS 'Fases de execução de cada produto';
COMMENT ON TABLE portfolio_produtos_checklist IS 'Itens de checklist por fase do produto';
COMMENT ON TABLE portfolio_produtos_equipe_papeis IS 'Papéis de equipe personalizados por produto';
COMMENT ON TABLE portfolio_produtos_precos IS 'Opções de precificação flexível por produto';
COMMENT ON TABLE portfolio_produtos_recursos IS 'Recursos e documentos anexos ao produto';
COMMENT ON TABLE portfolio_produtos_versoes IS 'Histórico de versões do produto';

COMMENT ON COLUMN portfolio_produtos.codigo IS 'Código único do produto (ex: TRIB-001)';
COMMENT ON COLUMN portfolio_produtos.descricao_comercial IS 'Descrição de marketing para PDF de vendas';
COMMENT ON COLUMN portfolio_produtos.area_juridica IS 'Área jurídica: tributario, societario, trabalhista, civel, outro';
COMMENT ON COLUMN portfolio_produtos.versao_atual IS 'Número da versão atual do produto';

COMMENT ON COLUMN portfolio_produtos_fases.criar_evento_agenda IS 'Se true, cria evento na agenda ao iniciar projeto';
COMMENT ON COLUMN portfolio_produtos_fases.evento_titulo_template IS 'Template do título: {produto}, {fase}, {cliente}';

COMMENT ON COLUMN portfolio_produtos_precos.tipo IS 'Tipo: fixo, faixa, por_fase, hora, exito';
COMMENT ON COLUMN portfolio_produtos_precos.valores_por_fase IS 'JSONB com valores por fase: {"fase_id": valor}';
