-- ============================================================================
-- Ritual Boa Noite — progresso por usuário (app logado)
-- Rode este SQL no Supabase (SQL Editor) UMA vez.
-- O frontend escreve direto (supabase.from('user_ritual_progress').upsert),
-- protegido por RLS (cada usuário só vê/edita a própria linha).
-- ============================================================================

create table if not exists public.user_ritual_progress (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  ritual_id       text not null default 'ritual_boa_noite',
  current_step    integer not null default 0,          -- nº de noites concluídas (0–7)
  current_night   integer not null default 1,          -- próxima noite a tocar (1–7)
  status          text not null default 'not_started'
                    check (status in ('not_started', 'in_progress', 'completed')),
  started_at      timestamptz,
  completed_at    timestamptz,                          -- última conclusão de noite
  last_accessed_at timestamptz default now(),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique (user_id, ritual_id)
);

-- mantém updated_at em dia
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_ritual_progress_updated_at on public.user_ritual_progress;
create trigger trg_user_ritual_progress_updated_at
  before update on public.user_ritual_progress
  for each row execute function public.set_updated_at();

-- RLS: cada usuário só acessa a própria linha
alter table public.user_ritual_progress enable row level security;

drop policy if exists "ritual progress — own rows" on public.user_ritual_progress;
create policy "ritual progress — own rows"
  on public.user_ritual_progress
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- índice de leitura por usuário
create index if not exists idx_user_ritual_progress_user
  on public.user_ritual_progress (user_id);
