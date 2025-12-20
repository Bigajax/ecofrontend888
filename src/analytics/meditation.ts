/**
 * Meditation Analytics Utilities
 *
 * Utilitários para tracking de meditações no Mixpanel.
 * Inclui conversões, validações e tipos TypeScript.
 */

import { track } from './track';
import { getUserIdFromStore, getSessionId } from '@/utils/identity';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

/**
 * Propriedades comuns a todos os eventos de meditação
 */
interface BaseMeditationEvent {
  user_id: string | null;
  session_id: string | null;
  timestamp: string;
}

/**
 * Payload para evento "Meditation List Viewed"
 */
export interface MeditationListViewedPayload extends BaseMeditationEvent {
  category: string;
  total_meditations: number;
  completed_count: number;
  premium_count: number;
  page_path: string;
}

/**
 * Payload para evento "Meditation Selected"
 */
export interface MeditationSelectedPayload extends BaseMeditationEvent {
  meditation_id: string;
  meditation_title: string;
  category: string;
  duration_seconds: number;
  is_premium: boolean;
  is_completed: boolean;
  source_page: string;
}

/**
 * Payload para evento "Meditation Started"
 */
export interface MeditationStartedPayload extends BaseMeditationEvent {
  meditation_id: string;
  meditation_title: string;
  category: string;
  duration_seconds: number;
  is_premium: boolean;
  background_sound_id: string;
  background_sound_title: string;
  meditation_volume: number;
  background_volume: number;
  play_session_id: string;
  source_page: string;
}

/**
 * Payload para evento "Meditation Paused"
 */
export interface MeditationPausedPayload extends BaseMeditationEvent {
  meditation_id: string;
  meditation_title: string;
  category: string;
  current_time_seconds: number;
  progress_percentage: number;
  play_session_id: string;
}

/**
 * Payload para evento "Meditation Resumed"
 */
export interface MeditationResumedPayload extends BaseMeditationEvent {
  meditation_id: string;
  meditation_title: string;
  category: string;
  current_time_seconds: number;
  progress_percentage: number;
  pause_duration_seconds: number;
  play_session_id: string;
}

/**
 * Payload para evento "Meditation Completed"
 */
export interface MeditationCompletedPayload extends BaseMeditationEvent {
  meditation_id: string;
  meditation_title: string;
  category: string;
  duration_seconds: number;
  actual_play_time_seconds: number;
  pause_count: number;
  skip_count: number;
  seek_count: number;
  background_sound_id: string;
  background_sound_title: string;
  meditation_volume_final: number;
  background_volume_final: number;
  play_session_id: string;
}

/**
 * Payload para evento "Meditation Abandoned"
 */
export interface MeditationAbandonedPayload extends BaseMeditationEvent {
  meditation_id: string;
  meditation_title: string;
  category: string;
  duration_seconds: number;
  current_time_seconds: number;
  progress_percentage: number;
  actual_play_time_seconds: number;
  pause_count: number;
  skip_count: number;
  seek_count: number;
  abandon_reason: string;
  play_session_id: string;
}

/**
 * Payload para evento "Meditation Skip"
 */
export interface MeditationSkipPayload extends BaseMeditationEvent {
  meditation_id: string;
  meditation_title: string;
  category: string;
  direction: 'forward' | 'backward';
  skip_seconds: number;
  current_time_before: number;
  current_time_after: number;
  play_session_id: string;
}

/**
 * Payload para evento "Meditation Seek"
 */
export interface MeditationSeekPayload extends BaseMeditationEvent {
  meditation_id: string;
  meditation_title: string;
  category: string;
  seek_from_seconds: number;
  seek_to_seconds: number;
  seek_delta_seconds: number;
  play_session_id: string;
}

/**
 * Payload para evento "Meditation Volume Changed"
 */
export interface MeditationVolumeChangedPayload extends BaseMeditationEvent {
  meditation_id: string;
  meditation_title: string;
  category: string;
  volume_before: number;
  volume_after: number;
  volume_delta: number;
  play_session_id: string;
}

/**
 * Payload para evento "Background Sound Selected"
 */
export interface BackgroundSoundSelectedPayload extends BaseMeditationEvent {
  meditation_id: string;
  meditation_title: string;
  category: string;
  sound_id_before: string;
  sound_id_after: string;
  sound_title_after: string;
  sound_category: string;
  play_session_id: string;
}

/**
 * Payload para evento "Background Volume Changed"
 */
export interface BackgroundVolumeChangedPayload extends BaseMeditationEvent {
  meditation_id: string;
  meditation_title: string;
  category: string;
  volume_before: number;
  volume_after: number;
  volume_delta: number;
  background_sound_id: string;
  play_session_id: string;
}

/**
 * Payload para evento "Meditation Favorited"
 */
export interface MeditationFavoritedPayload extends BaseMeditationEvent {
  meditation_id: string;
  meditation_title: string;
  category: string;
  duration_seconds: number;
  is_completed: boolean;
  source: 'player' | 'settings';
}

/**
 * Payload para evento "Meditation Unfavorited"
 */
export interface MeditationUnfavoritedPayload extends BaseMeditationEvent {
  meditation_id: string;
  meditation_title: string;
  category: string;
  source: 'player' | 'settings';
}

/**
 * Payload para evento "Premium Content Blocked"
 */
export interface PremiumContentBlockedPayload extends BaseMeditationEvent {
  meditation_id: string;
  meditation_title: string;
  category: string;
  duration_seconds: number;
  is_premium: true;
  source_page: string;
  has_subscription: boolean;
}

// ============================================================================
// FUNÇÕES UTILITÁRIAS
// ============================================================================

/**
 * Converte duração em formato "X min" para segundos
 * @param duration - Duração no formato "X min" ou "X minutos"
 * @returns Duração em segundos
 * @example
 * parseDurationToSeconds("7 min") // 420
 * parseDurationToSeconds("15 minutos") // 900
 */
export function parseDurationToSeconds(duration: string): number {
  const match = duration.match(/(\d+)\s*(min|minutos?)/i);
  if (!match) {
    console.warn(`[Analytics] Could not parse duration: ${duration}`);
    return 0;
  }
  return parseInt(match[1], 10) * 60;
}

/**
 * Calcula porcentagem de progresso
 * @param currentTime - Tempo atual em segundos
 * @param totalDuration - Duração total em segundos
 * @returns Porcentagem (0-100)
 */
export function calculateProgressPercentage(
  currentTime: number,
  totalDuration: number
): number {
  if (totalDuration <= 0) return 0;
  const percentage = (currentTime / totalDuration) * 100;
  return Math.min(100, Math.max(0, percentage));
}

/**
 * Valida payload de evento antes de enviar
 * @param eventName - Nome do evento
 * @param payload - Payload a validar
 * @returns true se válido, false caso contrário
 */
export function validateEventPayload(
  eventName: string,
  payload: Record<string, unknown>
): boolean {
  // DEBUG: Log completo do payload
  console.log(`[Analytics] Validating ${eventName}`, payload);

  // 1. Campos obrigatórios para eventos de meditação
  if (!payload.meditation_id && eventName !== 'Front-end: Meditation List Viewed') {
    console.warn(`[Analytics] Missing meditation_id for ${eventName}`);
    return false;
  }

  // Eventos de feedback usam meditation_category em vez de category
  const isFeedbackEvent = eventName.includes('Feedback');
  const categoryField = isFeedbackEvent ? 'meditation_category' : 'category';

  if (!payload[categoryField] && eventName !== 'Front-end: Meditation List Viewed') {
    console.warn(`[Analytics] Missing ${categoryField} for ${eventName}`);
    return false;
  }

  // 2. Validar progress_percentage
  if (typeof payload.progress_percentage === 'number') {
    if (payload.progress_percentage < 0 || payload.progress_percentage > 100) {
      console.warn(
        `[Analytics] Invalid progress_percentage: ${payload.progress_percentage}`
      );
      return false;
    }
  }

  // 3. Validar volumes
  const volumeFields = [
    'meditation_volume',
    'background_volume',
    'volume_before',
    'volume_after',
    'meditation_volume_final',
    'background_volume_final',
  ];

  for (const field of volumeFields) {
    if (typeof payload[field] === 'number') {
      const value = payload[field] as number;
      if (value < 0 || value > 100) {
        console.warn(`[Analytics] Invalid ${field}: ${value}`);
        return false;
      }
    }
  }

  // 4. Session ID obrigatório para eventos de sessão
  const sessionEvents = [
    'Started',
    'Paused',
    'Resumed',
    'Completed',
    'Abandoned',
    'Skip',
    'Seek',
    'Volume Changed',
    'Background Sound Selected',
    'Background Volume Changed',
  ];

  const isSessionEvent = sessionEvents.some((e) => eventName.includes(e));
  if (isSessionEvent && !payload.play_session_id) {
    console.warn(`[Analytics] Missing play_session_id for ${eventName}`);
    console.warn(`[Analytics] Payload:`, payload);
    return false;
  }

  return true;
}

/**
 * Enriquece payload com identidade do usuário e timestamp
 * @param payload - Payload base
 * @returns Payload enriquecido
 */
export function enrichWithIdentity<T extends Record<string, unknown>>(
  payload: T
): T & BaseMeditationEvent {
  return {
    ...payload,
    user_id: getUserIdFromStore(),
    session_id: getSessionId(),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Envia evento de meditação para o Mixpanel
 * @param eventName - Nome do evento (ex: "Front-end: Meditation Started")
 * @param payload - Payload do evento
 */
export function trackMeditationEvent<T extends Record<string, unknown>>(
  eventName: string,
  payload: T
): void {
  // Enriquecer com identidade
  const enrichedPayload = enrichWithIdentity(payload);

  // Validar antes de enviar
  if (!validateEventPayload(eventName, enrichedPayload)) {
    console.error(`[Analytics] Event validation failed: ${eventName}`, enrichedPayload);
    return;
  }

  // Enviar para Mixpanel
  track(eventName, enrichedPayload);
}

/**
 * Gera um UUID v4 simples para session IDs
 * @returns UUID v4
 */
export function generateSessionId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Determina categoria da meditação baseado no contexto
 * @param pathname - Pathname da URL
 * @returns Categoria da meditação
 */
export function getCategoryFromPath(pathname: string): string {
  if (pathname.includes('dr-joe-dispenza')) return 'dr_joe_dispenza';
  if (pathname.includes('introducao-meditacao')) return 'introducao';
  if (pathname.includes('energy-blessings')) return 'energy_blessings';
  return 'unknown';
}

/**
 * Payload para evento "Meditation Feedback Submitted"
 */
export interface MeditationFeedbackPayload extends BaseMeditationEvent {
  vote: 'positive' | 'negative';
  reasons?: string[];
  meditation_id: string;
  meditation_title: string;
  meditation_duration_seconds: number;
  meditation_category: string;
  actual_play_time_seconds: number;
  completion_percentage: number;
  pause_count: number;
  skip_count: number;
  seek_count: number;
  background_sound_id?: string;
  background_sound_title?: string;
  feedback_source: 'meditation_completion';
}

/**
 * Tracks meditation feedback submission
 * @param vote - User vote (positive/negative)
 * @param meditationData - Meditation context data
 * @param reasons - Optional reasons if negative
 */
export function trackMeditationFeedback(
  vote: 'positive' | 'negative',
  meditationData: {
    meditationId: string;
    meditationTitle: string;
    meditationDuration: number;
    meditationCategory: string;
    actualPlayTime?: number;
    pauseCount?: number;
    skipCount?: number;
    seekCount?: number;
    backgroundSoundId?: string;
    backgroundSoundTitle?: string;
  },
  reasons?: string[]
): void {
  const payload: Omit<MeditationFeedbackPayload, keyof BaseMeditationEvent> = {
    vote,
    reasons,
    meditation_id: meditationData.meditationId,
    meditation_title: meditationData.meditationTitle,
    meditation_duration_seconds: meditationData.meditationDuration,
    meditation_category: meditationData.meditationCategory,
    actual_play_time_seconds: meditationData.actualPlayTime || 0,
    completion_percentage: meditationData.actualPlayTime
      ? calculateProgressPercentage(meditationData.actualPlayTime, meditationData.meditationDuration)
      : 100,
    pause_count: meditationData.pauseCount || 0,
    skip_count: meditationData.skipCount || 0,
    seek_count: meditationData.seekCount || 0,
    background_sound_id: meditationData.backgroundSoundId,
    background_sound_title: meditationData.backgroundSoundTitle,
    feedback_source: 'meditation_completion',
  };

  trackMeditationEvent('Front-end: Meditation Feedback Submitted', payload);
}
