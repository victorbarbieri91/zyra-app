-- ============================================
-- FUNÇÃO: get_table_schema
-- Retorna estrutura de uma tabela para o Centro de Comando
-- ============================================

CREATE OR REPLACE FUNCTION get_table_schema(tabela_nome TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  tabelas_permitidas TEXT[];
BEGIN
  -- Lista de tabelas permitidas
  tabelas_permitidas := ARRAY[
    'processos_processos',
    'crm_pessoas',
    'profiles',
    'agenda_tarefas',
    'agenda_eventos',
    'agenda_audiencias',
    'financeiro_timesheet',
    'financeiro_honorarios',
    'financeiro_honorarios_parcelas'
  ];

  -- Validar que é tabela permitida
  IF NOT (tabela_nome = ANY(tabelas_permitidas)) THEN
    RAISE EXCEPTION 'Tabela nao permitida: %', tabela_nome;
  END IF;

  -- Buscar schema da tabela
  SELECT jsonb_build_object(
    'tabela', tabela_nome,
    'colunas', COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'coluna', column_name,
          'tipo', data_type,
          'permite_nulo', CASE WHEN is_nullable = 'YES' THEN true ELSE false END,
          'valor_padrao', column_default,
          'preenchimento', CASE
            WHEN column_name IN ('id', 'created_at', 'updated_at', 'escritorio_id') THEN 'auto'
            ELSE 'manual'
          END
        )
        ORDER BY ordinal_position
      )
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = tabela_nome),
      '[]'::jsonb
    ),
    'dica', 'Campos com preenchimento "auto" sao gerenciados pelo sistema. Nao inclua id, escritorio_id, created_at, updated_at ao inserir.'
  ) INTO result;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION get_table_schema IS 'Retorna estrutura de uma tabela permitida para o Centro de Comando IA';

-- ============================================
-- FUNÇÃO: get_enum_values
-- Retorna valores de um enum type
-- ============================================

CREATE OR REPLACE FUNCTION get_enum_values(tipo_nome TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT COALESCE(
    jsonb_agg(pg_enum.enumlabel ORDER BY pg_enum.enumsortorder),
    '[]'::jsonb
  )
  INTO result
  FROM pg_type
  JOIN pg_enum ON pg_type.oid = pg_enum.enumtypid
  WHERE pg_type.typname = tipo_nome;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION get_enum_values IS 'Retorna valores permitidos de um tipo enum';
