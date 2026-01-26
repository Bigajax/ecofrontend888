/**
 * Configurações do sistema de Guest Experience
 *
 * Controla o comportamento do modo guest, limites para modal de signup,
 * e eventos rastreados para analytics.
 */

export const GUEST_EXPERIENCE_CONFIG = {
  // Feature flags
  ENABLED: true,                       // Habilitar sistema completo

  // Limites para modal
  TIME_LIMIT_MS: 10 * 60 * 1000,      // 10 minutos
  INTERACTION_LIMIT: 15,               // 15 interações significativas

  // Heartbeat para rastreamento de tempo
  HEARTBEAT_INTERVAL_MS: 30 * 1000,    // 30 segundos

  // Modal
  MODAL_CHECK_INTERVAL_MS: 5 * 1000,   // Verificar a cada 5s se deve mostrar
  MODAL_COOLDOWN_MS: 24 * 60 * 60 * 1000, // 24h após dismiss (não usado ainda)

  // Persistência
  STORAGE_KEY: 'eco.guest.experience.v1',

  // Eventos significativos (contam como interação)
  TRACKED_EVENTS: [
    'chat_message_sent',
    'meditation_started',
    'meditation_completed',
    'voice_message_sent',
    'feedback_submitted',
    'memory_viewed',
    'navigation',
    'page_view',
  ],
} as const;

/**
 * Feature flags granulares para controle fino
 * Útil para A/B testing e rollback gradual
 */
export const GUEST_EXPERIENCE_FEATURES = {
  AUTO_GUEST_MODE: true,               // Ativar guest automaticamente em RequireAuth
  SHOW_MODAL: true,                    // Mostrar modal de signup
  TRACK_INTERACTIONS: true,            // Rastrear interações do usuário
  SEND_TO_MIXPANEL: true,              // Enviar eventos ao Mixpanel
  TIME_BASED_TRIGGER: true,            // Modal ativado por tempo
  INTERACTION_BASED_TRIGGER: true,     // Modal ativado por interações
  HEARTBEAT_TRACKING: true,            // Rastreamento contínuo de tempo
} as const;

/**
 * Tipos de interação para TypeScript
 */
export type GuestInteractionType =
  | 'chat_message_sent'
  | 'meditation_started'
  | 'meditation_completed'
  | 'voice_message_sent'
  | 'feedback_submitted'
  | 'memory_viewed'
  | 'navigation'
  | 'page_view';

/**
 * Metadata opcional para interações
 */
export interface GuestInteractionMetadata {
  page?: string;
  component?: string;
  action?: string;
  meditation_id?: string;
  meditation_title?: string;
  message_length?: number;
  duration_seconds?: number;
  [key: string]: string | number | boolean | undefined;
}
