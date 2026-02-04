-- =====================================================
-- MIGRATION: Cobrança por Ato Processual baseada em Horas
-- =====================================================
-- Implementa:
-- 1. Coluna ato_tipo_id em financeiro_timesheet
-- 2. Tabela financeiro_horas_acumuladas_ato
-- 3. Função calcular_faturabilidade_ato_hora
-- 4. Trigger para controlar horas faturáveis por ato
-- 5. Função finalizar_ato_hora (aplica mínimo)
-- =====================================================

-- =====================================================
-- 1. NOVA COLUNA ato_tipo_id EM TIMESHEET
-- =====================================================

ALTER TABLE financeiro_timesheet
  ADD COLUMN IF NOT EXISTS ato_tipo_id UUID REFERENCES financeiro_atos_processuais_tipos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_timesheet_ato_tipo ON financeiro_timesheet(ato_tipo_id);

COMMENT ON COLUMN financeiro_timesheet.ato_tipo_id IS
  'Referência ao tipo de ato processual (para contratos por_ato com modo hora)';

-- =====================================================
-- 2. TABELA: financeiro_horas_acumuladas_ato
-- =====================================================

CREATE TABLE IF NOT EXISTS financeiro_horas_acumuladas_ato (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id UUID NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,
  contrato_id UUID NOT NULL REFERENCES financeiro_contratos_honorarios(id) ON DELETE CASCADE,
  processo_id UUID NOT NULL REFERENCES processos_processos(id) ON DELETE CASCADE,
  ato_tipo_id UUID NOT NULL REFERENCES financeiro_atos_processuais_tipos(id) ON DELETE CASCADE,

  -- Acumuladores de horas
  horas_totais NUMERIC(10,2) NOT NULL DEFAULT 0,        -- Total de horas lançadas (faturáveis + excedentes)
  horas_faturaveis NUMERIC(10,2) NOT NULL DEFAULT 0,    -- Horas dentro do limite (cobráveis)
  horas_excedentes NUMERIC(10,2) NOT NULL DEFAULT 0,    -- Horas além do máximo (não cobráveis)

  -- Status do ato
  status TEXT NOT NULL DEFAULT 'em_andamento',
  finalizado_em TIMESTAMPTZ,
  receita_id UUID REFERENCES financeiro_receitas(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT uq_horas_acumuladas_processo_ato UNIQUE(processo_id, ato_tipo_id),
  CONSTRAINT chk_status_horas_acumuladas CHECK (status IN ('em_andamento', 'finalizado', 'faturado')),
  CONSTRAINT chk_horas_nao_negativas CHECK (horas_totais >= 0 AND horas_faturaveis >= 0 AND horas_excedentes >= 0)
);

CREATE INDEX IF NOT EXISTS idx_horas_acumuladas_escritorio ON financeiro_horas_acumuladas_ato(escritorio_id);
CREATE INDEX IF NOT EXISTS idx_horas_acumuladas_contrato ON financeiro_horas_acumuladas_ato(contrato_id);
CREATE INDEX IF NOT EXISTS idx_horas_acumuladas_processo ON financeiro_horas_acumuladas_ato(processo_id);
CREATE INDEX IF NOT EXISTS idx_horas_acumuladas_ato ON financeiro_horas_acumuladas_ato(ato_tipo_id);
CREATE INDEX IF NOT EXISTS idx_horas_acumuladas_status ON financeiro_horas_acumuladas_ato(status) WHERE status = 'em_andamento';

COMMENT ON TABLE financeiro_horas_acumuladas_ato IS
  'Acumula horas trabalhadas por ato processual por processo para controle de limites min/max';

-- =====================================================
-- 3. FUNÇÃO: get_ato_config_hora
-- =====================================================
-- Busca a configuração de um ato específico no contrato

CREATE OR REPLACE FUNCTION get_ato_config_hora(
  p_contrato_id UUID,
  p_ato_tipo_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_config JSONB;
  v_ato_config JSONB;
BEGIN
  -- Buscar config do contrato
  SELECT config INTO v_config
  FROM financeiro_contratos_honorarios
  WHERE id = p_contrato_id AND ativo = true;

  IF v_config IS NULL THEN
    RETURN NULL;
  END IF;

  -- Buscar configuração do ato específico
  SELECT elem INTO v_ato_config
  FROM jsonb_array_elements(v_config->'atos_configurados') AS elem
  WHERE (elem->>'ato_tipo_id')::UUID = p_ato_tipo_id
    AND COALESCE(elem->>'ativo', 'true')::BOOLEAN = true
  LIMIT 1;

  RETURN v_ato_config;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_ato_config_hora IS
  'Retorna a configuração de um ato específico do contrato (modo, valor_hora, limites)';

-- =====================================================
-- 4. FUNÇÃO: calcular_faturabilidade_ato_hora
-- =====================================================
-- Calcula quantas horas são faturáveis considerando o limite máximo

CREATE OR REPLACE FUNCTION calcular_faturabilidade_ato_hora(
  p_processo_id UUID,
  p_ato_tipo_id UUID,
  p_horas_novas NUMERIC
) RETURNS TABLE (
  horas_faturaveis NUMERIC,
  horas_excedentes NUMERIC,
  horas_acumuladas_antes NUMERIC,
  horas_acumuladas_depois NUMERIC,
  atingiu_maximo BOOLEAN,
  valor_hora NUMERIC,
  horas_maximas NUMERIC
) AS $$
DECLARE
  v_contrato_id UUID;
  v_ato_config JSONB;
  v_horas_maximas NUMERIC;
  v_acumulado_atual NUMERIC := 0;
  v_horas_disponiveis NUMERIC;
  v_horas_faturaveis NUMERIC;
  v_horas_excedentes NUMERIC;
  v_valor_hora NUMERIC;
BEGIN
  -- Se não tem ato_tipo_id, todas as horas são faturáveis (comportamento padrão)
  IF p_ato_tipo_id IS NULL THEN
    RETURN QUERY SELECT
      p_horas_novas,
      0::NUMERIC,
      0::NUMERIC,
      p_horas_novas,
      FALSE,
      NULL::NUMERIC,
      NULL::NUMERIC;
    RETURN;
  END IF;

  -- Buscar contrato do processo
  SELECT contrato_id INTO v_contrato_id
  FROM processos_processos
  WHERE id = p_processo_id;

  IF v_contrato_id IS NULL THEN
    RETURN QUERY SELECT p_horas_novas, 0::NUMERIC, 0::NUMERIC, p_horas_novas, FALSE, NULL::NUMERIC, NULL::NUMERIC;
    RETURN;
  END IF;

  -- Buscar configuração do ato
  v_ato_config := get_ato_config_hora(v_contrato_id, p_ato_tipo_id);

  -- Se não tem configuração de ato ou não é modo por_hora, comportamento padrão
  IF v_ato_config IS NULL OR COALESCE(v_ato_config->>'modo_cobranca', 'percentual') != 'por_hora' THEN
    RETURN QUERY SELECT p_horas_novas, 0::NUMERIC, 0::NUMERIC, p_horas_novas, FALSE, NULL::NUMERIC, NULL::NUMERIC;
    RETURN;
  END IF;

  -- Extrair configurações
  v_horas_maximas := (v_ato_config->>'horas_maximas')::NUMERIC;
  v_valor_hora := (v_ato_config->>'valor_hora')::NUMERIC;

  -- Buscar horas já acumuladas
  SELECT COALESCE(horas_faturaveis, 0) INTO v_acumulado_atual
  FROM financeiro_horas_acumuladas_ato
  WHERE processo_id = p_processo_id AND ato_tipo_id = p_ato_tipo_id;

  IF NOT FOUND THEN
    v_acumulado_atual := 0;
  END IF;

  -- Calcular horas disponíveis até o máximo
  IF v_horas_maximas IS NOT NULL AND v_horas_maximas > 0 THEN
    v_horas_disponiveis := GREATEST(v_horas_maximas - v_acumulado_atual, 0);
  ELSE
    v_horas_disponiveis := p_horas_novas; -- Sem limite máximo
  END IF;

  -- Calcular faturáveis vs excedentes
  v_horas_faturaveis := LEAST(p_horas_novas, v_horas_disponiveis);
  v_horas_excedentes := GREATEST(p_horas_novas - v_horas_disponiveis, 0);

  RETURN QUERY SELECT
    v_horas_faturaveis,
    v_horas_excedentes,
    v_acumulado_atual,
    v_acumulado_atual + v_horas_faturaveis,
    (v_horas_maximas IS NOT NULL AND v_acumulado_atual + p_horas_novas >= v_horas_maximas),
    v_valor_hora,
    v_horas_maximas;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calcular_faturabilidade_ato_hora IS
  'Calcula quantas horas são faturáveis considerando o limite máximo do ato no contrato';

-- =====================================================
-- 5. FUNÇÃO: atualizar_horas_acumuladas_ato
-- =====================================================
-- Trigger function para manter a tabela de acumulados atualizada

CREATE OR REPLACE FUNCTION trigger_atualizar_horas_acumuladas_ato()
RETURNS TRIGGER AS $$
DECLARE
  v_contrato_id UUID;
  v_escritorio_id UUID;
  v_ato_config JSONB;
  v_resultado RECORD;
BEGIN
  -- INSERT: Adicionar horas ao acumulado
  IF TG_OP = 'INSERT' THEN
    -- Só processar se tem ato_tipo_id
    IF NEW.ato_tipo_id IS NULL THEN
      RETURN NEW;
    END IF;

    -- Buscar dados do processo
    SELECT pp.contrato_id, pp.escritorio_id
    INTO v_contrato_id, v_escritorio_id
    FROM processos_processos pp
    WHERE pp.id = NEW.processo_id;

    IF v_contrato_id IS NULL THEN
      RETURN NEW;
    END IF;

    -- Verificar se é ato modo hora
    v_ato_config := get_ato_config_hora(v_contrato_id, NEW.ato_tipo_id);
    IF v_ato_config IS NULL OR COALESCE(v_ato_config->>'modo_cobranca', 'percentual') != 'por_hora' THEN
      RETURN NEW;
    END IF;

    -- Calcular faturabilidade
    SELECT * INTO v_resultado
    FROM calcular_faturabilidade_ato_hora(NEW.processo_id, NEW.ato_tipo_id, NEW.horas);

    -- Atualizar faturavel baseado no cálculo
    IF v_resultado.horas_excedentes > 0 THEN
      -- Se tem excedente, marca como não faturável (excedeu limite)
      NEW.faturavel := FALSE;
      NEW.faturavel_auto := TRUE;
    ELSIF v_resultado.horas_faturaveis > 0 THEN
      NEW.faturavel := TRUE;
      NEW.faturavel_auto := TRUE;
    END IF;

    -- Upsert no acumulado
    INSERT INTO financeiro_horas_acumuladas_ato (
      escritorio_id, contrato_id, processo_id, ato_tipo_id,
      horas_totais, horas_faturaveis, horas_excedentes
    ) VALUES (
      v_escritorio_id, v_contrato_id, NEW.processo_id, NEW.ato_tipo_id,
      NEW.horas, v_resultado.horas_faturaveis, v_resultado.horas_excedentes
    )
    ON CONFLICT (processo_id, ato_tipo_id)
    DO UPDATE SET
      horas_totais = financeiro_horas_acumuladas_ato.horas_totais + EXCLUDED.horas_totais,
      horas_faturaveis = financeiro_horas_acumuladas_ato.horas_faturaveis +
        CASE
          WHEN financeiro_horas_acumuladas_ato.status = 'em_andamento'
          THEN EXCLUDED.horas_faturaveis
          ELSE 0
        END,
      horas_excedentes = financeiro_horas_acumuladas_ato.horas_excedentes + EXCLUDED.horas_excedentes,
      updated_at = NOW();

    RETURN NEW;

  -- DELETE: Remover horas do acumulado
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.ato_tipo_id IS NOT NULL THEN
      UPDATE financeiro_horas_acumuladas_ato SET
        horas_totais = GREATEST(horas_totais - OLD.horas, 0),
        horas_faturaveis = CASE
          WHEN OLD.faturavel = TRUE THEN GREATEST(horas_faturaveis - OLD.horas, 0)
          ELSE horas_faturaveis
        END,
        horas_excedentes = CASE
          WHEN OLD.faturavel = FALSE THEN GREATEST(horas_excedentes - OLD.horas, 0)
          ELSE horas_excedentes
        END,
        updated_at = NOW()
      WHERE processo_id = OLD.processo_id AND ato_tipo_id = OLD.ato_tipo_id;
    END IF;
    RETURN OLD;

  -- UPDATE: Recalcular se mudou processo, ato ou horas
  ELSIF TG_OP = 'UPDATE' THEN
    -- Se mudou o ato_tipo_id, precisa remover do antigo e adicionar no novo
    IF OLD.ato_tipo_id IS DISTINCT FROM NEW.ato_tipo_id THEN
      -- Remover do antigo
      IF OLD.ato_tipo_id IS NOT NULL THEN
        UPDATE financeiro_horas_acumuladas_ato SET
          horas_totais = GREATEST(horas_totais - OLD.horas, 0),
          horas_faturaveis = CASE
            WHEN OLD.faturavel = TRUE THEN GREATEST(horas_faturaveis - OLD.horas, 0)
            ELSE horas_faturaveis
          END,
          horas_excedentes = CASE
            WHEN OLD.faturavel = FALSE THEN GREATEST(horas_excedentes - OLD.horas, 0)
            ELSE horas_excedentes
          END,
          updated_at = NOW()
        WHERE processo_id = OLD.processo_id AND ato_tipo_id = OLD.ato_tipo_id;
      END IF;

      -- Adicionar no novo (similar ao INSERT)
      IF NEW.ato_tipo_id IS NOT NULL THEN
        SELECT pp.contrato_id, pp.escritorio_id
        INTO v_contrato_id, v_escritorio_id
        FROM processos_processos pp
        WHERE pp.id = NEW.processo_id;

        IF v_contrato_id IS NOT NULL THEN
          v_ato_config := get_ato_config_hora(v_contrato_id, NEW.ato_tipo_id);

          IF v_ato_config IS NOT NULL AND COALESCE(v_ato_config->>'modo_cobranca', 'percentual') = 'por_hora' THEN
            SELECT * INTO v_resultado
            FROM calcular_faturabilidade_ato_hora(NEW.processo_id, NEW.ato_tipo_id, NEW.horas);

            IF v_resultado.horas_excedentes > 0 THEN
              NEW.faturavel := FALSE;
              NEW.faturavel_auto := TRUE;
            ELSIF v_resultado.horas_faturaveis > 0 THEN
              NEW.faturavel := TRUE;
              NEW.faturavel_auto := TRUE;
            END IF;

            INSERT INTO financeiro_horas_acumuladas_ato (
              escritorio_id, contrato_id, processo_id, ato_tipo_id,
              horas_totais, horas_faturaveis, horas_excedentes
            ) VALUES (
              v_escritorio_id, v_contrato_id, NEW.processo_id, NEW.ato_tipo_id,
              NEW.horas, v_resultado.horas_faturaveis, v_resultado.horas_excedentes
            )
            ON CONFLICT (processo_id, ato_tipo_id)
            DO UPDATE SET
              horas_totais = financeiro_horas_acumuladas_ato.horas_totais + EXCLUDED.horas_totais,
              horas_faturaveis = financeiro_horas_acumuladas_ato.horas_faturaveis + EXCLUDED.horas_faturaveis,
              horas_excedentes = financeiro_horas_acumuladas_ato.horas_excedentes + EXCLUDED.horas_excedentes,
              updated_at = NOW();
          END IF;
        END IF;
      END IF;

    -- Se só mudou as horas (mesmo ato)
    ELSIF OLD.horas IS DISTINCT FROM NEW.horas AND NEW.ato_tipo_id IS NOT NULL THEN
      -- Atualizar diferença no acumulado
      UPDATE financeiro_horas_acumuladas_ato SET
        horas_totais = horas_totais + (NEW.horas - OLD.horas),
        updated_at = NOW()
      WHERE processo_id = NEW.processo_id AND ato_tipo_id = NEW.ato_tipo_id;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger (roda APÓS o trigger de faturavel padrão)
DROP TRIGGER IF EXISTS trg_timesheet_atualizar_acumulado_ato ON financeiro_timesheet;
CREATE TRIGGER trg_timesheet_atualizar_acumulado_ato
  BEFORE INSERT OR UPDATE OR DELETE ON financeiro_timesheet
  FOR EACH ROW
  EXECUTE FUNCTION trigger_atualizar_horas_acumuladas_ato();

COMMENT ON FUNCTION trigger_atualizar_horas_acumuladas_ato IS
  'Mantém a tabela financeiro_horas_acumuladas_ato sincronizada com timesheet';

-- =====================================================
-- 6. FUNÇÃO: finalizar_ato_hora
-- =====================================================
-- Finaliza um ato e aplica o mínimo se necessário

CREATE OR REPLACE FUNCTION finalizar_ato_hora(
  p_processo_id UUID,
  p_ato_tipo_id UUID,
  p_user_id UUID DEFAULT NULL
) RETURNS TABLE (
  receita_id UUID,
  horas_trabalhadas NUMERIC,
  horas_cobradas NUMERIC,
  valor_total NUMERIC,
  aplicou_minimo BOOLEAN,
  mensagem TEXT
) AS $$
DECLARE
  v_contrato_id UUID;
  v_escritorio_id UUID;
  v_cliente_id UUID;
  v_ato_config JSONB;
  v_valor_hora NUMERIC;
  v_horas_minimas NUMERIC;
  v_horas_maximas NUMERIC;
  v_ato_nome TEXT;
  v_acumulado RECORD;
  v_horas_para_cobrar NUMERIC;
  v_valor_final NUMERIC;
  v_aplicou_minimo BOOLEAN := FALSE;
  v_receita_id UUID;
BEGIN
  -- Buscar dados do processo
  SELECT pp.contrato_id, pp.escritorio_id, pp.cliente_id
  INTO v_contrato_id, v_escritorio_id, v_cliente_id
  FROM processos_processos pp
  WHERE pp.id = p_processo_id;

  IF v_contrato_id IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, FALSE, 'Processo não tem contrato vinculado'::TEXT;
    RETURN;
  END IF;

  -- Buscar configuração do ato
  v_ato_config := get_ato_config_hora(v_contrato_id, p_ato_tipo_id);

  IF v_ato_config IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, FALSE, 'Ato não configurado no contrato'::TEXT;
    RETURN;
  END IF;

  IF COALESCE(v_ato_config->>'modo_cobranca', 'percentual') != 'por_hora' THEN
    RETURN QUERY SELECT NULL::UUID, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, FALSE, 'Ato não está configurado como modo por_hora'::TEXT;
    RETURN;
  END IF;

  -- Extrair configurações
  v_valor_hora := COALESCE((v_ato_config->>'valor_hora')::NUMERIC, 0);
  v_horas_minimas := COALESCE((v_ato_config->>'horas_minimas')::NUMERIC, 0);
  v_horas_maximas := (v_ato_config->>'horas_maximas')::NUMERIC;
  v_ato_nome := COALESCE(v_ato_config->>'ato_nome', 'Ato Processual');

  -- Buscar acumulado atual
  SELECT * INTO v_acumulado
  FROM financeiro_horas_acumuladas_ato
  WHERE processo_id = p_processo_id AND ato_tipo_id = p_ato_tipo_id;

  IF v_acumulado IS NULL THEN
    -- Se não tem acumulado mas tem mínimo, cobra o mínimo
    IF v_horas_minimas > 0 THEN
      v_horas_para_cobrar := v_horas_minimas;
      v_aplicou_minimo := TRUE;

      -- Criar registro de acumulado
      INSERT INTO financeiro_horas_acumuladas_ato (
        escritorio_id, contrato_id, processo_id, ato_tipo_id,
        horas_totais, horas_faturaveis, horas_excedentes, status
      ) VALUES (
        v_escritorio_id, v_contrato_id, p_processo_id, p_ato_tipo_id,
        0, 0, 0, 'em_andamento'
      )
      RETURNING * INTO v_acumulado;
    ELSE
      RETURN QUERY SELECT NULL::UUID, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, FALSE, 'Nenhuma hora registrada para este ato'::TEXT;
      RETURN;
    END IF;
  ELSE
    -- Verificar se já foi finalizado
    IF v_acumulado.status != 'em_andamento' THEN
      RETURN QUERY SELECT v_acumulado.receita_id, v_acumulado.horas_totais, v_acumulado.horas_faturaveis, 0::NUMERIC, FALSE, 'Ato já foi finalizado anteriormente'::TEXT;
      RETURN;
    END IF;

    -- Aplicar mínimo se necessário
    IF v_acumulado.horas_faturaveis < v_horas_minimas THEN
      v_horas_para_cobrar := v_horas_minimas;
      v_aplicou_minimo := TRUE;
    ELSE
      v_horas_para_cobrar := v_acumulado.horas_faturaveis;
    END IF;
  END IF;

  -- Calcular valor final
  v_valor_final := v_horas_para_cobrar * v_valor_hora;

  -- Criar receita de honorário
  INSERT INTO financeiro_receitas (
    escritorio_id,
    cliente_id,
    processo_id,
    contrato_id,
    tipo,
    categoria,
    descricao,
    valor,
    data_competencia,
    data_vencimento,
    status,
    created_by
  ) VALUES (
    v_escritorio_id,
    v_cliente_id,
    p_processo_id,
    v_contrato_id,
    'honorario',
    'ato_hora',
    'Honorário: ' || v_ato_nome || ' (' ||
      v_horas_para_cobrar || 'h × R$' || v_valor_hora ||
      CASE WHEN v_aplicou_minimo THEN ' - mínimo aplicado' ELSE '' END ||
      ')',
    v_valor_final,
    DATE_TRUNC('month', CURRENT_DATE),
    CURRENT_DATE + INTERVAL '30 days',
    'pendente',
    p_user_id
  ) RETURNING id INTO v_receita_id;

  -- Atualizar acumulado como finalizado
  UPDATE financeiro_horas_acumuladas_ato SET
    status = 'finalizado',
    finalizado_em = NOW(),
    receita_id = v_receita_id,
    updated_at = NOW()
  WHERE id = v_acumulado.id;

  RETURN QUERY SELECT
    v_receita_id,
    COALESCE(v_acumulado.horas_totais, 0::NUMERIC),
    v_horas_para_cobrar,
    v_valor_final,
    v_aplicou_minimo,
    'Ato finalizado com sucesso'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION finalizar_ato_hora IS
  'Finaliza um ato por hora, aplica mínimo se necessário e cria receita de honorário';

-- =====================================================
-- 7. FUNÇÃO: get_horas_acumuladas_ato
-- =====================================================
-- Busca informações de acumulado para exibição no frontend

CREATE OR REPLACE FUNCTION get_horas_acumuladas_ato(
  p_processo_id UUID,
  p_ato_tipo_id UUID
) RETURNS TABLE (
  horas_totais NUMERIC,
  horas_faturaveis NUMERIC,
  horas_excedentes NUMERIC,
  horas_disponiveis NUMERIC,
  valor_atual NUMERIC,
  valor_minimo NUMERIC,
  valor_maximo NUMERIC,
  percentual_usado NUMERIC,
  atingiu_maximo BOOLEAN,
  status TEXT
) AS $$
DECLARE
  v_contrato_id UUID;
  v_ato_config JSONB;
  v_horas_maximas NUMERIC;
  v_horas_minimas NUMERIC;
  v_valor_hora NUMERIC;
  v_acumulado RECORD;
BEGIN
  -- Buscar contrato
  SELECT contrato_id INTO v_contrato_id
  FROM processos_processos
  WHERE id = p_processo_id;

  IF v_contrato_id IS NULL THEN
    RETURN QUERY SELECT 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, FALSE, 'sem_contrato'::TEXT;
    RETURN;
  END IF;

  -- Buscar config do ato
  v_ato_config := get_ato_config_hora(v_contrato_id, p_ato_tipo_id);

  IF v_ato_config IS NULL OR COALESCE(v_ato_config->>'modo_cobranca', 'percentual') != 'por_hora' THEN
    RETURN QUERY SELECT 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, FALSE, 'nao_configurado'::TEXT;
    RETURN;
  END IF;

  -- Extrair configurações
  v_horas_maximas := (v_ato_config->>'horas_maximas')::NUMERIC;
  v_horas_minimas := COALESCE((v_ato_config->>'horas_minimas')::NUMERIC, 0);
  v_valor_hora := COALESCE((v_ato_config->>'valor_hora')::NUMERIC, 0);

  -- Buscar acumulado
  SELECT * INTO v_acumulado
  FROM financeiro_horas_acumuladas_ato
  WHERE processo_id = p_processo_id AND ato_tipo_id = p_ato_tipo_id;

  RETURN QUERY SELECT
    COALESCE(v_acumulado.horas_totais, 0::NUMERIC),
    COALESCE(v_acumulado.horas_faturaveis, 0::NUMERIC),
    COALESCE(v_acumulado.horas_excedentes, 0::NUMERIC),
    CASE
      WHEN v_horas_maximas IS NOT NULL
      THEN GREATEST(v_horas_maximas - COALESCE(v_acumulado.horas_faturaveis, 0), 0)
      ELSE NULL
    END,
    COALESCE(v_acumulado.horas_faturaveis, 0) * v_valor_hora,
    v_horas_minimas * v_valor_hora,
    CASE WHEN v_horas_maximas IS NOT NULL THEN v_horas_maximas * v_valor_hora ELSE NULL END,
    CASE
      WHEN v_horas_maximas IS NOT NULL AND v_horas_maximas > 0
      THEN ROUND((COALESCE(v_acumulado.horas_faturaveis, 0) / v_horas_maximas) * 100, 1)
      ELSE 0
    END,
    (v_horas_maximas IS NOT NULL AND COALESCE(v_acumulado.horas_faturaveis, 0) >= v_horas_maximas),
    COALESCE(v_acumulado.status, 'em_andamento'::TEXT);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_horas_acumuladas_ato IS
  'Retorna informações de horas acumuladas e limites para exibição no frontend';

-- =====================================================
-- 8. VIEW: v_atos_hora_processo
-- =====================================================
-- View para exibir status de todos os atos de um processo

CREATE OR REPLACE VIEW v_atos_hora_processo AS
SELECT
  haa.id,
  haa.escritorio_id,
  haa.contrato_id,
  haa.processo_id,
  haa.ato_tipo_id,
  fapt.codigo AS ato_codigo,
  fapt.nome AS ato_nome,
  haa.horas_totais,
  haa.horas_faturaveis,
  haa.horas_excedentes,
  haa.status,
  haa.finalizado_em,
  haa.receita_id,
  -- Config do contrato
  (get_ato_config_hora(haa.contrato_id, haa.ato_tipo_id)->>'valor_hora')::NUMERIC AS valor_hora,
  (get_ato_config_hora(haa.contrato_id, haa.ato_tipo_id)->>'horas_minimas')::NUMERIC AS horas_minimas,
  (get_ato_config_hora(haa.contrato_id, haa.ato_tipo_id)->>'horas_maximas')::NUMERIC AS horas_maximas,
  -- Cálculos
  GREATEST(
    COALESCE((get_ato_config_hora(haa.contrato_id, haa.ato_tipo_id)->>'horas_maximas')::NUMERIC, 0) - haa.horas_faturaveis,
    0
  ) AS horas_disponiveis,
  haa.horas_faturaveis * COALESCE((get_ato_config_hora(haa.contrato_id, haa.ato_tipo_id)->>'valor_hora')::NUMERIC, 0) AS valor_atual,
  (haa.horas_faturaveis >= COALESCE((get_ato_config_hora(haa.contrato_id, haa.ato_tipo_id)->>'horas_maximas')::NUMERIC, 999999)) AS atingiu_maximo,
  -- Info processo
  pp.numero_cnj AS processo_numero,
  pp.numero_pasta AS processo_pasta,
  c.nome_completo AS cliente_nome,
  haa.created_at,
  haa.updated_at
FROM financeiro_horas_acumuladas_ato haa
JOIN financeiro_atos_processuais_tipos fapt ON fapt.id = haa.ato_tipo_id
JOIN processos_processos pp ON pp.id = haa.processo_id
LEFT JOIN crm_pessoas c ON c.id = pp.cliente_id
ORDER BY haa.updated_at DESC;

COMMENT ON VIEW v_atos_hora_processo IS
  'View de status de atos por hora por processo com configurações e cálculos';

-- =====================================================
-- 9. RLS POLICIES
-- =====================================================

ALTER TABLE financeiro_horas_acumuladas_ato ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS horas_acumuladas_select ON financeiro_horas_acumuladas_ato;
CREATE POLICY horas_acumuladas_select ON financeiro_horas_acumuladas_ato
  FOR SELECT USING (
    escritorio_id IN (
      SELECT escritorio_id FROM escritorios_usuarios WHERE user_id = auth.uid() AND ativo = true
    )
  );

DROP POLICY IF EXISTS horas_acumuladas_insert ON financeiro_horas_acumuladas_ato;
CREATE POLICY horas_acumuladas_insert ON financeiro_horas_acumuladas_ato
  FOR INSERT WITH CHECK (
    escritorio_id IN (
      SELECT escritorio_id FROM escritorios_usuarios WHERE user_id = auth.uid() AND ativo = true
    )
  );

DROP POLICY IF EXISTS horas_acumuladas_update ON financeiro_horas_acumuladas_ato;
CREATE POLICY horas_acumuladas_update ON financeiro_horas_acumuladas_ato
  FOR UPDATE USING (
    escritorio_id IN (
      SELECT escritorio_id FROM escritorios_usuarios WHERE user_id = auth.uid() AND ativo = true
    )
  );

DROP POLICY IF EXISTS horas_acumuladas_delete ON financeiro_horas_acumuladas_ato;
CREATE POLICY horas_acumuladas_delete ON financeiro_horas_acumuladas_ato
  FOR DELETE USING (
    escritorio_id IN (
      SELECT escritorio_id FROM escritorios_usuarios WHERE user_id = auth.uid() AND ativo = true
    )
  );

-- =====================================================
-- 10. GRANTS
-- =====================================================

GRANT SELECT ON v_atos_hora_processo TO authenticated;
GRANT EXECUTE ON FUNCTION get_ato_config_hora TO authenticated;
GRANT EXECUTE ON FUNCTION calcular_faturabilidade_ato_hora TO authenticated;
GRANT EXECUTE ON FUNCTION finalizar_ato_hora TO authenticated;
GRANT EXECUTE ON FUNCTION get_horas_acumuladas_ato TO authenticated;
