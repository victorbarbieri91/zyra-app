-- Dashboard operacional do Centro de Comando IA
-- Métricas de execução por dia/fluxo e principais erros.

create index if not exists idx_cc_execucoes_created_at
  on public.centro_comando_execucoes (created_at desc);

create index if not exists idx_cc_execucoes_flow_type
  on public.centro_comando_execucoes (flow_type, created_at desc);

create index if not exists idx_cc_execucoes_termination_reason
  on public.centro_comando_execucoes (termination_reason, created_at desc);

create or replace view public.v_centro_comando_metricas_diarias as
select
  date_trunc('day', created_at)::date as dia,
  flow_type,
  count(*) as total_execucoes,
  count(*) filter (where had_error) as total_erros,
  round((count(*) filter (where had_error)::numeric / nullif(count(*), 0)) * 100, 2) as taxa_erro_pct,
  count(*) filter (where termination_reason = 'stream_closed_without_terminal_event') as total_stream_sem_terminal,
  round((count(*) filter (where termination_reason = 'stream_closed_without_terminal_event')::numeric / nullif(count(*), 0)) * 100, 2) as taxa_stream_sem_terminal_pct,
  count(*) filter (where termination_reason = 'tool_repetition_guard_triggered') as total_guardrail_loop,
  round((count(*) filter (where termination_reason = 'tool_repetition_guard_triggered')::numeric / nullif(count(*), 0)) * 100, 2) as taxa_guardrail_loop_pct,
  count(*) filter (where had_write and not had_error) as total_escrita_sucesso,
  round((count(*) filter (where had_write and not had_error)::numeric / nullif(count(*) filter (where had_write), 0)) * 100, 2) as taxa_sucesso_escrita_pct,
  percentile_cont(0.5) within group (order by coalesce(tempo_execucao_ms, 0))::int as p50_ms,
  percentile_cont(0.95) within group (order by coalesce(tempo_execucao_ms, 0))::int as p95_ms
from public.centro_comando_execucoes
group by 1, 2;

create or replace view public.v_centro_comando_top_erros as
select
  coalesce(error_code, 'sem_codigo') as error_code,
  coalesce(nullif(error_message, ''), 'sem_detalhe') as error_message,
  count(*) as ocorrencias,
  max(created_at) as ultimo_evento_em
from public.centro_comando_execucoes
where had_error = true
group by 1, 2
order by ocorrencias desc, ultimo_evento_em desc;

grant select on public.v_centro_comando_metricas_diarias to authenticated;
grant select on public.v_centro_comando_top_erros to authenticated;
