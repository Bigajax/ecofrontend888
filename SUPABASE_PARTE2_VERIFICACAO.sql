-- ============================================================================
-- PARTE 2: VERIFICAÇÃO - CHECAR SE TUDO FUNCIONOU
-- ============================================================================
-- Execute DEPOIS da Parte 1
-- ============================================================================

-- 1. Verificar colunas da tabela usuarios
SELECT
  column_name,
  data_type,
  is_nullable
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

-- Esperado: 9 linhas

-- ────────────────────────────────────────────────────────────────────────────

-- 2. Verificar tabelas criadas
SELECT
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('subscription_events', 'payments')
ORDER BY table_name;

-- Esperado: 2 linhas (payments, subscription_events)

-- ────────────────────────────────────────────────────────────────────────────

-- 3. Verificar índices
SELECT
  tablename,
  indexname
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

-- ────────────────────────────────────────────────────────────────────────────

-- 4. RESUMO FINAL
SELECT
  'Colunas adicionadas' as item,
  COUNT(*)::text as quantidade
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

SELECT
  'Tabelas criadas' as item,
  COUNT(*)::text as quantidade
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('subscription_events', 'payments');

-- ────────────────────────────────────────────────────────────────────────────

SELECT '✅ VERIFICAÇÃO CONCLUÍDA!' as resultado;
SELECT '⚠️ Esperado: 9 colunas e 2 tabelas' as nota;
