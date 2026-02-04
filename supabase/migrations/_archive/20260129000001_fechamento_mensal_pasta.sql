-- Migration: Sistema de Fechamento Mensal por Pasta
-- Implementa fechamento automático mensal para contratos "por pasta" com limite de 24 meses

-- =============================================================================
-- 1. TABELA DE FECHAMENTOS MENSAIS
-- =============================================================================

CREATE TABLE IF NOT EXISTS financeiro_fechamentos_pasta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id UUID NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,
  contrato_id UUID NOT NULL REFERENCES financeiro_contratos_honorarios(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES crm_pessoas(id) ON DELETE CASCADE,

  -- Competência (mês/ano do fechamento)
  competencia DATE NOT NULL, -- Sempre YYYY-MM-01

  -- Dados do fechamento
  qtd_processos INTEGER NOT NULL DEFAULT 0,
  valor_unitario NUMERIC(15,2) NOT NULL,
  valor_total NUMERIC(15,2) NOT NULL,
  processos JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array com detalhes dos processos

  -- Status do fechamento
  -- pendente: aguardando aprovação
  -- aprovado: aprovado, pronto para faturar
  -- faturado: já gerou fatura
  -- cancelado: cancelado pelo usuário
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'faturado', 'cancelado')),

  -- Referência à fatura (quando faturado)
  fatura_id UUID REFERENCES financeiro_faturamento_faturas(id) ON DELETE SET NULL,

  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  aprovado_em TIMESTAMPTZ,
  aprovado_por UUID REFERENCES profiles(id) ON DELETE SET NULL,
  faturado_em TIMESTAMPTZ,

  -- Constraint: apenas um fechamento por contrato/mês
  UNIQUE(contrato_id, competencia)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_fechamento_pasta_escritorio_status
  ON financeiro_fechamentos_pasta(escritorio_id, status);

CREATE INDEX IF NOT EXISTS idx_fechamento_pasta_competencia
  ON financeiro_fechamentos_pasta(competencia);

CREATE INDEX IF NOT EXISTS idx_fechamento_pasta_cliente
  ON financeiro_fechamentos_pasta(cliente_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_fechamento_pasta_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fechamento_pasta_updated_at ON financeiro_fechamentos_pasta;
CREATE TRIGGER trg_fechamento_pasta_updated_at
  BEFORE UPDATE ON financeiro_fechamentos_pasta
  FOR EACH ROW
  EXECUTE FUNCTION update_fechamento_pasta_updated_at();

-- =============================================================================
-- 2. TABELA DE ALERTAS DE LIMITE DE CONTRATO
-- =============================================================================

CREATE TABLE IF NOT EXISTS financeiro_alertas_limite_contrato (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id UUID NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,
  contrato_id UUID NOT NULL REFERENCES financeiro_contratos_honorarios(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES crm_pessoas(id) ON DELETE CASCADE,

  -- Detalhes do alerta
  limite_meses INTEGER NOT NULL,
  meses_cobrados INTEGER NOT NULL,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,

  -- Status: pendente, renovado, encerrado
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'renovado', 'encerrado')),

  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolvido_em TIMESTAMPTZ,
  resolvido_por UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Apenas um alerta pendente por contrato
  UNIQUE(contrato_id) WHERE (status = 'pendente')
);

CREATE INDEX IF NOT EXISTS idx_alertas_limite_escritorio_status
  ON financeiro_alertas_limite_contrato(escritorio_id, status);

-- =============================================================================
-- 3. FUNÇÃO PRINCIPAL: EXECUTAR FECHAMENTO MENSAL
-- =============================================================================

CREATE OR REPLACE FUNCTION executar_fechamento_mensal_pasta(p_competencia DATE DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  v_competencia DATE := DATE_TRUNC('month', COALESCE(p_competencia, CURRENT_DATE));
  v_contrato RECORD;
  v_processos JSONB;
  v_qtd INTEGER;
  v_fechamentos_criados INTEGER := 0;
BEGIN
  -- Iterar sobre contratos ativos do tipo "por pasta"
  FOR v_contrato IN
    SELECT
      c.id,
      c.escritorio_id,
      c.cliente_id,
      c.config,
      c.numero_contrato
    FROM financeiro_contratos_honorarios c
    WHERE c.forma_cobranca = 'por_pasta'
      AND c.ativo = true
      AND (c.config->>'valor_por_processo')::numeric > 0
      -- Verificar limite de meses (se configurado)
      AND (
        (c.config->>'limite_meses') IS NULL
        OR COALESCE((c.config->>'meses_cobrados')::int, 0) < (c.config->>'limite_meses')::int
      )
      -- Não ter fechamento existente para esta competência
      AND NOT EXISTS (
        SELECT 1 FROM financeiro_fechamentos_pasta fp
        WHERE fp.contrato_id = c.id
          AND fp.competencia = v_competencia
          AND fp.status != 'cancelado'
      )
  LOOP
    -- Buscar processos ATIVOS vinculados ao contrato
    SELECT
      COALESCE(jsonb_agg(jsonb_build_object(
        'id', p.id,
        'numero_cnj', p.numero_cnj,
        'numero_pasta', p.numero_pasta,
        'titulo', COALESCE(p.titulo, 'Processo ' || COALESCE(p.numero_pasta, p.numero_cnj)),
        'cliente_nome', (SELECT nome_completo FROM crm_pessoas WHERE id = p.cliente_id)
      )), '[]'::jsonb),
      COUNT(*)::integer
    INTO v_processos, v_qtd
    FROM processos_processos p
    WHERE p.contrato_id = v_contrato.id
      AND p.status = 'ativo';

    -- Só criar fechamento se houver processos
    IF v_qtd > 0 THEN
      -- Criar registro de fechamento
      INSERT INTO financeiro_fechamentos_pasta (
        escritorio_id,
        contrato_id,
        cliente_id,
        competencia,
        qtd_processos,
        valor_unitario,
        valor_total,
        processos
      ) VALUES (
        v_contrato.escritorio_id,
        v_contrato.id,
        v_contrato.cliente_id,
        v_competencia,
        v_qtd,
        (v_contrato.config->>'valor_por_processo')::numeric,
        v_qtd * (v_contrato.config->>'valor_por_processo')::numeric,
        v_processos
      );

      -- Incrementar meses_cobrados no contrato
      UPDATE financeiro_contratos_honorarios
      SET config = config || jsonb_build_object(
        'meses_cobrados', COALESCE((config->>'meses_cobrados')::int, 0) + 1
      )
      WHERE id = v_contrato.id;

      v_fechamentos_criados := v_fechamentos_criados + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'competencia', v_competencia,
    'fechamentos_criados', v_fechamentos_criados
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 4. FUNÇÃO: VERIFICAR LIMITES E CRIAR ALERTAS
-- =============================================================================

CREATE OR REPLACE FUNCTION verificar_limites_contratos_pasta()
RETURNS JSONB AS $$
DECLARE
  v_contrato RECORD;
  v_alertas_criados INTEGER := 0;
BEGIN
  FOR v_contrato IN
    SELECT
      c.id,
      c.escritorio_id,
      c.cliente_id,
      c.numero_contrato,
      (c.config->>'limite_meses')::int as limite_meses,
      COALESCE((c.config->>'meses_cobrados')::int, 0) as meses_cobrados,
      p.nome_completo as cliente_nome
    FROM financeiro_contratos_honorarios c
    JOIN crm_pessoas p ON p.id = c.cliente_id
    WHERE c.forma_cobranca = 'por_pasta'
      AND c.ativo = true
      AND (c.config->>'limite_meses')::int IS NOT NULL
      AND COALESCE((c.config->>'meses_cobrados')::int, 0) >= (c.config->>'limite_meses')::int
      -- Não ter alerta pendente já criado
      AND NOT EXISTS (
        SELECT 1 FROM financeiro_alertas_limite_contrato a
        WHERE a.contrato_id = c.id
          AND a.status = 'pendente'
      )
  LOOP
    -- Criar alerta de limite atingido
    INSERT INTO financeiro_alertas_limite_contrato (
      escritorio_id,
      contrato_id,
      cliente_id,
      limite_meses,
      meses_cobrados,
      titulo,
      mensagem
    ) VALUES (
      v_contrato.escritorio_id,
      v_contrato.id,
      v_contrato.cliente_id,
      v_contrato.limite_meses,
      v_contrato.meses_cobrados,
      'Contrato atingiu limite de ' || v_contrato.limite_meses || ' meses',
      'O contrato ' || COALESCE(v_contrato.numero_contrato, 'sem número') ||
      ' do cliente ' || v_contrato.cliente_nome ||
      ' atingiu o limite de ' || v_contrato.limite_meses ||
      ' meses de cobrança por pasta. Decida se deseja renovar o período ou encerrar o contrato.'
    );

    v_alertas_criados := v_alertas_criados + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'alertas_criados', v_alertas_criados
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 5. FUNÇÃO: REMOVER PROCESSO DO FECHAMENTO
-- =============================================================================

CREATE OR REPLACE FUNCTION remover_processo_fechamento(
  p_fechamento_id UUID,
  p_processo_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_fechamento RECORD;
  v_novo_processos JSONB;
  v_novo_qtd INTEGER;
BEGIN
  -- Buscar fechamento
  SELECT * INTO v_fechamento
  FROM financeiro_fechamentos_pasta
  WHERE id = p_fechamento_id AND status = 'pendente';

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Remover processo do array
  SELECT
    jsonb_agg(p),
    COUNT(*)::integer
  INTO v_novo_processos, v_novo_qtd
  FROM jsonb_array_elements(v_fechamento.processos) p
  WHERE (p->>'id')::uuid != p_processo_id;

  -- Atualizar fechamento
  UPDATE financeiro_fechamentos_pasta
  SET
    processos = COALESCE(v_novo_processos, '[]'::jsonb),
    qtd_processos = COALESCE(v_novo_qtd, 0),
    valor_total = COALESCE(v_novo_qtd, 0) * valor_unitario
  WHERE id = p_fechamento_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 6. FUNÇÃO: APROVAR FECHAMENTO
-- =============================================================================

CREATE OR REPLACE FUNCTION aprovar_fechamento_pasta(
  p_fechamento_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE financeiro_fechamentos_pasta
  SET
    status = 'aprovado',
    aprovado_em = NOW(),
    aprovado_por = p_user_id
  WHERE id = p_fechamento_id
    AND status = 'pendente';

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 7. FUNÇÃO: RENOVAR CONTRATO (ZERAR CONTADOR)
-- =============================================================================

CREATE OR REPLACE FUNCTION renovar_contrato_pasta(
  p_contrato_id UUID,
  p_user_id UUID,
  p_novo_limite INTEGER DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_limite_atual INTEGER;
BEGIN
  -- Buscar limite atual
  SELECT (config->>'limite_meses')::int INTO v_limite_atual
  FROM financeiro_contratos_honorarios
  WHERE id = p_contrato_id;

  -- Atualizar contrato: zerar meses_cobrados e opcionalmente atualizar limite
  UPDATE financeiro_contratos_honorarios
  SET config = config || jsonb_build_object(
    'meses_cobrados', 0,
    'limite_meses', COALESCE(p_novo_limite, v_limite_atual, 24)
  )
  WHERE id = p_contrato_id;

  -- Marcar alerta como renovado
  UPDATE financeiro_alertas_limite_contrato
  SET
    status = 'renovado',
    resolvido_em = NOW(),
    resolvido_por = p_user_id
  WHERE contrato_id = p_contrato_id
    AND status = 'pendente';

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 8. FUNÇÃO: ENCERRAR CONTRATO (QUANDO LIMITE ATINGIDO)
-- =============================================================================

CREATE OR REPLACE FUNCTION encerrar_contrato_limite(
  p_contrato_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Inativar contrato
  UPDATE financeiro_contratos_honorarios
  SET ativo = false
  WHERE id = p_contrato_id;

  -- Marcar alerta como encerrado
  UPDATE financeiro_alertas_limite_contrato
  SET
    status = 'encerrado',
    resolvido_em = NOW(),
    resolvido_por = p_user_id
  WHERE contrato_id = p_contrato_id
    AND status = 'pendente';

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 9. FUNÇÃO: GERAR FATURA A PARTIR DO FECHAMENTO
-- =============================================================================

CREATE OR REPLACE FUNCTION gerar_fatura_fechamento_pasta(
  p_fechamento_id UUID,
  p_user_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_fechamento RECORD;
  v_fatura_id UUID;
  v_numero_fatura TEXT;
  v_item JSONB;
BEGIN
  -- Buscar fechamento aprovado
  SELECT f.*, c.numero_contrato, p.nome_completo as cliente_nome
  INTO v_fechamento
  FROM financeiro_fechamentos_pasta f
  JOIN financeiro_contratos_honorarios c ON c.id = f.contrato_id
  JOIN crm_pessoas p ON p.id = f.cliente_id
  WHERE f.id = p_fechamento_id
    AND f.status = 'aprovado';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fechamento não encontrado ou não está aprovado';
  END IF;

  -- Gerar número da fatura
  SELECT 'FAT-' || TO_CHAR(NOW(), 'YYYYMM') || '-' ||
         LPAD((COUNT(*) + 1)::text, 4, '0')
  INTO v_numero_fatura
  FROM financeiro_faturamento_faturas
  WHERE escritorio_id = v_fechamento.escritorio_id
    AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW());

  -- Montar item da fatura com os processos
  v_item := jsonb_build_object(
    'tipo', 'pasta',
    'descricao', 'Honorários por pasta - ' || TO_CHAR(v_fechamento.competencia, 'MM/YYYY'),
    'competencia', v_fechamento.competencia,
    'qtd_processos', v_fechamento.qtd_processos,
    'valor_unitario', v_fechamento.valor_unitario,
    'valor_total', v_fechamento.valor_total,
    'processos', v_fechamento.processos,
    'fechamento_id', v_fechamento.id
  );

  -- Criar fatura
  INSERT INTO financeiro_faturamento_faturas (
    escritorio_id,
    cliente_id,
    numero_fatura,
    valor_total,
    status,
    itens,
    data_emissao,
    data_vencimento,
    created_by
  ) VALUES (
    v_fechamento.escritorio_id,
    v_fechamento.cliente_id,
    v_numero_fatura,
    v_fechamento.valor_total,
    'pendente',
    jsonb_build_array(v_item),
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '30 days',
    p_user_id
  )
  RETURNING id INTO v_fatura_id;

  -- Atualizar fechamento
  UPDATE financeiro_fechamentos_pasta
  SET
    status = 'faturado',
    fatura_id = v_fatura_id,
    faturado_em = NOW()
  WHERE id = p_fechamento_id;

  RETURN v_fatura_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 10. RLS POLICIES
-- =============================================================================

ALTER TABLE financeiro_fechamentos_pasta ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro_alertas_limite_contrato ENABLE ROW LEVEL SECURITY;

-- Fechamentos: usuários veem do seu escritório
DROP POLICY IF EXISTS fechamentos_pasta_select ON financeiro_fechamentos_pasta;
CREATE POLICY fechamentos_pasta_select ON financeiro_fechamentos_pasta
  FOR SELECT USING (
    escritorio_id IN (
      SELECT escritorio_id FROM profiles WHERE id = auth.uid()
      UNION
      SELECT escritorio_id FROM escritorio_membros WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS fechamentos_pasta_insert ON financeiro_fechamentos_pasta;
CREATE POLICY fechamentos_pasta_insert ON financeiro_fechamentos_pasta
  FOR INSERT WITH CHECK (
    escritorio_id IN (
      SELECT escritorio_id FROM profiles WHERE id = auth.uid()
      UNION
      SELECT escritorio_id FROM escritorio_membros WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS fechamentos_pasta_update ON financeiro_fechamentos_pasta;
CREATE POLICY fechamentos_pasta_update ON financeiro_fechamentos_pasta
  FOR UPDATE USING (
    escritorio_id IN (
      SELECT escritorio_id FROM profiles WHERE id = auth.uid()
      UNION
      SELECT escritorio_id FROM escritorio_membros WHERE user_id = auth.uid()
    )
  );

-- Alertas: usuários veem do seu escritório
DROP POLICY IF EXISTS alertas_limite_select ON financeiro_alertas_limite_contrato;
CREATE POLICY alertas_limite_select ON financeiro_alertas_limite_contrato
  FOR SELECT USING (
    escritorio_id IN (
      SELECT escritorio_id FROM profiles WHERE id = auth.uid()
      UNION
      SELECT escritorio_id FROM escritorio_membros WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS alertas_limite_insert ON financeiro_alertas_limite_contrato;
CREATE POLICY alertas_limite_insert ON financeiro_alertas_limite_contrato
  FOR INSERT WITH CHECK (
    escritorio_id IN (
      SELECT escritorio_id FROM profiles WHERE id = auth.uid()
      UNION
      SELECT escritorio_id FROM escritorio_membros WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS alertas_limite_update ON financeiro_alertas_limite_contrato;
CREATE POLICY alertas_limite_update ON financeiro_alertas_limite_contrato
  FOR UPDATE USING (
    escritorio_id IN (
      SELECT escritorio_id FROM profiles WHERE id = auth.uid()
      UNION
      SELECT escritorio_id FROM escritorio_membros WHERE user_id = auth.uid()
    )
  );

-- =============================================================================
-- 11. COMENTÁRIOS
-- =============================================================================

COMMENT ON TABLE financeiro_fechamentos_pasta IS 'Fechamentos mensais de contratos por pasta (honorários fixos por processo ativo)';
COMMENT ON TABLE financeiro_alertas_limite_contrato IS 'Alertas quando contratos por pasta atingem o limite de meses configurado';

COMMENT ON FUNCTION executar_fechamento_mensal_pasta IS 'Executa fechamento mensal para todos os contratos por pasta ativos. Chamado via cron no dia 1º de cada mês.';
COMMENT ON FUNCTION verificar_limites_contratos_pasta IS 'Verifica contratos que atingiram o limite de meses e cria alertas. Chamado após fechamento mensal.';
COMMENT ON FUNCTION renovar_contrato_pasta IS 'Renova um contrato por pasta, zerando o contador de meses cobrados.';
COMMENT ON FUNCTION gerar_fatura_fechamento_pasta IS 'Gera uma fatura a partir de um fechamento aprovado.';
