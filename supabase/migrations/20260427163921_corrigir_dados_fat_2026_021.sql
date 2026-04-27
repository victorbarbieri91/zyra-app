-- Fase 1 — Correção pontual da FAT-2026-021 (retenção concentrada)
-- A fatura tem valor R$ 6.702 (timesheet + honorário avulso), mas só tem 1 receita filha
-- pré-existente de R$ 2.400. O atualizar_retencoes_fatura antigo propagou TODA a retenção
-- da fatura (412,17) para essa única receita (fator 1).
-- Aqui zeramos a retenção residual na receita — retenção fica só na fatura mãe.

UPDATE financeiro_receitas r
SET valor_bruto = r.valor,
    valor_liquido = r.valor,
    total_retencoes = 0,
    observacoes = COALESCE(r.observacoes, '') || ' [corrigida 2026-04-25: retenção zerada — pertence à fatura]',
    updated_at = NOW()
FROM financeiro_faturamento_faturas f
WHERE r.fatura_id = f.id
  AND f.numero_fatura = 'FAT-2026-021';
