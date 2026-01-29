-- ============================================================================
-- ECOTOPIA - MIGRAÇÃO SIMPLES (SEM ERROS)
-- ============================================================================
-- Execute este arquivo no SQL Editor do Supabase
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Adicionar colunas na tabela usuarios
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMP;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS provider VARCHAR(50) DEFAULT 'mercadopago';
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS provider_preapproval_id VARCHAR(255);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS provider_payment_id VARCHAR(255);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'active';
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS plan_type VARCHAR(50);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMP;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS access_until TIMESTAMP;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Criar índices (SEM WHERE com NOW())
-- ────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_usuarios_access_until ON usuarios(access_until);
CREATE INDEX IF NOT EXISTS idx_usuarios_provider_preapproval_id ON usuarios(provider_preapproval_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_provider_payment_id ON usuarios(provider_payment_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Criar tabela subscription_events
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  plan VARCHAR(50),
  provider_id VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_events_user_id ON subscription_events(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_provider_id ON subscription_events(provider_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_event_type ON subscription_events(event_type);

-- ────────────────────────────────────────────────────────────────────────────
-- 4. Criar tabela payments
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  provider_payment_id VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(50) NOT NULL,
  amount DECIMAL(10,2),
  plan VARCHAR(50),
  raw_payload JSONB,
  processed_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_payment_id ON payments(provider_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- ────────────────────────────────────────────────────────────────────────────
-- 5. Row Level Security (RLS)
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subscription_events_user_policy ON subscription_events;
CREATE POLICY subscription_events_user_policy ON subscription_events
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS payments_user_policy ON payments;
CREATE POLICY payments_user_policy ON payments
  FOR SELECT USING (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 6. Verificação
-- ────────────────────────────────────────────────────────────────────────────

SELECT 'Colunas criadas: ' || COUNT(*)::text as resultado
FROM information_schema.columns
WHERE table_name = 'usuarios'
  AND column_name IN (
    'trial_start_date', 'trial_end_date', 'access_until', 'plan_type',
    'subscription_status', 'provider_preapproval_id', 'provider_payment_id',
    'current_period_end', 'provider'
  );

SELECT 'Tabelas criadas: ' || COUNT(*)::text as resultado
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('subscription_events', 'payments');

SELECT '✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO!' as status;
