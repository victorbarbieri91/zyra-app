-- Migration: Processos - Análise de IA e Jurisprudências
-- Data: 2025-01-07
-- Descrição: Tabelas para análises preditivas, jurisprudências e estratégias

-- =====================================================
-- TABELA: processos_analise_ia
-- =====================================================

CREATE TABLE processos_analise_ia (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  processo_id uuid NOT NULL REFERENCES processos_processos(id) ON DELETE CASCADE,
  escritorio_id uuid NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,

  -- Tipo de análise
  tipo_analise text NOT NULL CHECK (tipo_analise IN (
    'probabilidade_exito',
    'tempo_estimado_tramitacao',
    'valor_estimado_condenacao',
    'analise_risco',
    'analise_estrategica',
    'previsao_resultado',
    'analise_jurisprudencial'
  )),

  -- Resultado da análise (estruturado em JSON)
  resultado jsonb NOT NULL,
  --   Exemplos de estrutura:
  --   probabilidade_exito: {"probabilidade": 75, "fatores_positivos": [...], "fatores_negativos": [...]}
  --   tempo_estimado: {"meses": 18, "desvio_padrao": 6, "base_comparacao": "processos_similares"}
  --   valor_estimado: {"valor_minimo": 50000, "valor_medio": 75000, "valor_maximo": 100000}

  -- Confiança e qualidade
  confianca numeric(5,2), -- Score de confiança (0-100)
  qualidade_dados text CHECK (qualidade_dados IN ('alta', 'media', 'baixa')),
  dados_insuficientes boolean DEFAULT false,

  -- Explicação e justificativa
  explicacao text, -- Texto explicativo da análise
  fatores_considerados jsonb, -- Lista de fatores que influenciaram
  limitacoes text, -- Limitações da análise

  -- Modelo e versão
  modelo_ia text, -- Modelo de IA usado (ex: "gpt-4", "claude-3")
  versao_modelo text,
  prompt_utilizado text, -- Prompt enviado para IA

  -- Validade
  gerado_em timestamptz DEFAULT now(),
  valido_ate timestamptz, -- Quando a análise precisa ser recalculada
  invalido boolean DEFAULT false, -- Se foi manualmente marcada como inválida

  -- Metadados
  tempo_processamento_ms integer,
  tokens_utilizados integer,
  custo_estimado numeric(10,4),

  -- Feedback
  feedback_usuario text CHECK (feedback_usuario IN ('util', 'parcial', 'inutil')),
  comentario_feedback text,

  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id)
);

-- Índices
CREATE INDEX idx_processos_analise_processo ON processos_analise_ia(processo_id);
CREATE INDEX idx_processos_analise_escritorio ON processos_analise_ia(escritorio_id);
CREATE INDEX idx_processos_analise_tipo ON processos_analise_ia(tipo_analise);
CREATE INDEX idx_processos_analise_valido ON processos_analise_ia(valido_ate) WHERE invalido = false;
CREATE INDEX idx_processos_analise_confianca ON processos_analise_ia(confianca DESC);

COMMENT ON TABLE processos_analise_ia IS 'Módulo Processos: Análises preditivas e estratégicas geradas por IA';

-- =====================================================
-- TABELA: processos_jurisprudencias
-- =====================================================

CREATE TABLE processos_jurisprudencias (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  processo_id uuid NOT NULL REFERENCES processos_processos(id) ON DELETE CASCADE,
  escritorio_id uuid NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,

  -- Identificação da jurisprudência
  tribunal text NOT NULL, -- Ex: STJ, TST, TJSP, TRT-2
  tipo text CHECK (tipo IN ('acordao', 'sumula', 'tema_repetitivo', 'incidente_rg')),
  numero_acordao text,
  numero_processo text,

  -- Datas
  data_julgamento date,
  data_publicacao date,

  -- Órgão julgador
  orgao_julgador text, -- Ex: "3ª Turma", "Câmara Criminal"
  relator text,

  -- Conteúdo
  ementa text NOT NULL,
  decisao text,
  texto_completo text,

  -- Classificação
  resultado text CHECK (resultado IN ('favoravel', 'desfavoravel', 'parcial', 'neutro')),
  relevancia text DEFAULT 'media' CHECK (relevancia IN ('alta', 'media', 'baixa')),
  similaridade_score numeric(5,2), -- Score de similaridade com o caso (0-100)

  -- Teses
  teses_aplicadas text[], -- Teses jurídicas identificadas
  temas_relacionados text[], -- Temas do CNJ, IRDR, etc

  -- Uso
  aplicada_em_peca boolean DEFAULT false,
  peca_id uuid REFERENCES processos_pecas(id),
  citada_em_analise boolean DEFAULT false,

  -- Links e referências
  link_inteiro_teor text,
  link_consulta text,

  -- Metadados
  tags text[],
  observacoes text,
  metadata jsonb,

  -- Quem adicionou
  fonte text DEFAULT 'manual' CHECK (fonte IN ('manual', 'ia', 'importacao', 'api')),
  adicionado_por uuid REFERENCES profiles(id),

  created_at timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX idx_processos_juris_processo ON processos_jurisprudencias(processo_id);
CREATE INDEX idx_processos_juris_escritorio ON processos_jurisprudencias(escritorio_id);
CREATE INDEX idx_processos_juris_tribunal ON processos_jurisprudencias(tribunal);
CREATE INDEX idx_processos_juris_relevancia ON processos_jurisprudencias(relevancia, similaridade_score);
CREATE INDEX idx_processos_juris_data ON processos_jurisprudencias(data_julgamento DESC);
CREATE INDEX idx_processos_juris_aplicada ON processos_jurisprudencias(aplicada_em_peca) WHERE aplicada_em_peca = true;

-- Full-text search
CREATE INDEX idx_processos_juris_search ON processos_jurisprudencias
  USING gin(to_tsvector('portuguese',
    coalesce(ementa, '') || ' ' ||
    coalesce(decisao, '') || ' ' ||
    coalesce(texto_completo, '')
  ));

COMMENT ON TABLE processos_jurisprudencias IS 'Módulo Processos: Jurisprudências relevantes vinculadas ao processo';

-- =====================================================
-- TABELA: processos_estrategia
-- =====================================================

CREATE TABLE processos_estrategia (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  processo_id uuid NOT NULL REFERENCES processos_processos(id) ON DELETE CASCADE,
  escritorio_id uuid NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,

  -- Resumo estratégico
  resumo_caso text,
  objetivo_principal text,

  -- Análise SWOT
  pontos_fortes jsonb, -- [{descricao: "...", importancia: "alta"}]
  pontos_fracos jsonb,
  oportunidades jsonb,
  ameacas jsonb,

  -- Teses
  teses_principais text[], -- Principais teses a serem defendidas
  teses_subsidiarias text[],
  fundamentos_legais text[], -- Artigos de lei, súmulas, etc

  -- Estratégia processual
  estrategia_texto text, -- Descrição da estratégia
  proximos_passos jsonb, -- [{acao: "...", prazo: "...", responsavel_id: "..."}]

  -- Documentos e provas necessárias
  documentos_necessarios jsonb,
  provas_a_produzir jsonb,

  -- Riscos
  riscos_identificados jsonb, -- [{descricao: "...", probabilidade: "...", impacto: "..."}]
  plano_contingencia text,

  -- Possibilidades de acordo
  possibilidade_acordo boolean,
  parametros_acordo jsonb, -- {valor_minimo: ..., valor_ideal: ..., condicoes: [...]}

  -- Versão e histórico
  versao integer DEFAULT 1,
  versao_anterior_id uuid REFERENCES processos_estrategia(id),
  is_versao_atual boolean DEFAULT true,

  -- Autoria e revisão
  elaborado_por uuid REFERENCES profiles(id),
  revisado_por uuid REFERENCES profiles(id),
  data_revisao timestamptz,
  aprovado boolean DEFAULT false,
  data_aprovacao timestamptz,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX idx_processos_estrategia_processo ON processos_estrategia(processo_id);
CREATE INDEX idx_processos_estrategia_escritorio ON processos_estrategia(escritorio_id);
CREATE INDEX idx_processos_estrategia_versao_atual ON processos_estrategia(processo_id, is_versao_atual)
  WHERE is_versao_atual = true;
CREATE INDEX idx_processos_estrategia_elaborado_por ON processos_estrategia(elaborado_por);

COMMENT ON TABLE processos_estrategia IS 'Módulo Processos: Estratégia processual, análise SWOT e plano de ação';

-- =====================================================
-- TABELA: processos_audiencias
-- =====================================================

CREATE TABLE processos_audiencias (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  processo_id uuid NOT NULL REFERENCES processos_processos(id) ON DELETE CASCADE,
  escritorio_id uuid NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,

  -- Tipo de audiência
  tipo text NOT NULL CHECK (tipo IN (
    'inicial', 'instrucao', 'conciliacao', 'justificacao',
    'julgamento', 'pregao', 'una', 'otra'
  )),

  -- Data e local
  data_hora timestamptz NOT NULL,
  duracao_estimada_minutos integer,
  local_tipo text CHECK (local_tipo IN ('presencial', 'virtual', 'hibrida')),
  endereco text,
  sala text,
  link_videoconferencia text,

  -- Participantes
  juiz text,
  advogados_presentes uuid[], -- IDs dos advogados do escritório
  testemunhas text[],
  peritos text[],

  -- Preparação
  checklist_preparacao jsonb, -- [{item: "Revisar documentos", concluido: true}]
  documentos_levar uuid[], -- IDs de documentos
  pontos_abordar text[],
  estrategia_audiencia text,

  -- Resultado
  realizada boolean DEFAULT false,
  data_realizacao timestamptz,
  resultado text CHECK (resultado IN ('acordo', 'continuacao', 'sentenca', 'arquivamento', 'outro')),
  ata text, -- Ata da audiência
  observacoes_pos text,

  -- Próxima audiência
  proxima_audiencia_id uuid REFERENCES processos_audiencias(id),

  -- Vinculações
  evento_agenda_id uuid, -- FK para agenda_eventos
  peca_pos_audiencia_id uuid REFERENCES processos_pecas(id),

  -- Metadados
  metadata jsonb,

  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id),
  updated_at timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX idx_processos_audiencias_processo ON processos_audiencias(processo_id);
CREATE INDEX idx_processos_audiencias_escritorio ON processos_audiencias(escritorio_id);
CREATE INDEX idx_processos_audiencias_data ON processos_audiencias(data_hora);
CREATE INDEX idx_processos_audiencias_futuras ON processos_audiencias(data_hora)
  WHERE realizada = false AND data_hora > now();
CREATE INDEX idx_processos_audiencias_tipo ON processos_audiencias(tipo);

COMMENT ON TABLE processos_audiencias IS 'Módulo Processos: Audiências (preparação, checklist, resultados)';

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger: Atualizar updated_at
CREATE TRIGGER processos_estrategia_updated_at
  BEFORE UPDATE ON processos_estrategia
  FOR EACH ROW
  EXECUTE FUNCTION update_processos_updated_at();

CREATE TRIGGER processos_audiencias_updated_at
  BEFORE UPDATE ON processos_audiencias
  FOR EACH ROW
  EXECUTE FUNCTION update_processos_updated_at();

-- Trigger: Marcar versões anteriores de estratégia como não atuais
CREATE OR REPLACE FUNCTION atualizar_versao_estrategia()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.versao_anterior_id IS NOT NULL THEN
    UPDATE processos_estrategia
    SET is_versao_atual = false
    WHERE processo_id = NEW.processo_id
      AND id != NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER processos_estrategia_versionamento
  AFTER INSERT ON processos_estrategia
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_versao_estrategia();

-- Trigger: Invalidar análises antigas quando processo muda significativamente
CREATE OR REPLACE FUNCTION invalidar_analises_antigas()
RETURNS TRIGGER AS $$
BEGIN
  -- Se status mudou para transitado, baixado ou acordo, invalidar análises
  IF OLD.status != NEW.status AND NEW.status IN ('transito_julgado', 'baixado', 'acordo') THEN
    UPDATE processos_analise_ia
    SET invalido = true
    WHERE processo_id = NEW.id
      AND tipo_analise IN ('probabilidade_exito', 'tempo_estimado_tramitacao');
  END IF;

  -- Se fase mudou (recurso, execução), invalidar análises de tempo
  IF OLD.fase != NEW.fase THEN
    UPDATE processos_analise_ia
    SET invalido = true
    WHERE processo_id = NEW.id
      AND tipo_analise = 'tempo_estimado_tramitacao';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER processos_invalidar_analises
  AFTER UPDATE OF status, fase ON processos_processos
  FOR EACH ROW
  EXECUTE FUNCTION invalidar_analises_antigas();

-- Trigger: Criar evento na agenda ao criar audiência
CREATE OR REPLACE FUNCTION criar_evento_audiencia()
RETURNS TRIGGER AS $$
DECLARE
  v_evento_id uuid;
  v_processo record;
  v_titulo text;
BEGIN
  -- Buscar dados do processo
  SELECT p.*, c.nome as cliente_nome
  INTO v_processo
  FROM processos_processos p
  JOIN crm_clientes c ON c.id = p.cliente_id
  WHERE p.id = NEW.processo_id;

  -- Criar título do evento
  v_titulo := 'Audiência ' || NEW.tipo || ' - ' || v_processo.numero_cnj;

  -- Inserir evento na agenda
  INSERT INTO agenda_eventos (
    escritorio_id, tipo, titulo, descricao,
    data_inicio, data_fim,
    local, local_tipo, link_videoconferencia,
    responsavel_id, created_by
  ) VALUES (
    NEW.escritorio_id,
    'compromisso',
    v_titulo,
    'Cliente: ' || v_processo.cliente_nome || '\n' ||
    'Processo: ' || v_processo.numero_cnj || '\n' ||
    COALESCE('Local: ' || NEW.endereco, 'Audiência virtual'),
    NEW.data_hora,
    NEW.data_hora + (COALESCE(NEW.duracao_estimada_minutos, 60) || ' minutes')::interval,
    NEW.endereco,
    NEW.local_tipo,
    NEW.link_videoconferencia,
    v_processo.responsavel_id,
    NEW.created_by
  ) RETURNING id INTO v_evento_id;

  -- Atualizar audiência com ID do evento
  UPDATE processos_audiencias
  SET evento_agenda_id = v_evento_id
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER processos_audiencias_criar_evento
  AFTER INSERT ON processos_audiencias
  FOR EACH ROW
  EXECUTE FUNCTION criar_evento_audiencia();
