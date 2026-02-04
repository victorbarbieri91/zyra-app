-- =====================================================
-- Migration: Corrigir trigger de alerta de cobrança
-- Descrição: A função estava buscando forma_cobranca na
-- tabela errada (config ao invés da principal)
-- =====================================================

-- Recriar a função corrigindo a query
CREATE OR REPLACE FUNCTION gerar_alerta_cobranca_movimentacao()
RETURNS TRIGGER AS $$
DECLARE
  v_processo_id UUID;
  v_contrato_id UUID;
  v_forma_cobranca TEXT;
  v_area_juridica TEXT;
  v_valor_causa NUMERIC;
  v_ato_tipo_id UUID;
  v_percentual NUMERIC;
  v_valor_fixo NUMERIC;
  v_valor_sugerido NUMERIC;
  v_tipo_movimentacao TEXT;
BEGIN
  -- Buscar processo e verificar se tem contrato
  SELECT
    pp.id,
    pp.contrato_id,
    pp.area,
    pp.valor_causa
  INTO
    v_processo_id,
    v_contrato_id,
    v_area_juridica,
    v_valor_causa
  FROM processos_processos pp
  WHERE pp.id = NEW.processo_id;

  -- Se não tem contrato, retorna
  IF v_contrato_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Verificar se contrato é do tipo "por_ato"
  -- CORRIGIDO: buscar da tabela financeiro_contratos_honorarios (não da config)
  SELECT
    fch.forma_cobranca
  INTO
    v_forma_cobranca
  FROM financeiro_contratos_honorarios fch
  WHERE fch.id = v_contrato_id;

  IF v_forma_cobranca IS NULL OR v_forma_cobranca != 'por_ato' THEN
    RETURN NEW;
  END IF;

  -- Normalizar tipo de movimentação para busca
  v_tipo_movimentacao := LOWER(COALESCE(NEW.tipo, ''));

  -- Mapear tipo de movimentação para código de ato processual
  -- Esta é uma heurística baseada em palavras-chave comuns
  DECLARE
    v_codigo_ato TEXT;
  BEGIN
    -- Mapear tipos de movimentação para códigos de atos
    IF v_tipo_movimentacao LIKE '%sentença%' OR v_tipo_movimentacao LIKE '%sentenca%' THEN
      v_codigo_ato := 'sentenca';
    ELSIF v_tipo_movimentacao LIKE '%acórdão%' OR v_tipo_movimentacao LIKE '%acordao%' THEN
      v_codigo_ato := 'acordao';
    ELSIF v_tipo_movimentacao LIKE '%inicial%' OR v_tipo_movimentacao LIKE '%petição inicial%' THEN
      v_codigo_ato := 'inicial';
    ELSIF v_tipo_movimentacao LIKE '%recurso%' OR v_tipo_movimentacao LIKE '%apelação%' OR v_tipo_movimentacao LIKE '%agravo%' THEN
      v_codigo_ato := 'recurso';
    ELSIF v_tipo_movimentacao LIKE '%audiência%' OR v_tipo_movimentacao LIKE '%audiencia%' THEN
      v_codigo_ato := 'audiencia';
    ELSIF v_tipo_movimentacao LIKE '%perícia%' OR v_tipo_movimentacao LIKE '%pericia%' OR v_tipo_movimentacao LIKE '%laudo%' THEN
      v_codigo_ato := 'pericia';
    ELSIF v_tipo_movimentacao LIKE '%acordo%' OR v_tipo_movimentacao LIKE '%transação%' THEN
      v_codigo_ato := 'acordo';
    ELSIF v_tipo_movimentacao LIKE '%execução%' OR v_tipo_movimentacao LIKE '%execucao%' OR v_tipo_movimentacao LIKE '%cumprimento%' THEN
      v_codigo_ato := 'execucao';
    ELSE
      -- Não é um ato que geramos alerta automático
      RETURN NEW;
    END IF;

    -- Buscar se existe configuração de ato no contrato para esta área
    SELECT
      fca.ato_tipo_id,
      COALESCE(fca.percentual_valor_causa, fapt.percentual_padrao),
      COALESCE(fca.valor_fixo, fapt.valor_fixo_padrao)
    INTO
      v_ato_tipo_id,
      v_percentual,
      v_valor_fixo
    FROM financeiro_atos_processuais_tipos fapt
    LEFT JOIN financeiro_contratos_atos fca
      ON fca.ato_tipo_id = fapt.id
      AND fca.contrato_id = v_contrato_id
    WHERE fapt.codigo = v_codigo_ato
      AND (fapt.area_juridica = v_area_juridica OR fapt.area_juridica = 'geral')
      AND fapt.ativo = true
    ORDER BY
      CASE WHEN fapt.area_juridica = v_area_juridica THEN 0 ELSE 1 END
    LIMIT 1;

    -- Se não encontrou configuração de ato, retorna
    IF v_ato_tipo_id IS NULL THEN
      RETURN NEW;
    END IF;

    -- Calcular valor sugerido
    IF v_valor_fixo IS NOT NULL AND v_valor_fixo > 0 THEN
      v_valor_sugerido := v_valor_fixo;
    ELSIF v_percentual IS NOT NULL AND v_percentual > 0 AND v_valor_causa IS NOT NULL THEN
      v_valor_sugerido := (v_percentual / 100) * v_valor_causa;
    ELSE
      v_valor_sugerido := NULL;
    END IF;

    -- Verificar se já existe alerta para esta movimentação
    IF EXISTS (
      SELECT 1 FROM financeiro_alertas_cobranca
      WHERE movimentacao_id = NEW.id
    ) THEN
      RETURN NEW;
    END IF;

    -- Criar alerta de cobrança
    INSERT INTO financeiro_alertas_cobranca (
      processo_id,
      movimentacao_id,
      ato_tipo_id,
      tipo_alerta,
      valor_sugerido,
      status
    ) VALUES (
      v_processo_id,
      NEW.id,
      v_ato_tipo_id,
      'ato_processual',
      v_valor_sugerido,
      'pendente'
    );

  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Comentário atualizado
COMMENT ON FUNCTION gerar_alerta_cobranca_movimentacao() IS
'Função que gera alertas de cobrança automaticamente quando uma movimentação
é inserida em um processo que possui contrato do tipo "por_ato".
Mapeia o tipo de movimentação para um ato processual cadastrado e
calcula o valor sugerido baseado na configuração do contrato ou valores padrão.
CORRIGIDO em 2025-01-20: buscar forma_cobranca da tabela correta.';
