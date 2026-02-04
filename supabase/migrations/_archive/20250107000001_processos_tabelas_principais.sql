-- Migration: Processos - Tabelas Principais
-- Data: 2025-01-07
-- Descrição: Estrutura central do módulo de processos (processos, partes, equipe, tags)

-- =====================================================
-- TABELA: processos_processos (PRINCIPAL)
-- =====================================================

CREATE TABLE processos_processos (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  escritorio_id uuid NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,

  -- Identificação
  numero_cnj text NOT NULL, -- Formato: 1234567-12.2024.8.26.0100
  numero_interno text, -- Controle interno do escritório

  -- Classificação
  tipo text NOT NULL CHECK (tipo IN ('judicial', 'administrativo', 'arbitragem')),
  area text NOT NULL CHECK (area IN (
    'civel', 'trabalhista', 'tributaria', 'familia', 'criminal',
    'previdenciaria', 'consumidor', 'empresarial', 'ambiental', 'outra'
  )),
  fase text NOT NULL CHECK (fase IN ('conhecimento', 'recurso', 'execucao', 'cumprimento_sentenca')),
  instancia text NOT NULL CHECK (instancia IN ('1a', '2a', '3a', 'stj', 'stf', 'tst', 'administrativa')),
  rito text CHECK (rito IN ('ordinario', 'sumario', 'especial', 'sumarissimo')),

  -- Valores
  valor_causa numeric(15,2),
  valor_acordo numeric(15,2),
  valor_condenacao numeric(15,2),

  -- Localização
  tribunal text NOT NULL, -- Ex: TJSP, TJRJ, TRT-2, TST
  comarca text,
  vara text,
  juiz text,
  relator text,

  -- Distribuição
  data_distribuicao date NOT NULL,
  numero_distribuicao text,
  forma_distribuicao text CHECK (forma_distribuicao IN ('livre', 'dependente', 'vinculada')),

  -- Cliente e Polo
  cliente_id uuid NOT NULL REFERENCES crm_clientes(id),
  polo_cliente text NOT NULL CHECK (polo_cliente IN ('ativo', 'passivo', 'terceiro')),

  -- Gestão
  responsavel_id uuid NOT NULL REFERENCES profiles(id),
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN (
    'ativo', 'suspenso', 'arquivado', 'baixado', 'transito_julgado', 'acordo'
  )),
  prioridade text DEFAULT 'media' CHECK (prioridade IN ('alta', 'media', 'baixa')),

  -- Observações e Estratégia
  observacoes text,
  estrategia text,
  objeto_acao text, -- Descrição do pedido

  -- Risco e Provisionamento
  risco text CHECK (risco IN ('alto', 'medio', 'baixo')),
  valor_risco numeric(15,2),
  provisao_sugerida numeric(15,2),

  -- Segredo de Justiça
  segredo_justica boolean DEFAULT false,

  -- Datas Importantes
  data_citacao date,
  data_sentenca date,
  data_transito_julgado date,
  data_arquivamento date,
  data_acordo date,

  -- Metadados
  cor_marcacao text, -- Cor personalizada para calendário
  tags text[],

  -- Controle
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id),

  -- Constraints
  UNIQUE(escritorio_id, numero_cnj)
);

-- Índices para performance
CREATE INDEX idx_processos_escritorio ON processos_processos(escritorio_id);
CREATE INDEX idx_processos_numero_cnj ON processos_processos(numero_cnj);
CREATE INDEX idx_processos_cliente ON processos_processos(cliente_id);
CREATE INDEX idx_processos_responsavel ON processos_processos(responsavel_id);
CREATE INDEX idx_processos_status ON processos_processos(status) WHERE status IN ('ativo', 'suspenso');
CREATE INDEX idx_processos_area ON processos_processos(area, status);
CREATE INDEX idx_processos_tribunal ON processos_processos(tribunal);
CREATE INDEX idx_processos_data_distribuicao ON processos_processos(data_distribuicao);
CREATE INDEX idx_processos_prioridade ON processos_processos(prioridade, status) WHERE status = 'ativo';
CREATE INDEX idx_processos_risco ON processos_processos(risco) WHERE risco IS NOT NULL;

-- Full-text search
CREATE INDEX idx_processos_search ON processos_processos
  USING gin(to_tsvector('portuguese', coalesce(numero_cnj, '') || ' ' || coalesce(objeto_acao, '') || ' ' || coalesce(observacoes, '')));

-- Comentário
COMMENT ON TABLE processos_processos IS 'Módulo Processos: Tabela principal de processos judiciais e administrativos';

-- =====================================================
-- TABELA: processos_partes
-- =====================================================

CREATE TABLE processos_partes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  processo_id uuid NOT NULL REFERENCES processos_processos(id) ON DELETE CASCADE,

  -- Tipo de participação
  tipo text NOT NULL CHECK (tipo IN (
    'autor', 'reu', 'terceiro_interessado', 'assistente',
    'opoente', 'denunciado', 'chamado', 'advogado_contrario'
  )),

  -- Dados da parte
  cliente_id uuid REFERENCES crm_clientes(id), -- Se for cliente do escritório
  nome text NOT NULL,
  cpf_cnpj text,
  qualificacao text, -- Descrição do papel: "Reclamante", "Executado", etc

  -- Advogados da parte (se não for nosso cliente)
  advogados text[], -- Array de nomes dos advogados
  oab_advogados text[], -- Array de OABs

  -- Endereço para citação/intimação
  endereco_completo text,

  -- Metadados
  observacoes text,
  ordem integer, -- Ordem de exibição (primeiro autor, segundo autor, etc)

  created_at timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX idx_processos_partes_processo ON processos_partes(processo_id);
CREATE INDEX idx_processos_partes_cliente ON processos_partes(cliente_id) WHERE cliente_id IS NOT NULL;
CREATE INDEX idx_processos_partes_tipo ON processos_partes(tipo);

COMMENT ON TABLE processos_partes IS 'Módulo Processos: Partes envolvidas no processo (autor, réu, terceiros, advogados)';

-- =====================================================
-- TABELA: processos_equipe
-- =====================================================

CREATE TABLE processos_equipe (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  processo_id uuid NOT NULL REFERENCES processos_processos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Papel na equipe
  papel text NOT NULL CHECK (papel IN (
    'responsavel', 'co_responsavel', 'assistente', 'estagiario', 'consultor'
  )),

  -- Permissões específicas
  pode_editar boolean DEFAULT false,
  pode_visualizar boolean DEFAULT true,
  recebe_notificacoes boolean DEFAULT true,

  -- Metadados
  adicionado_em timestamptz DEFAULT now(),
  adicionado_por uuid REFERENCES profiles(id),

  UNIQUE(processo_id, user_id)
);

-- Índices
CREATE INDEX idx_processos_equipe_processo ON processos_equipe(processo_id);
CREATE INDEX idx_processos_equipe_user ON processos_equipe(user_id);
CREATE INDEX idx_processos_equipe_responsavel ON processos_equipe(processo_id) WHERE papel = 'responsavel';

COMMENT ON TABLE processos_equipe IS 'Módulo Processos: Equipe de advogados atuando no processo';

-- =====================================================
-- TABELA: processos_tags
-- =====================================================

CREATE TABLE processos_tags (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  processo_id uuid NOT NULL REFERENCES processos_processos(id) ON DELETE CASCADE,
  tag text NOT NULL,
  cor text, -- Cor da tag (hex)

  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id),

  UNIQUE(processo_id, tag)
);

-- Índices
CREATE INDEX idx_processos_tags_processo ON processos_tags(processo_id);
CREATE INDEX idx_processos_tags_tag ON processos_tags(tag);

COMMENT ON TABLE processos_tags IS 'Módulo Processos: Tags e etiquetas personalizadas para organização';

-- =====================================================
-- TABELA: processos_relacionados
-- =====================================================

CREATE TABLE processos_relacionados (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  processo_origem_id uuid NOT NULL REFERENCES processos_processos(id) ON DELETE CASCADE,
  processo_destino_id uuid NOT NULL REFERENCES processos_processos(id) ON DELETE CASCADE,

  tipo_relacao text NOT NULL CHECK (tipo_relacao IN (
    'conexo', 'incidente', 'origem', 'decorrente', 'apensado',
    'cautelar', 'principal', 'apenso', 'recurso'
  )),

  observacoes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id),

  UNIQUE(processo_origem_id, processo_destino_id, tipo_relacao),
  CHECK (processo_origem_id != processo_destino_id)
);

-- Índices
CREATE INDEX idx_processos_relacionados_origem ON processos_relacionados(processo_origem_id);
CREATE INDEX idx_processos_relacionados_destino ON processos_relacionados(processo_destino_id);

COMMENT ON TABLE processos_relacionados IS 'Módulo Processos: Relacionamento entre processos (conexos, incidentes, apensados)';

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger: Atualizar updated_at
CREATE OR REPLACE FUNCTION update_processos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER processos_updated_at
  BEFORE UPDATE ON processos_processos
  FOR EACH ROW
  EXECUTE FUNCTION update_processos_updated_at();

-- Trigger: Adicionar responsável à equipe automaticamente
CREATE OR REPLACE FUNCTION add_responsavel_to_equipe()
RETURNS TRIGGER AS $$
BEGIN
  -- Inserir responsável na equipe (ignorar se já existir)
  INSERT INTO processos_equipe (processo_id, user_id, papel, pode_editar, pode_visualizar, recebe_notificacoes)
  VALUES (NEW.id, NEW.responsavel_id, 'responsavel', true, true, true)
  ON CONFLICT (processo_id, user_id)
  DO UPDATE SET papel = 'responsavel', pode_editar = true;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER processos_add_responsavel
  AFTER INSERT OR UPDATE OF responsavel_id ON processos_processos
  FOR EACH ROW
  EXECUTE FUNCTION add_responsavel_to_equipe();

-- Trigger: Validar número CNJ
CREATE OR REPLACE FUNCTION validate_numero_cnj()
RETURNS TRIGGER AS $$
BEGIN
  -- Validação básica: formato NNNNNNN-DD.AAAA.J.TT.OOOO
  -- Onde N=número, D=dígito, A=ano, J=segmento, T=tribunal, O=origem
  IF NEW.numero_cnj !~ '^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$' THEN
    RAISE EXCEPTION 'Número CNJ inválido. Formato esperado: 1234567-12.2024.8.26.0100';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER processos_validate_cnj
  BEFORE INSERT OR UPDATE OF numero_cnj ON processos_processos
  FOR EACH ROW
  EXECUTE FUNCTION validate_numero_cnj();
