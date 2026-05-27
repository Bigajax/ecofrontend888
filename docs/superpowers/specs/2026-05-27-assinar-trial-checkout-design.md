# Spec — Tela de Assinatura/Trial estilo Headspace (`/assinar`)

**Data:** 2026-05-27
**Branch:** `feat/trial-freemium-pricing` (front + back)
**Status:** aprovado para planejamento

## Contexto

Hoje os CTAs de compra da landing (`PrecoSection` e outros) levam a `/register?plan=…`
— cadastro sem cartão, e a cobrança acontece depois num fluxo separado
(`CheckoutAnualPage`, à vista). Queremos uma experiência única estilo **Headspace**:
uma tela split-screen que combina **proposta de valor + timeline do trial + seletor de
plano** (esquerda) com **cadastro + cartão embutido** (direita), iniciando o trial de
**7 dias** (cobrança automática depois) no plano mensal.

Resultado desejado: aumentar conversão concentrando "decidir plano → criar conta →
pagar/iniciar trial" numa só tela, sem redirecionar para fora.

## Decisões (confirmadas com o usuário)

- **Modelo do trial:** cartão agora, **R$0 hoje, cobra em 7 dias** (assinatura recorrente
  com `free_trial`) — apenas no **mensal**.
- **Planos na tela:** **Mensal** (R$15,90/mês recorrente + trial 7d) **e Anual**
  (R$142,80 **à vista**, sem trial). Toggle estilo Headspace; a timeline se adapta.
- **Cartão:** **embutido** (brick `CardPayment` do Mercado Pago, transparente) — sem sair
  da tela.
- **Login social:** **só Google** (já configurado).
- **Abordagem:** rota dedicada split-screen (Abordagem A).

## O que já existe (reutilizar)

- **Anual à vista, cartão embutido:** `POST /api/payments/annual/card` (+ Pix +
  `GET /api/payments/status/:id`) e o padrão de brick em `src/pages/CheckoutAnualPage.tsx`
  (init MP SDK, `authHeaders`, `friendlyError`, máscara CPF, polling).
- **Mensal recorrente + trial 7d:** `MercadoPagoService.createMonthlyPreapproval` —
  porém **só via `init_point` (redirect)**, sem `card_token`.
- **Webhook de preapproval:** `webhookController.processPreapprovalEvent` trata
  `authorized` (1ª cobrança → `trial_started`), renovação e `cancelled`. Schema com
  `trial_start_date`, `trial_end_date`, `provider_preapproval_id`, `current_period_end`.
- **Auth:** `AuthContext` com signup email/senha e `signInWithGoogle` (Supabase).
- **Callback:** `src/pages/SubscriptionCallbackPage.tsx` (`/app/subscription/callback`)
  faz polling de `GET /api/subscription/status` e detecta trial/premium.
- **Analytics:** `src/lib/mixpanelConversionEvents.ts`.

## Arquitetura

```
Landing CTA → /assinar?plan=monthly|annual&from=<origem>
  AssinarPage (rota pública, fora de RequireAuth)
   ├─ TrialPlanPanel (esquerda): seletor de plano + timeline adaptada
   └─ painel direito (máquina de 2 passos):
       step "signup" (se sem sessão Supabase)
          └─ cria conta (email/senha ou Google) → sessão → step "card"
       step "card"
          ├─ MpCardForm (brick CardPayment → card_token + payer)
          ├─ monthly → POST /api/subscription/create-with-card  (NOVO)
          └─ annual  → POST /api/payments/annual/card           (existe)
   → sucesso → /app/subscription/callback (polling existente)
```
Usuário já logado entra direto no step "card".

### Frontend (novos)

- `src/pages/AssinarPage.tsx` — orquestra layout, lê `?plan`/`?from`, controla o passo
  (`signup` | `card`) com base na sessão (`useAuth`), troca de plano, navegação de sucesso.
- `src/components/assinar/TrialPlanPanel.tsx` — painel esquerdo: seletor Anual/Mensal
  (Anual com selo "melhor valor") + timeline condicional ao plano.
- `src/components/assinar/SignupStep.tsx` — formulário Nome, Sobrenome, Email, Senha (≥8),
  checkbox Termos, botão "Criar conta" + "Continuar com Google" + link "Já tem conta?
  Entrar". Google usa `returnTo=/assinar?plan=…&step=card`.
- `src/components/assinar/MpCardForm.tsx` — encapsula o brick `CardPayment`; emite
  `onToken({ token, payment_method_id, installments, payer })`; estados loading/erro
  (reusa `friendlyError`). Submissão por plano fica no `AssinarPage`.

### Timeline (TrialPlanPanel), por plano

- **Mensal:** `Hoje · R$0` (acesso completo) → `Em 7 dias` (aviso de fim do trial) →
  `Depois · R$15,90/mês` (cancele quando quiser).
- **Anual:** `Hoje · R$142,80` (1 ano completo · economia de R$48 · R$11,90/mês) →
  `Acesso imediato por 12 meses`. (Sem linha de "$0 hoje".)

### Backend (novos)

- `MercadoPagoService.createMonthlyPreapprovalWithCard(userId, email, cardTokenId)`:
  `PreApproval.create` com `card_token_id`, `payer_email`, `external_reference: userId`,
  `auto_recurring { frequency:1, frequency_type:"months", transaction_amount:15.9,
  currency_id:"BRL", free_trial:{ frequency:7, frequency_type:"days" } }`,
  `status:"authorized"`, `back_url:.../app/subscription/callback`. Retorna `{ id, status }`.
- `POST /api/subscription/create-with-card` (`requireAuth`) em `subscriptionRoutes.ts` +
  handler no `subscriptionController.ts`:
  - Body: `{ plan:"monthly", card_token_id, payer:{ email, identification } }` (validação
    análoga à do `/annual/card`).
  - Chama o método; ativa otimista `trial` (plan_type `monthly`, `provider_preapproval_id`)
    via `SubscriptionService`; o webhook reconcilia (`trial_started`). Idempotente.
  - **Fallback:** se a conta MP não suportar preapproval transparente, retorna
    `{ initPoint }` e o front redireciona nesse passo (só mensal).
- Anual: sem mudança (reusa `/api/payments/annual/card`).

### Wiring das CTAs da landing

Repontar pontos de compra para `/assinar?plan=…&from=…`:
- `src/components/landing/PrecoSection.tsx`: "Começar" → `plan=monthly`; CTA anual (hoje
  "Começar 7 dias gratuitos" → enganoso, anual é à vista) → copy "Assinar anual",
  `plan=annual`.
- Demais CTAs de compra (hero/promo/CTA final "Prepare-se para o início") → `plan=monthly`.
- Conjunto exato das CTAs será levantado por grep no plano de implementação.

## Estilo (frontend-design)

Checkout premium e on-brand: esquerda com gradiente claro baby-blue/céu (alinhado à
`ecotopia-landing.css`), título em **Geist**, itens/subtítulos em **Lora** (`.eco-subtitle`);
direita em cartão branco/glass arredondado. Timeline como stepper vertical. Respeitar
`prefers-reduced-motion`.

## Estados / erros / analytics

- Erros de cartão via `friendlyError` (reaproveitar do `CheckoutAnualPage`).
- Sucesso (monthly authorized / annual approved) → `/app/subscription/callback`.
- Mixpanel: checkout iniciado, conta criada, trial iniciado / pagamento aprovado
  (`mixpanelConversionEvents`).

## Testes

- `AssinarPage`: troca de plano muda a timeline; deslogado mostra signup e loga→card;
  logado pula pro card; lê `?plan`/`?step`.
- `MpCardForm`: emite token no submit; mostra loading/erro.
- Backend `create-with-card`: monta `auto_recurring.free_trial`; valida auth/body; caminho
  de fallback (init_point). Webhook `processPreapprovalEvent` já coberto.

## Riscos / dependências externas

1. **Preapproval transparente com `card_token`** depende da conta MP habilitar "assinatura
   com checkout próprio". Mitigação: fallback `init_point` no passo do cartão do mensal.
2. **Google OAuth returnTo** deve voltar no passo do cartão (`&step=card`).
3. Copy "7 dias gratuitos" no CTA anual está incorreta hoje — alinhar.

## Fora de escopo (YAGNI)

- Apple/Facebook login (só Google).
- Anual recorrente com trial (anual permanece à vista).
- Pix no passo do mensal (trial recorrente é por cartão; Pix segue só no anual).
- Refatorar o `CheckoutAnualPage` inteiro (extrai-se só o necessário para `MpCardForm`).

## Verificação (end-to-end)

1. `npm run dev`; landing → CTA mensal → `/assinar?plan=monthly`.
2. Deslogado: criar conta (email/senha) → brick de cartão → cartão de teste MP →
   trial inicia (R$0), redireciona pro callback, `status` = trial.
3. Trocar para Anual: timeline muda para cobrança imediata; cartão → R$142,80 → premium.
4. Google: login social volta no passo do cartão.
5. Webhook sandbox MP → `trial_started` / renovação refletem no `status`.
6. `npm run build` (front) e `npm run build` (back, `tsc --noEmit`) sem erros.
