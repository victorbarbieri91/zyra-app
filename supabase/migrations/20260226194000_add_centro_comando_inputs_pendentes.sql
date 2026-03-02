create table if not exists public.centro_comando_inputs_pendentes (
  id uuid primary key default gen_random_uuid(),
  sessao_id uuid not null references public.centro_comando_sessoes(id) on delete cascade,
  run_id text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  escritorio_id uuid not null references public.escritorios(id) on delete cascade,
  tipo text not null,
  contexto text not null,
  schema jsonb not null,
  values jsonb null,
  status text not null default 'pendente',
  respondido_em timestamptz null,
  expira_em timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists idx_centro_comando_inputs_pendentes_sessao
  on public.centro_comando_inputs_pendentes(sessao_id, created_at desc);

create index if not exists idx_centro_comando_inputs_pendentes_status
  on public.centro_comando_inputs_pendentes(status, created_at desc);

alter table public.centro_comando_acoes_pendentes
  add column if not exists run_id text null,
  add column if not exists operation_name text null,
  add column if not exists target_label text null,
  add column if not exists resolved_entities jsonb null,
  add column if not exists validated_payload jsonb null,
  add column if not exists preview_human text null,
  add column if not exists idempotency_key text null;

create index if not exists idx_centro_comando_acoes_pendentes_run_id
  on public.centro_comando_acoes_pendentes(run_id);

create unique index if not exists idx_centro_comando_acoes_pendentes_idempotency_key
  on public.centro_comando_acoes_pendentes(idempotency_key)
  where idempotency_key is not null;
