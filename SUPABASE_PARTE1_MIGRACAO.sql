-- ============================================================================
-- PARTE 1: MIGRAÇÃO - CRIAR COLUNAS E TABELAS
-- ============================================================================
-- Execute esta parte PRIMEIRO
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Adicionar colunas na tabela usuarios
-- ────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
    -- Trial tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='usuarios' AND column_name='trial_start_date') THEN
        ALTER TABLE usuarios ADD COLUMN trial_start_date TIMESTAMP NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='usuarios' AND column_name='trial_end_date') THEN
        ALTER TABLE usuarios ADD COLUMN trial_end_date TIMESTAMP NULL;
    END IF;

    -- Payment provider info
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='usuarios' AND column_name='provider') THEN
        ALTER TABLE usuarios ADD COLUMN provider VARCHAR(50) DEFAULT 'mercadopago';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='usuarios' AND column_name='provider_preapproval_id') THEN
        ALTER TABLE usuarios ADD COLUMN provider_preapproval_id VARCHAR(255) NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='usuarios' AND column_name='provider_payment_id') THEN
        ALTER TABLE usuarios ADD COLUMN provider_payment_id VARCHAR(255) NULL;
    END IF;

    -- Subscription status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='usuarios' AND column_name='subscription_status') THEN
        ALTER TABLE usuarios ADD COLUMN subscription_status VARCHAR(50) DEFAULT 'active';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='usuarios' AND column_name='plan_type') THEN
        ALTER TABLE usuarios ADD COLUMN plan_type VARCHAR(50) NULL;
    END IF;

    -- Access control dates
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='usuarios' AND column_name='current_period_end') THEN
        ALTER TABLE usuarios ADD COLUMN current_period_end TIMESTAMP NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='usuarios' AND column_name='access_until') THEN
        ALTER TABLE usuarios ADD COLUMN access_until TIMESTAMP NULL;
    END IF;
END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Criar índices
-- ────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_usuarios_access_until
  ON usuarios(access_until)
  WHERE access_until > NOW();

CREATE INDEX IF NOT EXISTS idx_usuarios_provider_preapproval_id
  ON usuarios(provider_preapproval_id)
  WHERE provider_preapproval_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_usuarios_provider_payment_id
  ON usuarios(provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Criar tabela subscription_events
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS subscription_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  plan VARCHAR(50),
  provider_id VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_events_user_id
  ON subscription_events(user_id);

CREATE INDEX IF NOT EXISTS idx_subscription_events_provider_id
  ON subscription_events(provider_id)
  WHERE provider_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscription_events_event_type
  ON subscription_events(event_type);

-- ────────────────────────────────────────────────────────────────────────────
-- 4. Criar tabela payments
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

CREATE INDEX IF NOT EXISTS idx_payments_user_id
  ON payments(user_id);

CREATE INDEX IF NOT EXISTS idx_payments_provider_payment_id
  ON payments(provider_payment_id);

CREATE INDEX IF NOT EXISTS idx_payments_status
  ON payments(status);

-- ────────────────────────────────────────────────────────────────────────────
-- 5. Configurar Row Level Security (RLS)
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subscription_events_user_policy ON subscription_events;
CREATE POLICY subscription_events_user_policy
  ON subscription_events
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS payments_user_policy ON payments;
CREATE POLICY payments_user_policy
  ON payments
  FOR SELECT
  USING (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────────────────
-- SUCESSO!
-- ────────────────────────────────────────────────────────────────────────────

SELECT '✅ MIGRAÇÃO PARTE 1 CONCLUÍDA COM SUCESSO!' as resultado;
