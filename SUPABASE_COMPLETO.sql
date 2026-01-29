-- ============================================================================
-- ECOTOPIA - SISTEMA DE ASSINATURA - SUPABASE SQL COMPLETO
-- ============================================================================
--
-- Este arquivo contém TUDO que você precisa para o sistema de assinatura:
-- 1. Migração (criar colunas e tabelas)
-- 2. Verificação (checar se funcionou)
-- 3. Queries úteis (testar e consultar dados)
--
-- COMO USAR:
-- 1. Acessar: https://supabase.com/dashboard
-- 2. Selecionar seu projeto ECO
-- 3. Ir em: SQL Editor
-- 4. Copiar ESTE ARQUIVO INTEIRO
-- 5. Colar no editor
-- 6. Clicar em "RUN" (Ctrl+Enter)
--
-- ============================================================================


-- ============================================================================
-- PARTE 1: MIGRAÇÃO (CRIAR ESTRUTURA)
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1.1 Adicionar colunas na tabela usuarios
-- ────────────────────────────────────────────────────────────────────────────

-- Verificar se colunas já existem antes de adicionar
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
-- 1.2 Criar índices (melhorar performance)
-- ────────────────────────────────────────────────────────────────────────────

-- Index para verificar acesso rapidamente
CREATE INDEX IF NOT EXISTS idx_usuarios_access_until
  ON usuarios(access_until)
  WHERE access_until > NOW();

-- Index para buscar por provider_preapproval_id (webhook lookup)
CREATE INDEX IF NOT EXISTS idx_usuarios_provider_preapproval_id
  ON usuarios(provider_preapproval_id)
  WHERE provider_preapproval_id IS NOT NULL;

-- Index para buscar por provider_payment_id (webhook lookup)
CREATE INDEX IF NOT EXISTS idx_usuarios_provider_payment_id
  ON usuarios(provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;

-- ────────────────────────────────────────────────────────────────────────────
-- 1.3 Criar tabela subscription_events (log de eventos)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS subscription_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,

  -- Tipo do evento: 'trial_started', 'payment_approved', 'subscription_cancelled', etc.
  event_type VARCHAR(50) NOT NULL,

  -- Plano no momento do evento
  plan VARCHAR(50),

  -- ID do provider (preapproval_id ou payment_id)
  provider_id VARCHAR(255),

  -- Metadados adicionais (JSON)
  metadata JSONB,

  -- Timestamp
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para subscription_events
CREATE INDEX IF NOT EXISTS idx_subscription_events_user_id
  ON subscription_events(user_id);

CREATE INDEX IF NOT EXISTS idx_subscription_events_provider_id
  ON subscription_events(provider_id)
  WHERE provider_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscription_events_event_type
  ON subscription_events(event_type);

-- ────────────────────────────────────────────────────────────────────────────
-- 1.4 Criar tabela payments (histórico de pagamentos)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,

  -- Provider info
  provider VARCHAR(50) NOT NULL,
  provider_payment_id VARCHAR(255) UNIQUE NOT NULL,

  -- Status do pagamento: 'approved', 'pending', 'rejected'
  status VARCHAR(50) NOT NULL,

  -- Valor e plano
  amount DECIMAL(10,2),
  plan VARCHAR(50),

  -- Payload bruto do provider (JSON)
  raw_payload JSONB,

  -- Timestamps
  processed_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para payments
CREATE INDEX IF NOT EXISTS idx_payments_user_id
  ON payments(user_id);

CREATE INDEX IF NOT EXISTS idx_payments_provider_payment_id
  ON payments(provider_payment_id);

CREATE INDEX IF NOT EXISTS idx_payments_status
  ON payments(status);

-- ────────────────────────────────────────────────────────────────────────────
-- 1.5 Configurar Row Level Security (RLS)
-- ────────────────────────────────────────────────────────────────────────────

-- Ativar RLS nas novas tabelas
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários só veem seus próprios eventos
DROP POLICY IF EXISTS subscription_events_user_policy ON subscription_events;
CREATE POLICY subscription_events_user_policy
  ON subscription_events
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Usuários só veem seus próprios pagamentos
DROP POLICY IF EXISTS payments_user_policy ON payments;
CREATE POLICY payments_user_policy
  ON payments
  FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================================
-- PARTE 2: VERIFICAÇÃO (CHECAR SE FUNCIONOU)
-- ============================================================================

SELECT '════════════════════════════════════════════════════════════════════' as "═══════════════════════════════════════════════════════════════════";
SELECT '✅ MIGRAÇÃO EXECUTADA!' as "STATUS";
SELECT '════════════════════════════════════════════════════════════════════' as "═══════════════════════════════════════════════════════════════════";
SELECT '' as " ";

-- ────────────────────────────────────────────────────────────────────────────
-- 2.1 Verificar colunas adicionadas
-- ────────────────────────────────────────────────────────────────────────────

SELECT '📋 1. Colunas da tabela usuarios:' as "VERIFICAÇÃO";
SELECT '' as " ";

SELECT
  column_name as "Coluna",
  data_type as "Tipo",
  is_nullable as "Nullable",
  '✅' as "Status"
FROM information_schema.columns
WHERE table_name = 'usuarios'
  AND column_name IN (
    'trial_start_date',
    'trial_end_date',
    'access_until',
    'plan_type',
    'subscription_status',
    'provider_preapproval_id',
    'provider_payment_id',
    'current_period_end',
    'provider'
  )
ORDER BY column_name;

SELECT '' as " ";
SELECT '⚠️ Esperado: 9 colunas listadas acima' as "NOTA";
SELECT '' as " ";

-- ────────────────────────────────────────────────────────────────────────────
-- 2.2 Verificar tabelas criadas
-- ────────────────────────────────────────────────────────────────────────────

SELECT '📋 2. Tabelas criadas:' as "VERIFICAÇÃO";
SELECT '' as " ";

SELECT
  table_name as "Tabela",
  '✅' as "Status"
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('subscription_events', 'payments')
ORDER BY table_name;

SELECT '' as " ";
SELECT '⚠️ Esperado: 2 tabelas (payments, subscription_events)' as "NOTA";
SELECT '' as " ";

-- ────────────────────────────────────────────────────────────────────────────
-- 2.3 Verificar índices criados
-- ────────────────────────────────────────────────────────────────────────────

SELECT '📋 3. Índices criados:' as "VERIFICAÇÃO";
SELECT '' as " ";

SELECT
  tablename as "Tabela",
  indexname as "Índice",
  '✅' as "Status"
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('usuarios', 'subscription_events', 'payments')
  AND (
    indexname LIKE '%access_until%' OR
    indexname LIKE '%provider%' OR
    indexname LIKE '%user_id%' OR
    indexname LIKE '%event_type%' OR
    indexname LIKE '%payment_id%'
  )
ORDER BY tablename, indexname;

SELECT '' as " ";

-- ────────────────────────────────────────────────────────────────────────────
-- 2.4 Verificar RLS (Row Level Security)
-- ────────────────────────────────────────────────────────────────────────────

SELECT '📋 4. Políticas de segurança (RLS):' as "VERIFICAÇÃO";
SELECT '' as " ";

SELECT
  tablename as "Tabela",
  policyname as "Policy",
  '✅' as "Status"
FROM pg_policies
WHERE tablename IN ('subscription_events', 'payments')
ORDER BY tablename, policyname;

SELECT '' as " ";

-- ────────────────────────────────────────────────────────────────────────────
-- 2.5 Resumo final
-- ────────────────────────────────────────────────────────────────────────────

SELECT '════════════════════════════════════════════════════════════════════' as "═══════════════════════════════════════════════════════════════════";
SELECT '📊 RESUMO FINAL' as "STATUS";
SELECT '════════════════════════════════════════════════════════════════════' as "═══════════════════════════════════════════════════════════════════";
SELECT '' as " ";

-- Contar colunas adicionadas
SELECT
  'Colunas de assinatura' as "Item",
  COUNT(*) as "Quantidade",
  CASE
    WHEN COUNT(*) = 9 THEN '✅ COMPLETO'
    ELSE '❌ FALTANDO ' || (9 - COUNT(*)) || ' colunas'
  END as "Status"
FROM information_schema.columns
WHERE table_name = 'usuarios'
  AND column_name IN (
    'trial_start_date',
    'trial_end_date',
    'access_until',
    'plan_type',
    'subscription_status',
    'provider_preapproval_id',
    'provider_payment_id',
    'current_period_end',
    'provider'
  )

UNION ALL

-- Contar tabelas criadas
SELECT
  'Tabelas criadas' as "Item",
  COUNT(*) as "Quantidade",
  CASE
    WHEN COUNT(*) = 2 THEN '✅ COMPLETO'
    ELSE '❌ FALTANDO ' || (2 - COUNT(*)) || ' tabelas'
  END as "Status"
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('subscription_events', 'payments');

SELECT '' as " ";
SELECT '════════════════════════════════════════════════════════════════════' as "═══════════════════════════════════════════════════════════════════";


-- ============================================================================
-- PARTE 3: QUERIES ÚTEIS (TESTAR E CONSULTAR)
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 3.1 Ver todos os usuários e seu status de assinatura
-- ────────────────────────────────────────────────────────────────────────────

SELECT '' as " ";
SELECT '════════════════════════════════════════════════════════════════════' as "═══════════════════════════════════════════════════════════════════";
SELECT '🔍 QUERIES ÚTEIS PARA CONSULTA' as "INFORMAÇÃO";
SELECT '════════════════════════════════════════════════════════════════════' as "═══════════════════════════════════════════════════════════════════";
SELECT '' as " ";
SELECT 'As queries abaixo estão comentadas.' as "NOTA";
SELECT 'Descomente (remova os --) para executar.' as "NOTA";
SELECT '' as " ";

-- DESCOMENTAR PARA USAR:
/*
SELECT
  id,
  nome,
  email,
  plan_type,
  subscription_status,
  trial_end_date,
  access_until,
  CASE
    WHEN access_until IS NULL THEN '🔓 FREE'
    WHEN access_until > NOW() AND subscription_status = 'active' THEN '⭐ PREMIUM'
    WHEN access_until <= NOW() THEN '❌ EXPIRADO'
    ELSE '⚠️ INDEFINIDO'
  END as status_atual,
  CASE
    WHEN trial_end_date > NOW() THEN '🎁 EM TRIAL'
    WHEN trial_end_date IS NOT NULL AND trial_end_date <= NOW() THEN '⏰ TRIAL ACABOU'
    ELSE ''
  END as trial_status
FROM usuarios
ORDER BY access_until DESC NULLS LAST;
*/

-- ────────────────────────────────────────────────────────────────────────────
-- 3.2 Ativar premium manualmente para um usuário (TESTE)
-- ────────────────────────────────────────────────────────────────────────────

-- DESCOMENTAR E SUBSTITUIR 'seu_email@teste.com' PARA USAR:
/*
UPDATE usuarios
SET
  plan_type = 'monthly',
  subscription_status = 'active',
  trial_start_date = NOW(),
  trial_end_date = NOW() + INTERVAL '7 days',
  access_until = NOW() + INTERVAL '7 days',
  current_period_end = NOW() + INTERVAL '7 days',
  provider = 'mercadopago'
WHERE email = 'seu_email@teste.com';

-- Ver resultado:
SELECT
  nome,
  email,
  plan_type,
  trial_end_date,
  access_until,
  access_until > NOW() as tem_acesso_premium
FROM usuarios
WHERE email = 'seu_email@teste.com';
*/

-- ────────────────────────────────────────────────────────────────────────────
-- 3.3 Ver histórico de eventos de um usuário
-- ────────────────────────────────────────────────────────────────────────────

-- DESCOMENTAR E SUBSTITUIR 'user_id_aqui' PARA USAR:
/*
SELECT
  event_type,
  plan,
  provider_id,
  metadata,
  created_at
FROM subscription_events
WHERE user_id = 'user_id_aqui'
ORDER BY created_at DESC;
*/

-- ────────────────────────────────────────────────────────────────────────────
-- 3.4 Ver histórico de pagamentos de um usuário
-- ────────────────────────────────────────────────────────────────────────────

-- DESCOMENTAR E SUBSTITUIR 'user_id_aqui' PARA USAR:
/*
SELECT
  provider,
  provider_payment_id,
  status,
  amount,
  plan,
  processed_at
FROM payments
WHERE user_id = 'user_id_aqui'
ORDER BY processed_at DESC;
*/

-- ────────────────────────────────────────────────────────────────────────────
-- 3.5 Ver estatísticas gerais de assinaturas
-- ────────────────────────────────────────────────────────────────────────────

-- DESCOMENTAR PARA USAR:
/*
SELECT
  'Total de usuários' as metrica,
  COUNT(*) as valor
FROM usuarios

UNION ALL

SELECT
  'Usuários premium ativos' as metrica,
  COUNT(*) as valor
FROM usuarios
WHERE access_until > NOW() AND subscription_status = 'active'

UNION ALL

SELECT
  'Usuários em trial' as metrica,
  COUNT(*) as valor
FROM usuarios
WHERE trial_end_date > NOW() AND subscription_status = 'active'

UNION ALL

SELECT
  'Planos mensais' as metrica,
  COUNT(*) as valor
FROM usuarios
WHERE plan_type = 'monthly' AND access_until > NOW()

UNION ALL

SELECT
  'Planos anuais' as metrica,
  COUNT(*) as valor
FROM usuarios
WHERE plan_type = 'annual' AND access_until > NOW();
*/

-- ────────────────────────────────────────────────────────────────────────────
-- 3.6 Limpar trial expirados (manutenção)
-- ────────────────────────────────────────────────────────────────────────────

-- DESCOMENTAR PARA USAR (CUIDADO!):
/*
UPDATE usuarios
SET
  subscription_status = 'expired',
  access_until = trial_end_date
WHERE trial_end_date < NOW()
  AND subscription_status = 'active'
  AND plan_type IS NULL;
*/

-- ────────────────────────────────────────────────────────────────────────────
-- 3.7 Buscar usuário por provider_preapproval_id (usado no webhook)
-- ────────────────────────────────────────────────────────────────────────────

-- DESCOMENTAR E SUBSTITUIR 'preapproval_id_aqui' PARA USAR:
/*
SELECT
  id,
  nome,
  email,
  plan_type,
  subscription_status,
  access_until
FROM usuarios
WHERE provider_preapproval_id = 'preapproval_id_aqui';
*/


-- ============================================================================
-- PARTE 4: ROLLBACK (DESFAZER MIGRAÇÃO)
-- ============================================================================

-- ⚠️ ATENÇÃO: APENAS EXECUTE ISSO SE QUISER DESFAZER TUDO!
-- ⚠️ ISSO VAI APAGAR TODAS AS TABELAS E COLUNAS DE ASSINATURA!

/*
-- Remover tabelas
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS subscription_events CASCADE;

-- Remover colunas da tabela usuarios
ALTER TABLE usuarios
  DROP COLUMN IF EXISTS access_until,
  DROP COLUMN IF EXISTS current_period_end,
  DROP COLUMN IF EXISTS plan_type,
  DROP COLUMN IF EXISTS subscription_status,
  DROP COLUMN IF EXISTS provider_payment_id,
  DROP COLUMN IF EXISTS provider_preapproval_id,
  DROP COLUMN IF EXISTS provider,
  DROP COLUMN IF EXISTS trial_end_date,
  DROP COLUMN IF EXISTS trial_start_date;
*/


-- ============================================================================
-- FIM DO ARQUIVO
-- ============================================================================

SELECT '' as " ";
SELECT '════════════════════════════════════════════════════════════════════' as "═══════════════════════════════════════════════════════════════════";
SELECT '✅ TUDO PRONTO!' as "STATUS FINAL";
SELECT '════════════════════════════════════════════════════════════════════' as "═══════════════════════════════════════════════════════════════════";
SELECT '' as " ";
SELECT '📚 O que você pode fazer agora:' as "PRÓXIMOS PASSOS";
SELECT '' as " ";
SELECT '1. Verificar se tudo está OK (veja RESUMO FINAL acima)' as "Passo";
SELECT '2. Configurar webhook no Mercado Pago' as "Passo";
SELECT '3. Testar fluxo de assinatura no frontend' as "Passo";
SELECT '' as " ";
SELECT '🆘 Se algo deu errado, verifique os erros acima' as "AJUDA";
SELECT '' as " ";
