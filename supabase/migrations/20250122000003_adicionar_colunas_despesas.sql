-- Migration: Adicionar colunas em financeiro_despesas
-- Data: 2025-01-22
-- Descrição: Adiciona suporte a comissões, reembolsos e recorrência em despesas

-- ============================================================
-- 1. ADICIONAR NOVAS COLUNAS
-- ============================================================

-- Coluna para comissões de advogados
ALTER TABLE financeiro_despesas
ADD COLUMN IF NOT EXISTS advogado_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN financeiro_despesas.advogado_id IS
'Para despesas de categoria "comissao": ID do advogado que recebe a comissão';

-- Colunas para despesas reembolsáveis
ALTER TABLE financeiro_despesas
ADD COLUMN IF NOT EXISTS reembolsavel BOOLEAN DEFAULT false;

ALTER TABLE financeiro_despesas
ADD COLUMN IF NOT EXISTS reembolsado BOOLEAN DEFAULT false;

ALTER TABLE financeiro_despesas
ADD COLUMN IF NOT EXISTS reembolso_fatura_id UUID REFERENCES financeiro_faturamento_faturas(id) ON DELETE SET NULL;

COMMENT ON COLUMN financeiro_despesas.reembolsavel IS
'Se esta despesa pode ser reembolsada pelo cliente';

COMMENT ON COLUMN financeiro_despesas.reembolsado IS
'Se esta despesa já foi reembolsada (incluída em fatura)';

COMMENT ON COLUMN financeiro_despesas.reembolso_fatura_id IS
'ID da fatura onde esta despesa foi incluída como reembolso';

-- Colunas para recorrência
ALTER TABLE financeiro_despesas
ADD COLUMN IF NOT EXISTS recorrente BOOLEAN DEFAULT false;

ALTER TABLE financeiro_despesas
ADD COLUMN IF NOT EXISTS config_recorrencia JSONB;

ALTER TABLE financeiro_despesas
ADD COLUMN IF NOT EXISTS despesa_pai_id UUID REFERENCES financeiro_despesas(id) ON DELETE SET NULL;

COMMENT ON COLUMN financeiro_despesas.recorrente IS
'Se esta despesa é recorrente (gera novas despesas automaticamente)';

COMMENT ON COLUMN financeiro_despesas.config_recorrencia IS
'Configuração de recorrência: {frequencia, dia_vencimento, data_inicio, data_fim, gerar_automatico, ultima_geracao}';

COMMENT ON COLUMN financeiro_despesas.despesa_pai_id IS
'Para despesas geradas por recorrência: referência à despesa pai (template)';

-- ============================================================
-- 2. ADICIONAR CATEGORIA COMISSAO
-- ============================================================

-- Atualizar constraint de categorias para incluir 'comissao'
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
  'comissao'::text,
  'honorarios_perito'::text,
  'oficial_justica'::text,
  'correios'::text,
  'cartorio'::text,
  'copia'::text,
  'deslocamento'::text,
  'hospedagem'::text,
  'publicacao'::text,
  'certidao'::text,
  'protesto'::text,
  'outra'::text,
  'outros'::text
]));

-- ============================================================
-- 3. ÍNDICES PARA NOVAS COLUNAS
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_despesas_advogado
  ON financeiro_despesas(advogado_id)
  WHERE advogado_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_despesas_reembolsavel
  ON financeiro_despesas(escritorio_id, reembolsavel)
  WHERE reembolsavel = true AND reembolsado = false;

CREATE INDEX IF NOT EXISTS idx_despesas_recorrente
  ON financeiro_despesas(escritorio_id, recorrente)
  WHERE recorrente = true;

CREATE INDEX IF NOT EXISTS idx_despesas_pai
  ON financeiro_despesas(despesa_pai_id)
  WHERE despesa_pai_id IS NOT NULL;

-- ============================================================
-- 4. TRIGGER PARA GERAR DESPESAS RECORRENTES
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_gerar_despesa_recorrente()
RETURNS TRIGGER AS $$
DECLARE
  v_config JSONB;
  v_frequencia TEXT;
  v_intervalo INTERVAL;
  v_proximo_vencimento DATE;
  v_data_fim DATE;
BEGIN
  -- Só processa se é uma despesa recorrente com config
  IF NEW.recorrente = true AND NEW.config_recorrencia IS NOT NULL AND NEW.despesa_pai_id IS NULL THEN
    v_config := NEW.config_recorrencia;
    v_frequencia := v_config->>'frequencia';
    v_data_fim := (v_config->>'data_fim')::date;

    -- Determinar intervalo baseado na frequência
    v_intervalo := CASE v_frequencia
      WHEN 'mensal' THEN INTERVAL '1 month'
      WHEN 'trimestral' THEN INTERVAL '3 months'
      WHEN 'semestral' THEN INTERVAL '6 months'
      WHEN 'anual' THEN INTERVAL '1 year'
      ELSE INTERVAL '1 month'
    END;

    -- Calcular próximo vencimento
    v_proximo_vencimento := NEW.data_vencimento + v_intervalo;

    -- Se ainda está dentro do período, atualizar última geração
    IF v_data_fim IS NULL OR v_proximo_vencimento <= v_data_fim THEN
      NEW.config_recorrencia := jsonb_set(
        NEW.config_recorrencia,
        '{ultima_geracao}',
        to_jsonb(NEW.data_vencimento::text)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_despesa_recorrente ON financeiro_despesas;
CREATE TRIGGER trigger_despesa_recorrente
  BEFORE INSERT OR UPDATE ON financeiro_despesas
  FOR EACH ROW
  WHEN (NEW.recorrente = true)
  EXECUTE FUNCTION trigger_gerar_despesa_recorrente();

-- ============================================================
-- 5. VIEW: DESPESAS REEMBOLSÁVEIS PENDENTES
-- ============================================================

CREATE OR REPLACE VIEW v_despesas_reembolsaveis_pendentes AS
SELECT
  d.id,
  d.escritorio_id,
  d.descricao,
  d.valor,
  d.data_vencimento,
  d.data_pagamento,
  d.categoria,
  d.fornecedor,
  d.processo_id,
  p.numero_cnj as processo_numero,
  d.cliente_id,
  c.nome_completo as cliente_nome,
  d.created_at
FROM financeiro_despesas d
LEFT JOIN processos_processos p ON p.id = d.processo_id
LEFT JOIN crm_pessoas c ON c.id = d.cliente_id
WHERE d.reembolsavel = true
  AND d.reembolsado = false
  AND d.status IN ('pago', 'pendente');

COMMENT ON VIEW v_despesas_reembolsaveis_pendentes IS
'Despesas que podem ser incluídas em faturas como reembolso ao cliente';

-- ============================================================
-- 6. ATUALIZAR COMENTÁRIO DA COLUNA CATEGORIA
-- ============================================================

COMMENT ON COLUMN financeiro_despesas.categoria IS
'Categoria da despesa. Inclui: custas, fornecedor, folha, impostos, aluguel, marketing, capacitacao, material, tecnologia, viagem, alimentacao, combustivel, assinatura, cartao_credito, comissao, honorarios_perito, oficial_justica, correios, cartorio, copia, deslocamento, hospedagem, publicacao, certidao, protesto, outra, outros';
