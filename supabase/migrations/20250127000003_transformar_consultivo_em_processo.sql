-- =====================================================
-- Migration: Transformar Consultivo em Processo
-- Descrição: Adiciona funcionalidade para converter
--            pastas do consultivo em processos judiciais
-- Data: 2025-01-27
-- =====================================================

-- 1. Adicionar campo de origem na tabela de processos
-- =====================================================
ALTER TABLE processos_processos
ADD COLUMN IF NOT EXISTS consultivo_origem_id UUID REFERENCES consultivo_consultas(id);

-- Índice para busca rápida de processos originados do consultivo
CREATE INDEX IF NOT EXISTS idx_processos_consultivo_origem
ON processos_processos(consultivo_origem_id)
WHERE consultivo_origem_id IS NOT NULL;

-- Comentário explicativo
COMMENT ON COLUMN processos_processos.consultivo_origem_id IS
'ID da pasta consultiva que originou este processo. Permite rastrear a conversão consultivo → contencioso.';


-- 2. Função para transformar consultivo em processo
-- =====================================================
CREATE OR REPLACE FUNCTION transformar_consultivo_em_processo(
    p_consultivo_id UUID,
    p_numero_cnj TEXT DEFAULT NULL,
    p_tipo TEXT DEFAULT 'judicial',
    p_data_distribuicao DATE DEFAULT CURRENT_DATE,
    p_polo_cliente TEXT DEFAULT 'ativo',
    p_parte_contraria TEXT DEFAULT NULL,
    p_tribunal TEXT DEFAULT NULL,
    p_comarca TEXT DEFAULT NULL,
    p_vara TEXT DEFAULT NULL,
    p_uf TEXT DEFAULT NULL,
    p_fase TEXT DEFAULT 'conhecimento',
    p_instancia TEXT DEFAULT '1ª',
    p_valor_causa NUMERIC DEFAULT NULL,
    p_manter_contrato BOOLEAN DEFAULT TRUE,
    p_migrar_andamentos BOOLEAN DEFAULT TRUE,
    p_arquivar_consultivo BOOLEAN DEFAULT TRUE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_consultivo RECORD;
    v_processo_id UUID;
    v_numero_pasta TEXT;
    v_andamento JSONB;
    v_movimentacao_id UUID;
    v_contrato_id UUID;
    v_resultado JSON;
BEGIN
    -- 1. Buscar dados do consultivo
    SELECT * INTO v_consultivo
    FROM consultivo_consultas
    WHERE id = p_consultivo_id;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'sucesso', false,
            'erro', 'Pasta consultiva não encontrada'
        );
    END IF;

    -- 2. Verificar se já foi transformada
    IF EXISTS (
        SELECT 1 FROM processos_processos
        WHERE consultivo_origem_id = p_consultivo_id
    ) THEN
        RETURN json_build_object(
            'sucesso', false,
            'erro', 'Esta pasta consultiva já foi transformada em processo'
        );
    END IF;

    -- 3. Definir contrato
    v_contrato_id := CASE WHEN p_manter_contrato THEN v_consultivo.contrato_id ELSE NULL END;

    -- 4. Criar o processo
    -- O número da pasta será gerado automaticamente pelo trigger gerar_numero_pasta
    INSERT INTO processos_processos (
        escritorio_id,
        numero_cnj,
        tipo,
        area,
        fase,
        instancia,
        data_distribuicao,
        cliente_id,
        polo_cliente,
        parte_contraria,
        responsavel_id,
        contrato_id,
        tribunal,
        comarca,
        vara,
        uf,
        valor_causa,
        objeto_acao,
        observacoes,
        status,
        consultivo_origem_id,
        created_by
    ) VALUES (
        v_consultivo.escritorio_id,
        NULLIF(TRIM(p_numero_cnj), ''),
        p_tipo,
        v_consultivo.area,
        p_fase,
        p_instancia,
        p_data_distribuicao,
        v_consultivo.cliente_id,
        p_polo_cliente,
        p_parte_contraria,
        v_consultivo.responsavel_id,
        v_contrato_id,
        p_tribunal,
        p_comarca,
        p_vara,
        p_uf,
        p_valor_causa,
        v_consultivo.titulo,  -- Título vira objeto_acao
        CONCAT(
            v_consultivo.descricao,
            E'\n\n---\nOrigem: Pasta Consultiva ',
            v_consultivo.numero
        ),
        'ativo',
        p_consultivo_id,
        v_consultivo.created_by
    )
    RETURNING id, numero_pasta INTO v_processo_id, v_numero_pasta;

    -- 5. Migrar andamentos para movimentações (se solicitado)
    IF p_migrar_andamentos AND v_consultivo.andamentos IS NOT NULL AND jsonb_array_length(v_consultivo.andamentos) > 0 THEN
        FOR v_andamento IN SELECT * FROM jsonb_array_elements(v_consultivo.andamentos)
        LOOP
            INSERT INTO processos_movimentacoes (
                processo_id,
                escritorio_id,
                data_movimento,
                tipo_descricao,
                descricao,
                origem,
                lida,
                created_at
            ) VALUES (
                v_processo_id,
                v_consultivo.escritorio_id,
                (v_andamento->>'data')::timestamptz,
                COALESCE(v_andamento->>'tipo', 'andamento'),
                CONCAT(
                    '[Consultivo] ',
                    COALESCE(v_andamento->>'descricao', 'Andamento migrado')
                ),
                'manual',  -- Origem manual para andamentos migrados
                true,      -- Já lida pois é histórico
                (v_andamento->>'data')::timestamptz
            );
        END LOOP;

        -- Adicionar movimentação indicando a transformação
        INSERT INTO processos_movimentacoes (
            processo_id,
            escritorio_id,
            data_movimento,
            tipo_descricao,
            descricao,
            origem,
            importante,
            lida
        ) VALUES (
            v_processo_id,
            v_consultivo.escritorio_id,
            NOW(),
            'transformacao',
            CONCAT(
                'Processo criado a partir da pasta consultiva ',
                v_consultivo.numero,
                ' - ',
                v_consultivo.titulo
            ),
            'manual',
            true,
            true
        );
    END IF;

    -- 6. Arquivar a pasta consultiva (se solicitado)
    IF p_arquivar_consultivo THEN
        UPDATE consultivo_consultas
        SET
            status = 'arquivado',
            updated_at = NOW(),
            -- Adicionar andamento de arquivamento
            andamentos = COALESCE(andamentos, '[]'::jsonb) || jsonb_build_array(
                jsonb_build_object(
                    'data', NOW(),
                    'tipo', 'arquivamento',
                    'descricao', CONCAT('Transformada em processo ', v_numero_pasta),
                    'metadata', jsonb_build_object(
                        'processo_id', v_processo_id,
                        'numero_pasta', v_numero_pasta
                    )
                )
            )
        WHERE id = p_consultivo_id;
    END IF;

    -- 7. Retornar resultado
    RETURN json_build_object(
        'sucesso', true,
        'processo_id', v_processo_id,
        'numero_pasta', v_numero_pasta,
        'consultivo_arquivado', p_arquivar_consultivo,
        'andamentos_migrados', p_migrar_andamentos,
        'mensagem', CONCAT('Processo ', v_numero_pasta, ' criado com sucesso')
    );

EXCEPTION
    WHEN unique_violation THEN
        RETURN json_build_object(
            'sucesso', false,
            'erro', 'Número CNJ já existe para outro processo deste escritório'
        );
    WHEN OTHERS THEN
        RETURN json_build_object(
            'sucesso', false,
            'erro', SQLERRM
        );
END;
$$;

-- Comentário da função
COMMENT ON FUNCTION transformar_consultivo_em_processo IS
'Transforma uma pasta consultiva em processo judicial, herdando dados e migrando andamentos.';


-- 3. View para relatório de conversões
-- =====================================================
CREATE OR REPLACE VIEW vw_consultivo_processos_convertidos AS
SELECT
    c.id as consultivo_id,
    c.numero as consultivo_numero,
    c.titulo as consultivo_titulo,
    c.area as consultivo_area,
    c.status as consultivo_status,
    c.created_at as consultivo_criado_em,
    p.id as processo_id,
    p.numero_pasta as processo_numero,
    p.numero_cnj as processo_cnj,
    p.status as processo_status,
    p.created_at as processo_criado_em,
    p.created_at - c.created_at as tempo_conversao,
    cli.nome_completo as cliente_nome,
    resp.nome_completo as responsavel_nome,
    c.escritorio_id
FROM consultivo_consultas c
INNER JOIN processos_processos p ON p.consultivo_origem_id = c.id
LEFT JOIN crm_pessoas cli ON cli.id = c.cliente_id
LEFT JOIN profiles resp ON resp.id = c.responsavel_id
ORDER BY p.created_at DESC;

-- RLS para a view
ALTER VIEW vw_consultivo_processos_convertidos OWNER TO postgres;


-- 4. Função para obter estatísticas de conversão
-- =====================================================
CREATE OR REPLACE FUNCTION get_estatisticas_conversao_consultivo(
    p_escritorio_id UUID,
    p_periodo_inicio DATE DEFAULT NULL,
    p_periodo_fim DATE DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_consultas INT;
    v_total_convertidas INT;
    v_taxa_conversao NUMERIC;
    v_tempo_medio_conversao INTERVAL;
BEGIN
    -- Total de consultas no período
    SELECT COUNT(*) INTO v_total_consultas
    FROM consultivo_consultas
    WHERE escritorio_id = p_escritorio_id
    AND (p_periodo_inicio IS NULL OR created_at >= p_periodo_inicio)
    AND (p_periodo_fim IS NULL OR created_at <= p_periodo_fim);

    -- Total convertidas
    SELECT COUNT(*) INTO v_total_convertidas
    FROM consultivo_consultas c
    INNER JOIN processos_processos p ON p.consultivo_origem_id = c.id
    WHERE c.escritorio_id = p_escritorio_id
    AND (p_periodo_inicio IS NULL OR c.created_at >= p_periodo_inicio)
    AND (p_periodo_fim IS NULL OR c.created_at <= p_periodo_fim);

    -- Taxa de conversão
    v_taxa_conversao := CASE
        WHEN v_total_consultas > 0
        THEN ROUND((v_total_convertidas::NUMERIC / v_total_consultas) * 100, 2)
        ELSE 0
    END;

    -- Tempo médio de conversão
    SELECT AVG(p.created_at - c.created_at) INTO v_tempo_medio_conversao
    FROM consultivo_consultas c
    INNER JOIN processos_processos p ON p.consultivo_origem_id = c.id
    WHERE c.escritorio_id = p_escritorio_id
    AND (p_periodo_inicio IS NULL OR c.created_at >= p_periodo_inicio)
    AND (p_periodo_fim IS NULL OR c.created_at <= p_periodo_fim);

    RETURN json_build_object(
        'total_consultas', v_total_consultas,
        'total_convertidas', v_total_convertidas,
        'taxa_conversao_percentual', v_taxa_conversao,
        'tempo_medio_conversao_dias', EXTRACT(DAY FROM v_tempo_medio_conversao)
    );
END;
$$;

COMMENT ON FUNCTION get_estatisticas_conversao_consultivo IS
'Retorna estatísticas de conversão de pastas consultivas em processos.';


-- 5. Índices adicionais para performance
-- =====================================================
-- Índice para buscar consultas não convertidas
CREATE INDEX IF NOT EXISTS idx_consultivo_nao_convertido
ON consultivo_consultas(escritorio_id, status)
WHERE status = 'ativo';

-- Índice para relatórios de conversão
CREATE INDEX IF NOT EXISTS idx_consultivo_created_at
ON consultivo_consultas(escritorio_id, created_at);
