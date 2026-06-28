# Bônus EcoDream no card da oferta do Protocolo do Sono

**Data:** 2026-06-28
**Tipo:** value-stack (copy/visual) — frontend puro, sem backend/entitlement.

## Context

A oferta R$37/Pix (vitalício, 7 noites) do Protocolo do Sono aparece no passo `offer` do
`SonoInlineCheckout`. Hoje o card lista preço + 4 bullets. Queremos **subir o valor percebido**
acrescentando o EcoDream (interpretação de sonhos da Eco IA) como **bônus** — tema sono+sonhos
casa bem, e o EcoDream já vem de graça pra qualquer conta logada (o que a pessoa é convidada a
criar no passo `save_account` pós-pagamento). Logo, o bônus é **honesto como "incluído"**, não
como "exclusivo".

Achado-chave: EcoDream (`/app/dream`) é só `RequireAuth` — sem premium gate, sem quota. O R$37
concede apenas o entitlement vitalício das 7 noites (por guest_id). Portanto NADA de backend:
puro value-stack na copy da oferta.

## Decisões (confirmadas com o usuário)

- **Natureza:** value-stack na copy (sem backend, sem momento pós-pagamento).
- **Superfície:** só o passo `offer` do `SonoInlineCheckout` (NÃO a tela do Pix / `SonoInlinePix`).
- **Copy da linha:** "Interprete seus sonhos com a Eco".
- **CTA:** muda para **"Liberar as 7 noites + bônus"** (apenas quando a flag está ON).
- **Rollout:** kill-switch `oferta_bonus` (default ON, padrão dos outros testes) + tracking.

## Design

### Posição e visual
Dentro do **card de preço R$37** (passo `offer`), **abaixo dos 4 bullets**, separado por um
divisor (mesmo padrão da borda-topo que separa preço dos bullets hoje). Bloco-assinatura
discreto, no tema violeta do card mas com um **acento dourado/âmbar** (identidade noturna do
EcoDream — lua dourada) pra destacar sem brigar:

```
  ✓ Sem assinatura
  ✓ Sem cobrança mensal
  ✓ Acesso às 7 noites para usar quando quiser
  ✓ Liberação automática após o pagamento
  ───────────────────────────────────────────
  🌙  BÔNUS · EcoDream
      Interprete seus sonhos com a Eco
```

- Ícone: lua (`Moon` do lucide, já usado em SonoPreAudioModal) com cor âmbar suave
  (ex.: `#EEC079`/`#F0C4E8`), num chip de vidro.
- Tag "BÔNUS" em uppercase tracking (eyebrow), título "EcoDream", linha descritiva.
- Sem a palavra "exclusivo" (não seria verdade).

### CTA
`SonoInlineCheckout.tsx` botão do passo `offer` (hoje "Liberar Noite 2 e as 7 noites"):
- flag ON → **"Liberar as 7 noites + bônus"**.
- flag OFF → mantém "Liberar Noite 2 e as 7 noites".

### Kill-switch
Novo `src/lib/ofertaBonus.ts` espelhando `paywallFoco.ts`/`entradaSemModal.ts`:
`isOfertaBonus()` = default ON; OFF via `VITE_OFERTA_BONUS=false` ou `localStorage
eco.oferta_bonus=0`. Documentar em `.env.example`.

### Tracking
`registerOfertaBonus()` em `mixpanelSonoGuestEvents.ts` (mirror de `registerPaywallFoco`),
chamada no mount da experiência (`SleepMeditationExperience`) junto das outras super properties.
Registra super property **`oferta_bonus_ecodream`** (boolean = `isOfertaBonus()`) → `Oferta
vista` (e demais eventos) passam a carregar o estado do rollout pra ler o efeito vs baseline.
Nenhum nome de evento existente muda.

## Arquivos
- `src/lib/ofertaBonus.ts` — NOVO (kill-switch).
- `src/lib/mixpanelSonoGuestEvents.ts` — `registerOfertaBonus()`.
- `src/components/sleep/SleepMeditationExperience.tsx` — chamar `registerOfertaBonus()` no mount.
- `src/components/sono/SonoInlineCheckout.tsx` — bloco do bônus no card de preço (passo `offer`,
  abaixo dos bullets) + CTA condicional. `const ofertaBonus = isOfertaBonus();`.
- `.env.example` — documentar `VITE_OFERTA_BONUS`.

## Não mexer
Preço R$37, fluxo Pix/QR/copia-e-cola, entitlement server-side, Purchase CAPI, tela do Pix
(`SonoInlinePix`), banner 150s, landing /sono. Os outros bullets do card ficam intactos (só
acrescentamos o bloco do bônus).

## Verificação
- Unit: `ofertaBonus` util (env/localStorage), `registerOfertaBonus` super property,
  e o passo `offer` renderiza o bloco do bônus + CTA "+ bônus" com flag ON / esconde + CTA
  original com flag OFF (estender `SonoInlineCheckout.offerOrder.test.tsx` ou novo arquivo).
- `npm run lint`, suíte sono, `npm run build` limpo.
- Browser: `/sono/experiencia` → abrir a oferta (tocar noite bloqueada / continuar n2) → ver o
  bloco "BÔNUS · EcoDream" abaixo dos bullets e o CTA "+ bônus"; conferir que flag OFF
  (`localStorage eco.oferta_bonus=0`) volta ao card atual.

## Fora de escopo
Momento-presente pós-pagamento ("você ganhou o EcoDream") e qualquer exclusividade real
(gating/quota no backend) — ficam pra depois se quiser elevar de value-stack pra entitlement.
