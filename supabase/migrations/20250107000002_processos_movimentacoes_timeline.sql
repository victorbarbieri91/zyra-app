-- Migration: Processos - Movimentações e Timeline
-- Data: 2025-01-07
-- Descrição: Movimentações processuais, histórico de alterações e auditoria

-- =====================================================
-- TABELA: processos_movimentacoes
-- =====================================================

CREATE TABLE processos_movimentacoes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  processo_id uuid NOT NULL REFERENCES processos_processos(id) ON DELETE CASCADE,
  escritorio_id uuid NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,

  -- Data e tipo
  data_movimento timestamptz NOT NULL,
  tipo_codigo text, -- Código do movimento (ex: "60", "123")
  tipo_descricao text, -- Descrição do tipo (ex: "Sentença", "Despacho")

  -- Conteúdo
  descricao text NOT NULL, -- Descrição curta
  conteudo_completo text, -- Texto completo da movimentação

  -- Origem
  origem text NOT NULL DEFAULT 'manual' CHECK (origem IN ('tribunal', 'manual', 'importacao')),
  fonte_url text, -- URL da fonte (se capturado do tribunal)

  -- Classificação
  importante boolean DEFAULT false,
  tem_prazo boolean DEFAULT false,
  gera_alerta boolean DEFAULT false,

  -- Leitura
  lida boolean DEFAULT false,
  lida_por uuid REFERENCES profiles(id),
  lida_em timestamptz,

  -- Comentários e anotações
  comentarios text,

  -- Anexos
  tem_anexos boolean DEFAULT false,
  anexos_ids uuid[], -- IDs de documentos anexados

  -- Vinculações
  prazo_id uuid, -- FK será criada depois
  tarefa_id uuid, -- FK para agenda_tarefas

  -- Metadados
  metadata jsonb, -- Dados estruturados adicionais
  hash_conteudo text, -- Hash para detectar duplicatas

  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id)
);

-- Índices
CREATE INDEX idx_processos_movimentacoes_processo ON processos_movimentacoes(processo_id);
CREATE INDEX idx_processos_movimentacoes_escritorio ON processos_movimentacoes(escritorio_id);
CREATE INDEX idx_processos_movimentacoes_data ON processos_movimentacoes(data_movimento DESC);
CREATE INDEX idx_processos_movimentacoes_nao_lidas ON processos_movimentacoes(processo_id, lida) WHERE lida = false;
CREATE INDEX idx_processos_movimentacoes_importantes ON processos_movimentacoes(processo_id, importante) WHERE importante = true;
CREATE INDEX idx_processos_movimentacoes_com_prazo ON processos_movimentacoes(tem_prazo, data_movimento) WHERE tem_prazo = true;
CREATE INDEX idx_processos_movimentacoes_hash ON processos_movimentacoes(processo_id, hash_conteudo);

-- Full-text search
CREATE INDEX idx_processos_movimentacoes_search ON processos_movimentacoes
  USING gin(to_tsvector('portuguese', coalesce(descricao, '') || ' ' || coalesce(conteudo_completo, '')));

COMMENT ON TABLE processos_movimentacoes IS 'Módulo Processos: Movimentações processuais capturadas dos tribunais ou inseridas manualmente';

-- =====================================================
-- TABELA: processos_historico (Auditoria)
-- =====================================================

CREATE TABLE processos_historico (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  processo_id uuid NOT NULL REFERENCES processos_processos(id) ON DELETE CASCADE,

  -- Ação realizada
  acao text NOT NULL CHECK (acao IN (
    'criacao', 'edicao', 'arquivamento', 'reativacao',
    'adicao_parte', 'remocao_parte', 'adicao_equipe', 'remocao_equipe',
    'adicao_movimentacao', 'adicao_peca', 'adicao_documento',
    'mudanca_status', 'mudanca_responsavel', 'mudanca_prioridade',
    'adicao_tag', 'remocao_tag', 'outro'
  )),

  -- Detalhes
  descricao text NOT NULL, -- Descrição legível da ação
  campo_alterado text, -- Nome do campo que foi alterado
  valor_anterior text, -- Valor anterior (JSON string)
  valor_novo text, -- Novo valor (JSON string)

  -- Metadados
  metadata jsonb, -- Dados adicionais estruturados

  -- Quem fez
  user_id uuid NOT NULL REFERENCES profiles(id),
  user_nome text, -- Nome do usuário no momento (para histórico)

  -- Quando
  created_at timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX idx_processos_historico_processo ON processos_historico(processo_id, created_at DESC);
CREATE INDEX idx_processos_historico_user ON processos_historico(user_id);
CREATE INDEX idx_processos_historico_acao ON processos_historico(acao);
CREATE INDEX idx_processos_historico_data ON processos_historico(created_at DESC);

COMMENT ON TABLE processos_historico IS 'Módulo Processos: Histórico completo de alterações e auditoria de processos';

-- =====================================================
-- TABELA: processos_prazos
-- =====================================================

CREATE TABLE processos_prazos (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  processo_id uuid NOT NULL REFERENCES processos_processos(id) ON DELETE CASCADE,
  escritorio_id uuid NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,

  -- Tipo de prazo
  tipo text NOT NULL CHECK (tipo IN (
    'recurso', 'manifestacao', 'cumprimento', 'juntada',
    'pagamento', 'contrarrazoes', 'impugnacao', 'memoriais', 'outro'
  )),

  -- Descrição
  descricao text NOT NULL,
  observacoes text,

  -- Datas
  data_intimacao date,
  quantidade_dias integer, -- Quantidade de dias do prazo
  dias_uteis boolean DEFAULT true, -- Se conta apenas dias úteis
  data_limite date NOT NULL, -- Data calculada automaticamente
  data_cumprimento date, -- Data que foi efetivamente cumprido

  -- Status
  status text NOT NULL DEFAULT 'aberto' CHECK (status IN (
    'aberto', 'cumprido', 'perdido', 'prorrogado', 'cancelado'
  )),

  -- Prioridade
  prioridade text DEFAULT 'media' CHECK (prioridade IN ('alta', 'media', 'baixa')),

  -- Responsável
  responsavel_id uuid REFERENCES profiles(id),

  -- Vinculações
  movimentacao_id uuid REFERENCES processos_movimentacoes(id),
  tarefa_id uuid, -- FK para agenda_tarefas
  peca_id uuid, -- FK será criada depois (peça protocolada em cumprimento)

  -- Alertas
  alertas_enviados jsonb, -- [{data: "2024-01-01", tipo: "3_dias", enviado: true}]

  -- Metadados
  metadata jsonb,

  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id),
  updated_at timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX idx_processos_prazos_processo ON processos_prazos(processo_id);
CREATE INDEX idx_processos_prazos_escritorio ON processos_prazos(escritorio_id);
CREATE INDEX idx_processos_prazos_data_limite ON processos_prazos(data_limite);
CREATE INDEX idx_processos_prazos_status_aberto ON processos_prazos(status, data_limite) WHERE status = 'aberto';
CREATE INDEX idx_processos_prazos_responsavel ON processos_prazos(responsavel_id) WHERE status = 'aberto';
CREATE INDEX idx_processos_prazos_movimentacao ON processos_prazos(movimentacao_id) WHERE movimentacao_id IS NOT NULL;

COMMENT ON TABLE processos_prazos IS 'Módulo Processos: Prazos processuais com cálculo automático e alertas';

-- =====================================================
-- FOREIGN KEYS ADICIONAIS
-- =====================================================

-- Adicionar FK de movimentacoes para prazos
ALTER TABLE processos_movimentacoes
  ADD CONSTRAINT fk_movimentacoes_prazo
  FOREIGN KEY (prazo_id) REFERENCES processos_prazos(id) ON DELETE SET NULL;

-- =====================================================
-- FUNCTIONS: Calcular prazo
-- =====================================================

CREATE OR REPLACE FUNCTION calcular_data_prazo(
  p_data_base date,
  p_quantidade_dias integer,
  p_dias_uteis boolean DEFAULT true
)
RETURNS date AS $$
DECLARE
  v_data_resultado date;
  v_dias_adicionados integer := 0;
  v_data_atual date;
BEGIN
  v_data_atual := p_data_base;

  IF NOT p_dias_uteis THEN
    -- Se não conta dias úteis, apenas soma os dias
    RETURN p_data_base + p_quantidade_dias;
  END IF;

  -- Contar apenas dias úteis (segunda a sexta, exceto feriados)
  WHILE v_dias_adicionados < p_quantidade_dias LOOP
    v_data_atual := v_data_atual + 1;

    -- Verificar se é dia útil (seg-sex, não feriado)
    IF EXTRACT(DOW FROM v_data_atual) BETWEEN 1 AND 5 THEN
      -- Verificar se não é feriado
      IF NOT EXISTS (
        SELECT 1 FROM agenda_feriados
        WHERE data = v_data_atual
          AND (abrangencia = 'nacional' OR abrangencia = 'estadual')
      ) THEN
        v_dias_adicionados := v_dias_adicionados + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN v_data_atual;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calcular_data_prazo IS 'Calcula data final de prazo considerando dias úteis e feriados';

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger: Atualizar updated_at em prazos
CREATE TRIGGER processos_prazos_updated_at
  BEFORE UPDATE ON processos_prazos
  FOR EACH ROW
  EXECUTE FUNCTION update_processos_updated_at();

-- Trigger: Calcular data_limite automaticamente
CREATE OR REPLACE FUNCTION auto_calcular_prazo_limite()
RETURNS TRIGGER AS $$
BEGIN
  -- Se data_intimacao e quantidade_dias foram fornecidos, calcular data_limite
  IF NEW.data_intimacao IS NOT NULL AND NEW.quantidade_dias IS NOT NULL THEN
    NEW.data_limite := calcular_data_prazo(
      NEW.data_intimacao,
      NEW.quantidade_dias,
      NEW.dias_uteis
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER processos_prazos_calcular_limite
  BEFORE INSERT OR UPDATE OF data_intimacao, quantidade_dias, dias_uteis ON processos_prazos
  FOR EACH ROW
  EXECUTE FUNCTION auto_calcular_prazo_limite();

-- Trigger: Registrar histórico de mudanças no processo
CREATE OR REPLACE FUNCTION registrar_historico_processo()
RETURNS TRIGGER AS $$
DECLARE
  v_user_nome text;
  v_acao text;
  v_descricao text;
  v_campo text;
  v_valor_anterior text;
  v_valor_novo text;
BEGIN
  -- Buscar nome do usuário atual
  SELECT nome INTO v_user_nome
  FROM profiles
  WHERE id = auth.uid();

  IF TG_OP = 'INSERT' THEN
    v_acao := 'criacao';
    v_descricao := 'Processo criado';

  ELSIF TG_OP = 'UPDATE' THEN
    v_acao := 'edicao';

    -- Detectar qual campo mudou e criar descrição específica
    IF OLD.status != NEW.status THEN
      v_acao := 'mudanca_status';
      v_descricao := 'Status alterado de "' || OLD.status || '" para "' || NEW.status || '"';
      v_campo := 'status';
      v_valor_anterior := OLD.status;
      v_valor_novo := NEW.status;

    ELSIF OLD.responsavel_id != NEW.responsavel_id THEN
      v_acao := 'mudanca_responsavel';
      v_descricao := 'Responsável alterado';
      v_campo := 'responsavel_id';
      v_valor_anterior := OLD.responsavel_id::text;
      v_valor_novo := NEW.responsavel_id::text;

    ELSIF OLD.prioridade != NEW.prioridade THEN
      v_acao := 'mudanca_prioridade';
      v_descricao := 'Prioridade alterada de "' || OLD.prioridade || '" para "' || NEW.prioridade || '"';
      v_campo := 'prioridade';
      v_valor_anterior := OLD.prioridade;
      v_valor_novo := NEW.prioridade;
    ELSE
      v_descricao := 'Processo atualizado';
    END IF;
  END IF;

  -- Inserir no histórico
  INSERT INTO processos_historico (
    processo_id, acao, descricao, campo_alterado,
    valor_anterior, valor_novo, user_id, user_nome
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    v_acao,
    v_descricao,
    v_campo,
    v_valor_anterior,
    v_valor_novo,
    auth.uid(),
    v_user_nome
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER processos_historico_auto
  AFTER INSERT OR UPDATE ON processos_processos
  FOR EACH ROW
  EXECUTE FUNCTION registrar_historico_processo();

-- Trigger: Hash de movimentação para detectar duplicatas
CREATE OR REPLACE FUNCTION gerar_hash_movimentacao()
RETURNS TRIGGER AS $$
BEGIN
  NEW.hash_conteudo := md5(
    NEW.processo_id::text ||
    NEW.data_movimento::text ||
    COALESCE(NEW.tipo_codigo, '') ||
    COALESCE(NEW.descricao, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER processos_movimentacoes_hash
  BEFORE INSERT ON processos_movimentacoes
  FOR EACH ROW
  EXECUTE FUNCTION gerar_hash_movimentacao();

-- Trigger: Notificar equipe sobre nova movimentação
CREATE OR REPLACE FUNCTION notificar_nova_movimentacao()
RETURNS TRIGGER AS $$
DECLARE
  v_membro record;
  v_processo record;
BEGIN
  -- Buscar dados do processo
  SELECT p.*, c.nome as cliente_nome
  INTO v_processo
  FROM processos_processos p
  JOIN crm_clientes c ON c.id = p.cliente_id
  WHERE p.id = NEW.processo_id;

  -- Notificar cada membro da equipe que recebe notificações
  FOR v_membro IN
    SELECT user_id
    FROM processos_equipe
    WHERE processo_id = NEW.processo_id
      AND recebe_notificacoes = true
  LOOP
    INSERT INTO dashboard_notificacoes (
      user_id, tipo, titulo, mensagem, metadata, link
    ) VALUES (
      v_membro.user_id,
      'movimentacao_processo',
      'Nova movimentação - ' || v_processo.numero_cnj,
      NEW.descricao,
      jsonb_build_object(
        'processo_id', NEW.processo_id,
        'movimentacao_id', NEW.id,
        'cliente', v_processo.cliente_nome,
        'tem_prazo', NEW.tem_prazo
      ),
      '/processos/' || NEW.processo_id
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER processos_notificar_movimentacao
  AFTER INSERT ON processos_movimentacoes
  FOR EACH ROW
  WHEN (NEW.origem = 'tribunal')
  EXECUTE FUNCTION notificar_nova_movimentacao();
