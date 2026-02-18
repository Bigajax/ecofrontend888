// src/hooks/useVoiceInteractionLimits.ts
// Hook para gerenciar limites de voice interactions por tier

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSubscriptionTier } from './usePremiumContent';
import mixpanel from '../lib/mixpanel';

/**
 * Limites de voice messages por tier
 * - Free: 5 voice messages/dia
 * - Essentials: 20 voice messages/dia
 * - Premium/VIP: Ilimitado
 */
const VOICE_LIMITS = {
  free: 5,
  essentials: 20,
  premium: Infinity,
  vip: Infinity,
} as const;

/**
 * Hook para gerenciar limites de voice interactions
 *
 * @returns Objeto com contador, limite, flags e funções
 *
 * @example
 * ```typescript
 * const voiceLimits = useVoiceInteractionLimits();
 *
 * if (voiceLimits.reachedLimit) {
 *   showUpgradeModal('voice_daily_limit');
 *   return;
 * }
 *
 * // Incrementar após enviar voice message
 * voiceLimits.incrementCount();
 * ```
 */
export function useVoiceInteractionLimits() {
  const { user } = useAuth();
  const tier = useSubscriptionTier();

  const storageKey = `eco.voiceMessages.v1.${user?.id || 'guest'}`;

  const [count, setCount] = useState<number>(() => {
    if (tier === 'premium' || tier === 'vip') return 0; // Premium não rastreia

    const stored = localStorage.getItem(storageKey);
    if (!stored) return 0;

    try {
      const data = JSON.parse(stored);
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      // Reset se for novo dia
      if (data.date !== today) {
        localStorage.removeItem(storageKey);
        return 0;
      }

      return data.count || 0;
    } catch {
      return 0;
    }
  });

  const limit = VOICE_LIMITS[tier];
  const reachedLimit = count >= limit;
  const shouldShowSoftPrompt = count >= (limit - 1) && count < limit; // 1 mensagem antes do limite

  /**
   * Incrementa contador de voice messages
   * Persiste em localStorage com data do dia
   */
  const incrementCount = useCallback(() => {
    if (tier === 'premium' || tier === 'vip') return; // Premium não tem limites

    setCount((prev) => {
      const next = prev + 1;
      const today = new Date().toISOString().split('T')[0];

      localStorage.setItem(storageKey, JSON.stringify({
        date: today,
        count: next,
      }));

      // Track quando bater limite
      if (next >= limit) {
        mixpanel.track('Voice Limit Hit', {
          tier,
          limit,
          count: next,
          user_id: user?.id,
          timestamp: new Date().toISOString(),
        });
      }

      // Track soft prompt (1 antes do limite)
      if (next === limit - 1) {
        mixpanel.track('Voice Limit Almost Hit', {
          tier,
          limit,
          count: next,
          remaining: 1,
          user_id: user?.id,
        });
      }

      return next;
    });
  }, [tier, limit, storageKey, user?.id]);

  /**
   * Reseta contador (útil para testes)
   */
  const resetCount = useCallback(() => {
    setCount(0);
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  /**
   * Calcula dias desde signup (para analytics)
   */
  const getDaysSinceSignup = useCallback((): number => {
    if (!user?.created_at) return 0;
    const created = new Date(user.created_at);
    const now = new Date();
    return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  }, [user?.created_at]);

  return {
    /** Contador atual de voice messages hoje */
    count,

    /** Limite diário para o tier atual */
    limit,

    /** Se atingiu o limite */
    reachedLimit,

    /** Se deve mostrar soft prompt (1 mensagem restante) */
    shouldShowSoftPrompt,

    /** Mensagens restantes */
    remaining: Math.max(0, limit - count),

    /** Incrementa contador */
    incrementCount,

    /** Reseta contador (útil para testes) */
    resetCount,

    /** Tier atual do usuário */
    tier,

    /** Dias desde signup */
    daysSinceSignup: getDaysSinceSignup(),
  };
}
