-- Migration: Processos - Views e Functions Principais
-- Data: 2025-01-07
-- Descrição: Views consolidadas e functions de negócio do módulo

-- =====================================================
-- VIEW: v_processos_dashboard
-- =====================================================

CREATE OR REPLACE VIEW v_processos_dashboard AS
SELECT
  p.escritorio_id,

  -- Totais por status
  COUNT(*) FILTER (WHERE p.status = 'ativo') as total_ativos,
  COUNT(*) FILTER (WHERE p.status = 'suspenso') as total_suspensos,
  COUNT(*) FILTER (WHERE p.status = 'arquivado') as total_arquivados,
  COUNT(*) FILTER (WHERE p.status = 'transito_julgado') as total_transitados,
  COUNT(*) FILTER (WHERE p.status = 'acordo') as total_acordos,

  -- Totais por área
  COUNT(*) FILTER (WHERE p.area = 'civel') as total_civel,
  COUNT(*) FILTER (WHERE p.area = 'trabalhista') as total_trabalhista,
  COUNT(*) FILTER (WHERE p.area = 'tributaria') as total_tributaria,
  COUNT(*) FILTER (WHERE p.area = 'familia') as total_familia,
  COUNT(*) FILTER (WHERE p.area = 'criminal') as total_criminal,

  -- Totais por fase
  COUNT(*) FILTER (WHERE p.fase = 'conhecimento') as total_conhecimento,
  COUNT(*) FILTER (WHERE p.fase = 'recurso') as total_recurso,
  COUNT(*) FILTER (WHERE p.fase = 'execucao') as total_execucao,

  -- Totais por prioridade (ativos)
  COUNT(*) FILTER (WHERE p.prioridade = 'alta' AND p.status = 'ativo') as total_prioridade_alta,
  COUNT(*) FILTER (WHERE p.prioridade = 'media' AND p.status = 'ativo') as total_prioridade_media,
  COUNT(*) FILTER (WHERE p.prioridade = 'baixa' AND p.status = 'ativo') as total_prioridade_baixa,

  -- Valores
  SUM(p.valor_causa) FILTER (WHERE p.status = 'ativo') as valor_causa_total,
  SUM(p.valor_acordo) FILTER (WHERE p.status = 'acordo') as valor_acordos_total,
  SUM(p.valor_risco) FILTER (WHERE p.risco = 'alto' AND p.status = 'ativo') as valor_risco_alto,

  -- Movimentações
  (SELECT COUNT(*)
   FROM processos_movimentacoes m
   WHERE m.escritorio_id = p.escritorio_id
     AND m.lida = false
  ) as movimentacoes_nao_lidas,

  -- Prazos
  (SELECT COUNT(*)
   FROM processos_prazos pr
   WHERE pr.escritorio_id = p.escritorio_id
     AND pr.status = 'aberto'
     AND pr.data_limite <= CURRENT_DATE + 3
  ) as prazos_vencendo_3_dias,

  (SELECT COUNT(*)
   FROM processos_prazos pr
   WHERE pr.escritorio_id = p.escritorio_id
     AND pr.status = 'aberto'
     AND pr.data_limite < CURRENT_DATE
  ) as prazos_vencidos

FROM processos_processos p
GROUP BY p.escritorio_id;

COMMENT ON VIEW v_processos_dashboard IS 'Métricas consolidadas de processos para dashboard';

-- =====================================================
-- VIEW: v_processos_timeline
-- =====================================================

CREATE OR REPLACE VIEW v_processos_timeline AS
SELECT
  p.id as processo_id,
  p.numero_cnj,

  -- União de eventos de diferentes tabelas em uma timeline única
  COALESCE(m.data_movimento, pr.data_limite::timestamptz, pc.created_at, au.data_hora) as data_evento,

  CASE
    WHEN m.id IS NOT NULL THEN 'movimentacao'
    WHEN pr.id IS NOT NULL THEN 'prazo'
    WHEN pc.id IS NOT NULL THEN 'peca'
    WHEN au.id IS NOT NULL THEN 'audiencia'
  END as tipo_evento,

  CASE
    WHEN m.id IS NOT NULL THEN m.descricao
    WHEN pr.id IS NOT NULL THEN pr.descricao
    WHEN pc.id IS NOT NULL THEN pc.titulo
    WHEN au.id IS NOT NULL THEN 'Audiência ' || au.tipo
  END as descricao,

  CASE
    WHEN m.id IS NOT NULL THEN m.id
    WHEN pr.id IS NOT NULL THEN pr.id
    WHEN pc.id IS NOT NULL THEN pc.id
    WHEN au.id IS NOT NULL THEN au.id
  END as evento_id,

  -- Metadados específicos
  jsonb_build_object(
    'importante', m.importante,
    'lida', m.lida,
    'prazo_status', pr.status,
    'prazo_vencendo', (pr.data_limite < CURRENT_DATE + 3 AND pr.status = 'aberto'),
    'peca_tipo', pc.tipo,
    'peca_protocolado', pc.protocolado,
    'audiencia_tipo', au.tipo,
    'audiencia_realizada', au.realizada
  ) as metadata

FROM processos_processos p

LEFT JOIN processos_movimentacoes m ON m.processo_id = p.id
LEFT JOIN processos_prazos pr ON pr.processo_id = p.id
LEFT JOIN processos_pecas pc ON pc.processo_id = p.id AND pc.is_versao_atual = true
LEFT JOIN processos_audiencias au ON au.processo_id = p.id

WHERE
  m.id IS NOT NULL OR
  pr.id IS NOT NULL OR
  pc.id IS NOT NULL OR
  au.id IS NOT NULL

ORDER BY data_evento DESC;

COMMENT ON VIEW v_processos_timeline IS 'Timeline consolidada de todos eventos do processo';

-- =====================================================
-- VIEW: v_processos_criticos
-- =====================================================

CREATE OR REPLACE VIEW v_processos_criticos AS
SELECT
  p.id,
  p.numero_cnj,
  p.escritorio_id,
  p.cliente_id,
  c.nome as cliente_nome,
  p.area,
  p.fase,
  p.status,
  p.prioridade,
  p.responsavel_id,
  prof.nome as responsavel_nome,

  -- Razões de criticidade
  ARRAY_REMOVE(ARRAY[
    CASE WHEN EXISTS (
      SELECT 1 FROM processos_prazos pr
      WHERE pr.processo_id = p.id
        AND pr.status = 'aberto'
        AND pr.data_limite <= CURRENT_DATE + 3
    ) THEN 'prazo_urgente' END,

    CASE WHEN EXISTS (
      SELECT 1 FROM processos_movimentacoes m
      WHERE m.processo_id = p.id
        AND m.lida = false
        AND m.importante = true
    ) THEN 'movimentacao_importante_nao_lida' END,

    CASE WHEN p.risco = 'alto' THEN 'risco_alto' END,

    CASE WHEN p.prioridade = 'alta' THEN 'prioridade_alta' END,

    CASE WHEN EXISTS (
      SELECT 1 FROM processos_audiencias au
      WHERE au.processo_id = p.id
        AND au.realizada = false
        AND au.data_hora BETWEEN now() AND now() + interval '3 days'
    ) THEN 'audiencia_proxima' END,

    CASE WHEN EXISTS (
      SELECT 1 FROM processos_movimentacoes m
      WHERE m.processo_id = p.id
      ORDER BY m.data_movimento DESC
      LIMIT 1
      HAVING MAX(m.data_movimento) < now() - interval '90 days'
    ) THEN 'processo_parado' END

  ], NULL) as razoes_criticidade,

  -- Contadores
  (SELECT COUNT(*) FROM processos_prazos pr
   WHERE pr.processo_id = p.id AND pr.status = 'aberto'
  ) as prazos_abertos,

  (SELECT COUNT(*) FROM processos_movimentacoes m
   WHERE m.processo_id = p.id AND m.lida = false
  ) as movimentacoes_nao_lidas,

  (SELECT MAX(data_movimento) FROM processos_movimentacoes m
   WHERE m.processo_id = p.id
  ) as ultima_movimentacao

FROM processos_processos p
JOIN crm_clientes c ON c.id = p.cliente_id
JOIN profiles prof ON prof.id = p.responsavel_id

WHERE p.status IN ('ativo', 'suspenso')
  AND (
    -- Tem prazo vencendo em 3 dias
    EXISTS (
      SELECT 1 FROM processos_prazos pr
      WHERE pr.processo_id = p.id
        AND pr.status = 'aberto'
        AND pr.data_limite <= CURRENT_DATE + 3
    )
    OR
    -- Tem movimentação importante não lida
    EXISTS (
      SELECT 1 FROM processos_movimentacoes m
      WHERE m.processo_id = p.id
        AND m.lida = false
        AND m.importante = true
    )
    OR
    -- Risco alto
    p.risco = 'alto'
    OR
    -- Prioridade alta
    p.prioridade = 'alta'
    OR
    -- Audiência nos próximos 3 dias
    EXISTS (
      SELECT 1 FROM processos_audiencias au
      WHERE au.processo_id = p.id
        AND au.realizada = false
        AND au.data_hora BETWEEN now() AND now() + interval '3 days'
    )
  );

COMMENT ON VIEW v_processos_criticos IS 'Processos que requerem atenção urgente';

-- =====================================================
-- VIEW: v_processos_por_responsavel
-- =====================================================

CREATE OR REPLACE VIEW v_processos_por_responsavel AS
SELECT
  p.escritorio_id,
  p.responsavel_id,
  prof.nome as responsavel_nome,

  COUNT(*) as total_processos,
  COUNT(*) FILTER (WHERE p.status = 'ativo') as processos_ativos,
  COUNT(*) FILTER (WHERE p.prioridade = 'alta') as processos_prioridade_alta,

  -- Prazos
  (SELECT COUNT(*)
   FROM processos_prazos pr
   WHERE pr.responsavel_id = p.responsavel_id
     AND pr.status = 'aberto'
  ) as prazos_abertos,

  (SELECT COUNT(*)
   FROM processos_prazos pr
   WHERE pr.responsavel_id = p.responsavel_id
     AND pr.status = 'aberto'
     AND pr.data_limite <= CURRENT_DATE + 3
  ) as prazos_urgentes,

  -- Movimentações
  (SELECT COUNT(*)
   FROM processos_movimentacoes m
   JOIN processos_processos proc ON proc.id = m.processo_id
   WHERE proc.responsavel_id = p.responsavel_id
     AND m.lida = false
  ) as movimentacoes_nao_lidas

FROM processos_processos p
JOIN profiles prof ON prof.id = p.responsavel_id
GROUP BY p.escritorio_id, p.responsavel_id, prof.nome;

COMMENT ON VIEW v_processos_por_responsavel IS 'Distribuição de processos por advogado responsável';

-- =====================================================
-- FUNCTION: create_processo
-- =====================================================

CREATE OR REPLACE FUNCTION create_processo(p_dados jsonb)
RETURNS jsonb AS $$
DECLARE
  v_processo_id uuid;
  v_parte jsonb;
  v_resultado jsonb;
BEGIN
  -- Inserir processo principal
  INSERT INTO processos_processos (
    escritorio_id,
    numero_cnj,
    numero_interno,
    tipo,
    area,
    fase,
    instancia,
    rito,
    valor_causa,
    tribunal,
    comarca,
    vara,
    data_distribuicao,
    cliente_id,
    polo_cliente,
    responsavel_id,
    prioridade,
    observacoes,
    estrategia,
    objeto_acao,
    created_by
  )
  VALUES (
    (p_dados->>'escritorio_id')::uuid,
    p_dados->>'numero_cnj',
    p_dados->>'numero_interno',
    p_dados->>'tipo',
    p_dados->>'area',
    p_dados->>'fase',
    p_dados->>'instancia',
    p_dados->>'rito',
    (p_dados->>'valor_causa')::numeric,
    p_dados->>'tribunal',
    p_dados->>'comarca',
    p_dados->>'vara',
    (p_dados->>'data_distribuicao')::date,
    (p_dados->>'cliente_id')::uuid,
    p_dados->>'polo_cliente',
    (p_dados->>'responsavel_id')::uuid,
    COALESCE(p_dados->>'prioridade', 'media'),
    p_dados->>'observacoes',
    p_dados->>'estrategia',
    p_dados->>'objeto_acao',
    auth.uid()
  )
  RETURNING id INTO v_processo_id;

  -- Inserir partes (se fornecidas)
  IF p_dados ? 'partes' THEN
    FOR v_parte IN SELECT * FROM jsonb_array_elements(p_dados->'partes')
    LOOP
      INSERT INTO processos_partes (
        processo_id,
        tipo,
        cliente_id,
        nome,
        cpf_cnpj,
        qualificacao,
        advogados
      ) VALUES (
        v_processo_id,
        v_parte->>'tipo',
        (v_parte->>'cliente_id')::uuid,
        v_parte->>'nome',
        v_parte->>'cpf_cnpj',
        v_parte->>'qualificacao',
        CASE
          WHEN v_parte ? 'advogados' THEN
            ARRAY(SELECT jsonb_array_elements_text(v_parte->'advogados'))
          ELSE NULL
        END
      );
    END LOOP;
  END IF;

  -- Buscar processo completo
  v_resultado := get_processo_completo(v_processo_id);

  RETURN v_resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_processo IS 'Cria processo com validações e partes associadas';

-- =====================================================
-- FUNCTION: get_processo_completo
-- =====================================================

CREATE OR REPLACE FUNCTION get_processo_completo(p_processo_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_resultado jsonb;
BEGIN
  SELECT jsonb_build_object(
    'processo', row_to_json(p.*),
    'cliente', row_to_json(c.*),
    'responsavel', jsonb_build_object(
      'id', resp.id,
      'nome', resp.nome,
      'email', resp.email
    ),
    'partes', (
      SELECT COALESCE(jsonb_agg(row_to_json(pt.*)), '[]'::jsonb)
      FROM processos_partes pt
      WHERE pt.processo_id = p.id
    ),
    'equipe', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'user_id', e.user_id,
          'nome', prof.nome,
          'papel', e.papel,
          'pode_editar', e.pode_editar
        )
      ), '[]'::jsonb)
      FROM processos_equipe e
      JOIN profiles prof ON prof.id = e.user_id
      WHERE e.processo_id = p.id
    ),
    'tags', (
      SELECT COALESCE(jsonb_agg(t.tag), '[]'::jsonb)
      FROM processos_tags t
      WHERE t.processo_id = p.id
    ),
    'movimentacoes_recentes', (
      SELECT COALESCE(jsonb_agg(row_to_json(m.*)), '[]'::jsonb)
      FROM (
        SELECT * FROM processos_movimentacoes
        WHERE processo_id = p.id
        ORDER BY data_movimento DESC
        LIMIT 5
      ) m
    ),
    'proximos_prazos', (
      SELECT COALESCE(jsonb_agg(row_to_json(pr.*)), '[]'::jsonb)
      FROM (
        SELECT * FROM processos_prazos
        WHERE processo_id = p.id
          AND status = 'aberto'
        ORDER BY data_limite ASC
        LIMIT 3
      ) pr
    ),
    'contadores', jsonb_build_object(
      'movimentacoes', (SELECT COUNT(*) FROM processos_movimentacoes WHERE processo_id = p.id),
      'movimentacoes_nao_lidas', (SELECT COUNT(*) FROM processos_movimentacoes WHERE processo_id = p.id AND lida = false),
      'prazos_abertos', (SELECT COUNT(*) FROM processos_prazos WHERE processo_id = p.id AND status = 'aberto'),
      'pecas', (SELECT COUNT(*) FROM processos_pecas WHERE processo_id = p.id AND is_versao_atual = true),
      'documentos', (SELECT COUNT(*) FROM processos_documentos WHERE processo_id = p.id),
      'audiencias', (SELECT COUNT(*) FROM processos_audiencias WHERE processo_id = p.id),
      'jurisprudencias', (SELECT COUNT(*) FROM processos_jurisprudencias WHERE processo_id = p.id)
    ),
    'monitoramento', (
      SELECT row_to_json(m.*)
      FROM processos_monitoramento m
      WHERE m.processo_id = p.id
    )
  )
  INTO v_resultado
  FROM processos_processos p
  JOIN crm_clientes c ON c.id = p.cliente_id
  JOIN profiles resp ON resp.id = p.responsavel_id
  WHERE p.id = p_processo_id;

  RETURN v_resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_processo_completo IS 'Retorna processo com todos dados relacionados em JSON';

-- =====================================================
-- FUNCTION: add_movimentacao
-- =====================================================

CREATE OR REPLACE FUNCTION add_movimentacao(
  p_processo_id uuid,
  p_dados jsonb
)
RETURNS uuid AS $$
DECLARE
  v_movimentacao_id uuid;
  v_processo record;
  v_tem_prazo boolean;
BEGIN
  -- Buscar dados do processo
  SELECT * INTO v_processo
  FROM processos_processos
  WHERE id = p_processo_id;

  -- Detectar se tem prazo (simplificado - pode ser melhorado com IA)
  v_tem_prazo := (
    (p_dados->>'descricao') ILIKE '%intima%' OR
    (p_dados->>'descricao') ILIKE '%prazo%' OR
    (p_dados->>'descricao') ILIKE '%dias%' OR
    (p_dados->>'tipo_descricao') ILIKE '%intimação%'
  );

  -- Inserir movimentação
  INSERT INTO processos_movimentacoes (
    processo_id,
    escritorio_id,
    data_movimento,
    tipo_codigo,
    tipo_descricao,
    descricao,
    conteudo_completo,
    origem,
    fonte_url,
    importante,
    tem_prazo,
    metadata,
    created_by
  ) VALUES (
    p_processo_id,
    v_processo.escritorio_id,
    COALESCE((p_dados->>'data_movimento')::timestamptz, now()),
    p_dados->>'tipo_codigo',
    p_dados->>'tipo_descricao',
    p_dados->>'descricao',
    p_dados->>'conteudo_completo',
    COALESCE(p_dados->>'origem', 'manual'),
    p_dados->>'fonte_url',
    COALESCE((p_dados->>'importante')::boolean, false),
    v_tem_prazo,
    p_dados->'metadata',
    auth.uid()
  )
  RETURNING id INTO v_movimentacao_id;

  RETURN v_movimentacao_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION add_movimentacao IS 'Adiciona movimentação com detecção automática de prazos';
