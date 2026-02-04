-- ============================================================================
-- Migration: Índices Econômicos e Correção Monetária
-- Descrição: Sistema de correção monetária automática para processos e
--            reajuste sob demanda para contratos
-- Data: 2026-01-29
-- ============================================================================

-- ============================================================================
-- 1. TABELA DE ÍNDICES ECONÔMICOS (Cache do BCB)
-- ============================================================================

CREATE TABLE IF NOT EXISTS indices_economicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id uuid REFERENCES escritorios(id) ON DELETE CASCADE,

  -- Identificação do índice
  codigo_bcb integer NOT NULL,           -- Código da série no BCB (188=INPC, 433=IPCA, etc)
  nome text NOT NULL,                     -- Nome do índice (INPC, IPCA, IGP-M, etc)

  -- Dados do índice
  competencia date NOT NULL,              -- Mês/Ano de referência (primeiro dia do mês)
  valor numeric(15,8) NOT NULL,           -- Valor do índice no mês
  variacao_mensal numeric(10,6),          -- Variação % no mês

  -- Controle
  fonte text DEFAULT 'bcb_api',           -- Fonte: bcb_api, manual
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Índice único: um valor por índice/competência (global ou por escritório)
  CONSTRAINT uq_indice_competencia UNIQUE (codigo_bcb, competencia, escritorio_id)
);

-- Índices para performance
CREATE INDEX idx_indices_economicos_codigo ON indices_economicos(codigo_bcb);
CREATE INDEX idx_indices_economicos_competencia ON indices_economicos(competencia DESC);
CREATE INDEX idx_indices_economicos_nome ON indices_economicos(nome);

-- RLS
ALTER TABLE indices_economicos ENABLE ROW LEVEL SECURITY;

-- Política: índices globais (escritorio_id IS NULL) são visíveis para todos
-- Índices específicos do escritório só para o próprio escritório
CREATE POLICY "Indices globais visiveis para todos" ON indices_economicos
  FOR SELECT USING (
    escritorio_id IS NULL
    OR escritorio_id IN (SELECT escritorio_id FROM escritorios_usuarios WHERE user_id = auth.uid())
  );

CREATE POLICY "Apenas admins podem inserir indices" ON indices_economicos
  FOR INSERT WITH CHECK (
    escritorio_id IS NULL  -- Sistema pode inserir globais
    OR escritorio_id IN (
      SELECT eu.escritorio_id FROM escritorios_usuarios eu
      WHERE eu.user_id = auth.uid() AND eu.cargo IN ('dono', 'socio')
    )
  );

-- ============================================================================
-- 2. TABELA DE CONFIGURAÇÃO DE ÍNDICES
-- ============================================================================

CREATE TABLE IF NOT EXISTS indices_economicos_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_bcb integer NOT NULL UNIQUE,
  nome text NOT NULL,
  descricao text,
  ativo boolean DEFAULT true,
  ordem integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Inserir configuração dos índices disponíveis
INSERT INTO indices_economicos_config (codigo_bcb, nome, descricao, ordem) VALUES
  (188, 'INPC', 'Índice Nacional de Preços ao Consumidor - Usado em causas trabalhistas, previdenciárias e cíveis', 1),
  (433, 'IPCA', 'Índice de Preços ao Consumidor Amplo - Índice oficial de inflação', 2),
  (10764, 'IPCA-E', 'IPCA Especial - Usado em tabelas judiciais', 3),
  (189, 'IGP-M', 'Índice Geral de Preços do Mercado - Usado em contratos e aluguéis', 4),
  (11, 'SELIC', 'Taxa Selic - Usada em causas tributárias', 5)
ON CONFLICT (codigo_bcb) DO NOTHING;

-- ============================================================================
-- 3. CAMPOS NOVOS EM PROCESSOS
-- ============================================================================

-- Adicionar campo para índice de correção (permite customização por processo)
ALTER TABLE processos_processos
  ADD COLUMN IF NOT EXISTS indice_correcao text DEFAULT 'INPC';

-- Adicionar campo para data da última atualização
ALTER TABLE processos_processos
  ADD COLUMN IF NOT EXISTS data_ultima_atualizacao_monetaria date;

-- Comentários
COMMENT ON COLUMN processos_processos.indice_correcao IS 'Índice usado para correção monetária: INPC (padrão), IPCA, IPCA-E, IGP-M, SELIC';
COMMENT ON COLUMN processos_processos.valor_atualizado IS 'Valor da causa corrigido monetariamente';
COMMENT ON COLUMN processos_processos.data_ultima_atualizacao_monetaria IS 'Data da última atualização do valor corrigido';

-- ============================================================================
-- 4. CAMPOS NOVOS EM CONTRATOS DE HONORÁRIOS
-- ============================================================================

-- Flag para ativar reajuste monetário
ALTER TABLE financeiro_contratos_honorarios
  ADD COLUMN IF NOT EXISTS reajuste_ativo boolean DEFAULT false;

-- Valor atualizado após reajuste
ALTER TABLE financeiro_contratos_honorarios
  ADD COLUMN IF NOT EXISTS valor_atualizado numeric(15,2);

-- Índice usado no reajuste
ALTER TABLE financeiro_contratos_honorarios
  ADD COLUMN IF NOT EXISTS indice_reajuste text DEFAULT 'INPC';

-- Data do último reajuste aplicado
ALTER TABLE financeiro_contratos_honorarios
  ADD COLUMN IF NOT EXISTS data_ultimo_reajuste date;

-- Comentários
COMMENT ON COLUMN financeiro_contratos_honorarios.reajuste_ativo IS 'Se true, habilita reajuste monetário para o contrato (apenas contratos fixos)';
COMMENT ON COLUMN financeiro_contratos_honorarios.valor_atualizado IS 'Valor do contrato após reajuste monetário';
COMMENT ON COLUMN financeiro_contratos_honorarios.indice_reajuste IS 'Índice usado para reajuste: INPC (padrão), IPCA, IGP-M, etc';
COMMENT ON COLUMN financeiro_contratos_honorarios.data_ultimo_reajuste IS 'Data do último reajuste aplicado';

-- ============================================================================
-- 5. FUNÇÃO: Obter código BCB pelo nome do índice
-- ============================================================================

CREATE OR REPLACE FUNCTION obter_codigo_bcb(p_nome_indice text)
RETURNS integer
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN CASE UPPER(p_nome_indice)
    WHEN 'INPC' THEN 188
    WHEN 'IPCA' THEN 433
    WHEN 'IPCA-E' THEN 10764
    WHEN 'IGP-M' THEN 189
    WHEN 'IGPM' THEN 189
    WHEN 'SELIC' THEN 11
    ELSE 188  -- INPC como fallback
  END;
END;
$$;

-- ============================================================================
-- 6. FUNÇÃO: Determinar índice padrão por área do processo
-- ============================================================================

CREATE OR REPLACE FUNCTION obter_indice_padrao_processo(p_area text)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  -- Tributário usa SELIC, todo o resto usa INPC
  IF LOWER(p_area) = 'tributario' OR LOWER(p_area) = 'tributária' THEN
    RETURN 'SELIC';
  ELSE
    RETURN 'INPC';
  END IF;
END;
$$;

-- ============================================================================
-- 7. FUNÇÃO: Calcular correção monetária entre duas datas
-- ============================================================================

CREATE OR REPLACE FUNCTION calcular_correcao_monetaria(
  p_valor_original numeric,
  p_data_inicial date,
  p_data_final date,
  p_indice text DEFAULT 'INPC'
)
RETURNS TABLE (
  valor_corrigido numeric,
  fator_correcao numeric,
  indice_inicial numeric,
  indice_final numeric,
  competencia_inicial date,
  competencia_final date
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_codigo_bcb integer;
  v_competencia_inicial date;
  v_competencia_final date;
  v_indice_inicial numeric;
  v_indice_final numeric;
  v_fator numeric;
BEGIN
  -- Validações básicas
  IF p_valor_original IS NULL OR p_valor_original <= 0 THEN
    RETURN QUERY SELECT
      p_valor_original::numeric,
      1.0::numeric,
      NULL::numeric,
      NULL::numeric,
      NULL::date,
      NULL::date;
    RETURN;
  END IF;

  IF p_data_inicial IS NULL OR p_data_final IS NULL THEN
    RETURN QUERY SELECT
      p_valor_original::numeric,
      1.0::numeric,
      NULL::numeric,
      NULL::numeric,
      NULL::date,
      NULL::date;
    RETURN;
  END IF;

  -- Obter código BCB
  v_codigo_bcb := obter_codigo_bcb(p_indice);

  -- Competências (primeiro dia do mês)
  v_competencia_inicial := date_trunc('month', p_data_inicial)::date;
  v_competencia_final := date_trunc('month', p_data_final)::date;

  -- Se mesma competência, não há correção
  IF v_competencia_inicial >= v_competencia_final THEN
    RETURN QUERY SELECT
      p_valor_original::numeric,
      1.0::numeric,
      NULL::numeric,
      NULL::numeric,
      v_competencia_inicial,
      v_competencia_final;
    RETURN;
  END IF;

  -- Buscar índice inicial (mais próximo da data inicial)
  SELECT valor INTO v_indice_inicial
  FROM indices_economicos
  WHERE codigo_bcb = v_codigo_bcb
    AND competencia <= v_competencia_inicial
    AND escritorio_id IS NULL  -- Usar índices globais
  ORDER BY competencia DESC
  LIMIT 1;

  -- Buscar índice final (mais próximo da data final)
  SELECT valor INTO v_indice_final
  FROM indices_economicos
  WHERE codigo_bcb = v_codigo_bcb
    AND competencia <= v_competencia_final
    AND escritorio_id IS NULL  -- Usar índices globais
  ORDER BY competencia DESC
  LIMIT 1;

  -- Se não encontrou índices, retorna valor original
  IF v_indice_inicial IS NULL OR v_indice_final IS NULL OR v_indice_inicial = 0 THEN
    RETURN QUERY SELECT
      p_valor_original::numeric,
      1.0::numeric,
      v_indice_inicial,
      v_indice_final,
      v_competencia_inicial,
      v_competencia_final;
    RETURN;
  END IF;

  -- Calcular fator de correção
  v_fator := v_indice_final / v_indice_inicial;

  -- Retornar resultado
  RETURN QUERY SELECT
    ROUND(p_valor_original * v_fator, 2)::numeric,
    ROUND(v_fator, 8)::numeric,
    v_indice_inicial,
    v_indice_final,
    v_competencia_inicial,
    v_competencia_final;
END;
$$;

COMMENT ON FUNCTION calcular_correcao_monetaria IS 'Calcula correção monetária de um valor entre duas datas usando índice especificado';

-- ============================================================================
-- 8. FUNÇÃO: Atualizar valor de um processo específico
-- ============================================================================

CREATE OR REPLACE FUNCTION atualizar_valor_processo(p_processo_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_processo RECORD;
  v_resultado RECORD;
  v_indice text;
BEGIN
  -- Buscar dados do processo
  SELECT
    id,
    valor_causa,
    data_distribuicao,
    area,
    indice_correcao
  INTO v_processo
  FROM processos_processos
  WHERE id = p_processo_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Processo não encontrado');
  END IF;

  -- Se não tem valor da causa, não há o que atualizar
  IF v_processo.valor_causa IS NULL OR v_processo.valor_causa <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Processo sem valor da causa');
  END IF;

  -- Se não tem data de distribuição, não há como calcular
  IF v_processo.data_distribuicao IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Processo sem data de distribuição');
  END IF;

  -- Determinar índice a usar (customizado ou padrão por área)
  v_indice := COALESCE(v_processo.indice_correcao, obter_indice_padrao_processo(v_processo.area));

  -- Calcular correção
  SELECT * INTO v_resultado
  FROM calcular_correcao_monetaria(
    v_processo.valor_causa,
    v_processo.data_distribuicao,
    CURRENT_DATE,
    v_indice
  );

  -- Atualizar processo
  UPDATE processos_processos
  SET
    valor_atualizado = v_resultado.valor_corrigido,
    indice_correcao = v_indice,
    data_ultima_atualizacao_monetaria = CURRENT_DATE,
    updated_at = now()
  WHERE id = p_processo_id;

  RETURN jsonb_build_object(
    'success', true,
    'processo_id', p_processo_id,
    'valor_original', v_processo.valor_causa,
    'valor_atualizado', v_resultado.valor_corrigido,
    'fator_correcao', v_resultado.fator_correcao,
    'indice', v_indice,
    'data_inicial', v_processo.data_distribuicao,
    'data_final', CURRENT_DATE
  );
END;
$$;

COMMENT ON FUNCTION atualizar_valor_processo IS 'Atualiza o valor corrigido de um processo específico';

-- ============================================================================
-- 9. FUNÇÃO: Atualizar todos os processos ativos de um escritório
-- ============================================================================

CREATE OR REPLACE FUNCTION atualizar_valores_processos_escritorio(p_escritorio_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_processo RECORD;
  v_total integer := 0;
  v_atualizados integer := 0;
  v_erros integer := 0;
  v_resultado jsonb;
BEGIN
  -- Iterar sobre processos ativos com valor da causa
  FOR v_processo IN
    SELECT id
    FROM processos_processos
    WHERE escritorio_id = p_escritorio_id
      AND status IN ('ativo', 'suspenso')
      AND valor_causa IS NOT NULL
      AND valor_causa > 0
      AND data_distribuicao IS NOT NULL
  LOOP
    v_total := v_total + 1;

    -- Tentar atualizar
    v_resultado := atualizar_valor_processo(v_processo.id);

    IF (v_resultado->>'success')::boolean THEN
      v_atualizados := v_atualizados + 1;
    ELSE
      v_erros := v_erros + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'escritorio_id', p_escritorio_id,
    'total_processos', v_total,
    'atualizados', v_atualizados,
    'erros', v_erros,
    'data_execucao', now()
  );
END;
$$;

COMMENT ON FUNCTION atualizar_valores_processos_escritorio IS 'Atualiza valores corrigidos de todos os processos ativos de um escritório';

-- ============================================================================
-- 10. FUNÇÃO: Aplicar reajuste em contrato (sob demanda)
-- ============================================================================

CREATE OR REPLACE FUNCTION aplicar_reajuste_contrato(
  p_contrato_id uuid,
  p_indice text DEFAULT 'INPC'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_contrato RECORD;
  v_resultado RECORD;
  v_data_base date;
  v_valor_base numeric;
BEGIN
  -- Buscar dados do contrato
  SELECT
    id,
    valor_total,
    valor_atualizado,
    data_inicio,
    data_ultimo_reajuste,
    forma_cobranca
  INTO v_contrato
  FROM financeiro_contratos_honorarios
  WHERE id = p_contrato_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contrato não encontrado');
  END IF;

  -- Verificar se é contrato fixo
  IF v_contrato.forma_cobranca NOT IN ('fixo', 'por_pasta') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reajuste só aplicável a contratos de valor fixo');
  END IF;

  -- Se não tem valor total, não há o que reajustar
  IF v_contrato.valor_total IS NULL OR v_contrato.valor_total <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contrato sem valor definido');
  END IF;

  -- Determinar data base e valor base
  -- Se já teve reajuste, usa a data do último reajuste e o valor atualizado
  -- Se não, usa a data de início e o valor original
  IF v_contrato.data_ultimo_reajuste IS NOT NULL AND v_contrato.valor_atualizado IS NOT NULL THEN
    v_data_base := v_contrato.data_ultimo_reajuste;
    v_valor_base := v_contrato.valor_atualizado;
  ELSE
    v_data_base := v_contrato.data_inicio;
    v_valor_base := v_contrato.valor_total;
  END IF;

  -- Calcular correção
  SELECT * INTO v_resultado
  FROM calcular_correcao_monetaria(
    v_valor_base,
    v_data_base,
    CURRENT_DATE,
    p_indice
  );

  -- Se não houve variação significativa (mesmo mês), retornar sem atualizar
  IF v_resultado.fator_correcao = 1.0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Período insuficiente para reajuste (mesmo mês de referência)'
    );
  END IF;

  -- Atualizar contrato
  UPDATE financeiro_contratos_honorarios
  SET
    valor_atualizado = v_resultado.valor_corrigido,
    indice_reajuste = p_indice,
    data_ultimo_reajuste = CURRENT_DATE,
    updated_at = now()
  WHERE id = p_contrato_id;

  RETURN jsonb_build_object(
    'success', true,
    'contrato_id', p_contrato_id,
    'valor_anterior', v_valor_base,
    'valor_atualizado', v_resultado.valor_corrigido,
    'fator_correcao', v_resultado.fator_correcao,
    'indice', p_indice,
    'data_base', v_data_base,
    'data_reajuste', CURRENT_DATE
  );
END;
$$;

COMMENT ON FUNCTION aplicar_reajuste_contrato IS 'Aplica reajuste monetário em contrato de honorários (sob demanda)';

-- ============================================================================
-- 11. TRIGGER: Definir índice padrão ao criar processo
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_definir_indice_processo()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Se não foi especificado índice, usar o padrão pela área
  IF NEW.indice_correcao IS NULL THEN
    NEW.indice_correcao := obter_indice_padrao_processo(NEW.area);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_processo_definir_indice ON processos_processos;
CREATE TRIGGER trg_processo_definir_indice
  BEFORE INSERT ON processos_processos
  FOR EACH ROW
  EXECUTE FUNCTION trigger_definir_indice_processo();

-- ============================================================================
-- 12. VIEW: Processos com informações de correção monetária
-- ============================================================================

CREATE OR REPLACE VIEW v_processos_correcao_monetaria AS
SELECT
  p.id,
  p.escritorio_id,
  p.numero_cnj,
  p.numero_pasta,
  p.area,
  p.status,
  p.valor_causa,
  p.valor_atualizado,
  p.indice_correcao,
  p.data_distribuicao,
  p.data_ultima_atualizacao_monetaria,
  -- Cálculo do percentual de variação
  CASE
    WHEN p.valor_causa > 0 AND p.valor_atualizado > 0
    THEN ROUND(((p.valor_atualizado / p.valor_causa) - 1) * 100, 2)
    ELSE 0
  END AS variacao_percentual,
  -- Cliente
  c.nome AS cliente_nome
FROM processos_processos p
LEFT JOIN crm_pessoas c ON c.id = p.cliente_id
WHERE p.valor_causa IS NOT NULL AND p.valor_causa > 0;

COMMENT ON VIEW v_processos_correcao_monetaria IS 'View de processos com informações de correção monetária';

-- ============================================================================
-- 13. VIEW: Contratos com informações de reajuste
-- ============================================================================

CREATE OR REPLACE VIEW v_contratos_reajuste AS
SELECT
  ch.id,
  ch.escritorio_id,
  ch.numero_contrato,
  ch.cliente_id,
  c.nome AS cliente_nome,
  ch.tipo_contrato,
  ch.forma_cobranca,
  ch.data_inicio,
  ch.valor_total AS valor_original,
  ch.valor_atualizado,
  ch.indice_reajuste,
  ch.data_ultimo_reajuste,
  ch.ativo,
  -- Cálculo do percentual de variação
  CASE
    WHEN ch.valor_total > 0 AND ch.valor_atualizado > 0
    THEN ROUND(((ch.valor_atualizado / ch.valor_total) - 1) * 100, 2)
    ELSE 0
  END AS variacao_percentual,
  -- Valor atual a considerar (atualizado ou original)
  COALESCE(ch.valor_atualizado, ch.valor_total) AS valor_vigente
FROM financeiro_contratos_honorarios ch
LEFT JOIN crm_pessoas c ON c.id = ch.cliente_id
WHERE ch.forma_cobranca IN ('fixo', 'por_pasta')
  AND ch.valor_total IS NOT NULL
  AND ch.valor_total > 0;

COMMENT ON VIEW v_contratos_reajuste IS 'View de contratos fixos com informações de reajuste';

-- ============================================================================
-- 14. FUNÇÃO: Importar índices do BCB (chamada pela Edge Function)
-- ============================================================================

CREATE OR REPLACE FUNCTION importar_indice_bcb(
  p_codigo_bcb integer,
  p_nome text,
  p_competencia date,
  p_valor numeric,
  p_variacao_mensal numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO indices_economicos (
    escritorio_id,
    codigo_bcb,
    nome,
    competencia,
    valor,
    variacao_mensal,
    fonte
  ) VALUES (
    NULL,  -- Global
    p_codigo_bcb,
    p_nome,
    date_trunc('month', p_competencia)::date,
    p_valor,
    p_variacao_mensal,
    'bcb_api'
  )
  ON CONFLICT (codigo_bcb, competencia, escritorio_id)
  DO UPDATE SET
    valor = EXCLUDED.valor,
    variacao_mensal = EXCLUDED.variacao_mensal,
    updated_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'codigo_bcb', p_codigo_bcb,
    'nome', p_nome,
    'competencia', p_competencia,
    'valor', p_valor
  );
END;
$$;

COMMENT ON FUNCTION importar_indice_bcb IS 'Importa ou atualiza índice econômico do BCB';

-- ============================================================================
-- 15. GRANT PERMISSIONS
-- ============================================================================

-- Permissões para service_role (Edge Functions)
GRANT SELECT, INSERT, UPDATE ON indices_economicos TO service_role;
GRANT SELECT ON indices_economicos_config TO service_role;
GRANT EXECUTE ON FUNCTION importar_indice_bcb TO service_role;
GRANT EXECUTE ON FUNCTION atualizar_valor_processo TO service_role;
GRANT EXECUTE ON FUNCTION atualizar_valores_processos_escritorio TO service_role;

-- Permissões para authenticated (usuários logados)
GRANT SELECT ON indices_economicos TO authenticated;
GRANT SELECT ON indices_economicos_config TO authenticated;
GRANT EXECUTE ON FUNCTION calcular_correcao_monetaria TO authenticated;
GRANT EXECUTE ON FUNCTION atualizar_valor_processo TO authenticated;
GRANT EXECUTE ON FUNCTION aplicar_reajuste_contrato TO authenticated;
GRANT SELECT ON v_processos_correcao_monetaria TO authenticated;
GRANT SELECT ON v_contratos_reajuste TO authenticated;
