# ✅ VERIFICAÇÃO DO SISTEMA DE ASSINATURA

Este documento te guia passo a passo para verificar se tudo está configurado corretamente.

---

## 📋 CHECKLIST GERAL

- [ ] **PASSO 1:** Verificar migração no Supabase
- [ ] **PASSO 2:** Verificar rotas do backend
- [ ] **PASSO 3:** Verificar webhook no Mercado Pago
- [ ] **PASSO 4:** Testar fluxo completo

---

## 1️⃣ VERIFICAR MIGRAÇÃO NO SUPABASE

### O que fazer:

1. **Acessar Supabase:**
   - Ir em: https://supabase.com/dashboard
   - Selecionar seu projeto ECO
   - Clicar em "SQL Editor" no menu lateral

2. **Executar query de verificação:**

```sql
-- Verificar colunas da tabela usuarios
SELECT column_name, data_type, is_nullable
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
```

3. **Verificar tabelas novas:**

```sql
-- Verificar se tabelas foram criadas
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('subscription_events', 'payments')
ORDER BY table_name;
```

### ✅ Resultado Esperado:

**Query 1 deve retornar 9 linhas:**
```
column_name               | data_type         | is_nullable
--------------------------|-------------------|------------
access_until              | timestamp         | YES
current_period_end        | timestamp         | YES
plan_type                 | varchar(50)       | YES
provider                  | varchar(50)       | YES
provider_payment_id       | varchar(255)      | YES
provider_preapproval_id   | varchar(255)      | YES
subscription_status       | varchar(50)       | YES
trial_end_date            | timestamp         | YES
trial_start_date          | timestamp         | YES
```

**Query 2 deve retornar 2 linhas:**
```
table_name
--------------------
payments
subscription_events
```

### ❌ Se NÃO aparecer as colunas/tabelas:

**Você precisa rodar a migração:**

1. Abrir arquivo: `MIGRATION_SUBSCRIPTION.sql`
2. Copiar TODO o conteúdo
3. Colar no SQL Editor do Supabase
4. Clicar em "Run" (ou Ctrl+Enter)
5. Verificar se executou sem erros
6. Rodar as queries de verificação novamente

---

## 2️⃣ VERIFICAR ROTAS DO BACKEND

### O que fazer:

Vou criar um script de teste que você pode rodar para verificar se as rotas existem.

**Criar arquivo:** `test-backend-routes.js`

```javascript
// test-backend-routes.js
const BACKEND_URL = 'https://ecobackend888.onrender.com';

async function testRoutes() {
  console.log('🔍 TESTANDO ROTAS DO BACKEND\n');
  console.log(`Backend URL: ${BACKEND_URL}\n`);

  // 1. Testar GET /health
  console.log('1️⃣ Testando GET /health (servidor funcionando?)');
  try {
    const response = await fetch(`${BACKEND_URL}/health`);
    const data = await response.json();
    console.log(`   ✅ Status: ${response.status}`);
    console.log(`   📦 Resposta:`, data);
  } catch (error) {
    console.log(`   ❌ ERRO:`, error.message);
  }
  console.log('');

  // 2. Testar GET /api/subscription/status (sem auth - deve retornar 401)
  console.log('2️⃣ Testando GET /api/subscription/status');
  try {
    const response = await fetch(`${BACKEND_URL}/api/subscription/status`);
    console.log(`   Status: ${response.status}`);
    if (response.status === 401) {
      console.log(`   ✅ Rota existe! (401 = precisa autenticação)`);
    } else if (response.status === 404) {
      console.log(`   ❌ Rota NÃO existe! (404)`);
    } else {
      const data = await response.json();
      console.log(`   📦 Resposta:`, data);
    }
  } catch (error) {
    console.log(`   ❌ ERRO:`, error.message);
  }
  console.log('');

  // 3. Testar POST /api/subscription/create-preference (sem auth - deve retornar 401)
  console.log('3️⃣ Testando POST /api/subscription/create-preference');
  try {
    const response = await fetch(`${BACKEND_URL}/api/subscription/create-preference`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: 'monthly' })
    });
    console.log(`   Status: ${response.status}`);
    if (response.status === 401) {
      console.log(`   ✅ Rota existe! (401 = precisa autenticação)`);
    } else if (response.status === 404) {
      console.log(`   ❌ Rota NÃO existe! (404)`);
    } else {
      const data = await response.json();
      console.log(`   📦 Resposta:`, data);
    }
  } catch (error) {
    console.log(`   ❌ ERRO:`, error.message);
  }
  console.log('');

  // 4. Testar POST /api/webhooks/mercadopago (deve existir mas rejeitar request)
  console.log('4️⃣ Testando POST /api/webhooks/mercadopago');
  try {
    const response = await fetch(`${BACKEND_URL}/api/webhooks/mercadopago`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: true })
    });
    console.log(`   Status: ${response.status}`);
    if (response.status === 404) {
      console.log(`   ❌ Rota NÃO existe! (404)`);
    } else {
      console.log(`   ✅ Rota existe!`);
      const data = await response.json().catch(() => ({}));
      console.log(`   📦 Resposta:`, data);
    }
  } catch (error) {
    console.log(`   ❌ ERRO:`, error.message);
  }
  console.log('');

  console.log('═══════════════════════════════════════════');
  console.log('📊 RESUMO:');
  console.log('═══════════════════════════════════════════');
  console.log('Se as rotas retornaram 401 ou 200, elas EXISTEM ✅');
  console.log('Se retornaram 404, elas NÃO EXISTEM ❌');
  console.log('');
}

testRoutes();
```

**Como executar:**

```bash
# No terminal (dentro da pasta do frontend):
node test-backend-routes.js
```

### ✅ Resultado Esperado:

```
🔍 TESTANDO ROTAS DO BACKEND

Backend URL: https://ecobackend888.onrender.com

1️⃣ Testando GET /health
   ✅ Status: 200
   📦 Resposta: { status: 'ok' }

2️⃣ Testando GET /api/subscription/status
   Status: 401
   ✅ Rota existe! (401 = precisa autenticação)

3️⃣ Testando POST /api/subscription/create-preference
   Status: 401
   ✅ Rota existe! (401 = precisa autenticação)

4️⃣ Testando POST /api/webhooks/mercadopago
   Status: 200
   ✅ Rota existe!
```

### ❌ Se alguma rota retornar 404:

**Significa que o backend NÃO tem essa rota implementada.**

Você precisa implementar seguindo o arquivo: `BACKEND_SUBSCRIPTION_TODO.md`

---

## 3️⃣ VERIFICAR WEBHOOK NO MERCADO PAGO

### O que fazer:

1. **Acessar painel do Mercado Pago:**
   - URL: https://www.mercadopago.com.br/developers/panel/app
   - Fazer login com sua conta

2. **Selecionar sua aplicação:**
   - Se não tem aplicação, criar uma nova
   - Nome: "ECO ASSINATURA" (ou qualquer nome)

3. **Ir em "Webhooks":**
   - Menu lateral > "Webhooks"
   - OU: https://www.mercadopago.com.br/developers/panel/app/webhooks

4. **Verificar se webhook está configurado:**

### ✅ Deve ter:
```
URL de produção:
https://ecobackend888.onrender.com/api/webhooks/mercadopago

Eventos selecionados:
✅ payment
✅ subscription_preapproval

Status: Ativo
```

### ❌ Se NÃO tiver configurado:

**Configurar agora:**

1. Clicar em "Configurar URLs" ou "Adicionar Webhook"
2. Preencher:
   - **URL de produção:** `https://ecobackend888.onrender.com/api/webhooks/mercadopago`
   - **Eventos:** Selecionar:
     - `payment` (Pagamentos)
     - `subscription_preapproval` (Assinaturas)
3. Clicar em "Salvar"
4. **IMPORTANTE:** Anotar o "Secret" se aparecer (você precisa dele no backend)

---

## 4️⃣ TESTAR FLUXO COMPLETO

### Teste Manual (Ambiente de Teste):

1. **Frontend:** Abrir modal de assinatura
2. **Selecionar plano:** Mensal ou Anual
3. **Clicar:** "Começar 7 Dias Grátis"
4. **Verificar:** Frontend deve chamar `POST /api/subscription/create-preference`
5. **Verificar:** Backend deve retornar `initPoint` (link do Mercado Pago)
6. **Verificar:** Frontend redireciona para Mercado Pago
7. **Pagar:** Usar cartão de teste (se estiver em sandbox)
8. **Mercado Pago:** Redireciona de volta para `/app/subscription/callback`
9. **Frontend:** Chama `GET /api/subscription/status` (com retry)
10. **Verificar:** Status deve retornar `{ isPremium: true }`

### Cartões de Teste (Sandbox Mercado Pago):

```
Aprovado:
Número: 5031 4332 1540 6351
CVV: 123
Validade: 11/25

Rejeitado:
Número: 5031 7557 3453 0604
CVV: 123
Validade: 11/25
```

---

## 📝 FORMULÁRIO DE VERIFICAÇÃO

Preencha conforme for testando:

```
PASSO 1: Migração Supabase
- [ ] Coluna trial_start_date existe
- [ ] Coluna trial_end_date existe
- [ ] Coluna access_until existe
- [ ] Coluna plan_type existe
- [ ] Coluna subscription_status existe
- [ ] Tabela subscription_events existe
- [ ] Tabela payments existe

PASSO 2: Rotas Backend
- [ ] GET /health funciona
- [ ] GET /api/subscription/status existe (401)
- [ ] POST /api/subscription/create-preference existe (401)
- [ ] POST /api/webhooks/mercadopago existe (200/400)

PASSO 3: Webhook Mercado Pago
- [ ] Conta Mercado Pago criada
- [ ] Aplicação criada
- [ ] Webhook configurado
- [ ] URL: https://ecobackend888.onrender.com/api/webhooks/mercadopago
- [ ] Eventos: payment + subscription_preapproval

PASSO 4: Teste Completo
- [ ] Modal abre
- [ ] Redireciona para Mercado Pago
- [ ] Pagamento funciona
- [ ] Webhook recebido
- [ ] Status atualizado no banco
- [ ] Frontend mostra premium ativo
```

---

## 🆘 PROBLEMAS COMUNS

### Problema 1: "404 Not Found" nas rotas

**Causa:** Backend não tem as rotas implementadas

**Solução:** Implementar rotas conforme `BACKEND_SUBSCRIPTION_TODO.md`

---

### Problema 2: Webhook não chega no backend

**Causa 1:** URL errada no painel Mercado Pago
**Solução:** Verificar URL está correta

**Causa 2:** Backend não está no ar
**Solução:** Testar `GET /health` para ver se backend responde

**Causa 3:** Webhook retornando erro
**Solução:** Verificar logs do backend (Render.com > Logs)

---

### Problema 3: Status não atualiza após pagamento

**Causa:** Webhook não está atualizando o banco

**Solução:**
1. Verificar logs do webhook
2. Testar manualmente inserir dados no banco:

```sql
-- Testar manualmente dar premium para seu usuário
UPDATE usuarios
SET
  plan_type = 'monthly',
  subscription_status = 'active',
  trial_start_date = NOW(),
  trial_end_date = NOW() + INTERVAL '7 days',
  access_until = NOW() + INTERVAL '7 days',
  provider = 'mercadopago'
WHERE email = 'seu_email@teste.com';

-- Verificar se funcionou
SELECT
  email,
  plan_type,
  subscription_status,
  access_until,
  access_until > NOW() as tem_acesso
FROM usuarios
WHERE email = 'seu_email@teste.com';
```

---

## 📞 PRÓXIMOS PASSOS

Depois de verificar tudo, me avise:

1. ✅ O que está funcionando
2. ❌ O que está faltando
3. 🆘 Onde você está travado

E eu te ajudo a resolver!

---

**Última atualização:** 2026-01-27
