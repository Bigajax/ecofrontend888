-- Prova social REAL da oferta do Protocolo do Sono.
-- Rodar MANUALMENTE no SQL Editor do Supabase (mesmo fluxo de offer_reminders.sql).
--
-- O front chama supabase.rpc('sono_social_proof_count') e exibe
-- "N pessoas concluíram a Noite 1 nos últimos 7 dias" na oferta — só quando
-- N >= 25 (número baixo vira anti-prova; o guard fica no front).
--
-- SECURITY DEFINER: o anon NÃO ganha SELECT na tabela — só o número agregado.

-- 1) Coluna de recência (o upsert por guest_id reescreve a linha; o trigger
--    mantém updated_at fresco). IF NOT EXISTS = seguro re-rodar.
alter table public.sono_guest_flow_events
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_sono_flow_updated_at on public.sono_guest_flow_events;
create trigger set_sono_flow_updated_at
  before update on public.sono_guest_flow_events
  for each row execute function public.touch_updated_at();

-- 2) Contagem agregada: guests que passaram da reflexão pós-Noite 1
--    (max_step_reached >= 2 só acontece depois de concluir a Noite 1)
--    nos últimos 7 dias.
create or replace function public.sono_social_proof_count()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from sono_guest_flow_events
  where max_step_reached >= 2
    and updated_at > now() - interval '7 days';
$$;

-- anon pode chamar a function (e SÓ ela — nada de SELECT direto na tabela).
grant execute on function public.sono_social_proof_count() to anon, authenticated;
