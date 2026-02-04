-- =====================================================
-- MÓDULO CRM - MIGRATION 4: VIEWS E FUNCTIONS
-- =====================================================
-- Views consolidadas e funções auxiliares
-- =====================================================

-- =====================================================
-- VIEWS
-- =====================================================

-- View: Resumo Completo de Pessoas
CREATE OR REPLACE VIEW v_crm_pessoas_resumo AS
SELECT
    p.id,
    p.escritorio_id,
    p.tipo_pessoa,
    p.tipo_contato,
    p.nome_completo,
    p.nome_fantasia,
    p.cpf_cnpj,
    p.telefone_principal,
    p.celular,
    p.whatsapp,
    p.email_principal,
    p.status,
    p.origem,
    p.tags,
    p.cidade,
    p.uf,
    p.created_at,
    p.updated_at,

    -- Responsável
    resp.nome AS responsavel_nome,
    resp.avatar_url AS responsavel_avatar,

    -- Estatísticas de Processos (preparado para integração futura)
    0::BIGINT AS total_processos,
    0::BIGINT AS processos_ativos,

    -- Estatísticas Financeiras (preparado para integração futura)
    0::NUMERIC AS total_honorarios,
    0::NUMERIC AS honorarios_pendentes,
    0::NUMERIC AS honorarios_pagos,

    -- Última Interação
    (
        SELECT i.data_hora
        FROM crm_interacoes i
        WHERE i.pessoa_id = p.id
        ORDER BY i.data_hora DESC
        LIMIT 1
    ) AS ultima_interacao_data,
    (
        SELECT i.tipo
        FROM crm_interacoes i
        WHERE i.pessoa_id = p.id
        ORDER BY i.data_hora DESC
        LIMIT 1
    ) AS ultima_interacao_tipo,

    -- Dias desde última interação
    dias_desde_ultima_interacao(p.id) AS dias_sem_contato,

    -- Total de Interações
    (
        SELECT COUNT(*)
        FROM crm_interacoes i
        WHERE i.pessoa_id = p.id
    ) AS total_interacoes,

    -- Follow-ups Pendentes
    (
        SELECT COUNT(*)
        FROM crm_interacoes i
        WHERE i.pessoa_id = p.id
          AND i.follow_up = true
          AND i.follow_up_concluido = false
          AND i.follow_up_data <= CURRENT_DATE
    ) AS follow_ups_pendentes,

    -- Oportunidades
    (
        SELECT COUNT(*)
        FROM crm_oportunidades o
        JOIN crm_funil_etapas e ON e.id = o.etapa_id
        WHERE o.pessoa_id = p.id
          AND e.tipo = 'em_andamento'
    ) AS oportunidades_ativas,

    -- Relacionamentos
    (
        SELECT COUNT(*)
        FROM crm_relacionamentos r
        WHERE r.pessoa_origem_id = p.id OR r.pessoa_destino_id = p.id
    ) AS total_relacionamentos

FROM crm_pessoas p
LEFT JOIN profiles resp ON resp.id = p.responsavel_id;

COMMENT ON VIEW v_crm_pessoas_resumo IS 'View consolidada com resumo completo de cada pessoa, incluindo estatísticas e última interação';

-- View: Clientes Inativos (sem contato há mais de X dias)
CREATE OR REPLACE VIEW v_crm_clientes_inativos AS
SELECT
    p.id,
    p.nome_completo,
    p.tipo_pessoa,
    p.telefone_principal,
    p.celular,
    p.email_principal,
    p.responsavel_id,
    resp.nome AS responsavel_nome,
    dias_desde_ultima_interacao(p.id) AS dias_sem_contato,
    (
        SELECT i.data_hora
        FROM crm_interacoes i
        WHERE i.pessoa_id = p.id
        ORDER BY i.data_hora DESC
        LIMIT 1
    ) AS ultima_interacao,
    (
        SELECT i.tipo
        FROM crm_interacoes i
        WHERE i.pessoa_id = p.id
        ORDER BY i.data_hora DESC
        LIMIT 1
    ) AS tipo_ultima_interacao
FROM crm_pessoas p
LEFT JOIN profiles resp ON resp.id = p.responsavel_id
WHERE p.tipo_contato = 'cliente'
  AND p.status = 'ativo'
  AND dias_desde_ultima_interacao(p.id) > 30
ORDER BY dias_desde_ultima_interacao(p.id) DESC;

COMMENT ON VIEW v_crm_clientes_inativos IS 'Clientes ativos sem interação há mais de 30 dias (para campanhas de reativação)';

-- View: Métricas do Funil de Conversão
CREATE OR REPLACE VIEW v_crm_funil_conversao AS
SELECT
    e.id AS etapa_id,
    e.escritorio_id,
    e.nome AS etapa_nome,
    e.ordem AS etapa_ordem,
    e.cor AS etapa_cor,
    e.tipo AS etapa_tipo,

    -- Quantidade de Oportunidades
    COUNT(o.id) AS total_oportunidades,

    -- Valor Total
    COALESCE(SUM(o.valor_estimado), 0) AS valor_total,

    -- Valor Médio
    COALESCE(AVG(o.valor_estimado), 0) AS valor_medio,

    -- Probabilidade Média
    COALESCE(AVG(o.probabilidade), 0) AS probabilidade_media,

    -- Tempo Médio na Etapa
    AVG(
        CASE
            WHEN e.tipo = 'em_andamento' THEN
                EXTRACT(EPOCH FROM get_tempo_na_etapa(o.id)) / 86400 -- converte para dias
            ELSE NULL
        END
    ) AS tempo_medio_dias

FROM crm_funil_etapas e
LEFT JOIN crm_oportunidades o ON o.etapa_id = e.id
WHERE e.ativo = true
GROUP BY e.id, e.escritorio_id, e.nome, e.ordem, e.cor, e.tipo
ORDER BY e.ordem;

COMMENT ON VIEW v_crm_funil_conversao IS 'Métricas de conversão por etapa do funil';

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function: Criar Pessoa com Validação
CREATE OR REPLACE FUNCTION create_pessoa(
    p_escritorio_id UUID,
    p_tipo_pessoa TEXT,
    p_tipo_contato TEXT,
    p_nome_completo TEXT,
    p_cpf_cnpj TEXT DEFAULT NULL,
    p_dados JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID AS $$
DECLARE
    v_pessoa_id UUID;
    v_cpf_cnpj_limpo TEXT;
BEGIN
    -- Limpar CPF/CNPJ (remover pontuação)
    IF p_cpf_cnpj IS NOT NULL THEN
        v_cpf_cnpj_limpo := REGEXP_REPLACE(p_cpf_cnpj, '[^0-9]', '', 'g');

        -- Validar tamanho
        IF p_tipo_pessoa = 'pf' AND LENGTH(v_cpf_cnpj_limpo) != 11 THEN
            RAISE EXCEPTION 'CPF inválido: deve conter 11 dígitos';
        END IF;

        IF p_tipo_pessoa = 'pj' AND LENGTH(v_cpf_cnpj_limpo) != 14 THEN
            RAISE EXCEPTION 'CNPJ inválido: deve conter 14 dígitos';
        END IF;

        -- Verificar se já existe
        IF EXISTS (SELECT 1 FROM crm_pessoas WHERE cpf_cnpj = v_cpf_cnpj_limpo) THEN
            RAISE EXCEPTION 'CPF/CNPJ já cadastrado no sistema';
        END IF;
    END IF;

    -- Inserir pessoa
    INSERT INTO crm_pessoas (
        escritorio_id,
        tipo_pessoa,
        tipo_contato,
        nome_completo,
        cpf_cnpj,
        nome_fantasia,
        rg_ie,
        data_nascimento,
        nacionalidade,
        estado_civil,
        profissao,
        telefone_principal,
        telefone_secundario,
        celular,
        email_principal,
        email_secundario,
        whatsapp,
        cep,
        logradouro,
        numero,
        complemento,
        bairro,
        cidade,
        uf,
        status,
        origem,
        responsavel_id,
        observacoes,
        tags
    )
    VALUES (
        p_escritorio_id,
        p_tipo_pessoa,
        p_tipo_contato,
        p_nome_completo,
        v_cpf_cnpj_limpo,
        p_dados->>'nome_fantasia',
        p_dados->>'rg_ie',
        (p_dados->>'data_nascimento')::DATE,
        COALESCE(p_dados->>'nacionalidade', 'Brasileira'),
        p_dados->>'estado_civil',
        p_dados->>'profissao',
        p_dados->>'telefone_principal',
        p_dados->>'telefone_secundario',
        p_dados->>'celular',
        p_dados->>'email_principal',
        p_dados->>'email_secundario',
        p_dados->>'whatsapp',
        p_dados->>'cep',
        p_dados->>'logradouro',
        p_dados->>'numero',
        p_dados->>'complemento',
        p_dados->>'bairro',
        p_dados->>'cidade',
        p_dados->>'uf',
        COALESCE(p_dados->>'status', 'prospecto'),
        p_dados->>'origem',
        (p_dados->>'responsavel_id')::UUID,
        p_dados->>'observacoes',
        COALESCE((p_dados->>'tags')::TEXT[], '{}')
    )
    RETURNING id INTO v_pessoa_id;

    RETURN v_pessoa_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_pessoa IS 'Cria nova pessoa com validação de CPF/CNPJ e normalização de dados';

-- Function: Registrar Interação
CREATE OR REPLACE FUNCTION registrar_interacao(
    p_pessoa_id UUID,
    p_user_id UUID,
    p_tipo TEXT,
    p_assunto TEXT,
    p_descricao TEXT,
    p_dados JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID AS $$
DECLARE
    v_interacao_id UUID;
BEGIN
    -- Inserir interação
    INSERT INTO crm_interacoes (
        pessoa_id,
        user_id,
        tipo,
        assunto,
        descricao,
        data_hora,
        duracao_minutos,
        resultado,
        participantes,
        follow_up,
        follow_up_data,
        follow_up_descricao,
        processo_id,
        oportunidade_id
    )
    VALUES (
        p_pessoa_id,
        p_user_id,
        p_tipo,
        p_assunto,
        p_descricao,
        COALESCE((p_dados->>'data_hora')::TIMESTAMPTZ, NOW()),
        (p_dados->>'duracao_minutos')::INTEGER,
        p_dados->>'resultado',
        COALESCE((p_dados->>'participantes')::TEXT[], '{}'),
        COALESCE((p_dados->>'follow_up')::BOOLEAN, false),
        (p_dados->>'follow_up_data')::DATE,
        p_dados->>'follow_up_descricao',
        (p_dados->>'processo_id')::UUID,
        (p_dados->>'oportunidade_id')::UUID
    )
    RETURNING id INTO v_interacao_id;

    -- Atualizar updated_at da pessoa
    UPDATE crm_pessoas
    SET updated_at = NOW()
    WHERE id = p_pessoa_id;

    -- TODO: Criar notificação se tiver follow-up

    RETURN v_interacao_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION registrar_interacao IS 'Registra nova interação com uma pessoa e atualiza timestamp';

-- Function: Mover Oportunidade de Etapa
CREATE OR REPLACE FUNCTION mover_oportunidade_etapa(
    p_oportunidade_id UUID,
    p_nova_etapa_id UUID,
    p_user_id UUID,
    p_observacao TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_etapa_anterior_id UUID;
    v_etapa_anterior_nome TEXT;
    v_nova_etapa_nome TEXT;
BEGIN
    -- Buscar etapa atual
    SELECT etapa_id INTO v_etapa_anterior_id
    FROM crm_oportunidades
    WHERE id = p_oportunidade_id;

    -- Buscar nomes das etapas
    SELECT nome INTO v_etapa_anterior_nome
    FROM crm_funil_etapas
    WHERE id = v_etapa_anterior_id;

    SELECT nome INTO v_nova_etapa_nome
    FROM crm_funil_etapas
    WHERE id = p_nova_etapa_id;

    -- Atualizar etapa
    UPDATE crm_oportunidades
    SET
        etapa_id = p_nova_etapa_id,
        updated_at = NOW()
    WHERE id = p_oportunidade_id;

    -- Registrar atividade de mudança
    INSERT INTO crm_oportunidades_atividades (
        oportunidade_id,
        user_id,
        tipo,
        titulo,
        descricao,
        dados_extras
    )
    VALUES (
        p_oportunidade_id,
        p_user_id,
        'mudanca_etapa',
        'Oportunidade movida para ' || v_nova_etapa_nome,
        COALESCE(p_observacao, 'Oportunidade avançou no funil'),
        jsonb_build_object(
            'etapa_anterior_id', v_etapa_anterior_id,
            'etapa_anterior_nome', v_etapa_anterior_nome,
            'nova_etapa_id', p_nova_etapa_id,
            'nova_etapa_nome', v_nova_etapa_nome
        )
    );

    RETURN true;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION mover_oportunidade_etapa IS 'Move oportunidade para nova etapa e registra atividade';

-- Function: Converter Oportunidade em Cliente
CREATE OR REPLACE FUNCTION converter_oportunidade_cliente(
    p_oportunidade_id UUID,
    p_user_id UUID,
    p_valor_fechado NUMERIC,
    p_etapa_ganho_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_pessoa_id UUID;
BEGIN
    -- Buscar pessoa da oportunidade
    SELECT pessoa_id INTO v_pessoa_id
    FROM crm_oportunidades
    WHERE id = p_oportunidade_id;

    -- Atualizar oportunidade como ganha
    UPDATE crm_oportunidades
    SET
        etapa_id = p_etapa_ganho_id,
        resultado = 'ganho',
        valor_fechado = p_valor_fechado,
        data_fechamento = CURRENT_DATE,
        updated_at = NOW()
    WHERE id = p_oportunidade_id;

    -- Atualizar pessoa para cliente ativo
    UPDATE crm_pessoas
    SET
        tipo_contato = 'cliente',
        status = 'ativo',
        updated_at = NOW()
    WHERE id = v_pessoa_id;

    -- Registrar atividade
    INSERT INTO crm_oportunidades_atividades (
        oportunidade_id,
        user_id,
        tipo,
        titulo,
        descricao,
        dados_extras
    )
    VALUES (
        p_oportunidade_id,
        p_user_id,
        'mudanca_etapa',
        'Oportunidade convertida em cliente',
        'Negociação finalizada com sucesso',
        jsonb_build_object(
            'valor_fechado', p_valor_fechado,
            'convertido_em', 'cliente'
        )
    );

    RETURN true;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION converter_oportunidade_cliente IS 'Converte oportunidade ganha em cliente ativo';
