-- =====================================================
-- MIGRATION: Portfolio - Tabelas de Projetos (Execução)
-- Módulo: Portfólio (Catálogo de Produtos Jurídicos)
-- Data: 2025-01-13
-- =====================================================

-- =====================================================
-- 1. TABELA PRINCIPAL: portfolio_projetos
-- =====================================================
CREATE TABLE IF NOT EXISTS portfolio_projetos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id UUID NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,

  -- Produto de origem
  produto_id UUID NOT NULL REFERENCES portfolio_produtos(id),
  produto_versao INTEGER NOT NULL, -- Versão do produto quando clonado

  -- Cliente
  cliente_id UUID NOT NULL REFERENCES crm_pessoas(id),

  -- Identificação
  codigo TEXT NOT NULL, -- Ex: PROJ-2025-001
  nome TEXT NOT NULL, -- Nome personalizado do projeto

  -- Links opcionais (sem FK para tabelas que podem não existir)
  processo_id UUID,
  contrato_id UUID,

  -- Precificação
  preco_selecionado_id UUID REFERENCES portfolio_produtos_precos(id),
  valor_negociado NUMERIC(15,2),

  -- Status
  status TEXT NOT NULL DEFAULT 'em_andamento' CHECK (status IN (
    'rascunho', 'em_andamento', 'pausado', 'concluido', 'cancelado'
  )),
  progresso_percentual INTEGER DEFAULT 0 CHECK (progresso_percentual BETWEEN 0 AND 100),

  -- Datas
  data_inicio DATE,
  data_prevista_conclusao DATE,
  data_conclusao DATE,

  -- Resultado
  resultado TEXT CHECK (resultado IN ('sucesso', 'parcial', 'insucesso')),
  observacoes_resultado TEXT,

  -- Responsável
  responsavel_id UUID NOT NULL REFERENCES profiles(id),

  -- Metadados
  observacoes TEXT,
  tags TEXT[] DEFAULT '{}',

  -- Auditoria
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),

  UNIQUE(escritorio_id, codigo)
);

-- Indexes
CREATE INDEX idx_portfolio_projetos_escritorio ON portfolio_projetos(escritorio_id);
CREATE INDEX idx_portfolio_projetos_produto ON portfolio_projetos(produto_id);
CREATE INDEX idx_portfolio_projetos_cliente ON portfolio_projetos(cliente_id);
CREATE INDEX idx_portfolio_projetos_status ON portfolio_projetos(status);
CREATE INDEX idx_portfolio_projetos_responsavel ON portfolio_projetos(responsavel_id);
CREATE INDEX idx_portfolio_projetos_processo ON portfolio_projetos(processo_id) WHERE processo_id IS NOT NULL;

-- =====================================================
-- 2. TABELA: portfolio_projetos_fases
-- =====================================================
CREATE TABLE IF NOT EXISTS portfolio_projetos_fases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id UUID NOT NULL REFERENCES portfolio_projetos(id) ON DELETE CASCADE,

  -- Fase de origem (do produto)
  fase_produto_id UUID REFERENCES portfolio_produtos_fases(id),

  -- Dados clonados
  ordem INTEGER NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN (
    'pendente', 'em_andamento', 'concluida', 'pulada'
  )),
  progresso_percentual INTEGER DEFAULT 0 CHECK (progresso_percentual BETWEEN 0 AND 100),

  -- Datas planejadas
  data_inicio_prevista DATE,
  data_fim_prevista DATE,

  -- Datas reais
  data_inicio_real DATE,
  data_fim_real DATE,

  -- Evento na agenda (auto-criado)
  evento_agenda_id UUID,

  -- Notas
  observacoes TEXT,

  -- Auditoria
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_portfolio_proj_fases_projeto ON portfolio_projetos_fases(projeto_id);
CREATE INDEX idx_portfolio_proj_fases_status ON portfolio_projetos_fases(status);

-- =====================================================
-- 3. TABELA: portfolio_projetos_fases_checklist
-- =====================================================
CREATE TABLE IF NOT EXISTS portfolio_projetos_fases_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fase_projeto_id UUID NOT NULL REFERENCES portfolio_projetos_fases(id) ON DELETE CASCADE,

  -- Checklist de origem
  checklist_produto_id UUID REFERENCES portfolio_produtos_checklist(id),

  -- Dados clonados
  ordem INTEGER NOT NULL,
  item TEXT NOT NULL,
  obrigatorio BOOLEAN DEFAULT false,

  -- Status
  concluido BOOLEAN DEFAULT false,
  concluido_em TIMESTAMPTZ,
  concluido_por UUID REFERENCES profiles(id),

  -- Tarefa vinculada (se auto-criada)
  tarefa_id UUID,

  -- Auditoria
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_portfolio_proj_checklist_fase ON portfolio_projetos_fases_checklist(fase_projeto_id);
CREATE INDEX idx_portfolio_proj_checklist_concluido ON portfolio_projetos_fases_checklist(concluido);

-- =====================================================
-- 4. TABELA: portfolio_projetos_equipe
-- =====================================================
CREATE TABLE IF NOT EXISTS portfolio_projetos_equipe (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id UUID NOT NULL REFERENCES portfolio_projetos(id) ON DELETE CASCADE,

  -- Membro da equipe
  user_id UUID NOT NULL REFERENCES profiles(id),
  papel_id UUID REFERENCES portfolio_produtos_equipe_papeis(id),
  papel_nome TEXT NOT NULL, -- Desnormalizado para exibição

  -- Permissões
  pode_editar BOOLEAN DEFAULT true,
  recebe_notificacoes BOOLEAN DEFAULT true,

  -- Auditoria
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(projeto_id, user_id)
);

-- Indexes
CREATE INDEX idx_portfolio_proj_equipe_projeto ON portfolio_projetos_equipe(projeto_id);
CREATE INDEX idx_portfolio_proj_equipe_user ON portfolio_projetos_equipe(user_id);

-- =====================================================
-- 5. TABELA: portfolio_projetos_aprendizados
-- =====================================================
CREATE TABLE IF NOT EXISTS portfolio_projetos_aprendizados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id UUID NOT NULL REFERENCES portfolio_projetos(id) ON DELETE CASCADE,

  -- Tipo de aprendizado
  tipo TEXT NOT NULL CHECK (tipo IN (
    'nota_livre',       -- Nota livre
    'problema',         -- Problema encontrado
    'solucao',          -- Solução encontrada
    'melhoria',         -- Sugestão de melhoria
    'licao_aprendida'   -- Lição aprendida
  )),

  -- Conteúdo
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL,

  -- Categorização (para tipos estruturados)
  categoria TEXT, -- Ex: "comunicacao", "prazo", "tecnico", "cliente"
  impacto TEXT CHECK (impacto IN ('baixo', 'medio', 'alto')),

  -- Vínculo opcional com fase
  fase_projeto_id UUID REFERENCES portfolio_projetos_fases(id) ON DELETE SET NULL,

  -- Aplicabilidade ao produto
  aplicar_ao_produto BOOLEAN DEFAULT false, -- Deve melhorar o produto?
  aplicado_ao_produto BOOLEAN DEFAULT false, -- Já foi aplicado?
  aplicado_em TIMESTAMPTZ,

  -- Tags
  tags TEXT[] DEFAULT '{}',

  -- Auditoria
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Indexes
CREATE INDEX idx_portfolio_aprendizados_projeto ON portfolio_projetos_aprendizados(projeto_id);
CREATE INDEX idx_portfolio_aprendizados_tipo ON portfolio_projetos_aprendizados(tipo);
CREATE INDEX idx_portfolio_aprendizados_aplicar ON portfolio_projetos_aprendizados(aplicar_ao_produto)
  WHERE aplicar_ao_produto = true;

-- =====================================================
-- 6. TABELA: portfolio_metricas (Cache de KPIs)
-- =====================================================
CREATE TABLE IF NOT EXISTS portfolio_metricas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id UUID NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES portfolio_produtos(id) ON DELETE CASCADE,

  -- Período
  periodo TEXT NOT NULL CHECK (periodo IN ('total', 'ano', 'mes')),
  ano INTEGER,
  mes INTEGER,

  -- Métricas de execução
  total_execucoes INTEGER DEFAULT 0,
  execucoes_concluidas INTEGER DEFAULT 0,
  execucoes_em_andamento INTEGER DEFAULT 0,
  execucoes_canceladas INTEGER DEFAULT 0,

  -- Taxa de sucesso
  taxa_sucesso NUMERIC(5,2), -- Percentual

  -- Duração
  duracao_media_dias NUMERIC(8,2),
  duracao_minima_dias INTEGER,
  duracao_maxima_dias INTEGER,

  -- Receita
  receita_total NUMERIC(15,2) DEFAULT 0,
  receita_media NUMERIC(15,2),

  -- Aprendizados
  total_aprendizados INTEGER DEFAULT 0,

  -- Controle de cache
  calculado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(escritorio_id, produto_id, periodo, ano, mes)
);

-- Indexes
CREATE INDEX idx_portfolio_metricas_escritorio ON portfolio_metricas(escritorio_id);
CREATE INDEX idx_portfolio_metricas_produto ON portfolio_metricas(produto_id);

-- =====================================================
-- 7. TRIGGERS: updated_at automático
-- =====================================================

-- Trigger para portfolio_projetos
CREATE OR REPLACE FUNCTION update_portfolio_projetos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_portfolio_projetos_updated_at
  BEFORE UPDATE ON portfolio_projetos
  FOR EACH ROW
  EXECUTE FUNCTION update_portfolio_projetos_updated_at();

-- Trigger para portfolio_projetos_fases
CREATE OR REPLACE FUNCTION update_portfolio_projetos_fases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_portfolio_projetos_fases_updated_at
  BEFORE UPDATE ON portfolio_projetos_fases
  FOR EACH ROW
  EXECUTE FUNCTION update_portfolio_projetos_fases_updated_at();

-- =====================================================
-- 8. TRIGGER: Atualizar progresso do projeto
-- =====================================================
CREATE OR REPLACE FUNCTION update_portfolio_projeto_progresso()
RETURNS TRIGGER AS $$
DECLARE
  v_projeto_id UUID;
  v_total_fases INTEGER;
  v_fases_concluidas INTEGER;
  v_novo_progresso INTEGER;
BEGIN
  -- Determinar projeto_id
  IF TG_OP = 'DELETE' THEN
    v_projeto_id := OLD.projeto_id;
  ELSE
    v_projeto_id := NEW.projeto_id;
  END IF;

  -- Calcular progresso
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'concluida')
  INTO v_total_fases, v_fases_concluidas
  FROM portfolio_projetos_fases
  WHERE projeto_id = v_projeto_id;

  -- Calcular percentual
  IF v_total_fases > 0 THEN
    v_novo_progresso := ROUND((v_fases_concluidas::NUMERIC / v_total_fases) * 100);
  ELSE
    v_novo_progresso := 0;
  END IF;

  -- Atualizar projeto
  UPDATE portfolio_projetos
  SET progresso_percentual = v_novo_progresso
  WHERE id = v_projeto_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_portfolio_projeto_progresso
  AFTER INSERT OR UPDATE OF status OR DELETE ON portfolio_projetos_fases
  FOR EACH ROW
  EXECUTE FUNCTION update_portfolio_projeto_progresso();

-- =====================================================
-- 9. COMMENTS (Documentação)
-- =====================================================
COMMENT ON TABLE portfolio_projetos IS 'Projetos em execução (instância de produto para cliente)';
COMMENT ON TABLE portfolio_projetos_fases IS 'Fases do projeto com progresso';
COMMENT ON TABLE portfolio_projetos_fases_checklist IS 'Checklist em execução por fase';
COMMENT ON TABLE portfolio_projetos_equipe IS 'Equipe designada para o projeto';
COMMENT ON TABLE portfolio_projetos_aprendizados IS 'Lições aprendidas e melhorias do projeto';
COMMENT ON TABLE portfolio_metricas IS 'Cache de métricas e KPIs por produto';

COMMENT ON COLUMN portfolio_projetos.produto_versao IS 'Versão do produto quando o projeto foi criado (snapshot)';
COMMENT ON COLUMN portfolio_projetos.valor_negociado IS 'Valor final negociado com o cliente';
COMMENT ON COLUMN portfolio_projetos.resultado IS 'Resultado final: sucesso, parcial ou insucesso';

COMMENT ON COLUMN portfolio_projetos_aprendizados.tipo IS 'Tipo: nota_livre, problema, solucao, melhoria, licao_aprendida';
COMMENT ON COLUMN portfolio_projetos_aprendizados.aplicar_ao_produto IS 'Se true, aprendizado deve melhorar template do produto';
COMMENT ON COLUMN portfolio_projetos_aprendizados.aplicado_ao_produto IS 'Se true, já foi incorporado ao produto';
