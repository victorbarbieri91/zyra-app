-- ============================================================================
-- MIGRATION: Adicionar escritorio_id nas tabelas faltantes - PARTE 2/3
-- Prioridade: CRÍTICA
-- Impacto: Segurança multi-tenancy
-- Tabelas: CONSULTIVO, FINANCEIRO (15 tabelas)
-- ============================================================================

BEGIN;

-- ============================================================================
-- 4. CONSULTIVO (6 tabelas)
-- ============================================================================

-- consultivo_analise
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consultivo_analise' AND column_name = 'escritorio_id'
  ) THEN
    ALTER TABLE consultivo_analise
    ADD COLUMN escritorio_id UUID;

    UPDATE consultivo_analise ca
    SET escritorio_id = c.escritorio_id
    FROM consultivo_consultas c
    WHERE ca.consulta_id = c.id;

    ALTER TABLE consultivo_analise
    ADD CONSTRAINT fk_consultivo_analise_escritorio
    FOREIGN KEY (escritorio_id) REFERENCES escritorios(id) ON DELETE CASCADE;

    ALTER TABLE consultivo_analise
    ALTER COLUMN escritorio_id SET NOT NULL;

    CREATE INDEX idx_consultivo_analise_escritorio
    ON consultivo_analise(escritorio_id);

    RAISE NOTICE 'consultivo_analise: escritorio_id adicionado';
  ELSE
    RAISE NOTICE 'consultivo_analise: escritorio_id já existe';
  END IF;
END $$;

-- consultivo_documentos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consultivo_documentos' AND column_name = 'escritorio_id'
  ) THEN
    ALTER TABLE consultivo_documentos
    ADD COLUMN escritorio_id UUID;

    UPDATE consultivo_documentos cd
    SET escritorio_id = c.escritorio_id
    FROM consultivo_consultas c
    WHERE cd.consulta_id = c.id;

    ALTER TABLE consultivo_documentos
    ADD CONSTRAINT fk_consultivo_documentos_escritorio
    FOREIGN KEY (escritorio_id) REFERENCES escritorios(id) ON DELETE CASCADE;

    ALTER TABLE consultivo_documentos
    ALTER COLUMN escritorio_id SET NOT NULL;

    CREATE INDEX idx_consultivo_documentos_escritorio
    ON consultivo_documentos(escritorio_id);

    RAISE NOTICE 'consultivo_documentos: escritorio_id adicionado';
  ELSE
    RAISE NOTICE 'consultivo_documentos: escritorio_id já existe';
  END IF;
END $$;

-- consultivo_equipe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consultivo_equipe' AND column_name = 'escritorio_id'
  ) THEN
    ALTER TABLE consultivo_equipe
    ADD COLUMN escritorio_id UUID;

    UPDATE consultivo_equipe ce
    SET escritorio_id = c.escritorio_id
    FROM consultivo_consultas c
    WHERE ce.consulta_id = c.id;

    ALTER TABLE consultivo_equipe
    ADD CONSTRAINT fk_consultivo_equipe_escritorio
    FOREIGN KEY (escritorio_id) REFERENCES escritorios(id) ON DELETE CASCADE;

    ALTER TABLE consultivo_equipe
    ALTER COLUMN escritorio_id SET NOT NULL;

    CREATE INDEX idx_consultivo_equipe_escritorio
    ON consultivo_equipe(escritorio_id);

    RAISE NOTICE 'consultivo_equipe: escritorio_id adicionado';
  ELSE
    RAISE NOTICE 'consultivo_equipe: escritorio_id já existe';
  END IF;
END $$;

-- consultivo_referencias
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consultivo_referencias' AND column_name = 'escritorio_id'
  ) THEN
    ALTER TABLE consultivo_referencias
    ADD COLUMN escritorio_id UUID;

    UPDATE consultivo_referencias cr
    SET escritorio_id = c.escritorio_id
    FROM consultivo_consultas c
    WHERE cr.consulta_id = c.id;

    ALTER TABLE consultivo_referencias
    ADD CONSTRAINT fk_consultivo_referencias_escritorio
    FOREIGN KEY (escritorio_id) REFERENCES escritorios(id) ON DELETE CASCADE;

    ALTER TABLE consultivo_referencias
    ALTER COLUMN escritorio_id SET NOT NULL;

    CREATE INDEX idx_consultivo_referencias_escritorio
    ON consultivo_referencias(escritorio_id);

    RAISE NOTICE 'consultivo_referencias: escritorio_id adicionado';
  ELSE
    RAISE NOTICE 'consultivo_referencias: escritorio_id já existe';
  END IF;
END $$;

-- consultivo_timeline
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consultivo_timeline' AND column_name = 'escritorio_id'
  ) THEN
    ALTER TABLE consultivo_timeline
    ADD COLUMN escritorio_id UUID;

    UPDATE consultivo_timeline ct
    SET escritorio_id = c.escritorio_id
    FROM consultivo_consultas c
    WHERE ct.consulta_id = c.id;

    ALTER TABLE consultivo_timeline
    ADD CONSTRAINT fk_consultivo_timeline_escritorio
    FOREIGN KEY (escritorio_id) REFERENCES escritorios(id) ON DELETE CASCADE;

    ALTER TABLE consultivo_timeline
    ALTER COLUMN escritorio_id SET NOT NULL;

    CREATE INDEX idx_consultivo_timeline_escritorio
    ON consultivo_timeline(escritorio_id);

    RAISE NOTICE 'consultivo_timeline: escritorio_id adicionado';
  ELSE
    RAISE NOTICE 'consultivo_timeline: escritorio_id já existe';
  END IF;
END $$;

-- consultivo_timesheet
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consultivo_timesheet' AND column_name = 'escritorio_id'
  ) THEN
    ALTER TABLE consultivo_timesheet
    ADD COLUMN escritorio_id UUID;

    -- Preencher via consulta_id se existir, senão via financeiro_timesheet
    UPDATE consultivo_timesheet ct
    SET escritorio_id = c.escritorio_id
    FROM consultivo_consultas c
    WHERE ct.consulta_id = c.id;

    -- Se ainda houver registros sem escritorio_id, tentar via honorario
    UPDATE consultivo_timesheet ct
    SET escritorio_id = fh.escritorio_id
    FROM financeiro_honorarios fh
    WHERE ct.honorario_id = fh.id
    AND ct.escritorio_id IS NULL;

    -- Para qualquer órfão restante, atribuir ao único escritório existente
    UPDATE consultivo_timesheet
    SET escritorio_id = (SELECT id FROM escritorios LIMIT 1)
    WHERE escritorio_id IS NULL;

    ALTER TABLE consultivo_timesheet
    ADD CONSTRAINT fk_consultivo_timesheet_escritorio
    FOREIGN KEY (escritorio_id) REFERENCES escritorios(id) ON DELETE CASCADE;

    ALTER TABLE consultivo_timesheet
    ALTER COLUMN escritorio_id SET NOT NULL;

    CREATE INDEX idx_consultivo_timesheet_escritorio
    ON consultivo_timesheet(escritorio_id);

    RAISE NOTICE 'consultivo_timesheet: escritorio_id adicionado';
  ELSE
    RAISE NOTICE 'consultivo_timesheet: escritorio_id já existe';
  END IF;
END $$;

-- ============================================================================
-- 5. FINANCEIRO - PARTE 1 (9 tabelas)
-- ============================================================================

-- financeiro_honorarios_parcelas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'financeiro_honorarios_parcelas' AND column_name = 'escritorio_id'
  ) THEN
    ALTER TABLE financeiro_honorarios_parcelas
    ADD COLUMN escritorio_id UUID;

    UPDATE financeiro_honorarios_parcelas fhp
    SET escritorio_id = fh.escritorio_id
    FROM financeiro_honorarios fh
    WHERE fhp.honorario_id = fh.id;

    ALTER TABLE financeiro_honorarios_parcelas
    ADD CONSTRAINT fk_financeiro_honorarios_parcelas_escritorio
    FOREIGN KEY (escritorio_id) REFERENCES escritorios(id) ON DELETE CASCADE;

    ALTER TABLE financeiro_honorarios_parcelas
    ALTER COLUMN escritorio_id SET NOT NULL;

    CREATE INDEX idx_financeiro_honorarios_parcelas_escritorio
    ON financeiro_honorarios_parcelas(escritorio_id);

    RAISE NOTICE 'financeiro_honorarios_parcelas: escritorio_id adicionado';
  ELSE
    RAISE NOTICE 'financeiro_honorarios_parcelas: escritorio_id já existe';
  END IF;
END $$;

-- financeiro_honorarios_timeline
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'financeiro_honorarios_timeline' AND column_name = 'escritorio_id'
  ) THEN
    ALTER TABLE financeiro_honorarios_timeline
    ADD COLUMN escritorio_id UUID;

    UPDATE financeiro_honorarios_timeline fht
    SET escritorio_id = fh.escritorio_id
    FROM financeiro_honorarios fh
    WHERE fht.honorario_id = fh.id;

    ALTER TABLE financeiro_honorarios_timeline
    ADD CONSTRAINT fk_financeiro_honorarios_timeline_escritorio
    FOREIGN KEY (escritorio_id) REFERENCES escritorios(id) ON DELETE CASCADE;

    ALTER TABLE financeiro_honorarios_timeline
    ALTER COLUMN escritorio_id SET NOT NULL;

    CREATE INDEX idx_financeiro_honorarios_timeline_escritorio
    ON financeiro_honorarios_timeline(escritorio_id);

    RAISE NOTICE 'financeiro_honorarios_timeline: escritorio_id adicionado';
  ELSE
    RAISE NOTICE 'financeiro_honorarios_timeline: escritorio_id já existe';
  END IF;
END $$;

-- financeiro_contas_lancamentos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'financeiro_contas_lancamentos' AND column_name = 'escritorio_id'
  ) THEN
    ALTER TABLE financeiro_contas_lancamentos
    ADD COLUMN escritorio_id UUID;

    UPDATE financeiro_contas_lancamentos fcl
    SET escritorio_id = fcb.escritorio_id
    FROM financeiro_contas_bancarias fcb
    WHERE fcl.conta_id = fcb.id;

    ALTER TABLE financeiro_contas_lancamentos
    ADD CONSTRAINT fk_financeiro_contas_lancamentos_escritorio
    FOREIGN KEY (escritorio_id) REFERENCES escritorios(id) ON DELETE CASCADE;

    ALTER TABLE financeiro_contas_lancamentos
    ALTER COLUMN escritorio_id SET NOT NULL;

    CREATE INDEX idx_financeiro_contas_lancamentos_escritorio
    ON financeiro_contas_lancamentos(escritorio_id);

    RAISE NOTICE 'financeiro_contas_lancamentos: escritorio_id adicionado';
  ELSE
    RAISE NOTICE 'financeiro_contas_lancamentos: escritorio_id já existe';
  END IF;
END $$;

-- financeiro_contas_conciliacoes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'financeiro_contas_conciliacoes' AND column_name = 'escritorio_id'
  ) THEN
    ALTER TABLE financeiro_contas_conciliacoes
    ADD COLUMN escritorio_id UUID;

    UPDATE financeiro_contas_conciliacoes fcc
    SET escritorio_id = fcb.escritorio_id
    FROM financeiro_contas_bancarias fcb
    WHERE fcc.conta_id = fcb.id;

    ALTER TABLE financeiro_contas_conciliacoes
    ADD CONSTRAINT fk_financeiro_contas_conciliacoes_escritorio
    FOREIGN KEY (escritorio_id) REFERENCES escritorios(id) ON DELETE CASCADE;

    ALTER TABLE financeiro_contas_conciliacoes
    ALTER COLUMN escritorio_id SET NOT NULL;

    CREATE INDEX idx_financeiro_contas_conciliacoes_escritorio
    ON financeiro_contas_conciliacoes(escritorio_id);

    RAISE NOTICE 'financeiro_contas_conciliacoes: escritorio_id adicionado';
  ELSE
    RAISE NOTICE 'financeiro_contas_conciliacoes: escritorio_id já existe';
  END IF;
END $$;

-- financeiro_contas_importacoes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'financeiro_contas_importacoes' AND column_name = 'escritorio_id'
  ) THEN
    ALTER TABLE financeiro_contas_importacoes
    ADD COLUMN escritorio_id UUID;

    UPDATE financeiro_contas_importacoes fci
    SET escritorio_id = fcb.escritorio_id
    FROM financeiro_contas_bancarias fcb
    WHERE fci.conta_id = fcb.id;

    ALTER TABLE financeiro_contas_importacoes
    ADD CONSTRAINT fk_financeiro_contas_importacoes_escritorio
    FOREIGN KEY (escritorio_id) REFERENCES escritorios(id) ON DELETE CASCADE;

    ALTER TABLE financeiro_contas_importacoes
    ALTER COLUMN escritorio_id SET NOT NULL;

    CREATE INDEX idx_financeiro_contas_importacoes_escritorio
    ON financeiro_contas_importacoes(escritorio_id);

    RAISE NOTICE 'financeiro_contas_importacoes: escritorio_id adicionado';
  ELSE
    RAISE NOTICE 'financeiro_contas_importacoes: escritorio_id já existe';
  END IF;
END $$;

-- financeiro_faturamento_itens
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'financeiro_faturamento_itens' AND column_name = 'escritorio_id'
  ) THEN
    ALTER TABLE financeiro_faturamento_itens
    ADD COLUMN escritorio_id UUID;

    UPDATE financeiro_faturamento_itens ffi
    SET escritorio_id = fff.escritorio_id
    FROM financeiro_faturamento_faturas fff
    WHERE ffi.fatura_id = fff.id;

    ALTER TABLE financeiro_faturamento_itens
    ADD CONSTRAINT fk_financeiro_faturamento_itens_escritorio
    FOREIGN KEY (escritorio_id) REFERENCES escritorios(id) ON DELETE CASCADE;

    ALTER TABLE financeiro_faturamento_itens
    ALTER COLUMN escritorio_id SET NOT NULL;

    CREATE INDEX idx_financeiro_faturamento_itens_escritorio
    ON financeiro_faturamento_itens(escritorio_id);

    RAISE NOTICE 'financeiro_faturamento_itens: escritorio_id adicionado';
  ELSE
    RAISE NOTICE 'financeiro_faturamento_itens: escritorio_id já existe';
  END IF;
END $$;

-- financeiro_faturamento_cobrancas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'financeiro_faturamento_cobrancas' AND column_name = 'escritorio_id'
  ) THEN
    ALTER TABLE financeiro_faturamento_cobrancas
    ADD COLUMN escritorio_id UUID;

    UPDATE financeiro_faturamento_cobrancas ffc
    SET escritorio_id = fff.escritorio_id
    FROM financeiro_faturamento_faturas fff
    WHERE ffc.fatura_id = fff.id;

    ALTER TABLE financeiro_faturamento_cobrancas
    ADD CONSTRAINT fk_financeiro_faturamento_cobrancas_escritorio
    FOREIGN KEY (escritorio_id) REFERENCES escritorios(id) ON DELETE CASCADE;

    ALTER TABLE financeiro_faturamento_cobrancas
    ALTER COLUMN escritorio_id SET NOT NULL;

    CREATE INDEX idx_financeiro_faturamento_cobrancas_escritorio
    ON financeiro_faturamento_cobrancas(escritorio_id);

    RAISE NOTICE 'financeiro_faturamento_cobrancas: escritorio_id adicionado';
  ELSE
    RAISE NOTICE 'financeiro_faturamento_cobrancas: escritorio_id já existe';
  END IF;
END $$;

-- financeiro_contratos_honorarios_config
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'financeiro_contratos_honorarios_config' AND column_name = 'escritorio_id'
  ) THEN
    ALTER TABLE financeiro_contratos_honorarios_config
    ADD COLUMN escritorio_id UUID;

    UPDATE financeiro_contratos_honorarios_config fchc
    SET escritorio_id = fch.escritorio_id
    FROM financeiro_contratos_honorarios fch
    WHERE fchc.contrato_id = fch.id;

    ALTER TABLE financeiro_contratos_honorarios_config
    ADD CONSTRAINT fk_financeiro_contratos_honorarios_config_escritorio
    FOREIGN KEY (escritorio_id) REFERENCES escritorios(id) ON DELETE CASCADE;

    ALTER TABLE financeiro_contratos_honorarios_config
    ALTER COLUMN escritorio_id SET NOT NULL;

    CREATE INDEX idx_financeiro_contratos_honorarios_config_escritorio
    ON financeiro_contratos_honorarios_config(escritorio_id);

    RAISE NOTICE 'financeiro_contratos_honorarios_config: escritorio_id adicionado';
  ELSE
    RAISE NOTICE 'financeiro_contratos_honorarios_config: escritorio_id já existe';
  END IF;
END $$;

-- financeiro_dashboard_notificacoes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'financeiro_dashboard_notificacoes' AND column_name = 'escritorio_id'
  ) THEN
    ALTER TABLE financeiro_dashboard_notificacoes
    ADD COLUMN escritorio_id UUID;

    -- Atribuir ao único escritório existente (não tem FK clara)
    UPDATE financeiro_dashboard_notificacoes
    SET escritorio_id = (SELECT id FROM escritorios LIMIT 1)
    WHERE escritorio_id IS NULL;

    ALTER TABLE financeiro_dashboard_notificacoes
    ADD CONSTRAINT fk_financeiro_dashboard_notificacoes_escritorio
    FOREIGN KEY (escritorio_id) REFERENCES escritorios(id) ON DELETE CASCADE;

    ALTER TABLE financeiro_dashboard_notificacoes
    ALTER COLUMN escritorio_id SET NOT NULL;

    CREATE INDEX idx_financeiro_dashboard_notificacoes_escritorio
    ON financeiro_dashboard_notificacoes(escritorio_id);

    RAISE NOTICE 'financeiro_dashboard_notificacoes: escritorio_id adicionado';
  ELSE
    RAISE NOTICE 'financeiro_dashboard_notificacoes: escritorio_id já existe';
  END IF;
END $$;

COMMIT;
