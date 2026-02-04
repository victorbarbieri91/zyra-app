-- =====================================================
-- MÓDULO FINANCEIRO - TIMESHEET E FATURAMENTO
-- =====================================================
-- Migration: Timesheet, Faturas e Agendamento
-- - timesheet
-- - faturas
-- - faturas_itens
-- - faturamento_agendado_config
-- - faturamento_agendado_log
-- - processos_etapas_faturadas
-- =====================================================

-- =====================================================
-- TIMESHEET (APONTAMENTO DE HORAS)
-- =====================================================

CREATE TABLE IF NOT EXISTS timesheet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id UUID NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  processo_id UUID REFERENCES processos(id) ON DELETE CASCADE,
  consulta_id UUID REFERENCES consultas(id) ON DELETE CASCADE,
  data_trabalho DATE NOT NULL,
  horas NUMERIC(8,2) NOT NULL,
  atividade TEXT NOT NULL,
  faturavel BOOLEAN DEFAULT true,
  faturado BOOLEAN DEFAULT false,
  fatura_id UUID, -- FK será adicionada após criar tabela faturas
  aprovado BOOLEAN DEFAULT false,
  aprovado_por UUID REFERENCES profiles(id) ON DELETE SET NULL,
  aprovado_em TIMESTAMPTZ,
  reprovado BOOLEAN DEFAULT false,
  justificativa_reprovacao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CHECK (horas > 0),
  CHECK (processo_id IS NOT NULL OR consulta_id IS NOT NULL),
  CHECK (NOT (aprovado AND reprovado))
);

CREATE INDEX idx_timesheet_escritorio ON timesheet(escritorio_id);
CREATE INDEX idx_timesheet_user ON timesheet(escritorio_id, user_id, data_trabalho);
CREATE INDEX idx_timesheet_aprovacao ON timesheet(escritorio_id, aprovado, faturado);
CREATE INDEX idx_timesheet_processo ON timesheet(processo_id) WHERE processo_id IS NOT NULL;
CREATE INDEX idx_timesheet_consulta ON timesheet(consulta_id) WHERE consulta_id IS NOT NULL;
CREATE INDEX idx_timesheet_fatura ON timesheet(fatura_id) WHERE fatura_id IS NOT NULL;

COMMENT ON TABLE timesheet IS 'Apontamento de horas trabalhadas em processos e consultas';

-- =====================================================
-- FATURAS
-- =====================================================

CREATE TABLE IF NOT EXISTS faturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id UUID NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,
  numero_fatura TEXT NOT NULL,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  data_vencimento DATE NOT NULL,
  valor_total NUMERIC(15,2) NOT NULL,
  descricao TEXT,
  observacoes TEXT,
  forma_pagamento_preferencial TEXT CHECK (forma_pagamento_preferencial IN ('boleto', 'pix', 'cartao', 'transferencia')),
  parcelado BOOLEAN DEFAULT false,
  numero_parcelas INTEGER,
  pdf_url TEXT,
  status TEXT NOT NULL DEFAULT 'emitida' CHECK (status IN ('emitida', 'enviada', 'paga', 'atrasada', 'cancelada')),
  enviada_em TIMESTAMPTZ,
  paga_em TIMESTAMPTZ,
  cancelada_em TIMESTAMPTZ,
  cancelada_por UUID REFERENCES profiles(id) ON DELETE SET NULL,
  motivo_cancelamento TEXT,
  gerada_automaticamente BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(escritorio_id, numero_fatura),
  CHECK (valor_total > 0),
  CHECK (parcelado = false OR numero_parcelas > 0)
);

CREATE INDEX idx_faturas_escritorio ON faturas(escritorio_id);
CREATE INDEX idx_faturas_cliente ON faturas(escritorio_id, cliente_id);
CREATE INDEX idx_faturas_status ON faturas(escritorio_id, status);
CREATE INDEX idx_faturas_vencimento ON faturas(escritorio_id, data_vencimento);
CREATE INDEX idx_faturas_emissao ON faturas(escritorio_id, data_emissao);

COMMENT ON TABLE faturas IS 'Faturas consolidadas geradas para clientes';
COMMENT ON COLUMN faturas.numero_fatura IS 'Número único por escritório (ex: FAT-2025-001)';

-- Agora adicionar FK de timesheet para faturas
ALTER TABLE timesheet
  ADD CONSTRAINT fk_timesheet_fatura
  FOREIGN KEY (fatura_id) REFERENCES faturas(id) ON DELETE SET NULL;

-- =====================================================
-- ITENS DAS FATURAS
-- =====================================================

CREATE TABLE IF NOT EXISTS faturas_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fatura_id UUID NOT NULL REFERENCES faturas(id) ON DELETE CASCADE,
  tipo_item TEXT NOT NULL CHECK (tipo_item IN ('hora', 'etapa', 'fixo', 'avulso')),
  descricao TEXT NOT NULL,
  processo_id UUID REFERENCES processos(id) ON DELETE CASCADE,
  consulta_id UUID REFERENCES consultas(id) ON DELETE CASCADE,
  quantidade NUMERIC(8,2),
  valor_unitario NUMERIC(15,2),
  valor_total NUMERIC(15,2) NOT NULL,
  data_competencia DATE NOT NULL,
  timesheet_ids JSONB, -- Array de IDs de timesheet incluídos
  honorario_id UUID REFERENCES honorarios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CHECK (valor_total > 0)
);

CREATE INDEX idx_faturas_itens_fatura ON faturas_itens(fatura_id);
CREATE INDEX idx_faturas_itens_tipo ON faturas_itens(fatura_id, tipo_item);

COMMENT ON TABLE faturas_itens IS 'Itens/lançamentos incluídos em cada fatura';

-- =====================================================
-- CONFIGURAÇÃO DE FATURAMENTO AGENDADO
-- =====================================================

CREATE TABLE IF NOT EXISTS faturamento_agendado_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id UUID NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
  ativo BOOLEAN DEFAULT true,
  dia_faturamento INTEGER NOT NULL CHECK (dia_faturamento >= 1 AND dia_faturamento <= 31),
  tipos_lancamento JSONB NOT NULL DEFAULT '["hora", "fixo", "etapa", "avulso"]'::jsonb,
  dias_vencimento INTEGER NOT NULL DEFAULT 30,
  envio_automatico_email BOOLEAN DEFAULT true,
  observacoes_padrao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CHECK (dias_vencimento > 0)
);

CREATE INDEX idx_faturamento_config_escritorio ON faturamento_agendado_config(escritorio_id);
CREATE INDEX idx_faturamento_config_ativo ON faturamento_agendado_config(escritorio_id, ativo, dia_faturamento) WHERE ativo = true;

COMMENT ON TABLE faturamento_agendado_config IS 'Configuração de faturamento automático por cliente';
COMMENT ON COLUMN faturamento_agendado_config.cliente_id IS 'Se NULL, aplica-se a todos os clientes do escritório';

-- =====================================================
-- LOG DE FATURAMENTO AGENDADO
-- =====================================================

CREATE TABLE IF NOT EXISTS faturamento_agendado_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id UUID NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,
  data_execucao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  clientes_processados INTEGER NOT NULL DEFAULT 0,
  faturas_geradas INTEGER NOT NULL DEFAULT 0,
  valor_total_faturado NUMERIC(15,2) NOT NULL DEFAULT 0,
  erros JSONB,
  detalhes JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_faturamento_log_escritorio ON faturamento_agendado_log(escritorio_id, data_execucao DESC);

COMMENT ON TABLE faturamento_agendado_log IS 'Log de execuções do faturamento automático';

-- =====================================================
-- CONTROLE DE ETAPAS PROCESSUAIS FATURADAS
-- =====================================================

CREATE TABLE IF NOT EXISTS processos_etapas_faturadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id UUID NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
  etapa TEXT NOT NULL CHECK (etapa IN ('inicial', 'sentenca', 'recurso', 'exito')),
  honorario_id UUID NOT NULL REFERENCES honorarios(id) ON DELETE CASCADE,
  data_lancamento TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lancado_por UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  UNIQUE(processo_id, etapa)
);

CREATE INDEX idx_etapas_faturadas_processo ON processos_etapas_faturadas(processo_id);

COMMENT ON TABLE processos_etapas_faturadas IS 'Controle de etapas processuais já faturadas';

-- =====================================================
-- TRIGGERS PARA UPDATED_AT
-- =====================================================

CREATE TRIGGER update_timesheet_updated_at
  BEFORE UPDATE ON timesheet
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_faturas_updated_at
  BEFORE UPDATE ON faturas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_faturamento_config_updated_at
  BEFORE UPDATE ON faturamento_agendado_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
