-- Migration: Criar tabelas de reconciliação bancária
-- Data: 2025-01-22
-- Descrição: Tabelas para reconciliação de extrato bancário

-- ============================================================
-- 1. TABELA PRINCIPAL DE RECONCILIAÇÃO
-- ============================================================

CREATE TABLE IF NOT EXISTS financeiro_reconciliacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id UUID NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,
  conta_bancaria_id UUID NOT NULL REFERENCES financeiro_contas_bancarias(id) ON DELETE CASCADE,

  -- Período da reconciliação
  mes_referencia DATE NOT NULL, -- Primeiro dia do mês

  -- Saldos
  saldo_inicial_banco NUMERIC(15,2), -- Saldo informado pelo usuário (início do mês)
  saldo_final_banco NUMERIC(15,2),   -- Saldo informado pelo usuário (fim do mês)
  saldo_calculado NUMERIC(15,2),     -- Calculado pelo sistema com base nas receitas/despesas
  diferenca NUMERIC(15,2),           -- Diferença entre saldo_final_banco e saldo_calculado

  -- Status
  status TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'em_andamento', 'conciliado')),

  -- Auditoria
  conciliado_em TIMESTAMPTZ,
  conciliado_por UUID REFERENCES auth.users(id),

  -- Metadados
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraint única: uma reconciliação por conta/mês
  UNIQUE (conta_bancaria_id, mes_referencia)
);

-- ============================================================
-- 2. ITENS DO EXTRATO IMPORTADO
-- ============================================================

CREATE TABLE IF NOT EXISTS financeiro_reconciliacao_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliacao_id UUID NOT NULL REFERENCES financeiro_reconciliacao(id) ON DELETE CASCADE,

  -- Dados do extrato bancário (vindos do OFX/CSV)
  data_transacao DATE NOT NULL,
  descricao_banco TEXT NOT NULL,
  valor NUMERIC(15,2) NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('credito', 'debito')),

  -- Dados extras do OFX (opcional)
  fitid TEXT,              -- ID único da transação no banco
  memo TEXT,               -- Memo adicional
  checknum TEXT,           -- Número do cheque (se aplicável)

  -- Vinculação com sistema
  receita_id UUID REFERENCES financeiro_receitas(id) ON DELETE SET NULL,
  despesa_id UUID REFERENCES financeiro_despesas(id) ON DELETE SET NULL,

  -- Status de conciliação
  -- pendente: ainda não vinculado
  -- vinculado: vinculado a uma receita ou despesa
  -- ignorado: ignorado pelo usuário (não precisa conciliar)
  -- manual: lançamento manual criado durante reconciliação
  status TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'vinculado', 'ignorado', 'manual')),

  -- Hash para evitar duplicatas na importação
  -- Calculado a partir de: data + descricao + valor + tipo (+ fitid se disponível)
  hash_transacao TEXT,

  -- Metadados
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 3. HISTÓRICO DE IMPORTAÇÕES DE EXTRATO
-- ============================================================

CREATE TABLE IF NOT EXISTS financeiro_extrato_importacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id UUID NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,
  conta_bancaria_id UUID NOT NULL REFERENCES financeiro_contas_bancarias(id) ON DELETE CASCADE,
  reconciliacao_id UUID REFERENCES financeiro_reconciliacao(id) ON DELETE SET NULL,

  -- Arquivo importado
  arquivo_nome TEXT NOT NULL,
  arquivo_url TEXT,
  formato TEXT NOT NULL CHECK (formato IN ('ofx', 'csv', 'pdf')),

  -- Status do processamento
  status TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'processando', 'concluido', 'erro')),

  -- Estatísticas
  itens_encontrados INTEGER DEFAULT 0,
  itens_importados INTEGER DEFAULT 0,
  itens_duplicados INTEGER DEFAULT 0,

  -- Erro (se houver)
  erro_mensagem TEXT,

  -- Timestamps
  processado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 4. ÍNDICES
-- ============================================================

-- Reconciliação
CREATE INDEX idx_reconciliacao_escritorio ON financeiro_reconciliacao(escritorio_id);
CREATE INDEX idx_reconciliacao_conta ON financeiro_reconciliacao(conta_bancaria_id);
CREATE INDEX idx_reconciliacao_mes ON financeiro_reconciliacao(mes_referencia);
CREATE INDEX idx_reconciliacao_status ON financeiro_reconciliacao(status);

-- Itens da reconciliação
CREATE INDEX idx_reconciliacao_itens_reconciliacao ON financeiro_reconciliacao_itens(reconciliacao_id);
CREATE INDEX idx_reconciliacao_itens_data ON financeiro_reconciliacao_itens(data_transacao);
CREATE INDEX idx_reconciliacao_itens_status ON financeiro_reconciliacao_itens(status);
CREATE INDEX idx_reconciliacao_itens_hash ON financeiro_reconciliacao_itens(hash_transacao);
CREATE INDEX idx_reconciliacao_itens_receita ON financeiro_reconciliacao_itens(receita_id)
  WHERE receita_id IS NOT NULL;
CREATE INDEX idx_reconciliacao_itens_despesa ON financeiro_reconciliacao_itens(despesa_id)
  WHERE despesa_id IS NOT NULL;

-- Importações
CREATE INDEX idx_extrato_importacoes_escritorio ON financeiro_extrato_importacoes(escritorio_id);
CREATE INDEX idx_extrato_importacoes_conta ON financeiro_extrato_importacoes(conta_bancaria_id);
CREATE INDEX idx_extrato_importacoes_status ON financeiro_extrato_importacoes(status);

-- ============================================================
-- 5. TRIGGER PARA UPDATED_AT
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_set_updated_at_reconciliacao()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_reconciliacao ON financeiro_reconciliacao;
CREATE TRIGGER set_updated_at_reconciliacao
  BEFORE UPDATE ON financeiro_reconciliacao
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at_reconciliacao();

-- ============================================================
-- 6. FUNÇÃO: CALCULAR HASH DE TRANSAÇÃO
-- ============================================================

CREATE OR REPLACE FUNCTION calcular_hash_extrato(
  p_data DATE,
  p_descricao TEXT,
  p_valor NUMERIC,
  p_tipo TEXT,
  p_fitid TEXT DEFAULT NULL
) RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  RETURN MD5(
    COALESCE(p_fitid, '') || '|' ||
    p_data::text || '|' ||
    LOWER(TRIM(p_descricao)) || '|' ||
    ABS(p_valor)::text || '|' ||
    p_tipo
  );
END;
$$;

COMMENT ON FUNCTION calcular_hash_extrato IS
'Calcula hash único para detectar transações duplicadas na importação de extrato';

-- ============================================================
-- 7. FUNÇÃO: AUTO-MATCH DE TRANSAÇÕES
-- ============================================================

CREATE OR REPLACE FUNCTION auto_match_reconciliacao(
  p_reconciliacao_id UUID
) RETURNS INTEGER
LANGUAGE plpgsql AS $$
DECLARE
  v_item RECORD;
  v_match_id UUID;
  v_count INTEGER := 0;
  v_escritorio_id UUID;
  v_tolerancia_dias INTEGER := 3; -- Tolerância de dias para match
BEGIN
  -- Buscar escritorio_id da reconciliação
  SELECT r.escritorio_id INTO v_escritorio_id
  FROM financeiro_reconciliacao r
  WHERE r.id = p_reconciliacao_id;

  -- Iterar sobre itens pendentes
  FOR v_item IN
    SELECT * FROM financeiro_reconciliacao_itens
    WHERE reconciliacao_id = p_reconciliacao_id
    AND status = 'pendente'
  LOOP
    v_match_id := NULL;

    -- Tentar match com receitas (para créditos)
    IF v_item.tipo = 'credito' THEN
      SELECT r.id INTO v_match_id
      FROM financeiro_receitas r
      WHERE r.escritorio_id = v_escritorio_id
        AND r.status IN ('pendente', 'atrasado')
        AND r.valor = v_item.valor
        AND ABS(r.data_vencimento - v_item.data_transacao) <= v_tolerancia_dias
      ORDER BY ABS(r.data_vencimento - v_item.data_transacao)
      LIMIT 1;

      IF v_match_id IS NOT NULL THEN
        UPDATE financeiro_reconciliacao_itens
        SET receita_id = v_match_id, status = 'vinculado'
        WHERE id = v_item.id;
        v_count := v_count + 1;
      END IF;

    -- Tentar match com despesas (para débitos)
    ELSIF v_item.tipo = 'debito' THEN
      SELECT d.id INTO v_match_id
      FROM financeiro_despesas d
      WHERE d.escritorio_id = v_escritorio_id
        AND d.status = 'pendente'
        AND d.valor = v_item.valor
        AND ABS(d.data_vencimento - v_item.data_transacao) <= v_tolerancia_dias
      ORDER BY ABS(d.data_vencimento - v_item.data_transacao)
      LIMIT 1;

      IF v_match_id IS NOT NULL THEN
        UPDATE financeiro_reconciliacao_itens
        SET despesa_id = v_match_id, status = 'vinculado'
        WHERE id = v_item.id;
        v_count := v_count + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION auto_match_reconciliacao IS
'Tenta vincular automaticamente itens do extrato com receitas/despesas do sistema por valor e data';

-- ============================================================
-- 8. FUNÇÃO: CALCULAR SALDO DA RECONCILIAÇÃO
-- ============================================================

CREATE OR REPLACE FUNCTION calcular_saldo_reconciliacao(
  p_reconciliacao_id UUID
) RETURNS NUMERIC
LANGUAGE plpgsql AS $$
DECLARE
  v_rec RECORD;
  v_total_receitas NUMERIC := 0;
  v_total_despesas NUMERIC := 0;
  v_saldo NUMERIC;
BEGIN
  -- Buscar dados da reconciliação
  SELECT * INTO v_rec
  FROM financeiro_reconciliacao
  WHERE id = p_reconciliacao_id;

  -- Somar receitas pagas no mês
  SELECT COALESCE(SUM(valor_pago), 0) INTO v_total_receitas
  FROM financeiro_receitas
  WHERE escritorio_id = v_rec.escritorio_id
    AND conta_bancaria_id = v_rec.conta_bancaria_id
    AND data_pagamento >= v_rec.mes_referencia
    AND data_pagamento < (v_rec.mes_referencia + INTERVAL '1 month')::date
    AND status IN ('pago', 'parcial');

  -- Somar despesas pagas no mês
  SELECT COALESCE(SUM(valor), 0) INTO v_total_despesas
  FROM financeiro_despesas
  WHERE escritorio_id = v_rec.escritorio_id
    -- Considerando despesas da conta (se houver vinculação)
    AND data_pagamento >= v_rec.mes_referencia
    AND data_pagamento < (v_rec.mes_referencia + INTERVAL '1 month')::date
    AND status = 'pago';

  -- Calcular saldo
  v_saldo := COALESCE(v_rec.saldo_inicial_banco, 0) + v_total_receitas - v_total_despesas;

  -- Atualizar na reconciliação
  UPDATE financeiro_reconciliacao
  SET saldo_calculado = v_saldo,
      diferenca = COALESCE(saldo_final_banco, 0) - v_saldo
  WHERE id = p_reconciliacao_id;

  RETURN v_saldo;
END;
$$;

COMMENT ON FUNCTION calcular_saldo_reconciliacao IS
'Calcula o saldo esperado do mês com base nas receitas e despesas pagas';

-- ============================================================
-- 9. COMENTÁRIOS NAS TABELAS
-- ============================================================

COMMENT ON TABLE financeiro_reconciliacao IS
'Cabeçalho de reconciliação bancária mensal por conta';

COMMENT ON TABLE financeiro_reconciliacao_itens IS
'Itens do extrato bancário importado para reconciliação';

COMMENT ON TABLE financeiro_extrato_importacoes IS
'Histórico de importações de extrato (OFX, CSV, PDF)';
