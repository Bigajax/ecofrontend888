import mixpanel from './mixpanel';

const SRC = 'sono_noite_1';

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
