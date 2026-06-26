# Funil da Experiência do Sono — mapa completo (anúncio → desbloqueio)

Mapa ponta-a-ponta do funil "convite" da experiência do sono: do criativo até as 7
noites liberadas. Cobre rotas, componentes, eventos de analytics e onde medir drop-off.

> **Duas taxonomias no mesmo funil** (atenção ao montar funis no Mixpanel):
> - `Funil Sono · …` — landing/checkout de assinatura (`mixpanelAssinarFunnel.ts`).
> - `Funil Protocolo · …` — experiência guest / Noite 1 (`mixpanelSonoGuestEvents.ts`).
> Ambos pertencem a este funil; os passos abaixo dizem qual prefixo cada evento usa.

## Fluxo

```
Criativo (link com ?hero=deite_se)
  │
  ▼
LANDING CONVITE  /sono?hero=deite_se            [EcotopiaSonoPage]
  • variante de hero "deite_se" (useSonoHeroVariant)
  • TODOS os CTAs (hero, protocolo, meio, oferta, dicas) → experiência
    (helpers sonoCtaTo/sonoCtaClick; nas outras 3 variantes vão pro /assinar)
  │
  ▼
EXPERIÊNCIA      /sono/experiencia               [SleepMeditationExperience (guest)]
  • hero "convite" "Deite-se. O resto a gente conduz."  [SonoExperienceHero]
  • CTA "Ouvir agora" → Noite 1
  │
  ▼
PRÉ-ÁUDIO        SonoPreAudioModal               [SonoPreAudioModal]
  • "Esta é a Noite 1 de 7…" — planta a oferta antes de ouvir (só guest não-pago)
  │
  ▼
NOITE 1 (áudio ~8 min)                           [GuestSonoPlayer]
  • toca SEM login; estado em sessionStorage
  │  (ao concluir ~95%)
  ▼
CHECKOUT INLINE                                  [SonoInlineCheckout]
  reflexão → oferta → Pix → desbloqueio → salvar conta (opcional)
  • Pix único vitalício (SonoInlinePix); PAGAMENTO ANTES da conta
  • preço vem do backend (/api/payments/sono-pix/config), fallback R$37
  • confirmação por polling do webhook + unlock otimista (justSubscribed)
  • cadastro opcional pós-pagamento reusa register/Google (SonoInlineSignup)
  │
  ▼
7 NOITES LIBERADAS (na própria /sono/experiencia)
  • entitlement por guest_id (webhook); claimLifetime vincula à conta salva
```

> **Modelo de pagamento (jun/2026):** este funil migrou de **cartão + trial** para
> **Pix único vitalício**. A ordem real é `reflection → offer → pix → unlocked →
> save_account`. Os passos `signup`/`card`/`confirming` ainda existem no type
> `SonoCheckoutStep` mas estão **aposentados** aqui (cartão segue só no `/assinar` e
> plano anual). Pagamento vem PRIMEIRO; a conta é opcional, pedida depois.

## Passos e eventos

| # | Passo | Rota / componente | Gatilho | Evento(s) | Drop-off a medir |
|---|-------|-------------------|---------|-----------|------------------|
| 1 | Headline exibida | `/sono` · EcotopiaSonoPage | mount | `Funil Sono · Headline exibida` {variant:`deite_se`} + super property `sono_hero_variant` | qual variante converte |
| 2 | Landing vista | `/sono` · EcotopiaSonoPage | mount | `Funil Sono · Landing vista` + Pixel `ViewContent` | bounce da landing |
| 3 | CTA → experiência | `/sono` · qualquer CTA (convite) | clique | `Funil Sono · CTA clicado` {placement:`<origem>_experiencia`} · **sem** `InitiateCheckout` | landing → experiência |
| 4 | Experiência vista | `/sono/experiencia` · SleepMeditationExperience | mount (guest) | `Funil Protocolo · Página vista` + `Funil Sono · Headline exibida` {variant:`convite`} | chegou mas não tocou |
| 5 | Pré-áudio | SleepMeditationExperience → SonoPreAudioModal | clica Play na Noite 1 | (planta contexto "Noite 1 de 7"; só guest não-pago) | desistiu antes de tocar |
| 6 | Noite 1 iniciada | GuestSonoPlayer | confirma no pré-áudio | `Funil Protocolo · Noite 1 iniciada` | abriu mas não deu play |
| 7 | Áudio 25/50/75% | GuestSonoPlayer | progresso | `Funil Protocolo · Áudio 25% / 50% / 75% / Áudio concluído` | onde abandona o áudio |
| 8 | Noite 1 concluída | GuestSonoPlayer (~95%) | `onComplete` | `Funil Protocolo · Noite 1 concluída` + Pixel `ExperienciaCompleta` | terminou a noite |
| 9 | Reflexão | SonoInlineCheckout (`reflection`) | passo `reflection` | `Pergunta pós-noite 1 vista` → `Resposta pós-noite 1` (`mais_leve`/`um_pouco_mais_calmo`/`ainda_acelerado`) + upsert `reflection_answer` | respondeu a reflexão |
| 10 | Oferta vista | SonoInlineCheckout (`offer`) | passo `offer` | `Funil Protocolo · Oferta vista` + Pixel `ViewContent` (Oferta 7 Noites) + upsert `reached_offer` | viu a oferta |
| 11 | Checkout iniciado | SonoInlineCheckout | "Liberar Noite 2 e as 7 noites" | `Funil Protocolo · Checkout clicado` + upsert `cta_clicked` + `registerFunilSono('sono_experiencia')` | aceitou continuar |
| 12 | Pix gerado | SonoInlinePix (`pix`) | QR exibido | (preço de `/api/payments/sono-pix/config`, fallback R$37) | gerou mas não pagou |
| 13 | Pix aprovado (acesso liberado) | SonoInlineCheckout (`unlocked`) | confirmação webhook | `Funil Sono · Pix aprovado` {`payment_type: pix_lifetime`, `product: protocolo_sono_7_noites`} + Pixel/CAPI `Purchase` (client + webhook) + upsert `unlocked` | conversão |
| 14 | Salvar conta (opcional) | SonoInlineSignup (`save_account`) | pós-pagamento | `Funil Sono · Cadastro visto / enviado / concluído / falhou` (com `funnel_source`) + `/api/entitlements/claim` | vinculou acesso à conta |

**Ramificações:**
- "Agora não" / "Pagar depois" / fechar no checkout → `Funil Protocolo · Oferta dispensada`.
- Free autenticado (criou conta mas não pagou) que dispensa → ramo `app_invite` (ponte leve pro app, em vez de fechar seco).
- Saída antecipada da Noite 1 (`onEarlyExit`) → abre direto em `offer`, pulando a reflexão.
- Pagamento ainda não confirmado (webhook lento) → permanece em `pix` (sem `unlocked`); o unlock otimista (`justSubscribed`) destrava as noites na hora quando o Pix é aprovado, antes do entitlement refletir.
- Premium/pago nunca vê oferta; um safety-net no mount limpa passos de oferta persistidos (`reflection/offer/pix/signup/card`).
- Persistência de retomada: `?checkout=` + `sessionStorage` (`eco.sono.checkout.step`) — sobrevive ao remount do RootProviders pós-cadastro (userId guest→real).

## Atribuição

- **`sono_hero_variant`** (super property) é gravado na landing (`registerSonoHeroVariant`). O
  hero da experiência dispara `Headline exibida {variant:'convite'}` mas **não** sobrescreve a
  super property — então os eventos da experiência herdam a variante do **anúncio** (ex.:
  `deite_se`), preservando a atribuição do criativo.
- **`funnel_source`** (super property) é gravado por `registerFunilSono('sono_experiencia')`
  quando o checkout inline abre — assim os eventos de Cadastro (de `mixpanelAssinarFunnel`)
  saem atribuídos ao funil da experiência (no `/assinar` isso vem do `registerFunilSono` de lá).
  Junto, o checkout registra as versões de copy como super props (`post_meditation_version`,
  `offer_version`, `checkout_version`) — todos os eventos do funil passam a carregá-las.
- **`guest_id`** (`getSonoGuestId()` / `sonoGuestId.ts`) é o fio mestre: atravessa eventos →
  pagamento → entitlement → `/check-guest`. O mesmo id é usado no Pix, no webhook e no
  `claimLifetime` que vincula o acesso à conta salva.
- **`source`** dos eventos `Funil Protocolo · …` vem de `?source=` (default `sono_paid_traffic`),
  preservado da landing pelos CTAs (`/sono/experiencia?source=<origem>`).
- **`sono_guest_flow_events`** (Supabase, upsert por `guest_id`) espelha o caminho do checkout
  (`reflection_answer`, `reached_offer`, `cta_clicked`, `unlocked`) — fonte alternativa ao Mixpanel.

## Conversão: client vs webhook

No `unlocked`, o front dispara `Funil Sono · Pix aprovado` + Pixel/CAPI `Purchase` (otimista,
pós-polling/webhook). O `Purchase` também é emitido pelo **webhook do backend** (server-side,
fonte da verdade) ao confirmar o Pix e conceder o entitlement por `guest_id`. Os dois `Purchase`
são correlacionados por `event_id` (tabela `meta_capi_attribution`) para o Meta deduplicar — não
dupla-contar. Sendo Pix único (vitalício), não há ciclo recorrente nem trial: o pagamento já é a
cobrança real.

## Eventos legados (fora do caminho ativo)

Em `mixpanelSonoGuestEvents.ts`, marcados `@deprecated` — pertencem ao fluxo guest antigo
(`ProtocolScreen` / `PlaybackScreen` / `PostMeditationScreen` em `src/components/sono-guest/`,
que só se referenciam entre si, fora da rota ativa):
`Player aberto`, `Play iniciado`, `Captura exibida/WhatsApp/email/pulada`, `Protocolo visto`,
`Compra iniciada`, `Notificação aceita`. Confirmar que as telas estão fora de uso antes de
remover.

## Histórico de saneamento (jun/2026)

- **Migração cartão+trial → Pix único vitalício.** O checkout inline trocou `signup → card →
  confirming` por `pix`, com pagamento ANTES da conta (`save_account` opcional pós-pagamento). O
  evento de conversão virou `Funil Sono · Pix aprovado` (`payment_type: pix_lifetime`) e o sinal
  do Meta passou de `Subscribe` para `Purchase`. O cartão segue apenas no `/assinar` (plano anual).
- Removidos 3 eventos duplicados no `SleepMeditationExperience` (`Experiência vista/iniciada/
  concluída`), que duplicavam os passos `Página vista` / `Noite 1 iniciada` / `Noite 1
  concluída`. Mantido um evento por passo.
- Adicionados ao funil Mixpanel os passos do checkout inline que só existiam no Supabase:
  `Oferta vista`, `Checkout clicado`, `Oferta dispensada`.
- `registerFunilSono('sono_experiencia')` no checkout inline → Cadastro/Cartão passam a carregar
  `funnel_source`.
