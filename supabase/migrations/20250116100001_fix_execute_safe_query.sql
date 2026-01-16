-- ============================================
-- FIX: Remover ; do final da query antes de executar
-- ============================================

CREATE OR REPLACE FUNCTION execute_safe_query(
  query_text TEXT,
  escritorio_param UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  query_upper TEXT;
  query_clean TEXT;
  tabelas_permitidas TEXT[];
  tem_tabela_valida BOOLEAN := false;
  tabela TEXT;
BEGIN
  -- Limpar query: remover ; do final e espaços extras
  query_clean := TRIM(TRAILING ';' FROM TRIM(query_text));

  -- Normalizar query para validacao
  query_upper := UPPER(query_clean);

  -- 1. Validar que eh SELECT
  IF NOT (query_upper LIKE 'SELECT%') THEN
    RAISE EXCEPTION 'Apenas queries SELECT sao permitidas. Operacoes de modificacao devem usar as funcoes especificas.';
  END IF;

  -- 2. Verificar comandos perigosos
  IF query_upper ~ '\b(DROP|TRUNCATE|ALTER|CREATE|GRANT|REVOKE|DELETE|UPDATE|INSERT|EXECUTE|COPY)\b' THEN
    RAISE EXCEPTION 'Comando nao permitido detectado na query.';
  END IF;

  -- 3. Verificar se usa tabelas permitidas
  tabelas_permitidas := get_tabelas_permitidas();

  FOREACH tabela IN ARRAY tabelas_permitidas LOOP
    IF query_upper LIKE '%' || UPPER(tabela) || '%' THEN
      tem_tabela_valida := true;
      EXIT;
    END IF;
  END LOOP;

  IF NOT tem_tabela_valida THEN
    RAISE EXCEPTION 'Query deve referenciar pelo menos uma tabela permitida: %', array_to_string(tabelas_permitidas, ', ');
  END IF;

  -- 4. Verificar que tem filtro de escritorio_id (exceto para algumas views)
  IF NOT (
    query_upper LIKE '%ESCRITORIO_ID%' OR
    query_upper LIKE '%$1%' OR
    query_upper LIKE '%PROFILES%'
  ) THEN
    RAISE EXCEPTION 'Query deve incluir filtro por escritorio_id para seguranca multi-tenant.';
  END IF;

  -- 5. Executar query com parametro de escritorio
  BEGIN
    EXECUTE format(
      'SELECT COALESCE(jsonb_agg(row_to_json(t)), ''[]''::jsonb) FROM (%s) t',
      REPLACE(query_clean, '$1', quote_literal(escritorio_param::text))
    ) INTO result;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao executar query: %', SQLERRM;
  END;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION execute_safe_query IS 'Executa queries SELECT de forma segura com validacao - corrigido para remover ; do final';
