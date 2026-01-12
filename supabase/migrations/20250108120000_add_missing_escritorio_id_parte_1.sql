-- ============================================================================
-- MIGRATION: Adicionar escritorio_id nas tabelas faltantes - PARTE 1/3
-- Prioridade: CRÍTICA
-- Impacto: Segurança multi-tenancy
-- Tabelas: AGENDA, CRM, PROCESSOS (13 tabelas)
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. AGENDA (1 tabela)
-- ============================================================================

-- agenda_tarefas_checklist
DO $$
BEGIN
  -- Verificar se coluna já existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agenda_tarefas_checklist' AND column_name = 'escritorio_id'
  ) THEN
    -- Adicionar coluna
    ALTER TABLE agenda_tarefas_checklist
    ADD COLUMN escritorio_id UUID;

    -- Preencher com dados existentes via FK
    UPDATE agenda_tarefas_checklist atc
    SET escritorio_id = at.escritorio_id
    FROM agenda_tarefas at
    WHERE atc.tarefa_id = at.id;

    -- Adicionar FK
    ALTER TABLE agenda_tarefas_checklist
    ADD CONSTRAINT fk_agenda_tarefas_checklist_escritorio
    FOREIGN KEY (escritorio_id) REFERENCES escritorios(id) ON DELETE CASCADE;

    -- Tornar NOT NULL
    ALTER TABLE agenda_tarefas_checklist
    ALTER COLUMN escritorio_id SET NOT NULL;

    -- Criar índice
    CREATE INDEX idx_agenda_tarefas_checklist_escritorio
    ON agenda_tarefas_checklist(escritorio_id);

    RAISE NOTICE 'agenda_tarefas_checklist: escritorio_id adicionado';
  ELSE
    RAISE NOTICE 'agenda_tarefas_checklist: escritorio_id já existe';
  END IF;
END $$;

-- ============================================================================
-- 2. CRM (5 tabelas)
-- ============================================================================

-- crm_interacoes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_interacoes' AND column_name = 'escritorio_id'
  ) THEN
    ALTER TABLE crm_interacoes
    ADD COLUMN escritorio_id UUID;

    UPDATE crm_interacoes ci
    SET escritorio_id = p.escritorio_id
    FROM crm_pessoas p
    WHERE ci.pessoa_id = p.id;

    ALTER TABLE crm_interacoes
    ADD CONSTRAINT fk_crm_interacoes_escritorio
    FOREIGN KEY (escritorio_id) REFERENCES escritorios(id) ON DELETE CASCADE;

    ALTER TABLE crm_interacoes
    ALTER COLUMN escritorio_id SET NOT NULL;

    CREATE INDEX idx_crm_interacoes_escritorio
    ON crm_interacoes(escritorio_id);

    RAISE NOTICE 'crm_interacoes: escritorio_id adicionado';
  ELSE
    RAISE NOTICE 'crm_interacoes: escritorio_id já existe';
  END IF;
END $$;

-- crm_interacoes_anexos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_interacoes_anexos' AND column_name = 'escritorio_id'
  ) THEN
    ALTER TABLE crm_interacoes_anexos
    ADD COLUMN escritorio_id UUID;

    UPDATE crm_interacoes_anexos cia
    SET escritorio_id = ci.escritorio_id
    FROM crm_interacoes ci
    WHERE cia.interacao_id = ci.id;

    ALTER TABLE crm_interacoes_anexos
    ADD CONSTRAINT fk_crm_interacoes_anexos_escritorio
    FOREIGN KEY (escritorio_id) REFERENCES escritorios(id) ON DELETE CASCADE;

    ALTER TABLE crm_interacoes_anexos
    ALTER COLUMN escritorio_id SET NOT NULL;

    CREATE INDEX idx_crm_interacoes_anexos_escritorio
    ON crm_interacoes_anexos(escritorio_id);

    RAISE NOTICE 'crm_interacoes_anexos: escritorio_id adicionado';
  ELSE
    RAISE NOTICE 'crm_interacoes_anexos: escritorio_id já existe';
  END IF;
END $$;

-- crm_oportunidades_atividades
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_oportunidades_atividades' AND column_name = 'escritorio_id'
  ) THEN
    ALTER TABLE crm_oportunidades_atividades
    ADD COLUMN escritorio_id UUID;

    UPDATE crm_oportunidades_atividades coa
    SET escritorio_id = co.escritorio_id
    FROM crm_oportunidades co
    WHERE coa.oportunidade_id = co.id;

    ALTER TABLE crm_oportunidades_atividades
    ADD CONSTRAINT fk_crm_oportunidades_atividades_escritorio
    FOREIGN KEY (escritorio_id) REFERENCES escritorios(id) ON DELETE CASCADE;

    ALTER TABLE crm_oportunidades_atividades
    ALTER COLUMN escritorio_id SET NOT NULL;

    CREATE INDEX idx_crm_oportunidades_atividades_escritorio
    ON crm_oportunidades_atividades(escritorio_id);

    RAISE NOTICE 'crm_oportunidades_atividades: escritorio_id adicionado';
  ELSE
    RAISE NOTICE 'crm_oportunidades_atividades: escritorio_id já existe';
  END IF;
END $$;

-- crm_relacionamentos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_relacionamentos' AND column_name = 'escritorio_id'
  ) THEN
    ALTER TABLE crm_relacionamentos
    ADD COLUMN escritorio_id UUID;

    UPDATE crm_relacionamentos cr
    SET escritorio_id = p.escritorio_id
    FROM crm_pessoas p
    WHERE cr.pessoa_origem_id = p.id;

    ALTER TABLE crm_relacionamentos
    ADD CONSTRAINT fk_crm_relacionamentos_escritorio
    FOREIGN KEY (escritorio_id) REFERENCES escritorios(id) ON DELETE CASCADE;

    ALTER TABLE crm_relacionamentos
    ALTER COLUMN escritorio_id SET NOT NULL;

    CREATE INDEX idx_crm_relacionamentos_escritorio
    ON crm_relacionamentos(escritorio_id);

    RAISE NOTICE 'crm_relacionamentos: escritorio_id adicionado';
  ELSE
    RAISE NOTICE 'crm_relacionamentos: escritorio_id já existe';
  END IF;
END $$;

-- crm_clientes_contatos (deprecated, mas vamos adicionar por segurança)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crm_clientes_contatos') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'crm_clientes_contatos' AND column_name = 'escritorio_id'
    ) THEN
      ALTER TABLE crm_clientes_contatos
      ADD COLUMN escritorio_id UUID;

      -- Tentar preencher via cliente_id se existir
      UPDATE crm_clientes_contatos ccc
      SET escritorio_id = (SELECT escritorio_id FROM escritorios LIMIT 1)
      WHERE escritorio_id IS NULL;

      -- Se houver dados, adicionar FK
      IF EXISTS (SELECT 1 FROM crm_clientes_contatos WHERE escritorio_id IS NOT NULL) THEN
        ALTER TABLE crm_clientes_contatos
        ADD CONSTRAINT fk_crm_clientes_contatos_escritorio
        FOREIGN KEY (escritorio_id) REFERENCES escritorios(id) ON DELETE CASCADE;

        CREATE INDEX idx_crm_clientes_contatos_escritorio
        ON crm_clientes_contatos(escritorio_id);
      END IF;

      RAISE NOTICE 'crm_clientes_contatos: escritorio_id adicionado';
    ELSE
      RAISE NOTICE 'crm_clientes_contatos: escritorio_id já existe';
    END IF;
  END IF;
END $$;

-- ============================================================================
-- 3. PROCESSOS (2 tabelas)
-- ============================================================================

-- processos_partes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'processos_partes' AND column_name = 'escritorio_id'
  ) THEN
    ALTER TABLE processos_partes
    ADD COLUMN escritorio_id UUID;

    UPDATE processos_partes pp
    SET escritorio_id = p.escritorio_id
    FROM processos_processos p
    WHERE pp.processo_id = p.id;

    ALTER TABLE processos_partes
    ADD CONSTRAINT fk_processos_partes_escritorio
    FOREIGN KEY (escritorio_id) REFERENCES escritorios(id) ON DELETE CASCADE;

    ALTER TABLE processos_partes
    ALTER COLUMN escritorio_id SET NOT NULL;

    CREATE INDEX idx_processos_partes_escritorio
    ON processos_partes(escritorio_id);

    RAISE NOTICE 'processos_partes: escritorio_id adicionado';
  ELSE
    RAISE NOTICE 'processos_partes: escritorio_id já existe';
  END IF;
END $$;

-- processos_historico
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'processos_historico' AND column_name = 'escritorio_id'
  ) THEN
    ALTER TABLE processos_historico
    ADD COLUMN escritorio_id UUID;

    UPDATE processos_historico ph
    SET escritorio_id = p.escritorio_id
    FROM processos_processos p
    WHERE ph.processo_id = p.id;

    ALTER TABLE processos_historico
    ADD CONSTRAINT fk_processos_historico_escritorio
    FOREIGN KEY (escritorio_id) REFERENCES escritorios(id) ON DELETE CASCADE;

    ALTER TABLE processos_historico
    ALTER COLUMN escritorio_id SET NOT NULL;

    CREATE INDEX idx_processos_historico_escritorio
    ON processos_historico(escritorio_id);

    RAISE NOTICE 'processos_historico: escritorio_id adicionado';
  ELSE
    RAISE NOTICE 'processos_historico: escritorio_id já existe';
  END IF;
END $$;

COMMIT;
