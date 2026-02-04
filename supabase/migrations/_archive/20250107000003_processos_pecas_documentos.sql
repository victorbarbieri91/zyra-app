-- Migration: Processos - Peças Processuais e Templates
-- Data: 2025-01-07
-- Descrição: Peças processuais, templates, documentos e versionamento

-- =====================================================
-- TABELA: processos_pecas
-- =====================================================

CREATE TABLE processos_pecas (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  processo_id uuid NOT NULL REFERENCES processos_processos(id) ON DELETE CASCADE,
  escritorio_id uuid NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,

  -- Tipo de peça
  tipo text NOT NULL CHECK (tipo IN (
    'inicial', 'contestacao', 'replica', 'impugnacao',
    'recurso_apelacao', 'recurso_especial', 'recurso_extraordinario', 'agravo',
    'contrarrazoes', 'memoriais', 'alegacoes_finais',
    'manifestacao', 'peticao_intermediaria', 'cumprimento_sentenca',
    'embargos_declaracao', 'embargos_execucao',
    'acordo', 'desistencia', 'renunci a',
    'outra'
  )),

  -- Identificação
  titulo text NOT NULL,
  descricao text,

  -- Arquivo
  arquivo_url text, -- URL no storage
  arquivo_nome text,
  arquivo_tamanho bigint, -- bytes
  arquivo_tipo text, -- MIME type

  -- Versionamento
  versao integer DEFAULT 1,
  versao_anterior_id uuid REFERENCES processos_pecas(id),
  is_versao_atual boolean DEFAULT true,

  -- Protocolo
  protocolado boolean DEFAULT false,
  numero_protocolo text,
  data_protocolo timestamptz,
  protocolo_metadata jsonb, -- Dados adicionais do protocolo

  -- Geração
  gerado_ia boolean DEFAULT false, -- Se foi gerado por IA
  template_id uuid, -- FK será criada depois
  tempo_geracao_segundos integer, -- Tempo que levou para gerar (IA)

  -- Autoria
  criado_por uuid REFERENCES profiles(id),
  revisado_por uuid REFERENCES profiles(id),
  data_revisao timestamptz,

  -- Status
  status text DEFAULT 'rascunho' CHECK (status IN (
    'rascunho', 'em_revisao', 'aprovado', 'protocolado', 'arquivado'
  )),

  -- Metadados
  tags text[],
  observacoes text,
  metadata jsonb,

  -- Controle
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX idx_processos_pecas_processo ON processos_pecas(processo_id);
CREATE INDEX idx_processos_pecas_escritorio ON processos_pecas(escritorio_id);
CREATE INDEX idx_processos_pecas_tipo ON processos_pecas(tipo);
CREATE INDEX idx_processos_pecas_criado_por ON processos_pecas(criado_por);
CREATE INDEX idx_processos_pecas_status ON processos_pecas(status);
CREATE INDEX idx_processos_pecas_protocolado ON processos_pecas(protocolado, data_protocolo);
CREATE INDEX idx_processos_pecas_versao_atual ON processos_pecas(processo_id, is_versao_atual) WHERE is_versao_atual = true;
CREATE INDEX idx_processos_pecas_gerado_ia ON processos_pecas(gerado_ia) WHERE gerado_ia = true;

COMMENT ON TABLE processos_pecas IS 'Módulo Processos: Peças processuais (petições, recursos, manifestações) com versionamento';

-- =====================================================
-- TABELA: processos_templates_pecas
-- =====================================================

CREATE TABLE processos_templates_pecas (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  escritorio_id uuid NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,

  -- Identificação
  nome text NOT NULL,
  descricao text,

  -- Classificação
  tipo_peca text NOT NULL, -- Mesmo enum de processos_pecas.tipo
  area text, -- Área do direito (civel, trabalhista, etc)
  tags text[],

  -- Template
  conteudo_template text NOT NULL, -- Texto com placeholders: {{cliente_nome}}, {{processo_numero}}
  variaveis jsonb, -- Lista de variáveis disponíveis e seus tipos
  --   Ex: [{"nome": "cliente_nome", "tipo": "text", "obrigatorio": true}]

  -- Instruções para IA
  instrucoes_ia text, -- Instruções específicas para geração via IA
  prompt_sistema text, -- Prompt do sistema para IA
  exemplos jsonb, -- Exemplos de uso para treinar IA

  -- Configurações
  ativo boolean DEFAULT true,
  publico boolean DEFAULT false, -- Se é compartilhado com outros escritórios

  -- Estatísticas de uso
  vezes_usado integer DEFAULT 0,
  ultima_utilizacao timestamptz,

  -- Autoria
  criado_por uuid REFERENCES profiles(id),
  atualizado_por uuid REFERENCES profiles(id),

  -- Controle
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX idx_processos_templates_escritorio ON processos_templates_pecas(escritorio_id);
CREATE INDEX idx_processos_templates_tipo ON processos_templates_pecas(tipo_peca);
CREATE INDEX idx_processos_templates_area ON processos_templates_pecas(area);
CREATE INDEX idx_processos_templates_ativo ON processos_templates_pecas(ativo) WHERE ativo = true;
CREATE INDEX idx_processos_templates_criado_por ON processos_templates_pecas(criado_por);

-- Full-text search
CREATE INDEX idx_processos_templates_search ON processos_templates_pecas
  USING gin(to_tsvector('portuguese', coalesce(nome, '') || ' ' || coalesce(descricao, '') || ' ' || coalesce(conteudo_template, '')));

COMMENT ON TABLE processos_templates_pecas IS 'Módulo Processos: Templates de peças processuais com suporte a IA';

-- Adicionar FK de processos_pecas para templates
ALTER TABLE processos_pecas
  ADD CONSTRAINT fk_pecas_template
  FOREIGN KEY (template_id) REFERENCES processos_templates_pecas(id) ON DELETE SET NULL;

-- Adicionar FK de processos_prazos para pecas (prazo cumprido com peça)
ALTER TABLE processos_prazos
  ADD CONSTRAINT fk_prazos_peca
  FOREIGN KEY (peca_id) REFERENCES processos_pecas(id) ON DELETE SET NULL;

-- =====================================================
-- TABELA: processos_documentos (Documentos anexados ao processo)
-- =====================================================

CREATE TABLE processos_documentos (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  processo_id uuid NOT NULL REFERENCES processos_processos(id) ON DELETE CASCADE,
  escritorio_id uuid NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,

  -- Categorização
  categoria text NOT NULL CHECK (categoria IN (
    'procuracao', 'contrato', 'documento_parte', 'prova',
    'correspondencia', 'certidao', 'laudo', 'outro'
  )),

  -- Identificação
  nome text NOT NULL,
  descricao text,

  -- Arquivo
  arquivo_url text NOT NULL,
  arquivo_nome text NOT NULL,
  arquivo_tamanho bigint,
  arquivo_tipo text,

  -- OCR e indexação
  texto_extraido text, -- Texto extraído via OCR
  ocr_processado boolean DEFAULT false,
  ocr_confianca numeric(5,2), -- Percentual de confiança do OCR

  -- Organização
  pasta text, -- Caminho virtual de pasta
  tags text[],

  -- Vinculações
  parte_id uuid REFERENCES processos_partes(id), -- Se documento é de uma parte específica
  movimentacao_id uuid REFERENCES processos_movimentacoes(id), -- Se veio de uma movimentação
  peca_id uuid REFERENCES processos_pecas(id), -- Se é anexo de uma peça

  -- Controle de acesso
  confidencial boolean DEFAULT false,
  pode_compartilhar_cliente boolean DEFAULT true,

  -- Metadados
  metadata jsonb,

  -- Autoria
  enviado_por uuid REFERENCES profiles(id),

  -- Controle
  created_at timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX idx_processos_documentos_processo ON processos_documentos(processo_id);
CREATE INDEX idx_processos_documentos_escritorio ON processos_documentos(escritorio_id);
CREATE INDEX idx_processos_documentos_categoria ON processos_documentos(categoria);
CREATE INDEX idx_processos_documentos_parte ON processos_documentos(parte_id) WHERE parte_id IS NOT NULL;
CREATE INDEX idx_processos_documentos_enviado_por ON processos_documentos(enviado_por);
CREATE INDEX idx_processos_documentos_ocr ON processos_documentos(ocr_processado) WHERE ocr_processado = false;

-- Full-text search (nome + descrição + texto OCR)
CREATE INDEX idx_processos_documentos_search ON processos_documentos
  USING gin(to_tsvector('portuguese',
    coalesce(nome, '') || ' ' ||
    coalesce(descricao, '') || ' ' ||
    coalesce(texto_extraido, '')
  ));

COMMENT ON TABLE processos_documentos IS 'Módulo Processos: Documentos anexados ao processo (procurações, provas, contratos)';

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger: Atualizar updated_at
CREATE TRIGGER processos_pecas_updated_at
  BEFORE UPDATE ON processos_pecas
  FOR EACH ROW
  EXECUTE FUNCTION update_processos_updated_at();

CREATE TRIGGER processos_templates_updated_at
  BEFORE UPDATE ON processos_templates_pecas
  FOR EACH ROW
  EXECUTE FUNCTION update_processos_updated_at();

-- Trigger: Incrementar contador de uso do template
CREATE OR REPLACE FUNCTION incrementar_uso_template()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.template_id IS NOT NULL THEN
    UPDATE processos_templates_pecas
    SET
      vezes_usado = vezes_usado + 1,
      ultima_utilizacao = now()
    WHERE id = NEW.template_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER processos_pecas_incrementar_template
  AFTER INSERT ON processos_pecas
  FOR EACH ROW
  WHEN (NEW.template_id IS NOT NULL)
  EXECUTE FUNCTION incrementar_uso_template();

-- Trigger: Registrar histórico ao adicionar peça
CREATE OR REPLACE FUNCTION registrar_adicao_peca()
RETURNS TRIGGER AS $$
DECLARE
  v_user_nome text;
BEGIN
  SELECT nome INTO v_user_nome FROM profiles WHERE id = auth.uid();

  INSERT INTO processos_historico (
    processo_id, acao, descricao, user_id, user_nome, metadata
  ) VALUES (
    NEW.processo_id,
    'adicao_peca',
    'Peça adicionada: ' || NEW.titulo || ' (' || NEW.tipo || ')',
    auth.uid(),
    v_user_nome,
    jsonb_build_object(
      'peca_id', NEW.id,
      'tipo', NEW.tipo,
      'gerado_ia', NEW.gerado_ia
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER processos_historico_peca
  AFTER INSERT ON processos_pecas
  FOR EACH ROW
  EXECUTE FUNCTION registrar_adicao_peca();

-- Trigger: Registrar histórico ao adicionar documento
CREATE OR REPLACE FUNCTION registrar_adicao_documento()
RETURNS TRIGGER AS $$
DECLARE
  v_user_nome text;
BEGIN
  SELECT nome INTO v_user_nome FROM profiles WHERE id = auth.uid();

  INSERT INTO processos_historico (
    processo_id, acao, descricao, user_id, user_nome, metadata
  ) VALUES (
    NEW.processo_id,
    'adicao_documento',
    'Documento adicionado: ' || NEW.nome || ' (' || NEW.categoria || ')',
    auth.uid(),
    v_user_nome,
    jsonb_build_object(
      'documento_id', NEW.id,
      'categoria', NEW.categoria
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER processos_historico_documento
  AFTER INSERT ON processos_documentos
  FOR EACH ROW
  EXECUTE FUNCTION registrar_adicao_documento();

-- Trigger: Marcar versões anteriores como não atuais
CREATE OR REPLACE FUNCTION atualizar_versao_peca()
RETURNS TRIGGER AS $$
BEGIN
  -- Se esta é uma nova versão, marcar outras como não atuais
  IF TG_OP = 'INSERT' AND NEW.versao_anterior_id IS NOT NULL THEN
    UPDATE processos_pecas
    SET is_versao_atual = false
    WHERE processo_id = NEW.processo_id
      AND tipo = NEW.tipo
      AND id != NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER processos_pecas_versionamento
  AFTER INSERT ON processos_pecas
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_versao_peca();

-- Trigger: Oferta de registro de horas após protocolo de peça
CREATE OR REPLACE FUNCTION oferecer_registro_horas_peca()
RETURNS TRIGGER AS $$
DECLARE
  v_processo record;
  v_tempo_medio numeric;
BEGIN
  -- Apenas se foi protocolada agora
  IF NEW.protocolado = true AND (OLD.protocolado = false OR OLD.protocolado IS NULL) THEN

    -- Buscar dados do processo
    SELECT * INTO v_processo
    FROM processos_processos
    WHERE id = NEW.processo_id;

    -- Calcular tempo médio para este tipo de peça (baseado em histórico)
    SELECT AVG(
      EXTRACT(EPOCH FROM (data_protocolo - created_at)) / 3600
    ) INTO v_tempo_medio
    FROM processos_pecas
    WHERE tipo = NEW.tipo
      AND escritorio_id = NEW.escritorio_id
      AND protocolado = true
      AND tempo_geracao_segundos IS NOT NULL
    LIMIT 20;

    -- Criar notificação sugerindo registro de horas
    INSERT INTO dashboard_notificacoes (
      user_id, tipo, titulo, mensagem, metadata, link
    ) VALUES (
      NEW.criado_por,
      'sugestao_timesheet',
      'Registrar tempo: ' || NEW.titulo,
      'Peça protocolada. Registrar tempo trabalhado?',
      jsonb_build_object(
        'processo_id', NEW.processo_id,
        'peca_id', NEW.id,
        'tempo_sugerido_horas', COALESCE(ROUND(v_tempo_medio, 1), 2.0),
        'tipo_peca', NEW.tipo
      ),
      '/processos/' || NEW.processo_id || '/financeiro'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER processos_pecas_sugerir_timesheet
  AFTER UPDATE OF protocolado ON processos_pecas
  FOR EACH ROW
  EXECUTE FUNCTION oferecer_registro_horas_peca();
