-- ============================================================================
-- MIGRATION: Sistema de Onboarding
-- Objetivo: Controlar primeiro acesso e setup inicial de usuários
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Adicionar campos em profiles
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'primeiro_acesso') THEN
    ALTER TABLE profiles ADD COLUMN primeiro_acesso BOOLEAN DEFAULT TRUE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'onboarding_completo') THEN
    ALTER TABLE profiles ADD COLUMN onboarding_completo BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'onboarding_etapa_atual') THEN
    ALTER TABLE profiles ADD COLUMN onboarding_etapa_atual TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'onboarding_completado_em') THEN
    ALTER TABLE profiles ADD COLUMN onboarding_completado_em TIMESTAMPTZ;
  END IF;
END $$;

-- ============================================================================
-- 2. Adicionar campos em escritorios
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'escritorios' AND column_name = 'setup_completo') THEN
    ALTER TABLE escritorios ADD COLUMN setup_completo BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'escritorios' AND column_name = 'setup_etapa_atual') THEN
    ALTER TABLE escritorios ADD COLUMN setup_etapa_atual TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'escritorios' AND column_name = 'setup_completado_em') THEN
    ALTER TABLE escritorios ADD COLUMN setup_completado_em TIMESTAMPTZ;
  END IF;
END $$;

-- ============================================================================
-- 3. Criar tabela de controle de onboarding
-- ============================================================================

CREATE TABLE IF NOT EXISTS onboarding_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  escritorio_id UUID NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,

  -- Controle de etapas
  etapa TEXT NOT NULL, -- 'perfil_completo', 'criacao_escritorio', 'tour_dashboard', etc
  completada BOOLEAN DEFAULT FALSE,
  completada_em TIMESTAMPTZ,
  pulada BOOLEAN DEFAULT FALSE,
  pulada_em TIMESTAMPTZ,

  -- Dados adicionais
  dados_etapa JSONB, -- Armazena informações específicas da etapa
  tempo_gasto_segundos INTEGER,

  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(user_id, escritorio_id, etapa)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_onboarding_steps_user ON onboarding_steps(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_steps_escritorio ON onboarding_steps(escritorio_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_steps_completada ON onboarding_steps(completada) WHERE completada = FALSE;

-- RLS
ALTER TABLE onboarding_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own onboarding steps" ON onboarding_steps;
CREATE POLICY "Users can manage their own onboarding steps"
ON onboarding_steps
FOR ALL
USING (user_id = auth.uid());

-- ============================================================================
-- 4. Função para inicializar onboarding
-- ============================================================================

CREATE OR REPLACE FUNCTION initialize_onboarding(
  p_user_id UUID,
  p_escritorio_id UUID
) RETURNS VOID AS $$
BEGIN
  -- Inserir etapas padrão
  INSERT INTO onboarding_steps (user_id, escritorio_id, etapa)
  VALUES
    (p_user_id, p_escritorio_id, 'perfil_completo'),
    (p_user_id, p_escritorio_id, 'criacao_escritorio'),
    (p_user_id, p_escritorio_id, 'tour_dashboard'),
    (p_user_id, p_escritorio_id, 'tour_agenda'),
    (p_user_id, p_escritorio_id, 'primeira_tarefa')
  ON CONFLICT (user_id, escritorio_id, etapa) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. Trigger para inicializar onboarding em novo usuário
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_initialize_onboarding()
RETURNS TRIGGER AS $$
BEGIN
  -- Se é o primeiro escritório do usuário, inicializar onboarding
  IF NEW.escritorio_id IS NOT NULL THEN
    PERFORM initialize_onboarding(NEW.id, NEW.escritorio_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS after_profile_insert_initialize_onboarding ON profiles;
CREATE TRIGGER after_profile_insert_initialize_onboarding
AFTER INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION trigger_initialize_onboarding();

-- ============================================================================
-- 6. Função para marcar etapa como completa
-- ============================================================================

CREATE OR REPLACE FUNCTION complete_onboarding_step(
  p_user_id UUID,
  p_escritorio_id UUID,
  p_etapa TEXT,
  p_dados_etapa JSONB DEFAULT NULL,
  p_tempo_gasto INTEGER DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_all_completed BOOLEAN;
BEGIN
  -- Atualizar etapa
  UPDATE onboarding_steps
  SET
    completada = TRUE,
    completada_em = NOW(),
    dados_etapa = COALESCE(p_dados_etapa, dados_etapa),
    tempo_gasto_segundos = COALESCE(p_tempo_gasto, tempo_gasto_segundos),
    updated_at = NOW()
  WHERE
    user_id = p_user_id
    AND escritorio_id = p_escritorio_id
    AND etapa = p_etapa;

  -- Verificar se todas as etapas obrigatórias estão completas
  SELECT NOT EXISTS (
    SELECT 1 FROM onboarding_steps
    WHERE
      user_id = p_user_id
      AND escritorio_id = p_escritorio_id
      AND completada = FALSE
      AND pulada = FALSE
      AND etapa IN ('perfil_completo', 'criacao_escritorio') -- Apenas obrigatórias
  ) INTO v_all_completed;

  -- Se todas completas, marcar profile
  IF v_all_completed THEN
    UPDATE profiles
    SET
      onboarding_completo = TRUE,
      onboarding_completado_em = NOW(),
      primeiro_acesso = FALSE
    WHERE id = p_user_id;

    UPDATE escritorios
    SET
      setup_completo = TRUE,
      setup_completado_em = NOW()
    WHERE id = p_escritorio_id;
  END IF;

  RETURN v_all_completed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. Função para pular etapa
-- ============================================================================

CREATE OR REPLACE FUNCTION skip_onboarding_step(
  p_user_id UUID,
  p_escritorio_id UUID,
  p_etapa TEXT
) RETURNS VOID AS $$
BEGIN
  -- Só permite pular etapas opcionais
  IF p_etapa NOT IN ('perfil_completo', 'criacao_escritorio') THEN
    UPDATE onboarding_steps
    SET
      pulada = TRUE,
      pulada_em = NOW(),
      updated_at = NOW()
    WHERE
      user_id = p_user_id
      AND escritorio_id = p_escritorio_id
      AND etapa = p_etapa;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. View para progresso do onboarding
-- ============================================================================

CREATE OR REPLACE VIEW onboarding_progress AS
SELECT
  os.user_id,
  os.escritorio_id,
  COUNT(*) as total_etapas,
  COUNT(*) FILTER (WHERE completada = TRUE) as etapas_completas,
  COUNT(*) FILTER (WHERE pulada = TRUE) as etapas_puladas,
  ROUND(
    (COUNT(*) FILTER (WHERE completada = TRUE OR pulada = TRUE)::DECIMAL / COUNT(*)) * 100
  ) as progresso_percentual,
  p.primeiro_acesso,
  p.onboarding_completo,
  e.setup_completo
FROM onboarding_steps os
JOIN profiles p ON os.user_id = p.id
JOIN escritorios e ON os.escritorio_id = e.id
GROUP BY os.user_id, os.escritorio_id, p.primeiro_acesso, p.onboarding_completo, e.setup_completo;

-- Grant
GRANT SELECT ON onboarding_progress TO authenticated;

-- ============================================================================
-- 9. Preencher dados para usuários existentes
-- ============================================================================

DO $$
DECLARE
  v_profile RECORD;
BEGIN
  FOR v_profile IN
    SELECT id, escritorio_id FROM profiles WHERE escritorio_id IS NOT NULL
  LOOP
    PERFORM initialize_onboarding(v_profile.id, v_profile.escritorio_id);

    -- Marcar como já completado para usuários existentes
    UPDATE profiles
    SET onboarding_completo = TRUE, primeiro_acesso = FALSE
    WHERE id = v_profile.id;
  END LOOP;
END $$;

-- ============================================================================
-- RESUMO
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'SISTEMA DE ONBOARDING CRIADO COM SUCESSO!';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Tabelas criadas: onboarding_steps';
  RAISE NOTICE 'Views criadas: onboarding_progress';
  RAISE NOTICE 'Funcoes criadas: initialize_onboarding, complete_onboarding_step, skip_onboarding_step';
  RAISE NOTICE 'Triggers criados: after_profile_insert_initialize_onboarding';
  RAISE NOTICE '============================================================';
END $$;

COMMIT;
