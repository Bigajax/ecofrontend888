-- ============================================================================
-- PARTE 3: QUERIES DE TESTE - ATIVAR PREMIUM PARA TESTAR
-- ============================================================================
-- Execute DEPOIS da Parte 1 e 2
-- SUBSTITUA 'seu_email@teste.com' pelo seu email real
-- ============================================================================

-- 1. Ver seu usuário atual
SELECT
  id,
  nome,
  email,
  plan_type,
  subscription_status,
  access_until
FROM usuarios
WHERE email = 'seu_email@teste.com';

-- ────────────────────────────────────────────────────────────────────────────

-- 2. ATIVAR PREMIUM MANUALMENTE (7 dias de trial)
-- ⚠️ SUBSTITUA 'seu_email@teste.com' pelo seu email!

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

-- ────────────────────────────────────────────────────────────────────────────

-- 3. Verificar se funcionou
SELECT
  nome,
  email,
  plan_type,
  trial_end_date,
  access_until,
  CASE
    WHEN access_until > NOW() THEN '✅ TEM ACESSO PREMIUM'
    ELSE '❌ SEM ACESSO'
  END as status
FROM usuarios
WHERE email = 'seu_email@teste.com';

-- ────────────────────────────────────────────────────────────────────────────

-- 4. Ver TODOS os usuários com status
SELECT
  nome,
  email,
  plan_type,
  subscription_status,
  access_until,
  CASE
    WHEN access_until IS NULL THEN 'FREE'
    WHEN access_until > NOW() AND subscription_status = 'active' THEN 'PREMIUM'
    ELSE 'EXPIRADO'
  END as status_atual
FROM usuarios
ORDER BY access_until DESC NULLS LAST
LIMIT 10;

-- ────────────────────────────────────────────────────────────────────────────

SELECT '✅ TESTE CONCLUÍDO!' as resultado;
