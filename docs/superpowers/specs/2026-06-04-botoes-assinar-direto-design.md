# Botões de oferta → /assinar direto (logado pula cadastro)

**Data:** 2026-06-04
**Status:** Aprovado (aguardando review do spec)

## Contexto / Problema

Os CTAs de assinatura do app apontam para destinos inconsistentes:
- Muitos vão para `/register?plan=annual&from=…`, forçando criação de conta antes de qualquer coisa.
- Alguns já vão para `/assinar?plan=…` mas **sem** `step=plan`, caindo no funil de onboarding (goals → validação) antes do plano.
- Alguns já usam o padrão novo `/assinar?step=plan&plan=…&from=…` (EcotopiaAnsiedade, Aneis, Dispenza, Diario, EcoIA).
- O `UpgradeModal` in-app dispara checkout próprio (anual → `/app/checkout-anual` com Pix; mensal → Mercado Pago direto).

**Objetivo:** todo CTA de assinatura cai **direto na aba `/assinar` no passo de plano**, e quem
**já está logado não passa por cadastro**.

## Decisões (confirmadas com o usuário)

1. **Onde cair:** todos em `/assinar?step=plan` (pula goals/validação).
   - Logado: plano → pagamento (sem cadastro).
   - Guest: plano → cadastro → pagamento.
2. **Escopo:** todos os CTAs de assinatura — funis, landing e `UpgradeModal`.
3. **UpgradeModal:** unificado para `/assinar` (pagamento por cartão no `/assinar`; o anual perde o
   Pix da `checkout-anual`, que vira legado). Aceito.

## Formato único de destino

```
/assinar?step=plan&plan=<monthly|annual>&from=<origem>
```

`AssinarPage` **não muda**: `continueFromPlan = () => setStep(user ? "card" : "signup")` (linha 99)
já entrega "logado pula cadastro". `parsePlan` faz default `monthly` quando o param falta.

## Mudanças

### Grupo A — `/register?plan=…` → `/assinar?step=plan&plan=…&from=…`
Preservar `plan` e `from` (inclusive os dinâmicos `${...}`). Remover `returnTo` (irrelevante no /assinar).
- `src/pages/EcotopiaPrecosPage.tsx` L61
- `src/pages/EcotopiaMeditacaoPage.tsx` L218,241,266,289,313,337,397,405,446
- `src/pages/EcotopiaSonoPage.tsx` L440,510
- `src/pages/CodigoDaAbundanciaPage.tsx` L87 (`openCheckout`)
- `src/components/sleep/SleepMeditationExperience.tsx` L91 (`openCheckout`) — cobre os cards de sono
  (`SleepProtocolOfferCard`, `SonoPostExperienceModal`, `SonoGuestPostFlow` via prop `onCheckout`)
- `src/pages/guest/EcoDreamGuestPage.tsx` L229
- `src/pages/energy-blessings/MeditationPlayerPage.tsx` L63

### Grupo B — adicionar `step=plan` aos `/assinar` que não têm
- `src/components/landing/EcotopiaHero.tsx` L101,130
- `src/components/landing/EcotopiaTopbar.tsx` L222,279,388,400
- `src/components/landing/FechamentoSection.tsx` L24
- `src/components/landing/JoinSection.tsx` L26
- `src/components/landing/PrecoSection.tsx` L67,94
- `src/pages/EcotopiaMeditacaoPage.tsx` L195,376

### Grupo C — UpgradeModal
`src/components/subscription/UpgradeModal.tsx` `handleSubscribe` (L108-144): substituir o
createSubscription/checkout-anual por:
```ts
onClose();
navigate(`/assinar?step=plan&plan=${selectedPlan}&from=upgrade_modal`);
```
Manter o tracking de clique (mixpanel) se simples; remover estados `loading/error` do checkout MP se
ficarem órfãos (sem quebrar o resto do modal).

### Fora de escopo (não mexer)
- Gates de conteúdo: `MeditationGuestGate`, `RitualGuestGate`, teasers do Diário (`/register` com
  `returnTo` para acessar conteúdo grátis).
- `DrJoePreviewPage`: cadastro inline (preview grátis), não botão→assinar.
- `CheckoutAnualPage`: vira legado; deixar a página como está (não deletar).

## Testes

- Atualizar asserts que checam destino antigo (`/register?plan=…`) para o novo `/assinar?step=plan…`
  se existirem (ex.: testes de SleepProtocolOfferCard usam `onCheckout` mockado — provavelmente OK).
- Verificar testes do `UpgradeModal` (se houver) quanto ao novo comportamento de navegação.

## Verificação

1. `rg "/register\?plan" src` → 0 (exceto gates de conteúdo fora de escopo, se houver).
2. `rg "to=\"/assinar(?!\?step=plan)" ` — todos os `/assinar` de CTA com `step=plan` (menos os que já
   especificam outro step intencionalmente).
3. `npm run build` e testes afetados verdes.
4. Manual (`npm run dev`): clicar CTAs em landing, /sono, /codigo-da-abundancia, UpgradeModal —
   logado cai em plano→pagamento sem cadastro; deslogado cai em plano→cadastro→pagamento.
