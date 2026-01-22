-- Migration: Criar funções SQL do financeiro
-- Data: 2025-01-22
-- Descrição: Funções para recorrência, pagamento parcial e automações

-- ============================================================
-- 1. FUNÇÃO: CALCULAR PRÓXIMO VENCIMENTO
-- ============================================================

CREATE OR REPLACE FUNCTION calcular_proximo_vencimento(
  p_ultima_data DATE,
  p_frequencia TEXT,
  p_dia_vencimento INTEGER DEFAULT NULL
) RETURNS DATE
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_proximo DATE;
  v_dia INTEGER;
BEGIN
  -- Determinar o dia do vencimento
  v_dia := COALESCE(p_dia_vencimento, EXTRACT(DAY FROM p_ultima_data)::integer);

  -- Calcular próxima data baseado na frequência
  v_proximo := CASE p_frequencia
    WHEN 'mensal' THEN p_ultima_data + INTERVAL '1 month'
    WHEN 'trimestral' THEN p_ultima_data + INTERVAL '3 months'
    WHEN 'semestral' THEN p_ultima_data + INTERVAL '6 months'
    WHEN 'anual' THEN p_ultima_data + INTERVAL '1 year'
    ELSE p_ultima_data + INTERVAL '1 month'
  END;

  -- Ajustar para o dia do vencimento desejado
  -- Se o mês não tem esse dia (ex: 31 em fevereiro), usa último dia do mês
  v_proximo := MAKE_DATE(
    EXTRACT(YEAR FROM v_proximo)::integer,
    EXTRACT(MONTH FROM v_proximo)::integer,
    LEAST(v_dia, DATE_PART('days', DATE_TRUNC('month', v_proximo) + INTERVAL '1 month - 1 day')::integer)
  );

  RETURN v_proximo;
END;
$$;

COMMENT ON FUNCTION calcular_proximo_vencimento IS
'Calcula a próxima data de vencimento baseada na frequência de recorrência';

-- ============================================================
-- 2. FUNÇÃO: RECEBER RECEITA COM PAGAMENTO PARCIAL
-- ============================================================

CREATE OR REPLACE FUNCTION receber_receita_parcial(
  p_receita_id UUID,
  p_valor_pago NUMERIC,
  p_nova_data_vencimento DATE,
  p_conta_bancaria_id UUID,
  p_forma_pagamento TEXT DEFAULT 'pix'
) RETURNS UUID -- Retorna ID da receita de saldo (se houver)
LANGUAGE plpgsql AS $$
DECLARE
  v_receita RECORD;
  v_saldo NUMERIC;
  v_saldo_receita_id UUID := NULL;
BEGIN
  -- Buscar receita
  SELECT * INTO v_receita
  FROM financeiro_receitas
  WHERE id = p_receita_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Receita não encontrada: %', p_receita_id;
  END IF;

  -- Verificar se já está paga ou cancelada
  IF v_receita.status IN ('pago', 'cancelado') THEN
    RAISE EXCEPTION 'Receita já está % e não pode receber pagamento', v_receita.status;
  END IF;

  -- Calcular saldo restante
  v_saldo := v_receita.valor - COALESCE(v_receita.valor_pago, 0) - p_valor_pago;

  IF v_saldo > 0.01 THEN -- Margem para arredondamento
    -- Há saldo restante: criar nova receita de saldo
    INSERT INTO financeiro_receitas (
      escritorio_id,
      tipo,
      cliente_id,
      processo_id,
      consulta_id,
      contrato_id,
      receita_origem_id, -- Referência à original
      descricao,
      categoria,
      valor,
      data_competencia,
      data_vencimento,
      status,
      created_by
    ) VALUES (
      v_receita.escritorio_id,
      'saldo',
      v_receita.cliente_id,
      v_receita.processo_id,
      v_receita.consulta_id,
      v_receita.contrato_id,
      p_receita_id,
      'Saldo - ' || v_receita.descricao,
      v_receita.categoria,
      ROUND(v_saldo, 2),
      DATE_TRUNC('month', p_nova_data_vencimento)::date,
      p_nova_data_vencimento,
      'pendente',
      v_receita.created_by
    ) RETURNING id INTO v_saldo_receita_id;

    -- Atualizar original como parcialmente paga
    UPDATE financeiro_receitas
    SET valor_pago = COALESCE(valor_pago, 0) + p_valor_pago,
        status = 'parcial',
        data_pagamento = CURRENT_DATE,
        forma_pagamento = p_forma_pagamento,
        conta_bancaria_id = p_conta_bancaria_id,
        updated_at = now()
    WHERE id = p_receita_id;

  ELSE
    -- Pagamento total (saldo <= 0.01)
    UPDATE financeiro_receitas
    SET valor_pago = v_receita.valor, -- Paga o valor total
        status = 'pago',
        data_pagamento = CURRENT_DATE,
        forma_pagamento = p_forma_pagamento,
        conta_bancaria_id = p_conta_bancaria_id,
        updated_at = now()
    WHERE id = p_receita_id;
  END IF;

  RETURN v_saldo_receita_id;
END;
$$;

COMMENT ON FUNCTION receber_receita_parcial IS
'Recebe pagamento parcial de uma receita. Se houver saldo, cria nova receita com data de vencimento informada.';

-- ============================================================
-- 3. FUNÇÃO: RECEBER RECEITA TOTAL
-- ============================================================

CREATE OR REPLACE FUNCTION receber_receita(
  p_receita_id UUID,
  p_conta_bancaria_id UUID,
  p_forma_pagamento TEXT DEFAULT 'pix',
  p_valor_pago NUMERIC DEFAULT NULL, -- Se NULL, usa o valor da receita
  p_data_pagamento DATE DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql AS $$
DECLARE
  v_receita RECORD;
  v_valor NUMERIC;
BEGIN
  -- Buscar receita
  SELECT * INTO v_receita
  FROM financeiro_receitas
  WHERE id = p_receita_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Receita não encontrada: %', p_receita_id;
  END IF;

  -- Determinar valor
  v_valor := COALESCE(p_valor_pago, v_receita.valor);

  -- Atualizar receita
  UPDATE financeiro_receitas
  SET valor_pago = v_valor,
      status = 'pago',
      data_pagamento = COALESCE(p_data_pagamento, CURRENT_DATE),
      forma_pagamento = p_forma_pagamento,
      conta_bancaria_id = p_conta_bancaria_id,
      updated_at = now()
  WHERE id = p_receita_id;

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION receber_receita IS
'Recebe pagamento total de uma receita';

-- ============================================================
-- 4. FUNÇÃO: GERAR LANÇAMENTOS RECORRENTES
-- ============================================================

CREATE OR REPLACE FUNCTION gerar_lancamentos_recorrentes()
RETURNS INTEGER
LANGUAGE plpgsql AS $$
DECLARE
  v_count INTEGER := 0;
  v_receita RECORD;
  v_despesa RECORD;
  v_config JSONB;
  v_proximo_vencimento DATE;
  v_data_fim DATE;
  v_dia_vencimento INTEGER;
  v_frequencia TEXT;
  v_ultima_geracao DATE;
BEGIN
  -- ============================================
  -- GERAR RECEITAS RECORRENTES
  -- ============================================
  FOR v_receita IN
    SELECT * FROM financeiro_receitas
    WHERE recorrente = true
      AND status NOT IN ('cancelado')
      AND config_recorrencia IS NOT NULL
      AND despesa_pai_id IS NULL -- Evita processar filhos
  LOOP
    v_config := v_receita.config_recorrencia;
    v_frequencia := v_config->>'frequencia';
    v_dia_vencimento := (v_config->>'dia_vencimento')::integer;
    v_data_fim := (v_config->>'data_fim')::date;
    v_ultima_geracao := COALESCE((v_config->>'ultima_geracao')::date, v_receita.data_vencimento);

    -- Calcular próximo vencimento
    v_proximo_vencimento := calcular_proximo_vencimento(
      v_ultima_geracao,
      v_frequencia,
      v_dia_vencimento
    );

    -- Verificar se deve gerar (próximo vencimento nos próximos 30 dias e antes do fim)
    IF v_proximo_vencimento <= CURRENT_DATE + INTERVAL '30 days'
       AND (v_data_fim IS NULL OR v_proximo_vencimento <= v_data_fim) THEN

      -- Verificar se não existe
      IF NOT EXISTS (
        SELECT 1 FROM financeiro_receitas
        WHERE receita_pai_id = v_receita.id
          AND data_vencimento = v_proximo_vencimento
      ) THEN
        -- Criar novo lançamento
        INSERT INTO financeiro_receitas (
          escritorio_id, tipo, cliente_id, processo_id, consulta_id, contrato_id,
          receita_pai_id, descricao, categoria, valor,
          data_competencia, data_vencimento, status, created_by
        ) VALUES (
          v_receita.escritorio_id, 'avulso', v_receita.cliente_id,
          v_receita.processo_id, v_receita.consulta_id, v_receita.contrato_id,
          v_receita.id, v_receita.descricao, v_receita.categoria, v_receita.valor,
          DATE_TRUNC('month', v_proximo_vencimento)::date, v_proximo_vencimento,
          'pendente', v_receita.created_by
        );

        -- Atualizar última geração
        UPDATE financeiro_receitas
        SET config_recorrencia = jsonb_set(
          config_recorrencia, '{ultima_geracao}',
          to_jsonb(v_proximo_vencimento::text)
        )
        WHERE id = v_receita.id;

        v_count := v_count + 1;
      END IF;
    END IF;
  END LOOP;

  -- ============================================
  -- GERAR DESPESAS RECORRENTES
  -- ============================================
  FOR v_despesa IN
    SELECT * FROM financeiro_despesas
    WHERE recorrente = true
      AND status NOT IN ('cancelado')
      AND config_recorrencia IS NOT NULL
      AND despesa_pai_id IS NULL -- Evita processar filhos
  LOOP
    v_config := v_despesa.config_recorrencia;
    v_frequencia := v_config->>'frequencia';
    v_dia_vencimento := (v_config->>'dia_vencimento')::integer;
    v_data_fim := (v_config->>'data_fim')::date;
    v_ultima_geracao := COALESCE((v_config->>'ultima_geracao')::date, v_despesa.data_vencimento);

    -- Calcular próximo vencimento
    v_proximo_vencimento := calcular_proximo_vencimento(
      v_ultima_geracao,
      v_frequencia,
      v_dia_vencimento
    );

    -- Verificar se deve gerar
    IF v_proximo_vencimento <= CURRENT_DATE + INTERVAL '30 days'
       AND (v_data_fim IS NULL OR v_proximo_vencimento <= v_data_fim) THEN

      -- Verificar se não existe
      IF NOT EXISTS (
        SELECT 1 FROM financeiro_despesas
        WHERE despesa_pai_id = v_despesa.id
          AND data_vencimento = v_proximo_vencimento
      ) THEN
        -- Criar novo lançamento
        INSERT INTO financeiro_despesas (
          escritorio_id, categoria, descricao, valor, data_vencimento,
          fornecedor, processo_id, cliente_id, despesa_pai_id, status
        ) VALUES (
          v_despesa.escritorio_id, v_despesa.categoria, v_despesa.descricao, v_despesa.valor,
          v_proximo_vencimento, v_despesa.fornecedor, v_despesa.processo_id, v_despesa.cliente_id,
          v_despesa.id, 'pendente'
        );

        -- Atualizar última geração
        UPDATE financeiro_despesas
        SET config_recorrencia = jsonb_set(
          config_recorrencia, '{ultima_geracao}',
          to_jsonb(v_proximo_vencimento::text)
        )
        WHERE id = v_despesa.id;

        v_count := v_count + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION gerar_lancamentos_recorrentes IS
'Gera automaticamente receitas e despesas recorrentes para os próximos 30 dias. Deve ser executada diariamente via cron.';

-- ============================================================
-- 5. FUNÇÃO: ATUALIZAR STATUS DE RECEITAS ATRASADAS
-- ============================================================

CREATE OR REPLACE FUNCTION atualizar_receitas_atrasadas()
RETURNS INTEGER
LANGUAGE plpgsql AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE financeiro_receitas
  SET status = 'atrasado',
      dias_atraso = CURRENT_DATE - data_vencimento
  WHERE status = 'pendente'
    AND data_vencimento < CURRENT_DATE;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION atualizar_receitas_atrasadas IS
'Atualiza status de receitas vencidas para "atrasado" e calcula dias de atraso';

-- ============================================================
-- 6. FUNÇÃO: CRIAR RECEITA SIMPLES (HELPER)
-- ============================================================

CREATE OR REPLACE FUNCTION criar_receita(
  p_escritorio_id UUID,
  p_cliente_id UUID,
  p_descricao TEXT,
  p_valor NUMERIC,
  p_data_vencimento DATE,
  p_processo_id UUID DEFAULT NULL,
  p_contrato_id UUID DEFAULT NULL,
  p_parcelado BOOLEAN DEFAULT false,
  p_numero_parcelas INTEGER DEFAULT 1,
  p_categoria TEXT DEFAULT 'honorario',
  p_created_by UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql AS $$
DECLARE
  v_receita_id UUID;
BEGIN
  INSERT INTO financeiro_receitas (
    escritorio_id, tipo, cliente_id, processo_id, contrato_id,
    descricao, categoria, valor,
    data_competencia, data_vencimento,
    parcelado, numero_parcelas,
    status, created_by
  ) VALUES (
    p_escritorio_id, 'honorario', p_cliente_id, p_processo_id, p_contrato_id,
    p_descricao, p_categoria, p_valor,
    DATE_TRUNC('month', p_data_vencimento)::date, p_data_vencimento,
    p_parcelado, p_numero_parcelas,
    'pendente', p_created_by
  ) RETURNING id INTO v_receita_id;

  -- Se parcelado, o trigger gerar_parcelas_receita cuidará de criar as parcelas

  RETURN v_receita_id;
END;
$$;

COMMENT ON FUNCTION criar_receita IS
'Helper para criar receitas. Se parcelado=true, gera parcelas automaticamente via trigger.';

-- ============================================================
-- 7. AGENDAR CRON JOBS (se pg_cron estiver disponível)
-- ============================================================

-- Nota: pg_cron precisa estar habilitado na instância Supabase
-- Os comandos abaixo são comentados para não gerar erro se não estiver disponível

-- SELECT cron.schedule(
--   'gerar-lancamentos-recorrentes',
--   '0 6 * * *', -- Todo dia às 6h
--   'SELECT gerar_lancamentos_recorrentes()'
-- );

-- SELECT cron.schedule(
--   'atualizar-receitas-atrasadas',
--   '0 1 * * *', -- Todo dia à 1h
--   'SELECT atualizar_receitas_atrasadas()'
-- );
