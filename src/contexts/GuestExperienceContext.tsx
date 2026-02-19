import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import {
  GUEST_EXPERIENCE_CONFIG,
  GUEST_EXPERIENCE_FEATURES,
  GuestInteractionType,
  GuestInteractionMetadata,
} from '@/constants/guestExperience';
import mixpanel from '@/lib/mixpanel';

/**
 * Estado do sistema de Guest Experience
 */
interface GuestExperienceState {
  // Identidade
  guestId: string | null;
  sessionId: string | null;

  // Rastreamento de jornada
  startedAt: number;           // timestamp inicial (ms)
  totalTimeMs: number;         // tempo acumulado (ms)
  lastActivityAt: number;      // último evento (ms)

  // Métricas
  interactionCount: number;    // contador de interações significativas
  pageViews: number;           // páginas visitadas (total)
  visitedPages: Set<string>;   // rotas únicas visitadas

  // Modal
  modalShown: boolean;         // já mostrou modal?
  modalDismissedAt: number | null; // quando foi dismissado

  // Limites (podem ser dinâmicos no futuro)
  timeLimitMs: number;
  interactionLimit: number;

  // NOVO: Sinais comportamentais de qualidade
  longMessagesCount: number;   // Mensagens >150 chars
  deepScrollCount: number;     // Scrolls >80% profundidade
  favoriteAttempts: number;    // Tentativas de favoritar
  voiceUsageCount: number;     // Uso de voz
  ttsPlayCount: number;        // Reproduções de TTS
  profileClickCount: number;   // Clicks em perfil/memória
  sessionCount: number;        // Número de sessões
}

/**
 * API do contexto
 */
interface GuestExperienceContextType {
  state: GuestExperienceState;

  // Tracking
  trackPageView(path: string): void;
  trackInteraction(type: GuestInteractionType, metadata?: GuestInteractionMetadata): void;
  trackTimeSpent(ms: number): void;

  // NOVO: Tracking de sinais comportamentais
  trackLongMessage(length: number): void;
  trackDeepScroll(depth: number): void;
  trackFavoriteAttempt(): void;
  trackVoiceUsage(): void;
  trackTTSPlay(): void;
  trackProfileClick(): void;

  // Verificações
  shouldShowModal(): boolean;
  hasReachedLimit(): boolean;

  // Modal
  markModalShown(): void;
  dismissModal(): void;

  // Reset
  resetTracking(): void;
}

const GuestExperienceContext = createContext<GuestExperienceContextType | undefined>(undefined);

/**
 * Estado inicial padrão
 */
const createInitialState = (): GuestExperienceState => ({
  guestId: null,
  sessionId: null,
  startedAt: Date.now(),
  totalTimeMs: 0,
  lastActivityAt: Date.now(),
  interactionCount: 0,
  pageViews: 0,
  visitedPages: new Set<string>(),
  modalShown: false,
  modalDismissedAt: null,
  timeLimitMs: GUEST_EXPERIENCE_CONFIG.TIME_LIMIT_MS,
  interactionLimit: GUEST_EXPERIENCE_CONFIG.INTERACTION_LIMIT,
  // NOVO: Sinais comportamentais
  longMessagesCount: 0,
  deepScrollCount: 0,
  favoriteAttempts: 0,
  voiceUsageCount: 0,
  ttsPlayCount: 0,
  profileClickCount: 0,
  sessionCount: 1, // Começa em 1 (primeira sessão)
});

/**
 * Carregar estado do localStorage
 */
const loadStateFromStorage = (guestId: string | null): GuestExperienceState => {
  if (!guestId) return createInitialState();

  try {
    const stored = localStorage.getItem(GUEST_EXPERIENCE_CONFIG.STORAGE_KEY);
    if (!stored) return createInitialState();

    const parsed = JSON.parse(stored);

    // Reconstruir Set de páginas visitadas
    const visitedPages = new Set<string>(parsed.visitedPages || []);

    return {
      ...parsed,
      visitedPages,
      guestId,
      lastActivityAt: Date.now(), // Atualizar para agora
    };
  } catch (error) {
    console.error('[GuestExperience] Erro ao carregar do storage:', error);
    return createInitialState();
  }
};

/**
 * Salvar estado no localStorage
 */
const saveStateToStorage = (state: GuestExperienceState) => {
  try {
    // Converter Set para Array para serialização
    const toSave = {
      ...state,
      visitedPages: Array.from(state.visitedPages),
    };

    localStorage.setItem(GUEST_EXPERIENCE_CONFIG.STORAGE_KEY, JSON.stringify(toSave));
  } catch (error) {
    console.error('[GuestExperience] Erro ao salvar no storage:', error);
  }
};

/**
 * Provider do sistema de Guest Experience
 */
export function GuestExperienceProvider({ children }: { children: React.ReactNode }) {
  const { user, isGuestMode, guestId } = useAuth();

  // Se não é guest ou está logado, não faz nada
  if (!GUEST_EXPERIENCE_CONFIG.ENABLED || !isGuestMode || user) {
    return <>{children}</>;
  }

  const [state, setState] = useState<GuestExperienceState>(() =>
    loadStateFromStorage(guestId)
  );

  // Atualizar guestId quando mudar
  useEffect(() => {
    if (guestId && state.guestId !== guestId) {
      setState((prev) => ({ ...prev, guestId }));
    }
  }, [guestId, state.guestId]);

  // Persistir estado em localStorage sempre que mudar
  useEffect(() => {
    saveStateToStorage(state);
  }, [state]);

  // Heartbeat: incrementar tempo a cada intervalo
  useEffect(() => {
    if (!GUEST_EXPERIENCE_FEATURES.HEARTBEAT_TRACKING) return;

    const interval = setInterval(() => {
      setState((prev) => ({
        ...prev,
        totalTimeMs: prev.totalTimeMs + GUEST_EXPERIENCE_CONFIG.HEARTBEAT_INTERVAL_MS,
        lastActivityAt: Date.now(),
      }));
    }, GUEST_EXPERIENCE_CONFIG.HEARTBEAT_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  // Rastrear visualização de página
  const trackPageView = useCallback(
    (path: string) => {
      if (!GUEST_EXPERIENCE_FEATURES.TRACK_INTERACTIONS) return;

      setState((prev) => {
        const alreadyVisited = prev.visitedPages.has(path);
        const newVisitedPages = new Set(prev.visitedPages);
        newVisitedPages.add(path);

        return {
          ...prev,
          pageViews: prev.pageViews + 1,
          visitedPages: newVisitedPages,
          lastActivityAt: Date.now(),
        };
      });

      // Enviar para Mixpanel
      if (GUEST_EXPERIENCE_FEATURES.SEND_TO_MIXPANEL) {
        mixpanel.track('Guest Page View', {
          page: path,
          guest_id: guestId,
          total_time_ms: state.totalTimeMs,
          page_views: state.pageViews + 1,
          unique_pages: state.visitedPages.size,
        });
      }
    },
    [guestId, state.totalTimeMs, state.pageViews, state.visitedPages.size]
  );

  // Rastrear interação
  const trackInteraction = useCallback(
    (type: GuestInteractionType, metadata?: GuestInteractionMetadata) => {
      if (!GUEST_EXPERIENCE_FEATURES.TRACK_INTERACTIONS) return;

      setState((prev) => ({
        ...prev,
        interactionCount: prev.interactionCount + 1,
        lastActivityAt: Date.now(),
      }));

      // Enviar para Mixpanel
      if (GUEST_EXPERIENCE_FEATURES.SEND_TO_MIXPANEL) {
        mixpanel.track('Guest Interaction', {
          type,
          ...metadata,
          guest_id: guestId,
          total_time_ms: state.totalTimeMs,
          interaction_count: state.interactionCount + 1,
          page_views: state.pageViews,
        });
      }
    },
    [guestId, state.totalTimeMs, state.interactionCount, state.pageViews]
  );

  // Rastrear tempo adicional (se necessário)
  const trackTimeSpent = useCallback((ms: number) => {
    setState((prev) => ({
      ...prev,
      totalTimeMs: prev.totalTimeMs + ms,
      lastActivityAt: Date.now(),
    }));
  }, []);

  // NOVO: Rastrear mensagem longa
  const trackLongMessage = useCallback(
    (length: number) => {
      if (length <= 150) return; // Só conta se >150 chars

      setState((prev) => ({
        ...prev,
        longMessagesCount: prev.longMessagesCount + 1,
        lastActivityAt: Date.now(),
      }));

      if (GUEST_EXPERIENCE_FEATURES.SEND_TO_MIXPANEL) {
        mixpanel.track('Guest Long Message', {
          message_length: length,
          long_messages_count: state.longMessagesCount + 1,
          guest_id: guestId,
        });
      }
    },
    [guestId, state.longMessagesCount]
  );

  // NOVO: Rastrear scroll profundo
  const trackDeepScroll = useCallback(
    (depth: number) => {
      if (depth <= 0.8) return; // Só conta se >80%

      setState((prev) => ({
        ...prev,
        deepScrollCount: prev.deepScrollCount + 1,
        lastActivityAt: Date.now(),
      }));

      if (GUEST_EXPERIENCE_FEATURES.SEND_TO_MIXPANEL) {
        mixpanel.track('Guest Deep Scroll', {
          scroll_depth: depth,
          deep_scroll_count: state.deepScrollCount + 1,
          guest_id: guestId,
        });
      }
    },
    [guestId, state.deepScrollCount]
  );

  // NOVO: Rastrear tentativa de favoritar
  const trackFavoriteAttempt = useCallback(() => {
    setState((prev) => ({
      ...prev,
      favoriteAttempts: prev.favoriteAttempts + 1,
      lastActivityAt: Date.now(),
    }));

    if (GUEST_EXPERIENCE_FEATURES.SEND_TO_MIXPANEL) {
      mixpanel.track('Guest Favorite Attempt', {
        favorite_attempts: state.favoriteAttempts + 1,
        guest_id: guestId,
      });
    }
  }, [guestId, state.favoriteAttempts]);

  // NOVO: Rastrear uso de voz
  const trackVoiceUsage = useCallback(() => {
    setState((prev) => ({
      ...prev,
      voiceUsageCount: prev.voiceUsageCount + 1,
      lastActivityAt: Date.now(),
    }));

    if (GUEST_EXPERIENCE_FEATURES.SEND_TO_MIXPANEL) {
      mixpanel.track('Guest Voice Usage', {
        voice_usage_count: state.voiceUsageCount + 1,
        guest_id: guestId,
      });
    }
  }, [guestId, state.voiceUsageCount]);

  // NOVO: Rastrear TTS play
  const trackTTSPlay = useCallback(() => {
    setState((prev) => ({
      ...prev,
      ttsPlayCount: prev.ttsPlayCount + 1,
      lastActivityAt: Date.now(),
    }));

    if (GUEST_EXPERIENCE_FEATURES.SEND_TO_MIXPANEL) {
      mixpanel.track('Guest TTS Play', {
        tts_play_count: state.ttsPlayCount + 1,
        guest_id: guestId,
      });
    }
  }, [guestId, state.ttsPlayCount]);

  // NOVO: Rastrear click em perfil/memória
  const trackProfileClick = useCallback(() => {
    setState((prev) => ({
      ...prev,
      profileClickCount: prev.profileClickCount + 1,
      lastActivityAt: Date.now(),
    }));

    if (GUEST_EXPERIENCE_FEATURES.SEND_TO_MIXPANEL) {
      mixpanel.track('Guest Profile Click', {
        profile_click_count: state.profileClickCount + 1,
        guest_id: guestId,
      });
    }
  }, [guestId, state.profileClickCount]);

  // Verificar se atingiu algum limite
  const hasReachedLimit = useCallback((): boolean => {
    const timeReached =
      GUEST_EXPERIENCE_FEATURES.TIME_BASED_TRIGGER &&
      state.totalTimeMs >= state.timeLimitMs;

    const interactionsReached =
      GUEST_EXPERIENCE_FEATURES.INTERACTION_BASED_TRIGGER &&
      state.interactionCount >= state.interactionLimit;

    return timeReached || interactionsReached;
  }, [state.totalTimeMs, state.timeLimitMs, state.interactionCount, state.interactionLimit]);

  // Verificar se deve mostrar modal
  const shouldShowModal = useCallback((): boolean => {
    if (!GUEST_EXPERIENCE_FEATURES.SHOW_MODAL) return false;
    if (state.modalShown) return false; // Já mostrou

    return hasReachedLimit();
  }, [state.modalShown, hasReachedLimit]);

  // Marcar modal como mostrado
  const markModalShown = useCallback(() => {
    setState((prev) => ({
      ...prev,
      modalShown: true,
    }));

    if (GUEST_EXPERIENCE_FEATURES.SEND_TO_MIXPANEL) {
      mixpanel.track('Guest Signup Modal Shown', {
        trigger: state.totalTimeMs >= state.timeLimitMs ? 'time' : 'interactions',
        time_spent_ms: state.totalTimeMs,
        time_spent_minutes: Math.floor(state.totalTimeMs / 60000),
        interaction_count: state.interactionCount,
        page_views: state.pageViews,
        unique_pages_visited: state.visitedPages.size,
        guest_id: guestId,
      });
    }
  }, [
    state.totalTimeMs,
    state.timeLimitMs,
    state.interactionCount,
    state.pageViews,
    state.visitedPages.size,
    guestId,
  ]);

  // Dispensar modal
  const dismissModal = useCallback(() => {
    setState((prev) => ({
      ...prev,
      modalDismissedAt: Date.now(),
    }));

    if (GUEST_EXPERIENCE_FEATURES.SEND_TO_MIXPANEL) {
      mixpanel.track('Guest Signup Modal - Continued', {
        time_spent_ms: state.totalTimeMs,
        time_spent_minutes: Math.floor(state.totalTimeMs / 60000),
        interaction_count: state.interactionCount,
        guest_id: guestId,
      });
    }
  }, [state.totalTimeMs, state.interactionCount, guestId]);

  // Resetar rastreamento
  const resetTracking = useCallback(() => {
    setState(createInitialState());
    localStorage.removeItem(GUEST_EXPERIENCE_CONFIG.STORAGE_KEY);
  }, []);

  const value: GuestExperienceContextType = {
    state,
    trackPageView,
    trackInteraction,
    trackTimeSpent,
    trackLongMessage,
    trackDeepScroll,
    trackFavoriteAttempt,
    trackVoiceUsage,
    trackTTSPlay,
    trackProfileClick,
    shouldShowModal,
    hasReachedLimit,
    markModalShown,
    dismissModal,
    resetTracking,
  };

  return (
    <GuestExperienceContext.Provider value={value}>
      {children}
    </GuestExperienceContext.Provider>
  );
}

/**
 * Hook para acessar o contexto
 */
export function useGuestExperience(): GuestExperienceContextType {
  const context = useContext(GuestExperienceContext);

  if (context === undefined) {
    // Se não está dentro do provider, retornar API mock (no-op)
    return {
      state: createInitialState(),
      trackPageView: () => {},
      trackInteraction: () => {},
      trackTimeSpent: () => {},
      trackLongMessage: () => {},
      trackDeepScroll: () => {},
      trackFavoriteAttempt: () => {},
      trackVoiceUsage: () => {},
      trackTTSPlay: () => {},
      trackProfileClick: () => {},
      shouldShowModal: () => false,
      hasReachedLimit: () => false,
      markModalShown: () => {},
      dismissModal: () => {},
      resetTracking: () => {},
    };
  }

  return context;
}
