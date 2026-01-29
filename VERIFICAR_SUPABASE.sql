-- ============================================================================
-- SCRIPT DE VERIFICAÇÃO - SUPABASE
-- ============================================================================
-- Execute este script no SQL Editor do Supabase para verificar se tudo está ok
-- ============================================================================

-- ============================================================================
-- 1. VERIFICAR COLUNAS DA TABELA USUARIOS
-- ============================================================================

SELECT
  '1. Colunas da tabela usuarios:' as verificacao;

SELECT
  column_name,
  data_type,
  is_nullable,
  CASE
    WHEN column_name IN (
      'trial_start_date',
      'trial_end_date',
      'access_until',
      'plan_type',
      'subscription_status',
      'provider_preapproval_id',
      'provider_payment_id',
      'current_period_end',
      'provider'
    ) THEN '✅ OK'
    ELSE ''
  END as status
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

-- Esperado: 9 linhas (todas as colunas de assinatura)

-- ============================================================================
-- 2. VERIFICAR TABELAS CRIADAS
-- ============================================================================

SELECT
  '2. Tabelas do sistema de assinatura:' as verificacao;

SELECT
  table_name,
  CASE
    WHEN table_name IN ('subscription_events', 'payments') THEN '✅ OK'
    ELSE ''
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('subscription_events', 'payments')
ORDER BY table_name;

-- Esperado: 2 linhas (payments, subscription_events)

-- ============================================================================
-- 3. VERIFICAR INDICES CRIADOS
-- ============================================================================

SELECT
  '3. Índices criados:' as verificacao;

SELECT
  indexname,
  tablename,
  '✅ OK' as status
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('usuarios', 'subscription_events', 'payments')
  AND (
    indexname LIKE '%access_until%' OR
    indexname LIKE '%provider%' OR
    indexname LIKE '%user_id%' OR
    indexname LIKE '%event_type%'
  )
ORDER BY tablename, indexname;

-- Esperado: Vários índices

-- ============================================================================
-- 4. VERIFICAR ESTRUTURA DA TABELA SUBSCRIPTION_EVENTS
-- ============================================================================

SELECT
  '4. Estrutura da tabela subscription_events:' as verificacao;

SELECT
  column_name,
  data_type,
  '✅ OK' as status
FROM information_schema.columns
WHERE table_name = 'subscription_events'
ORDER BY ordinal_position;

-- Esperado: id, user_id, event_type, plan, provider_id, metadata, created_at

-- ============================================================================
-- 5. VERIFICAR ESTRUTURA DA TABELA PAYMENTS
-- ============================================================================

SELECT
  '5. Estrutura da tabela payments:' as verificacao;

SELECT
  column_name,
  data_type,
  '✅ OK' as status
FROM information_schema.columns
WHERE table_name = 'payments'
ORDER BY ordinal_position;

-- Esperado: id, user_id, provider, provider_payment_id, status, amount, plan, raw_payload, processed_at, created_at

-- ============================================================================
-- 6. VERIFICAR RLS (ROW LEVEL SECURITY)
-- ============================================================================

SELECT
  '6. Políticas de segurança (RLS):' as verificacao;

SELECT
  schemaname,
  tablename,
  policyname,
  '✅ OK' as status
FROM pg_policies
WHERE tablename IN ('subscription_events', 'payments')
ORDER BY tablename, policyname;

-- Esperado: Políticas para subscription_events e payments

-- ============================================================================
-- 7. TESTAR CONSULTA DE STATUS (SIMULAÇÃO)
-- ============================================================================

SELECT
  '7. Teste de consulta de status (sua tabela usuarios):' as verificacao;

SELECT
  id,
  email,
  tipo_plano,
  trial_start_date,
  trial_end_date,
  access_until,
  plan_type,
  subscription_status,
  CASE
    WHEN access_until IS NULL THEN 'FREE'
    WHEN access_until > NOW() AND subscription_status = 'active' THEN 'PREMIUM'
    ELSE 'EXPIRADO'
  END as status_calculado
FROM usuarios
LIMIT 5;

-- Mostra primeiros 5 usuários com status calculado

-- ============================================================================
-- 8. RESUMO FINAL
-- ============================================================================

SELECT
  '8. RESUMO FINAL:' as verificacao;

-- Contar colunas adicionadas
SELECT
  'Colunas de assinatura adicionadas' as item,
  COUNT(*) as quantidade,
  CASE
    WHEN COUNT(*) = 9 THEN '✅ COMPLETO'
    ELSE '❌ FALTANDO ' || (9 - COUNT(*)) || ' colunas'
  END as status
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
  'Tabelas criadas' as item,
  COUNT(*) as quantidade,
  CASE
    WHEN COUNT(*) = 2 THEN '✅ COMPLETO'
    ELSE '❌ FALTANDO ' || (2 - COUNT(*)) || ' tabelas'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('subscription_events', 'payments');

-- ============================================================================
-- ❌ SE ALGO ESTIVER FALTANDO:
-- ============================================================================
-- Execute o arquivo MIGRATION_SUBSCRIPTION.sql completo
-- ============================================================================
