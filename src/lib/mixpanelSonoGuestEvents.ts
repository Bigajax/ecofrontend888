import mixpanel from './mixpanel';
import { isPaywallFoco } from './paywallFoco';
import { isEntradaSemModal } from './entradaSemModal';
import { isOfertaBonus } from './ofertaBonus';
import { isPresenteSonho } from './presenteSonho';
import { classifyBrowserEnv } from '@/utils/isInAppBrowser';

/** Opções de envio imediato (sendBeacon) — pra eventos que precedem a saída da
 *  página (copiar o Pix, ir pro app do banco), quando o batch normal pode não
 *  chegar a dar flush. Mesmo padrão usado em mixpanelAssinarFunnel.ts. */
const BEACON: { transport: 'sendBeacon'; send_immediately: true } = {
  transport: 'sendBeacon',
  send_immediately: true,
};

const SRC = 'sono_noite_1';
const PRODUCT_KEY = 'protocolo_sono_7_noites';

/** Gatilho que abriu a oferta (KISS #4). Separa a conversão do banner (baseline)
 *  da do paywall focado nos eventos Oferta vista / Checkout clicado / Pix gerado.
 *  'lembrete' = deep link do lembrete manual (?oferta=1&g=). */
export type OfferOrigem = 'banner' | 'noite_bloqueada' | 'continuar_n2' | 'lembrete';

type SonoGuestEventProps = {
  guestId?: string;
  source?: string;
  nightId?: string;
  context?: string;
  origem?: OfferOrigem;
  ctaConclusaoVariant?: string;
  /** Canal do contato do lembrete ("Decidir amanhã"): contém "@" → email. */
  canal?: 'email' | 'whatsapp';
  /** Variante da headline da oferta (personalizada pela resposta da reflexão). */
  headlineVariant?: string;
};

/** Lê o gatilho da oferta gravado em sessionStorage no momento da abertura
 *  (sobrevive ao remount do RootProviders, como o guest_id/source). */
function getOfferOrigem(): OfferOrigem | undefined {
  try {
    const o = sessionStorage.getItem('eco.sono.offer_origem');
    if (o === 'banner' || o === 'noite_bloqueada' || o === 'continuar_n2' || o === 'lembrete') return o;
  } catch {
    // sessionStorage indisponível — omite origem
  }
  return undefined;
}

function trackSonoGuestEvent(eventName: string, props: SonoGuestEventProps = {}): void {
  mixpanel.track(eventName, {
    source: props.source || SRC,
    guest_id: props.guestId || sessionStorage.getItem('eco.sono.guest_id') || localStorage.getItem('eco_guest_id') || 'guest',
    product_key: PRODUCT_KEY,
    ...(props.nightId ? { night_id: props.nightId } : {}),
    ...(props.context ? { context: props.context } : {}),
    ...(props.origem ? { origem: props.origem } : {}),
    ...(props.ctaConclusaoVariant ? { cta_conclusao_variant: props.ctaConclusaoVariant } : {}),
    ...(props.canal ? { canal: props.canal } : {}),
    ...(props.headlineVariant ? { headline_variant: props.headlineVariant } : {}),
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Funil ATIVO da experiência (anúncio → desbloqueio). Ver FUNIL_SONO_EXPERIENCIA.md.
// Caminho: landing convite → /sono/experiencia → GuestSonoPlayer (Noite 1) →
// SonoInlineCheckout. Os eventos abaixo (Página vista, Noite 1 iniciada/concluída,
// Áudio NN%, Oferta vista, Checkout clicado, Oferta dispensada, Desbloquear
// clicado) estão no caminho ativo.
// ────────────────────────────────────────────────────────────────────────────

export function trackSonoGuestPageViewed(props?: SonoGuestEventProps): void {
  trackSonoGuestEvent('Funil Protocolo · Página vista', props);
}

/** Modal de contexto antes do áudio ("Esta é a Noite 1 de 7…") — planta a noção
 *  de protocolo pago ANTES de ouvir, em vez de só depois. Disparo 1×/sessão. */
export function trackSonoGuestPreAudioView(props?: SonoGuestEventProps): void {
  trackSonoGuestEvent('Funil Protocolo · Contexto pré-áudio visto', props);
}

/** Gate de cadastro exibido na entrada (ao clicar "Ouvir a Noite 1" deslogado),
 *  antes da Noite 1. Marca a nova etapa de captura de lead do funil. */
export function trackSonoGuestRegisterGateShown(props?: SonoGuestEventProps): void {
  trackSonoGuestEvent('Funil Protocolo · Cadastro gate exibido', props);
}

/** Saída antecipada da Noite 1 (botão Voltar antes dos 95%) que abre a oferta —
 *  mede quanto essa porta de exit-intent alimenta a conversão. */
export function trackSonoGuestEarlyExit(
  props: SonoGuestEventProps & { progressPct?: number } = {},
): void {
  mixpanel.track('Funil Protocolo · Saída antecipada', {
    source: props.source || SRC,
    guest_id: props.guestId || sessionStorage.getItem('eco.sono.guest_id') || localStorage.getItem('eco_guest_id') || 'guest',
    product_key: PRODUCT_KEY,
    night_id: props.nightId || 'night_1',
    ...(typeof props.progressPct === 'number' ? { progress_pct: props.progressPct } : {}),
  });
}

export function trackSonoGuestNight1Started(props?: SonoGuestEventProps): void {
  trackSonoGuestEvent('Funil Protocolo · Noite 1 iniciada', { ...props, nightId: props?.nightId || 'night_1' });
}

export function trackSonoGuestNight1Completed(props?: SonoGuestEventProps): void {
  trackSonoGuestEvent('Funil Protocolo · Noite 1 concluída', { ...props, nightId: props?.nightId || 'night_1' });
}

/** Resposta da pessoa à pergunta pós-Noite 1 ("Como seu corpo está agora?").
 *  Qualquer resposta conduz à continuidade — aqui medimos a distribuição e
 *  cruzamos com a conversão. Hoje a resposta também é gravada em
 *  sono_guest_flow_events; este evento fecha o gap no Mixpanel. */
export function trackSonoGuestPostNight1Response(
  response: 'mais_leve' | 'um_pouco_mais_calmo' | 'ainda_acelerado',
  props?: SonoGuestEventProps,
): void {
  mixpanel.track('Funil Protocolo · Resposta pós-noite 1', {
    source: props?.source || SRC,
    guest_id:
      props?.guestId ||
      sessionStorage.getItem('eco.sono.guest_id') ||
      localStorage.getItem('eco_guest_id') ||
      'guest',
    product_key: PRODUCT_KEY,
    night_id: props?.nightId || 'night_1',
    night_number: 1,
    response,
  });
}

/** Pergunta pós-Noite 1 ("Como seu corpo está agora?") exibida — antes da
 *  resposta. Fecha o gap entre "Noite 1 concluída" e "Resposta pós-noite 1". */
export function trackSonoGuestPostNight1QuestionView(props?: SonoGuestEventProps): void {
  trackSonoGuestEvent('Funil Protocolo · Pergunta pós-noite 1 vista', props);
}

/** Clique em "Continuar para a Noite 2" na tela de continuidade pós-resposta —
 *  é o passo que abre o paywall. Mede a intenção de seguir a sequência. */
export function trackSonoGuestContinueNight2(props?: SonoGuestEventProps): void {
  trackSonoGuestEvent('Funil Protocolo · Continuar Noite 2 clicado', props);
}

export function trackSonoGuestOfferViewed(props?: SonoGuestEventProps): void {
  trackSonoGuestEvent('Funil Protocolo · Oferta vista', { ...props, origem: props?.origem ?? getOfferOrigem() });
}

export function trackSonoGuestCheckoutClicked(props?: SonoGuestEventProps): void {
  trackSonoGuestEvent('Funil Protocolo · Checkout clicado', { ...props, origem: props?.origem ?? getOfferOrigem() });
}

// ── Banner de oferta — acesso antecipado aos 150s da Noite 1 ─────────────────
// Variável testada vs baseline histórico (`completion_gated` = oferta só após 95%
// do áudio; de facto a property abaixo ausente na janela 25–26/06). Este módulo é
// dono de banner_version E do nome da variante: o evento "Banner oferta exibido"
// dispara no GuestSonoPlayer (onTimeUpdate), que não acessa const do componente do
// banner — manter as versões aqui evita sair `undefined` e sujar o dado. Bumpar
// BANNER_VERSION ao trocar a copy do banner. Ver FUNIL_SONO_EXPERIENCIA.md.
const BANNER_VERSION = 'v1';
const OFFER_ACCESS_VARIANT = 'banner_150s';

/** Registra a super property de atribuição do funil de acesso à oferta. Chamado no
 *  mount da experiência (antes do checkout abrir) pra que TODOS os eventos do funil
 *  — inclusive "Banner oferta exibido", que sai aos 150s, antes do checkout — herdem
 *  offer_access_variant. Baseline histórico = property ausente (completion_gated). */
export function registerSonoOfferAccessVariant(): void {
  try {
    mixpanel.register({ offer_access_variant: OFFER_ACCESS_VARIANT });
  } catch {
    // analytics — silencia erros
  }
}

/** Super property do teste "paywall focado" (KISS #4) — registrada no mount da
 *  experiência pra que TODOS os eventos do funil confirmem o estado do rollout. */
export function registerPaywallFoco(): void {
  try {
    mixpanel.register({ paywall_foco: isPaywallFoco() });
  } catch {
    // analytics — silencia erros
  }
}

/** Super property do teste "entrada sem modal" — registrada no mount da experiência
 *  pra que "Contexto pré-áudio visto" e "Noite 1 iniciada" carreguem o estado do
 *  rollout e dê pra ler o efeito na transição Sessão → Noite 1 iniciada. */
export function registerEntradaSemModal(): void {
  try {
    mixpanel.register({ entrada_sem_modal: isEntradaSemModal() });
  } catch {
    // analytics — silencia erros
  }
}

/** Super property do bônus EcoDream na oferta — registrada no mount da experiência
 *  pra que "Oferta vista" (e demais eventos) confirmem se o value-stack estava
 *  exibido, permitindo ler o efeito vs baseline. */
export function registerOfertaBonus(): void {
  try {
    mixpanel.register({ oferta_bonus_ecodream: isOfertaBonus() });
  } catch {
    // analytics — silencia erros
  }
}

/** Linha "BÔNUS · EcoDream" do card da oferta tocada → abre o modal explicativo.
 *  Mede quanto interesse o value-stack desperta (e se vale aprofundar a copy). */
export function trackSonoGuestBonusInfoOpened(props?: SonoGuestEventProps): void {
  trackSonoGuestEvent('Funil Protocolo · Bônus EcoDream aberto', { ...props, origem: props?.origem ?? getOfferOrigem() });
}

// ── Preview da Noite 2 (card "A seguir" da oferta) ───────────────────────────
// Provar o produto: play de 75s da Noite 2 dentro da oferta. Cruzar com
// "Checkout clicado" mede se ouvir a prévia empurra a conversão.

/** Primeiro play da prévia da Noite 2 (1×/sessão — ref-guard no componente). */
export function trackSonoGuestPreviewNight2Played(props?: SonoGuestEventProps): void {
  trackSonoGuestEvent('Funil Protocolo · Preview Noite 2 tocado', { ...props, origem: props?.origem ?? getOfferOrigem() });
}

/** Prévia atingiu o corte (~75s) — ouviu até o fim do trecho. */
export function trackSonoGuestPreviewNight2Completed(props?: SonoGuestEventProps): void {
  trackSonoGuestEvent('Funil Protocolo · Preview Noite 2 concluído', { ...props, origem: props?.origem ?? getOfferOrigem() });
}

// ── Presente da Noite 1 (1 interpretação de sonho, tela de continuidade) ─────
// Reciprocidade: presente ANTES da oferta. Também planta o valor do bônus
// EcoDream vendido no card R$37.

/** Card-presente tocado → modal do sonho aberto. */
export function trackSonoGuestDreamGiftOpened(props?: SonoGuestEventProps): void {
  trackSonoGuestEvent('Funil Protocolo · Presente sonho aberto', props);
}

/** Sonho enviado pra interpretação (POST /api/dream/interpret). */
export function trackSonoGuestDreamGiftSubmitted(props?: SonoGuestEventProps): void {
  trackSonoGuestEvent('Funil Protocolo · Presente sonho enviado', props);
}

/** Interpretação concluída (SSE done) — presente consumido. */
export function trackSonoGuestDreamGiftCompleted(props?: SonoGuestEventProps): void {
  trackSonoGuestEvent('Funil Protocolo · Presente sonho concluído', props);
}

/** Super property do rollout do presente — registrada no mount da experiência
 *  pra todo evento do funil confirmar o estado do switch. */
export function registerPresenteSonho(): void {
  try {
    mixpanel.register({ presente_sonho: isPresenteSonho() });
  } catch {
    // analytics — silencia erros
  }
}

/** Banner de oferta exibido (cruzou 150s da Noite 1; o áudio segue tocando). 1×/sessão. */
export function trackSonoGuestOfferBannerShown(props?: SonoGuestEventProps): void {
  mixpanel.track('Funil Protocolo · Banner oferta exibido', {
    source: props?.source || SRC,
    guest_id: props?.guestId || sessionStorage.getItem('eco.sono.guest_id') || localStorage.getItem('eco_guest_id') || 'guest',
    product_key: PRODUCT_KEY,
    banner_version: BANNER_VERSION,
  });
}

/** Banner de oferta clicado → abre o checkout em 'offer'. Precede "Oferta vista". */
export function trackSonoGuestOfferBannerClicked(props?: SonoGuestEventProps): void {
  mixpanel.track('Funil Protocolo · Banner oferta clicado', {
    source: props?.source || SRC,
    guest_id: props?.guestId || sessionStorage.getItem('eco.sono.guest_id') || localStorage.getItem('eco_guest_id') || 'guest',
    product_key: PRODUCT_KEY,
    banner_version: BANNER_VERSION,
  });
}

/** QR/código Pix gerado e exibido — passo entre "Checkout clicado" e "Pix aprovado". */
export function trackSonoGuestPixGerado(props?: SonoGuestEventProps): void {
  trackSonoGuestEvent('Funil Protocolo · Pix gerado', { ...props, origem: props?.origem ?? getOfferOrigem() });
}

// ── Travessia do Pix ─────────────────────────────────────────────────────────
// O funil morre entre "Pix gerado" e "Pix aprovado": a pessoa sai pro app do
// banco e não volta / não paga. Estes três eventos medem exatamente essa
// travessia (copiou o código? saiu da tela? voltou?). Os que precedem a saída
// usam sendBeacon pra não se perderem no background.

function pixCrossingProps(props?: SonoGuestEventProps): Record<string, unknown> {
  return {
    source: props?.source || SRC,
    guest_id:
      props?.guestId ||
      sessionStorage.getItem('eco.sono.guest_id') ||
      localStorage.getItem('eco_guest_id') ||
      'guest',
    product_key: PRODUCT_KEY,
  };
}

/** Tocou "Copiar código Pix" — o gesto imediatamente anterior à travessia. */
export function trackSonoGuestPixCopiado(props?: SonoGuestEventProps): void {
  mixpanel.track('Funil Protocolo · Pix copiado', pixCrossingProps(props), BEACON);
}

/** Tela do Pix foi pro background (visibilitychange → hidden) — provável saída
 *  pro app do banco. sendBeacon porque a página está sumindo. */
export function trackSonoGuestPixTelaSaiu(props?: SonoGuestEventProps): void {
  mixpanel.track('Funil Protocolo · Pix tela saiu', pixCrossingProps(props), BEACON);
}

/** Tela do Pix voltou ao foco (visibilitychange → visible) — a pessoa retornou
 *  do app do banco. Cruzado com "tela saiu" mede quem completa a ida-e-volta. */
export function trackSonoGuestPixTelaVoltou(props?: SonoGuestEventProps): void {
  mixpanel.track('Funil Protocolo · Pix tela voltou', pixCrossingProps(props));
}

/** Super property `browser_env` (inapp_instagram / inapp_facebook / browser_normal).
 *  Registrada no mount da experiência pra que TODO evento do funil carregue o
 *  ambiente — o in-app do IG/FB é onde a travessia pro banco mais quebra. */
export function registerBrowserEnv(): void {
  try {
    mixpanel.register({ browser_env: classifyBrowserEnv() });
  } catch {
    // analytics — silencia erros
  }
}

export function trackSonoGuestOfferDismissed(props?: SonoGuestEventProps): void {
  trackSonoGuestEvent('Funil Protocolo · Oferta dispensada', props);
}

// ── "Decidir amanhã" — saída com captura de contato (substitui o "Agora não"
// do guest). O lembrete é enviado MANUALMENTE no dia seguinte, via deep link
// ?oferta=1&g={guest_id} (ver "Oferta aberta via lembrete").

/** Guest tocou "Decidir amanhã" na oferta → expande o form de contato inline. */
export function trackSonoGuestDecideTomorrowClicked(props?: SonoGuestEventProps): void {
  trackSonoGuestEvent('Funil Protocolo · Decidir amanhã clicado', { ...props, origem: props?.origem ?? getOfferOrigem() });
}

/** Contato do lembrete gravado em offer_reminders. `canal` derivado do conteúdo
 *  (contém "@" → email, senão whatsapp). */
export function trackSonoGuestReminderSubmitted(canal: 'email' | 'whatsapp', props?: SonoGuestEventProps): void {
  trackSonoGuestEvent('Funil Protocolo · Contato lembrete enviado', { ...props, canal });
}

/** INSERT em offer_reminders falhou (após 1 retry). A UI mostra sucesso mesmo
 *  assim (nunca trava o fluxo) — este evento é o que denuncia a perda. */
export function trackSonoGuestReminderFailed(props?: SonoGuestEventProps): void {
  trackSonoGuestEvent('Funil Protocolo · Contato lembrete falhou', props);
}

/** Gesto/botão voltar com a oferta aberta → fecha o overlay e fica na página do
 *  protocolo (antes, o back saía da /sono/experiencia). Disparado no popstate. */
export function trackSonoGuestOfferExitViaBack(props?: SonoGuestEventProps): void {
  trackSonoGuestEvent('Funil Protocolo · Oferta saída via voltar', { ...props, origem: props?.origem ?? getOfferOrigem() });
}

/** Oferta aberta pelo deep link do lembrete manual (?oferta=1&g={guest_id}). */
export function trackSonoGuestOfferOpenedViaReminder(props?: SonoGuestEventProps): void {
  trackSonoGuestEvent('Funil Protocolo · Oferta aberta via lembrete', props);
}

/** Ponte pro app: free autenticado dispensou o checkout e viu o convite pro /app. */
export function trackSonoGuestAppInviteShown(props?: SonoGuestEventProps): void {
  trackSonoGuestEvent('Funil Protocolo · Convite app exibido', props);
}

/** Free autenticado clicou em "Explorar o app" — vai pro /app (2ª conversão via gates). */
export function trackSonoGuestAppInviteClicked(props?: SonoGuestEventProps): void {
  trackSonoGuestEvent('Funil Protocolo · Convite app clicado', props);
}

// As funções marcadas @deprecated abaixo pertencem ao fluxo antigo de guest
// (ProtocolScreen / PlaybackScreen / PostMeditationScreen em
// src/components/sono-guest/), que NÃO está no caminho ativo da experiência (o
// player ativo é o GuestSonoPlayer; o pós-Noite 1 é o SonoInlineCheckout). Estão
// intercaladas com eventos VIVOS (Áudio NN%, Desbloquear clicado), por isso a
// marcação é por função. Confirmar que as telas estão fora de uso antes de
// remover. NÃO usar em código novo. Ver FUNIL_SONO_EXPERIENCIA.md.

/** @deprecated fluxo guest antigo (sono-guest screens) — fora do caminho ativo. */
export function trackGuestPlayerOpened(): void {
  mixpanel.track('Funil Protocolo · Player aberto', { source: SRC });
}

/** @deprecated fluxo guest antigo (sono-guest screens) — fora do caminho ativo. */
export function trackGuestPlayStarted(sound: string): void {
  mixpanel.track('Funil Protocolo · Play iniciado', { source: SRC, sound });
}

export function trackGuestAudio25(): void {
  mixpanel.track('Funil Protocolo · Áudio 25%', { source: SRC });
}

export function trackGuestAudio50(): void {
  mixpanel.track('Funil Protocolo · Áudio 50%', { source: SRC });
}

export function trackGuestAudio75(): void {
  mixpanel.track('Funil Protocolo · Áudio 75%', { source: SRC });
}

export function trackGuestAudioCompleted(): void {
  mixpanel.track('Funil Protocolo · Áudio concluído', { source: SRC });
}

/** @deprecated fluxo guest antigo (sono-guest screens) — fora do caminho ativo. */
export function trackGuestCaptureShown(): void {
  mixpanel.track('Funil Protocolo · Captura exibida', { source: SRC });
}

/** @deprecated fluxo guest antigo (sono-guest screens) — fora do caminho ativo. */
export function trackGuestCaptureWhatsapp(): void {
  mixpanel.track('Funil Protocolo · Captura WhatsApp', { source: SRC });
}

/** @deprecated fluxo guest antigo (sono-guest screens) — fora do caminho ativo. */
export function trackGuestCaptureEmail(): void {
  mixpanel.track('Funil Protocolo · Captura email', { source: SRC });
}

/** @deprecated fluxo guest antigo (sono-guest screens) — fora do caminho ativo. */
export function trackGuestCaptureSkipped(): void {
  mixpanel.track('Funil Protocolo · Captura pulada', { source: SRC });
}

/** @deprecated fluxo guest antigo (sono-guest screens) — fora do caminho ativo. */
export function trackGuestProtocolViewed(): void {
  mixpanel.track('Funil Protocolo · Protocolo visto', { source: SRC });
}

export function trackGuestUnlockClicked(nightId: string): void {
  mixpanel.track('Funil Protocolo · Desbloquear clicado', { source: SRC, night_id: nightId });
}

/** KISS #4 — tocar numa Noite bloqueada (2–7) abre a oferta focada. `noite` = 2..7.
 *  `paywall_foco` vem por super property (registrada no mount da experiência). */
export function trackSonoGuestLockedNightClicked(p: { noite: number }): void {
  mixpanel.track('Funil Protocolo · Noite bloqueada clicada', {
    source: SRC,
    guest_id: sessionStorage.getItem('eco.sono.guest_id') || localStorage.getItem('eco_guest_id') || 'guest',
    product_key: PRODUCT_KEY,
    noite: p.noite,
    origem: 'noite_bloqueada',
  });
}

/** @deprecated fluxo guest antigo (sono-guest screens) — fora do caminho ativo. */
export function trackGuestPurchaseStarted(): void {
  mixpanel.track('Funil Protocolo · Compra iniciada', { source: SRC });
}

/** @deprecated fluxo guest antigo (sono-guest screens) — fora do caminho ativo. */
export function trackGuestNotificationOpted(): void {
  mixpanel.track('Funil Protocolo · Notificação aceita', { source: SRC });
}
