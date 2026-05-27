-- Cleanup: remove fluxo_status (legado da página /custas-despesas que foi incorporada em /receitas-despesas)
--
-- Decisão consolidada: o campo `status` (despesa_status_enum) é a única fonte da verdade.
-- O enum despesa_status_enum já foi expandido com 'agendado' e 'liberado', cobrindo o workflow completo.
-- O `fluxo_status` (enum despesa_fluxo_status) era um campo paralelo mantido por sync, agora obsoleto.

-- 1. Refatorar trigger_gerar_parcelas_despesa: remover insert de fluxo_status
CREATE OR REPLACE FUNCTION public.trigger_gerar_parcelas_despesa()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_parcela_valor NUMERIC(15,2);
  v_parcela_vencimento DATE;
  v_ultimo_valor NUMERIC(15,2);
  i INTEGER;
BEGIN
  IF NEW.parcelado = true AND NEW.numero_parcelas > 1 THEN
    v_parcela_valor := ROUND(NEW.valor / NEW.numero_parcelas, 2);
    v_ultimo_valor := NEW.valor - (v_parcela_valor * (NEW.numero_parcelas - 1));
    v_parcela_vencimento := NEW.data_vencimento;

    FOR i IN 1..NEW.numero_parcelas LOOP
      INSERT INTO financeiro_despesas (
        escritorio_id, categoria, fornecedor, descricao, valor,
        data_vencimento, despesa_pai_id, numero_parcela,
        processo_id, consultivo_id, cliente_id,
        reembolsavel, reembolso_status,
        status, advogado_id
      ) VALUES (
        NEW.escritorio_id,
        NEW.categoria,
        NEW.fornecedor,
        'Parcela ' || i || '/' || NEW.numero_parcelas || ' - ' || NEW.descricao,
        CASE WHEN i = NEW.numero_parcelas THEN v_ultimo_valor ELSE v_parcela_valor END,
        (v_parcela_vencimento + ((i - 1) * INTERVAL '1 month'))::date,
        NEW.id,
        i,
        NEW.processo_id,
        NEW.consultivo_id,
        NEW.cliente_id,
        NEW.reembolsavel,
        CASE WHEN NEW.reembolsavel THEN 'pendente' ELSE NULL END,
        'pendente',
        NEW.advogado_id
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;

-- 2. Refatorar trigger_auto_quitar_despesa_liberada: remover bloco de sync de fluxo_status
CREATE OR REPLACE FUNCTION public.trigger_auto_quitar_despesa_liberada()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.status = 'liberado'::despesa_status_enum
     AND COALESCE(NEW.auto_pagamento, true) = true
     AND NEW.data_pagamento_programada IS NOT NULL
     AND NEW.data_pagamento_programada <= CURRENT_DATE
  THEN
    NEW.status         := 'pago'::despesa_status_enum;
    NEW.data_pagamento := NEW.data_pagamento_programada;
  END IF;
  RETURN NEW;
END;
$function$;

-- 3. Dropar trigger sync_despesa_fluxo_status e função correspondente
DROP TRIGGER IF EXISTS trigger_sync_despesa_fluxo_status ON public.financeiro_despesas;
DROP FUNCTION IF EXISTS public.sync_despesa_fluxo_status();

-- 4. Dropar cron job vestigial e função efetivar_custas_liberadas
--    (essa função só atuava quando havia divergência status/fluxo_status,
--    causada pela página antiga que não existe mais)
DO $$
BEGIN
  PERFORM cron.unschedule('efetivar-custas-liberadas');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'cron job efetivar-custas-liberadas não encontrado ou já removido';
END $$;

DROP FUNCTION IF EXISTS public.efetivar_custas_liberadas();

-- 5. Dropar coluna fluxo_status
ALTER TABLE public.financeiro_despesas DROP COLUMN IF EXISTS fluxo_status;

-- 6. Dropar enum despesa_fluxo_status (só depois que a coluna sumiu)
DROP TYPE IF EXISTS public.despesa_fluxo_status;
