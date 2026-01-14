-- =====================================================
-- MIGRATION: Portfolio - Views e Functions
-- Módulo: Portfólio (Catálogo de Produtos Jurídicos)
-- Data: 2025-01-13
-- =====================================================

-- =====================================================
-- 1. VIEW: Resumo de Produtos para Catálogo
-- =====================================================
CREATE OR REPLACE VIEW v_portfolio_produtos_catalogo AS
SELECT
  p.id,
  p.escritorio_id,
  p.codigo,
  p.nome,
  p.descricao,
  p.descricao_comercial,
  p.area_juridica,
  p.categoria,
  p.tags,
  p.icone,
  p.cor,
  p.status,
  p.visivel_catalogo,
  p.duracao_estimada_dias,
  p.complexidade,
  p.versao_atual,
  p.created_at,
  p.updated_at,
  -- Contagens
  (SELECT COUNT(*) FROM portfolio_produtos_fases f WHERE f.produto_id = p.id) AS total_fases,
  (SELECT COUNT(*) FROM portfolio_produtos_precos pr WHERE pr.produto_id = p.id AND pr.ativo = true) AS total_precos,
  (SELECT COUNT(*) FROM portfolio_produtos_equipe_papeis eq WHERE eq.produto_id = p.id) AS total_papeis,
  -- Preço padrão
  (
    SELECT COALESCE(
      valor_fixo,
      valor_minimo,
      (SELECT SUM(value::numeric) FROM jsonb_each_text(valores_por_fase))
    )
    FROM portfolio_produtos_precos
    WHERE produto_id = p.id AND padrao = true AND ativo = true
    LIMIT 1
  ) AS preco_base,
  -- Métricas
  COALESCE(m.total_execucoes, 0) AS total_execucoes,
  COALESCE(m.execucoes_concluidas, 0) AS execucoes_concluidas,
  m.taxa_sucesso,
  m.duracao_media_dias AS duracao_media_real
FROM portfolio_produtos p
LEFT JOIN portfolio_metricas m ON m.produto_id = p.id AND m.periodo = 'total';

-- =====================================================
-- 2. VIEW: Projetos com Detalhes
-- =====================================================
CREATE OR REPLACE VIEW v_portfolio_projetos_completos AS
SELECT
  pj.id,
  pj.escritorio_id,
  pj.codigo,
  pj.nome,
  pj.status,
  pj.progresso_percentual,
  pj.data_inicio,
  pj.data_prevista_conclusao,
  pj.data_conclusao,
  pj.resultado,
  pj.valor_negociado,
  pj.created_at,
  pj.updated_at,
  -- Produto
  pj.produto_id,
  pj.produto_versao,
  pr.nome AS produto_nome,
  pr.codigo AS produto_codigo,
  pr.area_juridica,
  pr.icone AS produto_icone,
  pr.cor AS produto_cor,
  -- Cliente
  pj.cliente_id,
  c.nome_completo AS cliente_nome,
  c.tipo_pessoa AS cliente_tipo,
  -- Responsável
  pj.responsavel_id,
  resp.nome_completo AS responsavel_nome,
  pj.processo_id,
  (SELECT COUNT(*) FROM portfolio_projetos_fases f WHERE f.projeto_id = pj.id) AS total_fases,
  (SELECT COUNT(*) FROM portfolio_projetos_fases f WHERE f.projeto_id = pj.id AND f.status = 'concluida') AS fases_concluidas,
  (SELECT COUNT(*) FROM portfolio_projetos_equipe e WHERE e.projeto_id = pj.id) AS total_equipe,
  (SELECT COUNT(*) FROM portfolio_projetos_aprendizados a WHERE a.projeto_id = pj.id) AS total_aprendizados
FROM portfolio_projetos pj
LEFT JOIN portfolio_produtos pr ON pr.id = pj.produto_id
LEFT JOIN crm_pessoas c ON c.id = pj.cliente_id
LEFT JOIN profiles resp ON resp.id = pj.responsavel_id;

-- =====================================================
-- 3. VIEW: Dashboard de Métricas por Área
-- =====================================================
CREATE OR REPLACE VIEW v_portfolio_metricas_area AS
SELECT
  p.escritorio_id,
  p.area_juridica,
  COUNT(DISTINCT p.id) AS total_produtos,
  COUNT(DISTINCT CASE WHEN p.status = 'ativo' THEN p.id END) AS produtos_ativos,
  COUNT(DISTINCT pj.id) AS total_projetos,
  COUNT(DISTINCT CASE WHEN pj.status = 'em_andamento' THEN pj.id END) AS projetos_em_andamento,
  COUNT(DISTINCT CASE WHEN pj.status = 'concluido' THEN pj.id END) AS projetos_concluidos,
  SUM(CASE WHEN pj.status = 'concluido' THEN pj.valor_negociado ELSE 0 END) AS receita_total,
  AVG(CASE WHEN pj.status = 'concluido' THEN pj.data_conclusao - pj.data_inicio END) AS duracao_media_dias
FROM portfolio_produtos p
LEFT JOIN portfolio_projetos pj ON pj.produto_id = p.id
GROUP BY p.escritorio_id, p.area_juridica;

-- =====================================================
-- 4. FUNCTION: Gerar código sequencial
-- =====================================================
CREATE OR REPLACE FUNCTION gerar_codigo_portfolio(
  p_escritorio_id UUID,
  p_tipo TEXT, -- 'produto' ou 'projeto'
  p_area TEXT DEFAULT NULL -- Para produtos: area_juridica
)
RETURNS TEXT AS $$
DECLARE
  v_prefixo TEXT;
  v_sequencia INTEGER;
  v_codigo TEXT;
BEGIN
  -- Definir prefixo
  IF p_tipo = 'produto' THEN
    v_prefixo := CASE p_area
      WHEN 'tributario' THEN 'TRIB'
      WHEN 'societario' THEN 'SOC'
      WHEN 'trabalhista' THEN 'TRAB'
      WHEN 'civel' THEN 'CIV'
      ELSE 'PROD'
    END;

    -- Buscar próxima sequência
    SELECT COALESCE(MAX(
      CAST(REGEXP_REPLACE(codigo, '^[A-Z]+-', '') AS INTEGER)
    ), 0) + 1
    INTO v_sequencia
    FROM portfolio_produtos
    WHERE escritorio_id = p_escritorio_id
      AND codigo LIKE v_prefixo || '-%';

  ELSIF p_tipo = 'projeto' THEN
    v_prefixo := 'PROJ-' || EXTRACT(YEAR FROM NOW())::TEXT;

    -- Buscar próxima sequência do ano
    SELECT COALESCE(MAX(
      CAST(REGEXP_REPLACE(codigo, '^PROJ-[0-9]+-', '') AS INTEGER)
    ), 0) + 1
    INTO v_sequencia
    FROM portfolio_projetos
    WHERE escritorio_id = p_escritorio_id
      AND codigo LIKE 'PROJ-' || EXTRACT(YEAR FROM NOW())::TEXT || '-%';
  END IF;

  -- Formatar código
  v_codigo := v_prefixo || '-' || LPAD(v_sequencia::TEXT, 3, '0');

  RETURN v_codigo;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. FUNCTION: Clonar produto para projeto
-- =====================================================
CREATE OR REPLACE FUNCTION clonar_produto_para_projeto(
  p_produto_id UUID,
  p_cliente_id UUID,
  p_nome TEXT,
  p_responsavel_id UUID,
  p_data_inicio DATE DEFAULT CURRENT_DATE,
  p_valor_negociado NUMERIC DEFAULT NULL,
  p_processo_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_produto portfolio_produtos%ROWTYPE;
  v_projeto_id UUID;
  v_projeto_codigo TEXT;
  v_fase_produto RECORD;
  v_fase_projeto_id UUID;
  v_checklist RECORD;
  v_data_fase DATE;
BEGIN
  -- Buscar produto
  SELECT * INTO v_produto
  FROM portfolio_produtos
  WHERE id = p_produto_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produto não encontrado: %', p_produto_id;
  END IF;

  -- Gerar código do projeto
  v_projeto_codigo := gerar_codigo_portfolio(v_produto.escritorio_id, 'projeto');

  -- Criar projeto
  INSERT INTO portfolio_projetos (
    escritorio_id,
    produto_id,
    produto_versao,
    cliente_id,
    codigo,
    nome,
    processo_id,
    valor_negociado,
    data_inicio,
    data_prevista_conclusao,
    responsavel_id,
    created_by
  ) VALUES (
    v_produto.escritorio_id,
    p_produto_id,
    v_produto.versao_atual,
    p_cliente_id,
    v_projeto_codigo,
    p_nome,
    p_processo_id,
    p_valor_negociado,
    p_data_inicio,
    p_data_inicio + COALESCE(v_produto.duracao_estimada_dias, 30),
    p_responsavel_id,
    p_responsavel_id
  )
  RETURNING id INTO v_projeto_id;

  -- Clonar fases
  v_data_fase := p_data_inicio;

  FOR v_fase_produto IN
    SELECT * FROM portfolio_produtos_fases
    WHERE produto_id = p_produto_id
    ORDER BY ordem
  LOOP
    INSERT INTO portfolio_projetos_fases (
      projeto_id,
      fase_produto_id,
      ordem,
      nome,
      descricao,
      data_inicio_prevista,
      data_fim_prevista
    ) VALUES (
      v_projeto_id,
      v_fase_produto.id,
      v_fase_produto.ordem,
      v_fase_produto.nome,
      v_fase_produto.descricao,
      v_data_fase,
      v_data_fase + COALESCE(v_fase_produto.duracao_estimada_dias, 7)
    )
    RETURNING id INTO v_fase_projeto_id;

    -- Atualizar data para próxima fase
    v_data_fase := v_data_fase + COALESCE(v_fase_produto.duracao_estimada_dias, 7);

    -- Clonar checklist da fase
    FOR v_checklist IN
      SELECT * FROM portfolio_produtos_checklist
      WHERE fase_id = v_fase_produto.id
      ORDER BY ordem
    LOOP
      INSERT INTO portfolio_projetos_fases_checklist (
        fase_projeto_id,
        checklist_produto_id,
        ordem,
        item,
        obrigatorio
      ) VALUES (
        v_fase_projeto_id,
        v_checklist.id,
        v_checklist.ordem,
        v_checklist.item,
        v_checklist.obrigatorio
      );
    END LOOP;
  END LOOP;

  -- Adicionar responsável à equipe
  INSERT INTO portfolio_projetos_equipe (
    projeto_id,
    user_id,
    papel_nome,
    pode_editar,
    recebe_notificacoes
  ) VALUES (
    v_projeto_id,
    p_responsavel_id,
    'Responsável',
    true,
    true
  );

  RETURN v_projeto_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. FUNCTION: Calcular métricas do produto
-- =====================================================
CREATE OR REPLACE FUNCTION calcular_metricas_produto(p_produto_id UUID)
RETURNS void AS $$
DECLARE
  v_escritorio_id UUID;
BEGIN
  -- Buscar escritório
  SELECT escritorio_id INTO v_escritorio_id
  FROM portfolio_produtos
  WHERE id = p_produto_id;

  -- Upsert métricas totais
  INSERT INTO portfolio_metricas (
    escritorio_id,
    produto_id,
    periodo,
    total_execucoes,
    execucoes_concluidas,
    execucoes_em_andamento,
    execucoes_canceladas,
    taxa_sucesso,
    duracao_media_dias,
    duracao_minima_dias,
    duracao_maxima_dias,
    receita_total,
    receita_media,
    total_aprendizados,
    calculado_em
  )
  SELECT
    v_escritorio_id,
    p_produto_id,
    'total',
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'concluido'),
    COUNT(*) FILTER (WHERE status = 'em_andamento'),
    COUNT(*) FILTER (WHERE status = 'cancelado'),
    ROUND(
      (COUNT(*) FILTER (WHERE status = 'concluido' AND resultado = 'sucesso')::NUMERIC /
       NULLIF(COUNT(*) FILTER (WHERE status = 'concluido'), 0)) * 100,
      2
    ),
    AVG(data_conclusao - data_inicio) FILTER (WHERE status = 'concluido'),
    MIN(data_conclusao - data_inicio) FILTER (WHERE status = 'concluido'),
    MAX(data_conclusao - data_inicio) FILTER (WHERE status = 'concluido'),
    COALESCE(SUM(valor_negociado), 0),
    AVG(valor_negociado),
    (
      SELECT COUNT(*)
      FROM portfolio_projetos_aprendizados a
      JOIN portfolio_projetos p ON a.projeto_id = p.id
      WHERE p.produto_id = p_produto_id
    ),
    NOW()
  FROM portfolio_projetos
  WHERE produto_id = p_produto_id
  ON CONFLICT (escritorio_id, produto_id, periodo, ano, mes)
  DO UPDATE SET
    total_execucoes = EXCLUDED.total_execucoes,
    execucoes_concluidas = EXCLUDED.execucoes_concluidas,
    execucoes_em_andamento = EXCLUDED.execucoes_em_andamento,
    execucoes_canceladas = EXCLUDED.execucoes_canceladas,
    taxa_sucesso = EXCLUDED.taxa_sucesso,
    duracao_media_dias = EXCLUDED.duracao_media_dias,
    duracao_minima_dias = EXCLUDED.duracao_minima_dias,
    duracao_maxima_dias = EXCLUDED.duracao_maxima_dias,
    receita_total = EXCLUDED.receita_total,
    receita_media = EXCLUDED.receita_media,
    total_aprendizados = EXCLUDED.total_aprendizados,
    calculado_em = NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. FUNCTION: Criar versão do produto
-- =====================================================
CREATE OR REPLACE FUNCTION criar_versao_produto(
  p_produto_id UUID,
  p_alteracoes TEXT DEFAULT NULL,
  p_motivo TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_produto_completo JSONB;
  v_nova_versao INTEGER;
BEGIN
  -- Buscar versão atual
  SELECT versao_atual + 1 INTO v_nova_versao
  FROM portfolio_produtos
  WHERE id = p_produto_id;

  -- Montar snapshot completo
  SELECT jsonb_build_object(
    'produto', to_jsonb(p.*),
    'fases', (
      SELECT COALESCE(jsonb_agg(to_jsonb(f.*) ORDER BY f.ordem), '[]'::jsonb)
      FROM portfolio_produtos_fases f
      WHERE f.produto_id = p_produto_id
    ),
    'checklist', (
      SELECT COALESCE(jsonb_agg(to_jsonb(c.*)), '[]'::jsonb)
      FROM portfolio_produtos_checklist c
      JOIN portfolio_produtos_fases f ON c.fase_id = f.id
      WHERE f.produto_id = p_produto_id
    ),
    'precos', (
      SELECT COALESCE(jsonb_agg(to_jsonb(pr.*)), '[]'::jsonb)
      FROM portfolio_produtos_precos pr
      WHERE pr.produto_id = p_produto_id
    ),
    'papeis', (
      SELECT COALESCE(jsonb_agg(to_jsonb(eq.*)), '[]'::jsonb)
      FROM portfolio_produtos_equipe_papeis eq
      WHERE eq.produto_id = p_produto_id
    ),
    'recursos', (
      SELECT COALESCE(jsonb_agg(to_jsonb(r.*)), '[]'::jsonb)
      FROM portfolio_produtos_recursos r
      WHERE r.produto_id = p_produto_id
    )
  ) INTO v_produto_completo
  FROM portfolio_produtos p
  WHERE p.id = p_produto_id;

  -- Criar versão
  INSERT INTO portfolio_produtos_versoes (
    produto_id,
    versao,
    snapshot,
    alteracoes,
    motivo
  ) VALUES (
    p_produto_id,
    v_nova_versao,
    v_produto_completo,
    p_alteracoes,
    p_motivo
  );

  -- Atualizar versão atual
  UPDATE portfolio_produtos
  SET versao_atual = v_nova_versao
  WHERE id = p_produto_id;

  RETURN v_nova_versao;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. FUNCTION: Métricas do dashboard
-- =====================================================
CREATE OR REPLACE FUNCTION get_portfolio_dashboard_metricas(p_escritorio_id UUID)
RETURNS TABLE (
  total_produtos_ativos INTEGER,
  total_projetos_ativos INTEGER,
  receita_mes_atual NUMERIC,
  receita_mes_anterior NUMERIC,
  taxa_sucesso_geral NUMERIC,
  projetos_atrasados INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INTEGER FROM portfolio_produtos WHERE escritorio_id = p_escritorio_id AND status = 'ativo'),
    (SELECT COUNT(*)::INTEGER FROM portfolio_projetos WHERE escritorio_id = p_escritorio_id AND status = 'em_andamento'),
    COALESCE((
      SELECT SUM(valor_negociado)
      FROM portfolio_projetos
      WHERE escritorio_id = p_escritorio_id
        AND status = 'concluido'
        AND EXTRACT(YEAR FROM data_conclusao) = EXTRACT(YEAR FROM NOW())
        AND EXTRACT(MONTH FROM data_conclusao) = EXTRACT(MONTH FROM NOW())
    ), 0),
    COALESCE((
      SELECT SUM(valor_negociado)
      FROM portfolio_projetos
      WHERE escritorio_id = p_escritorio_id
        AND status = 'concluido'
        AND EXTRACT(YEAR FROM data_conclusao) = EXTRACT(YEAR FROM NOW() - INTERVAL '1 month')
        AND EXTRACT(MONTH FROM data_conclusao) = EXTRACT(MONTH FROM NOW() - INTERVAL '1 month')
    ), 0),
    ROUND(
      (SELECT COUNT(*)::NUMERIC FILTER (WHERE resultado = 'sucesso') /
       NULLIF(COUNT(*) FILTER (WHERE status = 'concluido'), 0) * 100
       FROM portfolio_projetos WHERE escritorio_id = p_escritorio_id),
      2
    ),
    (SELECT COUNT(*)::INTEGER FROM portfolio_projetos
     WHERE escritorio_id = p_escritorio_id
       AND status = 'em_andamento'
       AND data_prevista_conclusao < CURRENT_DATE);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. COMMENTS
-- =====================================================
COMMENT ON VIEW v_portfolio_produtos_catalogo IS 'View otimizada para exibição do catálogo de produtos';
COMMENT ON VIEW v_portfolio_projetos_completos IS 'View com dados completos dos projetos incluindo relacionamentos';
COMMENT ON VIEW v_portfolio_metricas_area IS 'Métricas agregadas por área jurídica';

COMMENT ON FUNCTION gerar_codigo_portfolio IS 'Gera código sequencial para produtos (TRIB-001) ou projetos (PROJ-2025-001)';
COMMENT ON FUNCTION clonar_produto_para_projeto IS 'Clona produto completo (fases, checklist) para novo projeto';
COMMENT ON FUNCTION calcular_metricas_produto IS 'Recalcula e atualiza métricas de um produto';
COMMENT ON FUNCTION criar_versao_produto IS 'Cria snapshot do produto para histórico de versões';
COMMENT ON FUNCTION get_portfolio_dashboard_metricas IS 'Retorna métricas para dashboard do portfolio';
