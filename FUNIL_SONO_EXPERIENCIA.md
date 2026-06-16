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
NOITE 1 (áudio ~8 min)                           [GuestSonoPlayer]
  │  (ao concluir ~95%)
  ▼
CHECKOUT INLINE                                  [SonoInlineCheckout]
  reflexão → oferta → cadastro → cartão → confirmando → desbloqueio
  • cadastro reusa register/Google (SonoInlineSignup)
  • cartão reusa MpCardForm/create-with-card (SonoInlineCard)
  • confirmação por polling do webhook + unlock otimista
  │
  ▼
7 NOITES LIBERADAS (na própria /sono/experiencia)
```

## Passos e eventos

| # | Passo | Rota / componente | Gatilho | Evento(s) | Drop-off a medir |
|---|-------|-------------------|---------|-----------|------------------|
| 1 | Headline exibida | `/sono` · EcotopiaSonoPage | mount | `Funil Sono · Headline exibida` {variant:`deite_se`} + super property `sono_hero_variant` | qual variante converte |
| 2 | Landing vista | `/sono` · EcotopiaSonoPage | mount | `Funil Sono · Landing vista` + Pixel `ViewContent` | bounce da landing |
| 3 | CTA → experiência | `/sono` · qualquer CTA (convite) | clique | `Funil Sono · CTA clicado` {placement:`<origem>_experiencia`} · **sem** `InitiateCheckout` | landing → experiência |
| 4 | Experiência vista | `/sono/experiencia` · SleepMeditationExperience | mount (guest) | `Funil Protocolo · Página vista` + `Funil Sono · Headline exibida` {variant:`convite`} | chegou mas não tocou |
| 5 | Noite 1 iniciada | SleepMeditationExperience → GuestSonoPlayer | "Ouvir agora" | `Funil Protocolo · Noite 1 iniciada` | abriu mas não deu play |
| 6 | Áudio 25/50/75% | GuestSonoPlayer | progresso | `Funil Protocolo · Áudio 25% / 50% / 75% / Áudio concluído` | onde abandona o áudio |
| 7 | Noite 1 concluída | GuestSonoPlayer (~95%) | `onComplete` | `Funil Protocolo · Noite 1 concluída` | terminou a noite |
| 8 | Oferta vista | SonoInlineCheckout (`offer`) | passo `offer` | `Funil Protocolo · Oferta vista` + upsert `reached_offer` | viu a oferta |
| 9 | Checkout iniciado | SonoInlineCheckout | "Continuar minhas noites" | `Funil Protocolo · Checkout clicado` + upsert `cta_clicked` + `registerFunilSono('sono_experiencia')` | aceitou continuar |
| 10 | Cadastro | SonoInlineSignup | submit / Google | `Funil Sono · Cadastro visto / enviado / concluído / falhou` (com `funnel_source`) | criou conta |
| 11 | Cartão | SonoInlineCard | brick MP | `Funil Sono · Cartão visto / pronto / enviado / recusado / erro` | preencheu cartão |
| 12 | Assinatura paga | SonoInlineCheckout (`unlocked`) | confirmação webhook | `Funil Sono · Assinatura paga` + `Assinatura · Paga` {source:`sono_inline_checkout`} + Pixel/CAPI `Subscribe` + upsert `unlocked` | conversão |

**Ramificações:**
- "Agora não" / fechar no checkout → `Funil Protocolo · Oferta dispensada`.
- Confirmação não concluiu (webhook lento) → estado `pending` ("Quase lá"), sem `unlocked`.
- Persistência de retomada: `?checkout=` + `sessionStorage` (sobrevive ao remount pós-cadastro).

## Atribuição

- **`sono_hero_variant`** (super property) é gravado na landing (`registerSonoHeroVariant`). O
  hero da experiência dispara `Headline exibida {variant:'convite'}` mas **não** sobrescreve a
  super property — então os eventos da experiência herdam a variante do **anúncio** (ex.:
  `deite_se`), preservando a atribuição do criativo.
- **`funnel_source`** (super property) é gravado por `registerFunilSono('sono_experiencia')`
  quando o checkout inline abre — assim os eventos de Cadastro/Cartão (de `mixpanelAssinarFunnel`)
  saem atribuídos ao funil da experiência (no `/assinar` isso vem do `registerFunilSono` de lá).
- **`source`** dos eventos `Funil Protocolo · …` vem de `?source=` (default `sono_paid_traffic`),
  preservado da landing pelos CTAs (`/sono/experiencia?source=<origem>`).
- **`sono_guest_flow_events`** (Supabase, upsert por `guest_id`) espelha o caminho do checkout
  (`reflection_answer`, `reached_offer`, `cta_clicked`, `unlocked`) — fonte alternativa ao Mixpanel.

## Conversão: client vs webhook

No `unlocked`, o front dispara `Assinatura paga` / `Subscribe` (otimista, pós-polling). O
`Purchase` do 1º ciclo efetivamente cobrado é responsabilidade do **webhook do backend** (não há
cobrança no trial). Não dupla-contar: a conversão de trial é o evento client; o pagamento real é
server-side.

## Eventos legados (fora do caminho ativo)

Em `mixpanelSonoGuestEvents.ts`, marcados `@deprecated` — pertencem ao fluxo guest antigo
(`ProtocolScreen` / `PlaybackScreen` / `PostMeditationScreen` em `src/components/sono-guest/`,
que só se referenciam entre si, fora da rota ativa):
`Player aberto`, `Play iniciado`, `Captura exibida/WhatsApp/email/pulada`, `Protocolo visto`,
`Compra iniciada`, `Notificação aceita`. Confirmar que as telas estão fora de uso antes de
remover.

## Histórico de saneamento (jun/2026)

- Removidos 3 eventos duplicados no `SleepMeditationExperience` (`Experiência vista/iniciada/
  concluída`), que duplicavam os passos `Página vista` / `Noite 1 iniciada` / `Noite 1
  concluída`. Mantido um evento por passo.
- Adicionados ao funil Mixpanel os passos do checkout inline que só existiam no Supabase:
  `Oferta vista`, `Checkout clicado`, `Oferta dispensada`.
- `registerFunilSono('sono_experiencia')` no checkout inline → Cadastro/Cartão passam a carregar
  `funnel_source`.
