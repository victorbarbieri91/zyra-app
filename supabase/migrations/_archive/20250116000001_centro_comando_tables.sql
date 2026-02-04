-- ============================================
-- CENTRO DE COMANDO - Sistema de Chat com IA
-- ============================================

-- Tabela de sessões do Centro de Comando
CREATE TABLE IF NOT EXISTS centro_comando_sessoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  escritorio_id UUID NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,
  titulo TEXT,
  contexto JSONB DEFAULT '{}',
  ativo BOOLEAN DEFAULT true,
  inicio TIMESTAMPTZ DEFAULT NOW(),
  fim TIMESTAMPTZ,
  mensagens_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de histórico de mensagens
CREATE TABLE IF NOT EXISTS centro_comando_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sessao_id UUID REFERENCES centro_comando_sessoes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  escritorio_id UUID NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  tool_calls JSONB,
  tool_results JSONB,
  tokens_input INTEGER,
  tokens_output INTEGER,
  tempo_execucao_ms INTEGER,
  erro TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de comandos favoritos
CREATE TABLE IF NOT EXISTS centro_comando_favoritos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  escritorio_id UUID NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  comando TEXT NOT NULL,
  descricao TEXT,
  icone TEXT DEFAULT 'command',
  categoria TEXT DEFAULT 'geral',
  ordem INTEGER DEFAULT 0,
  uso_count INTEGER DEFAULT 0,
  ultimo_uso TIMESTAMPTZ,
  compartilhado_equipe BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de ações pendentes de confirmação
CREATE TABLE IF NOT EXISTS centro_comando_acoes_pendentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sessao_id UUID REFERENCES centro_comando_sessoes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  escritorio_id UUID NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,
  tipo_acao TEXT NOT NULL CHECK (tipo_acao IN ('insert', 'update', 'delete')),
  tabela TEXT NOT NULL,
  dados JSONB NOT NULL,
  explicacao TEXT,
  confirmado BOOLEAN DEFAULT false,
  executado BOOLEAN DEFAULT false,
  resultado JSONB,
  erro TEXT,
  expira_em TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 minutes'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  confirmado_em TIMESTAMPTZ,
  executado_em TIMESTAMPTZ
);

-- ============================================
-- FUNÇÃO PARA EXECUTAR QUERIES DE FORMA SEGURA
-- ============================================

-- Lista de tabelas permitidas para consulta
CREATE OR REPLACE FUNCTION get_tabelas_permitidas()
RETURNS TEXT[] AS $$
BEGIN
  RETURN ARRAY[
    'processos_processos',
    'processos_partes',
    'processos_movimentacoes',
    'processos_equipe',
    'crm_pessoas',
    'crm_interacoes',
    'agenda_tarefas',
    'agenda_eventos',
    'agenda_audiencias',
    'financeiro_timesheet',
    'financeiro_honorarios',
    'financeiro_honorarios_parcelas',
    'financeiro_contratos_honorarios',
    'financeiro_despesas',
    'financeiro_contas_bancarias',
    'profiles',
    'escritorios',
    'v_agenda_consolidada',
    'v_processos_dashboard',
    'v_lancamentos_prontos_faturar',
    'v_prazos_vencendo'
  ];
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Função principal para executar queries seguras
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
  tabelas_permitidas TEXT[];
  tem_tabela_valida BOOLEAN := false;
  tabela TEXT;
BEGIN
  -- Normalizar query para validação
  query_upper := UPPER(TRIM(query_text));

  -- 1. Validar que é SELECT
  IF NOT (query_upper LIKE 'SELECT%') THEN
    RAISE EXCEPTION 'Apenas queries SELECT são permitidas. Operações de modificação devem usar as funções específicas.';
  END IF;

  -- 2. Verificar comandos perigosos
  IF query_upper ~ '(DROP|TRUNCATE|ALTER|CREATE|GRANT|REVOKE|DELETE|UPDATE|INSERT|EXECUTE|COPY)' THEN
    RAISE EXCEPTION 'Comando não permitido detectado na query.';
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
    query_upper LIKE '%PROFILES%' -- profiles pode não ter escritorio_id direto
  ) THEN
    RAISE EXCEPTION 'Query deve incluir filtro por escritorio_id para segurança multi-tenant.';
  END IF;

  -- 5. Executar query com parâmetro de escritório
  BEGIN
    EXECUTE format(
      'SELECT COALESCE(jsonb_agg(row_to_json(t)), ''[]''::jsonb) FROM (%s) t',
      REPLACE(query_text, '$1', quote_literal(escritorio_param::text))
    ) INTO result;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao executar query: %', SQLERRM;
  END;

  RETURN result;
END;
$$;

-- ============================================
-- FUNÇÕES PARA OPERAÇÕES DE MODIFICAÇÃO
-- ============================================

-- Função para preparar INSERT (retorna preview, não executa)
CREATE OR REPLACE FUNCTION prepare_safe_insert(
  tabela TEXT,
  dados JSONB,
  escritorio_param UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tabelas_permitidas TEXT[];
  colunas_info JSONB;
BEGIN
  -- Validar tabela
  tabelas_permitidas := get_tabelas_permitidas();
  IF NOT (tabela = ANY(tabelas_permitidas)) THEN
    RAISE EXCEPTION 'Tabela não permitida: %', tabela;
  END IF;

  -- Buscar informações das colunas
  SELECT jsonb_agg(jsonb_build_object(
    'column_name', column_name,
    'data_type', data_type,
    'is_nullable', is_nullable,
    'column_default', column_default
  ))
  INTO colunas_info
  FROM information_schema.columns
  WHERE table_name = tabela
    AND table_schema = 'public'
    AND column_name NOT IN ('id', 'created_at', 'updated_at');

  -- Retornar preview
  RETURN jsonb_build_object(
    'tabela', tabela,
    'dados_a_inserir', dados,
    'escritorio_id', escritorio_param,
    'colunas_disponiveis', colunas_info,
    'preview', true
  );
END;
$$;

-- Função para executar INSERT confirmado
CREATE OR REPLACE FUNCTION execute_safe_insert(
  tabela TEXT,
  dados JSONB,
  escritorio_param UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tabelas_permitidas TEXT[];
  resultado JSONB;
  novo_id UUID;
  query_text TEXT;
  colunas TEXT;
  valores TEXT;
  coluna TEXT;
  valor JSONB;
BEGIN
  -- Validar tabela
  tabelas_permitidas := get_tabelas_permitidas();
  IF NOT (tabela = ANY(tabelas_permitidas)) THEN
    RAISE EXCEPTION 'Tabela não permitida: %', tabela;
  END IF;

  -- Não permitir INSERT em views
  IF tabela LIKE 'v_%' THEN
    RAISE EXCEPTION 'Não é possível inserir em views';
  END IF;

  -- Adicionar escritorio_id aos dados
  dados := dados || jsonb_build_object('escritorio_id', escritorio_param);

  -- Construir query dinâmica
  SELECT
    string_agg(key, ', '),
    string_agg(
      CASE
        WHEN jsonb_typeof(value) = 'string' THEN quote_literal(value #>> '{}')
        WHEN jsonb_typeof(value) = 'null' THEN 'NULL'
        ELSE value::text
      END,
      ', '
    )
  INTO colunas, valores
  FROM jsonb_each(dados);

  query_text := format(
    'INSERT INTO %I (%s) VALUES (%s) RETURNING id',
    tabela, colunas, valores
  );

  EXECUTE query_text INTO novo_id;

  -- Buscar registro criado
  EXECUTE format(
    'SELECT row_to_json(t) FROM %I t WHERE id = $1',
    tabela
  ) INTO resultado USING novo_id;

  RETURN jsonb_build_object(
    'sucesso', true,
    'id', novo_id,
    'registro', resultado
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'sucesso', false,
    'erro', SQLERRM
  );
END;
$$;

-- Função para preparar UPDATE (retorna preview com antes/depois)
CREATE OR REPLACE FUNCTION prepare_safe_update(
  tabela TEXT,
  registro_id UUID,
  alteracoes JSONB,
  escritorio_param UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tabelas_permitidas TEXT[];
  registro_atual JSONB;
BEGIN
  -- Validar tabela
  tabelas_permitidas := get_tabelas_permitidas();
  IF NOT (tabela = ANY(tabelas_permitidas)) THEN
    RAISE EXCEPTION 'Tabela não permitida: %', tabela;
  END IF;

  -- Buscar registro atual
  EXECUTE format(
    'SELECT row_to_json(t) FROM %I t WHERE id = $1 AND escritorio_id = $2',
    tabela
  ) INTO registro_atual USING registro_id, escritorio_param;

  IF registro_atual IS NULL THEN
    RAISE EXCEPTION 'Registro não encontrado ou sem permissão de acesso';
  END IF;

  -- Retornar preview
  RETURN jsonb_build_object(
    'tabela', tabela,
    'id', registro_id,
    'antes', registro_atual,
    'alteracoes', alteracoes,
    'depois', registro_atual || alteracoes,
    'preview', true
  );
END;
$$;

-- Função para executar UPDATE confirmado
CREATE OR REPLACE FUNCTION execute_safe_update(
  tabela TEXT,
  registro_id UUID,
  alteracoes JSONB,
  escritorio_param UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tabelas_permitidas TEXT[];
  resultado JSONB;
  set_clause TEXT;
BEGIN
  -- Validar tabela
  tabelas_permitidas := get_tabelas_permitidas();
  IF NOT (tabela = ANY(tabelas_permitidas)) THEN
    RAISE EXCEPTION 'Tabela não permitida: %', tabela;
  END IF;

  -- Não permitir UPDATE em views
  IF tabela LIKE 'v_%' THEN
    RAISE EXCEPTION 'Não é possível atualizar views';
  END IF;

  -- Não permitir alterar id ou escritorio_id
  alteracoes := alteracoes - 'id' - 'escritorio_id' - 'created_at';

  -- Adicionar updated_at
  alteracoes := alteracoes || jsonb_build_object('updated_at', NOW());

  -- Construir SET clause
  SELECT string_agg(
    format('%I = %s', key,
      CASE
        WHEN jsonb_typeof(value) = 'string' THEN quote_literal(value #>> '{}')
        WHEN jsonb_typeof(value) = 'null' THEN 'NULL'
        ELSE value::text
      END
    ), ', '
  )
  INTO set_clause
  FROM jsonb_each(alteracoes);

  -- Executar UPDATE
  EXECUTE format(
    'UPDATE %I SET %s WHERE id = $1 AND escritorio_id = $2 RETURNING row_to_json(%I)',
    tabela, set_clause, tabela
  ) INTO resultado USING registro_id, escritorio_param;

  IF resultado IS NULL THEN
    RAISE EXCEPTION 'Registro não encontrado ou sem permissão de acesso';
  END IF;

  RETURN jsonb_build_object(
    'sucesso', true,
    'registro', resultado
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'sucesso', false,
    'erro', SQLERRM
  );
END;
$$;

-- Função para preparar DELETE (retorna registro a ser excluído)
CREATE OR REPLACE FUNCTION prepare_safe_delete(
  tabela TEXT,
  registro_id UUID,
  escritorio_param UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tabelas_permitidas TEXT[];
  registro_atual JSONB;
  dependencias JSONB;
BEGIN
  -- Validar tabela
  tabelas_permitidas := get_tabelas_permitidas();
  IF NOT (tabela = ANY(tabelas_permitidas)) THEN
    RAISE EXCEPTION 'Tabela não permitida: %', tabela;
  END IF;

  -- Buscar registro atual
  EXECUTE format(
    'SELECT row_to_json(t) FROM %I t WHERE id = $1 AND escritorio_id = $2',
    tabela
  ) INTO registro_atual USING registro_id, escritorio_param;

  IF registro_atual IS NULL THEN
    RAISE EXCEPTION 'Registro não encontrado ou sem permissão de acesso';
  END IF;

  -- Retornar preview (incluindo aviso de dupla confirmação)
  RETURN jsonb_build_object(
    'tabela', tabela,
    'id', registro_id,
    'registro', registro_atual,
    'aviso', 'ATENÇÃO: Esta ação não pode ser desfeita!',
    'requer_dupla_confirmacao', true,
    'preview', true
  );
END;
$$;

-- Função para executar DELETE confirmado
CREATE OR REPLACE FUNCTION execute_safe_delete(
  tabela TEXT,
  registro_id UUID,
  escritorio_param UUID,
  confirmacao_dupla BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tabelas_permitidas TEXT[];
  registro_excluido JSONB;
BEGIN
  -- Exigir dupla confirmação
  IF NOT confirmacao_dupla THEN
    RAISE EXCEPTION 'DELETE requer dupla confirmação. Passe confirmacao_dupla = true.';
  END IF;

  -- Validar tabela
  tabelas_permitidas := get_tabelas_permitidas();
  IF NOT (tabela = ANY(tabelas_permitidas)) THEN
    RAISE EXCEPTION 'Tabela não permitida: %', tabela;
  END IF;

  -- Não permitir DELETE em views
  IF tabela LIKE 'v_%' THEN
    RAISE EXCEPTION 'Não é possível excluir de views';
  END IF;

  -- Buscar registro antes de excluir
  EXECUTE format(
    'SELECT row_to_json(t) FROM %I t WHERE id = $1 AND escritorio_id = $2',
    tabela
  ) INTO registro_excluido USING registro_id, escritorio_param;

  IF registro_excluido IS NULL THEN
    RAISE EXCEPTION 'Registro não encontrado ou sem permissão de acesso';
  END IF;

  -- Executar DELETE
  EXECUTE format(
    'DELETE FROM %I WHERE id = $1 AND escritorio_id = $2',
    tabela
  ) USING registro_id, escritorio_param;

  RETURN jsonb_build_object(
    'sucesso', true,
    'registro_excluido', registro_excluido
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'sucesso', false,
    'erro', SQLERRM
  );
END;
$$;

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE centro_comando_sessoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE centro_comando_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE centro_comando_favoritos ENABLE ROW LEVEL SECURITY;
ALTER TABLE centro_comando_acoes_pendentes ENABLE ROW LEVEL SECURITY;

-- Sessões: usuário vê apenas suas sessões
CREATE POLICY "Usuarios veem proprias sessoes" ON centro_comando_sessoes
  FOR ALL USING (auth.uid() = user_id);

-- Histórico: usuário vê apenas seu histórico
CREATE POLICY "Usuarios veem proprio historico" ON centro_comando_historico
  FOR ALL USING (auth.uid() = user_id);

-- Favoritos: usuário vê próprios ou compartilhados do escritório
CREATE POLICY "Usuarios veem favoritos proprios" ON centro_comando_favoritos
  FOR SELECT USING (
    auth.uid() = user_id
    OR (
      compartilhado_equipe = true
      AND escritorio_id IN (
        SELECT escritorio_id FROM escritorios_usuarios
        WHERE user_id = auth.uid() AND ativo = true
      )
    )
  );

CREATE POLICY "Usuarios gerenciam proprios favoritos" ON centro_comando_favoritos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios atualizam proprios favoritos" ON centro_comando_favoritos
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Usuarios excluem proprios favoritos" ON centro_comando_favoritos
  FOR DELETE USING (auth.uid() = user_id);

-- Ações pendentes: usuário vê apenas suas ações
CREATE POLICY "Usuarios veem proprias acoes" ON centro_comando_acoes_pendentes
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_cc_sessoes_user ON centro_comando_sessoes(user_id, ativo);
CREATE INDEX IF NOT EXISTS idx_cc_sessoes_escritorio ON centro_comando_sessoes(escritorio_id);
CREATE INDEX IF NOT EXISTS idx_cc_historico_sessao ON centro_comando_historico(sessao_id);
CREATE INDEX IF NOT EXISTS idx_cc_historico_user ON centro_comando_historico(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cc_favoritos_user ON centro_comando_favoritos(user_id, escritorio_id);
CREATE INDEX IF NOT EXISTS idx_cc_favoritos_categoria ON centro_comando_favoritos(categoria);
CREATE INDEX IF NOT EXISTS idx_cc_acoes_user ON centro_comando_acoes_pendentes(user_id, confirmado);
CREATE INDEX IF NOT EXISTS idx_cc_acoes_expira ON centro_comando_acoes_pendentes(expira_em) WHERE NOT executado;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger para atualizar contador de mensagens na sessão
CREATE OR REPLACE FUNCTION update_sessao_mensagens_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE centro_comando_sessoes
  SET mensagens_count = mensagens_count + 1,
      updated_at = NOW()
  WHERE id = NEW.sessao_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_sessao_mensagens
  AFTER INSERT ON centro_comando_historico
  FOR EACH ROW
  WHEN (NEW.sessao_id IS NOT NULL)
  EXECUTE FUNCTION update_sessao_mensagens_count();

-- Trigger para atualizar uso de favoritos
CREATE OR REPLACE FUNCTION update_favorito_uso()
RETURNS TRIGGER AS $$
BEGIN
  NEW.uso_count := OLD.uso_count + 1;
  NEW.ultimo_uso := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMENTÁRIOS
-- ============================================

COMMENT ON TABLE centro_comando_sessoes IS 'Sessões de conversa do Centro de Comando com IA';
COMMENT ON TABLE centro_comando_historico IS 'Histórico de mensagens do Centro de Comando';
COMMENT ON TABLE centro_comando_favoritos IS 'Comandos favoritos salvos pelos usuários';
COMMENT ON TABLE centro_comando_acoes_pendentes IS 'Ações aguardando confirmação do usuário';
COMMENT ON FUNCTION execute_safe_query IS 'Executa queries SELECT de forma segura com validação';
COMMENT ON FUNCTION execute_safe_insert IS 'Executa INSERT de forma segura após confirmação';
COMMENT ON FUNCTION execute_safe_update IS 'Executa UPDATE de forma segura após confirmação';
COMMENT ON FUNCTION execute_safe_delete IS 'Executa DELETE de forma segura após dupla confirmação';
