-- Migration: get_extrato_com_recorrentes
-- Cria função RPC que retorna lançamentos reais + virtuais para períodos futuros
-- Lançamentos virtuais são calculados on-the-fly para receitas/despesas recorrentes
-- sem nenhuma inserção no banco.

CREATE OR REPLACE FUNCTION get_extrato_com_recorrentes(
  p_escritorio_ids UUID[],
  p_data_inicio    DATE,
  p_data_fim       DATE
)
RETURNS TABLE (
  id                  UUID,
  escritorio_id       UUID,
  tipo_movimento      TEXT,
  status              TEXT,
  origem              TEXT,
  categoria           TEXT,
  descricao           TEXT,
  valor               NUMERIC,
  valor_pago          NUMERIC,
  data_referencia     DATE,
  data_vencimento     DATE,
  data_efetivacao     DATE,
  entidade            TEXT,
  conta_bancaria_id   UUID,
  conta_bancaria_nome TEXT,
  origem_id           UUID,
  processo_id         UUID,
  cliente_id          UUID,
  virtual             BOOLEAN,
  origem_pai_id       UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_receita    RECORD;
  v_despesa    RECORD;
  v_config     JSONB;
  v_frequencia TEXT;
  v_dia_vcto   INTEGER;
  v_data_fim_r DATE;
  v_ultima     DATE;
  v_next       DATE;
BEGIN
  -- -------------------------------------------------------
  -- 1. Entradas REAIS da view existente (virtual = false)
  -- -------------------------------------------------------
  RETURN QUERY
    SELECT
      v.id,
      v.escritorio_id,
      v.tipo_movimento,
      v.status,
      v.origem,
      v.categoria,
      v.descricao,
      v.valor,
      v.valor_pago,
      v.data_referencia,
      v.data_vencimento,
      v.data_efetivacao,
      v.entidade,
      v.conta_bancaria_id,
      v.conta_bancaria_nome,
      v.origem_id,
      v.processo_id,
      v.cliente_id,
      false         AS virtual,
      NULL::UUID    AS origem_pai_id
    FROM v_extrato_financeiro v
    WHERE v.escritorio_id = ANY(p_escritorio_ids)
      AND v.data_referencia BETWEEN p_data_inicio AND p_data_fim;

  -- -------------------------------------------------------
  -- 2. Virtuais para financeiro_receitas recorrentes
  -- -------------------------------------------------------
  FOR v_receita IN
    SELECT
      r.id, r.escritorio_id, r.tipo::text AS tipo_text,
      r.categoria::text AS categoria_text,
      r.descricao, r.valor, r.config_recorrencia,
      r.data_vencimento, r.conta_bancaria_id,
      r.processo_id, r.cliente_id
    FROM financeiro_receitas r
    WHERE r.escritorio_id = ANY(p_escritorio_ids)
      AND r.recorrente = true
      AND r.receita_pai_id IS NULL
      AND r.status != 'cancelado'
      AND r.config_recorrencia IS NOT NULL
  LOOP
    v_config     := v_receita.config_recorrencia;
    v_frequencia := COALESCE(v_config->>'frequencia', 'mensal');
    v_dia_vcto   := (v_config->>'dia_vencimento')::integer;
    v_data_fim_r := (v_config->>'data_fim')::date;           -- NULL = sem fim
    v_ultima     := COALESCE(
                      (v_config->>'ultima_geracao')::date,
                      v_receita.data_vencimento
                    );

    -- Avançar até encontrar o primeiro vencimento dentro ou depois de p_data_inicio
    v_next := calcular_proximo_vencimento(v_ultima, v_frequencia, v_dia_vcto);
    WHILE v_next < p_data_inicio LOOP
      v_next := calcular_proximo_vencimento(v_next, v_frequencia, v_dia_vcto);
    END LOOP;

    -- Iterar pelos meses dentro do período solicitado
    WHILE v_next <= p_data_fim LOOP
      -- Respeitar data_fim da recorrência (se definida)
      EXIT WHEN v_data_fim_r IS NOT NULL AND v_next > v_data_fim_r;

      -- Retornar virtual apenas se não existe filho real para esse vencimento
      IF NOT EXISTS (
        SELECT 1 FROM financeiro_receitas fr
        WHERE fr.receita_pai_id = v_receita.id
          AND fr.data_vencimento = v_next
      ) THEN
        id                  := gen_random_uuid();
        escritorio_id       := v_receita.escritorio_id;
        tipo_movimento      := 'receita';
        status              := 'previsto';
        origem              := v_receita.tipo_text;
        categoria           := v_receita.categoria_text;
        descricao           := v_receita.descricao;
        valor               := v_receita.valor;
        valor_pago          := 0;
        data_referencia     := v_next;
        data_vencimento     := v_next;
        data_efetivacao     := NULL;
        entidade            := NULL;
        conta_bancaria_id   := v_receita.conta_bancaria_id;
        conta_bancaria_nome := NULL;
        origem_id           := v_receita.id;
        processo_id         := v_receita.processo_id;
        cliente_id          := v_receita.cliente_id;
        virtual             := true;
        origem_pai_id       := v_receita.id;
        RETURN NEXT;
      END IF;

      v_next := calcular_proximo_vencimento(v_next, v_frequencia, v_dia_vcto);
    END LOOP;
  END LOOP;

  -- -------------------------------------------------------
  -- 3. Virtuais para financeiro_despesas recorrentes
  -- -------------------------------------------------------
  FOR v_despesa IN
    SELECT
      d.id, d.escritorio_id,
      d.categoria::text AS categoria_text,
      d.descricao, d.valor, d.config_recorrencia,
      d.data_vencimento, d.fornecedor,
      d.conta_bancaria_id, d.processo_id, d.cliente_id
    FROM financeiro_despesas d
    WHERE d.escritorio_id = ANY(p_escritorio_ids)
      AND d.recorrente = true
      AND d.despesa_pai_id IS NULL
      AND d.status != 'cancelado'
      AND d.config_recorrencia IS NOT NULL
  LOOP
    v_config     := v_despesa.config_recorrencia;
    v_frequencia := COALESCE(v_config->>'frequencia', 'mensal');
    v_dia_vcto   := (v_config->>'dia_vencimento')::integer;
    v_data_fim_r := (v_config->>'data_fim')::date;
    v_ultima     := COALESCE(
                      (v_config->>'ultima_geracao')::date,
                      v_despesa.data_vencimento
                    );

    -- Avançar até o primeiro vencimento dentro ou depois de p_data_inicio
    v_next := calcular_proximo_vencimento(v_ultima, v_frequencia, v_dia_vcto);
    WHILE v_next < p_data_inicio LOOP
      v_next := calcular_proximo_vencimento(v_next, v_frequencia, v_dia_vcto);
    END LOOP;

    -- Iterar pelos meses dentro do período solicitado
    WHILE v_next <= p_data_fim LOOP
      EXIT WHEN v_data_fim_r IS NOT NULL AND v_next > v_data_fim_r;

      IF NOT EXISTS (
        SELECT 1 FROM financeiro_despesas fd
        WHERE fd.despesa_pai_id = v_despesa.id
          AND fd.data_vencimento = v_next
      ) THEN
        id                  := gen_random_uuid();
        escritorio_id       := v_despesa.escritorio_id;
        tipo_movimento      := 'despesa';
        status              := 'previsto';
        origem              := v_despesa.categoria_text;
        categoria           := v_despesa.categoria_text;
        descricao           := v_despesa.descricao;
        valor               := v_despesa.valor;
        valor_pago          := 0;
        data_referencia     := v_next;
        data_vencimento     := v_next;
        data_efetivacao     := NULL;
        entidade            := v_despesa.fornecedor;
        conta_bancaria_id   := v_despesa.conta_bancaria_id;
        conta_bancaria_nome := NULL;
        origem_id           := v_despesa.id;
        processo_id         := v_despesa.processo_id;
        cliente_id          := v_despesa.cliente_id;
        virtual             := true;
        origem_pai_id       := v_despesa.id;
        RETURN NEXT;
      END IF;

      v_next := calcular_proximo_vencimento(v_next, v_frequencia, v_dia_vcto);
    END LOOP;
  END LOOP;

END;
$$;

-- -------------------------------------------------------
-- Cron job: materializar mês corrente todo dia 1 às 7h
-- Cria entradas reais para alertas, notificações e extrato bancário
-- -------------------------------------------------------
SELECT cron.schedule(
  'gerar-recorrentes-financeiro',
  '0 7 1 * *',
  'SELECT gerar_lancamentos_recorrentes()'
);
