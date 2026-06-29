-- "Acessadas recentemente" por usuário (Home do Consultivo). Espelha
-- processos_acessos: 1 linha por usuário+consulta (upsert atualiza acessado_em),
-- trigger de poda mantém só as 10 mais recentes por usuário (tabela minúscula).

create table if not exists public.consultivo_acessos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  consulta_id uuid not null references public.consultivo_consultas(id) on delete cascade,
  escritorio_id uuid not null references public.escritorios(id) on delete cascade,
  acessado_em timestamptz not null default now(),
  unique (user_id, consulta_id)
);

create index if not exists idx_consultivo_acessos_user_recent
  on public.consultivo_acessos (user_id, acessado_em desc);

alter table public.consultivo_acessos enable row level security;

create policy "Ver proprios acessos consultivo" on public.consultivo_acessos
  for select using (user_id = auth.uid());
create policy "Inserir proprios acessos consultivo" on public.consultivo_acessos
  for insert with check (user_id = auth.uid());
create policy "Atualizar proprios acessos consultivo" on public.consultivo_acessos
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Excluir proprios acessos consultivo" on public.consultivo_acessos
  for delete using (user_id = auth.uid());

create or replace function public.prune_consultivo_acessos()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.consultivo_acessos
  where user_id = new.user_id
    and id not in (
      select id from public.consultivo_acessos
      where user_id = new.user_id
      order by acessado_em desc
      limit 10
    );
  return null;
end;
$$;

create trigger trg_prune_consultivo_acessos
  after insert or update on public.consultivo_acessos
  for each row execute function public.prune_consultivo_acessos();
