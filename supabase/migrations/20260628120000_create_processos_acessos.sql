-- "Acessados recentemente" por usuário (Página Inicial de Processos).
-- 1 linha por usuário+processo (upsert atualiza acessado_em); auto-poda mantém
-- só as 10 mais recentes por usuário, então a tabela fica minúscula.

create table if not exists public.processos_acessos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  processo_id uuid not null references public.processos_processos(id) on delete cascade,
  escritorio_id uuid not null references public.escritorios(id) on delete cascade,
  acessado_em timestamptz not null default now(),
  unique (user_id, processo_id)
);

create index if not exists idx_processos_acessos_user_recent
  on public.processos_acessos (user_id, acessado_em desc);

alter table public.processos_acessos enable row level security;

-- Cada usuário só enxerga/gerencia os próprios acessos
create policy "Ver proprios acessos" on public.processos_acessos
  for select using (user_id = auth.uid());
create policy "Inserir proprios acessos" on public.processos_acessos
  for insert with check (user_id = auth.uid());
create policy "Atualizar proprios acessos" on public.processos_acessos
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Excluir proprios acessos" on public.processos_acessos
  for delete using (user_id = auth.uid());

-- Auto-poda: manter apenas as 10 entradas mais recentes por usuário
create or replace function public.prune_processos_acessos()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.processos_acessos
  where user_id = new.user_id
    and id not in (
      select id from public.processos_acessos
      where user_id = new.user_id
      order by acessado_em desc
      limit 10
    );
  return null;
end;
$$;

create trigger trg_prune_processos_acessos
  after insert or update on public.processos_acessos
  for each row execute function public.prune_processos_acessos();
