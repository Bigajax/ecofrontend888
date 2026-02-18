-- ================================================
-- VERIFICAÇÃO: Estado Atual do Schema
-- ================================================
-- Execute estas queries para diagnosticar o problema

-- 1. Verificar se tabela usuarios existe
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'usuarios'
) as usuarios_exists;

-- 2. Se existe, ver as colunas
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'usuarios'
ORDER BY ordinal_position;

-- 3. Verificar outras tabelas de subscription
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('usuarios', 'subscription_events', 'payments', 'webhook_logs', 'users')
ORDER BY table_name;

-- 4. Ver todas as tabelas públicas
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
