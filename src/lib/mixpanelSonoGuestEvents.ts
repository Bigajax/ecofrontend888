import mixpanel from './mixpanel';

const SRC = 'sono_noite_1';
const PRODUCT_KEY = 'protocolo_sono_7_noites';

type SonoGuestEventProps = {
  guestId?: string;
  source?: string;
  nightId?: string;
  context?: string;
};

function trackSonoGuestEvent(eventName: string, props: SonoGuestEventProps = {}): void {
  mixpanel.track(eventName, {
    source: props.source || SRC,
    guest_id: props.guestId || sessionStorage.getItem('eco.sono.guest_id') || localStorage.getItem('eco_guest_id') || 'guest',
    product_key: PRODUCT_KEY,
    ...(props.nightId ? { night_id: props.nightId } : {}),
    ...(props.context ? { context: props.context } : {}),
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

export function trackSonoGuestOfferViewed(props?: SonoGuestEventProps): void {
  trackSonoGuestEvent('Funil Protocolo · Oferta vista', props);
}

export function trackSonoGuestCheckoutClicked(props?: SonoGuestEventProps): void {
  trackSonoGuestEvent('Funil Protocolo · Checkout clicado', props);
}

/** QR/código Pix gerado e exibido — passo entre "Checkout clicado" e "Pix aprovado". */
export function trackSonoGuestPixGerado(props?: SonoGuestEventProps): void {
  trackSonoGuestEvent('Funil Protocolo · Pix gerado', props);
}

export function trackSonoGuestOfferDismissed(props?: SonoGuestEventProps): void {
  trackSonoGuestEvent('Funil Protocolo · Oferta dispensada', props);
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

/** @deprecated fluxo guest antigo (sono-guest screens) — fora do caminho ativo. */
export function trackGuestPurchaseStarted(): void {
  mixpanel.track('Funil Protocolo · Compra iniciada', { source: SRC });
}

/** @deprecated fluxo guest antigo (sono-guest screens) — fora do caminho ativo. */
export function trackGuestNotificationOpted(): void {
  mixpanel.track('Funil Protocolo · Notificação aceita', { source: SRC });
}
