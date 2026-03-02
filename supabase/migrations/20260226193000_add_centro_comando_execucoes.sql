create table if not exists public.centro_comando_execucoes (
  id uuid primary key default gen_random_uuid(),
  run_id text not null,
  sessao_id uuid null references public.centro_comando_sessoes(id) on delete set null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  escritorio_id uuid not null references public.escritorios(id) on delete cascade,
  flow_type text not null default 'unknown',
  termination_reason text not null default 'final',
  iteration_count integer not null default 0,
  stream_mode text not null default 'sse',
  had_input_modal boolean not null default false,
  had_confirmation_modal boolean not null default false,
  had_write boolean not null default false,
  had_error boolean not null default false,
  tool_repetition_count integer not null default 0,
  tempo_execucao_ms integer null,
  tokens_input integer null,
  tokens_output integer null,
  error_code text null,
  error_message text null,
  started_at timestamptz not null default now(),
  finished_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists idx_centro_comando_execucoes_run_id
  on public.centro_comando_execucoes(run_id);

create index if not exists idx_centro_comando_execucoes_sessao_id
  on public.centro_comando_execucoes(sessao_id, created_at desc);

create index if not exists idx_centro_comando_execucoes_user_id
  on public.centro_comando_execucoes(user_id, created_at desc);

alter table public.centro_comando_historico
  add column if not exists run_id text null,
  add column if not exists flow_type text null,
  add column if not exists termination_reason text null,
  add column if not exists iteration_count integer not null default 0,
  add column if not exists stream_mode text null,
  add column if not exists had_input_modal boolean not null default false,
  add column if not exists had_confirmation_modal boolean not null default false,
  add column if not exists had_write boolean not null default false,
  add column if not exists had_error boolean not null default false;

create index if not exists idx_centro_comando_historico_run_id
  on public.centro_comando_historico(run_id);
