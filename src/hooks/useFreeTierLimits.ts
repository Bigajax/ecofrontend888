import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscriptionTier, useFeatureAccess } from '@/hooks/usePremiumContent';
import { trackFreeTierLimitHit } from '@/lib/mixpanelConversionEvents';

// Limites por tier
const TIER_LIMITS = {
  free: 10, // 10 mensagens/dia (5 turnos)
  essentials: 100,
  premium: Infinity,
  vip: Infinity,
} as const;

// Soft prompt thresholds (80% do limite)
const SOFT_PROMPT_THRESHOLDS = {
  free: 8, // 80% de 10
  essentials: 80, // 80% de 100
  premium: Infinity,
  vip: Infinity,
} as const;

interface DailyMessageData {
  date: string; // YYYY-MM-DD
  count: number;
}

export function useFreeTierLimits() {
  const { user } = useAuth();
  const tier = useSubscriptionTier();

  const storageKey = `eco.freeUser.dailyMessages.v1.${user?.id || 'unknown'}`;

  const [count, setCount] = useState<number>(() => {
    if (!user || tier === 'premium' || tier === 'vip') return 0;

    const stored = localStorage.getItem(storageKey);
    if (!stored) return 0;

    try {
      const data: DailyMessageData = JSON.parse(stored);
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      // Reset se for novo dia
      if (data.date !== today) {
        localStorage.removeItem(storageKey);
        return 0;
      }

      return data.count || 0;
    } catch (error) {
      console.error('Error reading daily message count:', error);
      return 0;
    }
  });

  const limit = TIER_LIMITS[tier];
  const softPromptThreshold = SOFT_PROMPT_THRESHOLDS[tier];
  const reachedLimit = count >= limit;
  const shouldShowSoftPrompt = count >= softPromptThreshold && count < limit;

  const incrementCount = useCallback(() => {
    if (tier === 'premium' || tier === 'vip') return; // Premium/VIP users não têm limites

    setCount((prev) => {
      const next = prev + 1;
      const today = new Date().toISOString().split('T')[0];

      const data: DailyMessageData = {
        date: today,
        count: next,
      };

      localStorage.setItem(storageKey, JSON.stringify(data));

      // Track quando bater limite
      if (next >= limit) {
        trackFreeTierLimitHit({
          limit_type: 'daily_messages',
          current_count: next,
          limit_value: limit,
          days_since_signup: getDaysSinceSignup(user),
          user_id: user?.id,
          tier, // Adicionar tier para analytics
        });
      }

      return next;
    });
  }, [tier, user, limit, storageKey]);

  // Reset count at midnight
  useEffect(() => {
    if (tier === 'premium' || tier === 'vip' || !user) return;

    const checkMidnight = () => {
      const stored = localStorage.getItem(storageKey);
      if (!stored) return;

      try {
        const data: DailyMessageData = JSON.parse(stored);
        const today = new Date().toISOString().split('T')[0];

        if (data.date !== today) {
          setCount(0);
          localStorage.removeItem(storageKey);
        }
      } catch (error) {
        console.error('Error checking midnight reset:', error);
      }
    };

    // Check every minute
    const interval = setInterval(checkMidnight, 60 * 1000);

    return () => clearInterval(interval);
  }, [tier, user, storageKey]);

  return {
    count,
    limit,
    reachedLimit,
    shouldShowSoftPrompt,
    incrementCount,
    remaining: Math.max(0, limit - count),
  };
}

function getDaysSinceSignup(user: any): number {
  if (!user?.created_at) return 0;
  const created = new Date(user.created_at);
  const now = new Date();
  return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
}
