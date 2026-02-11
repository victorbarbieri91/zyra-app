-- Migration: Garantir responsavel_id em financeiro_receitas e atualizar trigger de parcelas
-- Data: 2026-02-08
-- Descrição: Adiciona coluna responsavel_id se não existir e atualiza trigger de parcelas
-- para copiar responsavel_id do pai para os filhos

-- ============================================================
-- 1. GARANTIR COLUNA responsavel_id
-- ============================================================

ALTER TABLE financeiro_receitas
  ADD COLUMN IF NOT EXISTS responsavel_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_receitas_responsavel
  ON financeiro_receitas(responsavel_id) WHERE responsavel_id IS NOT NULL;

-- ============================================================
-- 2. ATUALIZAR TRIGGER DE PARCELAS PARA COPIAR responsavel_id
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_gerar_parcelas_receita()
RETURNS TRIGGER AS $$
DECLARE
  v_parcela_valor NUMERIC(15,2);
  v_parcela_vencimento DATE;
  v_ultimo_valor NUMERIC(15,2);
  i INTEGER;
BEGIN
  -- Só gera parcelas para tipo='honorario' com parcelado=true
  IF NEW.tipo = 'honorario' AND NEW.parcelado = true AND NEW.numero_parcelas > 1 THEN
    -- Calcular valor de cada parcela (arredondado)
    v_parcela_valor := ROUND(NEW.valor / NEW.numero_parcelas, 2);

    -- Calcular valor da última parcela (para ajustar arredondamento)
    v_ultimo_valor := NEW.valor - (v_parcela_valor * (NEW.numero_parcelas - 1));

    -- Data do primeiro vencimento
    v_parcela_vencimento := NEW.data_vencimento;

    -- Gerar parcelas
    FOR i IN 1..NEW.numero_parcelas LOOP
      INSERT INTO financeiro_receitas (
        escritorio_id, tipo, cliente_id, processo_id, consulta_id, contrato_id,
        receita_pai_id, numero_parcela,
        descricao, categoria, valor,
        data_competencia, data_vencimento,
        status, created_by, responsavel_id
      ) VALUES (
        NEW.escritorio_id, 'parcela', NEW.cliente_id, NEW.processo_id, NEW.consulta_id, NEW.contrato_id,
        NEW.id, i,
        'Parcela ' || i || '/' || NEW.numero_parcelas || ' - ' || NEW.descricao,
        NEW.categoria,
        CASE WHEN i = NEW.numero_parcelas THEN v_ultimo_valor ELSE v_parcela_valor END,
        DATE_TRUNC('month', v_parcela_vencimento + ((i - 1) * INTERVAL '1 month'))::date,
        (v_parcela_vencimento + ((i - 1) * INTERVAL '1 month'))::date,
        'pendente', NEW.created_by, NEW.responsavel_id
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
