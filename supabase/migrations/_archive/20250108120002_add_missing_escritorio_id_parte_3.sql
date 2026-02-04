-- ============================================================================
-- MIGRATION: Adicionar escritorio_id nas tabelas faltantes - PARTE 3/3
-- Prioridade: CRÍTICA
-- Impacto: Segurança multi-tenancy
-- Tabelas: PUBLICAÇÕES, PEÇAS (7 tabelas)
-- ============================================================================

BEGIN;

-- ============================================================================
-- 6. PUBLICAÇÕES (4 tabelas)
-- ============================================================================

-- publicacoes_analises
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'publicacoes_analises' AND column_name = 'escritorio_id'
  ) THEN
    ALTER TABLE publicacoes_analises
    ADD COLUMN escritorio_id UUID;

    UPDATE publicacoes_analises pa
    SET escritorio_id = p.escritorio_id
    FROM publicacoes_publicacoes p
    WHERE pa.publicacao_id = p.id;

    ALTER TABLE publicacoes_analises
    ADD CONSTRAINT fk_publicacoes_analises_escritorio
    FOREIGN KEY (escritorio_id) REFERENCES escritorios(id) ON DELETE CASCADE;

    ALTER TABLE publicacoes_analises
    ALTER COLUMN escritorio_id SET NOT NULL;

    CREATE INDEX idx_publicacoes_analises_escritorio
    ON publicacoes_analises(escritorio_id);

    RAISE NOTICE 'publicacoes_analises: escritorio_id adicionado';
  ELSE
    RAISE NOTICE 'publicacoes_analises: escritorio_id já existe';
  END IF;
END $$;

-- publicacoes_historico
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'publicacoes_historico' AND column_name = 'escritorio_id'
  ) THEN
    ALTER TABLE publicacoes_historico
    ADD COLUMN escritorio_id UUID;

    -- Tentar preencher via publicacao_id se existir
    UPDATE publicacoes_historico ph
    SET escritorio_id = p.escritorio_id
    FROM publicacoes_publicacoes p
    WHERE ph.publicacao_id = p.id;

    -- Para registros órfãos, atribuir ao único escritório
    UPDATE publicacoes_historico
    SET escritorio_id = (SELECT id FROM escritorios LIMIT 1)
    WHERE escritorio_id IS NULL;

    ALTER TABLE publicacoes_historico
    ADD CONSTRAINT fk_publicacoes_historico_escritorio
    FOREIGN KEY (escritorio_id) REFERENCES escritorios(id) ON DELETE CASCADE;

    ALTER TABLE publicacoes_historico
    ALTER COLUMN escritorio_id SET NOT NULL;

    CREATE INDEX idx_publicacoes_historico_escritorio
    ON publicacoes_historico(escritorio_id);

    RAISE NOTICE 'publicacoes_historico: escritorio_id adicionado';
  ELSE
    RAISE NOTICE 'publicacoes_historico: escritorio_id já existe';
  END IF;
END $$;

-- publicacoes_notificacoes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'publicacoes_notificacoes' AND column_name = 'escritorio_id'
  ) THEN
    ALTER TABLE publicacoes_notificacoes
    ADD COLUMN escritorio_id UUID;

    UPDATE publicacoes_notificacoes pn
    SET escritorio_id = p.escritorio_id
    FROM publicacoes_publicacoes p
    WHERE pn.publicacao_id = p.id;

    -- Para órfãos
    UPDATE publicacoes_notificacoes
    SET escritorio_id = (SELECT id FROM escritorios LIMIT 1)
    WHERE escritorio_id IS NULL;

    ALTER TABLE publicacoes_notificacoes
    ADD CONSTRAINT fk_publicacoes_notificacoes_escritorio
    FOREIGN KEY (escritorio_id) REFERENCES escritorios(id) ON DELETE CASCADE;

    ALTER TABLE publicacoes_notificacoes
    ALTER COLUMN escritorio_id SET NOT NULL;

    CREATE INDEX idx_publicacoes_notificacoes_escritorio
    ON publicacoes_notificacoes(escritorio_id);

    RAISE NOTICE 'publicacoes_notificacoes: escritorio_id adicionado';
  ELSE
    RAISE NOTICE 'publicacoes_notificacoes: escritorio_id já existe';
  END IF;
END $$;

-- publicacoes_tratamentos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'publicacoes_tratamentos' AND column_name = 'escritorio_id'
  ) THEN
    ALTER TABLE publicacoes_tratamentos
    ADD COLUMN escritorio_id UUID;

    UPDATE publicacoes_tratamentos pt
    SET escritorio_id = p.escritorio_id
    FROM publicacoes_publicacoes p
    WHERE pt.publicacao_id = p.id;

    -- Para órfãos
    UPDATE publicacoes_tratamentos
    SET escritorio_id = (SELECT id FROM escritorios LIMIT 1)
    WHERE escritorio_id IS NULL;

    ALTER TABLE publicacoes_tratamentos
    ADD CONSTRAINT fk_publicacoes_tratamentos_escritorio
    FOREIGN KEY (escritorio_id) REFERENCES escritorios(id) ON DELETE CASCADE;

    ALTER TABLE publicacoes_tratamentos
    ALTER COLUMN escritorio_id SET NOT NULL;

    CREATE INDEX idx_publicacoes_tratamentos_escritorio
    ON publicacoes_tratamentos(escritorio_id);

    RAISE NOTICE 'publicacoes_tratamentos: escritorio_id adicionado';
  ELSE
    RAISE NOTICE 'publicacoes_tratamentos: escritorio_id já existe';
  END IF;
END $$;

-- ============================================================================
-- 7. PEÇAS (3 tabelas)
-- ============================================================================

-- pecas_relacoes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pecas_relacoes' AND column_name = 'escritorio_id'
  ) THEN
    ALTER TABLE pecas_relacoes
    ADD COLUMN escritorio_id UUID;

    UPDATE pecas_relacoes pr
    SET escritorio_id = p.escritorio_id
    FROM pecas_pecas p
    WHERE pr.peca_origem_id = p.id;

    -- Se ainda null, tentar via peca_destino_id
    UPDATE pecas_relacoes pr
    SET escritorio_id = p.escritorio_id
    FROM pecas_pecas p
    WHERE pr.peca_destino_id = p.id
    AND pr.escritorio_id IS NULL;

    ALTER TABLE pecas_relacoes
    ADD CONSTRAINT fk_pecas_relacoes_escritorio
    FOREIGN KEY (escritorio_id) REFERENCES escritorios(id) ON DELETE CASCADE;

    ALTER TABLE pecas_relacoes
    ALTER COLUMN escritorio_id SET NOT NULL;

    CREATE INDEX idx_pecas_relacoes_escritorio
    ON pecas_relacoes(escritorio_id);

    RAISE NOTICE 'pecas_relacoes: escritorio_id adicionado';
  ELSE
    RAISE NOTICE 'pecas_relacoes: escritorio_id já existe';
  END IF;
END $$;

-- pecas_templates_jurisprudencias
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pecas_templates_jurisprudencias' AND column_name = 'escritorio_id'
  ) THEN
    ALTER TABLE pecas_templates_jurisprudencias
    ADD COLUMN escritorio_id UUID;

    UPDATE pecas_templates_jurisprudencias ptj
    SET escritorio_id = pt.escritorio_id
    FROM pecas_templates pt
    WHERE ptj.template_id = pt.id;

    ALTER TABLE pecas_templates_jurisprudencias
    ADD CONSTRAINT fk_pecas_templates_jurisprudencias_escritorio
    FOREIGN KEY (escritorio_id) REFERENCES escritorios(id) ON DELETE CASCADE;

    ALTER TABLE pecas_templates_jurisprudencias
    ALTER COLUMN escritorio_id SET NOT NULL;

    CREATE INDEX idx_pecas_templates_jurisprudencias_escritorio
    ON pecas_templates_jurisprudencias(escritorio_id);

    RAISE NOTICE 'pecas_templates_jurisprudencias: escritorio_id adicionado';
  ELSE
    RAISE NOTICE 'pecas_templates_jurisprudencias: escritorio_id já existe';
  END IF;
END $$;

-- pecas_templates_teses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pecas_templates_teses' AND column_name = 'escritorio_id'
  ) THEN
    ALTER TABLE pecas_templates_teses
    ADD COLUMN escritorio_id UUID;

    UPDATE pecas_templates_teses ptt
    SET escritorio_id = pt.escritorio_id
    FROM pecas_templates pt
    WHERE ptt.template_id = pt.id;

    ALTER TABLE pecas_templates_teses
    ADD CONSTRAINT fk_pecas_templates_teses_escritorio
    FOREIGN KEY (escritorio_id) REFERENCES escritorios(id) ON DELETE CASCADE;

    ALTER TABLE pecas_templates_teses
    ALTER COLUMN escritorio_id SET NOT NULL;

    CREATE INDEX idx_pecas_templates_teses_escritorio
    ON pecas_templates_teses(escritorio_id);

    RAISE NOTICE 'pecas_templates_teses: escritorio_id adicionado';
  ELSE
    RAISE NOTICE 'pecas_templates_teses: escritorio_id já existe';
  END IF;
END $$;

-- ============================================================================
-- 8. RESUMO FINAL
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'MIGRAÇÃO CONCLUÍDA: escritorio_id adicionado em 30 tabelas';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Próximo passo: Atualizar RLS policies';
  RAISE NOTICE '============================================================';
END $$;

COMMIT;
