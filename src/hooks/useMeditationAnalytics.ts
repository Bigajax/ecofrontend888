/**
 * useMeditationAnalytics Hook
 *
 * Hook customizado para tracking completo de meditações.
 * Gerencia session IDs, deduplicação, métricas e todos os eventos de telemetria.
 *
 * @example
 * const analytics = useMeditationAnalytics({
 *   meditationId: 'blessing_1',
 *   meditationTitle: 'Bênção dos Centros de Energia',
 *   category: 'dr_joe_dispenza',
 *   durationSeconds: 420,
 *   isPremium: false
 * });
 *
 * // No play
 * analytics.trackStarted({ backgroundSoundId: 'freq_1', ... });
 *
 * // No pause
 * analytics.trackPaused(currentTime);
 */

import { useRef, useEffect, useCallback } from 'react';
import {
  trackMeditationEvent,
  generateSessionId,
  calculateProgressPercentage,
  type MeditationStartedPayload,
  type MeditationPausedPayload,
  type MeditationResumedPayload,
  type MeditationCompletedPayload,
  type MeditationAbandonedPayload,
  type MeditationSkipPayload,
  type MeditationSeekPayload,
  type MeditationVolumeChangedPayload,
  type BackgroundSoundSelectedPayload,
  type BackgroundVolumeChangedPayload,
} from '@/analytics/meditation';

// ============================================================================
// TIPOS
// ============================================================================

interface MeditationInfo {
  meditationId: string;
  meditationTitle: string;
  category: string;
  durationSeconds: number;
  isPremium: boolean;
}

interface SessionMetrics {
  playSessionId: string;
  hasStartedEventSent: boolean;
  hasCompletedEventSent: boolean;
  hasAbandonedEventSent: boolean;
  pauseCount: number;
  skipCount: number;
  seekCount: number;
  startTime: number | null;
  totalPausedTime: number;
  lastPauseTime: number | null;
}

interface StartedEventData {
  backgroundSoundId: string;
  backgroundSoundTitle: string;
  meditationVolume: number;
  backgroundVolume: number;
  sourcePage: string;
}

// ============================================================================
// HOOK
// ============================================================================

export function useMeditationAnalytics(info: MeditationInfo) {
  const { meditationId, meditationTitle, category, durationSeconds, isPremium } = info;

  // Session metrics (persiste durante toda a sessão)
  const sessionMetrics = useRef<SessionMetrics>({
    playSessionId: '',
    hasStartedEventSent: false,
    hasCompletedEventSent: false,
    hasAbandonedEventSent: false,
    pauseCount: 0,
    skipCount: 0,
    seekCount: 0,
    startTime: null,
    totalPausedTime: 0,
    lastPauseTime: null,
  });

  // Timers para debouncing
  const volumeDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  const backgroundVolumeDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  // ========================================================================
  // FUNÇÕES DE TRACKING
  // ========================================================================

  /**
   * Track: Meditation Started
   * Envia apenas UMA vez por sessão
   */
  const trackStarted = useCallback(
    (data: StartedEventData) => {
      // Deduplicação: enviar apenas uma vez
      if (sessionMetrics.current.hasStartedEventSent) {
        return;
      }

      // Gerar session ID único
      sessionMetrics.current.playSessionId = generateSessionId();
      sessionMetrics.current.startTime = Date.now();
      sessionMetrics.current.hasStartedEventSent = true;

      const payload: Omit<MeditationStartedPayload, 'user_id' | 'session_id' | 'timestamp'> = {
        meditation_id: meditationId,
        meditation_title: meditationTitle,
        category,
        duration_seconds: durationSeconds,
        is_premium: isPremium,
        background_sound_id: data.backgroundSoundId,
        background_sound_title: data.backgroundSoundTitle,
        meditation_volume: data.meditationVolume,
        background_volume: data.backgroundVolume,
        play_session_id: sessionMetrics.current.playSessionId,
        source_page: data.sourcePage,
      };

      trackMeditationEvent('Front-end: Meditation Started', payload);
    },
    [meditationId, meditationTitle, category, durationSeconds, isPremium]
  );

  /**
   * Track: Meditation Paused
   */
  const trackPaused = useCallback(
    (currentTimeSeconds: number) => {
      // Validação: não enviar se não iniciou
      if (!sessionMetrics.current.hasStartedEventSent) {
        return;
      }

      sessionMetrics.current.pauseCount += 1;
      sessionMetrics.current.lastPauseTime = Date.now();

      const payload: Omit<MeditationPausedPayload, 'user_id' | 'session_id' | 'timestamp'> = {
        meditation_id: meditationId,
        meditation_title: meditationTitle,
        category,
        current_time_seconds: currentTimeSeconds,
        progress_percentage: calculateProgressPercentage(currentTimeSeconds, durationSeconds),
        play_session_id: sessionMetrics.current.playSessionId,
      };

      trackMeditationEvent('Front-end: Meditation Paused', payload);
    },
    [meditationId, meditationTitle, category, durationSeconds]
  );

  /**
   * Track: Meditation Resumed
   */
  const trackResumed = useCallback(
    (currentTimeSeconds: number) => {
      // Validação: não enviar se não iniciou
      if (!sessionMetrics.current.hasStartedEventSent) {
        return;
      }

      // Calcular tempo pausado
      let pauseDuration = 0;
      if (sessionMetrics.current.lastPauseTime) {
        pauseDuration = (Date.now() - sessionMetrics.current.lastPauseTime) / 1000;
        sessionMetrics.current.totalPausedTime += pauseDuration;
        sessionMetrics.current.lastPauseTime = null;
      }

      const payload: Omit<MeditationResumedPayload, 'user_id' | 'session_id' | 'timestamp'> = {
        meditation_id: meditationId,
        meditation_title: meditationTitle,
        category,
        current_time_seconds: currentTimeSeconds,
        progress_percentage: calculateProgressPercentage(currentTimeSeconds, durationSeconds),
        pause_duration_seconds: Math.round(pauseDuration),
        play_session_id: sessionMetrics.current.playSessionId,
      };

      trackMeditationEvent('Front-end: Meditation Resumed', payload);
    },
    [meditationId, meditationTitle, category, durationSeconds]
  );

  /**
   * Track: Meditation Completed
   * Envia apenas UMA vez por sessão
   */
  const trackCompleted = useCallback(
    (finalData: {
      backgroundSoundId: string;
      backgroundSoundTitle: string;
      meditationVolumeFinal: number;
      backgroundVolumeFinal: number;
    }) => {
      // Deduplicação: enviar apenas uma vez
      if (sessionMetrics.current.hasCompletedEventSent) {
        return;
      }

      sessionMetrics.current.hasCompletedEventSent = true;

      // Calcular tempo real de reprodução
      const totalElapsedMs = sessionMetrics.current.startTime
        ? Date.now() - sessionMetrics.current.startTime
        : 0;
      const actualPlayTime = Math.round(
        totalElapsedMs / 1000 - sessionMetrics.current.totalPausedTime
      );

      const payload: Omit<MeditationCompletedPayload, 'user_id' | 'session_id' | 'timestamp'> = {
        meditation_id: meditationId,
        meditation_title: meditationTitle,
        category,
        duration_seconds: durationSeconds,
        actual_play_time_seconds: actualPlayTime,
        pause_count: sessionMetrics.current.pauseCount,
        skip_count: sessionMetrics.current.skipCount,
        seek_count: sessionMetrics.current.seekCount,
        background_sound_id: finalData.backgroundSoundId,
        background_sound_title: finalData.backgroundSoundTitle,
        meditation_volume_final: finalData.meditationVolumeFinal,
        background_volume_final: finalData.backgroundVolumeFinal,
        play_session_id: sessionMetrics.current.playSessionId,
      };

      trackMeditationEvent('Front-end: Meditation Completed', payload);
    },
    [meditationId, meditationTitle, category, durationSeconds]
  );

  /**
   * Track: Meditation Abandoned
   * Envia apenas se Started foi enviado mas Completed não
   */
  const trackAbandoned = useCallback(
    (currentTimeSeconds: number, abandonReason: string) => {
      // Validações
      if (!sessionMetrics.current.hasStartedEventSent) return;
      if (sessionMetrics.current.hasCompletedEventSent) return;
      if (sessionMetrics.current.hasAbandonedEventSent) return;

      sessionMetrics.current.hasAbandonedEventSent = true;

      // Calcular tempo real de reprodução
      const totalElapsedMs = sessionMetrics.current.startTime
        ? Date.now() - sessionMetrics.current.startTime
        : 0;
      const actualPlayTime = Math.round(
        totalElapsedMs / 1000 - sessionMetrics.current.totalPausedTime
      );

      const payload: Omit<MeditationAbandonedPayload, 'user_id' | 'session_id' | 'timestamp'> = {
        meditation_id: meditationId,
        meditation_title: meditationTitle,
        category,
        duration_seconds: durationSeconds,
        current_time_seconds: currentTimeSeconds,
        progress_percentage: calculateProgressPercentage(currentTimeSeconds, durationSeconds),
        actual_play_time_seconds: actualPlayTime,
        pause_count: sessionMetrics.current.pauseCount,
        skip_count: sessionMetrics.current.skipCount,
        seek_count: sessionMetrics.current.seekCount,
        abandon_reason: abandonReason,
        play_session_id: sessionMetrics.current.playSessionId,
      };

      trackMeditationEvent('Front-end: Meditation Abandoned', payload);
    },
    [meditationId, meditationTitle, category, durationSeconds]
  );

  /**
   * Track: Meditation Skip
   */
  const trackSkip = useCallback(
    (direction: 'forward' | 'backward', currentTimeBefore: number, currentTimeAfter: number) => {
      if (!sessionMetrics.current.hasStartedEventSent) return;

      sessionMetrics.current.skipCount += 1;

      const payload: Omit<MeditationSkipPayload, 'user_id' | 'session_id' | 'timestamp'> = {
        meditation_id: meditationId,
        meditation_title: meditationTitle,
        category,
        direction,
        skip_seconds: 15,
        current_time_before: currentTimeBefore,
        current_time_after: currentTimeAfter,
        play_session_id: sessionMetrics.current.playSessionId,
      };

      trackMeditationEvent('Front-end: Meditation Skip', payload);
    },
    [meditationId, meditationTitle, category]
  );

  /**
   * Track: Meditation Seek
   */
  const trackSeek = useCallback(
    (seekFrom: number, seekTo: number) => {
      if (!sessionMetrics.current.hasStartedEventSent) return;

      sessionMetrics.current.seekCount += 1;

      const payload: Omit<MeditationSeekPayload, 'user_id' | 'session_id' | 'timestamp'> = {
        meditation_id: meditationId,
        meditation_title: meditationTitle,
        category,
        seek_from_seconds: seekFrom,
        seek_to_seconds: seekTo,
        seek_delta_seconds: seekTo - seekFrom,
        play_session_id: sessionMetrics.current.playSessionId,
      };

      trackMeditationEvent('Front-end: Meditation Seek', payload);
    },
    [meditationId, meditationTitle, category]
  );

  /**
   * Track: Meditation Volume Changed (com debounce 500ms)
   */
  const trackVolumeChanged = useCallback(
    (volumeBefore: number, volumeAfter: number) => {
      if (!sessionMetrics.current.hasStartedEventSent) return;

      // Limpar timer anterior
      if (volumeDebounceTimer.current) {
        clearTimeout(volumeDebounceTimer.current);
      }

      // Debounce 500ms
      volumeDebounceTimer.current = setTimeout(() => {
        const payload: Omit<
          MeditationVolumeChangedPayload,
          'user_id' | 'session_id' | 'timestamp'
        > = {
          meditation_id: meditationId,
          meditation_title: meditationTitle,
          category,
          volume_before: volumeBefore,
          volume_after: volumeAfter,
          volume_delta: volumeAfter - volumeBefore,
          play_session_id: sessionMetrics.current.playSessionId,
        };

        trackMeditationEvent('Front-end: Meditation Volume Changed', payload);
      }, 500);
    },
    [meditationId, meditationTitle, category]
  );

  /**
   * Track: Background Sound Selected
   */
  const trackBackgroundSoundSelected = useCallback(
    (soundIdBefore: string, soundIdAfter: string, soundTitleAfter: string, soundCategory: string) => {
      if (!sessionMetrics.current.hasStartedEventSent) return;

      const payload: Omit<
        BackgroundSoundSelectedPayload,
        'user_id' | 'session_id' | 'timestamp'
      > = {
        meditation_id: meditationId,
        meditation_title: meditationTitle,
        category,
        sound_id_before: soundIdBefore,
        sound_id_after: soundIdAfter,
        sound_title_after: soundTitleAfter,
        sound_category: soundCategory,
        play_session_id: sessionMetrics.current.playSessionId,
      };

      trackMeditationEvent('Front-end: Background Sound Selected', payload);
    },
    [meditationId, meditationTitle, category]
  );

  /**
   * Track: Background Volume Changed (com debounce 500ms)
   */
  const trackBackgroundVolumeChanged = useCallback(
    (volumeBefore: number, volumeAfter: number, backgroundSoundId: string) => {
      if (!sessionMetrics.current.hasStartedEventSent) return;

      // Limpar timer anterior
      if (backgroundVolumeDebounceTimer.current) {
        clearTimeout(backgroundVolumeDebounceTimer.current);
      }

      // Debounce 500ms
      backgroundVolumeDebounceTimer.current = setTimeout(() => {
        const payload: Omit<
          BackgroundVolumeChangedPayload,
          'user_id' | 'session_id' | 'timestamp'
        > = {
          meditation_id: meditationId,
          meditation_title: meditationTitle,
          category,
          volume_before: volumeBefore,
          volume_after: volumeAfter,
          volume_delta: volumeAfter - volumeBefore,
          background_sound_id: backgroundSoundId,
          play_session_id: sessionMetrics.current.playSessionId,
        };

        trackMeditationEvent('Front-end: Background Volume Changed', payload);
      }, 500);
    },
    [meditationId, meditationTitle, category]
  );

  // ========================================================================
  // CLEANUP
  // ========================================================================

  /**
   * Cleanup: enviar Abandoned se necessário ao desmontar
   */
  useEffect(() => {
    return () => {
      // Limpar timers de debounce
      if (volumeDebounceTimer.current) {
        clearTimeout(volumeDebounceTimer.current);
      }
      if (backgroundVolumeDebounceTimer.current) {
        clearTimeout(backgroundVolumeDebounceTimer.current);
      }
    };
  }, []);

  // ========================================================================
  // RETORNO
  // ========================================================================

  return {
    trackStarted,
    trackPaused,
    trackResumed,
    trackCompleted,
    trackAbandoned,
    trackSkip,
    trackSeek,
    trackVolumeChanged,
    trackBackgroundSoundSelected,
    trackBackgroundVolumeChanged,
    getSessionMetrics: () => sessionMetrics.current,
  };
}
