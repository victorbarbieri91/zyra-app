-- Fase 1 — Correção pontual da FAT-2026-015
-- A receita filha foi criada pelo pagar_fatura antigo com valor=líquido (603,57)
-- em vez de bruto (633). Depois atualizar_retencoes_fatura aplicou retenção sobre
-- esse 603,57, virando o líquido em 574,14 (retenção dupla).
-- Aqui restauramos: valor=633 (bruto), valor_liquido=603,57, total_retencoes=29,43.
-- valor_pago mantém 603,57 (o que cliente realmente pagou) — dashboard intacto.

UPDATE financeiro_receitas r
SET valor = f.valor_total,
    valor_bruto = f.valor_total,
    valor_liquido = COALESCE(f.valor_liquido, f.valor_total),
    total_retencoes = COALESCE(f.total_retencoes, 0),
    observacoes = COALESCE(r.observacoes, '') || ' [corrigida 2026-04-25: valor=bruto, líquido=valor_pago real]',
    updated_at = NOW()
FROM financeiro_faturamento_faturas f
WHERE r.fatura_id = f.id
  AND f.numero_fatura = 'FAT-2026-015';
