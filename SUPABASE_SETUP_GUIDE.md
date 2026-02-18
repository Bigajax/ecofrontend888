# 🚀 Guia de Configuração - Supabase Analytics

## Passo a Passo para Configurar Dados Reais no Dashboard

---

## 📋 Pré-requisitos

- ✅ Projeto Supabase criado
- ✅ Arquivo `supabase-conversion-schema.sql` (já criado)
- ✅ Acesso ao SQL Editor do Supabase

---

## 🔧 Passo 1: Acessar o SQL Editor

1. Acesse seu projeto no **Supabase Dashboard**
2. No menu lateral esquerdo, clique em **SQL Editor**
3. Clique em **New Query** (ou use uma query existente)

---

## 🔧 Passo 2: Verificar Se Tabela `users` Existe

**Execute este comando primeiro:**

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'users';
```

### ✅ Se retornar resultado (tabela existe):
- Use a **Opção A** do script (ALTER TABLE)
- Comentar a seção "Opção B" no script

### ❌ Se NÃO retornar resultado (tabela não existe):
- Use a **Opção B** do script (CREATE TABLE)
- Descomentar a seção "Opção B" e comentar "Opção A"

---

## 🔧 Passo 3: Executar o Script SQL

1. **Abra o arquivo** `supabase-conversion-schema.sql`
2. **Copie TODO o conteúdo** do arquivo
3. **Cole no SQL Editor** do Supabase
4. **Ajuste conforme necessário:**
   - Se já tem tabela `users`, use Opção A (ALTER TABLE)
   - Se não tem tabela `users`, descomente Opção B (CREATE TABLE)
5. **Clique em RUN** (ou Ctrl/Cmd + Enter)

### ⚠️ Possíveis Erros:

#### Erro: "relation 'users' already exists"
**Solução:** Você já tem a tabela. Use apenas a seção ALTER TABLE (Opção A).

#### Erro: "column already exists"
**Solução:** As colunas já foram adicionadas antes. Pode ignorar ou comentar o ALTER TABLE.

#### Erro: "permission denied"
**Solução:** Use o SQL Editor como admin/owner do projeto.

---

## 🔧 Passo 4: Verificar Se Funcionou

**Execute estas queries de verificação:**

### 1. Verificar tabelas criadas:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('users', 'subscription_events', 'conversion_triggers');
```

**Deve retornar 3 linhas** (ou pelo menos `subscription_events` e `conversion_triggers`).

### 2. Verificar colunas na tabela users:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
  AND table_schema = 'public';
```

**Deve incluir:**
- `subscription_status`
- `subscription_plan`
- `subscription_started_at`
- `trial_started_at`

### 3. Testar view de estatísticas:
```sql
SELECT * FROM conversion_stats;
```

Se retornar vazio, está ok (ainda não tem dados).

---

## 🔧 Passo 5: Popular com Dados de Teste (Opcional)

Para testar o dashboard com dados fictícios, execute:

```sql
-- 1. Inserir usuários de teste na tabela users
-- IMPORTANTE: Use IDs reais do auth.users ou crie novos usuários primeiro

-- Opção 1: Pegar ID de um usuário existente
SELECT id, email FROM auth.users LIMIT 5;

-- Opção 2: Criar usuário de teste via Supabase Auth UI
-- Depois, atualizar com subscription data:

UPDATE users
SET
  subscription_status = 'active',
  subscription_plan = 'premium_monthly',
  subscription_started_at = NOW() - INTERVAL '30 days'
WHERE email = 'SEU_EMAIL@exemplo.com';

-- 2. Inserir eventos de teste
INSERT INTO subscription_events (user_id, event_type, subscription_plan)
SELECT
  id,
  'subscription.created',
  'premium_monthly'
FROM auth.users
LIMIT 3;

-- 3. Inserir triggers de conversão de teste
INSERT INTO conversion_triggers (user_id, trigger_type, converted)
SELECT
  id,
  'chat_daily_limit',
  false
FROM auth.users
LIMIT 5;
```

---

## 🔧 Passo 6: Atualizar Políticas RLS (se necessário)

Se o dashboard ainda não conseguir ler os dados, verifique as políticas:

```sql
-- Verificar políticas existentes
SELECT * FROM pg_policies
WHERE tablename IN ('users', 'subscription_events', 'conversion_triggers');

-- Se necessário, adicionar política temporária para admin
-- (CUIDADO: isso permite leitura completa - apenas para teste)
CREATE POLICY "Allow read all for authenticated"
  ON users FOR SELECT
  TO authenticated
  USING (true);
```

**⚠️ Importante:** Em produção, use políticas mais restritivas!

---

## 🔧 Passo 7: Testar o Dashboard

1. **Salve todas as mudanças no Supabase**
2. **Volte para o app ECOTOPIA**
3. **Acesse:** http://localhost:5173/app/admin/conversion
4. **Clique em Refresh** (ícone circular no topo)

### ✅ Sucesso se:
- ❌ Não mostrar banner amarelo "Modo Demo"
- ✅ Mostrar dados reais da tabela users
- ✅ Gráficos atualizando com dados reais
- ✅ Botão "Exportar CSV" funcional

### ❌ Se ainda mostrar "Modo Demo":
- Abra o **Console do navegador** (F12)
- Procure por erros relacionados a Supabase
- Verifique se o `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estão corretos no `.env`

---

## 📊 Passo 8: Integrar Tracking no Código

Para começar a popular dados reais, adicione tracking nos eventos:

### Exemplo: Tracking de conversion trigger

```typescript
// Quando usuário bate limite de chat
import { supabase } from '@/lib/supabaseClient';

await supabase
  .from('conversion_triggers')
  .insert({
    user_id: user.id,
    trigger_type: 'chat_daily_limit',
    context: { current_count: 30, limit: 30 },
    converted: false,
  });
```

### Exemplo: Quando usuário faz upgrade

```typescript
// Quando pagamento aprovado
await supabase
  .from('subscription_events')
  .insert({
    user_id: user.id,
    event_type: 'subscription.created',
    subscription_plan: 'premium_monthly',
    metadata: { amount: 29.90, provider: 'mercadopago' },
  });

// Atualizar tabela users
await supabase
  .from('users')
  .update({
    subscription_status: 'active',
    subscription_plan: 'premium_monthly',
    subscription_started_at: new Date().toISOString(),
  })
  .eq('id', user.id);
```

---

## 🎯 Métricas Disponíveis Após Setup

Com tudo configurado, o dashboard mostrará:

### KPIs em Tempo Real:
- ✅ Total de usuários (por tier)
- ✅ Taxa de conversão Trial → Paid
- ✅ Churn rate (últimos 30 dias)
- ✅ LTV médio por usuário

### Gráficos:
- ✅ Distribuição de usuários (Free, Trial, Essentials, Premium)
- ✅ Funil de conversão (Signups → Trials → Paid)
- ✅ Top conversion triggers (quais limites convertem mais)

### Exportação:
- ✅ CSV com todas as métricas
- ✅ Filtros por período (próxima feature)

---

## 🆘 Troubleshooting

### Problema: "permission denied for table users"
**Solução:**
1. Verifique se RLS está configurado corretamente
2. Use service_role key (não anon key) no backend para admin
3. Ou desabilite RLS temporariamente (apenas dev):
   ```sql
   ALTER TABLE users DISABLE ROW LEVEL SECURITY;
   ```

### Problema: Dashboard mostra 0 usuários
**Solução:**
- Verifique se há dados na tabela: `SELECT COUNT(*) FROM users;`
- Se retornar 0, insira dados de teste (Passo 5)
- Verifique políticas RLS

### Problema: Erro CORS no console
**Solução:**
- Verifique se `VITE_SUPABASE_URL` está correto no `.env`
- Reinicie o servidor dev: `npm run dev`

### Problema: View conversion_stats vazia
**Solução:**
- Normal se não há dados em `conversion_triggers`
- Comece a usar o app e os dados vão aparecer
- Ou insira dados de teste (Passo 5)

---

## ✅ Checklist Final

Antes de considerar o setup completo:

- [ ] Tabelas criadas: `users`, `subscription_events`, `conversion_triggers`
- [ ] RLS habilitado e políticas configuradas
- [ ] View `conversion_stats` funcional
- [ ] Dashboard mostra dados reais (sem banner "Modo Demo")
- [ ] Botão refresh funciona
- [ ] Export CSV funciona
- [ ] Dados de teste inseridos (opcional)
- [ ] Tracking integrado no código (próximo passo)

---

## 🚀 Próximos Passos

Após configurar o Supabase:

1. **Integrar tracking no AuthContext** - Atualizar `subscription_status` quando user faz signup/upgrade
2. **Webhook do Mercado Pago** - Inserir eventos em `subscription_events` quando pagamento aprovado
3. **Tracking de triggers** - Chamar `supabase.from('conversion_triggers').insert()` quando usuário bate limites
4. **Cron job de churn** - Script diário para detectar usuários que cancelaram

---

**Documentação criada em:** 2026-02-16
**Versão:** 1.0
**Status:** Pronto para uso
