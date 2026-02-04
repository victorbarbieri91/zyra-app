-- =====================================================
-- MÓDULO FINANCEIRO - CONTAS BANCÁRIAS E AUXILIARES
-- =====================================================
-- Migration: Contas bancárias, pagamentos e tabelas auxiliares
-- - contas_bancarias
-- - conta_bancaria_lancamentos
-- - pagamentos
-- - comissoes
-- - metas_financeiras
-- - cobrancas_enviadas
-- - provisoes
-- - conciliacoes_bancarias
-- - lancamentos_bancarios
-- - contratos_recorrentes
-- =====================================================

-- =====================================================
-- CONTAS BANCÁRIAS
-- =====================================================

CREATE TABLE IF NOT EXISTS contas_bancarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id UUID NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,
  banco TEXT NOT NULL,
  tipo_conta TEXT NOT NULL CHECK (tipo_conta IN ('corrente', 'poupanca', 'investimento')),
  agencia TEXT NOT NULL,
  numero_conta TEXT NOT NULL,
  saldo_atual NUMERIC(15,2) NOT NULL DEFAULT 0,
  saldo_inicial NUMERIC(15,2) NOT NULL DEFAULT 0,
  data_abertura DATE NOT NULL,
  conta_principal BOOLEAN DEFAULT false,
  ativa BOOLEAN DEFAULT true,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(escritorio_id, banco, agencia, numero_conta)
);

CREATE INDEX idx_contas_bancarias_escritorio ON contas_bancarias(escritorio_id);
CREATE INDEX idx_contas_bancarias_ativa ON contas_bancarias(escritorio_id, ativa);
CREATE INDEX idx_contas_bancarias_principal ON contas_bancarias(escritorio_id, conta_principal) WHERE conta_principal = true;

COMMENT ON TABLE contas_bancarias IS 'Contas bancárias do escritório';
COMMENT ON COLUMN contas_bancarias.conta_principal IS 'Apenas uma conta pode ser principal por escritório';

-- =====================================================
-- LANÇAMENTOS DE CONTAS BANCÁRIAS (EXTRATO VIRTUAL)
-- =====================================================

CREATE TABLE IF NOT EXISTS conta_bancaria_lancamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_bancaria_id UUID NOT NULL REFERENCES contas_bancarias(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida', 'transferencia_entrada', 'transferencia_saida')),
  valor NUMERIC(15,2) NOT NULL,
  data_lancamento DATE NOT NULL,
  descricao TEXT NOT NULL,
  categoria TEXT,
  saldo_apos_lancamento NUMERIC(15,2) NOT NULL,
  origem_tipo TEXT NOT NULL CHECK (origem_tipo IN ('pagamento', 'despesa', 'transferencia', 'manual')),
  origem_id UUID,
  transferencia_id UUID,
  comprovante_url TEXT,
  conciliado BOOLEAN DEFAULT false,
  conciliado_em TIMESTAMPTZ,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CHECK (valor > 0)
);

CREATE INDEX idx_conta_lancamentos_conta ON conta_bancaria_lancamentos(conta_bancaria_id, data_lancamento DESC);
CREATE INDEX idx_conta_lancamentos_tipo ON conta_bancaria_lancamentos(conta_bancaria_id, tipo);
CREATE INDEX idx_conta_lancamentos_conciliado ON conta_bancaria_lancamentos(conta_bancaria_id, conciliado);
CREATE INDEX idx_conta_lancamentos_transferencia ON conta_bancaria_lancamentos(transferencia_id) WHERE transferencia_id IS NOT NULL;

COMMENT ON TABLE conta_bancaria_lancamentos IS 'Extrato virtual da conta baseado em lançamentos do sistema';

-- =====================================================
-- PAGAMENTOS
-- =====================================================

CREATE TABLE IF NOT EXISTS pagamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id UUID NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,
  conta_bancaria_id UUID REFERENCES contas_bancarias(id) ON DELETE SET NULL,
  parcela_id UUID REFERENCES honorarios_parcelas(id) ON DELETE CASCADE,
  despesa_id UUID REFERENCES despesas(id) ON DELETE CASCADE,
  tipo_lancamento TEXT NOT NULL CHECK (tipo_lancamento IN ('receita', 'despesa')),
  valor NUMERIC(15,2) NOT NULL,
  data_pagamento TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  forma_pagamento TEXT NOT NULL CHECK (forma_pagamento IN ('boleto', 'pix', 'cartao', 'transferencia', 'dinheiro', 'cheque')),
  comprovante_url TEXT,
  conciliado BOOLEAN DEFAULT false,
  conciliado_em TIMESTAMPTZ,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CHECK (valor > 0),
  CHECK (parcela_id IS NOT NULL OR despesa_id IS NOT NULL)
);

CREATE INDEX idx_pagamentos_escritorio ON pagamentos(escritorio_id);
CREATE INDEX idx_pagamentos_conta ON pagamentos(escritorio_id, conta_bancaria_id);
CREATE INDEX idx_pagamentos_data ON pagamentos(escritorio_id, data_pagamento);
CREATE INDEX idx_pagamentos_parcela ON pagamentos(parcela_id) WHERE parcela_id IS NOT NULL;
CREATE INDEX idx_pagamentos_despesa ON pagamentos(despesa_id) WHERE despesa_id IS NOT NULL;

COMMENT ON TABLE pagamentos IS 'Registro de pagamentos (receitas e despesas)';

-- =====================================================
-- COMISSÕES
-- =====================================================

CREATE TABLE IF NOT EXISTS comissoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  honorario_id UUID NOT NULL REFERENCES honorarios(id) ON DELETE CASCADE,
  beneficiario_tipo TEXT NOT NULL CHECK (beneficiario_tipo IN ('profile', 'terceiro')),
  beneficiario_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  beneficiario_nome TEXT,
  percentual NUMERIC(5,2) NOT NULL,
  valor NUMERIC(15,2) NOT NULL,
  pago BOOLEAN DEFAULT false,
  data_pagamento DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CHECK (valor > 0),
  CHECK (percentual > 0),
  CHECK (beneficiario_tipo = 'terceiro' OR beneficiario_id IS NOT NULL)
);

CREATE INDEX idx_comissoes_honorario ON comissoes(honorario_id);
CREATE INDEX idx_comissoes_beneficiario ON comissoes(beneficiario_id) WHERE beneficiario_id IS NOT NULL;

COMMENT ON TABLE comissoes IS 'Comissões sobre honorários';

-- =====================================================
-- METAS FINANCEIRAS
-- =====================================================

CREATE TABLE IF NOT EXISTS metas_financeiras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id UUID NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('receita', 'captacao', 'margem')),
  periodo TEXT NOT NULL CHECK (periodo IN ('mensal', 'trimestral', 'anual')),
  ano INTEGER NOT NULL,
  mes INTEGER CHECK (mes >= 1 AND mes <= 12),
  valor_meta NUMERIC(15,2) NOT NULL,
  valor_realizado NUMERIC(15,2) DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CHECK (valor_meta > 0),
  CHECK (periodo != 'mensal' OR mes IS NOT NULL)
);

CREATE INDEX idx_metas_escritorio ON metas_financeiras(escritorio_id, ano, mes);

COMMENT ON TABLE metas_financeiras IS 'Metas financeiras do escritório';

-- =====================================================
-- COBRANÇAS ENVIADAS
-- =====================================================

CREATE TABLE IF NOT EXISTS cobrancas_enviadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcela_id UUID NOT NULL REFERENCES honorarios_parcelas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('lembrete_previo', 'vencimento', 'pos_vencimento')),
  metodo TEXT NOT NULL CHECK (metodo IN ('email', 'whatsapp', 'sms')),
  destinatario TEXT NOT NULL,
  enviado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lido BOOLEAN,
  lido_em TIMESTAMPTZ,
  respondido BOOLEAN DEFAULT false
);

CREATE INDEX idx_cobrancas_parcela ON cobrancas_enviadas(parcela_id);
CREATE INDEX idx_cobrancas_enviado ON cobrancas_enviadas(enviado_em DESC);

COMMENT ON TABLE cobrancas_enviadas IS 'Registro de cobranças enviadas aos clientes';

-- =====================================================
-- PROVISÕES
-- =====================================================

CREATE TABLE IF NOT EXISTS provisoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id UUID NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,
  processo_id UUID REFERENCES processos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('possivel', 'provavel', 'remota')),
  valor NUMERIC(15,2) NOT NULL,
  descricao TEXT NOT NULL,
  data_registro DATE NOT NULL DEFAULT CURRENT_DATE,
  data_revisao DATE,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CHECK (valor > 0)
);

CREATE INDEX idx_provisoes_escritorio ON provisoes(escritorio_id, ativo);
CREATE INDEX idx_provisoes_processo ON provisoes(processo_id) WHERE processo_id IS NOT NULL;

COMMENT ON TABLE provisoes IS 'Provisões e contingências financeiras';

-- =====================================================
-- CONTRATOS RECORRENTES
-- =====================================================

CREATE TABLE IF NOT EXISTS contratos_recorrentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id UUID NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  valor_mensal NUMERIC(15,2) NOT NULL,
  dia_vencimento INTEGER NOT NULL CHECK (dia_vencimento >= 1 AND dia_vencimento <= 31),
  data_inicio DATE NOT NULL,
  data_fim DATE,
  reajuste_anual BOOLEAN DEFAULT false,
  indice_reajuste TEXT CHECK (indice_reajuste IN ('ipca', 'igpm', 'fixo')),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CHECK (valor_mensal > 0),
  CHECK (reajuste_anual = false OR indice_reajuste IS NOT NULL)
);

CREATE INDEX idx_contratos_recorrentes_escritorio ON contratos_recorrentes(escritorio_id, ativo);
CREATE INDEX idx_contratos_recorrentes_dia ON contratos_recorrentes(dia_vencimento, ativo) WHERE ativo = true;

COMMENT ON TABLE contratos_recorrentes IS 'Contratos com faturamento recorrente';

-- =====================================================
-- CONCILIAÇÕES BANCÁRIAS
-- =====================================================

CREATE TABLE IF NOT EXISTS conciliacoes_bancarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id UUID NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,
  conta_bancaria TEXT NOT NULL,
  data_extrato DATE NOT NULL,
  saldo_inicial NUMERIC(15,2) NOT NULL,
  saldo_final NUMERIC(15,2) NOT NULL,
  total_entradas NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_saidas NUMERIC(15,2) NOT NULL DEFAULT 0,
  conciliado BOOLEAN DEFAULT false,
  divergencias JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conciliacoes_escritorio ON conciliacoes_bancarias(escritorio_id, data_extrato DESC);

COMMENT ON TABLE conciliacoes_bancarias IS 'Conciliações bancárias';

-- =====================================================
-- LANÇAMENTOS BANCÁRIOS (DA CONCILIAÇÃO)
-- =====================================================

CREATE TABLE IF NOT EXISTS lancamentos_bancarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conciliacao_id UUID NOT NULL REFERENCES conciliacoes_bancarias(id) ON DELETE CASCADE,
  data_lancamento DATE NOT NULL,
  descricao TEXT NOT NULL,
  valor NUMERIC(15,2) NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('credito', 'debito')),
  pagamento_id UUID REFERENCES pagamentos(id) ON DELETE SET NULL,
  conciliado BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CHECK (valor > 0)
);

CREATE INDEX idx_lancamentos_bancarios_conciliacao ON lancamentos_bancarios(conciliacao_id);
CREATE INDEX idx_lancamentos_bancarios_pagamento ON lancamentos_bancarios(pagamento_id) WHERE pagamento_id IS NOT NULL;

COMMENT ON TABLE lancamentos_bancarios IS 'Lançamentos do extrato bancário real (para conciliação)';

-- =====================================================
-- TRIGGERS PARA UPDATED_AT
-- =====================================================

CREATE TRIGGER update_contas_bancarias_updated_at
  BEFORE UPDATE ON contas_bancarias
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_provisoes_updated_at
  BEFORE UPDATE ON provisoes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
