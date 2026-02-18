# 🚀 Guia: Aplicar Migration de Conversion Analytics

## ✅ O Que Foi Feito

Criei uma **migration compatível** com o schema existente do backend!

### Estrutura do Backend (já existente):
- ✅ `public.usuarios` - Dados de subscription
- ✅ `public.subscription_events` - Eventos de lifecycle
- ✅ `public.payments` - Histórico de pagamentos
- ✅ `public.webhook_logs` - Logs de webhooks

### O Que a Migration Adiciona:
- ✅ Coluna `tier` na tabela `usuarios` (essentials vs premium)
- ✅ Tabela `conversion_triggers` (tracking de limites/gates)
- ✅ Views agregadas: `user_distribution`, `conversion_stats`, `conversion_funnel`
- ✅ Functions: `get_churn_rate()`, `mark_trigger_converted()`
- ✅ Dados de teste (opcional)

---

## 📋 Passo a Passo

### 1️⃣ Aplicar a Migration no Supabase

**Opção A: Via SQL Editor (Recomendado)**

1. Acesse https://app.supabase.com
2. Entre no seu projeto ECOTOPIA
3. Vá em **SQL Editor** (menu lateral)
4. Clique em **New Query**
5. Abra o arquivo:
   ```
   C:\Users\Rafael\Desktop\ecofrontend\ecobackend888\supabase\migrations\20260216_add_conversion_analytics.sql
   ```
6. Copie **TODO** o conteúdo
7. Cole no SQL Editor
8. Clique em **RUN** (ou Ctrl+Enter)

**Resultado esperado:**
```
✅ Table conversion_triggers created successfully
✅ View conversion_stats created successfully
✅ View user_distribution created successfully
✅ View conversion_funnel created successfully
✅ Migration completed successfully!
```

---

**Opção B: Via Supabase CLI (Avançado)**

```bash
cd C:\Users\Rafael\Desktop\ecofrontend\ecobackend888

# Verificar se CLI está instalado
supabase --version

# Aplicar migration
supabase db push

# Ou rodar migration específica
supabase migration up
```

---

### 2️⃣ Verificar Se Funcionou

Execute estas queries no SQL Editor:

#### Verificar tabela criada:
```sql
SELECT COUNT(*) FROM public.conversion_triggers;
```
**Deve retornar:** 0 ou mais (se inseriu dados de teste)

#### Verificar views:
```sql
SELECT * FROM public.user_distribution;
```
**Deve retornar:** Distribuição de usuários por tier

```sql
SELECT * FROM public.conversion_stats;
```
**Pode retornar vazio** (normal se ainda não tem triggers)

```sql
SELECT * FROM public.conversion_funnel;
```
**Deve retornar:** Métricas de funil (signups, trials, paid)

---

### 3️⃣ Testar o Dashboard

1. **Volte para o frontend**: http://localhost:5173/app/admin/conversion
2. **Clique em Refresh** (ícone circular)
3. **Verifique:**
   - ❌ Banner "Modo Demo" NÃO deve aparecer
   - ✅ Dados reais devem aparecer
   - ✅ Gráficos funcionais

---

## 📊 Estrutura de Tiers Implementada

### Como Funciona:

**Tabela `usuarios` agora tem:**
- `plan_type`: 'monthly' ou 'annual'
- `tier`: 'essentials' ou 'premium' ou 'vip' ← **NOVO!**
- `subscription_status`: 'active', 'cancelled', 'expired', 'pending'

### Exemplos:

| Tier | Plan Type | Preço | Descrição |
|------|-----------|-------|-----------|
| `essentials` | `monthly` | R$ 14,90/mês | Tier básico |
| `premium` | `monthly` | R$ 29,90/mês | Tier completo mensal |
| `premium` | `annual` | R$ 299/ano | Tier completo anual |
| `vip` | `monthly` | - | Tier especial |

---

## 🔧 Atualizar Usuários Existentes (Opcional)

Se você já tem usuários pagos e quer classificá-los por tier:

```sql
-- Todos os usuários ativos viram 'premium' por padrão
UPDATE public.usuarios
SET tier = 'premium'
WHERE subscription_status = 'active'
  AND tier IS NULL;

-- Ou manualmente definir alguns como essentials
UPDATE public.usuarios
SET tier = 'essentials'
WHERE id = 'SEU_USER_ID_AQUI';
```

---

## 📈 Como Popular com Dados de Teste

A migration já insere **20 triggers de exemplo** automaticamente.

Para adicionar mais:

```sql
-- Inserir triggers variados
INSERT INTO public.conversion_triggers (user_id, trigger_type, converted, created_at)
SELECT
  au.id,
  (ARRAY[
    'chat_daily_limit',
    'meditation_premium_locked',
    'reflection_archive_locked',
    'rings_weekly_limit',
    'meditation_library_banner'
  ])[floor(random() * 5 + 1)],
  (random() < 0.25), -- 25% converteram
  NOW() - (random() * INTERVAL '30 days')
FROM auth.users au
LIMIT 30;
```

---

## 🆘 Troubleshooting

### Erro: "relation 'usuarios' does not exist"
**Solução:** A migration `20260122_create_subscription_tables.sql` não foi aplicada.
Execute-a primeiro!

### Erro: "column 'tier' already exists"
**Solução:** Migration já foi aplicada antes. Pode ignorar ou comentar a seção `ADD COLUMN tier`.

### Dashboard mostra "Modo Demo"
**Possíveis causas:**
1. Migration não foi aplicada → Rode novamente
2. Permissões RLS bloqueando → Verifique políticas
3. Frontend usando tabela errada → Verifique `useConversionMetrics.ts` (já atualizado)

**Debug:**
```sql
-- Verificar se consegue ler usuarios
SELECT COUNT(*) FROM public.usuarios;

-- Verificar RLS
SELECT * FROM pg_policies
WHERE tablename = 'usuarios';
```

---

## 🎯 Próximos Passos (Após Migration)

### 1. Integrar Tracking Automático

Quando usuário bate limite, inserir em `conversion_triggers`:

```typescript
// Exemplo: quando bate chat limit
await supabase
  .from('conversion_triggers')
  .insert({
    user_id: user.id,
    trigger_type: 'chat_daily_limit',
    context: {
      current_count: 30,
      limit: 30,
      days_since_signup: 5
    },
    converted: false
  });
```

### 2. Marcar Como Convertido

Quando usuário faz upgrade após trigger:

```typescript
// Marcar trigger como convertido
await supabase.rpc('mark_trigger_converted', {
  p_trigger_id: triggerId,
  p_user_id: user.id
});
```

### 3. Definir Tier ao Criar Subscription

No webhook do Mercado Pago, ao inserir em `usuarios`:

```typescript
await supabase
  .from('usuarios')
  .insert({
    id: userId,
    plan_type: 'monthly',
    tier: 'essentials', // ← Definir tier correto
    subscription_status: 'active',
    // ...
  });
```

---

## ✅ Checklist de Verificação

Antes de considerar completo:

- [ ] Migration executada sem erros
- [ ] Tabela `conversion_triggers` existe
- [ ] Views `user_distribution`, `conversion_stats`, `conversion_funnel` funcionam
- [ ] Coluna `tier` adicionada em `usuarios`
- [ ] Dashboard mostra dados reais (sem banner "Modo Demo")
- [ ] Gráficos funcionais
- [ ] Botão Refresh funciona
- [ ] Botão Export CSV funciona
- [ ] Dados de teste inseridos (opcional)

---

## 📝 Diferenças: Frontend vs Backend

### Frontend esperava:
```typescript
{
  subscription_plan: 'free' | 'essentials_monthly' | 'premium_monthly' | 'premium_annual'
}
```

### Backend usa:
```typescript
{
  plan_type: 'monthly' | 'annual',
  tier: 'essentials' | 'premium' | 'vip'
}
```

### Mapeamento:
- `tier: 'essentials'` + `plan_type: 'monthly'` = Essentials Monthly (R$ 14,90)
- `tier: 'premium'` + `plan_type: 'monthly'` = Premium Monthly (R$ 29,90)
- `tier: 'premium'` + `plan_type: 'annual'` = Premium Annual (R$ 299)

**O hook `useConversionMetrics` já foi atualizado** para fazer esse mapeamento! ✅

---

## 🎉 Conclusão

Após aplicar a migration:
- ✅ Dashboard funciona com dados reais
- ✅ Tracking de conversion triggers habilitado
- ✅ Views agregadas para analytics
- ✅ Compatível com estrutura existente do backend

Execute a migration e me avise se funcionou! 🚀
