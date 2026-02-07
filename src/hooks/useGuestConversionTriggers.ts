import { useCallback, useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGuestExperience } from '../contexts/GuestExperienceContext';
import type { ConversionContext } from '../constants/conversionCopy';
import mixpanel from 'mixpanel-browser';

/**
 * Tipos de sinais comportamentais que podem acionar conversão
 */
export type ConversionSignalType =
  | 'deep_scroll'           // Scroll profundo em conteúdo (>80%)
  | 'favorite_clicked'      // Tentativa de favoritar
  | 'long_message'          // Mensagem longa no chat (>150 chars)
  | 'multiple_visits'       // 2+ sessões como guest
  | 'voice_used'            // Usou gravador de voz
  | 'tts_played'            // Tocou áudio TTS
  | 'profile_clicked'       // Tentou acessar perfil/memória
  | 'meditation_preview'    // Iniciou preview de meditação
  | 'reflection_viewed'     // Visualizou reflexão
  | 'rings_completed'       // Completou dia do Five Rings
  | 'time_spent';           // Tempo significativo na plataforma

/**
 * Metadados de um sinal de conversão
 */
export interface ConversionSignal {
  type: ConversionSignalType;
  depth?: number;           // Para scroll depth (0-1)
  messageLength?: number;   // Para mensagens longas
  visitCount?: number;      // Para múltiplas visitas
  timeSpentMs?: number;     // Para tempo gasto
  contentId?: string;       // ID do conteúdo (reflexão, meditação, etc.)
}

/**
 * Contexto de modal de conversão
 */
export interface ConversionModalContext {
  context: ConversionContext;
  signal: ConversionSignalType;
  timestamp: number;
}

/**
 * Hook para detecção inteligente de triggers de conversão
 */
export function useGuestConversionTriggers() {
  const { isGuestMode, guestId } = useAuth();
  const { state, trackInteraction } = useGuestExperience();

  const [shouldShowModal, setShouldShowModal] = useState(false);
  const [modalContext, setModalContext] = useState<ConversionModalContext | null>(null);

  // Estado para rastrear sinais específicos
  const [signalsTriggered, setSignalsTriggered] = useState<Set<string>>(new Set());

  /**
   * Verifica se um sinal já foi triggerado recentemente
   * (evita spam de modais)
   */
  const wasRecentlyTriggered = useCallback((signalKey: string): boolean => {
    return signalsTriggered.has(signalKey);
  }, [signalsTriggered]);

  /**
   * Marca um sinal como triggerado
   */
  const markSignalTriggered = useCallback((signalKey: string) => {
    setSignalsTriggered((prev) => new Set(prev).add(signalKey));
  }, []);

  /**
   * Verifica e processa um sinal de conversão
   */
  const checkTrigger = useCallback(
    (signal: ConversionSignal) => {
      // Não processar se não estiver em guest mode
      if (!isGuestMode) return;

      // Não processar se modal já está sendo mostrado
      if (shouldShowModal) return;

      // Criar chave única para este sinal
      const signalKey = `${signal.type}_${signal.contentId || 'global'}`;

      // Não processar se este sinal específico já foi triggerado
      if (wasRecentlyTriggered(signalKey)) return;

      let context: ConversionContext | null = null;
      let shouldTrigger = false;

      switch (signal.type) {
        case 'deep_scroll':
          // Deep scroll + 2+ interações
          if ((signal.depth ?? 0) > 0.8 && state.interactionCount >= 2) {
            context = 'reflection_deep_scroll';
            shouldTrigger = true;
          }
          break;

        case 'favorite_clicked':
          // Qualquer tentativa de favoritar
          context = 'favorite_attempt';
          shouldTrigger = true;
          break;

        case 'long_message':
          // Mensagem longa + 2+ mensagens anteriores
          if ((signal.messageLength ?? 0) > 150 && state.interactionCount >= 2) {
            context = 'chat_deep_engagement';
            shouldTrigger = true;
          }
          break;

        case 'multiple_visits':
          // 2+ visitas
          if ((signal.visitCount ?? 0) >= 2) {
            context = 'multiple_visits';
            shouldTrigger = true;
          }
          break;

        case 'voice_used':
          // Qualquer uso de voz
          context = 'voice_usage';
          shouldTrigger = true;
          break;

        case 'tts_played':
          // 2+ reproduções de TTS
          if (state.interactionCount >= 2) {
            context = 'chat_deep_engagement';
            shouldTrigger = true;
          }
          break;

        case 'profile_clicked':
          // Qualquer tentativa de acessar perfil/memória
          context = 'memory_preview';
          shouldTrigger = true;
          break;

        case 'meditation_preview':
          // Iniciou preview de meditação
          if (state.interactionCount >= 1) {
            context = 'meditation_time_limit';
            shouldTrigger = true;
          }
          break;

        case 'reflection_viewed':
          // 3+ reflexões visualizadas
          if (state.interactionCount >= 3) {
            context = 'reflection_multiple';
            shouldTrigger = true;
          }
          break;

        case 'rings_completed':
          // Completou dia do ritual
          context = 'rings_day_complete';
          shouldTrigger = true;
          break;

        case 'time_spent':
          // 8+ minutos na plataforma
          if ((signal.timeSpentMs ?? 0) >= 8 * 60 * 1000) {
            context = 'generic';
            shouldTrigger = true;
          }
          break;

        default:
          break;
      }

      if (shouldTrigger && context) {
        // Marcar este sinal como triggerado
        markSignalTriggered(signalKey);

        // Definir contexto do modal
        setModalContext({
          context,
          signal: signal.type,
          timestamp: Date.now(),
        });

        // Mostrar modal
        setShouldShowModal(true);

        // Track no analytics
        trackInteraction('conversion_trigger_shown', {
          trigger: signal.type,
          context,
          ...signal,
        });

        mixpanel.track('Guest Conversion Trigger', {
          trigger: signal.type,
          context,
          guest_id: guestId,
          interaction_count: state.interactionCount,
          time_spent_ms: state.totalTimeMs,
          ...signal,
        });
      }
    },
    [
      isGuestMode,
      shouldShowModal,
      wasRecentlyTriggered,
      markSignalTriggered,
      state.interactionCount,
      state.totalTimeMs,
      trackInteraction,
      guestId,
    ]
  );

  /**
   * Dispensar modal
   */
  const dismissModal = useCallback(() => {
    if (!modalContext) return;

    setShouldShowModal(false);

    // Track dismissal
    trackInteraction('conversion_trigger_dismissed', {
      context: modalContext.context,
      signal: modalContext.signal,
    });

    mixpanel.track('Guest Conversion Trigger Dismissed', {
      context: modalContext.context,
      signal: modalContext.signal,
      guest_id: guestId,
      time_spent_ms: state.totalTimeMs,
    });

    // Limpar contexto após um delay (permite animação de saída)
    setTimeout(() => {
      setModalContext(null);
    }, 300);
  }, [modalContext, trackInteraction, guestId, state.totalTimeMs]);

  /**
   * Aceitar modal (iniciar conversão)
   */
  const acceptModal = useCallback(() => {
    if (!modalContext) return;

    // Track aceitação
    trackInteraction('conversion_trigger_accepted', {
      context: modalContext.context,
      signal: modalContext.signal,
    });

    mixpanel.track('Guest Conversion Trigger Accepted', {
      context: modalContext.context,
      signal: modalContext.signal,
      guest_id: guestId,
      time_spent_ms: state.totalTimeMs,
      interaction_count: state.interactionCount,
    });

    // Limpar modal
    setShouldShowModal(false);
    setModalContext(null);
  }, [modalContext, trackInteraction, guestId, state.totalTimeMs, state.interactionCount]);

  /**
   * Limpar sinais após um período (24h)
   * Para permitir re-trigger em futuras sessões
   */
  useEffect(() => {
    const interval = setInterval(() => {
      setSignalsTriggered(new Set());
    }, 24 * 60 * 60 * 1000); // 24 horas

    return () => clearInterval(interval);
  }, []);

  return {
    shouldShowModal,
    modalContext,
    checkTrigger,
    dismissModal,
    acceptModal,
  };
}

/**
 * Helpers para criar sinais específicos
 */
export const ConversionSignals = {
  deepScroll: (depth: number, contentId?: string): ConversionSignal => ({
    type: 'deep_scroll',
    depth,
    contentId,
  }),

  favoriteClicked: (contentId: string): ConversionSignal => ({
    type: 'favorite_clicked',
    contentId,
  }),

  longMessage: (messageLength: number): ConversionSignal => ({
    type: 'long_message',
    messageLength,
  }),

  multipleVisits: (visitCount: number): ConversionSignal => ({
    type: 'multiple_visits',
    visitCount,
  }),

  voiceUsed: (): ConversionSignal => ({
    type: 'voice_used',
  }),

  ttsPlayed: (): ConversionSignal => ({
    type: 'tts_played',
  }),

  profileClicked: (): ConversionSignal => ({
    type: 'profile_clicked',
  }),

  meditationPreview: (contentId: string): ConversionSignal => ({
    type: 'meditation_preview',
    contentId,
  }),

  reflectionViewed: (contentId: string): ConversionSignal => ({
    type: 'reflection_viewed',
    contentId,
  }),

  ringsCompleted: (day: number): ConversionSignal => ({
    type: 'rings_completed',
    contentId: `day_${day}`,
  }),

  timeSpent: (timeSpentMs: number): ConversionSignal => ({
    type: 'time_spent',
    timeSpentMs,
  }),
};
