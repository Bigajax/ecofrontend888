-- ============================================================================
-- ECOTOPIA SUBSCRIPTION SYSTEM - DATABASE MIGRATION
-- ============================================================================
--
-- This migration adds subscription management to the ECOTOPIA platform
-- Following the Mercado Pago integration model with trial support
--
-- Execute this in your Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. ALTER TABLE usuarios - Add Subscription Columns
-- ============================================================================

ALTER TABLE usuarios
  -- Trial tracking
  ADD COLUMN trial_start_date TIMESTAMP NULL,
  ADD COLUMN trial_end_date TIMESTAMP NULL,

  -- Payment provider info
  ADD COLUMN provider VARCHAR(50) DEFAULT 'mercadopago',
  ADD COLUMN provider_preapproval_id VARCHAR(255) NULL,  -- Recorrência mensal (preapproval)
  ADD COLUMN provider_payment_id VARCHAR(255) NULL,      -- Pagamento pontual anual (payment)

  -- Subscription status
  ADD COLUMN subscription_status VARCHAR(50) DEFAULT 'pending',
  ADD COLUMN plan_type VARCHAR(50) NULL,                 -- 'monthly' ou 'annual'

  -- Access control dates
  ADD COLUMN current_period_end TIMESTAMP NULL,          -- Próxima renovação
  ADD COLUMN access_until TIMESTAMP NULL;                 -- FONTE DA VERDADE para acesso

-- ============================================================================
-- 2. CREATE INDEX - Fast Access Validation
-- ============================================================================

-- Index para verificar acesso rapidamente (WHERE access_until > NOW())
CREATE INDEX idx_usuarios_access_until
  ON usuarios(access_until)
  WHERE access_until > NOW();

-- Index para buscar por provider_preapproval_id (webhook lookup)
CREATE INDEX idx_usuarios_provider_preapproval_id
  ON usuarios(provider_preapproval_id)
  WHERE provider_preapproval_id IS NOT NULL;

-- Index para buscar por provider_payment_id (webhook lookup)
CREATE INDEX idx_usuarios_provider_payment_id
  ON usuarios(provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;

-- ============================================================================
-- 3. CREATE TABLE subscription_events - Audit Log
-- ============================================================================

CREATE TABLE subscription_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,

  -- Event type: 'trial_started', 'payment_approved', 'subscription_cancelled', etc.
  event_type VARCHAR(50) NOT NULL,

  -- Plan info at the time of event
  plan VARCHAR(50),

  -- Provider ID (preapproval_id ou payment_id)
  provider_id VARCHAR(255),

  -- Additional metadata (JSON)
  metadata JSONB,

  -- Timestamp
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index para buscar eventos por usuário
CREATE INDEX idx_subscription_events_user_id
  ON subscription_events(user_id);

-- Index para idempotência (verificar se evento já foi processado)
CREATE INDEX idx_subscription_events_provider_id
  ON subscription_events(provider_id)
  WHERE provider_id IS NOT NULL;

-- Index para buscar por tipo de evento
CREATE INDEX idx_subscription_events_event_type
  ON subscription_events(event_type);

-- ============================================================================
-- 4. CREATE TABLE payments - Payment History
-- ============================================================================

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,

  -- Provider info
  provider VARCHAR(50) NOT NULL,
  provider_payment_id VARCHAR(255) UNIQUE NOT NULL,

  -- Payment status: 'approved', 'pending', 'rejected'
  status VARCHAR(50) NOT NULL,

  -- Amount and plan
  amount DECIMAL(10,2),
  plan VARCHAR(50),

  -- Payment method info
  payment_method VARCHAR(100),
  receipt_url TEXT,

  -- Raw payload from provider (JSON)
  raw_payload JSONB,

  -- Timestamps
  processed_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index para buscar pagamentos por usuário
CREATE INDEX idx_payments_user_id
  ON payments(user_id);

-- Index para idempotência (verificar se pagamento já foi processado)
-- UNIQUE já cria index automaticamente, mas explicitamos para clareza
CREATE INDEX idx_payments_provider_payment_id
  ON payments(provider_payment_id);

-- Index para buscar por status
CREATE INDEX idx_payments_status
  ON payments(status);

-- ============================================================================
-- 5. CREATE TABLE webhook_logs - Idempotency & Debug Log
-- ============================================================================

CREATE TABLE webhook_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Source of webhook (e.g. 'mercadopago')
  source VARCHAR(50) NOT NULL,

  -- Event type from provider (e.g. 'payment', 'subscription_preapproval')
  event_type VARCHAR(100),

  -- Provider event ID (for idempotency dedup)
  event_id VARCHAR(255) NOT NULL,

  -- Full webhook payload (JSON)
  payload JSONB,

  -- Processing status
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMP NULL,

  -- Error if processing failed
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW()
);

-- Unique index for idempotency: one record per (source, event_id)
CREATE UNIQUE INDEX idx_webhook_logs_source_event_id
  ON webhook_logs(source, event_id);

-- Index for lookup by source
CREATE INDEX idx_webhook_logs_source
  ON webhook_logs(source);

-- Index for unprocessed webhooks (monitoring/retry)
CREATE INDEX idx_webhook_logs_processed
  ON webhook_logs(processed)
  WHERE processed = FALSE;

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS) - Security Policies
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
-- webhook_logs is backend-only, no RLS needed (service_role bypasses RLS anyway)

-- Policy: Users can only view their own subscription events
CREATE POLICY subscription_events_user_policy
  ON subscription_events
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can only view their own payment history
CREATE POLICY payments_user_policy
  ON payments
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Backend can insert/update (via service_role key)
-- No policy needed - service_role bypasses RLS

-- ============================================================================
-- 6. MIGRATION VERIFICATION QUERIES
-- ============================================================================

-- Verify usuarios columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'usuarios'
  AND column_name IN (
    'trial_start_date', 'trial_end_date', 'provider',
    'provider_preapproval_id', 'provider_payment_id',
    'subscription_status', 'plan_type',
    'current_period_end', 'access_until'
  )
ORDER BY column_name;

-- Verify new tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('subscription_events', 'payments', 'webhook_logs')
ORDER BY table_name;

-- Verify indexes were created
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('usuarios', 'subscription_events', 'payments', 'webhook_logs')
ORDER BY tablename, indexname;

-- ============================================================================
-- 7. SAMPLE DATA (OPTIONAL - for testing)
-- ============================================================================

-- Insert sample subscription event (for testing webhook processing)
-- INSERT INTO subscription_events (user_id, event_type, plan, provider_id, metadata)
-- VALUES (
--   'YOUR_TEST_USER_ID',
--   'trial_started',
--   'monthly',
--   'test_preapproval_123',
--   '{"trial_days": 7, "auto_charge_date": "2026-01-15T00:00:00Z"}'::jsonb
-- );

-- ============================================================================
-- 8. ROLLBACK (if needed)
-- ============================================================================

-- CAUTION: Only run this if you need to undo the migration
-- This will DROP tables and REMOVE columns - data will be lost!

-- DROP TABLE IF EXISTS webhook_logs CASCADE;
-- DROP TABLE IF EXISTS payments CASCADE;
-- DROP TABLE IF EXISTS subscription_events CASCADE;

-- ALTER TABLE usuarios
--   DROP COLUMN IF EXISTS access_until,
--   DROP COLUMN IF EXISTS current_period_end,
--   DROP COLUMN IF EXISTS plan_type,
--   DROP COLUMN IF EXISTS subscription_status,
--   DROP COLUMN IF EXISTS provider_payment_id,
--   DROP COLUMN IF EXISTS provider_preapproval_id,
--   DROP COLUMN IF EXISTS provider,
--   DROP COLUMN IF EXISTS trial_end_date,
--   DROP COLUMN IF EXISTS trial_start_date;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
