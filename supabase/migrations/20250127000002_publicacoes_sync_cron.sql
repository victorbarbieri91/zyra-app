-- ============================================
-- MIGRATION: Agendamento de Sincronização Automática de Publicações
-- ============================================
-- Configura pg_cron para executar sincronização às 07h e 15h (horário de Brasília)

-- Habilitar extensão pg_cron (se não estiver habilitada)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Habilitar extensão pg_net para chamadas HTTP
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================
-- FUNÇÃO PARA CHAMAR EDGE FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION public.trigger_publicacoes_sync_auto()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text;
  v_service_key text;
  v_request_id bigint;
BEGIN
  -- URL da Edge Function
  v_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/publicacoes-sync-auto';

  -- Service Role Key
  v_service_key := current_setting('app.settings.service_role_key', true);

  -- Log
  RAISE LOG 'Iniciando sincronização automática de publicações: %', now();

  -- Chamar Edge Function via pg_net
  SELECT net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body := '{}'::jsonb
  ) INTO v_request_id;

  RAISE LOG 'Request ID: %', v_request_id;
END;
$$;

-- ============================================
-- AGENDAR CRON JOBS
-- ============================================

-- Remover jobs anteriores se existirem
SELECT cron.unschedule('publicacoes-sync-07h') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'publicacoes-sync-07h'
);

SELECT cron.unschedule('publicacoes-sync-15h') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'publicacoes-sync-15h'
);

-- Sincronização às 07:00 (10:00 UTC, pois Brasília é UTC-3)
SELECT cron.schedule(
  'publicacoes-sync-07h',
  '0 10 * * *',  -- 10:00 UTC = 07:00 BRT
  $$SELECT public.trigger_publicacoes_sync_auto()$$
);

-- Sincronização às 15:00 (18:00 UTC, pois Brasília é UTC-3)
SELECT cron.schedule(
  'publicacoes-sync-15h',
  '0 18 * * *',  -- 18:00 UTC = 15:00 BRT
  $$SELECT public.trigger_publicacoes_sync_auto()$$
);

-- ============================================
-- TABELA DE LOG DE EXECUÇÕES CRON
-- ============================================

CREATE TABLE IF NOT EXISTS public.cron_job_run_details (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  job_name text NOT NULL,
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz,
  status text DEFAULT 'running',
  result jsonb,
  error_message text
);

-- Comentário
COMMENT ON TABLE public.cron_job_run_details IS 'Log de execuções dos cron jobs';

-- ============================================
-- GRANT PERMISSÕES
-- ============================================

GRANT EXECUTE ON FUNCTION public.trigger_publicacoes_sync_auto() TO service_role;
GRANT ALL ON TABLE public.cron_job_run_details TO service_role;
