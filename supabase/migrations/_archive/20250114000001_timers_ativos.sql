-- =====================================================
-- MIGRATION: Sistema de Timers para Timesheet
-- Data: 2025-01-14
-- Descrição: Cria tabela de timers ativos, campos extras
--            no timesheet, funções RPC e políticas RLS
-- =====================================================

-- =====================================================
-- 1. TABELA: timers_ativos
-- =====================================================

CREATE TABLE IF NOT EXISTS timers_ativos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id UUID NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Vinculações (processo ou consulta obrigatório)
  processo_id UUID REFERENCES processos_processos(id) ON DELETE CASCADE,
  consulta_id UUID REFERENCES consultivo_consultas(id) ON DELETE CASCADE,
  tarefa_id UUID REFERENCES agenda_tarefas(id) ON DELETE SET NULL,

  -- Dados do timer
  titulo TEXT NOT NULL,
  descricao TEXT,
  hora_inicio TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  hora_pausa TIMESTAMPTZ, -- NULL se rodando, preenchido se pausado
  segundos_acumulados INTEGER DEFAULT 0, -- Tempo acumulado antes de pausas

  -- Status e configurações
  status TEXT NOT NULL DEFAULT 'rodando' CHECK (status IN ('rodando', 'pausado')),
  faturavel BOOLEAN DEFAULT true,
  cor TEXT, -- Cor opcional para identificação visual

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_timers_ativos_user ON timers_ativos(user_id, status);
CREATE INDEX IF NOT EXISTS idx_timers_ativos_escritorio ON timers_ativos(escritorio_id);
CREATE INDEX IF NOT EXISTS idx_timers_ativos_tarefa ON timers_ativos(tarefa_id) WHERE tarefa_id IS NOT NULL;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_timers_ativos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_timers_ativos_updated_at ON timers_ativos;
CREATE TRIGGER trigger_timers_ativos_updated_at
  BEFORE UPDATE ON timers_ativos
  FOR EACH ROW
  EXECUTE FUNCTION update_timers_ativos_updated_at();

-- =====================================================
-- 2. ALTERAÇÕES NA TABELA financeiro_timesheet
-- =====================================================

-- Adicionar campos para controle de horários e origem
ALTER TABLE financeiro_timesheet
  ADD COLUMN IF NOT EXISTS hora_inicio TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS hora_fim TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tarefa_id UUID REFERENCES agenda_tarefas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS origem TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS editado BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS editado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS editado_por UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Constraint para origem válida (adiciona se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'financeiro_timesheet_origem_check'
  ) THEN
    ALTER TABLE financeiro_timesheet
      ADD CONSTRAINT financeiro_timesheet_origem_check
      CHECK (origem IN ('manual', 'timer', 'retroativo'));
  END IF;
END$$;

-- Índice para busca por tarefa
CREATE INDEX IF NOT EXISTS idx_timesheet_tarefa ON financeiro_timesheet(tarefa_id) WHERE tarefa_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_timesheet_origem ON financeiro_timesheet(origem);

-- =====================================================
-- 3. VIEW: v_timers_ativos
-- =====================================================

CREATE OR REPLACE VIEW v_timers_ativos AS
SELECT
  t.id,
  t.escritorio_id,
  t.user_id,
  t.processo_id,
  t.consulta_id,
  t.tarefa_id,
  t.titulo,
  t.descricao,
  t.hora_inicio,
  t.hora_pausa,
  t.segundos_acumulados,
  t.status,
  t.faturavel,
  t.cor,
  t.created_at,
  t.updated_at,
  -- Dados do processo
  p.numero_cnj AS processo_numero,
  -- Dados da consulta
  c.assunto AS consulta_titulo,
  -- Dados da tarefa
  ta.titulo AS tarefa_titulo,
  -- Dados do usuário
  pr.nome_completo AS user_nome,
  -- Dados do cliente (via processo ou consulta)
  COALESCE(cli_p.nome_completo, cli_c.nome_completo) AS cliente_nome
FROM timers_ativos t
LEFT JOIN processos_processos p ON t.processo_id = p.id
LEFT JOIN consultivo_consultas c ON t.consulta_id = c.id
LEFT JOIN agenda_tarefas ta ON t.tarefa_id = ta.id
LEFT JOIN profiles pr ON t.user_id = pr.id
LEFT JOIN crm_pessoas cli_p ON p.cliente_id = cli_p.id
LEFT JOIN crm_pessoas cli_c ON c.cliente_id = cli_c.id;

-- =====================================================
-- 4. FUNÇÕES RPC
-- =====================================================

-- 4.1 Iniciar timer
CREATE OR REPLACE FUNCTION iniciar_timer(
  p_escritorio_id UUID,
  p_user_id UUID,
  p_titulo TEXT,
  p_processo_id UUID DEFAULT NULL,
  p_consulta_id UUID DEFAULT NULL,
  p_tarefa_id UUID DEFAULT NULL,
  p_faturavel BOOLEAN DEFAULT true,
  p_descricao TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_timer_id UUID;
BEGIN
  -- Validar que tem processo ou consulta
  IF p_processo_id IS NULL AND p_consulta_id IS NULL THEN
    RAISE EXCEPTION 'Timer deve estar vinculado a um processo ou consulta';
  END IF;

  -- Criar timer
  INSERT INTO timers_ativos (
    escritorio_id,
    user_id,
    processo_id,
    consulta_id,
    tarefa_id,
    titulo,
    descricao,
    faturavel,
    hora_inicio,
    status
  ) VALUES (
    p_escritorio_id,
    p_user_id,
    p_processo_id,
    p_consulta_id,
    p_tarefa_id,
    p_titulo,
    p_descricao,
    p_faturavel,
    NOW(),
    'rodando'
  )
  RETURNING id INTO v_timer_id;

  RETURN v_timer_id;
END;
$$;

-- 4.2 Pausar timer
CREATE OR REPLACE FUNCTION pausar_timer(p_timer_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_timer RECORD;
  v_segundos_desde_inicio INTEGER;
BEGIN
  -- Buscar timer
  SELECT * INTO v_timer FROM timers_ativos WHERE id = p_timer_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Timer não encontrado';
  END IF;

  IF v_timer.status = 'pausado' THEN
    RAISE EXCEPTION 'Timer já está pausado';
  END IF;

  -- Calcular segundos desde último início
  v_segundos_desde_inicio := EXTRACT(EPOCH FROM (NOW() - v_timer.hora_inicio))::INTEGER;

  -- Atualizar timer
  UPDATE timers_ativos
  SET
    status = 'pausado',
    hora_pausa = NOW(),
    segundos_acumulados = segundos_acumulados + v_segundos_desde_inicio
  WHERE id = p_timer_id;

  RETURN TRUE;
END;
$$;

-- 4.3 Retomar timer
CREATE OR REPLACE FUNCTION retomar_timer(p_timer_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_timer RECORD;
BEGIN
  -- Buscar timer
  SELECT * INTO v_timer FROM timers_ativos WHERE id = p_timer_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Timer não encontrado';
  END IF;

  IF v_timer.status = 'rodando' THEN
    RAISE EXCEPTION 'Timer já está rodando';
  END IF;

  -- Atualizar timer - reiniciar hora_inicio para calcular novo período
  UPDATE timers_ativos
  SET
    status = 'rodando',
    hora_inicio = NOW(),
    hora_pausa = NULL
  WHERE id = p_timer_id;

  RETURN TRUE;
END;
$$;

-- 4.4 Finalizar timer e criar registro no timesheet
CREATE OR REPLACE FUNCTION finalizar_timer(
  p_timer_id UUID,
  p_descricao TEXT DEFAULT NULL,
  p_ajuste_minutos INTEGER DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_timer RECORD;
  v_segundos_total INTEGER;
  v_horas NUMERIC(8,2);
  v_timesheet_id UUID;
  v_hora_fim TIMESTAMPTZ;
BEGIN
  -- Buscar timer
  SELECT * INTO v_timer FROM timers_ativos WHERE id = p_timer_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Timer não encontrado';
  END IF;

  -- Calcular tempo total
  IF v_timer.status = 'rodando' THEN
    v_segundos_total := v_timer.segundos_acumulados +
      EXTRACT(EPOCH FROM (NOW() - v_timer.hora_inicio))::INTEGER;
    v_hora_fim := NOW();
  ELSE
    v_segundos_total := v_timer.segundos_acumulados;
    v_hora_fim := v_timer.hora_pausa;
  END IF;

  -- Aplicar ajuste (pode ser positivo ou negativo)
  v_segundos_total := v_segundos_total + (p_ajuste_minutos * 60);

  -- Converter para horas (mínimo 0.01)
  v_horas := GREATEST(0.01, ROUND(v_segundos_total / 3600.0, 2));

  -- Criar registro no timesheet
  INSERT INTO financeiro_timesheet (
    escritorio_id,
    user_id,
    processo_id,
    consulta_id,
    tarefa_id,
    data_trabalho,
    horas,
    atividade,
    faturavel,
    hora_inicio,
    hora_fim,
    origem
  ) VALUES (
    v_timer.escritorio_id,
    v_timer.user_id,
    v_timer.processo_id,
    v_timer.consulta_id,
    v_timer.tarefa_id,
    (v_timer.hora_inicio AT TIME ZONE 'America/Sao_Paulo')::DATE,
    v_horas,
    COALESCE(p_descricao, v_timer.descricao, v_timer.titulo),
    v_timer.faturavel,
    v_timer.hora_inicio,
    v_hora_fim,
    'timer'
  )
  RETURNING id INTO v_timesheet_id;

  -- Remover timer
  DELETE FROM timers_ativos WHERE id = p_timer_id;

  RETURN v_timesheet_id;
END;
$$;

-- 4.5 Descartar timer sem salvar
CREATE OR REPLACE FUNCTION descartar_timer(p_timer_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM timers_ativos WHERE id = p_timer_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Timer não encontrado';
  END IF;

  RETURN TRUE;
END;
$$;

-- 4.6 Registrar tempo retroativo (esquecido)
CREATE OR REPLACE FUNCTION registrar_tempo_retroativo(
  p_escritorio_id UUID,
  p_user_id UUID,
  p_data_trabalho DATE,
  p_hora_inicio TIME,
  p_hora_fim TIME,
  p_atividade TEXT,
  p_processo_id UUID DEFAULT NULL,
  p_consulta_id UUID DEFAULT NULL,
  p_tarefa_id UUID DEFAULT NULL,
  p_faturavel BOOLEAN DEFAULT true
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_horas NUMERIC(8,2);
  v_timesheet_id UUID;
  v_hora_inicio_ts TIMESTAMPTZ;
  v_hora_fim_ts TIMESTAMPTZ;
BEGIN
  -- Validar que tem processo ou consulta
  IF p_processo_id IS NULL AND p_consulta_id IS NULL THEN
    RAISE EXCEPTION 'Registro deve estar vinculado a um processo ou consulta';
  END IF;

  -- Validar horários
  IF p_hora_fim <= p_hora_inicio THEN
    RAISE EXCEPTION 'Hora fim deve ser maior que hora início';
  END IF;

  -- Calcular horas
  v_horas := ROUND(EXTRACT(EPOCH FROM (p_hora_fim - p_hora_inicio)) / 3600.0, 2);

  -- Construir timestamps completos
  v_hora_inicio_ts := (p_data_trabalho || ' ' || p_hora_inicio)::TIMESTAMPTZ;
  v_hora_fim_ts := (p_data_trabalho || ' ' || p_hora_fim)::TIMESTAMPTZ;

  -- Criar registro
  INSERT INTO financeiro_timesheet (
    escritorio_id,
    user_id,
    processo_id,
    consulta_id,
    tarefa_id,
    data_trabalho,
    horas,
    atividade,
    faturavel,
    hora_inicio,
    hora_fim,
    origem
  ) VALUES (
    p_escritorio_id,
    p_user_id,
    p_processo_id,
    p_consulta_id,
    p_tarefa_id,
    p_data_trabalho,
    v_horas,
    p_atividade,
    p_faturavel,
    v_hora_inicio_ts,
    v_hora_fim_ts,
    'retroativo'
  )
  RETURNING id INTO v_timesheet_id;

  RETURN v_timesheet_id;
END;
$$;

-- 4.7 Dividir registro existente
CREATE OR REPLACE FUNCTION dividir_timesheet(
  p_timesheet_id UUID,
  p_divisoes JSONB
)
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_original RECORD;
  v_divisao JSONB;
  v_novos_ids UUID[];
  v_novo_id UUID;
  v_total_horas NUMERIC(8,2);
BEGIN
  -- Buscar registro original
  SELECT * INTO v_original FROM financeiro_timesheet WHERE id = p_timesheet_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registro de timesheet não encontrado';
  END IF;

  -- Validar que não está faturado
  IF v_original.faturado THEN
    RAISE EXCEPTION 'Não é possível dividir registro já faturado';
  END IF;

  -- Validar soma das horas
  SELECT COALESCE(SUM((d->>'horas')::NUMERIC), 0) INTO v_total_horas
  FROM jsonb_array_elements(p_divisoes) d;

  IF v_total_horas != v_original.horas THEN
    RAISE EXCEPTION 'Soma das horas (%) deve ser igual ao total original (%)', v_total_horas, v_original.horas;
  END IF;

  -- Criar novos registros
  v_novos_ids := ARRAY[]::UUID[];

  FOR v_divisao IN SELECT * FROM jsonb_array_elements(p_divisoes)
  LOOP
    INSERT INTO financeiro_timesheet (
      escritorio_id,
      user_id,
      processo_id,
      consulta_id,
      tarefa_id,
      data_trabalho,
      horas,
      atividade,
      faturavel,
      hora_inicio,
      hora_fim,
      origem,
      editado,
      editado_em,
      editado_por
    ) VALUES (
      v_original.escritorio_id,
      v_original.user_id,
      COALESCE((v_divisao->>'processo_id')::UUID, v_original.processo_id),
      COALESCE((v_divisao->>'consulta_id')::UUID, v_original.consulta_id),
      v_original.tarefa_id,
      v_original.data_trabalho,
      (v_divisao->>'horas')::NUMERIC,
      v_divisao->>'atividade',
      COALESCE((v_divisao->>'faturavel')::BOOLEAN, v_original.faturavel),
      v_original.hora_inicio,
      v_original.hora_fim,
      v_original.origem,
      true,
      NOW(),
      v_original.user_id
    )
    RETURNING id INTO v_novo_id;

    v_novos_ids := array_append(v_novos_ids, v_novo_id);
  END LOOP;

  -- Deletar registro original
  DELETE FROM financeiro_timesheet WHERE id = p_timesheet_id;

  RETURN v_novos_ids;
END;
$$;

-- 4.8 Ajustar horários de um registro
CREATE OR REPLACE FUNCTION ajustar_horarios_timesheet(
  p_timesheet_id UUID,
  p_hora_inicio TIMESTAMPTZ,
  p_hora_fim TIMESTAMPTZ,
  p_editado_por UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_horas NUMERIC(8,2);
BEGIN
  -- Validar horários
  IF p_hora_fim <= p_hora_inicio THEN
    RAISE EXCEPTION 'Hora fim deve ser maior que hora início';
  END IF;

  -- Calcular novas horas
  v_horas := ROUND(EXTRACT(EPOCH FROM (p_hora_fim - p_hora_inicio)) / 3600.0, 2);

  -- Atualizar registro
  UPDATE financeiro_timesheet
  SET
    hora_inicio = p_hora_inicio,
    hora_fim = p_hora_fim,
    horas = v_horas,
    editado = true,
    editado_em = NOW(),
    editado_por = p_editado_por
  WHERE id = p_timesheet_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registro de timesheet não encontrado';
  END IF;

  RETURN TRUE;
END;
$$;

-- =====================================================
-- 5. ROW LEVEL SECURITY
-- =====================================================

-- Habilitar RLS
ALTER TABLE timers_ativos ENABLE ROW LEVEL SECURITY;

-- Policy: Usuário vê apenas seus próprios timers
CREATE POLICY "timers_ativos_select_own" ON timers_ativos
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Usuário pode inserir apenas para si mesmo
CREATE POLICY "timers_ativos_insert_own" ON timers_ativos
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Policy: Usuário pode atualizar apenas seus próprios timers
CREATE POLICY "timers_ativos_update_own" ON timers_ativos
  FOR UPDATE
  USING (user_id = auth.uid());

-- Policy: Usuário pode deletar apenas seus próprios timers
CREATE POLICY "timers_ativos_delete_own" ON timers_ativos
  FOR DELETE
  USING (user_id = auth.uid());

-- =====================================================
-- 6. HABILITAR REALTIME
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE timers_ativos;

-- =====================================================
-- 7. COMENTÁRIOS
-- =====================================================

COMMENT ON TABLE timers_ativos IS 'Timers ativos para controle de horas em tempo real';
COMMENT ON COLUMN timers_ativos.segundos_acumulados IS 'Segundos acumulados antes de pausas (não inclui tempo atual rodando)';
COMMENT ON COLUMN timers_ativos.hora_pausa IS 'Momento em que foi pausado (NULL se rodando)';
COMMENT ON COLUMN financeiro_timesheet.origem IS 'Origem do registro: manual, timer ou retroativo';
COMMENT ON FUNCTION iniciar_timer IS 'Inicia um novo timer vinculado a processo ou consulta';
COMMENT ON FUNCTION finalizar_timer IS 'Finaliza timer e cria registro no timesheet';
COMMENT ON FUNCTION registrar_tempo_retroativo IS 'Registra tempo esquecido (retroativo)';
COMMENT ON FUNCTION dividir_timesheet IS 'Divide um registro em múltiplos';
