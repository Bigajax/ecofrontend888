# Sistema de Tracking de Conversão Premium - Implementação Completa

## ✅ Implementado

### FASE 1: Frontend (ecofrontend888)

#### 1.1 Biblioteca de Eventos Mixpanel
**Arquivo**: `src/lib/mixpanelConversionEvents.ts`

Funções criadas:
- ✅ `trackPremiumScreenViewed()` - Camada 1: Quando modal/tela premium abre
- ✅ `trackPremiumCardClicked()` - Camada 1: Quando clica em plano específico
- ✅ `trackCheckoutStarted()` - Camada 2: Quando inicia checkout (cria preferência MP)
- ✅ `trackSubscriptionPaid()` - Camada 3: Quando pagamento é confirmado (callback)
- ✅ `trackPaymentFailed()` - Camada 3: Quando pagamento falha (callback)

#### 1.2 UpgradeModal com Tracking
**Arquivo**: `src/components/subscription/UpgradeModal.tsx`

Mudanças:
- ✅ Import das funções de tracking
- ✅ `useEffect` para tracking de `Premium Screen Viewed` quando modal abre
- ✅ `handlePlanSelect` atualizado com `trackPremiumCardClicked()`
- ✅ `handleSubscribe` atualizado com `trackCheckoutStarted()` após criar preferência

#### 1.3 SubscriptionCallbackPage com Tracking
**Arquivo**: `src/pages/SubscriptionCallbackPage.tsx`

Mudanças:
- ✅ Import das funções de tracking
- ✅ Tracking de `Subscription Paid` quando pagamento é confirmado
- ✅ Tracking de `Payment Failed` quando há erro

### FASE 2: Backend (ecobackend888)

#### 2.1 Mixpanel Instalado
- ✅ Pacote `mixpanel@0.18.1` já estava instalado em `server/package.json`

#### 2.2 Serviço de Analytics
**Arquivo**: `server/services/mixpanel.ts` (NOVO)

Funções criadas:
- ✅ `trackSubscriptionPaid()` - Webhook tracking quando pagamento aprovado
- ✅ `trackPaymentFailed()` - Webhook tracking quando pagamento rejeitado
- ✅ `trackSubscriptionCreated()` - Webhook tracking quando assinatura criada
- ✅ `isMixpanelConfigured()` - Verifica se token está configurado

#### 2.3 Webhook Controller Atualizado
**Arquivo**: `server/controllers/webhookController.ts`

Mudanças:
- ✅ Import das funções de tracking do Mixpanel
- ✅ `processPaymentEvent()` atualizado:
  - Tracking de `Subscription Paid` quando `payment.status === 'approved'`
  - Tracking de `Payment Failed` quando `payment.status === 'rejected' || 'cancelled'`
- ✅ `processPreapprovalEvent()` atualizado:
  - Tracking de `Subscription Created` quando trial inicia (`isFirstCharge`)
  - Tracking de `Subscription Paid` quando renovação mensal ocorre

#### 2.4 Rotas de Webhooks
**Arquivo**: `server/routes/webhookRoutes.ts`

Status: ✅ JÁ EXISTIA
- Rota `POST /api/webhooks/mercadopago` já estava implementada
- Controller `mercadoPagoWebhookHandler` já estava funcionando

#### 2.5 Variáveis de Ambiente
**Arquivo**: `server/.env`

Adicionado:
- ✅ `MIXPANEL_TOKEN=your-mixpanel-token-here` (comentado para preenchimento)
- ✅ Comentários sobre `MP_ACCESS_TOKEN` e `MP_WEBHOOK_SECRET`

## 📊 Eventos Implementados

### Camada 1: Intenção Topo (Frontend)
| Evento | Quando ocorre | Propriedades principais |
|--------|---------------|------------------------|
| `Premium Screen Viewed` | Modal/tela Premium abre | `plan_id`, `price`, `placement`, `is_guest` |
| `Premium Card Clicked` | Clica em plano específico | `plan_id`, `price`, `placement`, `is_guest` |

### Camada 2: Intenção Média (Frontend)
| Evento | Quando ocorre | Propriedades principais |
|--------|---------------|------------------------|
| `Checkout Started` | Cria preferência MP e redireciona | `plan_id`, `preference_id`, `checkout_provider`, `amount` |

### Camada 3: Conversão Real (Backend via Webhook)
| Evento | Quando ocorre | Propriedades principais |
|--------|---------------|------------------------|
| `Subscription Created` | Webhook recebe assinatura autorizada | `plan_id`, `mp_status`, `preapproval_id`, `source: 'backend_webhook'` |
| `Subscription Paid` | Webhook recebe pagamento aprovado | `plan_id`, `mp_status`, `payment_method`, `transaction_amount`, `mp_id` |
| `Payment Failed` | Webhook recebe pagamento rejeitado | `plan_id`, `mp_status`, `error_message`, `mp_id` |

### Camada 3: Conversão Real (Frontend via Callback)
| Evento | Quando ocorre | Propriedades principais |
|--------|---------------|------------------------|
| `Subscription Paid` | Callback page confirma pagamento | `plan_id`, `mp_status`, `transaction_amount`, `source: 'frontend_callback'` |
| `Payment Failed` | Callback page detecta erro | `mp_status`, `error_message`, `source: 'frontend_callback'` |

## 🔧 Configuração Necessária

### 1. Mixpanel Token (Backend)
Edite: `C:\Users\Rafael\Desktop\ecofrontend\ecobackend888\server\.env`

```bash
MIXPANEL_TOKEN=seu-token-mixpanel-aqui
```

**Como obter**:
1. Acesse [Mixpanel Dashboard](https://mixpanel.com)
2. Vá em **Project Settings**
3. Copie o **Project Token**
4. Cole no `.env`

### 2. Mercado Pago Webhook
Configure no [Dashboard do Mercado Pago](https://www.mercadopago.com.br/developers/panel):

**URL do Webhook**:
```
https://ecobackend888.onrender.com/api/webhooks/mercadopago
```

**Eventos para notificar**:
- ✅ `payment` - Pagamentos (plano anual)
- ✅ `subscription_preapproval` - Assinaturas (plano mensal)
- ✅ `subscription_authorized_payment` - Cobranças recorrentes

## 📈 Configuração do Funil no Mixpanel

### Funil Principal: "Premium Conversion"

1. Acesse [Mixpanel Dashboard](https://mixpanel.com) → **Funnels** → **Create New Funnel**

2. Configure os passos:

```
Passo 1: Premium Screen Viewed
Passo 2: Premium Card Clicked
Passo 3: Checkout Started
Passo 4: Subscription Created  (webhook)
Passo 5: Subscription Paid     (webhook)
```

3. **Breakdowns sugeridos**:
   - `plan_id` - Comparar monthly vs annual
   - `placement` - Origem do usuário (ex: 'dr_joe_dispenza')
   - `payment_method` - PIX vs cartão vs boleto

### Cohorts para Retargeting

#### 1. "Viewed But Didn't Buy"
```
Filtro:
- Usuários que fizeram "Premium Screen Viewed" nos últimos 7 dias
- E NÃO fizeram "Subscription Paid"
```

#### 2. "Abandoned Checkout"
```
Filtro:
- Usuários que fizeram "Checkout Started" nos últimos 3 dias
- E NÃO fizeram "Subscription Created"
```

## ✅ Verificação da Implementação

### Teste 1: Frontend Tracking

1. **Abrir modal Premium**
   - Abra o app e clique para ver o Premium
   - ✅ Verificar evento `Premium Screen Viewed` no [Mixpanel Live View](https://mixpanel.com/report/live)

2. **Clicar em plano**
   - Clique no plano "Mensal" ou "Anual"
   - ✅ Verificar evento `Premium Card Clicked` com `plan_id` correto

3. **Iniciar checkout**
   - Clique em "Começar 7 Dias Grátis"
   - ✅ Verificar evento `Checkout Started` com `preference_id`

### Teste 2: Backend Webhook (Simulação)

Use este comando para simular um webhook:

```bash
curl -X POST https://ecobackend888.onrender.com/api/webhooks/mercadopago \
  -H "Content-Type: application/json" \
  -d '{
    "type": "payment",
    "data": {
      "id": "12345678"
    }
  }'
```

✅ Verificar logs do servidor
✅ Verificar evento no Mixpanel Live View com `source: 'backend_webhook'`

### Teste 3: Fluxo Completo (Sandbox MP)

1. Complete um checkout real no **Mercado Pago Sandbox**
2. Use cartão de teste: `5031 4332 1540 6351` / CVV: `123` / Validade: qualquer futura
3. Verificar todos os 5 eventos no funil Mixpanel
4. Confirmar `payment_method` capturado corretamente

## 📊 Métricas de Sucesso

### KPIs Principais

| Métrica | Fórmula | Meta |
|---------|---------|------|
| **CTR de Premium** | `Premium Card Clicked / Premium Screen Viewed` | > 40% |
| **Start Rate** | `Checkout Started / Premium Card Clicked` | > 60% |
| **Conversão Real** | `Subscription Paid / Checkout Started` | > 70% |
| **Conversão End-to-End** | `Subscription Paid / Premium Screen Viewed` | > 15% |

### Análise de Drop-off

Identificar onde usuários abandonam:
- **Drop 1→2**: Modal abre mas não clica → Problema no valor percebido
- **Drop 2→3**: Clica mas não inicia checkout → Problema na decisão
- **Drop 3→4**: Inicia mas não completa pagamento → Problema no fluxo MP
- **Drop 4→5**: Webhook não processa → Problema técnico

## 📁 Arquivos Modificados/Criados

### Frontend (ecofrontend888)
```
✅ CRIADO:  src/lib/mixpanelConversionEvents.ts
✅ EDITADO: src/components/subscription/UpgradeModal.tsx
✅ EDITADO: src/pages/SubscriptionCallbackPage.tsx
```

### Backend (ecobackend888)
```
✅ CRIADO:  server/services/mixpanel.ts
✅ EDITADO: server/controllers/webhookController.ts
✅ EDITADO: server/.env
```

## 🚀 Deploy

### Frontend
```bash
cd C:\Users\Rafael\Desktop\ecofrontend888
npm run build
# Deploy automático via Vercel (git push)
```

### Backend
```bash
cd C:\Users\Rafael\Desktop\ecofrontend\ecobackend888
# Adicionar MIXPANEL_TOKEN no Render Dashboard
# Deploy automático via Render (git push)
```

## 🔍 Troubleshooting

### Eventos não aparecem no Mixpanel

1. **Verificar token configurado**:
   ```typescript
   // Frontend: src/lib/mixpanel.ts
   console.log('Mixpanel token:', import.meta.env.VITE_MIXPANEL_TOKEN);

   // Backend: server/services/mixpanel.ts
   console.log('Mixpanel configured:', isMixpanelConfigured());
   ```

2. **Verificar Live View**:
   - Acesse https://mixpanel.com/report/live
   - Filtre por `distinct_id` (seu user ID)

3. **Verificar logs do servidor**:
   ```bash
   # Render logs
   https://dashboard.render.com/web/srv-xxx/logs
   ```

### Webhook não está sendo chamado

1. **Verificar URL configurada no MP**:
   - Deve ser `https://ecobackend888.onrender.com/api/webhooks/mercadopago`
   - HTTPS obrigatório

2. **Verificar logs do webhook**:
   - Tabela `webhook_logs` no Supabase
   - Query: `SELECT * FROM webhook_logs ORDER BY created_at DESC LIMIT 10;`

3. **Testar manualmente**:
   ```bash
   curl -X POST https://ecobackend888.onrender.com/api/webhooks/mercadopago \
     -H "Content-Type: application/json" \
     -d '{"type":"payment","data":{"id":"test"}}'
   ```

## 📚 Próximos Passos

1. ✅ Implementação completa
2. ⏳ Configurar `MIXPANEL_TOKEN` no backend
3. ⏳ Configurar webhook no Mercado Pago Dashboard
4. ⏳ Criar funil no Mixpanel Dashboard
5. ⏳ Criar cohorts para retargeting
6. ⏳ Monitorar por 7 dias para identificar drop-offs
7. ⏳ A/B test em copy/preços se conversão < 5%

---

**Implementado em**: 03/02/2026
**Status**: ✅ Pronto para configuração e testes
