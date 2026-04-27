-- Fase 1 — Limpeza geral de campos de retenção em receitas filhas
-- Zera valor_bruto/valor_liquido/total_retencoes em TODAS as receitas vinculadas a fatura.
-- Retenção pertence à fatura. Receitas filhas têm valor_bruto = valor_liquido = valor,
-- total_retencoes = 0. Não toca em `valor` nem `valor_pago` — dashboards intactos.

UPDATE financeiro_receitas r
SET valor_bruto = r.valor,
    valor_liquido = r.valor,
    total_retencoes = 0,
    updated_at = NOW()
WHERE r.fatura_id IS NOT NULL
  AND (r.total_retencoes > 0 OR r.valor_liquido <> r.valor OR r.valor_bruto <> r.valor);
