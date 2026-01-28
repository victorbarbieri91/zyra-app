-- =====================================================
-- REESTRUTURAÇÃO CARTÕES DE CRÉDITO - NOVA TABELA LANCAMENTOS
-- =====================================================
-- Migration: Simplifica estrutura de 5 para 4 tabelas
-- - Junta cartoes_credito_despesas + cartoes_credito_parcelas em cartoes_credito_lancamentos
-- - Adiciona suporte a 3 tipos: unica, parcelada, recorrente
-- =====================================================

-- =====================================================
-- 1. CRIAR NOVA TABELA: cartoes_credito_lancamentos
-- =====================================================
CREATE TABLE IF NOT EXISTS cartoes_credito_lancamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id UUID NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,
  cartao_id UUID NOT NULL REFERENCES cartoes_credito(id) ON DELETE CASCADE,
  fatura_id UUID REFERENCES cartoes_credito_faturas(id) ON DELETE SET NULL,

  -- Identificacao
  descricao TEXT NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN (
    'custas', 'fornecedor', 'folha', 'impostos', 'aluguel',
    'marketing', 'capacitacao', 'material', 'tecnologia',
    'viagem', 'alimentacao', 'combustivel', 'assinatura', 'outros'
  )),
  fornecedor TEXT,

  -- Valores
  valor NUMERIC(15,2) NOT NULL CHECK (valor > 0),

  -- Tipo do lancamento
  tipo TEXT NOT NULL CHECK (tipo IN ('unica', 'parcelada', 'recorrente')),

  -- Para parceladas: qual parcela e esta
  parcela_numero INTEGER NOT NULL DEFAULT 1 CHECK (parcela_numero >= 1),
  parcela_total INTEGER NOT NULL DEFAULT 1 CHECK (parcela_total >= 1),

  -- Para agrupar parcelas da mesma compra
  compra_id UUID NOT NULL,

  -- Datas
  data_compra DATE NOT NULL,
  mes_referencia DATE NOT NULL, -- primeiro dia do mes (2025-01-01)

  -- Recorrentes
  recorrente_ativo BOOLEAN DEFAULT TRUE,
  recorrente_data_fim DATE,

  -- Controle
  faturado BOOLEAN DEFAULT FALSE,
  importado_de_fatura BOOLEAN DEFAULT FALSE,
  hash_transacao TEXT,

  -- Vinculacoes
  processo_id UUID REFERENCES processos_processos(id) ON DELETE SET NULL,
  documento_fiscal TEXT,
  comprovante_url TEXT,
  observacoes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices
CREATE INDEX idx_lancamentos_escritorio ON cartoes_credito_lancamentos(escritorio_id);
CREATE INDEX idx_lancamentos_cartao ON cartoes_credito_lancamentos(cartao_id);
CREATE INDEX idx_lancamentos_mes ON cartoes_credito_lancamentos(cartao_id, mes_referencia);
CREATE INDEX idx_lancamentos_compra ON cartoes_credito_lancamentos(compra_id);
CREATE INDEX idx_lancamentos_fatura ON cartoes_credito_lancamentos(fatura_id) WHERE fatura_id IS NOT NULL;
CREATE INDEX idx_lancamentos_tipo ON cartoes_credito_lancamentos(cartao_id, tipo);
CREATE INDEX idx_lancamentos_recorrente ON cartoes_credito_lancamentos(cartao_id, tipo, recorrente_ativo)
  WHERE tipo = 'recorrente';
CREATE INDEX idx_lancamentos_nao_faturado ON cartoes_credito_lancamentos(cartao_id, mes_referencia)
  WHERE faturado = FALSE;
CREATE INDEX idx_lancamentos_hash ON cartoes_credito_lancamentos(hash_transacao)
  WHERE hash_transacao IS NOT NULL;

COMMENT ON TABLE cartoes_credito_lancamentos IS 'Lancamentos unificados de cartao de credito (substitui despesas + parcelas)';
COMMENT ON COLUMN cartoes_credito_lancamentos.tipo IS 'Tipo: unica (1x), parcelada (Nx), recorrente (mensal)';
COMMENT ON COLUMN cartoes_credito_lancamentos.compra_id IS 'ID para agrupar lancamentos da mesma compra/assinatura';
COMMENT ON COLUMN cartoes_credito_lancamentos.mes_referencia IS 'Primeiro dia do mes em que o lancamento sera cobrado';

-- =====================================================
-- 2. TRIGGER PARA UPDATED_AT
-- =====================================================
CREATE TRIGGER trigger_lancamentos_updated
  BEFORE UPDATE ON cartoes_credito_lancamentos
  FOR EACH ROW
  EXECUTE FUNCTION trigger_cartoes_credito_updated_at();

-- =====================================================
-- 3. MIGRAR DADOS EXISTENTES
-- =====================================================
INSERT INTO cartoes_credito_lancamentos (
  escritorio_id, cartao_id, fatura_id,
  descricao, categoria, fornecedor, valor,
  tipo, parcela_numero, parcela_total, compra_id,
  data_compra, mes_referencia, faturado,
  importado_de_fatura, hash_transacao, processo_id,
  documento_fiscal, comprovante_url, observacoes, created_at
)
SELECT
  d.escritorio_id, d.cartao_id, p.fatura_id,
  d.descricao, d.categoria, d.fornecedor, p.valor,
  CASE
    WHEN d.numero_parcelas = 1 THEN 'unica'
    ELSE 'parcelada'
  END,
  p.numero_parcela, d.numero_parcelas, d.id, -- usando despesa.id como compra_id
  d.data_compra, p.mes_referencia, p.faturada,
  d.importado_de_fatura, d.hash_transacao, d.processo_id,
  d.documento_fiscal, d.comprovante_url, d.observacoes, d.created_at
FROM cartoes_credito_despesas d
JOIN cartoes_credito_parcelas p ON p.despesa_id = d.id;

-- =====================================================
-- 4. FUNCAO: CRIAR LANCAMENTO NO CARTAO
-- =====================================================
CREATE OR REPLACE FUNCTION criar_lancamento_cartao(
  p_cartao_id UUID,
  p_descricao TEXT,
  p_categoria TEXT,
  p_fornecedor TEXT DEFAULT NULL,
  p_valor NUMERIC DEFAULT 0,
  p_tipo TEXT DEFAULT 'unica',
  p_parcelas INTEGER DEFAULT 1,
  p_data_compra DATE DEFAULT CURRENT_DATE,
  p_processo_id UUID DEFAULT NULL,
  p_documento_fiscal TEXT DEFAULT NULL,
  p_observacoes TEXT DEFAULT NULL,
  p_importado_de_fatura BOOLEAN DEFAULT FALSE
) RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_escritorio_id UUID;
  v_compra_id UUID := gen_random_uuid();
  v_mes_referencia DATE;
  v_data_fechamento DATE;
  v_valor_parcela NUMERIC;
  v_hash TEXT;
  i INTEGER;
BEGIN
  -- Buscar escritorio_id do cartao
  SELECT escritorio_id INTO v_escritorio_id
  FROM cartoes_credito
  WHERE id = p_cartao_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cartao nao encontrado: %', p_cartao_id;
  END IF;

  -- Validar parametros
  IF p_valor <= 0 THEN
    RAISE EXCEPTION 'Valor deve ser maior que zero';
  END IF;

  IF p_tipo NOT IN ('unica', 'parcelada', 'recorrente') THEN
    RAISE EXCEPTION 'Tipo invalido: %. Use: unica, parcelada, recorrente', p_tipo;
  END IF;

  IF p_tipo = 'parcelada' AND p_parcelas < 2 THEN
    RAISE EXCEPTION 'Parcelado deve ter pelo menos 2 parcelas';
  END IF;

  -- Determinar mes de referencia da primeira parcela
  v_data_fechamento := calcular_data_fechamento_cartao(p_cartao_id, DATE_TRUNC('month', p_data_compra)::DATE);

  IF p_data_compra <= v_data_fechamento THEN
    v_mes_referencia := DATE_TRUNC('month', p_data_compra)::DATE;
  ELSE
    v_mes_referencia := (DATE_TRUNC('month', p_data_compra) + INTERVAL '1 month')::DATE;
  END IF;

  -- Gerar hash da transacao
  v_hash := calcular_hash_transacao_cartao(p_data_compra, p_descricao, p_valor);

  IF p_tipo = 'unica' THEN
    -- Compra unica: 1 registro
    INSERT INTO cartoes_credito_lancamentos (
      escritorio_id, cartao_id, descricao, categoria, fornecedor, valor,
      tipo, parcela_numero, parcela_total, compra_id,
      data_compra, mes_referencia, processo_id, documento_fiscal,
      observacoes, importado_de_fatura, hash_transacao
    ) VALUES (
      v_escritorio_id, p_cartao_id, p_descricao, p_categoria, p_fornecedor, p_valor,
      'unica', 1, 1, v_compra_id,
      p_data_compra, v_mes_referencia, p_processo_id, p_documento_fiscal,
      p_observacoes, p_importado_de_fatura, v_hash
    );

  ELSIF p_tipo = 'parcelada' THEN
    -- Compra parcelada: N registros
    v_valor_parcela := ROUND(p_valor / p_parcelas, 2);

    FOR i IN 1..p_parcelas LOOP
      INSERT INTO cartoes_credito_lancamentos (
        escritorio_id, cartao_id, descricao, categoria, fornecedor, valor,
        tipo, parcela_numero, parcela_total, compra_id,
        data_compra, mes_referencia, processo_id, documento_fiscal,
        observacoes, importado_de_fatura, hash_transacao
      ) VALUES (
        v_escritorio_id, p_cartao_id, p_descricao, p_categoria, p_fornecedor, v_valor_parcela,
        'parcelada', i, p_parcelas, v_compra_id,
        p_data_compra, (v_mes_referencia + ((i-1) || ' months')::interval)::date,
        p_processo_id, p_documento_fiscal, p_observacoes, p_importado_de_fatura,
        CASE WHEN i = 1 THEN v_hash ELSE NULL END -- hash so na primeira
      );
    END LOOP;

  ELSIF p_tipo = 'recorrente' THEN
    -- Recorrente: apenas 1 registro inicial
    INSERT INTO cartoes_credito_lancamentos (
      escritorio_id, cartao_id, descricao, categoria, fornecedor, valor,
      tipo, parcela_numero, parcela_total, compra_id,
      data_compra, mes_referencia, recorrente_ativo,
      processo_id, documento_fiscal, observacoes, importado_de_fatura, hash_transacao
    ) VALUES (
      v_escritorio_id, p_cartao_id, p_descricao, p_categoria, p_fornecedor, p_valor,
      'recorrente', 1, 1, v_compra_id,
      p_data_compra, v_mes_referencia, true,
      p_processo_id, p_documento_fiscal, p_observacoes, p_importado_de_fatura, v_hash
    );
  END IF;

  RETURN v_compra_id;
END;
$$;

COMMENT ON FUNCTION criar_lancamento_cartao IS 'Cria lancamento(s) no cartao: unico, parcelado ou recorrente';

-- =====================================================
-- 5. FUNCAO: GERAR LANCAMENTOS RECORRENTES PARA UM MES
-- =====================================================
CREATE OR REPLACE FUNCTION gerar_lancamentos_recorrentes(
  p_cartao_id UUID,
  p_mes_referencia DATE
) RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER := 0;
  v_lancamento RECORD;
  v_mes DATE := DATE_TRUNC('month', p_mes_referencia)::DATE;
  v_novo_numero INTEGER;
BEGIN
  -- Para cada recorrente ativo que nao tem lancamento nesse mes
  FOR v_lancamento IN
    SELECT DISTINCT ON (compra_id)
      escritorio_id, cartao_id, descricao, categoria, fornecedor, valor,
      compra_id, data_compra, recorrente_ativo, recorrente_data_fim,
      processo_id
    FROM cartoes_credito_lancamentos
    WHERE cartao_id = p_cartao_id
      AND tipo = 'recorrente'
      AND recorrente_ativo = true
      AND (recorrente_data_fim IS NULL OR recorrente_data_fim >= v_mes)
      AND data_compra <= v_mes -- so gera se a assinatura ja existia
    ORDER BY compra_id, mes_referencia DESC
  LOOP
    -- Verificar se ja existe lancamento nesse mes
    IF NOT EXISTS (
      SELECT 1 FROM cartoes_credito_lancamentos
      WHERE compra_id = v_lancamento.compra_id
        AND mes_referencia = v_mes
    ) THEN
      -- Calcular proximo numero da parcela
      SELECT COALESCE(MAX(parcela_numero), 0) + 1 INTO v_novo_numero
      FROM cartoes_credito_lancamentos
      WHERE compra_id = v_lancamento.compra_id;

      -- Criar novo lancamento
      INSERT INTO cartoes_credito_lancamentos (
        escritorio_id, cartao_id, descricao, categoria, fornecedor, valor,
        tipo, parcela_numero, parcela_total, compra_id,
        data_compra, mes_referencia, recorrente_ativo, recorrente_data_fim,
        processo_id
      ) VALUES (
        v_lancamento.escritorio_id, v_lancamento.cartao_id,
        v_lancamento.descricao, v_lancamento.categoria, v_lancamento.fornecedor, v_lancamento.valor,
        'recorrente', v_novo_numero, 1, v_lancamento.compra_id,
        v_lancamento.data_compra, v_mes, v_lancamento.recorrente_ativo, v_lancamento.recorrente_data_fim,
        v_lancamento.processo_id
      );

      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION gerar_lancamentos_recorrentes IS 'Gera lancamentos de assinaturas recorrentes para um mes especifico';

-- =====================================================
-- 6. FUNCAO: CANCELAR LANCAMENTO RECORRENTE
-- =====================================================
CREATE OR REPLACE FUNCTION cancelar_lancamento_recorrente(
  p_compra_id UUID,
  p_data_fim DATE DEFAULT CURRENT_DATE
) RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE cartoes_credito_lancamentos
  SET recorrente_ativo = false,
      recorrente_data_fim = p_data_fim,
      updated_at = NOW()
  WHERE compra_id = p_compra_id
    AND tipo = 'recorrente';

  RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION cancelar_lancamento_recorrente IS 'Cancela uma assinatura recorrente';

-- =====================================================
-- 7. FUNCAO: REATIVAR LANCAMENTO RECORRENTE
-- =====================================================
CREATE OR REPLACE FUNCTION reativar_lancamento_recorrente(
  p_compra_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE cartoes_credito_lancamentos
  SET recorrente_ativo = true,
      recorrente_data_fim = NULL,
      updated_at = NOW()
  WHERE compra_id = p_compra_id
    AND tipo = 'recorrente';

  RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION reativar_lancamento_recorrente IS 'Reativa uma assinatura recorrente cancelada';

-- =====================================================
-- 8. FUNCAO: OBTER LANCAMENTOS DO MES (COM GERACAO DE RECORRENTES)
-- =====================================================
CREATE OR REPLACE FUNCTION obter_lancamentos_mes(
  p_cartao_id UUID,
  p_mes_referencia DATE
) RETURNS TABLE (
  id UUID,
  descricao TEXT,
  categoria TEXT,
  fornecedor TEXT,
  valor NUMERIC,
  tipo TEXT,
  parcela_numero INTEGER,
  parcela_total INTEGER,
  compra_id UUID,
  data_compra DATE,
  mes_referencia DATE,
  recorrente_ativo BOOLEAN,
  recorrente_data_fim DATE,
  faturado BOOLEAN,
  fatura_id UUID
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_mes DATE := DATE_TRUNC('month', p_mes_referencia)::DATE;
  v_recorrentes_gerados INTEGER;
BEGIN
  -- Primeiro, gerar lancamentos recorrentes para este mes
  SELECT gerar_lancamentos_recorrentes(p_cartao_id, v_mes) INTO v_recorrentes_gerados;

  -- Retornar todos os lancamentos do mes
  RETURN QUERY
  SELECT
    l.id,
    l.descricao,
    l.categoria,
    l.fornecedor,
    l.valor,
    l.tipo,
    l.parcela_numero,
    l.parcela_total,
    l.compra_id,
    l.data_compra,
    l.mes_referencia,
    l.recorrente_ativo,
    l.recorrente_data_fim,
    l.faturado,
    l.fatura_id
  FROM cartoes_credito_lancamentos l
  WHERE l.cartao_id = p_cartao_id
    AND l.mes_referencia = v_mes
  ORDER BY l.data_compra, l.descricao;
END;
$$;

COMMENT ON FUNCTION obter_lancamentos_mes IS 'Retorna lancamentos do mes, gerando recorrentes se necessario';

-- =====================================================
-- 9. ATUALIZAR FUNCAO: FECHAR FATURA (USAR NOVA TABELA)
-- =====================================================
CREATE OR REPLACE FUNCTION fechar_fatura_cartao(
  p_cartao_id UUID,
  p_mes_referencia DATE
) RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_cartao RECORD;
  v_fatura_id UUID;
  v_despesa_id UUID;
  v_valor_total NUMERIC;
  v_data_fechamento DATE;
  v_data_vencimento DATE;
  v_ultimo_dia_mes DATE;
  v_descricao_fatura TEXT;
  v_mes DATE := DATE_TRUNC('month', p_mes_referencia)::DATE;
BEGIN
  -- Buscar informacoes do cartao
  SELECT * INTO v_cartao
  FROM cartoes_credito
  WHERE id = p_cartao_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cartao nao encontrado: %', p_cartao_id;
  END IF;

  -- Gerar lancamentos recorrentes primeiro
  PERFORM gerar_lancamentos_recorrentes(p_cartao_id, v_mes);

  -- Calcular datas
  v_data_fechamento := calcular_data_fechamento_cartao(p_cartao_id, v_mes);

  -- Calcular data de vencimento
  v_ultimo_dia_mes := (DATE_TRUNC('month', v_mes) + INTERVAL '1 month - 1 day')::DATE;
  IF v_cartao.dia_vencimento > EXTRACT(DAY FROM v_ultimo_dia_mes) THEN
    v_data_vencimento := v_ultimo_dia_mes;
  ELSE
    v_data_vencimento := make_date(
      EXTRACT(YEAR FROM v_mes)::INT,
      EXTRACT(MONTH FROM v_mes)::INT,
      v_cartao.dia_vencimento
    );
  END IF;

  -- Calcular valor total dos lancamentos nao faturados do mes
  SELECT COALESCE(SUM(valor), 0) INTO v_valor_total
  FROM cartoes_credito_lancamentos
  WHERE cartao_id = p_cartao_id
    AND mes_referencia = v_mes
    AND faturado = false;

  -- Verificar se ja existe fatura para este mes
  SELECT id, despesa_id INTO v_fatura_id, v_despesa_id
  FROM cartoes_credito_faturas
  WHERE cartao_id = p_cartao_id
    AND mes_referencia = v_mes;

  -- Descricao para a fatura e despesa
  v_descricao_fatura := 'Fatura ' || v_cartao.nome || ' - ' || TO_CHAR(v_mes, 'MM/YYYY');

  IF v_fatura_id IS NULL THEN
    -- Criar nova fatura
    INSERT INTO cartoes_credito_faturas (
      escritorio_id, cartao_id, mes_referencia,
      data_fechamento, data_vencimento, valor_total, status
    ) VALUES (
      v_cartao.escritorio_id, p_cartao_id, v_mes,
      v_data_fechamento, v_data_vencimento, v_valor_total, 'fechada'
    )
    RETURNING id INTO v_fatura_id;
  ELSE
    -- Atualizar fatura existente
    UPDATE cartoes_credito_faturas
    SET valor_total = v_valor_total,
        data_fechamento = v_data_fechamento,
        data_vencimento = v_data_vencimento,
        status = 'fechada',
        updated_at = NOW()
    WHERE id = v_fatura_id;
  END IF;

  -- Marcar lancamentos como faturados
  UPDATE cartoes_credito_lancamentos
  SET faturado = true,
      fatura_id = v_fatura_id,
      updated_at = NOW()
  WHERE cartao_id = p_cartao_id
    AND mes_referencia = v_mes
    AND faturado = false;

  -- Criar/atualizar lancamento na tabela financeiro_despesas
  IF v_valor_total > 0 THEN
    IF v_despesa_id IS NULL THEN
      INSERT INTO financeiro_despesas (
        escritorio_id, categoria, fornecedor, descricao,
        valor, data_vencimento, forma_pagamento, status
      ) VALUES (
        v_cartao.escritorio_id, 'cartao_credito',
        v_cartao.banco || ' - ' || v_cartao.nome, v_descricao_fatura,
        v_valor_total, v_data_vencimento, 'cartao', 'pendente'
      )
      RETURNING id INTO v_despesa_id;

      UPDATE cartoes_credito_faturas
      SET despesa_id = v_despesa_id
      WHERE id = v_fatura_id;
    ELSE
      UPDATE financeiro_despesas
      SET valor = v_valor_total,
          descricao = v_descricao_fatura,
          data_vencimento = v_data_vencimento,
          updated_at = NOW()
      WHERE id = v_despesa_id;
    END IF;
  END IF;

  RETURN v_fatura_id;
END;
$$;

-- =====================================================
-- 10. ATUALIZAR FUNCAO: OBTER FATURA ATUAL
-- =====================================================
CREATE OR REPLACE FUNCTION obter_fatura_atual_cartao(
  p_cartao_id UUID
) RETURNS TABLE (
  fatura_id UUID,
  mes_referencia DATE,
  data_fechamento DATE,
  data_vencimento DATE,
  valor_total NUMERIC,
  status TEXT,
  total_lancamentos INTEGER,
  dias_para_fechamento INTEGER,
  dias_para_vencimento INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_mes_atual DATE;
  v_data_fechamento DATE;
  v_data_vencimento DATE;
  v_cartao RECORD;
BEGIN
  v_mes_atual := DATE_TRUNC('month', CURRENT_DATE)::DATE;

  -- Buscar cartao
  SELECT * INTO v_cartao FROM cartoes_credito WHERE id = p_cartao_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Gerar recorrentes para o mes atual
  PERFORM gerar_lancamentos_recorrentes(p_cartao_id, v_mes_atual);

  -- Calcular datas
  v_data_fechamento := calcular_data_fechamento_cartao(p_cartao_id, v_mes_atual);

  DECLARE v_ultimo_dia_mes DATE;
  BEGIN
    v_ultimo_dia_mes := (DATE_TRUNC('month', v_mes_atual) + INTERVAL '1 month - 1 day')::DATE;
    IF v_cartao.dia_vencimento > EXTRACT(DAY FROM v_ultimo_dia_mes) THEN
      v_data_vencimento := v_ultimo_dia_mes;
    ELSE
      v_data_vencimento := make_date(
        EXTRACT(YEAR FROM v_mes_atual)::INT,
        EXTRACT(MONTH FROM v_mes_atual)::INT,
        v_cartao.dia_vencimento
      );
    END IF;
  END;

  -- Retornar fatura existente ou dados calculados
  RETURN QUERY
  SELECT
    COALESCE(f.id, NULL::UUID) AS fatura_id,
    v_mes_atual AS mes_referencia,
    COALESCE(f.data_fechamento, v_data_fechamento) AS data_fechamento,
    COALESCE(f.data_vencimento, v_data_vencimento) AS data_vencimento,
    COALESCE(f.valor_total, (
      SELECT COALESCE(SUM(l.valor), 0)
      FROM cartoes_credito_lancamentos l
      WHERE l.cartao_id = p_cartao_id
        AND l.mes_referencia = v_mes_atual
    )) AS valor_total,
    COALESCE(f.status, 'aberta') AS status,
    (
      SELECT COUNT(*)::INTEGER
      FROM cartoes_credito_lancamentos l
      WHERE l.cartao_id = p_cartao_id
        AND l.mes_referencia = v_mes_atual
    ) AS total_lancamentos,
    (v_data_fechamento - CURRENT_DATE)::INTEGER AS dias_para_fechamento,
    (v_data_vencimento - CURRENT_DATE)::INTEGER AS dias_para_vencimento
  FROM cartoes_credito_faturas f
  WHERE f.cartao_id = p_cartao_id
    AND f.mes_referencia = v_mes_atual

  UNION ALL

  SELECT
    NULL::UUID,
    v_mes_atual,
    v_data_fechamento,
    v_data_vencimento,
    (
      SELECT COALESCE(SUM(l.valor), 0)
      FROM cartoes_credito_lancamentos l
      WHERE l.cartao_id = p_cartao_id
        AND l.mes_referencia = v_mes_atual
    ),
    'aberta',
    (
      SELECT COUNT(*)::INTEGER
      FROM cartoes_credito_lancamentos l
      WHERE l.cartao_id = p_cartao_id
        AND l.mes_referencia = v_mes_atual
    ),
    (v_data_fechamento - CURRENT_DATE)::INTEGER,
    (v_data_vencimento - CURRENT_DATE)::INTEGER
  WHERE NOT EXISTS (
    SELECT 1 FROM cartoes_credito_faturas
    WHERE cartao_id = p_cartao_id
      AND mes_referencia = v_mes_atual
  )

  LIMIT 1;
END;
$$;

-- =====================================================
-- 11. TRIGGER: RECALCULAR TOTAL DA FATURA (NOVA TABELA)
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_recalcular_total_fatura_cartao()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_fatura_id UUID;
  v_novo_total NUMERIC;
BEGIN
  -- Determinar qual fatura foi afetada
  IF TG_OP = 'DELETE' THEN
    v_fatura_id := OLD.fatura_id;
  ELSE
    v_fatura_id := NEW.fatura_id;
  END IF;

  -- Se tem fatura vinculada, recalcular
  IF v_fatura_id IS NOT NULL THEN
    -- Recalcular total
    SELECT COALESCE(SUM(valor), 0) INTO v_novo_total
    FROM cartoes_credito_lancamentos
    WHERE fatura_id = v_fatura_id;

    -- Atualizar fatura
    UPDATE cartoes_credito_faturas
    SET valor_total = v_novo_total, updated_at = NOW()
    WHERE id = v_fatura_id;

    -- Atualizar despesa vinculada
    UPDATE financeiro_despesas d
    SET valor = v_novo_total, updated_at = NOW()
    FROM cartoes_credito_faturas f
    WHERE f.id = v_fatura_id AND d.id = f.despesa_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Criar trigger na nova tabela
DROP TRIGGER IF EXISTS trigger_lancamento_fatura_update ON cartoes_credito_lancamentos;
CREATE TRIGGER trigger_lancamento_fatura_update
  AFTER INSERT OR UPDATE OR DELETE ON cartoes_credito_lancamentos
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalcular_total_fatura_cartao();

-- =====================================================
-- 12. RLS POLICIES PARA NOVA TABELA
-- =====================================================
ALTER TABLE cartoes_credito_lancamentos ENABLE ROW LEVEL SECURITY;

-- Policy para SELECT
CREATE POLICY "Usuarios veem lancamentos do seu escritorio"
  ON cartoes_credito_lancamentos
  FOR SELECT
  USING (
    escritorio_id IN (
      SELECT eu.escritorio_id
      FROM escritorios_usuarios eu
      WHERE eu.user_id = auth.uid()
    )
  );

-- Policy para INSERT
CREATE POLICY "Usuarios criam lancamentos no seu escritorio"
  ON cartoes_credito_lancamentos
  FOR INSERT
  WITH CHECK (
    escritorio_id IN (
      SELECT eu.escritorio_id
      FROM escritorios_usuarios eu
      WHERE eu.user_id = auth.uid()
    )
  );

-- Policy para UPDATE
CREATE POLICY "Usuarios atualizam lancamentos do seu escritorio"
  ON cartoes_credito_lancamentos
  FOR UPDATE
  USING (
    escritorio_id IN (
      SELECT eu.escritorio_id
      FROM escritorios_usuarios eu
      WHERE eu.user_id = auth.uid()
    )
  );

-- Policy para DELETE
CREATE POLICY "Usuarios deletam lancamentos do seu escritorio"
  ON cartoes_credito_lancamentos
  FOR DELETE
  USING (
    escritorio_id IN (
      SELECT eu.escritorio_id
      FROM escritorios_usuarios eu
      WHERE eu.user_id = auth.uid()
    )
  );

-- =====================================================
-- 13. FUNCAO: EXCLUIR LANCAMENTO
-- =====================================================
CREATE OR REPLACE FUNCTION excluir_lancamento_cartao(
  p_lancamento_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_lancamento RECORD;
BEGIN
  -- Buscar lancamento
  SELECT * INTO v_lancamento
  FROM cartoes_credito_lancamentos
  WHERE id = p_lancamento_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Nao permitir excluir se ja faturado
  IF v_lancamento.faturado THEN
    RAISE EXCEPTION 'Nao e possivel excluir lancamento ja faturado';
  END IF;

  -- Se for parcelada ou recorrente, excluir todos da mesma compra que nao foram faturados
  IF v_lancamento.tipo IN ('parcelada', 'recorrente') THEN
    DELETE FROM cartoes_credito_lancamentos
    WHERE compra_id = v_lancamento.compra_id
      AND faturado = false;
  ELSE
    DELETE FROM cartoes_credito_lancamentos
    WHERE id = p_lancamento_id;
  END IF;

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION excluir_lancamento_cartao IS 'Exclui lancamento(s) nao faturados. Para parceladas/recorrentes, exclui todos da mesma compra.';

-- =====================================================
-- OBSERVACAO: TABELAS ANTIGAS MANTIDAS PARA BACKUP
-- =====================================================
-- As tabelas cartoes_credito_despesas e cartoes_credito_parcelas
-- foram mantidas para backup. Apos validar que tudo funciona,
-- podem ser removidas com:
-- DROP TABLE cartoes_credito_parcelas;
-- DROP TABLE cartoes_credito_despesas;
