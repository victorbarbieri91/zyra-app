-- =====================================================
-- MÓDULO CRM - SEED DATA
-- =====================================================
-- Dados iniciais para testes do módulo CRM
-- =====================================================

-- =====================================================
-- SEED: ETAPAS DO FUNIL PADRÃO
-- =====================================================

-- Buscar primeiro escritório para seed
DO $$
DECLARE
    v_escritorio_id UUID;
    v_user_admin_id UUID;
    v_user_advogado_id UUID;

    -- IDs de pessoas criadas
    v_pessoa_cliente_1 UUID;
    v_pessoa_cliente_2 UUID;
    v_pessoa_lead_1 UUID;
    v_pessoa_lead_2 UUID;
    v_pessoa_parte_contraria UUID;
    v_pessoa_correspondente UUID;

    -- IDs de etapas do funil
    v_etapa_lead UUID;
    v_etapa_proposta UUID;
    v_etapa_negociacao UUID;
    v_etapa_ganho UUID;
    v_etapa_perdido UUID;

    -- IDs de oportunidades
    v_oportunidade_1 UUID;
    v_oportunidade_2 UUID;
    v_oportunidade_3 UUID;

BEGIN
    -- Pegar primeiro escritório e usuários
    SELECT id INTO v_escritorio_id FROM escritorios ORDER BY created_at LIMIT 1;

    IF v_escritorio_id IS NULL THEN
        RAISE NOTICE 'Nenhum escritório encontrado. Pulando seed de CRM.';
        RETURN;
    END IF;

    -- Pegar usuários do escritório
    SELECT id INTO v_user_admin_id
    FROM profiles
    WHERE escritorio_id = v_escritorio_id AND papel IN ('admin', 'socio')
    ORDER BY created_at LIMIT 1;

    SELECT id INTO v_user_advogado_id
    FROM profiles
    WHERE escritorio_id = v_escritorio_id AND papel = 'advogado'
    ORDER BY created_at LIMIT 1;

    -- Se não encontrar advogado, usar admin
    IF v_user_advogado_id IS NULL THEN
        v_user_advogado_id := v_user_admin_id;
    END IF;

    RAISE NOTICE 'Iniciando seed CRM para escritório: %', v_escritorio_id;

    -- =====================================================
    -- 1. CRIAR ETAPAS DO FUNIL
    -- =====================================================

    INSERT INTO crm_funil_etapas (id, escritorio_id, nome, descricao, ordem, cor, tipo)
    VALUES
        (gen_random_uuid(), v_escritorio_id, 'Lead', 'Primeiro contato com potencial cliente', 1, '#64748b', 'em_andamento'),
        (gen_random_uuid(), v_escritorio_id, 'Proposta Enviada', 'Proposta comercial enviada aguardando resposta', 2, '#3b82f6', 'em_andamento'),
        (gen_random_uuid(), v_escritorio_id, 'Negociação', 'Em negociação de valores e condições', 3, '#f59e0b', 'em_andamento'),
        (gen_random_uuid(), v_escritorio_id, 'Fechado - Ganho', 'Cliente convertido com sucesso', 4, '#10b981', 'ganho'),
        (gen_random_uuid(), v_escritorio_id, 'Fechado - Perdido', 'Oportunidade perdida', 5, '#ef4444', 'perdido')
    RETURNING id INTO v_etapa_lead;

    -- Capturar IDs das etapas
    SELECT id INTO v_etapa_lead FROM crm_funil_etapas WHERE escritorio_id = v_escritorio_id AND ordem = 1;
    SELECT id INTO v_etapa_proposta FROM crm_funil_etapas WHERE escritorio_id = v_escritorio_id AND ordem = 2;
    SELECT id INTO v_etapa_negociacao FROM crm_funil_etapas WHERE escritorio_id = v_escritorio_id AND ordem = 3;
    SELECT id INTO v_etapa_ganho FROM crm_funil_etapas WHERE escritorio_id = v_escritorio_id AND ordem = 4;
    SELECT id INTO v_etapa_perdido FROM crm_funil_etapas WHERE escritorio_id = v_escritorio_id AND ordem = 5;

    RAISE NOTICE 'Etapas do funil criadas';

    -- =====================================================
    -- 2. CRIAR PESSOAS (CLIENTES, LEADS, OUTROS)
    -- =====================================================

    -- Cliente Ativo 1 - Pessoa Física
    INSERT INTO crm_pessoas (
        id, escritorio_id, tipo_pessoa, tipo_contato, nome_completo, cpf_cnpj,
        telefone_principal, celular, email_principal, whatsapp,
        cep, logradouro, numero, bairro, cidade, uf,
        status, origem, responsavel_id, tags
    ) VALUES (
        gen_random_uuid(), v_escritorio_id, 'pf', 'cliente', 'Maria Silva Santos', '12345678901',
        '(11) 3456-7890', '(11) 98765-4321', 'maria.silva@email.com', '11987654321',
        '01310-100', 'Av. Paulista', '1578', 'Bela Vista', 'São Paulo', 'SP',
        'ativo', 'indicacao', v_user_advogado_id, ARRAY['vip', 'trabalhista']
    ) RETURNING id INTO v_pessoa_cliente_1;

    -- Cliente Ativo 2 - Pessoa Jurídica
    INSERT INTO crm_pessoas (
        id, escritorio_id, tipo_pessoa, tipo_contato, nome_completo, nome_fantasia, cpf_cnpj,
        telefone_principal, email_principal,
        cep, logradouro, numero, bairro, cidade, uf,
        status, origem, responsavel_id, tags
    ) VALUES (
        gen_random_uuid(), v_escritorio_id, 'pj', 'cliente', 'Empresa ABC Ltda', 'ABC Tecnologia', '12345678000190',
        '(11) 3000-0000', 'contato@empresaabc.com.br',
        '04543-011', 'Av. Brigadeiro Faria Lima', '3477', 'Itaim Bibi', 'São Paulo', 'SP',
        'ativo', 'site', v_user_advogado_id, ARRAY['empresarial', 'recorrente']
    ) RETURNING id INTO v_pessoa_cliente_2;

    -- Lead 1 - Prospecto
    INSERT INTO crm_pessoas (
        id, escritorio_id, tipo_pessoa, tipo_contato, nome_completo, cpf_cnpj,
        celular, email_principal, cidade, uf,
        status, origem, responsavel_id
    ) VALUES (
        gen_random_uuid(), v_escritorio_id, 'pf', 'cliente', 'João Pedro Oliveira', '98765432100',
        '(11) 99876-5432', 'joao.oliveira@email.com', 'São Paulo', 'SP',
        'prospecto', 'google', v_user_advogado_id
    ) RETURNING id INTO v_pessoa_lead_1;

    -- Lead 2 - Prospecto
    INSERT INTO crm_pessoas (
        id, escritorio_id, tipo_pessoa, tipo_contato, nome_completo,
        celular, email_principal, cidade, uf,
        status, origem, responsavel_id
    ) VALUES (
        gen_random_uuid(), v_escritorio_id, 'pj', 'cliente', 'Indústria XYZ S.A.',
        '(11) 3100-0000', 'contato@industriaxyz.com.br', 'Guarulhos', 'SP',
        'prospecto', 'instagram', v_user_advogado_id
    ) RETURNING id INTO v_pessoa_lead_2;

    -- Parte Contrária
    INSERT INTO crm_pessoas (
        id, escritorio_id, tipo_pessoa, tipo_contato, nome_completo,
        status, responsavel_id
    ) VALUES (
        gen_random_uuid(), v_escritorio_id, 'pj', 'parte_contraria', 'Empresa Ré Ltda',
        'ativo', v_user_advogado_id
    ) RETURNING id INTO v_pessoa_parte_contraria;

    -- Correspondente
    INSERT INTO crm_pessoas (
        id, escritorio_id, tipo_pessoa, tipo_contato, nome_completo,
        celular, email_principal, cidade, uf,
        status, responsavel_id, tags
    ) VALUES (
        gen_random_uuid(), v_escritorio_id, 'pf', 'correspondente', 'Dr. Carlos Mendes',
        '(21) 98888-7777', 'carlos.mendes@adv.com.br', 'Rio de Janeiro', 'RJ',
        'ativo', v_user_advogado_id, ARRAY['correspondente', 'rio_de_janeiro']
    ) RETURNING id INTO v_pessoa_correspondente;

    RAISE NOTICE 'Pessoas criadas (clientes, leads, outros)';

    -- =====================================================
    -- 3. CRIAR OPORTUNIDADES NO FUNIL
    -- =====================================================

    -- Oportunidade 1: Lead (início do funil)
    INSERT INTO crm_oportunidades (
        id, escritorio_id, pessoa_id, titulo, descricao,
        valor_estimado, probabilidade, etapa_id, responsavel_id,
        origem, area_juridica, data_abertura, data_prevista_fechamento,
        tags
    ) VALUES (
        gen_random_uuid(), v_escritorio_id, v_pessoa_lead_1,
        'Ação Trabalhista - João Oliveira',
        'Cliente busca assessoria para ação de horas extras contra ex-empregador',
        15000.00, 30, v_etapa_lead, v_user_advogado_id,
        'google', 'Trabalhista', CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '15 days',
        ARRAY['trabalhista', 'horas_extras']
    ) RETURNING id INTO v_oportunidade_1;

    -- Oportunidade 2: Proposta Enviada
    INSERT INTO crm_oportunidades (
        id, escritorio_id, pessoa_id, titulo, descricao,
        valor_estimado, probabilidade, etapa_id, responsavel_id,
        origem, area_juridica, data_abertura, data_prevista_fechamento,
        tags
    ) VALUES (
        gen_random_uuid(), v_escritorio_id, v_pessoa_lead_2,
        'Assessoria Empresarial - Indústria XYZ',
        'Consultoria para reestruturação societária e contratos',
        50000.00, 60, v_etapa_proposta, v_user_advogado_id,
        'instagram', 'Empresarial', CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '30 days',
        ARRAY['empresarial', 'societario']
    ) RETURNING id INTO v_oportunidade_2;

    -- Oportunidade 3: Negociação
    INSERT INTO crm_oportunidades (
        id, escritorio_id, pessoa_id, titulo, descricao,
        valor_estimado, probabilidade, etapa_id, responsavel_id,
        origem, area_juridica, data_abertura, data_prevista_fechamento,
        tags
    ) VALUES (
        gen_random_uuid(), v_escritorio_id, v_pessoa_cliente_2,
        'Contrato de Fornecimento - ABC Tecnologia',
        'Análise e elaboração de contratos com fornecedores internacionais',
        25000.00, 80, v_etapa_negociacao, v_user_advogado_id,
        'indicacao', 'Contratual', CURRENT_DATE - INTERVAL '20 days', CURRENT_DATE + INTERVAL '10 days',
        ARRAY['contratos', 'internacional']
    ) RETURNING id INTO v_oportunidade_3;

    RAISE NOTICE 'Oportunidades criadas';

    -- =====================================================
    -- 4. CRIAR ATIVIDADES DAS OPORTUNIDADES
    -- =====================================================

    -- Atividades da Oportunidade 1
    INSERT INTO crm_oportunidades_atividades (oportunidade_id, user_id, tipo, titulo, descricao, data_hora)
    VALUES
        (v_oportunidade_1, v_user_advogado_id, 'nota', 'Primeiro contato', 'Cliente entrou em contato via formulário do site', NOW() - INTERVAL '5 days'),
        (v_oportunidade_1, v_user_advogado_id, 'ligacao', 'Ligação inicial', 'Conversa telefônica para entender o caso. Cliente relatou problemas com ex-empregador.', NOW() - INTERVAL '4 days'),
        (v_oportunidade_1, v_user_advogado_id, 'email', 'Documentos solicitados', 'Enviado email solicitando CTPS, contracheques e rescisão', NOW() - INTERVAL '3 days');

    -- Atividades da Oportunidade 2
    INSERT INTO crm_oportunidades_atividades (oportunidade_id, user_id, tipo, titulo, descricao, data_hora)
    VALUES
        (v_oportunidade_2, v_user_advogado_id, 'reuniao', 'Reunião presencial', 'Reunião com sócios da empresa para entender necessidades', NOW() - INTERVAL '10 days'),
        (v_oportunidade_2, v_user_advogado_id, 'proposta_enviada', 'Proposta comercial enviada', 'Enviada proposta detalhada com escopo de trabalho e valores', NOW() - INTERVAL '7 days'),
        (v_oportunidade_2, v_user_advogado_id, 'whatsapp', 'Follow-up', 'Mensagem para saber se receberam a proposta', NOW() - INTERVAL '2 days');

    -- Atividades da Oportunidade 3
    INSERT INTO crm_oportunidades_atividades (oportunidade_id, user_id, tipo, titulo, descricao, data_hora)
    VALUES
        (v_oportunidade_3, v_user_advogado_id, 'mudanca_etapa', 'Movido para Negociação', 'Cliente demonstrou interesse, negociando condições de pagamento', NOW() - INTERVAL '15 days'),
        (v_oportunidade_3, v_user_advogado_id, 'reuniao', 'Reunião de alinhamento', 'Alinhamento de escopo e prazos de entrega', NOW() - INTERVAL '10 days'),
        (v_oportunidade_3, v_user_advogado_id, 'alteracao_valor', 'Valor ajustado', 'Valor ajustado de R$ 30.000 para R$ 25.000 após negociação', NOW() - INTERVAL '5 days');

    RAISE NOTICE 'Atividades das oportunidades criadas';

    -- =====================================================
    -- 5. CRIAR INTERAÇÕES COM CLIENTES
    -- =====================================================

    -- Interações com Cliente 1 (Maria Silva)
    INSERT INTO crm_interacoes (
        pessoa_id, user_id, tipo, assunto, descricao,
        data_hora, duracao_minutos, resultado,
        follow_up, follow_up_data, follow_up_descricao
    ) VALUES
        (
            v_pessoa_cliente_1, v_user_advogado_id, 'reuniao',
            'Reunião inicial sobre novo caso',
            'Cliente relatou novo problema trabalhista. Necessário análise de documentos.',
            NOW() - INTERVAL '30 days', 60, 'Documentos solicitados',
            true, CURRENT_DATE + INTERVAL '7 days', 'Verificar se cliente enviou documentos'
        ),
        (
            v_pessoa_cliente_1, v_user_advogado_id, 'ligacao',
            'Follow-up documentos',
            'Cliente confirmou envio dos documentos por email',
            NOW() - INTERVAL '25 days', 15, 'Documentos recebidos',
            false, NULL, NULL
        ),
        (
            v_pessoa_cliente_1, v_user_advogado_id, 'email',
            'Atualização do processo',
            'Enviado email com atualização sobre andamento do processo principal',
            NOW() - INTERVAL '10 days', NULL, 'Cliente satisfeito',
            false, NULL, NULL
        );

    -- Interações com Cliente 2 (Empresa ABC)
    INSERT INTO crm_interacoes (
        pessoa_id, user_id, tipo, assunto, descricao,
        data_hora, duracao_minutos, resultado
    ) VALUES
        (
            v_pessoa_cliente_2, v_user_advogado_id, 'reuniao',
            'Reunião mensal de acompanhamento',
            'Reunião de rotina com o departamento jurídico da empresa. Discutidos 3 contratos novos.',
            NOW() - INTERVAL '15 days', 90, 'Novos contratos para análise'
        ),
        (
            v_pessoa_cliente_2, v_user_advogado_id, 'videochamada',
            'Alinhamento estratégico',
            'Videochamada para discutir estratégia de expansão e implicações legais',
            NOW() - INTERVAL '5 days', 45, 'Parecer solicitado'
        );

    RAISE NOTICE 'Interações com clientes criadas';

    -- =====================================================
    -- 6. CRIAR RELACIONAMENTOS ENTRE PESSOAS
    -- =====================================================

    -- Relacionamento: Correspondente do escritório
    INSERT INTO crm_relacionamentos (pessoa_origem_id, pessoa_destino_id, tipo_relacionamento, descricao)
    VALUES
        (v_escritorio_id, v_pessoa_correspondente, 'parceiro', 'Correspondente jurídico no Rio de Janeiro');

    RAISE NOTICE 'Relacionamentos criados';

    -- =====================================================
    RAISE NOTICE '✅ Seed de CRM concluído com sucesso!';
    RAISE NOTICE '- 5 etapas do funil';
    RAISE NOTICE '- 6 pessoas (2 clientes, 2 leads, 1 parte contrária, 1 correspondente)';
    RAISE NOTICE '- 3 oportunidades em etapas diferentes';
    RAISE NOTICE '- 9 atividades de oportunidades';
    RAISE NOTICE '- 5 interações com clientes';
    RAISE NOTICE '- 1 relacionamento';
    -- =====================================================

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao executar seed de CRM: %', SQLERRM;
        RAISE;
END $$;
