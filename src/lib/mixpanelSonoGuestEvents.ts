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

export function trackSonoGuestPageViewed(props?: SonoGuestEventProps): void {
  trackSonoGuestEvent('Funil Protocolo · Página vista', props);
}

export function trackSonoGuestNight1Started(props?: SonoGuestEventProps): void {
  trackSonoGuestEvent('Funil Protocolo · Noite 1 iniciada', { ...props, nightId: props?.nightId || 'night_1' });
}

export function trackSonoGuestNight1Completed(props?: SonoGuestEventProps): void {
  trackSonoGuestEvent('Funil Protocolo · Noite 1 concluída', { ...props, nightId: props?.nightId || 'night_1' });
}

export function trackSonoGuestOfferViewed(props?: SonoGuestEventProps): void {
  trackSonoGuestEvent('Funil Protocolo · Oferta vista', props);
}

export function trackSonoGuestCheckoutClicked(props?: SonoGuestEventProps): void {
  trackSonoGuestEvent('Funil Protocolo · Checkout clicado', props);
}

export function trackSonoGuestOfferDismissed(props?: SonoGuestEventProps): void {
  trackSonoGuestEvent('Funil Protocolo · Oferta dispensada', props);
}

export function trackGuestPlayerOpened(): void {
  mixpanel.track('Funil Protocolo · Player aberto', { source: SRC });
}

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

export function trackGuestCaptureShown(): void {
  mixpanel.track('Funil Protocolo · Captura exibida', { source: SRC });
}

export function trackGuestCaptureWhatsapp(): void {
  mixpanel.track('Funil Protocolo · Captura WhatsApp', { source: SRC });
}

export function trackGuestCaptureEmail(): void {
  mixpanel.track('Funil Protocolo · Captura email', { source: SRC });
}

export function trackGuestCaptureSkipped(): void {
  mixpanel.track('Funil Protocolo · Captura pulada', { source: SRC });
}

export function trackGuestProtocolViewed(): void {
  mixpanel.track('Funil Protocolo · Protocolo visto', { source: SRC });
}

export function trackGuestUnlockClicked(nightId: string): void {
  mixpanel.track('Funil Protocolo · Desbloquear clicado', { source: SRC, night_id: nightId });
}

export function trackGuestPurchaseStarted(): void {
  mixpanel.track('Funil Protocolo · Compra iniciada', { source: SRC });
}

export function trackGuestNotificationOpted(): void {
  mixpanel.track('Funil Protocolo · Notificação aceita', { source: SRC });
}
