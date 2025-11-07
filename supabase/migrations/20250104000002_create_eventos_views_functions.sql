-- Módulo: Agenda - Views, Functions e Triggers
-- Views e funções para facilitar consultas e operações

-- ============================================
-- VIEWS
-- ============================================

-- View: Agenda do dia com informações consolidadas
CREATE OR REPLACE VIEW v_agenda_dia AS
SELECT
    e.id,
    e.escritorio_id,
    e.titulo,
    e.tipo,
    e.data_inicio,
    e.data_fim,
    e.dia_inteiro,
    e.local,
    e.descricao,
    e.cor,
    e.status,
    e.responsavel_id,
    -- Dados do responsável
    p.nome_completo as responsavel_nome,
    -- Dados do cliente (se houver)
    c.nome_completo as cliente_nome,
    c.id as cliente_id,
    -- Dados do processo (se houver)
    pr.numero_processo,
    pr.id as processo_id,
    -- Dados específicos de audiência (se for audiência)
    ea.tipo_audiencia,
    ea.modalidade as audiencia_modalidade,
    ea.link_virtual,
    ea.forum_vara,
    -- Dados específicos de prazo (se for prazo)
    ep.tipo_prazo,
    ep.data_limite as prazo_data_limite,
    ep.dias_uteis as prazo_dias_uteis,
    ep.cumprido as prazo_cumprido,
    ep.perdido as prazo_perdido,
    -- Participantes (agregados)
    (
        SELECT json_agg(
            json_build_object(
                'id', evp.id,
                'tipo', evp.tipo,
                'nome', COALESCE(pu.nome_completo, evp.nome),
                'email', COALESCE(pu.email, evp.email),
                'confirmado', evp.confirmado
            )
        )
        FROM eventos_participantes evp
        LEFT JOIN profiles pu ON evp.user_id = pu.id
        WHERE evp.evento_id = e.id
    ) as participantes
FROM eventos e
LEFT JOIN profiles p ON e.responsavel_id = p.id
LEFT JOIN clientes c ON e.cliente_id = c.id
LEFT JOIN processos pr ON e.processo_id = pr.id
LEFT JOIN eventos_audiencias ea ON e.id = ea.evento_id
LEFT JOIN eventos_prazos ep ON e.id = ep.evento_id
ORDER BY e.data_inicio;

COMMENT ON VIEW v_agenda_dia IS 'View consolidada de eventos com todas informações relacionadas';

-- View: Prazos vencendo (próximos 30 dias)
CREATE OR REPLACE VIEW v_prazos_vencendo AS
SELECT
    e.id,
    e.escritorio_id,
    e.titulo,
    e.data_inicio,
    e.responsavel_id,
    ep.tipo_prazo,
    ep.data_limite,
    ep.cumprido,
    ep.perdido,
    ep.dias_uteis,
    -- Calcular dias restantes
    CASE
        WHEN ep.dias_uteis THEN NULL  -- Calcular dias úteis requer function
        ELSE (ep.data_limite - CURRENT_DATE)
    END as dias_restantes,
    -- Criticidade baseada em dias restantes
    CASE
        WHEN ep.data_limite < CURRENT_DATE THEN 'vencido'
        WHEN ep.data_limite = CURRENT_DATE THEN 'hoje'
        WHEN ep.data_limite <= CURRENT_DATE + 3 THEN 'critico'
        WHEN ep.data_limite <= CURRENT_DATE + 7 THEN 'urgente'
        WHEN ep.data_limite <= CURRENT_DATE + 15 THEN 'atencao'
        ELSE 'normal'
    END as criticidade,
    -- Dados do processo
    pr.numero_processo,
    pr.id as processo_id,
    -- Dados do cliente
    c.nome_completo as cliente_nome,
    c.id as cliente_id,
    -- Responsável
    p.nome_completo as responsavel_nome
FROM eventos e
INNER JOIN eventos_prazos ep ON e.id = ep.evento_id
LEFT JOIN processos pr ON e.processo_id = pr.id
LEFT JOIN clientes c ON e.cliente_id = c.id
LEFT JOIN profiles p ON e.responsavel_id = p.id
WHERE
    e.tipo = 'prazo'
    AND e.status = 'agendado'
    AND ep.cumprido = false
    AND ep.perdido = false
    AND ep.data_limite <= CURRENT_DATE + 30
ORDER BY ep.data_limite ASC;

COMMENT ON VIEW v_prazos_vencendo IS 'Prazos processuais vencendo nos próximos 30 dias com criticidade';

-- View: Disponibilidade da equipe (ocupação por hora)
CREATE OR REPLACE VIEW v_disponibilidade_equipe AS
SELECT
    p.id as user_id,
    p.nome_completo,
    DATE(e.data_inicio) as data,
    EXTRACT(HOUR FROM e.data_inicio) as hora_inicio,
    EXTRACT(HOUR FROM e.data_fim) as hora_fim,
    e.id as evento_id,
    e.titulo as evento_titulo,
    e.tipo as evento_tipo
FROM profiles p
LEFT JOIN eventos e ON p.id = e.responsavel_id
WHERE
    e.status = 'agendado'
    AND e.data_inicio >= CURRENT_DATE - 7
    AND e.data_inicio <= CURRENT_DATE + 30
    AND e.dia_inteiro = false
ORDER BY p.nome_completo, e.data_inicio;

COMMENT ON VIEW v_disponibilidade_equipe IS 'Ocupação de horários da equipe para verificação de disponibilidade';

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function: Verificar se uma data é feriado
CREATE OR REPLACE FUNCTION is_feriado(check_date DATE, escritorio_uf TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
    feriado_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO feriado_count
    FROM feriados
    WHERE
        data = check_date
        AND (tipo = 'nacional' OR (tipo IN ('estadual', 'municipal') AND uf = escritorio_uf));

    RETURN feriado_count > 0;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION is_feriado IS 'Verifica se uma data é feriado considerando nacional e regional';

-- Function: Verificar se uma data é dia útil
CREATE OR REPLACE FUNCTION is_dia_util(check_date DATE, escritorio_uf TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
    -- Retorna false se for fim de semana
    IF EXTRACT(DOW FROM check_date) IN (0, 6) THEN
        RETURN false;
    END IF;

    -- Retorna false se for feriado
    IF is_feriado(check_date, escritorio_uf) THEN
        RETURN false;
    END IF;

    RETURN true;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION is_dia_util IS 'Verifica se uma data é dia útil (não é fim de semana nem feriado)';

-- Function: Calcular prazo em dias úteis
CREATE OR REPLACE FUNCTION calcular_prazo(
    data_base DATE,
    quantidade_dias INTEGER,
    usar_dias_uteis BOOLEAN DEFAULT true,
    escritorio_uf TEXT DEFAULT NULL
)
RETURNS TABLE (
    data_limite DATE,
    dias_corridos INTEGER,
    dias_feriados INTEGER,
    dias_final_semana INTEGER
) AS $$
DECLARE
    current_date DATE := data_base;
    dias_contados INTEGER := 0;
    total_feriados INTEGER := 0;
    total_fins_semana INTEGER := 0;
    total_dias_corridos INTEGER := 0;
BEGIN
    -- Se não usar dias úteis, simplesmente adiciona os dias
    IF NOT usar_dias_uteis THEN
        RETURN QUERY SELECT
            data_base + quantidade_dias,
            quantidade_dias,
            0,
            0;
        RETURN;
    END IF;

    -- Calcula dias úteis
    WHILE dias_contados < quantidade_dias LOOP
        current_date := current_date + 1;
        total_dias_corridos := total_dias_corridos + 1;

        -- Verifica se é fim de semana
        IF EXTRACT(DOW FROM current_date) IN (0, 6) THEN
            total_fins_semana := total_fins_semana + 1;
            CONTINUE;
        END IF;

        -- Verifica se é feriado
        IF is_feriado(current_date, escritorio_uf) THEN
            total_feriados := total_feriados + 1;
            CONTINUE;
        END IF;

        -- É dia útil, incrementa contador
        dias_contados := dias_contados + 1;
    END LOOP;

    RETURN QUERY SELECT
        current_date,
        total_dias_corridos,
        total_feriados,
        total_fins_semana;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calcular_prazo IS 'Calcula data limite de prazo considerando dias úteis, feriados e fins de semana';

-- Function: Verificar conflitos de agenda
CREATE OR REPLACE FUNCTION check_conflitos(
    p_user_id UUID,
    p_data_inicio TIMESTAMP WITH TIME ZONE,
    p_data_fim TIMESTAMP WITH TIME ZONE,
    p_evento_id UUID DEFAULT NULL
)
RETURNS TABLE (
    evento_id UUID,
    titulo TEXT,
    data_inicio TIMESTAMP WITH TIME ZONE,
    data_fim TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.id,
        e.titulo,
        e.data_inicio,
        e.data_fim
    FROM eventos e
    WHERE
        e.responsavel_id = p_user_id
        AND e.status = 'agendado'
        AND e.dia_inteiro = false
        AND (p_evento_id IS NULL OR e.id != p_evento_id)
        AND (
            -- Verifica sobreposição de horários
            (e.data_inicio, e.data_fim) OVERLAPS (p_data_inicio, p_data_fim)
        )
    ORDER BY e.data_inicio;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_conflitos IS 'Verifica conflitos de horário na agenda de um usuário';

-- Function: Sugerir horários livres
CREATE OR REPLACE FUNCTION sugerir_horarios(
    p_user_id UUID,
    p_duracao_minutos INTEGER,
    p_data_preferencia DATE,
    p_hora_inicio TIME DEFAULT '08:00:00',
    p_hora_fim TIME DEFAULT '18:00:00'
)
RETURNS TABLE (
    data_hora_inicio TIMESTAMP WITH TIME ZONE,
    data_hora_fim TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    current_time TIME := p_hora_inicio;
    current_datetime TIMESTAMP WITH TIME ZONE;
    end_datetime TIMESTAMP WITH TIME ZONE;
    tem_conflito BOOLEAN;
BEGIN
    -- Percorre o dia em slots de 30 minutos
    WHILE current_time < p_hora_fim LOOP
        current_datetime := p_data_preferencia + current_time;
        end_datetime := current_datetime + (p_duracao_minutos || ' minutes')::INTERVAL;

        -- Verifica se há conflito neste horário
        SELECT EXISTS(
            SELECT 1 FROM eventos e
            WHERE
                e.responsavel_id = p_user_id
                AND e.status = 'agendado'
                AND e.dia_inteiro = false
                AND (e.data_inicio, e.data_fim) OVERLAPS (current_datetime, end_datetime)
        ) INTO tem_conflito;

        -- Se não há conflito, retorna este horário
        IF NOT tem_conflito THEN
            RETURN QUERY SELECT current_datetime, end_datetime;
        END IF;

        -- Incrementa 30 minutos
        current_time := current_time + INTERVAL '30 minutes';
    END LOOP;

    RETURN;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sugerir_horarios IS 'Sugere horários livres na agenda baseado em duração e preferência';

-- Function: Marcar prazo como cumprido
CREATE OR REPLACE FUNCTION marcar_prazo_cumprido(p_prazo_id UUID)
RETURNS VOID AS $$
DECLARE
    v_evento_id UUID;
BEGIN
    -- Busca o evento_id
    SELECT evento_id INTO v_evento_id
    FROM eventos_prazos
    WHERE evento_id = p_prazo_id;

    IF v_evento_id IS NULL THEN
        RAISE EXCEPTION 'Prazo não encontrado';
    END IF;

    -- Atualiza o prazo
    UPDATE eventos_prazos
    SET
        cumprido = true,
        cumprido_em = NOW()
    WHERE evento_id = p_prazo_id;

    -- Atualiza o evento
    UPDATE eventos
    SET status = 'realizado'
    WHERE id = p_prazo_id;

    -- Cria notificação (será implementado no módulo de notificações)
    -- INSERT INTO notifications ...
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION marcar_prazo_cumprido IS 'Marca um prazo processual como cumprido e atualiza status';

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger: Validar datas do evento
CREATE OR REPLACE FUNCTION validate_evento_dates()
RETURNS TRIGGER AS $$
BEGIN
    -- Validar que data_fim >= data_inicio (se ambas existirem)
    IF NEW.data_fim IS NOT NULL AND NEW.data_fim < NEW.data_inicio THEN
        RAISE EXCEPTION 'Data de fim não pode ser anterior à data de início';
    END IF;

    -- Se for dia inteiro, data_fim deve ser NULL ou igual a data_inicio
    IF NEW.dia_inteiro = true AND NEW.data_fim IS NOT NULL THEN
        IF DATE(NEW.data_fim) != DATE(NEW.data_inicio) THEN
            RAISE EXCEPTION 'Eventos de dia inteiro devem ter início e fim no mesmo dia';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_evento_dates
    BEFORE INSERT OR UPDATE ON eventos
    FOR EACH ROW
    EXECUTE FUNCTION validate_evento_dates();

-- Trigger: Criar lembretes automáticos para prazos
CREATE OR REPLACE FUNCTION create_prazo_lembretes()
RETURNS TRIGGER AS $$
BEGIN
    -- Cria lembretes automáticos: 7 dias, 3 dias e 1 dia antes
    INSERT INTO eventos_lembretes (evento_id, user_id, tempo_antes_minutos, metodos)
    VALUES
        (NEW.evento_id, (SELECT responsavel_id FROM eventos WHERE id = NEW.evento_id), 7 * 24 * 60, ARRAY['email', 'push']),
        (NEW.evento_id, (SELECT responsavel_id FROM eventos WHERE id = NEW.evento_id), 3 * 24 * 60, ARRAY['email', 'push']),
        (NEW.evento_id, (SELECT responsavel_id FROM eventos WHERE id = NEW.evento_id), 1 * 24 * 60, ARRAY['email', 'push', 'whatsapp']);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_prazo_lembretes
    AFTER INSERT ON eventos_prazos
    FOR EACH ROW
    EXECUTE FUNCTION create_prazo_lembretes();

COMMENT ON TRIGGER trigger_create_prazo_lembretes ON eventos_prazos IS 'Cria lembretes automáticos ao criar um prazo processual';
