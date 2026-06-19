-- Escalonamento automático de prioridade conforme a proximidade do prazo fatal.
-- Regra: só tarefas EM ABERTO e COM prazo fatal. Só SOBE (nunca rebaixa). Data de Brasília.
--   ≤ 2 dias (ou vencido) → alta ; 3 a 5 dias → média (subindo de baixa).
-- Aplicado em produção via MCP em 2026-06-19; arquivo para versionamento.

-- 1) Função usada pelo cron diário (backfill em massa)
create or replace function public.escalonar_prioridade_prazo_fatal()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  -- ≤ 2 dias (ou vencido) → alta (sobe baixa e média)
  update public.agenda_tarefas
     set prioridade = 'alta', updated_at = now()
   where prazo_data_limite is not null
     and status in ('pendente','em_andamento','em_pausa')
     and prazo_data_limite <= hoje + 2
     and prioridade is distinct from 'alta';

  -- 3 a 5 dias → média (sobe só quem está em baixa)
  update public.agenda_tarefas
     set prioridade = 'media', updated_at = now()
   where prazo_data_limite is not null
     and status in ('pendente','em_andamento','em_pausa')
     and prazo_data_limite >  hoje + 2
     and prazo_data_limite <= hoje + 5
     and prioridade = 'baixa';
end;
$$;

-- 2) Gatilho imediato: ao criar uma tarefa ou alterar o prazo fatal, aplica a regra na hora (só sobe).
create or replace function public.tg_escalonar_prioridade_prazo()
returns trigger
language plpgsql
as $$
declare
  hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  dias int;
begin
  if NEW.prazo_data_limite is null
     or NEW.status not in ('pendente','em_andamento','em_pausa') then
    return NEW;
  end if;
  dias := NEW.prazo_data_limite - hoje;
  if dias <= 2 then
    if NEW.prioridade is distinct from 'alta' then
      NEW.prioridade := 'alta';
    end if;
  elsif dias <= 5 then
    if NEW.prioridade = 'baixa' then
      NEW.prioridade := 'media';
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_escalonar_prioridade_prazo on public.agenda_tarefas;
create trigger trg_escalonar_prioridade_prazo
  before insert or update of prazo_data_limite on public.agenda_tarefas
  for each row execute function public.tg_escalonar_prioridade_prazo();

-- 3) Cron diário (pg_cron) — 05:00 UTC (~02h BRT). A função usa a data de Brasília internamente.
select cron.schedule(
  'escalonar-prioridade-prazo-fatal',
  '0 5 * * *',
  $$select public.escalonar_prioridade_prazo_fatal()$$
);
