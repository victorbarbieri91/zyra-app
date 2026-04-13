-- ============================================================================
-- MONITORAMENTO HÍBRIDO DataJud + Escavador
-- ============================================================================
-- Fundamento da arquitetura híbrida de monitoramento de andamentos:
--   - DataJud (gratuito) é a fonte primária para os processos que ele cobre
--   - Escavador (semanal) é o fallback automático para os demais
--
-- Estados do processo (campo datajud_status):
--   desconhecido  → Acabou de ser cadastrado, ainda não foi testado
--   indexado      → DataJud retorna esse processo (≥2 chamadas confirmadas)
--   em_carencia   → DataJud não acha ainda; Escavador semanal cobre
--   nao_indexavel → DataJud não acha há 180 dias; Escavador permanente
--
-- Apenas processos com status='ativo' AND numero_cnj IS NOT NULL são monitorados.
-- Triggers cuidam automaticamente do ciclo de vida.
-- ============================================================================

-- ============================================================================
-- 1. COLUNAS EM processos_processos
-- ============================================================================

ALTER TABLE processos_processos
  ADD COLUMN IF NOT EXISTS datajud_status TEXT NOT NULL DEFAULT 'desconhecido'
    CHECK (datajud_status IN ('desconhecido','indexado','em_carencia','nao_indexavel')),
  ADD COLUMN IF NOT EXISTS datajud_ultimo_check TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS datajud_indexado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS datajud_tentativas_sem_sucesso INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS datajud_chamadas_com_sucesso INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS escavador_monitoramento_ativo BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_processos_datajud_ativos
  ON processos_processos(datajud_status, datajud_ultimo_check)
  WHERE status = 'ativo' AND numero_cnj IS NOT NULL;

-- ============================================================================
-- 2. COLUNAS EM processos_movimentacoes (dedup robusto)
-- ============================================================================

ALTER TABLE processos_movimentacoes
  ADD COLUMN IF NOT EXISTS fonte_codigo TEXT,
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS codigo_cnj_movimento INT,
  ADD COLUMN IF NOT EXISTS hash_movimento TEXT;

-- Backfill: fonte_codigo a partir de origem (mantém compatibilidade)
UPDATE processos_movimentacoes
SET fonte_codigo = COALESCE(origem, 'manual')
WHERE fonte_codigo IS NULL;

-- Backfill: hash baseado em (processo, dia, descricao) para o legado
-- Usa dia (não minuto) porque o sistema atual força T12:00:00Z em todos
UPDATE processos_movimentacoes
SET hash_movimento = encode(
  digest(
    processo_id::text || '|' ||
    to_char(data_movimento, 'YYYY-MM-DD') || '|' ||
    COALESCE(descricao, ''),
    'sha1'
  ),
  'hex'
)
WHERE hash_movimento IS NULL;

-- Índice único impede duplicatas daqui pra frente
CREATE UNIQUE INDEX IF NOT EXISTS idx_movs_dedup
  ON processos_movimentacoes(processo_id, hash_movimento)
  WHERE hash_movimento IS NOT NULL;

-- ============================================================================
-- 3. FILA DE AÇÕES PENDENTES PARA O ESCAVADOR
-- ============================================================================
-- Triggers no banco não podem fazer HTTP. Em vez disso, eles enfileiram
-- ações (CREATE/DELETE de monitoramento) que o cron processa em batch.

CREATE TABLE IF NOT EXISTS escavador_acoes_pendentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id UUID REFERENCES processos_processos(id) ON DELETE CASCADE,
  acao TEXT NOT NULL CHECK (acao IN ('CREATE','DELETE')),
  monitoramento_id INT,
  created_at TIMESTAMPTZ DEFAULT now(),
  executado_em TIMESTAMPTZ,
  erro TEXT
);

CREATE INDEX IF NOT EXISTS idx_escavador_acoes_pendentes_fila
  ON escavador_acoes_pendentes(executado_em)
  WHERE executado_em IS NULL;

CREATE INDEX IF NOT EXISTS idx_escavador_acoes_pendentes_processo
  ON escavador_acoes_pendentes(processo_id, created_at DESC);

-- ============================================================================
-- 4. ALERTAS DE PROCESSO APARENTEMENTE ENCERRADO
-- ============================================================================
-- Quando DataJud detecta movimentações com códigos CNJ terminais
-- (22=Baixa Definitiva, 848=Trânsito em julgado, 246=Arquivamento),
-- gera entrada aqui para o usuário confirmar o arquivamento.

CREATE TABLE IF NOT EXISTS processos_alertas_encerramento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id UUID NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,
  processo_id UUID NOT NULL REFERENCES processos_processos(id) ON DELETE CASCADE,
  movimentacao_id UUID REFERENCES processos_movimentacoes(id) ON DELETE SET NULL,
  codigo_cnj_detectado INT NOT NULL,
  nome_evento TEXT NOT NULL,
  data_evento TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente','confirmado','ignorado')),
  created_at TIMESTAMPTZ DEFAULT now(),
  resolvido_em TIMESTAMPTZ,
  resolvido_por UUID REFERENCES auth.users(id),
  justificativa TEXT,
  CONSTRAINT uq_alerta_encerramento UNIQUE (processo_id, codigo_cnj_detectado, data_evento)
);

CREATE INDEX IF NOT EXISTS idx_alertas_encerramento_pendentes
  ON processos_alertas_encerramento(escritorio_id, status, created_at DESC)
  WHERE status = 'pendente';

ALTER TABLE processos_alertas_encerramento ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON processos_alertas_encerramento;
CREATE POLICY "tenant_isolation" ON processos_alertas_encerramento
  FOR ALL
  USING (
    escritorio_id IN (
      SELECT escritorio_id
      FROM escritorios_usuarios
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    escritorio_id IN (
      SELECT escritorio_id
      FROM escritorios_usuarios
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- 5. LOG DE EXECUÇÃO DO CRON DataJud
-- ============================================================================

CREATE TABLE IF NOT EXISTS datajud_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fonte TEXT NOT NULL DEFAULT 'datajud' CHECK (fonte IN ('datajud','escavador')),
  executado_em TIMESTAMPTZ DEFAULT now(),
  duracao_ms INT,
  processos_consultados INT DEFAULT 0,
  processos_encontrados INT DEFAULT 0,
  movimentacoes_novas INT DEFAULT 0,
  graduacoes INT DEFAULT 0,
  rebaixamentos INT DEFAULT 0,
  alertas_encerramento_criados INT DEFAULT 0,
  acoes_escavador_executadas INT DEFAULT 0,
  erros JSONB
);

CREATE INDEX IF NOT EXISTS idx_datajud_sync_log_data
  ON datajud_sync_log(executado_em DESC);

-- ============================================================================
-- 6. FUNÇÃO AUXILIAR: deve consultar DataJud hoje? (retry exponencial)
-- ============================================================================
-- Lógica de retry escalonado:
--   indexado     → todo dia (pega novidades)
--   desconhecido → todo dia (testa o quanto antes)
--   em_carencia, tentativas ≤ 30  → todo dia
--   em_carencia, tentativas 31-90 → a cada 3 dias
--   em_carencia, tentativas 91-180 → semanal
--   em_carencia, tentativas > 180 → vira nao_indexavel (handled no cron)
--   nao_indexavel → nunca (já é Escavador permanente)

CREATE OR REPLACE FUNCTION deve_consultar_datajud_hoje(
  p_status TEXT,
  p_ultimo_check TIMESTAMPTZ,
  p_tentativas INT
) RETURNS BOOLEAN AS $$
BEGIN
  IF p_status = 'indexado' OR p_status = 'desconhecido' THEN
    RETURN TRUE;
  END IF;

  IF p_status = 'em_carencia' THEN
    IF p_tentativas <= 30 THEN
      RETURN TRUE;
    ELSIF p_tentativas <= 90 THEN
      RETURN p_ultimo_check IS NULL OR p_ultimo_check < (now() - INTERVAL '3 days');
    ELSIF p_tentativas <= 180 THEN
      RETURN p_ultimo_check IS NULL OR p_ultimo_check < (now() - INTERVAL '7 days');
    END IF;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- 7. TRIGGER: mudança de status do processo
-- ============================================================================
-- Quando processo deixa de ser ativo: enfileira DELETE Escavador, reseta DataJud
-- Quando processo volta a ser ativo: reseta DataJud para reclassificar

CREATE OR REPLACE FUNCTION trigger_processo_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Saiu de ativo
  IF OLD.status = 'ativo' AND NEW.status IS DISTINCT FROM 'ativo' THEN
    NEW.escavador_monitoramento_ativo := FALSE;
    NEW.datajud_status := 'desconhecido';
    NEW.datajud_tentativas_sem_sucesso := 0;
    NEW.datajud_chamadas_com_sucesso := 0;

    IF OLD.escavador_monitoramento_id IS NOT NULL THEN
      INSERT INTO escavador_acoes_pendentes (processo_id, acao, monitoramento_id)
      VALUES (NEW.id, 'DELETE', OLD.escavador_monitoramento_id);
    END IF;
  END IF;

  -- Voltou para ativo
  IF OLD.status IS DISTINCT FROM 'ativo' AND NEW.status = 'ativo' THEN
    NEW.datajud_status := 'desconhecido';
    NEW.datajud_tentativas_sem_sucesso := 0;
    NEW.datajud_chamadas_com_sucesso := 0;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_processo_status_change ON processos_processos;
CREATE TRIGGER trg_processo_status_change
  BEFORE UPDATE OF status ON processos_processos
  FOR EACH ROW
  EXECUTE FUNCTION trigger_processo_status_change();

-- ============================================================================
-- 8. TRIGGER: adição de CNJ a processo manual
-- ============================================================================
-- Permite que processos cadastrados sem CNJ entrem no fluxo quando o CNJ
-- for adicionado depois.

CREATE OR REPLACE FUNCTION trigger_processo_cnj_added()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'ativo'
     AND OLD.numero_cnj IS NULL
     AND NEW.numero_cnj IS NOT NULL THEN
    NEW.datajud_status := 'desconhecido';
    NEW.datajud_tentativas_sem_sucesso := 0;
    NEW.datajud_chamadas_com_sucesso := 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_processo_cnj_added ON processos_processos;
CREATE TRIGGER trg_processo_cnj_added
  BEFORE UPDATE OF numero_cnj ON processos_processos
  FOR EACH ROW
  EXECUTE FUNCTION trigger_processo_cnj_added();

-- ============================================================================
-- 9. RPC: confirmar alerta de encerramento (arquiva o processo)
-- ============================================================================

CREATE OR REPLACE FUNCTION confirmar_alerta_encerramento(
  p_alerta_id UUID
) RETURNS VOID AS $$
DECLARE
  v_processo_id UUID;
BEGIN
  SELECT processo_id INTO v_processo_id
  FROM processos_alertas_encerramento
  WHERE id = p_alerta_id AND status = 'pendente';

  IF v_processo_id IS NULL THEN
    RAISE EXCEPTION 'Alerta não encontrado ou já resolvido';
  END IF;

  -- Arquiva o processo (trigger cuida do cancelamento Escavador)
  UPDATE processos_processos
  SET status = 'arquivado'
  WHERE id = v_processo_id;

  -- Marca alerta como confirmado
  UPDATE processos_alertas_encerramento
  SET status = 'confirmado',
      resolvido_em = now(),
      resolvido_por = auth.uid()
  WHERE id = p_alerta_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 10. RPC: ignorar alerta de encerramento
-- ============================================================================

CREATE OR REPLACE FUNCTION ignorar_alerta_encerramento(
  p_alerta_id UUID,
  p_justificativa TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  UPDATE processos_alertas_encerramento
  SET status = 'ignorado',
      resolvido_em = now(),
      resolvido_por = auth.uid(),
      justificativa = p_justificativa
  WHERE id = p_alerta_id AND status = 'pendente';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Alerta não encontrado ou já resolvido';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
