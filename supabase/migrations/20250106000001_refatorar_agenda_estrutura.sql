-- Migration: Refatorar estrutura de Agenda
-- Objetivo: Separar Eventos, Tarefas e Audiências em 3 entidades independentes
-- Data: 2025-01-06

-- =====================================================
-- PARTE 1: Refatorar agenda_eventos (apenas compromissos)
-- =====================================================

-- Remover constraint antiga de tipo
ALTER TABLE agenda_eventos
  DROP CONSTRAINT IF EXISTS eventos_tipo_check;

-- Adicionar nova constraint (apenas 'compromisso')
ALTER TABLE agenda_eventos
  ADD CONSTRAINT eventos_tipo_check
  CHECK (tipo = 'compromisso');

-- Adicionar campos que faltam se não existirem
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agenda_eventos' AND column_name='recorrencia_id') THEN
    ALTER TABLE agenda_eventos ADD COLUMN recorrencia_id uuid;
  END IF;
END $$;

-- =====================================================
-- PARTE 2: Criar agenda_tarefas (ENTIDADE PRINCIPAL)
-- =====================================================

CREATE TABLE IF NOT EXISTS agenda_tarefas (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  escritorio_id uuid NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,

  -- Básico
  titulo text NOT NULL,
  descricao text,

  -- Tipo de tarefa
  tipo text NOT NULL DEFAULT 'outro' CHECK (tipo IN (
    'prazo_processual',    -- Prazo de processo com cálculo
    'acompanhamento',      -- Acompanhar processo/cliente
    'follow_up',           -- Follow-up com cliente
    'administrativo',      -- Tarefa administrativa
    'outro'                -- Outros tipos
  )),

  -- Prioridade e Status
  prioridade text DEFAULT 'media' CHECK (prioridade IN ('alta', 'media', 'baixa')),
  status text DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluida', 'cancelada')),

  -- Datas
  data_inicio timestamptz NOT NULL,
  data_fim timestamptz,
  data_conclusao timestamptz,

  -- Progresso (calculado automaticamente via checklist)
  progresso_percentual integer DEFAULT 0 CHECK (progresso_percentual BETWEEN 0 AND 100),

  -- Subtarefas (hierarquia)
  parent_id uuid REFERENCES agenda_tarefas(id) ON DELETE CASCADE,

  -- Pessoas
  responsavel_id uuid REFERENCES profiles(id),
  criado_por uuid REFERENCES profiles(id),

  -- Campos específicos para PRAZO PROCESSUAL
  prazo_data_intimacao date,
  prazo_quantidade_dias integer,
  prazo_dias_uteis boolean DEFAULT true,
  prazo_data_limite date, -- Calculado automaticamente
  prazo_tipo text CHECK (prazo_tipo IN ('recurso', 'manifestacao', 'cumprimento', 'juntada', 'pagamento', 'outro')),
  prazo_cumprido boolean DEFAULT false,
  prazo_perdido boolean DEFAULT false,

  -- Recorrência
  recorrencia_id uuid, -- FK será adicionada depois que criar agenda_recorrencias

  -- Metadados
  observacoes text,
  cor text, -- Cor personalizada no calendário
  tags text[],

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_tarefas_escritorio ON agenda_tarefas(escritorio_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_responsavel ON agenda_tarefas(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_criado_por ON agenda_tarefas(criado_por);
CREATE INDEX IF NOT EXISTS idx_tarefas_data_inicio ON agenda_tarefas(data_inicio);
CREATE INDEX IF NOT EXISTS idx_tarefas_status_pendente ON agenda_tarefas(status) WHERE status IN ('pendente', 'em_andamento');
CREATE INDEX IF NOT EXISTS idx_tarefas_prioridade ON agenda_tarefas(prioridade, data_inicio) WHERE status != 'concluida';
CREATE INDEX IF NOT EXISTS idx_tarefas_parent ON agenda_tarefas(parent_id) WHERE parent_id IS NOT NULL;

-- Comentário
COMMENT ON TABLE agenda_tarefas IS 'Módulo Agenda: Tarefas (prazo processual, acompanhamento, follow-up, etc)';

-- =====================================================
-- PARTE 3: Criar agenda_audiencias (ENTIDADE ESPECÍFICA)
-- =====================================================

CREATE TABLE IF NOT EXISTS agenda_audiencias (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  escritorio_id uuid NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,
  processo_id uuid NOT NULL REFERENCES processos(id) ON DELETE CASCADE, -- OBRIGATÓRIO

  -- Básico
  titulo text NOT NULL,
  descricao text,

  -- Data e Duração
  data_hora timestamptz NOT NULL,
  duracao_minutos integer DEFAULT 60,

  -- Tipo e Modalidade
  tipo_audiencia text NOT NULL CHECK (tipo_audiencia IN (
    'inicial', 'instrucao', 'conciliacao', 'julgamento', 'una', 'outra'
  )),
  modalidade text NOT NULL CHECK (modalidade IN ('presencial', 'virtual')),

  -- Localização (se presencial)
  tribunal text,
  comarca text,
  vara text,
  forum text,
  sala text,
  endereco text,

  -- Virtual (se virtual)
  link_virtual text,
  plataforma text, -- Ex: Zoom, Teams, PJe

  -- Pessoas Envolvidas
  juiz text,
  promotor text,
  advogado_contrario text,
  responsavel_id uuid REFERENCES profiles(id),
  criado_por uuid REFERENCES profiles(id),

  -- Status
  status text DEFAULT 'agendada' CHECK (status IN (
    'agendada', 'realizada', 'cancelada', 'adiada', 'remarcada'
  )),

  -- Resultado (após realização)
  resultado_tipo text CHECK (resultado_tipo IN ('acordo', 'sentenca', 'adiamento', 'outro')),
  resultado_descricao text,
  proxima_audiencia_id uuid REFERENCES agenda_audiencias(id), -- Se foi remarcada

  -- Preparação
  preparativos_checklist jsonb, -- Lista de preparação

  -- Metadados
  observacoes text,
  cor text,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_audiencias_escritorio ON agenda_audiencias(escritorio_id);
CREATE INDEX IF NOT EXISTS idx_audiencias_processo ON agenda_audiencias(processo_id);
CREATE INDEX IF NOT EXISTS idx_audiencias_responsavel ON agenda_audiencias(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_audiencias_criado_por ON agenda_audiencias(criado_por);
CREATE INDEX IF NOT EXISTS idx_audiencias_data ON agenda_audiencias(data_hora);
CREATE INDEX IF NOT EXISTS idx_audiencias_status_agendada ON agenda_audiencias(status) WHERE status = 'agendada';

-- Comentário
COMMENT ON TABLE agenda_audiencias IS 'Módulo Agenda: Audiências judiciais (sempre vinculadas a processo)';

-- =====================================================
-- PARTE 4: Criar agenda_tarefas_checklist
-- =====================================================

CREATE TABLE IF NOT EXISTS agenda_tarefas_checklist (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tarefa_id uuid NOT NULL REFERENCES agenda_tarefas(id) ON DELETE CASCADE,

  item text NOT NULL,
  concluido boolean DEFAULT false,
  ordem integer NOT NULL, -- Para ordenação

  concluido_em timestamptz,
  concluido_por uuid REFERENCES profiles(id),

  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_checklist_tarefa ON agenda_tarefas_checklist(tarefa_id, ordem);
CREATE INDEX IF NOT EXISTS idx_checklist_concluido ON agenda_tarefas_checklist(tarefa_id, concluido);

COMMENT ON TABLE agenda_tarefas_checklist IS 'Módulo Agenda: Checklist de tarefas';

-- =====================================================
-- PARTE 5: Criar agenda_recorrencias
-- =====================================================

CREATE TABLE IF NOT EXISTS agenda_recorrencias (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  escritorio_id uuid NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,

  -- Template
  template_nome text NOT NULL, -- Ex: "Relatório Mensal aos Clientes"
  template_descricao text,
  entidade_tipo text NOT NULL CHECK (entidade_tipo IN ('tarefa', 'evento')), -- Audiência não faz sentido recorrer
  template_dados jsonb NOT NULL, -- Estrutura completa da tarefa/evento a ser criada

  -- Regras de Recorrência (Interface simples)
  regra_frequencia text NOT NULL CHECK (regra_frequencia IN ('diaria', 'semanal', 'mensal', 'anual')),
  regra_intervalo integer DEFAULT 1, -- A cada X (dias/semanas/meses/anos)
  regra_dia_mes integer CHECK (regra_dia_mes BETWEEN 1 AND 31), -- Para mensal: dia do mês
  regra_dias_semana integer[], -- Para semanal: [0,1,2,3,4,5,6] onde 0=domingo
  regra_mes integer CHECK (regra_mes BETWEEN 1 AND 12), -- Para anual: mês
  regra_hora time DEFAULT '09:00', -- Hora padrão de criação

  -- Controle
  ativo boolean DEFAULT true,
  data_inicio date NOT NULL,
  data_fim date, -- Opcional - se null, nunca expira
  proxima_execucao date,
  ultima_execucao date,
  total_criados integer DEFAULT 0, -- Contador

  criado_por uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recorrencias_escritorio ON agenda_recorrencias(escritorio_id);
CREATE INDEX IF NOT EXISTS idx_recorrencias_proxima ON agenda_recorrencias(proxima_execucao, ativo) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_recorrencias_entidade_tipo ON agenda_recorrencias(entidade_tipo, ativo);

COMMENT ON TABLE agenda_recorrencias IS 'Módulo Agenda: Templates de recorrência para tarefas e eventos';

-- Agora adicionar FK de recorrencia nas tabelas
ALTER TABLE agenda_tarefas
  ADD CONSTRAINT fk_tarefas_recorrencia
  FOREIGN KEY (recorrencia_id) REFERENCES agenda_recorrencias(id) ON DELETE SET NULL;

ALTER TABLE agenda_eventos
  ADD CONSTRAINT fk_eventos_recorrencia
  FOREIGN KEY (recorrencia_id) REFERENCES agenda_recorrencias(id) ON DELETE SET NULL;

-- =====================================================
-- PARTE 6: Criar agenda_vinculacoes
-- =====================================================

CREATE TABLE IF NOT EXISTS agenda_vinculacoes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  escritorio_id uuid NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,

  -- Entidade de origem (o que está sendo vinculado)
  entidade_tipo text NOT NULL CHECK (entidade_tipo IN ('tarefa', 'evento', 'audiencia')),
  entidade_id uuid NOT NULL,

  -- Módulo de destino (onde está vinculando)
  modulo text NOT NULL CHECK (modulo IN ('processo', 'consultivo', 'crm', 'financeiro')),
  modulo_registro_id uuid NOT NULL,

  -- Cache de metadados para exibição rápida (evita JOINs)
  metadados jsonb, -- Ex: {numero_processo: '123', nome_cliente: 'João Silva'}

  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vinculacoes_entidade ON agenda_vinculacoes(entidade_tipo, entidade_id);
CREATE INDEX IF NOT EXISTS idx_vinculacoes_modulo ON agenda_vinculacoes(modulo, modulo_registro_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_vinculacoes_unique ON agenda_vinculacoes(entidade_tipo, entidade_id, modulo, modulo_registro_id);

COMMENT ON TABLE agenda_vinculacoes IS 'Módulo Agenda: Vinculações polimórficas com outros módulos (processo, CRM, consultivo, financeiro)';

-- =====================================================
-- PARTE 7: Criar agenda_lembretes
-- =====================================================

CREATE TABLE IF NOT EXISTS agenda_lembretes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  escritorio_id uuid NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,

  -- Entidade vinculada
  entidade_tipo text NOT NULL CHECK (entidade_tipo IN ('tarefa', 'evento', 'audiencia')),
  entidade_id uuid NOT NULL,

  -- Configuração
  user_id uuid REFERENCES profiles(id),
  tempo_antes_minutos integer NOT NULL, -- Ex: 15, 60, 1440 (1 dia), 10080 (1 semana)
  metodos text[] DEFAULT ARRAY['push'], -- ['push', 'email', 'sms']

  -- Controle de envio
  enviado boolean DEFAULT false,
  enviado_em timestamptz,
  erro_envio text,

  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lembretes_entidade ON agenda_lembretes(entidade_tipo, entidade_id);
CREATE INDEX IF NOT EXISTS idx_lembretes_user ON agenda_lembretes(user_id);
CREATE INDEX IF NOT EXISTS idx_lembretes_pendentes ON agenda_lembretes(enviado, entidade_tipo) WHERE enviado = false;

COMMENT ON TABLE agenda_lembretes IS 'Módulo Agenda: Sistema de lembretes/notificações multi-canal';

-- =====================================================
-- PARTE 8: Criar tabela de feriados (se não existir)
-- =====================================================

CREATE TABLE IF NOT EXISTS agenda_feriados (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  escritorio_id uuid REFERENCES escritorios(id) ON DELETE CASCADE, -- null = feriado nacional

  data date NOT NULL,
  nome text NOT NULL,
  tipo text DEFAULT 'nacional' CHECK (tipo IN ('nacional', 'estadual', 'municipal', 'forense')),
  recorrente boolean DEFAULT false, -- Se repete todo ano

  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feriados_data ON agenda_feriados(data);
CREATE INDEX IF NOT EXISTS idx_feriados_escritorio ON agenda_feriados(escritorio_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_feriados_unique ON agenda_feriados(data, COALESCE(escritorio_id, '00000000-0000-0000-0000-000000000000'::uuid));

COMMENT ON TABLE agenda_feriados IS 'Módulo Agenda: Feriados nacionais, estaduais e forenses';
