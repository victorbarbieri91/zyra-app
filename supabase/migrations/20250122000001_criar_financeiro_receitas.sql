-- Migration: Criar tabela financeiro_receitas
-- Data: 2025-01-22
-- Descrição: Tabela unificada de receitas (substitui honorarios + honorarios_parcelas)

-- ============================================================
-- 1. CRIAR TABELA PRINCIPAL
-- ============================================================

CREATE TABLE IF NOT EXISTS financeiro_receitas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id UUID NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,

  -- Tipo do lançamento
  -- honorario: lançamento principal de honorário
  -- parcela: parcela de um honorário parcelado
  -- avulso: receita avulsa ou gerada por recorrência
  -- saldo: saldo restante de pagamento parcial
  tipo TEXT NOT NULL CHECK (tipo IN ('honorario', 'parcela', 'avulso', 'saldo')),

  -- Referências a outras entidades
  cliente_id UUID REFERENCES crm_pessoas(id) ON DELETE SET NULL,
  processo_id UUID REFERENCES processos_processos(id) ON DELETE SET NULL,
  consulta_id UUID REFERENCES consultivo_consultas(id) ON DELETE SET NULL,
  contrato_id UUID REFERENCES financeiro_contratos_honorarios(id) ON DELETE SET NULL,
  fatura_id UUID REFERENCES financeiro_faturamento_faturas(id) ON DELETE SET NULL,

  -- Para parcelas: referência ao honorário pai
  receita_pai_id UUID REFERENCES financeiro_receitas(id) ON DELETE CASCADE,
  numero_parcela INTEGER,

  -- Para saldo de pagamento parcial: referência à receita original
  receita_origem_id UUID REFERENCES financeiro_receitas(id) ON DELETE SET NULL,

  -- Dados do lançamento
  descricao TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'honorario',
  valor NUMERIC(15,2) NOT NULL CHECK (valor > 0),

  -- Datas
  data_competencia DATE NOT NULL, -- Mês de referência (primeiro dia do mês)
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,

  -- Status
  -- pendente: aguardando pagamento
  -- pago: totalmente pago
  -- parcial: parcialmente pago (há saldo restante)
  -- atrasado: vencido e não pago
  -- cancelado: cancelado
  -- faturado: incluído em fatura (ainda não pago)
  status TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'pago', 'parcial', 'atrasado', 'cancelado', 'faturado')),

  -- Pagamento
  valor_pago NUMERIC(15,2) DEFAULT 0,
  forma_pagamento TEXT CHECK (forma_pagamento IS NULL OR forma_pagamento IN (
    'dinheiro', 'pix', 'ted', 'boleto', 'cartao_credito', 'cartao_debito'
  )),
  conta_bancaria_id UUID REFERENCES financeiro_contas_bancarias(id) ON DELETE SET NULL,

  -- Recorrência
  recorrente BOOLEAN DEFAULT false,
  config_recorrencia JSONB,
  /* config_recorrencia: {
    frequencia: 'mensal' | 'trimestral' | 'semestral' | 'anual',
    dia_vencimento: 10,
    data_inicio: '2025-01-01',
    data_fim: '2025-12-31' | null (infinito),
    gerar_automatico: true,
    ultima_geracao: '2025-01-01'
  } */

  -- Controle de parcelamento (para tipo='honorario')
  parcelado BOOLEAN DEFAULT false,
  numero_parcelas INTEGER DEFAULT 1 CHECK (numero_parcelas >= 1),

  -- Juros/multa (para tipo='parcela' ou 'saldo')
  dias_atraso INTEGER DEFAULT 0,
  juros_aplicados NUMERIC(15,2) DEFAULT 0,

  -- Metadados
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- ============================================================
-- 2. ÍNDICES PARA PERFORMANCE
-- ============================================================

-- Índice principal por escritório (RLS)
CREATE INDEX idx_receitas_escritorio ON financeiro_receitas(escritorio_id);

-- Índices para filtros comuns
CREATE INDEX idx_receitas_cliente ON financeiro_receitas(cliente_id);
CREATE INDEX idx_receitas_processo ON financeiro_receitas(processo_id);
CREATE INDEX idx_receitas_contrato ON financeiro_receitas(contrato_id);
CREATE INDEX idx_receitas_fatura ON financeiro_receitas(fatura_id);

-- Índices para busca temporal
CREATE INDEX idx_receitas_vencimento ON financeiro_receitas(data_vencimento);
CREATE INDEX idx_receitas_competencia ON financeiro_receitas(data_competencia);
CREATE INDEX idx_receitas_pagamento ON financeiro_receitas(data_pagamento) WHERE data_pagamento IS NOT NULL;

-- Índices para status
CREATE INDEX idx_receitas_status ON financeiro_receitas(status);
CREATE INDEX idx_receitas_pendentes ON financeiro_receitas(escritorio_id, status)
  WHERE status IN ('pendente', 'atrasado');

-- Índices para hierarquia
CREATE INDEX idx_receitas_pai ON financeiro_receitas(receita_pai_id) WHERE receita_pai_id IS NOT NULL;
CREATE INDEX idx_receitas_origem ON financeiro_receitas(receita_origem_id) WHERE receita_origem_id IS NOT NULL;

-- Índice para recorrência
CREATE INDEX idx_receitas_recorrente ON financeiro_receitas(recorrente, escritorio_id)
  WHERE recorrente = true;

-- Índice composto para faturamento
CREATE INDEX idx_receitas_faturamento ON financeiro_receitas(escritorio_id, cliente_id, status)
  WHERE status = 'pendente' AND fatura_id IS NULL;

-- ============================================================
-- 3. TRIGGER PARA UPDATED_AT
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_set_updated_at_receitas()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_receitas ON financeiro_receitas;
CREATE TRIGGER set_updated_at_receitas
  BEFORE UPDATE ON financeiro_receitas
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at_receitas();

-- ============================================================
-- 4. TRIGGER PARA ATUALIZAR DIAS DE ATRASO
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_atualizar_dias_atraso_receitas()
RETURNS TRIGGER AS $$
BEGIN
  -- Se está pendente e venceu, calcular dias de atraso
  IF NEW.status IN ('pendente', 'atrasado') AND NEW.data_vencimento < CURRENT_DATE THEN
    NEW.dias_atraso := CURRENT_DATE - NEW.data_vencimento;
    NEW.status := 'atrasado';
  ELSIF NEW.status = 'atrasado' AND NEW.data_vencimento >= CURRENT_DATE THEN
    -- Caso a data de vencimento seja alterada para o futuro
    NEW.dias_atraso := 0;
    NEW.status := 'pendente';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS atualizar_dias_atraso_receitas ON financeiro_receitas;
CREATE TRIGGER atualizar_dias_atraso_receitas
  BEFORE INSERT OR UPDATE ON financeiro_receitas
  FOR EACH ROW
  EXECUTE FUNCTION trigger_atualizar_dias_atraso_receitas();

-- ============================================================
-- 5. TRIGGER PARA GERAR PARCELAS AUTOMATICAMENTE
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_gerar_parcelas_receita()
RETURNS TRIGGER AS $$
DECLARE
  v_parcela_valor NUMERIC(15,2);
  v_parcela_vencimento DATE;
  v_ultimo_valor NUMERIC(15,2);
  i INTEGER;
BEGIN
  -- Só gera parcelas para tipo='honorario' com parcelado=true
  IF NEW.tipo = 'honorario' AND NEW.parcelado = true AND NEW.numero_parcelas > 1 THEN
    -- Calcular valor de cada parcela (arredondado)
    v_parcela_valor := ROUND(NEW.valor / NEW.numero_parcelas, 2);

    -- Calcular valor da última parcela (para ajustar arredondamento)
    v_ultimo_valor := NEW.valor - (v_parcela_valor * (NEW.numero_parcelas - 1));

    -- Data do primeiro vencimento
    v_parcela_vencimento := NEW.data_vencimento;

    -- Gerar parcelas
    FOR i IN 1..NEW.numero_parcelas LOOP
      INSERT INTO financeiro_receitas (
        escritorio_id, tipo, cliente_id, processo_id, consulta_id, contrato_id,
        receita_pai_id, numero_parcela,
        descricao, categoria, valor,
        data_competencia, data_vencimento,
        status, created_by
      ) VALUES (
        NEW.escritorio_id, 'parcela', NEW.cliente_id, NEW.processo_id, NEW.consulta_id, NEW.contrato_id,
        NEW.id, i,
        'Parcela ' || i || '/' || NEW.numero_parcelas || ' - ' || NEW.descricao,
        NEW.categoria,
        CASE WHEN i = NEW.numero_parcelas THEN v_ultimo_valor ELSE v_parcela_valor END,
        DATE_TRUNC('month', v_parcela_vencimento + ((i - 1) * INTERVAL '1 month'))::date,
        (v_parcela_vencimento + ((i - 1) * INTERVAL '1 month'))::date,
        'pendente', NEW.created_by
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS gerar_parcelas_receita ON financeiro_receitas;
CREATE TRIGGER gerar_parcelas_receita
  AFTER INSERT ON financeiro_receitas
  FOR EACH ROW
  EXECUTE FUNCTION trigger_gerar_parcelas_receita();

-- ============================================================
-- 6. COMENTÁRIOS NA TABELA
-- ============================================================

COMMENT ON TABLE financeiro_receitas IS
'Tabela unificada de receitas do escritório. Substitui financeiro_honorarios e financeiro_honorarios_parcelas.';

COMMENT ON COLUMN financeiro_receitas.tipo IS
'Tipo do lançamento: honorario (principal), parcela (de um parcelado), avulso (receita avulsa), saldo (de pagamento parcial)';

COMMENT ON COLUMN financeiro_receitas.receita_pai_id IS
'Para parcelas: referência ao honorário principal que gerou esta parcela';

COMMENT ON COLUMN financeiro_receitas.receita_origem_id IS
'Para saldos: referência à receita original que gerou este saldo (pagamento parcial)';

COMMENT ON COLUMN financeiro_receitas.status IS
'Status: pendente, pago, parcial (pagamento parcial), atrasado, cancelado, faturado';

COMMENT ON COLUMN financeiro_receitas.config_recorrencia IS
'Configuração de recorrência em JSONB: frequencia, dia_vencimento, data_inicio, data_fim, gerar_automatico, ultima_geracao';
