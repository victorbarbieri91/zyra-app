-- =====================================================
-- MIGRATION: Lógica de Cobrança de Honorários
-- =====================================================
-- Implementa:
-- 1. Determinação automática de cobrabilidade (faturavel_auto)
-- 2. Campo horas_faturaveis para contratos misto
-- 3. Tabela financeiro_alertas_cobranca
-- 4. Tabela financeiro_mapeamento_atos_movimentacao
-- 5. Funções e triggers para automação
-- 6. View atualizada v_timesheet_aprovacao
-- =====================================================

-- 1. NOVAS COLUNAS
ALTER TABLE financeiro_timesheet ADD COLUMN IF NOT EXISTS faturavel_auto BOOLEAN DEFAULT NULL;
ALTER TABLE financeiro_contratos_honorarios ADD COLUMN IF NOT EXISTS horas_faturaveis BOOLEAN DEFAULT true;

-- 2. TABELA DE ALERTAS
CREATE TABLE IF NOT EXISTS financeiro_alertas_cobranca (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id UUID NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,
  processo_id UUID NOT NULL REFERENCES processos_processos(id) ON DELETE CASCADE,
  movimentacao_id UUID,
  ato_tipo_id UUID REFERENCES financeiro_atos_processuais_tipos(id) ON DELETE SET NULL,
  tipo_alerta TEXT NOT NULL DEFAULT 'ato_processual',
  titulo TEXT NOT NULL,
  descricao TEXT,
  valor_sugerido NUMERIC(15,2),
  status TEXT NOT NULL DEFAULT 'pendente',
  receita_id UUID REFERENCES financeiro_receitas(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolvido_em TIMESTAMPTZ,
  resolvido_por UUID REFERENCES profiles(id) ON DELETE SET NULL,
  justificativa_ignorado TEXT,
  CONSTRAINT chk_tipo_alerta CHECK (tipo_alerta IN ('ato_processual', 'prazo_vencido', 'mensal', 'manual')),
  CONSTRAINT chk_status_alerta CHECK (status IN ('pendente', 'cobrado', 'ignorado'))
);

CREATE INDEX IF NOT EXISTS idx_alertas_cobranca_escritorio ON financeiro_alertas_cobranca(escritorio_id);
CREATE INDEX IF NOT EXISTS idx_alertas_cobranca_processo ON financeiro_alertas_cobranca(processo_id);
CREATE INDEX IF NOT EXISTS idx_alertas_cobranca_status ON financeiro_alertas_cobranca(status) WHERE status = 'pendente';
CREATE INDEX IF NOT EXISTS idx_alertas_cobranca_processo_status ON financeiro_alertas_cobranca(processo_id, status);

COMMENT ON TABLE financeiro_alertas_cobranca IS
  'Alertas de cobrança gerados automaticamente por movimentações ou manualmente';

-- =====================================================
-- 3. TABELA DE MAPEAMENTO ATOS ↔ MOVIMENTAÇÃO
-- =====================================================

CREATE TABLE IF NOT EXISTS financeiro_mapeamento_atos_movimentacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id UUID NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,
  ato_tipo_id UUID NOT NULL REFERENCES financeiro_atos_processuais_tipos(id) ON DELETE CASCADE,
  palavras_chave TEXT[] NOT NULL DEFAULT '{}',
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT uq_mapeamento_ato UNIQUE(escritorio_id, ato_tipo_id)
);

CREATE INDEX IF NOT EXISTS idx_mapeamento_atos_escritorio ON financeiro_mapeamento_atos_movimentacao(escritorio_id);

COMMENT ON TABLE financeiro_mapeamento_atos_movimentacao IS
  'Mapeamento de palavras-chave para detectar atos processuais em movimentações';

-- =====================================================
-- 4. FUNÇÃO: calcular_faturavel_timesheet
-- =====================================================

CREATE OR REPLACE FUNCTION calcular_faturavel_timesheet(
  p_processo_id UUID,
  p_consulta_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_contrato_id UUID;
  v_forma_cobranca TEXT;
  v_horas_faturaveis BOOLEAN;
BEGIN
  -- Buscar contrato do processo
  IF p_processo_id IS NOT NULL THEN
    SELECT contrato_id INTO v_contrato_id
    FROM processos_processos
    WHERE id = p_processo_id;
  -- Buscar contrato da consulta
  ELSIF p_consulta_id IS NOT NULL THEN
    SELECT contrato_id INTO v_contrato_id
    FROM consultivo_consultas
    WHERE id = p_consulta_id;
  END IF;

  -- Se não tem contrato, default é cobrável
  IF v_contrato_id IS NULL THEN
    RETURN true;
  END IF;

  -- Buscar forma de cobrança e config do contrato
  SELECT forma_cobranca, horas_faturaveis
  INTO v_forma_cobranca, v_horas_faturaveis
  FROM financeiro_contratos_honorarios
  WHERE id = v_contrato_id AND ativo = true;

  -- Se contrato inativo ou não encontrado, default cobrável
  IF v_forma_cobranca IS NULL THEN
    RETURN true;
  END IF;

  -- Determinar cobrabilidade baseado no tipo de contrato
  RETURN CASE v_forma_cobranca
    WHEN 'por_hora' THEN true      -- Horas são cobráveis
    WHEN 'por_cargo' THEN true     -- Horas por cargo são cobráveis
    WHEN 'fixo' THEN false         -- Fixo: horas não cobráveis
    WHEN 'por_pasta' THEN false    -- Por pasta: horas não cobráveis
    WHEN 'por_ato' THEN false      -- Por ato: horas não cobráveis (cobra atos)
    WHEN 'por_etapa' THEN false    -- Por etapa: horas não cobráveis
    WHEN 'misto' THEN COALESCE(v_horas_faturaveis, true) -- Usa config do contrato
    ELSE true                       -- Default: cobrável
  END;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calcular_faturavel_timesheet IS
  'Calcula se um registro de timesheet deve ser faturável baseado no contrato vinculado';

-- =====================================================
-- 5. TRIGGER: Auto-set faturavel em timesheet
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_set_faturavel_auto()
RETURNS TRIGGER AS $$
DECLARE
  v_faturavel_calculado BOOLEAN;
BEGIN
  -- Calcular faturavel baseado no contrato
  v_faturavel_calculado := calcular_faturavel_timesheet(NEW.processo_id, NEW.consulta_id);

  -- Em INSERT, sempre calcula automaticamente
  IF TG_OP = 'INSERT' THEN
    NEW.faturavel := v_faturavel_calculado;
    NEW.faturavel_auto := true;
  -- Em UPDATE, só recalcula se processo/consulta mudou
  ELSIF TG_OP = 'UPDATE' THEN
    IF (OLD.processo_id IS DISTINCT FROM NEW.processo_id) OR
       (OLD.consulta_id IS DISTINCT FROM NEW.consulta_id) THEN
      NEW.faturavel := v_faturavel_calculado;
      NEW.faturavel_auto := true;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Dropar trigger antigo se existir
DROP TRIGGER IF EXISTS trg_timesheet_set_faturavel ON financeiro_timesheet;

-- Criar trigger
CREATE TRIGGER trg_timesheet_set_faturavel
  BEFORE INSERT OR UPDATE ON financeiro_timesheet
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_faturavel_auto();

COMMENT ON FUNCTION trigger_set_faturavel_auto IS
  'Trigger que define automaticamente faturavel baseado no contrato do processo/consulta';

-- =====================================================
-- 6. FUNÇÃO: get_tarefa_faturavel
-- =====================================================

CREATE OR REPLACE FUNCTION get_tarefa_faturavel(p_tarefa_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_processo_id UUID;
  v_consultivo_id UUID;
BEGIN
  -- Buscar processo ou consultivo da tarefa
  SELECT processo_id, consultivo_id
  INTO v_processo_id, v_consultivo_id
  FROM agenda_tarefas
  WHERE id = p_tarefa_id;

  -- Usar função de cálculo
  RETURN calcular_faturavel_timesheet(v_processo_id, v_consultivo_id);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_tarefa_faturavel IS
  'Retorna se horas de uma tarefa são faturáveis baseado no contrato vinculado';

-- =====================================================
-- 7. FUNÇÃO: converter_alerta_em_receita
-- =====================================================

CREATE OR REPLACE FUNCTION converter_alerta_em_receita(
  p_alerta_id UUID,
  p_valor NUMERIC DEFAULT NULL,
  p_descricao TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_alerta RECORD;
  v_receita_id UUID;
  v_cliente_id UUID;
  v_escritorio_id UUID;
  v_ato_nome TEXT;
BEGIN
  -- Buscar alerta pendente
  SELECT * INTO v_alerta
  FROM financeiro_alertas_cobranca
  WHERE id = p_alerta_id AND status = 'pendente';

  IF v_alerta IS NULL THEN
    RAISE EXCEPTION 'Alerta não encontrado ou já processado';
  END IF;

  -- Buscar cliente do processo
  SELECT pp.cliente_id, pp.escritorio_id
  INTO v_cliente_id, v_escritorio_id
  FROM processos_processos pp
  WHERE pp.id = v_alerta.processo_id;

  -- Buscar nome do ato
  SELECT nome INTO v_ato_nome
  FROM financeiro_atos_processuais_tipos
  WHERE id = v_alerta.ato_tipo_id;

  -- Criar receita de honorário
  INSERT INTO financeiro_receitas (
    escritorio_id,
    cliente_id,
    processo_id,
    tipo,
    categoria,
    descricao,
    valor,
    data_vencimento,
    status,
    created_by
  ) VALUES (
    v_escritorio_id,
    v_cliente_id,
    v_alerta.processo_id,
    'honorario',
    'ato_processual',
    COALESCE(p_descricao, v_alerta.titulo, v_ato_nome, 'Honorário de ato processual'),
    COALESCE(p_valor, v_alerta.valor_sugerido, 0),
    CURRENT_DATE + INTERVAL '30 days',
    'pendente',
    p_user_id
  ) RETURNING id INTO v_receita_id;

  -- Atualizar alerta como cobrado
  UPDATE financeiro_alertas_cobranca SET
    status = 'cobrado',
    receita_id = v_receita_id,
    resolvido_em = NOW(),
    resolvido_por = p_user_id,
    updated_at = NOW()
  WHERE id = p_alerta_id;

  RETURN v_receita_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION converter_alerta_em_receita IS
  'Converte um alerta de cobrança pendente em uma receita de honorário';

-- =====================================================
-- 8. FUNÇÃO: ignorar_alerta_cobranca
-- =====================================================

CREATE OR REPLACE FUNCTION ignorar_alerta_cobranca(
  p_alerta_id UUID,
  p_justificativa TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE financeiro_alertas_cobranca SET
    status = 'ignorado',
    justificativa_ignorado = p_justificativa,
    resolvido_em = NOW(),
    resolvido_por = p_user_id,
    updated_at = NOW()
  WHERE id = p_alerta_id AND status = 'pendente';

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION ignorar_alerta_cobranca IS
  'Marca um alerta de cobrança como ignorado com justificativa opcional';

-- =====================================================
-- 9. FUNÇÃO: criar_alerta_cobranca_manual
-- =====================================================

CREATE OR REPLACE FUNCTION criar_alerta_cobranca_manual(
  p_processo_id UUID,
  p_ato_tipo_id UUID,
  p_valor_sugerido NUMERIC DEFAULT NULL,
  p_titulo TEXT DEFAULT NULL,
  p_descricao TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_alerta_id UUID;
  v_escritorio_id UUID;
  v_ato_nome TEXT;
BEGIN
  -- Buscar escritório do processo
  SELECT escritorio_id INTO v_escritorio_id
  FROM processos_processos
  WHERE id = p_processo_id;

  -- Buscar nome do ato
  SELECT nome INTO v_ato_nome
  FROM financeiro_atos_processuais_tipos
  WHERE id = p_ato_tipo_id;

  -- Criar alerta
  INSERT INTO financeiro_alertas_cobranca (
    escritorio_id,
    processo_id,
    ato_tipo_id,
    tipo_alerta,
    titulo,
    descricao,
    valor_sugerido,
    status
  ) VALUES (
    v_escritorio_id,
    p_processo_id,
    p_ato_tipo_id,
    'manual',
    COALESCE(p_titulo, v_ato_nome, 'Cobrança manual'),
    p_descricao,
    p_valor_sugerido,
    'pendente'
  ) RETURNING id INTO v_alerta_id;

  RETURN v_alerta_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION criar_alerta_cobranca_manual IS
  'Cria um alerta de cobrança manual para um processo';

-- =====================================================
-- 10. TRIGGER: Detectar ato cobrável em movimentação
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_detectar_ato_cobravel()
RETURNS TRIGGER AS $$
DECLARE
  v_contrato_id UUID;
  v_forma_cobranca TEXT;
  v_escritorio_id UUID;
  v_area_juridica TEXT;
  v_valor_causa NUMERIC;
  v_mapeamento RECORD;
  v_ato RECORD;
  v_valor_sugerido NUMERIC;
  v_descricao_lower TEXT;
  v_tipo_lower TEXT;
BEGIN
  -- Buscar dados do processo
  SELECT
    pp.contrato_id,
    pp.escritorio_id,
    pp.area,
    pp.valor_causa
  INTO
    v_contrato_id,
    v_escritorio_id,
    v_area_juridica,
    v_valor_causa
  FROM processos_processos pp
  WHERE pp.id = NEW.processo_id;

  -- Se não tem contrato, sair
  IF v_contrato_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Verificar forma de cobrança do contrato
  SELECT forma_cobranca INTO v_forma_cobranca
  FROM financeiro_contratos_honorarios
  WHERE id = v_contrato_id AND ativo = true;

  -- Só processar contratos por_ato
  IF v_forma_cobranca != 'por_ato' THEN
    RETURN NEW;
  END IF;

  -- Preparar texto para busca
  v_descricao_lower := LOWER(COALESCE(NEW.descricao, ''));
  v_tipo_lower := LOWER(COALESCE(NEW.tipo, ''));

  -- Buscar mapeamentos de atos para este escritório
  FOR v_mapeamento IN
    SELECT m.*, t.nome AS ato_nome, t.codigo AS ato_codigo
    FROM financeiro_mapeamento_atos_movimentacao m
    JOIN financeiro_atos_processuais_tipos t ON t.id = m.ato_tipo_id
    WHERE m.escritorio_id = v_escritorio_id
    AND m.ativo = true
    AND t.ativo = true
  LOOP
    -- Verificar se alguma palavra-chave aparece na descrição ou tipo
    IF EXISTS (
      SELECT 1 FROM unnest(v_mapeamento.palavras_chave) AS palavra
      WHERE v_descricao_lower LIKE '%' || LOWER(palavra) || '%'
         OR v_tipo_lower LIKE '%' || LOWER(palavra) || '%'
    ) THEN
      -- Calcular valor sugerido do contrato
      SELECT
        COALESCE(
          (elem->>'valor_fixo')::NUMERIC,
          CASE
            WHEN (elem->>'percentual_valor_causa')::NUMERIC IS NOT NULL
            THEN v_valor_causa * (elem->>'percentual_valor_causa')::NUMERIC / 100
            ELSE NULL
          END
        )
      INTO v_valor_sugerido
      FROM financeiro_contratos_honorarios fch,
           jsonb_array_elements(fch.atos) AS elem
      WHERE fch.id = v_contrato_id
      AND (elem->>'ato_tipo_id')::UUID = v_mapeamento.ato_tipo_id
      LIMIT 1;

      -- Verificar se já existe alerta para esta movimentação
      IF NOT EXISTS (
        SELECT 1 FROM financeiro_alertas_cobranca
        WHERE movimentacao_id = NEW.id
      ) THEN
        -- Criar alerta
        INSERT INTO financeiro_alertas_cobranca (
          escritorio_id,
          processo_id,
          movimentacao_id,
          ato_tipo_id,
          tipo_alerta,
          titulo,
          descricao,
          valor_sugerido,
          status
        ) VALUES (
          v_escritorio_id,
          NEW.processo_id,
          NEW.id,
          v_mapeamento.ato_tipo_id,
          'ato_processual',
          v_mapeamento.ato_nome,
          'Detectado automaticamente: ' || COALESCE(NEW.descricao, NEW.tipo, ''),
          v_valor_sugerido,
          'pendente'
        );
      END IF;

      -- Sair após encontrar primeiro match
      EXIT;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Dropar trigger antigo se existir
DROP TRIGGER IF EXISTS trg_movimentacao_detectar_ato ON processos_movimentacoes;

-- Criar trigger
CREATE TRIGGER trg_movimentacao_detectar_ato
  AFTER INSERT ON processos_movimentacoes
  FOR EACH ROW
  EXECUTE FUNCTION trigger_detectar_ato_cobravel();

COMMENT ON FUNCTION trigger_detectar_ato_cobravel IS
  'Detecta atos cobráveis em movimentações e cria alertas automáticos';

-- =====================================================
-- 11. VIEW: v_timesheet_aprovacao (atualizada)
-- =====================================================

CREATE OR REPLACE VIEW v_timesheet_aprovacao AS
SELECT
  t.id,
  t.escritorio_id,
  e.nome AS nome_escritorio,
  t.user_id,
  p.nome_completo AS colaborador_nome,
  t.processo_id,
  proc.numero_cnj AS numero_processo,
  proc.numero_pasta AS processo_pasta,
  t.consulta_id,
  cons.titulo AS consulta_titulo,
  t.tarefa_id,
  t.data_trabalho,
  t.hora_inicio,
  t.hora_fim,
  t.horas,
  t.atividade,
  t.origem,
  t.faturavel,
  t.faturavel_auto,
  t.faturado,
  t.fatura_id,
  t.aprovado,
  t.aprovado_por,
  t.aprovado_em,
  t.reprovado,
  t.reprovado_por,
  t.reprovado_em,
  t.justificativa_reprovacao,
  -- Status calculado
  CASE
    WHEN t.aprovado = true THEN 'aprovado'
    WHEN t.reprovado = true THEN 'reprovado'
    ELSE 'pendente'
  END AS status,
  -- Cliente
  CASE
    WHEN t.processo_id IS NOT NULL THEN (
      SELECT c.nome_completo
      FROM crm_pessoas c
      WHERE c.id = proc.cliente_id
    )
    WHEN t.consulta_id IS NOT NULL THEN (
      SELECT c.nome_completo
      FROM crm_pessoas c
      WHERE c.id = cons.cliente_id
    )
    ELSE NULL
  END AS cliente_nome,
  -- Contrato info
  COALESCE(proc.contrato_id, cons.contrato_id) AS contrato_id,
  COALESCE(
    (SELECT ch.forma_cobranca FROM financeiro_contratos_honorarios ch WHERE ch.id = proc.contrato_id),
    (SELECT ch.forma_cobranca FROM financeiro_contratos_honorarios ch WHERE ch.id = cons.contrato_id)
  ) AS forma_cobranca_contrato,
  -- Valor hora calculado
  get_valor_hora_efetivo(
    COALESCE(proc.contrato_id, cons.contrato_id),
    t.user_id
  ) AS valor_hora_calculado,
  -- Valor total estimado
  t.horas * get_valor_hora_efetivo(
    COALESCE(proc.contrato_id, cons.contrato_id),
    t.user_id
  ) AS valor_total_estimado,
  -- Editado
  t.editado,
  t.editado_em,
  t.editado_por,
  t.created_at,
  t.updated_at
FROM financeiro_timesheet t
JOIN escritorios e ON e.id = t.escritorio_id
JOIN profiles p ON p.id = t.user_id
LEFT JOIN processos_processos proc ON proc.id = t.processo_id
LEFT JOIN consultivo_consultas cons ON cons.id = t.consulta_id
ORDER BY t.data_trabalho DESC, t.created_at DESC;

COMMENT ON VIEW v_timesheet_aprovacao IS
  'View completa de timesheet com status calculado, info de contrato e valores para aprovação';

-- =====================================================
-- 12. VIEW: v_alertas_cobranca_pendentes
-- =====================================================

CREATE OR REPLACE VIEW v_alertas_cobranca_pendentes AS
SELECT
  fac.id,
  fac.escritorio_id,
  fac.processo_id,
  fac.movimentacao_id,
  fac.ato_tipo_id,
  fac.tipo_alerta,
  fac.titulo,
  fac.descricao,
  fac.valor_sugerido,
  fac.status,
  fac.created_at,
  pp.numero_cnj AS processo_numero,
  pp.numero_pasta AS processo_pasta,
  pp.area AS processo_area,
  pp.cliente_id,
  c.nome_completo AS cliente_nome,
  fapt.codigo AS ato_codigo,
  fapt.nome AS ato_nome,
  pm.tipo AS movimentacao_tipo,
  pm.descricao AS movimentacao_descricao,
  pm.data AS movimentacao_data
FROM financeiro_alertas_cobranca fac
JOIN processos_processos pp ON pp.id = fac.processo_id
LEFT JOIN crm_pessoas c ON c.id = pp.cliente_id
LEFT JOIN financeiro_atos_processuais_tipos fapt ON fapt.id = fac.ato_tipo_id
LEFT JOIN processos_movimentacoes pm ON pm.id = fac.movimentacao_id
WHERE fac.status = 'pendente'
ORDER BY fac.created_at DESC;

COMMENT ON VIEW v_alertas_cobranca_pendentes IS
  'View de alertas de cobrança pendentes com dados do processo e cliente';

-- =====================================================
-- 13. VIEW: v_historico_cobrancas_processo
-- =====================================================

CREATE OR REPLACE VIEW v_historico_cobrancas_processo AS
SELECT
  fr.id,
  fr.escritorio_id,
  fr.processo_id,
  fr.cliente_id,
  fr.tipo,
  fr.categoria,
  fr.descricao,
  fr.valor,
  fr.data_vencimento,
  fr.data_pagamento,
  fr.status,
  fr.created_at,
  pp.numero_cnj AS processo_numero,
  pp.numero_pasta AS processo_pasta,
  c.nome_completo AS cliente_nome
FROM financeiro_receitas fr
JOIN processos_processos pp ON pp.id = fr.processo_id
LEFT JOIN crm_pessoas c ON c.id = fr.cliente_id
WHERE fr.tipo = 'honorario'
AND fr.processo_id IS NOT NULL
ORDER BY fr.created_at DESC;

COMMENT ON VIEW v_historico_cobrancas_processo IS
  'Histórico de cobranças de honorários por processo';

-- =====================================================
-- 14. RLS POLICIES
-- =====================================================

-- financeiro_alertas_cobranca
ALTER TABLE financeiro_alertas_cobranca ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS alertas_select_by_escritorio ON financeiro_alertas_cobranca;
CREATE POLICY alertas_select_by_escritorio ON financeiro_alertas_cobranca
  FOR SELECT USING (
    escritorio_id IN (
      SELECT escritorio_id FROM escritorios_usuarios WHERE user_id = auth.uid() AND ativo = true
    )
  );

DROP POLICY IF EXISTS alertas_insert_by_escritorio ON financeiro_alertas_cobranca;
CREATE POLICY alertas_insert_by_escritorio ON financeiro_alertas_cobranca
  FOR INSERT WITH CHECK (
    escritorio_id IN (
      SELECT escritorio_id FROM escritorios_usuarios WHERE user_id = auth.uid() AND ativo = true
    )
  );

DROP POLICY IF EXISTS alertas_update_by_escritorio ON financeiro_alertas_cobranca;
CREATE POLICY alertas_update_by_escritorio ON financeiro_alertas_cobranca
  FOR UPDATE USING (
    escritorio_id IN (
      SELECT escritorio_id FROM escritorios_usuarios WHERE user_id = auth.uid() AND ativo = true
    )
  );

DROP POLICY IF EXISTS alertas_delete_by_escritorio ON financeiro_alertas_cobranca;
CREATE POLICY alertas_delete_by_escritorio ON financeiro_alertas_cobranca
  FOR DELETE USING (
    escritorio_id IN (
      SELECT escritorio_id FROM escritorios_usuarios WHERE user_id = auth.uid() AND ativo = true
    )
  );

-- financeiro_mapeamento_atos_movimentacao
ALTER TABLE financeiro_mapeamento_atos_movimentacao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mapeamento_atos_select ON financeiro_mapeamento_atos_movimentacao;
CREATE POLICY mapeamento_atos_select ON financeiro_mapeamento_atos_movimentacao
  FOR SELECT USING (
    escritorio_id IN (
      SELECT escritorio_id FROM escritorios_usuarios WHERE user_id = auth.uid() AND ativo = true
    )
  );

DROP POLICY IF EXISTS mapeamento_atos_insert ON financeiro_mapeamento_atos_movimentacao;
CREATE POLICY mapeamento_atos_insert ON financeiro_mapeamento_atos_movimentacao
  FOR INSERT WITH CHECK (
    escritorio_id IN (
      SELECT escritorio_id FROM escritorios_usuarios WHERE user_id = auth.uid() AND ativo = true
    )
  );

DROP POLICY IF EXISTS mapeamento_atos_update ON financeiro_mapeamento_atos_movimentacao;
CREATE POLICY mapeamento_atos_update ON financeiro_mapeamento_atos_movimentacao
  FOR UPDATE USING (
    escritorio_id IN (
      SELECT escritorio_id FROM escritorios_usuarios WHERE user_id = auth.uid() AND ativo = true
    )
  );

DROP POLICY IF EXISTS mapeamento_atos_delete ON financeiro_mapeamento_atos_movimentacao;
CREATE POLICY mapeamento_atos_delete ON financeiro_mapeamento_atos_movimentacao
  FOR DELETE USING (
    escritorio_id IN (
      SELECT escritorio_id FROM escritorios_usuarios WHERE user_id = auth.uid() AND ativo = true
    )
  );

-- =====================================================
-- 15. GRANTS
-- =====================================================

GRANT SELECT ON v_timesheet_aprovacao TO authenticated;
GRANT SELECT ON v_alertas_cobranca_pendentes TO authenticated;
GRANT SELECT ON v_historico_cobrancas_processo TO authenticated;

GRANT EXECUTE ON FUNCTION calcular_faturavel_timesheet TO authenticated;
GRANT EXECUTE ON FUNCTION get_tarefa_faturavel TO authenticated;
GRANT EXECUTE ON FUNCTION converter_alerta_em_receita TO authenticated;
GRANT EXECUTE ON FUNCTION ignorar_alerta_cobranca TO authenticated;
GRANT EXECUTE ON FUNCTION criar_alerta_cobranca_manual TO authenticated;

-- =====================================================
-- 16. SEED: Mapeamento padrão de palavras-chave
-- =====================================================

-- Inserir mapeamento padrão para cada escritório existente
INSERT INTO financeiro_mapeamento_atos_movimentacao (escritorio_id, ato_tipo_id, palavras_chave)
SELECT
  e.id AS escritorio_id,
  fapt.id AS ato_tipo_id,
  CASE fapt.codigo
    WHEN 'inicial' THEN ARRAY['petição inicial', 'distribuída', 'ajuizada', 'proposta']
    WHEN 'contestacao' THEN ARRAY['contestação', 'contestacao', 'defesa apresentada', 'resposta']
    WHEN 'audiencia' THEN ARRAY['audiência', 'audiencia', 'designada audiência', 'realizada audiência']
    WHEN 'sentenca' THEN ARRAY['sentença', 'sentenca', 'julgado', 'proferida sentença']
    WHEN 'recurso' THEN ARRAY['recurso', 'apelação', 'apelacao', 'agravo', 'interposto recurso']
    WHEN 'acordao' THEN ARRAY['acórdão', 'acordao', 'v.u.', 'por maioria']
    WHEN 'exito' THEN ARRAY['procedente', 'deferido', 'ganho de causa', 'êxito']
    ELSE ARRAY[]::TEXT[]
  END AS palavras_chave
FROM escritorios e
CROSS JOIN financeiro_atos_processuais_tipos fapt
WHERE fapt.escritorio_id = e.id
AND fapt.ativo = true
ON CONFLICT (escritorio_id, ato_tipo_id) DO UPDATE SET
  palavras_chave = EXCLUDED.palavras_chave,
  updated_at = NOW();
