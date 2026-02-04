-- Migration: Padronização de ENUMs do Módulo Financeiro
-- Data: 2025-01-21
-- Descrição: Unifica valores de ENUM entre tabelas e corrige inconsistências

-- ============================================================
-- 1. FORMA_PAGAMENTO - Padronizar em todas as tabelas
-- ============================================================

-- O padrão será: dinheiro, pix, ted, boleto, cartao_credito, cartao_debito
-- A tabela financeiro_faturamento_faturas usava valores diferentes

-- Migrar dados existentes antes de alterar constraint
UPDATE financeiro_faturamento_faturas
SET forma_pagamento_preferencial =
  CASE forma_pagamento_preferencial
    WHEN 'cartao' THEN 'cartao_credito'
    WHEN 'transferencia' THEN 'ted'
    ELSE forma_pagamento_preferencial
  END
WHERE forma_pagamento_preferencial IN ('cartao', 'transferencia');

-- Atualizar constraint
ALTER TABLE financeiro_faturamento_faturas
DROP CONSTRAINT IF EXISTS faturas_forma_pagamento_preferencial_check;

ALTER TABLE financeiro_faturamento_faturas
ADD CONSTRAINT faturas_forma_pagamento_preferencial_check
CHECK (forma_pagamento_preferencial IS NULL OR forma_pagamento_preferencial = ANY (ARRAY[
  'dinheiro'::text,
  'pix'::text,
  'ted'::text,
  'boleto'::text,
  'cartao_credito'::text,
  'cartao_debito'::text
]));

-- ============================================================
-- 2. CATEGORIAS DE DESPESA - Unificar entre despesas e cartões
-- ============================================================

-- Padrão unificado de categorias:
-- custas, fornecedor, folha, impostos, aluguel, marketing, capacitacao,
-- material, tecnologia, viagem, alimentacao, combustivel, assinatura,
-- cartao_credito, outros

-- Migrar 'outras' para 'outros' em cartoes_credito_despesas
UPDATE cartoes_credito_despesas
SET categoria = 'outros'
WHERE categoria = 'outras';

-- Atualizar constraint em cartoes_credito_despesas
ALTER TABLE cartoes_credito_despesas
DROP CONSTRAINT IF EXISTS cartoes_credito_despesas_categoria_check;

ALTER TABLE cartoes_credito_despesas
ADD CONSTRAINT cartoes_credito_despesas_categoria_check
CHECK (categoria = ANY (ARRAY[
  'custas'::text,
  'fornecedor'::text,
  'folha'::text,
  'impostos'::text,
  'aluguel'::text,
  'marketing'::text,
  'capacitacao'::text,
  'material'::text,
  'tecnologia'::text,
  'viagem'::text,
  'alimentacao'::text,
  'combustivel'::text,
  'assinatura'::text,
  'outros'::text
]));

-- Atualizar constraint em financeiro_despesas para incluir categorias extras
ALTER TABLE financeiro_despesas
DROP CONSTRAINT IF EXISTS despesas_categoria_check;

ALTER TABLE financeiro_despesas
ADD CONSTRAINT despesas_categoria_check
CHECK (categoria = ANY (ARRAY[
  'custas'::text,
  'fornecedor'::text,
  'folha'::text,
  'impostos'::text,
  'aluguel'::text,
  'marketing'::text,
  'capacitacao'::text,
  'material'::text,
  'tecnologia'::text,
  'viagem'::text,
  'alimentacao'::text,
  'combustivel'::text,
  'assinatura'::text,
  'cartao_credito'::text,
  'outros'::text
]));

-- ============================================================
-- 3. ADICIONAR COMENTÁRIOS DOCUMENTANDO OS ENUMS
-- ============================================================

-- Documentar forma_pagamento
COMMENT ON COLUMN financeiro_contas_pagamentos.forma_pagamento IS
'Forma de pagamento. Valores: dinheiro, pix, ted, boleto, cartao_credito, cartao_debito';

COMMENT ON COLUMN financeiro_despesas.forma_pagamento IS
'Forma de pagamento. Valores: dinheiro, pix, ted, boleto, cartao_credito, cartao_debito';

COMMENT ON COLUMN financeiro_honorarios_parcelas.forma_pagamento IS
'Forma de pagamento. Valores: dinheiro, pix, ted, boleto, cartao_credito, cartao_debito';

COMMENT ON COLUMN financeiro_faturamento_faturas.forma_pagamento_preferencial IS
'Forma de pagamento preferencial. Valores: dinheiro, pix, ted, boleto, cartao_credito, cartao_debito';

-- Documentar categorias de despesa
COMMENT ON COLUMN financeiro_despesas.categoria IS
'Categoria da despesa. Valores: custas, fornecedor, folha, impostos, aluguel, marketing, capacitacao, material, tecnologia, viagem, alimentacao, combustivel, assinatura, cartao_credito, outros';

COMMENT ON COLUMN cartoes_credito_despesas.categoria IS
'Categoria da despesa. Valores: custas, fornecedor, folha, impostos, aluguel, marketing, capacitacao, material, tecnologia, viagem, alimentacao, combustivel, assinatura, outros';

-- Documentar status
COMMENT ON COLUMN financeiro_despesas.status IS
'Status da despesa. Valores: pendente, pago, cancelado';

COMMENT ON COLUMN financeiro_honorarios.status IS
'Status do honorário. Valores: rascunho, aprovado, faturado, cancelado';

COMMENT ON COLUMN financeiro_honorarios_parcelas.status IS
'Status da parcela. Valores: pendente, pago, atrasado, cancelado';

COMMENT ON COLUMN financeiro_faturamento_faturas.status IS
'Status da fatura. Valores: rascunho, emitida, enviada, paga, atrasada, cancelada';

COMMENT ON COLUMN cartoes_credito_faturas.status IS
'Status da fatura do cartão. Valores: aberta, fechada, paga, cancelada';

-- Documentar tipos
COMMENT ON COLUMN financeiro_honorarios.tipo_honorario IS
'Tipo do honorário. Valores: fixo, hora, exito, misto';

COMMENT ON COLUMN financeiro_contratos_honorarios.tipo_contrato IS
'Tipo do contrato. Valores: processo, consultoria, avulso, misto, fixo, hora, exito, recorrente';

COMMENT ON COLUMN financeiro_contratos_honorarios.forma_cobranca IS
'Forma de cobrança. Valores: fixo, por_hora, por_etapa, misto, por_pasta, por_ato, por_cargo';

COMMENT ON COLUMN financeiro_contas_bancarias.tipo_conta IS
'Tipo da conta bancária. Valores: corrente, poupanca, digital';

COMMENT ON COLUMN financeiro_contas_lancamentos.tipo IS
'Tipo do lançamento. Valores: entrada, saida, transferencia_entrada, transferencia_saida';

COMMENT ON COLUMN financeiro_contas_lancamentos.origem_tipo IS
'Origem do lançamento. Valores: pagamento, despesa, transferencia, manual';

-- Documentar bandeiras de cartão
COMMENT ON COLUMN cartoes_credito.bandeira IS
'Bandeira do cartão. Valores: visa, mastercard, elo, amex, hipercard, diners, outra';

-- ============================================================
-- 4. CRIAR VIEW DE REFERÊNCIA DE ENUMS
-- ============================================================

CREATE OR REPLACE VIEW v_financeiro_enums AS
SELECT
  'forma_pagamento' as campo,
  'Formas de pagamento padronizadas' as descricao,
  ARRAY['dinheiro', 'pix', 'ted', 'boleto', 'cartao_credito', 'cartao_debito'] as valores,
  ARRAY['financeiro_contas_pagamentos', 'financeiro_despesas', 'financeiro_honorarios_parcelas', 'financeiro_faturamento_faturas'] as tabelas_uso
UNION ALL
SELECT
  'categoria_despesa',
  'Categorias de despesas do escritório e cartões',
  ARRAY['custas', 'fornecedor', 'folha', 'impostos', 'aluguel', 'marketing', 'capacitacao', 'material', 'tecnologia', 'viagem', 'alimentacao', 'combustivel', 'assinatura', 'cartao_credito', 'outros'],
  ARRAY['financeiro_despesas', 'cartoes_credito_despesas']
UNION ALL
SELECT
  'status_despesa',
  'Status de despesas',
  ARRAY['pendente', 'pago', 'cancelado'],
  ARRAY['financeiro_despesas']
UNION ALL
SELECT
  'status_honorario',
  'Status de honorários',
  ARRAY['rascunho', 'aprovado', 'faturado', 'cancelado'],
  ARRAY['financeiro_honorarios']
UNION ALL
SELECT
  'status_parcela',
  'Status de parcelas de honorários',
  ARRAY['pendente', 'pago', 'atrasado', 'cancelado'],
  ARRAY['financeiro_honorarios_parcelas']
UNION ALL
SELECT
  'status_fatura',
  'Status de faturas de faturamento',
  ARRAY['rascunho', 'emitida', 'enviada', 'paga', 'atrasada', 'cancelada'],
  ARRAY['financeiro_faturamento_faturas']
UNION ALL
SELECT
  'status_fatura_cartao',
  'Status de faturas de cartão de crédito',
  ARRAY['aberta', 'fechada', 'paga', 'cancelada'],
  ARRAY['cartoes_credito_faturas']
UNION ALL
SELECT
  'tipo_honorario',
  'Tipos de honorários',
  ARRAY['fixo', 'hora', 'exito', 'misto'],
  ARRAY['financeiro_honorarios']
UNION ALL
SELECT
  'tipo_contrato',
  'Tipos de contrato de honorários',
  ARRAY['processo', 'consultoria', 'avulso', 'misto', 'fixo', 'hora', 'exito', 'recorrente'],
  ARRAY['financeiro_contratos_honorarios']
UNION ALL
SELECT
  'forma_cobranca',
  'Formas de cobrança em contratos',
  ARRAY['fixo', 'por_hora', 'por_etapa', 'misto', 'por_pasta', 'por_ato', 'por_cargo'],
  ARRAY['financeiro_contratos_honorarios', 'financeiro_contratos_formas']
UNION ALL
SELECT
  'tipo_conta_bancaria',
  'Tipos de conta bancária',
  ARRAY['corrente', 'poupanca', 'digital'],
  ARRAY['financeiro_contas_bancarias']
UNION ALL
SELECT
  'tipo_lancamento',
  'Tipos de lançamento bancário',
  ARRAY['entrada', 'saida', 'transferencia_entrada', 'transferencia_saida'],
  ARRAY['financeiro_contas_lancamentos']
UNION ALL
SELECT
  'origem_lancamento',
  'Origem dos lançamentos bancários',
  ARRAY['pagamento', 'despesa', 'transferencia', 'manual'],
  ARRAY['financeiro_contas_lancamentos']
UNION ALL
SELECT
  'bandeira_cartao',
  'Bandeiras de cartão de crédito',
  ARRAY['visa', 'mastercard', 'elo', 'amex', 'hipercard', 'diners', 'outra'],
  ARRAY['cartoes_credito'];

COMMENT ON VIEW v_financeiro_enums IS
'View de referência com todos os ENUMs padronizados do módulo financeiro';
