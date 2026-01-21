-- =====================================================
-- MÓDULO CARTÕES DE CRÉDITO - TABELAS PRINCIPAIS
-- =====================================================
-- Migration: Criação das tabelas para gestão de cartões de crédito
-- - cartoes_credito
-- - cartoes_credito_despesas
-- - cartoes_credito_parcelas
-- - cartoes_credito_faturas
-- - cartoes_credito_importacoes
-- =====================================================

-- =====================================================
-- 1. CARTÕES DE CRÉDITO
-- =====================================================
CREATE TABLE IF NOT EXISTS cartoes_credito (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id UUID NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,

  -- Identificação do cartão
  nome TEXT NOT NULL,
  banco TEXT NOT NULL,
  bandeira TEXT NOT NULL CHECK (bandeira IN ('visa', 'mastercard', 'elo', 'amex', 'hipercard', 'outras')),
  ultimos_digitos CHAR(4) NOT NULL,

  -- Configuração de faturamento
  dia_vencimento INTEGER NOT NULL CHECK (dia_vencimento >= 1 AND dia_vencimento <= 31),
  dias_antes_fechamento INTEGER NOT NULL DEFAULT 7,

  -- Limites (opcional)
  limite_total NUMERIC(15,2),

  -- Visual e status
  cor TEXT DEFAULT '#1E3A8A',
  ativo BOOLEAN DEFAULT true,

  -- Metadados
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(escritorio_id, banco, ultimos_digitos),
  CHECK (dias_antes_fechamento >= 1 AND dias_antes_fechamento <= 28)
);

CREATE INDEX idx_cartoes_credito_escritorio ON cartoes_credito(escritorio_id);
CREATE INDEX idx_cartoes_credito_ativo ON cartoes_credito(escritorio_id, ativo);

COMMENT ON TABLE cartoes_credito IS 'Cartões de crédito cadastrados no escritório';
COMMENT ON COLUMN cartoes_credito.dias_antes_fechamento IS 'Quantos dias antes do vencimento a fatura fecha';
COMMENT ON COLUMN cartoes_credito.cor IS 'Cor para identificação visual do cartão na interface';

-- =====================================================
-- 2. DESPESAS DO CARTÃO DE CRÉDITO
-- =====================================================
CREATE TABLE IF NOT EXISTS cartoes_credito_despesas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id UUID NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,
  cartao_id UUID NOT NULL REFERENCES cartoes_credito(id) ON DELETE CASCADE,

  -- Detalhes da despesa
  descricao TEXT NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN (
    'custas', 'fornecedor', 'folha', 'impostos', 'aluguel',
    'marketing', 'capacitacao', 'material', 'tecnologia',
    'viagem', 'alimentacao', 'combustivel', 'assinatura', 'outras'
  )),
  fornecedor TEXT,

  -- Valores
  valor_total NUMERIC(15,2) NOT NULL,
  numero_parcelas INTEGER NOT NULL DEFAULT 1,
  valor_parcela NUMERIC(15,2) NOT NULL,

  -- Datas
  data_compra DATE NOT NULL,

  -- Vinculações (processo opcional)
  processo_id UUID REFERENCES processos_processos(id) ON DELETE SET NULL,

  -- Documentação
  documento_fiscal TEXT,
  comprovante_url TEXT,

  -- Rastreamento de importação
  importado_de_fatura BOOLEAN DEFAULT false,
  hash_transacao TEXT,

  observacoes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CHECK (valor_total > 0),
  CHECK (numero_parcelas >= 1),
  CHECK (valor_parcela > 0)
);

CREATE INDEX idx_cartao_despesas_escritorio ON cartoes_credito_despesas(escritorio_id);
CREATE INDEX idx_cartao_despesas_cartao ON cartoes_credito_despesas(cartao_id);
CREATE INDEX idx_cartao_despesas_data ON cartoes_credito_despesas(cartao_id, data_compra);
CREATE INDEX idx_cartao_despesas_categoria ON cartoes_credito_despesas(escritorio_id, categoria);
CREATE INDEX idx_cartao_despesas_hash ON cartoes_credito_despesas(hash_transacao) WHERE hash_transacao IS NOT NULL;
CREATE INDEX idx_cartao_despesas_processo ON cartoes_credito_despesas(processo_id) WHERE processo_id IS NOT NULL;

COMMENT ON TABLE cartoes_credito_despesas IS 'Despesas realizadas no cartão de crédito';
COMMENT ON COLUMN cartoes_credito_despesas.hash_transacao IS 'Hash para detecção de duplicatas na importação de PDF';

-- =====================================================
-- 3. PARCELAS DE DESPESAS DO CARTÃO
-- =====================================================
CREATE TABLE IF NOT EXISTS cartoes_credito_parcelas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  despesa_id UUID NOT NULL REFERENCES cartoes_credito_despesas(id) ON DELETE CASCADE,
  fatura_id UUID REFERENCES cartoes_credito_faturas(id) ON DELETE SET NULL,

  -- Identificação da parcela
  numero_parcela INTEGER NOT NULL,
  valor NUMERIC(15,2) NOT NULL,

  -- Período de faturamento (primeiro dia do mês)
  mes_referencia DATE NOT NULL,

  -- Status
  faturada BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(despesa_id, numero_parcela),
  CHECK (valor > 0),
  CHECK (numero_parcela >= 1)
);

CREATE INDEX idx_cartao_parcelas_despesa ON cartoes_credito_parcelas(despesa_id);
CREATE INDEX idx_cartao_parcelas_fatura ON cartoes_credito_parcelas(fatura_id) WHERE fatura_id IS NOT NULL;
CREATE INDEX idx_cartao_parcelas_mes ON cartoes_credito_parcelas(mes_referencia, faturada);
CREATE INDEX idx_cartao_parcelas_nao_faturada ON cartoes_credito_parcelas(mes_referencia) WHERE faturada = false;

COMMENT ON TABLE cartoes_credito_parcelas IS 'Parcelas de despesas parceladas no cartão';
COMMENT ON COLUMN cartoes_credito_parcelas.mes_referencia IS 'Primeiro dia do mês em que a parcela será faturada';

-- =====================================================
-- 4. FATURAS DO CARTÃO DE CRÉDITO
-- =====================================================
CREATE TABLE IF NOT EXISTS cartoes_credito_faturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id UUID NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,
  cartao_id UUID NOT NULL REFERENCES cartoes_credito(id) ON DELETE CASCADE,

  -- Período
  mes_referencia DATE NOT NULL,
  data_fechamento DATE NOT NULL,
  data_vencimento DATE NOT NULL,

  -- Valor
  valor_total NUMERIC(15,2) NOT NULL DEFAULT 0,

  -- Integração com despesas gerais
  despesa_id UUID REFERENCES financeiro_despesas(id) ON DELETE SET NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'fechada', 'paga', 'cancelada')),

  -- PDF importado
  pdf_url TEXT,

  -- Pagamento
  data_pagamento DATE,
  forma_pagamento TEXT CHECK (forma_pagamento IN ('boleto', 'pix', 'debito_conta', 'transferencia')),

  observacoes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(cartao_id, mes_referencia),
  CHECK (valor_total >= 0)
);

CREATE INDEX idx_cartao_faturas_escritorio ON cartoes_credito_faturas(escritorio_id);
CREATE INDEX idx_cartao_faturas_cartao ON cartoes_credito_faturas(cartao_id);
CREATE INDEX idx_cartao_faturas_mes ON cartoes_credito_faturas(cartao_id, mes_referencia);
CREATE INDEX idx_cartao_faturas_status ON cartoes_credito_faturas(status);
CREATE INDEX idx_cartao_faturas_vencimento ON cartoes_credito_faturas(data_vencimento);
CREATE INDEX idx_cartao_faturas_despesa ON cartoes_credito_faturas(despesa_id) WHERE despesa_id IS NOT NULL;

COMMENT ON TABLE cartoes_credito_faturas IS 'Faturas mensais do cartão de crédito';
COMMENT ON COLUMN cartoes_credito_faturas.despesa_id IS 'Referência à despesa criada automaticamente no fechamento da fatura';

-- =====================================================
-- 5. HISTÓRICO DE IMPORTAÇÕES DE PDF
-- =====================================================
CREATE TABLE IF NOT EXISTS cartoes_credito_importacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id UUID NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,
  cartao_id UUID NOT NULL REFERENCES cartoes_credito(id) ON DELETE CASCADE,
  fatura_id UUID REFERENCES cartoes_credito_faturas(id) ON DELETE SET NULL,

  -- Informações do arquivo
  arquivo_nome TEXT NOT NULL,
  arquivo_url TEXT NOT NULL,

  -- Status do processamento
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'processando', 'concluido', 'erro')),

  -- Estatísticas
  transacoes_encontradas INTEGER DEFAULT 0,
  transacoes_importadas INTEGER DEFAULT 0,
  transacoes_duplicadas INTEGER DEFAULT 0,

  -- Detalhes do processamento IA
  modelo_ia TEXT,
  confianca_media NUMERIC(5,2),

  -- Erros
  erro_mensagem TEXT,
  erro_detalhes JSONB,

  -- Dados extraídos (para revisão)
  dados_extraidos JSONB,

  processado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cartao_importacoes_escritorio ON cartoes_credito_importacoes(escritorio_id);
CREATE INDEX idx_cartao_importacoes_cartao ON cartoes_credito_importacoes(cartao_id);
CREATE INDEX idx_cartao_importacoes_status ON cartoes_credito_importacoes(status);
CREATE INDEX idx_cartao_importacoes_fatura ON cartoes_credito_importacoes(fatura_id) WHERE fatura_id IS NOT NULL;

COMMENT ON TABLE cartoes_credito_importacoes IS 'Histórico de importações de faturas em PDF';
COMMENT ON COLUMN cartoes_credito_importacoes.dados_extraidos IS 'Dados extraídos do PDF para revisão antes de importar';

-- =====================================================
-- 6. ADICIONAR FOREIGN KEY EM PARCELAS (após criar faturas)
-- =====================================================
-- A FK de fatura_id já foi criada inline na tabela cartoes_credito_parcelas

-- =====================================================
-- 7. ATUALIZAR CONSTRAINT DE CATEGORIAS NA TABELA DESPESAS
-- =====================================================
-- Adiciona categoria 'cartao_credito' para receber as faturas fechadas

-- Atualiza constraint de categorias na tabela financeiro_despesas
ALTER TABLE financeiro_despesas DROP CONSTRAINT IF EXISTS despesas_categoria_check;
ALTER TABLE financeiro_despesas ADD CONSTRAINT despesas_categoria_check
  CHECK (categoria IN (
    'aluguel', 'folha', 'impostos', 'tecnologia',
    'marketing', 'material', 'capacitacao', 'outros',
    'cartao_credito', 'custas', 'fornecedor'
  ));

-- =====================================================
-- 8. TRIGGERS PARA UPDATED_AT
-- =====================================================

-- Trigger para cartoes_credito
CREATE OR REPLACE FUNCTION trigger_cartoes_credito_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cartoes_credito_updated
  BEFORE UPDATE ON cartoes_credito
  FOR EACH ROW
  EXECUTE FUNCTION trigger_cartoes_credito_updated_at();

-- Trigger para cartoes_credito_despesas
CREATE TRIGGER trigger_cartoes_despesas_updated
  BEFORE UPDATE ON cartoes_credito_despesas
  FOR EACH ROW
  EXECUTE FUNCTION trigger_cartoes_credito_updated_at();

-- Trigger para cartoes_credito_faturas
CREATE TRIGGER trigger_cartoes_faturas_updated
  BEFORE UPDATE ON cartoes_credito_faturas
  FOR EACH ROW
  EXECUTE FUNCTION trigger_cartoes_credito_updated_at();

-- =====================================================
-- 9. COMENTÁRIOS FINAIS
-- =====================================================
COMMENT ON COLUMN cartoes_credito.bandeira IS 'Bandeira do cartão: visa, mastercard, elo, amex, hipercard, outras';
COMMENT ON COLUMN cartoes_credito_despesas.categoria IS 'Categoria da despesa para classificação';
COMMENT ON COLUMN cartoes_credito_faturas.status IS 'Status: aberta (aceitando despesas), fechada (aguardando pagamento), paga, cancelada';
