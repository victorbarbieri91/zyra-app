-- =====================================================
-- MÓDULO CARTÕES DE CRÉDITO - FUNÇÕES
-- =====================================================
-- Migration: Funções de negócio para cartões de crédito
-- - calcular_data_fechamento_cartao
-- - criar_despesa_cartao
-- - fechar_fatura_cartao
-- - auto_fechar_faturas_cartao
-- - calcular_hash_transacao_cartao
-- =====================================================

-- =====================================================
-- 1. CALCULAR DATA DE FECHAMENTO DO CARTÃO
-- =====================================================
-- Calcula a data de fechamento considerando:
-- - Dias antes do vencimento
-- - Ajuste para dias úteis (não cai em fim de semana/feriado)
-- =====================================================

CREATE OR REPLACE FUNCTION calcular_data_fechamento_cartao(
  p_cartao_id UUID,
  p_mes_referencia DATE
) RETURNS DATE
LANGUAGE plpgsql
AS $$
DECLARE
  v_cartao RECORD;
  v_data_vencimento DATE;
  v_data_fechamento DATE;
  v_ultimo_dia_mes DATE;
BEGIN
  -- Buscar configuração do cartão
  SELECT * INTO v_cartao
  FROM cartoes_credito
  WHERE id = p_cartao_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cartão não encontrado: %', p_cartao_id;
  END IF;

  -- Calcular último dia do mês de referência
  v_ultimo_dia_mes := (DATE_TRUNC('month', p_mes_referencia) + INTERVAL '1 month - 1 day')::DATE;

  -- Calcular data de vencimento (ajustando se dia não existe no mês)
  IF v_cartao.dia_vencimento > EXTRACT(DAY FROM v_ultimo_dia_mes) THEN
    v_data_vencimento := v_ultimo_dia_mes;
  ELSE
    v_data_vencimento := make_date(
      EXTRACT(YEAR FROM p_mes_referencia)::INT,
      EXTRACT(MONTH FROM p_mes_referencia)::INT,
      v_cartao.dia_vencimento
    );
  END IF;

  -- Calcular data de fechamento (X dias antes do vencimento)
  v_data_fechamento := v_data_vencimento - v_cartao.dias_antes_fechamento;

  -- Ajustar para dia útil anterior se cair em fim de semana ou feriado
  WHILE EXTRACT(DOW FROM v_data_fechamento) IN (0, 6) -- 0 = domingo, 6 = sábado
        OR EXISTS (
          SELECT 1 FROM agenda_feriados
          WHERE data = v_data_fechamento
          AND (escritorio_id IS NULL OR escritorio_id = v_cartao.escritorio_id)
        )
  LOOP
    v_data_fechamento := v_data_fechamento - 1;
  END LOOP;

  RETURN v_data_fechamento;
END;
$$;

COMMENT ON FUNCTION calcular_data_fechamento_cartao IS 'Calcula a data de fechamento da fatura do cartão, ajustando para dia útil';

-- =====================================================
-- 2. CALCULAR HASH DE TRANSAÇÃO (para duplicatas)
-- =====================================================

CREATE OR REPLACE FUNCTION calcular_hash_transacao_cartao(
  p_data DATE,
  p_descricao TEXT,
  p_valor NUMERIC
) RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN md5(
    p_data::TEXT || '|' ||
    LOWER(TRIM(REGEXP_REPLACE(p_descricao, '\s+', ' ', 'g'))) || '|' ||
    ROUND(p_valor, 2)::TEXT
  );
END;
$$;

COMMENT ON FUNCTION calcular_hash_transacao_cartao IS 'Gera hash para detecção de transações duplicadas na importação';

-- =====================================================
-- 3. CRIAR DESPESA NO CARTÃO
-- =====================================================
-- Cria uma despesa no cartão e gera as parcelas automaticamente
-- Determina em qual fatura cada parcela entrará
-- =====================================================

CREATE OR REPLACE FUNCTION criar_despesa_cartao(
  p_cartao_id UUID,
  p_descricao TEXT,
  p_categoria TEXT,
  p_fornecedor TEXT,
  p_valor_total NUMERIC,
  p_numero_parcelas INTEGER DEFAULT 1,
  p_data_compra DATE DEFAULT CURRENT_DATE,
  p_processo_id UUID DEFAULT NULL,
  p_documento_fiscal TEXT DEFAULT NULL,
  p_observacoes TEXT DEFAULT NULL,
  p_importado_de_fatura BOOLEAN DEFAULT false
) RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_cartao RECORD;
  v_despesa_id UUID;
  v_valor_parcela NUMERIC;
  v_mes_referencia DATE;
  v_data_fechamento DATE;
  v_hash TEXT;
  i INTEGER;
BEGIN
  -- Buscar informações do cartão
  SELECT * INTO v_cartao
  FROM cartoes_credito
  WHERE id = p_cartao_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cartão não encontrado: %', p_cartao_id;
  END IF;

  -- Validar número de parcelas
  IF p_numero_parcelas < 1 THEN
    RAISE EXCEPTION 'Número de parcelas deve ser pelo menos 1';
  END IF;

  -- Calcular valor da parcela (arredondado para 2 casas)
  v_valor_parcela := ROUND(p_valor_total / p_numero_parcelas, 2);

  -- Gerar hash da transação
  v_hash := calcular_hash_transacao_cartao(p_data_compra, p_descricao, p_valor_total);

  -- Criar registro da despesa
  INSERT INTO cartoes_credito_financeiro_despesas (
    escritorio_id,
    cartao_id,
    descricao,
    categoria,
    fornecedor,
    valor_total,
    numero_parcelas,
    valor_parcela,
    data_compra,
    processo_id,
    documento_fiscal,
    observacoes,
    importado_de_fatura,
    hash_transacao
  ) VALUES (
    v_cartao.escritorio_id,
    p_cartao_id,
    p_descricao,
    p_categoria,
    p_fornecedor,
    p_valor_total,
    p_numero_parcelas,
    v_valor_parcela,
    p_data_compra,
    p_processo_id,
    p_documento_fiscal,
    p_observacoes,
    p_importado_de_fatura,
    v_hash
  )
  RETURNING id INTO v_despesa_id;

  -- Determinar o mês de referência da primeira parcela
  -- Se a compra foi antes da data de fechamento do mês atual, entra no mês atual
  -- Caso contrário, entra no próximo mês
  v_data_fechamento := calcular_data_fechamento_cartao(
    p_cartao_id,
    DATE_TRUNC('month', p_data_compra)::DATE
  );

  IF p_data_compra <= v_data_fechamento THEN
    v_mes_referencia := DATE_TRUNC('month', p_data_compra)::DATE;
  ELSE
    v_mes_referencia := (DATE_TRUNC('month', p_data_compra) + INTERVAL '1 month')::DATE;
  END IF;

  -- Criar parcelas
  FOR i IN 1..p_numero_parcelas LOOP
    INSERT INTO cartoes_credito_parcelas (
      despesa_id,
      numero_parcela,
      valor,
      mes_referencia,
      faturada
    ) VALUES (
      v_despesa_id,
      i,
      v_valor_parcela,
      v_mes_referencia,
      false
    );

    -- Próxima parcela vai para o próximo mês
    v_mes_referencia := (v_mes_referencia + INTERVAL '1 month')::DATE;
  END LOOP;

  RETURN v_despesa_id;
END;
$$;

COMMENT ON FUNCTION criar_despesa_cartao IS 'Cria uma despesa no cartão de crédito com geração automática de parcelas';

-- =====================================================
-- 4. FECHAR FATURA DO CARTÃO
-- =====================================================
-- Fecha a fatura do mês especificado:
-- - Agrupa todas as parcelas do mês
-- - Cria/atualiza registro da fatura
-- - Cria lançamento único na tabela financeiro_despesas
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
BEGIN
  -- Buscar informações do cartão
  SELECT * INTO v_cartao
  FROM cartoes_credito
  WHERE id = p_cartao_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cartão não encontrado: %', p_cartao_id;
  END IF;

  -- Calcular datas
  v_data_fechamento := calcular_data_fechamento_cartao(p_cartao_id, p_mes_referencia);

  -- Calcular data de vencimento
  v_ultimo_dia_mes := (DATE_TRUNC('month', p_mes_referencia) + INTERVAL '1 month - 1 day')::DATE;
  IF v_cartao.dia_vencimento > EXTRACT(DAY FROM v_ultimo_dia_mes) THEN
    v_data_vencimento := v_ultimo_dia_mes;
  ELSE
    v_data_vencimento := make_date(
      EXTRACT(YEAR FROM p_mes_referencia)::INT,
      EXTRACT(MONTH FROM p_mes_referencia)::INT,
      v_cartao.dia_vencimento
    );
  END IF;

  -- Calcular valor total das parcelas não faturadas do mês
  SELECT COALESCE(SUM(p.valor), 0) INTO v_valor_total
  FROM cartoes_credito_parcelas p
  JOIN cartoes_credito_financeiro_despesas d ON d.id = p.despesa_id
  WHERE d.cartao_id = p_cartao_id
    AND p.mes_referencia = DATE_TRUNC('month', p_mes_referencia)::DATE
    AND p.faturada = false;

  -- Verificar se já existe fatura para este mês
  SELECT id, despesa_id INTO v_fatura_id, v_despesa_id
  FROM cartoes_credito_faturas
  WHERE cartao_id = p_cartao_id
    AND mes_referencia = DATE_TRUNC('month', p_mes_referencia)::DATE;

  -- Descrição para a fatura e despesa
  v_descricao_fatura := 'Fatura ' || v_cartao.nome || ' - ' ||
    TO_CHAR(p_mes_referencia, 'MM/YYYY');

  IF v_fatura_id IS NULL THEN
    -- Criar nova fatura
    INSERT INTO cartoes_credito_faturas (
      escritorio_id,
      cartao_id,
      mes_referencia,
      data_fechamento,
      data_vencimento,
      valor_total,
      status
    ) VALUES (
      v_cartao.escritorio_id,
      p_cartao_id,
      DATE_TRUNC('month', p_mes_referencia)::DATE,
      v_data_fechamento,
      v_data_vencimento,
      v_valor_total,
      'fechada'
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

  -- Marcar parcelas como faturadas
  UPDATE cartoes_credito_parcelas p
  SET faturada = true, fatura_id = v_fatura_id
  FROM cartoes_credito_financeiro_despesas d
  WHERE d.id = p.despesa_id
    AND d.cartao_id = p_cartao_id
    AND p.mes_referencia = DATE_TRUNC('month', p_mes_referencia)::DATE
    AND p.faturada = false;

  -- Criar/atualizar lançamento na tabela financeiro_despesas (integração com receitas-financeiro_despesas)
  IF v_valor_total > 0 THEN
    IF v_despesa_id IS NULL THEN
      -- Criar nova despesa
      INSERT INTO financeiro_despesas (
        escritorio_id,
        categoria,
        fornecedor,
        descricao,
        valor,
        data_vencimento,
        forma_pagamento,
        status
      ) VALUES (
        v_cartao.escritorio_id,
        'cartao_credito',
        v_cartao.banco || ' - ' || v_cartao.nome,
        v_descricao_fatura,
        v_valor_total,
        v_data_vencimento,
        'cartao',
        'pendente'
      )
      RETURNING id INTO v_despesa_id;

      -- Vincular despesa à fatura
      UPDATE cartoes_credito_faturas
      SET despesa_id = v_despesa_id
      WHERE id = v_fatura_id;
    ELSE
      -- Atualizar despesa existente
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

COMMENT ON FUNCTION fechar_fatura_cartao IS 'Fecha a fatura do cartão para um mês específico e cria lançamento em financeiro_despesas';

-- =====================================================
-- 5. FECHAMENTO AUTOMÁTICO DE FATURAS
-- =====================================================
-- Função para ser executada diariamente
-- Fecha todas as faturas cujo dia de fechamento já passou
-- =====================================================

CREATE OR REPLACE FUNCTION auto_fechar_faturas_cartao()
RETURNS TABLE (
  cartao_id UUID,
  cartao_nome TEXT,
  mes_referencia DATE,
  fatura_id UUID,
  valor_total NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_cartao RECORD;
  v_mes_atual DATE;
  v_data_fechamento DATE;
  v_fatura_id UUID;
  v_valor NUMERIC;
BEGIN
  v_mes_atual := DATE_TRUNC('month', CURRENT_DATE)::DATE;

  -- Loop por todos os cartões ativos
  FOR v_cartao IN
    SELECT c.id, c.nome, c.escritorio_id
    FROM cartoes_credito c
    WHERE c.ativo = true
  LOOP
    -- Calcular data de fechamento para o mês atual
    v_data_fechamento := calcular_data_fechamento_cartao(v_cartao.id, v_mes_atual);

    -- Se hoje é >= data de fechamento
    IF CURRENT_DATE >= v_data_fechamento THEN
      -- Verificar se já tem fatura fechada para este mês
      IF NOT EXISTS (
        SELECT 1 FROM cartoes_credito_faturas
        WHERE cartao_id = v_cartao.id
          AND mes_referencia = v_mes_atual
          AND status IN ('fechada', 'paga')
      ) THEN
        -- Fechar a fatura
        v_fatura_id := fechar_fatura_cartao(v_cartao.id, v_mes_atual);

        -- Buscar valor total
        SELECT f.valor_total INTO v_valor
        FROM cartoes_credito_faturas f
        WHERE f.id = v_fatura_id;

        -- Retornar resultado
        cartao_id := v_cartao.id;
        cartao_nome := v_cartao.nome;
        mes_referencia := v_mes_atual;
        fatura_id := v_fatura_id;
        valor_total := v_valor;

        RETURN NEXT;
      END IF;
    END IF;
  END LOOP;

  RETURN;
END;
$$;

COMMENT ON FUNCTION auto_fechar_faturas_cartao IS 'Fecha automaticamente as faturas de todos os cartões cujo dia de fechamento já passou';

-- =====================================================
-- 6. OBTER FATURA ATUAL DO CARTÃO
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
  total_financeiro_despesas INTEGER,
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

  -- Buscar cartão
  SELECT * INTO v_cartao
  FROM cartoes_credito
  WHERE id = p_cartao_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Calcular datas
  v_data_fechamento := calcular_data_fechamento_cartao(p_cartao_id, v_mes_atual);

  -- Calcular data de vencimento
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
      SELECT COALESCE(SUM(p.valor), 0)
      FROM cartoes_credito_parcelas p
      JOIN cartoes_credito_financeiro_despesas d ON d.id = p.despesa_id
      WHERE d.cartao_id = p_cartao_id
        AND p.mes_referencia = v_mes_atual
    )) AS valor_total,
    COALESCE(f.status, 'aberta') AS status,
    (
      SELECT COUNT(DISTINCT d.id)::INTEGER
      FROM cartoes_credito_parcelas p
      JOIN cartoes_credito_financeiro_despesas d ON d.id = p.despesa_id
      WHERE d.cartao_id = p_cartao_id
        AND p.mes_referencia = v_mes_atual
    ) AS total_financeiro_despesas,
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
      SELECT COALESCE(SUM(p.valor), 0)
      FROM cartoes_credito_parcelas p
      JOIN cartoes_credito_financeiro_despesas d ON d.id = p.despesa_id
      WHERE d.cartao_id = p_cartao_id
        AND p.mes_referencia = v_mes_atual
    ),
    'aberta',
    (
      SELECT COUNT(DISTINCT d.id)::INTEGER
      FROM cartoes_credito_parcelas p
      JOIN cartoes_credito_financeiro_despesas d ON d.id = p.despesa_id
      WHERE d.cartao_id = p_cartao_id
        AND p.mes_referencia = v_mes_atual
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

COMMENT ON FUNCTION obter_fatura_atual_cartao IS 'Retorna informações da fatura atual (aberta ou calculada) do cartão';

-- =====================================================
-- 7. TRIGGER: SINCRONIZAR PAGAMENTO DESPESAS -> FATURAS
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_sync_pagamento_fatura_cartao()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Quando uma despesa de cartão de crédito é marcada como paga
  IF NEW.status = 'pago' AND (OLD.status IS NULL OR OLD.status != 'pago')
     AND NEW.categoria = 'cartao_credito' THEN
    -- Atualizar a fatura correspondente
    UPDATE cartoes_credito_faturas
    SET status = 'paga',
        data_pagamento = COALESCE(NEW.data_pagamento, CURRENT_DATE),
        updated_at = NOW()
    WHERE despesa_id = NEW.id
      AND status != 'paga';
  END IF;

  RETURN NEW;
END;
$$;

-- Criar trigger na tabela financeiro_despesas
DROP TRIGGER IF EXISTS trigger_despesa_paga_sync_fatura_cartao ON financeiro_despesas;
CREATE TRIGGER trigger_despesa_paga_sync_fatura_cartao
  AFTER UPDATE ON financeiro_despesas
  FOR EACH ROW
  WHEN (NEW.categoria = 'cartao_credito')
  EXECUTE FUNCTION trigger_sync_pagamento_fatura_cartao();

COMMENT ON FUNCTION trigger_sync_pagamento_fatura_cartao IS 'Sincroniza o status de pagamento da despesa com a fatura do cartão';

-- =====================================================
-- 8. TRIGGER: RECALCULAR TOTAL DA FATURA
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
    FROM cartoes_credito_parcelas
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

DROP TRIGGER IF EXISTS trigger_parcela_fatura_update ON cartoes_credito_parcelas;
CREATE TRIGGER trigger_parcela_fatura_update
  AFTER INSERT OR UPDATE OR DELETE ON cartoes_credito_parcelas
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalcular_total_fatura_cartao();

COMMENT ON FUNCTION trigger_recalcular_total_fatura_cartao IS 'Recalcula o total da fatura quando parcelas são modificadas';
