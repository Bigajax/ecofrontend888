-- ================================================
-- SUPABASE SCHEMA: Conversion Analytics (VERSÃO SIMPLIFICADA)
-- ================================================
-- Execute este script se a tabela 'users' NÃO EXISTE
-- ================================================

-- ================================================
-- 1. CRIAR TABELA: users
-- ================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Subscription fields
  subscription_status TEXT DEFAULT 'free', -- 'free', 'trialing', 'active', 'cancelled', 'expired'
  subscription_plan TEXT DEFAULT 'free', -- 'free', 'essentials_monthly', 'premium_monthly', 'premium_annual', 'vip'
  subscription_started_at TIMESTAMPTZ,
  subscription_ends_at TIMESTAMPTZ,

  -- Trial fields
  trial_started_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);
CREATE INDEX IF NOT EXISTS idx_users_subscription_plan ON users(subscription_plan);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- ================================================
-- 2. CRIAR TABELA: subscription_events
-- ================================================

CREATE TABLE IF NOT EXISTS subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'subscription.created', 'subscription.cancelled', 'trial.started', etc.
  subscription_plan TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_subscription_events_user_id ON subscription_events(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_event_type ON subscription_events(event_type);
CREATE INDEX IF NOT EXISTS idx_subscription_events_created_at ON subscription_events(created_at);

-- ================================================
-- 3. CRIAR TABELA: conversion_triggers
-- ================================================

CREATE TABLE IF NOT EXISTS conversion_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL, -- 'chat_daily_limit', 'meditation_premium_locked', etc.
  context JSONB,
  converted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_conversion_triggers_user_id ON conversion_triggers(user_id);
CREATE INDEX IF NOT EXISTS idx_conversion_triggers_type ON conversion_triggers(trigger_type);
CREATE INDEX IF NOT EXISTS idx_conversion_triggers_converted ON conversion_triggers(converted);
CREATE INDEX IF NOT EXISTS idx_conversion_triggers_created_at ON conversion_triggers(created_at);

-- ================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ================================================

-- Habilitar RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversion_triggers ENABLE ROW LEVEL SECURITY;

-- Políticas para 'users'
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Políticas para 'subscription_events'
CREATE POLICY "Users can view own events"
  ON subscription_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can insert events"
  ON subscription_events FOR INSERT
  WITH CHECK (true);

-- Políticas para 'conversion_triggers'
CREATE POLICY "Users can view own triggers"
  ON conversion_triggers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own triggers"
  ON conversion_triggers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ================================================
-- 5. VIEW: conversion_stats
-- ================================================

CREATE OR REPLACE VIEW conversion_stats AS
SELECT
  ct.trigger_type,
  COUNT(*) as total_hits,
  COUNT(*) FILTER (WHERE ct.converted = true) as conversions,
  ROUND(
    (COUNT(*) FILTER (WHERE ct.converted = true)::numeric / NULLIF(COUNT(*), 0) * 100),
    2
  ) as conversion_rate
FROM conversion_triggers ct
WHERE ct.created_at >= NOW() - INTERVAL '30 days'
GROUP BY ct.trigger_type
ORDER BY conversion_rate DESC;

-- ================================================
-- 6. POPULAR COM DADOS DE TESTE
-- ================================================

-- Primeiro, vamos pegar os IDs de usuários reais do auth.users
-- e criar registros correspondentes na tabela users

INSERT INTO users (id, email, subscription_status, subscription_plan, created_at)
SELECT
  id,
  email,
  'free' as subscription_status,
  'free' as subscription_plan,
  created_at
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Agora vamos criar alguns dados de teste para visualizar no dashboard
-- Pegando os primeiros 5 usuários

WITH sample_users AS (
  SELECT id FROM auth.users LIMIT 5
)
-- Atualizar 2 usuários para premium
UPDATE users
SET
  subscription_status = 'active',
  subscription_plan = 'premium_monthly',
  subscription_started_at = NOW() - INTERVAL '30 days'
WHERE id IN (
  SELECT id FROM sample_users OFFSET 0 LIMIT 2
);

WITH sample_users AS (
  SELECT id FROM auth.users LIMIT 5
)
-- Atualizar 1 usuário para trial
UPDATE users
SET
  subscription_status = 'trialing',
  subscription_plan = 'premium_monthly',
  trial_started_at = NOW() - INTERVAL '3 days',
  trial_ends_at = NOW() + INTERVAL '4 days'
WHERE id IN (
  SELECT id FROM sample_users OFFSET 2 LIMIT 1
);

WITH sample_users AS (
  SELECT id FROM auth.users LIMIT 5
)
-- Atualizar 1 usuário para essentials
UPDATE users
SET
  subscription_status = 'active',
  subscription_plan = 'essentials_monthly',
  subscription_started_at = NOW() - INTERVAL '15 days'
WHERE id IN (
  SELECT id FROM sample_users OFFSET 3 LIMIT 1
);

-- Inserir eventos de exemplo
INSERT INTO subscription_events (user_id, event_type, subscription_plan, created_at)
SELECT
  u.id,
  'subscription.created',
  u.subscription_plan,
  u.subscription_started_at
FROM users u
WHERE u.subscription_plan != 'free'
  AND u.subscription_started_at IS NOT NULL;

-- Inserir triggers de conversão de exemplo
INSERT INTO conversion_triggers (user_id, trigger_type, converted, created_at)
SELECT
  id,
  'chat_daily_limit',
  (subscription_plan != 'free') as converted,
  NOW() - (random() * INTERVAL '7 days')
FROM users
LIMIT 10;

INSERT INTO conversion_triggers (user_id, trigger_type, converted, created_at)
SELECT
  id,
  'meditation_premium_locked',
  (subscription_plan != 'free') as converted,
  NOW() - (random() * INTERVAL '7 days')
FROM users
LIMIT 8;

INSERT INTO conversion_triggers (user_id, trigger_type, converted, created_at)
SELECT
  id,
  'reflection_archive_locked',
  (subscription_plan != 'free') as converted,
  NOW() - (random() * INTERVAL '7 days')
FROM users
LIMIT 6;

-- ================================================
-- 7. VERIFICAÇÃO FINAL
-- ================================================

-- Ver distribuição de usuários
SELECT
  subscription_plan,
  subscription_status,
  COUNT(*) as count
FROM users
GROUP BY subscription_plan, subscription_status
ORDER BY subscription_plan, subscription_status;

-- Ver estatísticas de conversão
SELECT * FROM conversion_stats;

-- ================================================
-- SUCESSO! ✅
-- ================================================
-- Tabelas criadas e populadas com dados de teste
-- Acesse o dashboard: http://localhost:5173/app/admin/conversion
