-- =============================================================================
-- Validação de responsáveis: bloqueia atribuir tarefa/evento/audiência/etc
-- a um usuário que NÃO é membro ativo de algum escritório do mesmo grupo.
--
-- Contexto: descoberta tarefa com responsavel_id apontando para perfil de
-- outro escritório (perfil pessoal gmail num escritório do grupo Polycarpo),
-- causando "limbo" — tarefa só visível na pasta do processo, ausente da
-- agenda do responsável real.
--
-- Vetor identificado: criação via Claude+MCP Supabase (chave service_role
-- bypassa RLS). Triggers BEFORE rodam para todos, inclusive service_role —
-- por isso são a defesa correta.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- BLOCO 1: Correção do dado órfão único (DEVE vir antes dos triggers).
-- Reatribui tarefa "SNH — Falar com a Dádiva" para Victor Polycarpo.
-- -----------------------------------------------------------------------------
UPDATE agenda_tarefas
SET responsavel_id   = 'a7aebc01-3bc4-4f1d-a0c6-cddd0ac0941a',
    responsaveis_ids = ARRAY['a7aebc01-3bc4-4f1d-a0c6-cddd0ac0941a']::uuid[],
    updated_at       = now()
WHERE id = '85586f69-e111-4ca9-a8e4-7ff8a7332b86';


-- -----------------------------------------------------------------------------
-- BLOCO 2: Função helper reutilizável.
-- Verdadeiro se p_user_id é membro ativo de algum escritório do mesmo grupo
-- do escritorio_id alvo.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_membro_grupo_escritorio(
  p_escritorio_id uuid,
  p_user_id       uuid
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM escritorios e_alvo
    JOIN escritorios e_grupo ON e_grupo.grupo_id = e_alvo.grupo_id
    JOIN escritorios_usuarios eu ON eu.escritorio_id = e_grupo.id
    WHERE e_alvo.id = p_escritorio_id
      AND eu.user_id = p_user_id
      AND eu.ativo = true
  );
$$;

COMMENT ON FUNCTION public.is_membro_grupo_escritorio(uuid, uuid) IS
  'Verifica se um user_id é membro ativo de algum escritório do mesmo grupo do escritorio_id alvo. Usado por triggers de validação de atribuição.';


-- -----------------------------------------------------------------------------
-- BLOCO 3a: Trigger function para tabelas de agenda.
-- Valida responsavel_id, responsaveis_ids[] (cada elemento) e criado_por.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_validar_agenda_responsaveis()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id  uuid;
  v_email    text;
  v_esc_nome text;
BEGIN
  -- 1) responsavel_id (singular)
  IF NEW.responsavel_id IS NOT NULL
     AND NOT is_membro_grupo_escritorio(NEW.escritorio_id, NEW.responsavel_id) THEN
    SELECT email INTO v_email FROM profiles WHERE id = NEW.responsavel_id;
    SELECT nome  INTO v_esc_nome FROM escritorios WHERE id = NEW.escritorio_id;
    RAISE EXCEPTION
      'Responsável (%) não é membro ativo do escritório "%" nem de outros do mesmo grupo. Atribua a um membro válido.',
      COALESCE(v_email, NEW.responsavel_id::text),
      COALESCE(v_esc_nome, NEW.escritorio_id::text)
      USING ERRCODE = 'check_violation';
  END IF;

  -- 2) responsaveis_ids[] (array — cada elemento)
  IF NEW.responsaveis_ids IS NOT NULL AND array_length(NEW.responsaveis_ids, 1) > 0 THEN
    FOREACH v_user_id IN ARRAY NEW.responsaveis_ids LOOP
      IF NOT is_membro_grupo_escritorio(NEW.escritorio_id, v_user_id) THEN
        SELECT email INTO v_email FROM profiles WHERE id = v_user_id;
        SELECT nome  INTO v_esc_nome FROM escritorios WHERE id = NEW.escritorio_id;
        RAISE EXCEPTION
          'Responsável no array (%) não é membro ativo do escritório "%" nem de outros do mesmo grupo.',
          COALESCE(v_email, v_user_id::text),
          COALESCE(v_esc_nome, NEW.escritorio_id::text)
          USING ERRCODE = 'check_violation';
      END IF;
    END LOOP;
  END IF;

  -- 3) criado_por
  IF NEW.criado_por IS NOT NULL
     AND NOT is_membro_grupo_escritorio(NEW.escritorio_id, NEW.criado_por) THEN
    SELECT email INTO v_email FROM profiles WHERE id = NEW.criado_por;
    SELECT nome  INTO v_esc_nome FROM escritorios WHERE id = NEW.escritorio_id;
    RAISE EXCEPTION
      'Criador (%) não é membro ativo do escritório "%" nem de outros do mesmo grupo.',
      COALESCE(v_email, NEW.criado_por::text),
      COALESCE(v_esc_nome, NEW.escritorio_id::text)
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.tg_validar_agenda_responsaveis() IS
  'Trigger BEFORE INSERT/UPDATE para agenda_tarefas/eventos/audiencias. Bloqueia atribuição de responsável fora do grupo do escritório.';


-- -----------------------------------------------------------------------------
-- BLOCO 3b: Trigger function genérica para tabelas com 1 coluna user-like.
-- Recebe nome da coluna via TG_ARGV[0].
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_validar_responsavel_simples()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_col_name text := TG_ARGV[0];
  v_user_id  uuid;
  v_email    text;
  v_esc_nome text;
BEGIN
  -- Extrai dinamicamente NEW.<v_col_name>
  EXECUTE format('SELECT ($1).%I', v_col_name)
    INTO v_user_id
    USING NEW;

  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT is_membro_grupo_escritorio(NEW.escritorio_id, v_user_id) THEN
    SELECT email INTO v_email FROM profiles WHERE id = v_user_id;
    SELECT nome  INTO v_esc_nome FROM escritorios WHERE id = NEW.escritorio_id;
    RAISE EXCEPTION
      'Coluna %: usuário (%) não é membro ativo do escritório "%" nem de outros do mesmo grupo.',
      v_col_name,
      COALESCE(v_email, v_user_id::text),
      COALESCE(v_esc_nome, NEW.escritorio_id::text)
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.tg_validar_responsavel_simples() IS
  'Trigger genérica BEFORE INSERT/UPDATE. Recebe via TG_ARGV[0] o nome da coluna user-like a validar contra o grupo do escritorio_id.';


-- -----------------------------------------------------------------------------
-- BLOCO 4: Aplicação dos triggers nas 11 tabelas operacionais.
-- -----------------------------------------------------------------------------

-- Padrão 1: tabelas de agenda (3)
DROP TRIGGER IF EXISTS trg_validar_agenda_responsaveis ON agenda_tarefas;
CREATE TRIGGER trg_validar_agenda_responsaveis
BEFORE INSERT OR UPDATE OF responsavel_id, responsaveis_ids, criado_por, escritorio_id
ON agenda_tarefas
FOR EACH ROW
EXECUTE FUNCTION tg_validar_agenda_responsaveis();

DROP TRIGGER IF EXISTS trg_validar_agenda_responsaveis ON agenda_eventos;
CREATE TRIGGER trg_validar_agenda_responsaveis
BEFORE INSERT OR UPDATE OF responsavel_id, responsaveis_ids, criado_por, escritorio_id
ON agenda_eventos
FOR EACH ROW
EXECUTE FUNCTION tg_validar_agenda_responsaveis();

DROP TRIGGER IF EXISTS trg_validar_agenda_responsaveis ON agenda_audiencias;
CREATE TRIGGER trg_validar_agenda_responsaveis
BEFORE INSERT OR UPDATE OF responsavel_id, responsaveis_ids, criado_por, escritorio_id
ON agenda_audiencias
FOR EACH ROW
EXECUTE FUNCTION tg_validar_agenda_responsaveis();

-- Padrão 2: tabelas com coluna user-like única (8)

-- processos_processos.responsavel_id
DROP TRIGGER IF EXISTS trg_validar_responsavel_membro_grupo ON processos_processos;
CREATE TRIGGER trg_validar_responsavel_membro_grupo
BEFORE INSERT OR UPDATE OF responsavel_id, escritorio_id
ON processos_processos
FOR EACH ROW
EXECUTE FUNCTION tg_validar_responsavel_simples('responsavel_id');

-- consultivo_consultas.responsavel_id
DROP TRIGGER IF EXISTS trg_validar_responsavel_membro_grupo ON consultivo_consultas;
CREATE TRIGGER trg_validar_responsavel_membro_grupo
BEFORE INSERT OR UPDATE OF responsavel_id, escritorio_id
ON consultivo_consultas
FOR EACH ROW
EXECUTE FUNCTION tg_validar_responsavel_simples('responsavel_id');

-- crm_oportunidades.responsavel_id
DROP TRIGGER IF EXISTS trg_validar_responsavel_membro_grupo ON crm_oportunidades;
CREATE TRIGGER trg_validar_responsavel_membro_grupo
BEFORE INSERT OR UPDATE OF responsavel_id, escritorio_id
ON crm_oportunidades
FOR EACH ROW
EXECUTE FUNCTION tg_validar_responsavel_simples('responsavel_id');

-- financeiro_despesas.advogado_id
DROP TRIGGER IF EXISTS trg_validar_responsavel_membro_grupo ON financeiro_despesas;
CREATE TRIGGER trg_validar_responsavel_membro_grupo
BEFORE INSERT OR UPDATE OF advogado_id, escritorio_id
ON financeiro_despesas
FOR EACH ROW
EXECUTE FUNCTION tg_validar_responsavel_simples('advogado_id');

-- financeiro_receitas.responsavel_id
DROP TRIGGER IF EXISTS trg_validar_responsavel_membro_grupo ON financeiro_receitas;
CREATE TRIGGER trg_validar_responsavel_membro_grupo
BEFORE INSERT OR UPDATE OF responsavel_id, escritorio_id
ON financeiro_receitas
FOR EACH ROW
EXECUTE FUNCTION tg_validar_responsavel_simples('responsavel_id');

-- financeiro_timesheet.user_id
DROP TRIGGER IF EXISTS trg_validar_responsavel_membro_grupo ON financeiro_timesheet;
CREATE TRIGGER trg_validar_responsavel_membro_grupo
BEFORE INSERT OR UPDATE OF user_id, escritorio_id
ON financeiro_timesheet
FOR EACH ROW
EXECUTE FUNCTION tg_validar_responsavel_simples('user_id');

-- financeiro_regras_recorrencia.responsavel_id
DROP TRIGGER IF EXISTS trg_validar_responsavel_membro_grupo ON financeiro_regras_recorrencia;
CREATE TRIGGER trg_validar_responsavel_membro_grupo
BEFORE INSERT OR UPDATE OF responsavel_id, escritorio_id
ON financeiro_regras_recorrencia
FOR EACH ROW
EXECUTE FUNCTION tg_validar_responsavel_simples('responsavel_id');

-- portfolio_projetos.responsavel_id
DROP TRIGGER IF EXISTS trg_validar_responsavel_membro_grupo ON portfolio_projetos;
CREATE TRIGGER trg_validar_responsavel_membro_grupo
BEFORE INSERT OR UPDATE OF responsavel_id, escritorio_id
ON portfolio_projetos
FOR EACH ROW
EXECUTE FUNCTION tg_validar_responsavel_simples('responsavel_id');
