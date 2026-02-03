-- =====================================================
-- CRIAR ESCRITÓRIO DE TESTES - AMBIENTE ISOLADO
-- =====================================================
-- Este script cria um escritório separado exclusivamente
-- para testes automatizados. Todos os dados criados aqui
-- estarão isolados por RLS e não afetarão dados reais.
-- =====================================================

-- 1. Criar escritório de testes
INSERT INTO escritorios (
  id,
  nome,
  slug,
  cnpj,
  descricao,
  email,
  telefone,
  plano,
  max_usuarios,
  ativo,
  setup_completo,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001', -- UUID fixo para fácil identificação
  'Escritório de Testes - ZYRA AI Platform',
  'escritorio-testes-zyra',
  '00.000.000/0001-00',
  '⚠️ ESCRITÓRIO EXCLUSIVO PARA TESTES AUTOMATIZADOS - NÃO USAR EM PRODUÇÃO',
  'testes@zyra.ai',
  '(11) 0000-0000',
  'enterprise', -- Acesso a todos os recursos
  100, -- Permitir muitos usuários para testes
  true,
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  updated_at = NOW();

-- 2. Criar usuário de testes
-- OBS: Este usuário precisa ser criado via Supabase Auth separadamente
-- Aqui vamos apenas preparar o profile caso ele seja criado

-- Vamos criar uma função para facilitar a criação do usuário de teste
CREATE OR REPLACE FUNCTION criar_usuario_teste(
  p_email TEXT DEFAULT 'teste-beta@zyra.ai',
  p_nome TEXT DEFAULT 'Beta Tester - Automação ZYRA',
  p_password TEXT DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_escritorio_id UUID := '00000000-0000-0000-0000-000000000001';
  v_result JSONB;
BEGIN
  -- Verificar se o usuário já existe no auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_email;

  -- Se não existir, criar via Supabase Auth não é possível aqui
  -- Então vamos apenas retornar instruções
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Usuário não encontrado. Crie manualmente via Supabase Dashboard ou use a função de signup.',
      'instructions', jsonb_build_object(
        'email', p_email,
        'password', COALESCE(p_password, 'teste123456'),
        'command', 'Criar via Supabase Dashboard > Authentication > Add User'
      )
    );
  END IF;

  -- Criar/atualizar profile
  INSERT INTO profiles (
    id,
    nome_completo,
    email,
    cpf,
    telefone,
    primeiro_acesso,
    onboarding_completo,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    p_nome,
    p_email,
    '000.000.000-00',
    '(11) 90000-0000',
    false,
    true,
    NOW(),
    NOW()
  ) ON CONFLICT (id) DO UPDATE SET
    nome_completo = EXCLUDED.nome_completo,
    email = EXCLUDED.email,
    updated_at = NOW();

  -- Vincular ao escritório de testes
  INSERT INTO escritorios_usuarios (
    user_id,
    escritorio_id,
    role,
    is_owner,
    ativo,
    convidado_em,
    created_at
  ) VALUES (
    v_user_id,
    v_escritorio_id,
    'admin',
    true,
    true,
    NOW(),
    NOW()
  ) ON CONFLICT (user_id, escritorio_id) DO UPDATE SET
    role = 'admin',
    is_owner = true,
    ativo = true;

  -- Definir como escritório ativo
  INSERT INTO escritorios_usuarios_ativo (
    user_id,
    escritorio_id,
    updated_at
  ) VALUES (
    v_user_id,
    v_escritorio_id,
    NOW()
  ) ON CONFLICT (user_id) DO UPDATE SET
    escritorio_id = v_escritorio_id,
    updated_at = NOW();

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'escritorio_id', v_escritorio_id,
    'message', 'Usuário de teste configurado com sucesso!'
  );
END;
$$;

-- 3. Criar cargos padrão para o escritório de testes
INSERT INTO escritorios_cargos (
  escritorio_id,
  nome,
  nome_display,
  nivel,
  cor,
  valor_hora_padrao,
  ativo
) VALUES
  ('00000000-0000-0000-0000-000000000001', 'socio', 'Sócio', 1, '#1E3A8A', 500.00, true),
  ('00000000-0000-0000-0000-000000000001', 'advogado-senior', 'Advogado Sênior', 2, '#2563EB', 350.00, true),
  ('00000000-0000-0000-0000-000000000001', 'advogado-pleno', 'Advogado Pleno', 3, '#3B82F6', 250.00, true),
  ('00000000-0000-0000-0000-000000000001', 'advogado-junior', 'Advogado Júnior', 4, '#60A5FA', 150.00, true),
  ('00000000-0000-0000-0000-000000000001', 'estagiario', 'Estagiário', 5, '#93C5FD', 50.00, true),
  ('00000000-0000-0000-0000-000000000001', 'secretaria', 'Secretária', 6, '#DBEAFE', 80.00, true)
ON CONFLICT (escritorio_id, nome) DO NOTHING;

-- 4. Criar permissões completas para o cargo de sócio (admin de testes)
INSERT INTO escritorios_cargos_permissoes (
  cargo_id,
  modulo,
  pode_visualizar,
  pode_criar,
  pode_editar,
  pode_excluir,
  pode_exportar
)
SELECT
  ec.id,
  modulo,
  true, true, true, true, true
FROM escritorios_cargos ec
CROSS JOIN (
  VALUES
    ('dashboard'),
    ('crm'),
    ('processos'),
    ('agenda'),
    ('financeiro'),
    ('consultivo'),
    ('publicacoes'),
    ('documentos'),
    ('relatorios'),
    ('configuracoes')
) AS modulos(modulo)
WHERE ec.escritorio_id = '00000000-0000-0000-0000-000000000001'
  AND ec.nome = 'socio'
ON CONFLICT (cargo_id, modulo) DO UPDATE SET
  pode_visualizar = true,
  pode_criar = true,
  pode_editar = true,
  pode_excluir = true,
  pode_exportar = true;

-- 5. Criar função helper para limpar dados de teste
CREATE OR REPLACE FUNCTION limpar_dados_escritorio_teste()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_escritorio_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  -- Deletar todos os dados do escritório de teste
  -- (O RLS garante que só afeta este escritório)

  -- CRM
  DELETE FROM crm_pessoas WHERE escritorio_id = v_escritorio_id;
  DELETE FROM crm_oportunidades WHERE escritorio_id = v_escritorio_id;
  DELETE FROM crm_interacoes WHERE escritorio_id = v_escritorio_id;

  -- Processos
  DELETE FROM processos_processos WHERE escritorio_id = v_escritorio_id;

  -- Agenda
  DELETE FROM agenda_eventos WHERE escritorio_id = v_escritorio_id;
  DELETE FROM agenda_tarefas WHERE escritorio_id = v_escritorio_id;
  DELETE FROM agenda_audiencias WHERE escritorio_id = v_escritorio_id;

  -- Financeiro
  DELETE FROM financeiro_lancamentos WHERE escritorio_id = v_escritorio_id;
  DELETE FROM financeiro_contratos WHERE escritorio_id = v_escritorio_id;

  RAISE NOTICE 'Dados de teste limpos com sucesso!';
END;
$$;

-- 6. Comentários para facilitar uso
COMMENT ON FUNCTION criar_usuario_teste IS 'Cria ou atualiza usuário de teste e vincula ao escritório de testes';
COMMENT ON FUNCTION limpar_dados_escritorio_teste IS 'Remove todos os dados de teste criados no escritório de testes';

-- 7. Criar view para monitorar escritório de testes
CREATE OR REPLACE VIEW v_estatisticas_escritorio_teste AS
SELECT
  'Pessoas' as modulo,
  COUNT(*) as total_registros
FROM crm_pessoas
WHERE escritorio_id = '00000000-0000-0000-0000-000000000001'

UNION ALL

SELECT
  'Processos',
  COUNT(*)
FROM processos_processos
WHERE escritorio_id = '00000000-0000-0000-0000-000000000001'

UNION ALL

SELECT
  'Eventos',
  COUNT(*)
FROM agenda_eventos
WHERE escritorio_id = '00000000-0000-0000-0000-000000000001'

UNION ALL

SELECT
  'Tarefas',
  COUNT(*)
FROM agenda_tarefas
WHERE escritorio_id = '00000000-0000-0000-0000-000000000001'

UNION ALL

SELECT
  'Lançamentos',
  COUNT(*)
FROM financeiro_lancamentos
WHERE escritorio_id = '00000000-0000-0000-0000-000000000001'

UNION ALL

SELECT
  'Contratos',
  COUNT(*)
FROM financeiro_contratos
WHERE escritorio_id = '00000000-0000-0000-0000-000000000001';

-- =====================================================
-- INSTRUÇÕES DE USO
-- =====================================================

-- Para ver estatísticas do escritório de testes:
-- SELECT * FROM v_estatisticas_escritorio_teste;

-- Para limpar todos os dados de teste:
-- SELECT limpar_dados_escritorio_teste();

-- Para criar usuário de teste (depois de criar no Supabase Auth):
-- SELECT criar_usuario_teste('teste-beta@zyra.ai', 'Beta Tester');

-- =====================================================
