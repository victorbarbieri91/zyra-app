-- =====================================================
-- FIX: Adicionar itens às faturas existentes
-- =====================================================
-- Este script verifica faturas sem itens e cria os itens baseado
-- nos honorários e timesheet associados

DO $$
DECLARE
  v_fatura RECORD;
  v_honorario RECORD;
  v_timesheet RECORD;
BEGIN
  RAISE NOTICE '===== VERIFICANDO FATURAS SEM ITENS =====';

  -- Para cada fatura
  FOR v_fatura IN
    SELECT f.id, f.cliente_id, f.numero_fatura,
           (SELECT COUNT(*) FROM financeiro_faturamento_itens WHERE fatura_id = f.id) as qtd_itens
    FROM financeiro_faturamento_faturas f
    ORDER BY f.created_at DESC
  LOOP
    RAISE NOTICE 'Fatura: % (% itens)', v_fatura.numero_fatura, v_fatura.qtd_itens;

    IF v_fatura.qtd_itens = 0 THEN
      RAISE NOTICE '  ⚠️  Fatura sem itens! Criando...';

      -- Criar itens para honorários desta fatura
      FOR v_honorario IN
        SELECT h.*
        FROM financeiro_honorarios h
        WHERE h.fatura_id = v_fatura.id
      LOOP
        INSERT INTO financeiro_faturamento_itens (
          fatura_id,
          tipo_item,
          descricao,
          processo_id,
          consulta_id,
          quantidade,
          valor_unitario,
          valor_total,
          referencia_id
        ) VALUES (
          v_fatura.id,
          'honorario',
          v_honorario.descricao,
          v_honorario.processo_id,
          v_honorario.consulta_id,
          1,
          v_honorario.valor_total,
          v_honorario.valor_total,
          v_honorario.id
        );

        RAISE NOTICE '    ✓ Item honorário criado: %', v_honorario.descricao;
      END LOOP;

      -- Criar itens para timesheet desta fatura (agrupados por atividade)
      FOR v_timesheet IN
        SELECT
          t.atividade as descricao,
          t.processo_id,
          NULL::uuid as consulta_id,
          SUM(t.horas) as total_horas,
          array_agg(t.id) as timesheet_ids
        FROM financeiro_timesheet t
        WHERE t.fatura_id = v_fatura.id
        GROUP BY t.atividade, t.processo_id
      LOOP
        INSERT INTO financeiro_faturamento_itens (
          fatura_id,
          tipo_item,
          descricao,
          processo_id,
          consulta_id,
          quantidade,
          valor_unitario,
          valor_total,
          timesheet_ids
        ) VALUES (
          v_fatura.id,
          'timesheet',
          v_timesheet.descricao,
          v_timesheet.processo_id,
          v_timesheet.consulta_id,
          v_timesheet.total_horas,
          NULL,
          0, -- Será calculado depois se houver valor_hora
          v_timesheet.timesheet_ids
        );

        RAISE NOTICE '    ✓ Item timesheet criado: % (% horas)', v_timesheet.descricao, v_timesheet.total_horas;
      END LOOP;

    ELSE
      RAISE NOTICE '  ✓ Fatura já tem itens';
    END IF;
  END LOOP;

  RAISE NOTICE '===== FIX CONCLUÍDO =====';
END $$;

-- Verificar resultado
SELECT
  f.numero_fatura,
  f.status,
  (SELECT COUNT(*) FROM financeiro_faturamento_itens WHERE fatura_id = f.id) as qtd_itens,
  (SELECT COUNT(*) FROM financeiro_faturamento_itens WHERE fatura_id = f.id AND tipo_item = 'honorario') as qtd_honorarios,
  (SELECT COUNT(*) FROM financeiro_faturamento_itens WHERE fatura_id = f.id AND tipo_item = 'timesheet') as qtd_timesheet
FROM financeiro_faturamento_faturas f
ORDER BY f.created_at DESC;
