-- Migration: Functions e Views para Agenda
-- Data: 2025-01-06

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function: Calcular Data Limite de Prazo
CREATE OR REPLACE FUNCTION calcular_data_limite_prazo(
  p_data_intimacao date,
  p_quantidade_dias integer,
  p_dias_uteis boolean DEFAULT true,
  p_escritorio_id uuid DEFAULT NULL
) RETURNS date AS $$
DECLARE
  v_data_limite date;
  v_dias_contados integer := 0;
  v_data_atual date;
BEGIN
  -- Validação
  IF p_data_intimacao IS NULL OR p_quantidade_dias IS NULL OR p_quantidade_dias <= 0 THEN
    RETURN NULL;
  END IF;

  v_data_atual := p_data_intimacao;

  IF p_dias_uteis THEN
    -- Contagem de dias úteis (excluindo sábados, domingos e feriados)
    WHILE v_dias_contados < p_quantidade_dias LOOP
      v_data_atual := v_data_atual + 1;

      -- Verificar se não é fim de semana (0=domingo, 6=sábado)
      IF EXTRACT(DOW FROM v_data_atual) NOT IN (0, 6) THEN
        -- Verificar se não é feriado
        IF NOT EXISTS (
          SELECT 1 FROM agenda_feriados
          WHERE data = v_data_atual
          AND (escritorio_id = p_escritorio_id OR escritorio_id IS NULL)
        ) THEN
          v_dias_contados := v_dias_contados + 1;
        END IF;
      END IF;
    END LOOP;
  ELSE
    -- Dias corridos (simples)
    v_data_atual := p_data_intimacao + p_quantidade_dias;
  END IF;

  RETURN v_data_atual;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calcular_data_limite_prazo IS 'Calcula data limite de prazo considerando dias úteis e feriados';

-- =====================================================
-- Function: Atualizar Progresso de Tarefa
CREATE OR REPLACE FUNCTION atualizar_progresso_tarefa() RETURNS trigger AS $$
DECLARE
  v_total integer;
  v_concluidos integer;
  v_progresso integer;
BEGIN
  -- Determinar tarefa_id baseado na operação
  IF TG_OP = 'DELETE' THEN
    -- Para DELETE, usar OLD
    SELECT
      COUNT(*),
      COUNT(*) FILTER (WHERE concluido = true)
    INTO v_total, v_concluidos
    FROM agenda_tarefas_checklist
    WHERE tarefa_id = OLD.tarefa_id;

    -- Calcular progresso
    IF v_total > 0 THEN
      v_progresso := (v_concluidos * 100.0 / v_total)::integer;
    ELSE
      v_progresso := 0;
    END IF;

    -- Atualizar tarefa
    UPDATE agenda_tarefas
    SET progresso_percentual = v_progresso,
        updated_at = now()
    WHERE id = OLD.tarefa_id;

  ELSE
    -- Para INSERT/UPDATE, usar NEW
    SELECT
      COUNT(*),
      COUNT(*) FILTER (WHERE concluido = true)
    INTO v_total, v_concluidos
    FROM agenda_tarefas_checklist
    WHERE tarefa_id = NEW.tarefa_id;

    -- Calcular progresso
    IF v_total > 0 THEN
      v_progresso := (v_concluidos * 100.0 / v_total)::integer;
    ELSE
      v_progresso := 0;
    END IF;

    -- Atualizar tarefa
    UPDATE agenda_tarefas
    SET progresso_percentual = v_progresso,
        updated_at = now()
    WHERE id = NEW.tarefa_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar progresso automaticamente
DROP TRIGGER IF EXISTS trigger_atualizar_progresso ON agenda_tarefas_checklist;
CREATE TRIGGER trigger_atualizar_progresso
  AFTER INSERT OR UPDATE OR DELETE ON agenda_tarefas_checklist
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_progresso_tarefa();

COMMENT ON FUNCTION atualizar_progresso_tarefa IS 'Atualiza progresso_percentual da tarefa baseado no checklist';

-- =====================================================
-- Function: Calcular Próxima Execução de Recorrência
CREATE OR REPLACE FUNCTION calcular_proxima_execucao_recorrencia(
  p_frequencia text,
  p_intervalo integer,
  p_dia_mes integer,
  p_dias_semana integer[],
  p_mes integer,
  p_data_base date
) RETURNS date AS $$
DECLARE
  v_proxima date;
  v_tentativas integer := 0;
BEGIN
  v_proxima := p_data_base;

  CASE p_frequencia
    WHEN 'diaria' THEN
      v_proxima := p_data_base + (p_intervalo || ' days')::interval;

    WHEN 'semanal' THEN
      -- Avançar para próxima semana
      v_proxima := p_data_base + (p_intervalo * 7 || ' days')::interval;

      -- Se tem dias da semana específicos, ajustar para o próximo dia válido
      IF p_dias_semana IS NOT NULL AND array_length(p_dias_semana, 1) > 0 THEN
        -- Encontrar próximo dia da semana válido
        WHILE v_tentativas < 7 LOOP
          IF EXTRACT(DOW FROM v_proxima)::integer = ANY(p_dias_semana) THEN
            EXIT;
          END IF;
          v_proxima := v_proxima + 1;
          v_tentativas := v_tentativas + 1;
        END LOOP;
      END IF;

    WHEN 'mensal' THEN
      -- Próximo mês
      v_proxima := (p_data_base + (p_intervalo || ' months')::interval)::date;

      -- Ajustar para o dia específico do mês
      IF p_dia_mes IS NOT NULL THEN
        v_proxima := date_trunc('month', v_proxima)::date + (p_dia_mes - 1 || ' days')::interval;

        -- Se o dia não existe no mês (ex: 31 em fevereiro), usar último dia do mês
        IF EXTRACT(MONTH FROM v_proxima) != EXTRACT(MONTH FROM (date_trunc('month', p_data_base + (p_intervalo || ' months')::interval))) THEN
          v_proxima := (date_trunc('month', p_data_base + (p_intervalo || ' months')::interval) + '1 month'::interval - '1 day'::interval)::date;
        END IF;
      END IF;

    WHEN 'anual' THEN
      -- Próximo ano
      v_proxima := (p_data_base + (p_intervalo || ' years')::interval)::date;

      -- Ajustar para mês e dia específicos
      IF p_mes IS NOT NULL AND p_dia_mes IS NOT NULL THEN
        v_proxima := make_date(
          EXTRACT(YEAR FROM v_proxima)::integer,
          p_mes,
          LEAST(p_dia_mes, EXTRACT(DAY FROM (make_date(EXTRACT(YEAR FROM v_proxima)::integer, p_mes, 1) + '1 month'::interval - '1 day'::interval))::integer)
        );
      END IF;
  END CASE;

  RETURN v_proxima;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calcular_proxima_execucao_recorrencia IS 'Calcula próxima data de execução baseado nas regras de recorrência';

-- =====================================================
-- Function: Processar Recorrências Diárias
CREATE OR REPLACE FUNCTION processar_recorrencias_diarias() RETURNS integer AS $$
DECLARE
  v_rec RECORD;
  v_nova_tarefa_id uuid;
  v_novo_evento_id uuid;
  v_count integer := 0;
BEGIN
  -- Para cada recorrência ativa que deve executar hoje
  FOR v_rec IN
    SELECT * FROM agenda_recorrencias
    WHERE ativo = true
      AND proxima_execucao <= CURRENT_DATE
      AND (data_fim IS NULL OR data_fim >= CURRENT_DATE)
  LOOP
    BEGIN
      -- Criar tarefa ou evento baseado no template
      IF v_rec.entidade_tipo = 'tarefa' THEN
        INSERT INTO agenda_tarefas (
          escritorio_id,
          titulo,
          descricao,
          tipo,
          prioridade,
          data_inicio,
          responsavel_id,
          recorrencia_id,
          cor,
          observacoes
        )
        VALUES (
          v_rec.escritorio_id,
          v_rec.template_dados->>'titulo',
          v_rec.template_dados->>'descricao',
          COALESCE(v_rec.template_dados->>'tipo', 'outro'),
          COALESCE(v_rec.template_dados->>'prioridade', 'media'),
          (CURRENT_DATE + v_rec.regra_hora::time)::timestamptz,
          (v_rec.template_dados->>'responsavel_id')::uuid,
          v_rec.id,
          v_rec.template_dados->>'cor',
          v_rec.template_dados->>'observacoes'
        )
        RETURNING id INTO v_nova_tarefa_id;

      ELSIF v_rec.entidade_tipo = 'evento' THEN
        INSERT INTO agenda_eventos (
          escritorio_id,
          titulo,
          descricao,
          tipo,
          data_inicio,
          responsavel_id,
          recorrencia_id,
          cor,
          observacoes
        )
        VALUES (
          v_rec.escritorio_id,
          v_rec.template_dados->>'titulo',
          v_rec.template_dados->>'descricao',
          'compromisso',
          (CURRENT_DATE + v_rec.regra_hora::time)::timestamptz,
          (v_rec.template_dados->>'responsavel_id')::uuid,
          v_rec.id,
          v_rec.template_dados->>'cor',
          v_rec.template_dados->>'observacoes'
        )
        RETURNING id INTO v_novo_evento_id;
      END IF;

      -- Atualizar controle da recorrência
      UPDATE agenda_recorrencias
      SET
        ultima_execucao = CURRENT_DATE,
        proxima_execucao = calcular_proxima_execucao_recorrencia(
          regra_frequencia,
          regra_intervalo,
          regra_dia_mes,
          regra_dias_semana,
          regra_mes,
          CURRENT_DATE
        ),
        total_criados = total_criados + 1,
        updated_at = now()
      WHERE id = v_rec.id;

      v_count := v_count + 1;

    EXCEPTION WHEN OTHERS THEN
      -- Log error mas continua processando outras recorrências
      RAISE WARNING 'Erro ao processar recorrência %: %', v_rec.id, SQLERRM;
    END;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION processar_recorrencias_diarias IS 'Processa recorrências pendentes e cria tarefas/eventos automaticamente';

-- =====================================================
-- VIEWS CONSOLIDADAS
-- =====================================================

-- View: Agenda Consolidada (para o calendário)
CREATE OR REPLACE VIEW v_agenda_consolidada AS
-- TAREFAS
SELECT
  t.id,
  'tarefa' as tipo_entidade,
  t.titulo,
  t.descricao,
  t.data_inicio,
  t.data_fim,
  false as dia_inteiro,
  t.cor,
  t.status,
  t.prioridade,
  t.tipo as subtipo, -- 'prazo_processual', 'acompanhamento', etc
  t.responsavel_id,
  p.nome_completo as responsavel_nome,
  t.progresso_percentual,
  t.prazo_data_limite, -- Para exibir no calendário
  t.prazo_cumprido,
  t.escritorio_id,
  t.created_at,
  t.updated_at
FROM agenda_tarefas t
LEFT JOIN profiles p ON p.id = t.responsavel_id
WHERE t.status != 'cancelada'

UNION ALL

-- EVENTOS
SELECT
  e.id,
  'evento' as tipo_entidade,
  e.titulo,
  e.descricao,
  e.data_inicio,
  e.data_fim,
  e.dia_inteiro,
  e.cor,
  e.status,
  'media' as prioridade, -- Eventos sempre prioridade média
  'compromisso' as subtipo,
  e.responsavel_id,
  p.nome_completo as responsavel_nome,
  NULL as progresso_percentual,
  NULL as prazo_data_limite,
  NULL as prazo_cumprido,
  e.escritorio_id,
  e.created_at,
  e.updated_at
FROM agenda_eventos e
LEFT JOIN profiles p ON p.id = e.responsavel_id
WHERE e.status != 'cancelada'

UNION ALL

-- AUDIÊNCIAS
SELECT
  a.id,
  'audiencia' as tipo_entidade,
  a.titulo,
  a.descricao,
  a.data_hora as data_inicio,
  (a.data_hora + (a.duracao_minutos || ' minutes')::interval) as data_fim,
  false as dia_inteiro,
  COALESCE(a.cor, '#10b981') as cor, -- Verde padrão para audiências
  a.status,
  'alta' as prioridade, -- Audiências sempre alta prioridade
  a.tipo_audiencia as subtipo,
  a.responsavel_id,
  p.nome_completo as responsavel_nome,
  NULL as progresso_percentual,
  NULL as prazo_data_limite,
  NULL as prazo_cumprido,
  a.escritorio_id,
  a.created_at,
  a.updated_at
FROM agenda_audiencias a
LEFT JOIN profiles p ON p.id = a.responsavel_id
WHERE a.status NOT IN ('cancelada', 'remarcada');

COMMENT ON VIEW v_agenda_consolidada IS 'View consolidada de todas as entidades de agenda para visualização no calendário';

-- View: Tarefas Pendentes com Detalhes
CREATE OR REPLACE VIEW v_tarefas_pendentes AS
SELECT
  t.*,
  p.nome_completo as responsavel_nome,
  p.email as responsavel_email,
  c.nome_completo as criado_por_nome,
  -- Contar checklist
  (SELECT COUNT(*) FROM agenda_tarefas_checklist WHERE tarefa_id = t.id) as total_checklist,
  (SELECT COUNT(*) FROM agenda_tarefas_checklist WHERE tarefa_id = t.id AND concluido = true) as checklist_concluidos,
  -- Contar subtarefas
  (SELECT COUNT(*) FROM agenda_tarefas WHERE parent_id = t.id) as total_subtarefas,
  (SELECT COUNT(*) FROM agenda_tarefas WHERE parent_id = t.id AND status = 'concluida') as subtarefas_concluidas,
  -- Vinculações
  (SELECT jsonb_agg(jsonb_build_object(
    'modulo', v.modulo,
    'modulo_registro_id', v.modulo_registro_id,
    'metadados', v.metadados
  )) FROM agenda_vinculacoes v WHERE v.entidade_tipo = 'tarefa' AND v.entidade_id = t.id) as vinculacoes
FROM agenda_tarefas t
LEFT JOIN profiles p ON p.id = t.responsavel_id
LEFT JOIN profiles c ON c.id = t.criado_por
WHERE t.status IN ('pendente', 'em_andamento')
ORDER BY
  CASE t.prioridade
    WHEN 'alta' THEN 1
    WHEN 'media' THEN 2
    WHEN 'baixa' THEN 3
  END,
  t.data_inicio;

COMMENT ON VIEW v_tarefas_pendentes IS 'View de tarefas pendentes com detalhes completos para dashboard';

-- View: Prazos Críticos
CREATE OR REPLACE VIEW v_prazos_criticos AS
SELECT
  t.id,
  t.titulo,
  t.prazo_data_intimacao,
  t.prazo_quantidade_dias,
  t.prazo_dias_uteis,
  t.prazo_data_limite,
  t.prazo_tipo,
  t.prazo_cumprido,
  t.responsavel_id,
  p.nome_completo as responsavel_nome,
  t.escritorio_id,
  -- Calcular dias restantes
  (t.prazo_data_limite - CURRENT_DATE) as dias_restantes,
  -- Criticidade
  CASE
    WHEN t.prazo_data_limite < CURRENT_DATE THEN 'vencido'
    WHEN t.prazo_data_limite = CURRENT_DATE THEN 'hoje'
    WHEN t.prazo_data_limite <= CURRENT_DATE + 2 THEN 'critico'
    WHEN t.prazo_data_limite <= CURRENT_DATE + 5 THEN 'urgente'
    WHEN t.prazo_data_limite <= CURRENT_DATE + 10 THEN 'atencao'
    ELSE 'normal'
  END as criticidade
FROM agenda_tarefas t
LEFT JOIN profiles p ON p.id = t.responsavel_id
WHERE t.tipo = 'prazo_processual'
  AND t.status NOT IN ('concluida', 'cancelada')
  AND t.prazo_cumprido = false
  AND t.prazo_data_limite IS NOT NULL
ORDER BY t.prazo_data_limite;

COMMENT ON VIEW v_prazos_criticos IS 'View de prazos processuais com indicador de criticidade';
