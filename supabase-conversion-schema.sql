-- ================================================
-- SUPABASE SCHEMA: Conversion Analytics
-- ================================================
-- Script para configurar tabelas de analytics de conversão
-- Executar no SQL Editor do Supabase
-- ================================================

-- ================================================
-- 1. TABELA: users (extensão da tabela auth.users)
-- ================================================
-- Adicionar colunas de subscription na tabela users existente
-- Se a tabela 'users' já existir no seu projeto, use ALTER TABLE
-- Caso contrário, crie uma view ou tabela separada

-- Opção A: Se você JÁ TEM uma tabela 'users' (perfis de usuário)
-- Adicione apenas as colunas que faltam:

ALTER TABLE users
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);
CREATE INDEX IF NOT EXISTS idx_users_subscription_plan ON users(subscription_plan);

-- ================================================
-- Opção B: Se NÃO TEM tabela 'users', crie uma nova:
-- ================================================

-- CREATE TABLE IF NOT EXISTS users (
--   id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
--   email TEXT,
--   created_at TIMESTAMPTZ DEFAULT NOW(),
--   subscription_status TEXT DEFAULT 'free', -- 'free', 'trialing', 'active', 'cancelled', 'expired'
--   subscription_plan TEXT DEFAULT 'free', -- 'free', 'essentials_monthly', 'premium_monthly', 'premium_annual', 'vip'
--   subscription_started_at TIMESTAMPTZ,
--   subscription_ends_at TIMESTAMPTZ,
--   trial_started_at TIMESTAMPTZ,
--   trial_ends_at TIMESTAMPTZ
-- );

-- -- Índices
-- CREATE INDEX idx_users_subscription_status ON users(subscription_status);
-- CREATE INDEX idx_users_subscription_plan ON users(subscription_plan);

-- ================================================
-- 2. TABELA: subscription_events
-- ================================================
-- Eventos de lifecycle da assinatura

CREATE TABLE IF NOT EXISTS subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'subscription.created', 'subscription.cancelled', 'trial.started', 'trial.converted', etc.
  subscription_plan TEXT, -- Plano associado ao evento
  metadata JSONB, -- Dados extras (reason, amount, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_subscription_events_user_id ON subscription_events(user_id);
CREATE INDEX idx_subscription_events_event_type ON subscription_events(event_type);
CREATE INDEX idx_subscription_events_created_at ON subscription_events(created_at);

-- ================================================
-- 3. TABELA: conversion_triggers (opcional)
-- ================================================
-- Tracking de quando usuários bateram em limites/gates

CREATE TABLE IF NOT EXISTS conversion_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL, -- 'chat_daily_limit', 'meditation_premium_locked', etc.
  context JSONB, -- Dados adicionais (feature_id, meditation_id, etc.)
  converted BOOLEAN DEFAULT FALSE, -- Se resultou em conversão
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_conversion_triggers_user_id ON conversion_triggers(user_id);
CREATE INDEX idx_conversion_triggers_type ON conversion_triggers(trigger_type);
CREATE INDEX idx_conversion_triggers_converted ON conversion_triggers(converted);
CREATE INDEX idx_conversion_triggers_created_at ON conversion_triggers(created_at);

-- ================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ================================================

-- Habilitar RLS nas tabelas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversion_triggers ENABLE ROW LEVEL SECURITY;

-- Políticas para 'users'
-- Usuários podem ler apenas seus próprios dados
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Usuários podem atualizar apenas seus próprios dados
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Service role pode ler todos (para admin dashboard)
CREATE POLICY "Service role can view all users"
  ON users FOR SELECT
  TO service_role
  USING (true);

-- Políticas para 'subscription_events'
-- Usuários podem ler apenas seus próprios eventos
CREATE POLICY "Users can view own events"
  ON subscription_events FOR SELECT
  USING (auth.uid() = user_id);

-- Service role pode ler/inserir todos
CREATE POLICY "Service role can manage all events"
  ON subscription_events FOR ALL
  TO service_role
  USING (true);

-- Políticas para 'conversion_triggers'
-- Usuários podem ler apenas seus próprios triggers
CREATE POLICY "Users can view own triggers"
  ON conversion_triggers FOR SELECT
  USING (auth.uid() = user_id);

-- Usuários podem inserir seus próprios triggers
CREATE POLICY "Users can insert own triggers"
  ON conversion_triggers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role pode ler todos
CREATE POLICY "Service role can view all triggers"
  ON conversion_triggers FOR SELECT
  TO service_role
  USING (true);

-- ================================================
-- 5. VIEWS (para analytics agregados)
-- ================================================

-- View: Estatísticas de conversão agregadas
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

-- Dar acesso à view
GRANT SELECT ON conversion_stats TO authenticated;
GRANT SELECT ON conversion_stats TO service_role;

-- ================================================
-- 6. FUNCTIONS (helpers para analytics)
-- ================================================

-- Function: Calcular churn rate dos últimos 30 dias
CREATE OR REPLACE FUNCTION get_churn_rate()
RETURNS NUMERIC AS $$
DECLARE
  total_paid_users INTEGER;
  cancelled_count INTEGER;
BEGIN
  -- Total de usuários pagos ativos
  SELECT COUNT(*) INTO total_paid_users
  FROM users
  WHERE subscription_plan IN ('essentials_monthly', 'premium_monthly', 'premium_annual')
    AND subscription_status IN ('active', 'trialing');

  -- Cancelamentos nos últimos 30 dias
  SELECT COUNT(*) INTO cancelled_count
  FROM subscription_events
  WHERE event_type = 'subscription.cancelled'
    AND created_at >= NOW() - INTERVAL '30 days';

  -- Calcular churn rate
  IF total_paid_users > 0 THEN
    RETURN ROUND((cancelled_count::numeric / total_paid_users * 100), 2);
  ELSE
    RETURN 0;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- 7. DADOS DE EXEMPLO (para teste inicial)
-- ================================================
-- Comentar/descomentar conforme necessário

-- Inserir usuários de exemplo (ajustar IDs conforme necessário)
-- NOTA: Substitua os UUIDs abaixo por IDs reais do auth.users

-- INSERT INTO users (id, email, subscription_status, subscription_plan, created_at) VALUES
-- ('00000000-0000-0000-0000-000000000001', 'free1@example.com', 'free', 'free', NOW() - INTERVAL '30 days'),
-- ('00000000-0000-0000-0000-000000000002', 'free2@example.com', 'free', 'free', NOW() - INTERVAL '20 days'),
-- ('00000000-0000-0000-0000-000000000003', 'trial1@example.com', 'trialing', 'premium_monthly', NOW() - INTERVAL '5 days'),
-- ('00000000-0000-0000-0000-000000000004', 'premium1@example.com', 'active', 'premium_monthly', NOW() - INTERVAL '60 days'),
-- ('00000000-0000-0000-0000-000000000005', 'premium2@example.com', 'active', 'premium_annual', NOW() - INTERVAL '90 days');

-- Inserir eventos de exemplo
-- INSERT INTO subscription_events (user_id, event_type, subscription_plan, created_at) VALUES
-- ('00000000-0000-0000-0000-000000000003', 'trial.started', 'premium_monthly', NOW() - INTERVAL '5 days'),
-- ('00000000-0000-0000-0000-000000000004', 'subscription.created', 'premium_monthly', NOW() - INTERVAL '60 days'),
-- ('00000000-0000-0000-0000-000000000005', 'subscription.created', 'premium_annual', NOW() - INTERVAL '90 days');

-- Inserir triggers de exemplo
-- INSERT INTO conversion_triggers (user_id, trigger_type, converted, created_at) VALUES
-- ('00000000-0000-0000-0000-000000000001', 'chat_daily_limit', false, NOW() - INTERVAL '2 days'),
-- ('00000000-0000-0000-0000-000000000002', 'meditation_premium_locked', false, NOW() - INTERVAL '1 day'),
-- ('00000000-0000-0000-0000-000000000003', 'chat_daily_limit', true, NOW() - INTERVAL '5 days');

-- ================================================
-- 8. VERIFICAÇÃO (queries para testar)
-- ================================================

-- Verificar contagem de usuários por plano
SELECT
  subscription_plan,
  COUNT(*) as count
FROM users
GROUP BY subscription_plan;

-- Verificar eventos recentes
SELECT
  event_type,
  COUNT(*) as count
FROM subscription_events
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY event_type;

-- Ver estatísticas de conversão
SELECT * FROM conversion_stats;

-- ================================================
-- FIM DO SCRIPT
-- ================================================
-- Após executar este script, o dashboard deve funcionar com dados reais!
