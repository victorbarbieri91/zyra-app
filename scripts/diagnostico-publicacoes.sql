-- ============================================
-- DIAGNÓSTICO DE PUBLICAÇÕES - ZYRA LEGAL
-- ============================================
-- Execute este script no Supabase SQL Editor
-- para verificar o estado real das publicações

-- ============================================
-- 1. TOTAL GERAL DE PUBLICAÇÕES
-- ============================================
SELECT
  'TOTAL GERAL' as categoria,
  COUNT(*) as quantidade
FROM publicacoes_publicacoes;

-- ============================================
-- 2. BREAKDOWN POR STATUS
-- ============================================
SELECT
  'STATUS: ' || COALESCE(status, 'NULL') as categoria,
  COUNT(*) as quantidade
FROM publicacoes_publicacoes
GROUP BY status
ORDER BY quantidade DESC;

-- ============================================
-- 3. BREAKDOWN POR FONTE (AASP vs ESCAVADOR)
-- ============================================
SELECT
  CASE
    WHEN aasp_id IS NOT NULL THEN 'AASP'
    WHEN escavador_aparicao_id IS NOT NULL THEN 'Diário Oficial (Escavador)'
    ELSE 'Outra fonte'
  END as fonte,
  COUNT(*) as quantidade
FROM publicacoes_publicacoes
GROUP BY
  CASE
    WHEN aasp_id IS NOT NULL THEN 'AASP'
    WHEN escavador_aparicao_id IS NOT NULL THEN 'Diário Oficial (Escavador)'
    ELSE 'Outra fonte'
  END
ORDER BY quantidade DESC;

-- ============================================
-- 4. PUBLICAÇÕES DOS ÚLTIMOS 7 DIAS (por data de captura)
-- ============================================
SELECT
  DATE(data_captura) as dia_captura,
  CASE
    WHEN aasp_id IS NOT NULL THEN 'AASP'
    ELSE 'Escavador'
  END as fonte,
  status,
  COUNT(*) as quantidade
FROM publicacoes_publicacoes
WHERE data_captura >= NOW() - INTERVAL '7 days'
GROUP BY DATE(data_captura),
  CASE WHEN aasp_id IS NOT NULL THEN 'AASP' ELSE 'Escavador' END,
  status
ORDER BY dia_captura DESC, fonte, status;

-- ============================================
-- 5. PUBLICAÇÕES PENDENTES (que deveriam aparecer na lista)
-- ============================================
SELECT
  id,
  data_publicacao,
  tribunal,
  tipo_publicacao,
  numero_processo,
  status,
  urgente,
  CASE
    WHEN aasp_id IS NOT NULL THEN 'AASP'
    ELSE 'Escavador'
  END as fonte,
  LEFT(texto_completo, 100) as texto_preview
FROM publicacoes_publicacoes
WHERE status IN ('pendente', 'em_analise')
ORDER BY data_publicacao DESC
LIMIT 20;

-- ============================================
-- 6. VERIFICAR DUPLICATAS POR HASH
-- ============================================
SELECT
  'DUPLICATAS POR HASH' as tipo,
  hash_conteudo,
  COUNT(*) as qtd_duplicatas
FROM publicacoes_publicacoes
WHERE hash_conteudo IS NOT NULL
GROUP BY hash_conteudo
HAVING COUNT(*) > 1
ORDER BY qtd_duplicatas DESC
LIMIT 10;

-- ============================================
-- 7. DUPLICATAS POR NUMERO_PROCESSO + DATA + TIPO
-- ============================================
SELECT
  'DUPLICATAS POR PROCESSO+DATA+TIPO' as tipo,
  numero_processo,
  data_publicacao,
  tipo_publicacao,
  COUNT(*) as qtd_duplicatas
FROM publicacoes_publicacoes
WHERE numero_processo IS NOT NULL
GROUP BY numero_processo, data_publicacao, tipo_publicacao
HAVING COUNT(*) > 1
ORDER BY qtd_duplicatas DESC
LIMIT 10;

-- ============================================
-- 8. HISTÓRICO DE SINCRONIZAÇÕES AASP (últimos 7 dias)
-- ============================================
SELECT
  'SYNC AASP' as fonte,
  DATE(data_inicio) as dia,
  tipo,
  SUM(publicacoes_novas) as total_novas,
  COUNT(*) as qtd_syncs
FROM publicacoes_sincronizacoes
WHERE data_inicio >= NOW() - INTERVAL '7 days'
GROUP BY DATE(data_inicio), tipo
ORDER BY dia DESC;

-- ============================================
-- 9. HISTÓRICO DE SINCRONIZAÇÕES ESCAVADOR (últimos 7 dias)
-- ============================================
SELECT
  'SYNC ESCAVADOR' as fonte,
  DATE(data_inicio) as dia,
  tipo,
  SUM(publicacoes_novas) as total_novas,
  SUM(publicacoes_duplicadas) as total_duplicadas,
  COUNT(*) as qtd_syncs
FROM publicacoes_sync_escavador
WHERE data_inicio >= NOW() - INTERVAL '7 days'
GROUP BY DATE(data_inicio), tipo
ORDER BY dia DESC;

-- ============================================
-- 10. TERMOS ESCAVADOR CONFIGURADOS
-- ============================================
SELECT
  termo,
  escavador_status,
  escavador_monitoramento_id IS NOT NULL as registrado_no_escavador,
  ativo,
  total_aparicoes,
  ultima_sync,
  escavador_erro
FROM publicacoes_termos_escavador
ORDER BY ativo DESC, termo;

-- ============================================
-- 11. ASSOCIADOS AASP CONFIGURADOS
-- ============================================
SELECT
  nome,
  oab_numero,
  oab_uf,
  ativo,
  ultima_sync,
  publicacoes_sync_count
FROM publicacoes_associados
ORDER BY ativo DESC, nome;

-- ============================================
-- RESUMO FINAL
-- ============================================
SELECT
  'RESUMO' as tipo,
  (SELECT COUNT(*) FROM publicacoes_publicacoes) as total_publicacoes,
  (SELECT COUNT(*) FROM publicacoes_publicacoes WHERE status = 'pendente') as pendentes,
  (SELECT COUNT(*) FROM publicacoes_publicacoes WHERE status = 'processada') as tratadas,
  (SELECT COUNT(*) FROM publicacoes_publicacoes WHERE status = 'arquivada') as arquivadas,
  (SELECT COUNT(*) FROM publicacoes_publicacoes WHERE aasp_id IS NOT NULL) as via_aasp,
  (SELECT COUNT(*) FROM publicacoes_publicacoes WHERE escavador_aparicao_id IS NOT NULL) as via_escavador,
  (SELECT COUNT(*) FROM publicacoes_termos_escavador WHERE ativo = true) as termos_escavador_ativos,
  (SELECT COUNT(*) FROM publicacoes_associados WHERE ativo = true) as associados_aasp_ativos;
