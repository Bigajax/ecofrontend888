-- Lembretes "Decidir amanhã" da oferta do Protocolo do Sono.
-- Rodar MANUALMENTE no SQL Editor do Supabase (mesmo fluxo de user_ritual_progress.sql).
--
-- O guest deixa WhatsApp ou e-mail na tela da oferta; o lembrete é enviado
-- MANUALMENTE na manhã seguinte com o deep link:
--   https://<dominio>/sono/experiencia?oferta=1&g={guest_id}
-- Depois de enviar, marcar reminded_at (via SQL Editor / service role).

create table if not exists public.offer_reminders (
  id uuid primary key default gen_random_uuid(),
  guest_id text not null,
  contact text not null,
  created_at timestamptz not null default now(),
  reminded_at timestamptz
);

alter table public.offer_reminders enable row level security;

-- INSERT anônimo (funil guest escreve direto do front com a anon key).
-- SEM policy de SELECT/UPDATE/DELETE: leitura e marcação de reminded_at só via
-- service role / SQL Editor — contatos não vazam pelo client.
create policy "anon_insert_offer_reminders"
  on public.offer_reminders
  for insert
  to anon, authenticated
  with check (true);
