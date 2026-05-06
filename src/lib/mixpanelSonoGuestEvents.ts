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
  trackSonoGuestEvent('sono_guest_page_viewed', props);
}

export function trackSonoGuestNight1Started(props?: SonoGuestEventProps): void {
  trackSonoGuestEvent('sono_guest_night1_started', { ...props, nightId: props?.nightId || 'night_1' });
}

export function trackSonoGuestNight1Completed(props?: SonoGuestEventProps): void {
  trackSonoGuestEvent('sono_guest_night1_completed', { ...props, nightId: props?.nightId || 'night_1' });
}

export function trackSonoGuestOfferViewed(props?: SonoGuestEventProps): void {
  trackSonoGuestEvent('sono_guest_offer_viewed', props);
}

export function trackSonoGuestCheckoutClicked(props?: SonoGuestEventProps): void {
  trackSonoGuestEvent('sono_guest_checkout_clicked', props);
}

export function trackSonoGuestOfferDismissed(props?: SonoGuestEventProps): void {
  trackSonoGuestEvent('sono_guest_offer_dismissed', props);
}

export function trackGuestPlayerOpened(): void {
  mixpanel.track('guest_player_opened', { source: SRC });
}

export function trackGuestPlayStarted(sound: string): void {
  mixpanel.track('guest_play_started', { source: SRC, sound });
}

export function trackGuestAudio25(): void {
  mixpanel.track('guest_audio_25percent', { source: SRC });
}

export function trackGuestAudio50(): void {
  mixpanel.track('guest_audio_50percent', { source: SRC });
}

export function trackGuestAudio75(): void {
  mixpanel.track('guest_audio_75percent', { source: SRC });
}

export function trackGuestAudioCompleted(): void {
  mixpanel.track('guest_audio_completed', { source: SRC });
}

export function trackGuestCaptureShown(): void {
  mixpanel.track('guest_capture_shown', { source: SRC });
}

export function trackGuestCaptureWhatsapp(): void {
  mixpanel.track('guest_capture_whatsapp', { source: SRC });
}

export function trackGuestCaptureEmail(): void {
  mixpanel.track('guest_capture_email', { source: SRC });
}

export function trackGuestCaptureSkipped(): void {
  mixpanel.track('guest_capture_skipped', { source: SRC });
}

export function trackGuestProtocolViewed(): void {
  mixpanel.track('guest_protocol_viewed', { source: SRC });
}

export function trackGuestUnlockClicked(nightId: string): void {
  mixpanel.track('guest_unlock_clicked', { source: SRC, night_id: nightId });
}

export function trackGuestPurchaseStarted(): void {
  mixpanel.track('guest_purchase_started', { source: SRC });
}

export function trackGuestNotificationOpted(): void {
  mixpanel.track('guest_notification_opted', { source: SRC });
}
