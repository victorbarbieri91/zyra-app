-- =====================================================
-- MÓDULO FINANCEIRO - TABELAS PRINCIPAIS
-- =====================================================
-- Migration: Criação das tabelas principais do módulo financeiro
-- - contratos_honorarios
-- - contratos_honorarios_config
-- - honorarios
-- - honorarios_parcelas
-- - despesas
-- - user_escritorios_roles
-- =====================================================

-- Tabela de permissões por escritório
CREATE TABLE IF NOT EXISTS user_escritorios_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  escritorio_id UUID NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'financeiro', 'advogado', 'colaborador')),
  pode_aprovar_horas BOOLEAN DEFAULT false,
  pode_faturar BOOLEAN DEFAULT false,
  pode_ver_relatorios BOOLEAN DEFAULT false,
  pode_editar_financeiro BOOLEAN DEFAULT false,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, escritorio_id)
);

CREATE INDEX idx_user_escritorios_roles_user ON user_escritorios_roles(user_id);
CREATE INDEX idx_user_escritorios_roles_escritorio ON user_escritorios_roles(escritorio_id);
CREATE INDEX idx_user_escritorios_roles_ativo ON user_escritorios_roles(user_id, ativo);

COMMENT ON TABLE user_escritorios_roles IS 'Permissões granulares por usuário e escritório';

-- =====================================================
-- CONTRATOS DE HONORÁRIOS
-- =====================================================

CREATE TABLE IF NOT EXISTS contratos_honorarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id UUID NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,
  numero_contrato TEXT NOT NULL,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  tipo_servico TEXT NOT NULL CHECK (tipo_servico IN ('processo', 'consultoria', 'avulso', 'misto')),
  forma_cobranca TEXT NOT NULL CHECK (forma_cobranca IN ('fixo', 'por_hora', 'por_etapa', 'misto')),
  ativo BOOLEAN DEFAULT true,
  data_inicio DATE NOT NULL,
  data_fim DATE,
  arquivo_contrato_url TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(escritorio_id, numero_contrato)
);

CREATE INDEX idx_contratos_honorarios_escritorio ON contratos_honorarios(escritorio_id);
CREATE INDEX idx_contratos_honorarios_cliente ON contratos_honorarios(escritorio_id, cliente_id);
CREATE INDEX idx_contratos_honorarios_ativo ON contratos_honorarios(escritorio_id, ativo);

COMMENT ON TABLE contratos_honorarios IS 'Contratos de honorários com clientes';
COMMENT ON COLUMN contratos_honorarios.numero_contrato IS 'Número único por escritório (ex: CONT-2025-001)';

-- =====================================================
-- CONFIGURAÇÃO DE CONTRATOS
-- =====================================================

CREATE TABLE IF NOT EXISTS contratos_honorarios_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id UUID NOT NULL REFERENCES contratos_honorarios(id) ON DELETE CASCADE,
  tipo_config TEXT NOT NULL CHECK (tipo_config IN ('fixo', 'hora', 'etapa', 'exito')),

  -- Para FIXO
  valor_fixo NUMERIC(15,2),

  -- Para POR HORA
  valor_hora NUMERIC(15,2),
  horas_estimadas NUMERIC(8,2),

  -- Para POR ETAPA (jsonb com valores por etapa)
  etapas_valores JSONB,
  -- Exemplo: {"inicial": 5000, "sentenca": 3000, "recurso": 4000, "exito": 10000}

  -- Para ÊXITO
  percentual_exito NUMERIC(5,2),
  valor_minimo_exito NUMERIC(15,2),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contratos_config_contrato ON contratos_honorarios_config(contrato_id);

COMMENT ON TABLE contratos_honorarios_config IS 'Configuração de valores por tipo de cobrança';

-- =====================================================
-- HONORÁRIOS (LANÇAMENTOS)
-- =====================================================

CREATE TABLE IF NOT EXISTS honorarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id UUID NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,
  numero_interno TEXT NOT NULL,
  contrato_id UUID REFERENCES contratos_honorarios(id) ON DELETE SET NULL,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  processo_id UUID REFERENCES processos(id) ON DELETE CASCADE,
  consulta_id UUID REFERENCES consultas(id) ON DELETE CASCADE,
  tipo_lancamento TEXT NOT NULL CHECK (tipo_lancamento IN ('fixo', 'etapa', 'hora', 'exito', 'avulso')),
  etapa_processual TEXT CHECK (etapa_processual IN ('inicial', 'sentenca', 'recurso', 'exito')),
  descricao TEXT NOT NULL,
  valor_total NUMERIC(15,2) NOT NULL,
  referencia_horas NUMERIC(8,2),
  parcelado BOOLEAN DEFAULT false,
  numero_parcelas INTEGER,
  responsavel_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  data_competencia DATE NOT NULL,
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  observacoes TEXT,
  status TEXT NOT NULL DEFAULT 'proposta' CHECK (status IN ('proposta', 'aprovado', 'em_aberto', 'pago', 'cancelado')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(escritorio_id, numero_interno),
  CHECK (valor_total > 0),
  CHECK (parcelado = false OR numero_parcelas > 0)
);

CREATE INDEX idx_honorarios_escritorio ON honorarios(escritorio_id);
CREATE INDEX idx_honorarios_cliente ON honorarios(escritorio_id, cliente_id);
CREATE INDEX idx_honorarios_status ON honorarios(escritorio_id, status);
CREATE INDEX idx_honorarios_data_emissao ON honorarios(escritorio_id, data_emissao);
CREATE INDEX idx_honorarios_processo ON honorarios(processo_id) WHERE processo_id IS NOT NULL;
CREATE INDEX idx_honorarios_consulta ON honorarios(consulta_id) WHERE consulta_id IS NOT NULL;

COMMENT ON TABLE honorarios IS 'Lançamentos de honorários gerados a partir dos contratos';
COMMENT ON COLUMN honorarios.numero_interno IS 'Número único por escritório (ex: HON-2025-001)';

-- =====================================================
-- PARCELAS DE HONORÁRIOS
-- =====================================================

CREATE TABLE IF NOT EXISTS honorarios_parcelas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  honorario_id UUID NOT NULL REFERENCES honorarios(id) ON DELETE CASCADE,
  numero_parcela INTEGER NOT NULL,
  valor NUMERIC(15,2) NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  valor_pago NUMERIC(15,2),
  forma_pagamento TEXT CHECK (forma_pagamento IN ('boleto', 'pix', 'cartao', 'transferencia', 'dinheiro', 'cheque')),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'atrasado', 'cancelado')),
  boleto_url TEXT,
  pix_qrcode TEXT,
  dias_atraso INTEGER,
  juros_aplicados NUMERIC(15,2),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CHECK (valor > 0),
  CHECK (valor_pago IS NULL OR valor_pago > 0)
);

CREATE INDEX idx_honorarios_parcelas_honorario ON honorarios_parcelas(honorario_id);
CREATE INDEX idx_honorarios_parcelas_vencimento ON honorarios_parcelas(data_vencimento);
CREATE INDEX idx_honorarios_parcelas_status ON honorarios_parcelas(status);

COMMENT ON TABLE honorarios_parcelas IS 'Parcelas dos honorários para controle de recebimentos';

-- =====================================================
-- DESPESAS
-- =====================================================

CREATE TABLE IF NOT EXISTS despesas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id UUID NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL CHECK (categoria IN (
    'custas', 'fornecedor', 'folha', 'impostos', 'aluguel',
    'marketing', 'capacitacao', 'material', 'tecnologia', 'outras'
  )),
  fornecedor TEXT NOT NULL,
  descricao TEXT NOT NULL,
  valor NUMERIC(15,2) NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  recorrente BOOLEAN DEFAULT false,
  frequencia TEXT CHECK (frequencia IN ('mensal', 'trimestral', 'anual')),
  processo_id UUID REFERENCES processos(id) ON DELETE CASCADE,
  centro_custo TEXT,
  documento_fiscal TEXT,
  forma_pagamento TEXT CHECK (forma_pagamento IN ('boleto', 'pix', 'cartao', 'transferencia', 'dinheiro', 'cheque')),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'cancelado')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CHECK (valor > 0),
  CHECK (recorrente = false OR frequencia IS NOT NULL)
);

CREATE INDEX idx_despesas_escritorio ON despesas(escritorio_id);
CREATE INDEX idx_despesas_categoria ON despesas(escritorio_id, categoria);
CREATE INDEX idx_despesas_vencimento ON despesas(escritorio_id, data_vencimento);
CREATE INDEX idx_despesas_status ON despesas(escritorio_id, status);
CREATE INDEX idx_despesas_processo ON despesas(processo_id) WHERE processo_id IS NOT NULL;
CREATE INDEX idx_despesas_recorrente ON despesas(escritorio_id, recorrente) WHERE recorrente = true;

COMMENT ON TABLE despesas IS 'Despesas do escritório (contas a pagar)';

-- =====================================================
-- TRIGGERS PARA UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_contratos_honorarios_updated_at
  BEFORE UPDATE ON contratos_honorarios
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_honorarios_updated_at
  BEFORE UPDATE ON honorarios
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_despesas_updated_at
  BEFORE UPDATE ON despesas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_escritorios_roles_updated_at
  BEFORE UPDATE ON user_escritorios_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
