-- =====================================================
-- FASE 1.1: Backfill cirúrgico de formas_pagamento
-- =====================================================
-- Popula formas_pagamento APENAS nos contratos onde está vazio,
-- copiando o forma_cobranca atual como única forma do array.
--
-- IMPORTANTE: o WHERE garante que NÃO toca nos contratos já
-- populados (incluindo os híbridos com múltiplas formas).
-- =====================================================

UPDATE financeiro_contratos_honorarios
SET formas_pagamento = jsonb_build_array(
  jsonb_build_object('forma', forma_cobranca, 'ordem', 0)
)
WHERE (formas_pagamento IS NULL
   OR jsonb_typeof(formas_pagamento) != 'array'
   OR jsonb_array_length(formas_pagamento) = 0)
  AND forma_cobranca IS NOT NULL;
