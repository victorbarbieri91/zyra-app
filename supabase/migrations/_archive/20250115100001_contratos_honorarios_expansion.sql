-- Migration: Expansão do Módulo de Contratos de Honorários
-- Adiciona suporte para: cobrança por cargo, por pasta, por ato processual
-- NOTA: Tabelas usam prefixo financeiro_ (ex: financeiro_contratos_honorarios)

-- =====================================================
-- 1. Adicionar valor_hora_padrao em escritorios_cargos
-- =====================================================

ALTER TABLE escritorios_cargos
ADD COLUMN IF NOT EXISTS valor_hora_padrao NUMERIC(15,2);

COMMENT ON COLUMN escritorios_cargos.valor_hora_padrao IS
  'Valor hora padrão para cobrança por timesheet. Pode ser sobrescrito no contrato por negociação.';

-- =====================================================
-- 2. Tabela de tipos de atos processuais por área jurídica
-- =====================================================

CREATE TABLE IF NOT EXISTS financeiro_atos_processuais_tipos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id UUID NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,
  area_juridica TEXT NOT NULL,
  codigo TEXT NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  percentual_padrao NUMERIC(5,2), -- % sobre valor da causa
  valor_fixo_padrao NUMERIC(15,2), -- Alternativa ao %
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT uq_atos_codigo_area UNIQUE(escritorio_id, area_juridica, codigo),
  CONSTRAINT chk_atos_valor CHECK (percentual_padrao IS NOT NULL OR valor_fixo_padrao IS NOT NULL OR (percentual_padrao IS NULL AND valor_fixo_padrao IS NULL))
);

CREATE INDEX IF NOT EXISTS idx_atos_escritorio ON financeiro_atos_processuais_tipos(escritorio_id);
CREATE INDEX IF NOT EXISTS idx_atos_area ON financeiro_atos_processuais_tipos(area_juridica);

COMMENT ON TABLE financeiro_atos_processuais_tipos IS
  'Tipos de atos processuais configuráveis por área jurídica para cobrança por ato';

-- =====================================================
-- 3. Expandir formas de cobrança em financeiro_contratos_honorarios
-- =====================================================

-- Adicionar coluna forma_cobranca se não existir
ALTER TABLE financeiro_contratos_honorarios
ADD COLUMN IF NOT EXISTS forma_cobranca TEXT DEFAULT 'fixo';

-- Adicionar constraint para forma_cobranca
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'financeiro_contratos_honorarios_forma_cobranca_check'
  ) THEN
    ALTER TABLE financeiro_contratos_honorarios
    ADD CONSTRAINT financeiro_contratos_honorarios_forma_cobranca_check
    CHECK (forma_cobranca IN (
      'fixo', 'por_hora', 'por_etapa', 'misto',
      'por_pasta', 'por_ato', 'por_cargo'
    ));
  END IF;
END $$;

COMMENT ON COLUMN financeiro_contratos_honorarios.forma_cobranca IS
  'Forma de cobrança: fixo, por_hora, por_etapa, misto, por_pasta, por_ato, por_cargo';

-- Adicionar campo valor_por_processo para cobrança por pasta
ALTER TABLE financeiro_contratos_honorarios_config
ADD COLUMN IF NOT EXISTS valor_por_processo NUMERIC(15,2);

-- Constraint para dia_cobranca válido (verificar se já existe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'chk_dia_cobranca'
  ) THEN
    ALTER TABLE financeiro_contratos_honorarios_config
    ADD CONSTRAINT chk_dia_cobranca CHECK (dia_cobranca IS NULL OR (dia_cobranca >= 1 AND dia_cobranca <= 28));
  END IF;
END $$;

COMMENT ON COLUMN financeiro_contratos_honorarios_config.valor_por_processo IS 'Valor cobrado por processo/pasta ativo (para cobrança por_pasta)';

-- =====================================================
-- 4. Tabela de valores negociados por cargo no contrato
-- =====================================================

CREATE TABLE IF NOT EXISTS financeiro_contratos_valores_cargo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id UUID NOT NULL REFERENCES financeiro_contratos_honorarios(id) ON DELETE CASCADE,
  cargo_id UUID NOT NULL REFERENCES escritorios_cargos(id) ON DELETE CASCADE,
  valor_hora_negociado NUMERIC(15,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT uq_contrato_cargo UNIQUE(contrato_id, cargo_id)
);

CREATE INDEX IF NOT EXISTS idx_valores_cargo_contrato ON financeiro_contratos_valores_cargo(contrato_id);

COMMENT ON TABLE financeiro_contratos_valores_cargo IS
  'Valores hora negociados por cargo para cada contrato. Se não houver, usa valor_hora_padrao do cargo.';

-- =====================================================
-- 5. Tabela de atos configurados no contrato
-- =====================================================

CREATE TABLE IF NOT EXISTS financeiro_contratos_atos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id UUID NOT NULL REFERENCES financeiro_contratos_honorarios(id) ON DELETE CASCADE,
  ato_tipo_id UUID NOT NULL REFERENCES financeiro_atos_processuais_tipos(id) ON DELETE CASCADE,
  percentual_valor_causa NUMERIC(5,2),
  valor_fixo NUMERIC(15,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT uq_contrato_ato UNIQUE(contrato_id, ato_tipo_id),
  CONSTRAINT chk_atos_config_valor CHECK (percentual_valor_causa IS NOT NULL OR valor_fixo IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_contrato_atos ON financeiro_contratos_atos(contrato_id);

COMMENT ON TABLE financeiro_contratos_atos IS
  'Configuração de atos para contratos do tipo por_ato com valores específicos';

-- =====================================================
-- 6. Vincular processo ao contrato
-- =====================================================

ALTER TABLE processos_processos
ADD COLUMN IF NOT EXISTS contrato_id UUID REFERENCES financeiro_contratos_honorarios(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_processos_contrato ON processos_processos(contrato_id)
  WHERE contrato_id IS NOT NULL;

COMMENT ON COLUMN processos_processos.contrato_id IS
  'Contrato de honorários vinculado a este processo. Permite cobrança automática baseada nas regras do contrato.';

-- =====================================================
-- 7. Tabela de alertas de cobrança (anti-esquecimento)
-- =====================================================

CREATE TABLE IF NOT EXISTS financeiro_alertas_cobranca (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id UUID NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,
  processo_id UUID NOT NULL REFERENCES processos_processos(id) ON DELETE CASCADE,
  movimentacao_id UUID, -- Referência à movimentação que gerou o alerta
  ato_tipo_id UUID REFERENCES financeiro_atos_processuais_tipos(id) ON DELETE SET NULL,
  tipo_alerta TEXT NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  valor_sugerido NUMERIC(15,2),
  status TEXT DEFAULT 'pendente',
  honorario_id UUID REFERENCES financeiro_honorarios(id) ON DELETE SET NULL, -- Preenchido quando cobrado
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolvido_em TIMESTAMPTZ,
  resolvido_por UUID REFERENCES profiles(id) ON DELETE SET NULL,
  justificativa_ignorado TEXT,

  CONSTRAINT chk_tipo_alerta CHECK (tipo_alerta IN ('ato_processual', 'prazo_vencido', 'mensal', 'manual')),
  CONSTRAINT chk_status_alerta CHECK (status IN ('pendente', 'cobrado', 'ignorado'))
);

CREATE INDEX IF NOT EXISTS idx_alertas_escritorio ON financeiro_alertas_cobranca(escritorio_id);
CREATE INDEX IF NOT EXISTS idx_alertas_processo ON financeiro_alertas_cobranca(processo_id);
CREATE INDEX IF NOT EXISTS idx_alertas_status ON financeiro_alertas_cobranca(status) WHERE status = 'pendente';

COMMENT ON TABLE financeiro_alertas_cobranca IS
  'Alertas de cobrança gerados automaticamente por movimentações ou manualmente para evitar esquecimento';

-- =====================================================
-- 8. Função para obter valor hora efetivo
-- =====================================================

CREATE OR REPLACE FUNCTION get_valor_hora_efetivo(
  p_contrato_id UUID,
  p_user_id UUID
) RETURNS NUMERIC AS $$
DECLARE
  v_valor NUMERIC;
  v_cargo_id UUID;
BEGIN
  -- Buscar cargo do usuário
  SELECT cargo_id INTO v_cargo_id
  FROM escritorios_usuarios
  WHERE user_id = p_user_id
  LIMIT 1;

  -- 1. Primeiro busca valor negociado no contrato para o cargo do usuário
  IF v_cargo_id IS NOT NULL AND p_contrato_id IS NOT NULL THEN
    SELECT valor_hora_negociado INTO v_valor
    FROM financeiro_contratos_valores_cargo
    WHERE contrato_id = p_contrato_id
    AND cargo_id = v_cargo_id;

    IF v_valor IS NOT NULL THEN
      RETURN v_valor;
    END IF;
  END IF;

  -- 2. Busca valor padrão do cargo
  IF v_cargo_id IS NOT NULL THEN
    SELECT valor_hora_padrao INTO v_valor
    FROM escritorios_cargos
    WHERE id = v_cargo_id;

    IF v_valor IS NOT NULL THEN
      RETURN v_valor;
    END IF;
  END IF;

  -- 3. Busca valor hora do contrato (legacy/fallback)
  IF p_contrato_id IS NOT NULL THEN
    SELECT valor_hora INTO v_valor
    FROM financeiro_contratos_honorarios_config
    WHERE contrato_id = p_contrato_id
    AND tipo_config = 'hora'
    LIMIT 1;

    IF v_valor IS NOT NULL THEN
      RETURN v_valor;
    END IF;
  END IF;

  -- 4. Fallback R$400 se nada encontrado
  RETURN 400;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_valor_hora_efetivo IS
  'Retorna valor hora efetivo seguindo hierarquia: negociado no contrato > padrão do cargo > config do contrato > R$400';

-- =====================================================
-- 9. RLS Policies para novas tabelas
-- =====================================================

-- financeiro_atos_processuais_tipos
ALTER TABLE financeiro_atos_processuais_tipos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "atos_tipos_select_by_escritorio" ON financeiro_atos_processuais_tipos
  FOR SELECT USING (
    escritorio_id IN (
      SELECT escritorio_id FROM escritorios_usuarios WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "atos_tipos_insert_by_escritorio" ON financeiro_atos_processuais_tipos
  FOR INSERT WITH CHECK (
    escritorio_id IN (
      SELECT escritorio_id FROM escritorios_usuarios WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "atos_tipos_update_by_escritorio" ON financeiro_atos_processuais_tipos
  FOR UPDATE USING (
    escritorio_id IN (
      SELECT escritorio_id FROM escritorios_usuarios WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "atos_tipos_delete_by_escritorio" ON financeiro_atos_processuais_tipos
  FOR DELETE USING (
    escritorio_id IN (
      SELECT escritorio_id FROM escritorios_usuarios WHERE user_id = auth.uid()
    )
  );

-- financeiro_contratos_valores_cargo
ALTER TABLE financeiro_contratos_valores_cargo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "valores_cargo_select" ON financeiro_contratos_valores_cargo
  FOR SELECT USING (
    contrato_id IN (
      SELECT id FROM financeiro_contratos_honorarios WHERE escritorio_id IN (
        SELECT escritorio_id FROM escritorios_usuarios WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "valores_cargo_insert" ON financeiro_contratos_valores_cargo
  FOR INSERT WITH CHECK (
    contrato_id IN (
      SELECT id FROM financeiro_contratos_honorarios WHERE escritorio_id IN (
        SELECT escritorio_id FROM escritorios_usuarios WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "valores_cargo_update" ON financeiro_contratos_valores_cargo
  FOR UPDATE USING (
    contrato_id IN (
      SELECT id FROM financeiro_contratos_honorarios WHERE escritorio_id IN (
        SELECT escritorio_id FROM escritorios_usuarios WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "valores_cargo_delete" ON financeiro_contratos_valores_cargo
  FOR DELETE USING (
    contrato_id IN (
      SELECT id FROM financeiro_contratos_honorarios WHERE escritorio_id IN (
        SELECT escritorio_id FROM escritorios_usuarios WHERE user_id = auth.uid()
      )
    )
  );

-- financeiro_contratos_atos
ALTER TABLE financeiro_contratos_atos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contrato_atos_select" ON financeiro_contratos_atos
  FOR SELECT USING (
    contrato_id IN (
      SELECT id FROM financeiro_contratos_honorarios WHERE escritorio_id IN (
        SELECT escritorio_id FROM escritorios_usuarios WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "contrato_atos_insert" ON financeiro_contratos_atos
  FOR INSERT WITH CHECK (
    contrato_id IN (
      SELECT id FROM financeiro_contratos_honorarios WHERE escritorio_id IN (
        SELECT escritorio_id FROM escritorios_usuarios WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "contrato_atos_update" ON financeiro_contratos_atos
  FOR UPDATE USING (
    contrato_id IN (
      SELECT id FROM financeiro_contratos_honorarios WHERE escritorio_id IN (
        SELECT escritorio_id FROM escritorios_usuarios WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "contrato_atos_delete" ON financeiro_contratos_atos
  FOR DELETE USING (
    contrato_id IN (
      SELECT id FROM financeiro_contratos_honorarios WHERE escritorio_id IN (
        SELECT escritorio_id FROM escritorios_usuarios WHERE user_id = auth.uid()
      )
    )
  );

-- financeiro_alertas_cobranca
ALTER TABLE financeiro_alertas_cobranca ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alertas_select_by_escritorio" ON financeiro_alertas_cobranca
  FOR SELECT USING (
    escritorio_id IN (
      SELECT escritorio_id FROM escritorios_usuarios WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "alertas_insert_by_escritorio" ON financeiro_alertas_cobranca
  FOR INSERT WITH CHECK (
    escritorio_id IN (
      SELECT escritorio_id FROM escritorios_usuarios WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "alertas_update_by_escritorio" ON financeiro_alertas_cobranca
  FOR UPDATE USING (
    escritorio_id IN (
      SELECT escritorio_id FROM escritorios_usuarios WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "alertas_delete_by_escritorio" ON financeiro_alertas_cobranca
  FOR DELETE USING (
    escritorio_id IN (
      SELECT escritorio_id FROM escritorios_usuarios WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- 10. Seed de atos padrão para escritórios existentes
-- =====================================================

-- Inserir atos padrão para cada escritório existente
INSERT INTO financeiro_atos_processuais_tipos
  (escritorio_id, area_juridica, codigo, nome, percentual_padrao, ordem)
SELECT
  e.id,
  area.nome,
  ato.codigo,
  ato.nome,
  ato.percentual,
  ato.ordem
FROM escritorios e
CROSS JOIN (
  VALUES
    ('civel'), ('trabalhista'), ('tributaria'), ('familia'), ('criminal'), ('previdenciaria'), ('consumidor')
) AS area(nome)
CROSS JOIN (
  VALUES
    ('inicial', 'Petição Inicial', 1.0, 1),
    ('contestacao', 'Contestação/Defesa', 0.5, 2),
    ('audiencia', 'Audiência', 0.5, 3),
    ('sentenca', 'Sentença', 1.0, 4),
    ('recurso', 'Recurso', 1.0, 5),
    ('acordao', 'Acórdão', 0.5, 6),
    ('exito', 'Êxito/Vitória', NULL, 7)
) AS ato(codigo, nome, percentual, ordem)
ON CONFLICT (escritorio_id, area_juridica, codigo) DO NOTHING;
