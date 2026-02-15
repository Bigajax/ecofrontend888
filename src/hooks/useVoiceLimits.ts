import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useIsPremium } from '@/hooks/usePremiumContent';
import { trackFreeTierLimitHit } from '@/lib/mixpanelConversionEvents';

const DAILY_VOICE_LIMIT = 5;

interface DailyVoiceData {
  date: string; // YYYY-MM-DD
  count: number;
}

export function useVoiceLimits() {
  const { user } = useAuth();
  const isPremium = useIsPremium();

  const storageKey = `eco.freeUser.dailyVoice.v1.${user?.id || 'unknown'}`;

  const [count, setCount] = useState<number>(() => {
    if (!user || isPremium) return 0;

    const stored = localStorage.getItem(storageKey);
    if (!stored) return 0;

    try {
      const data: DailyVoiceData = JSON.parse(stored);
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      // Reset se for novo dia
      if (data.date !== today) {
        localStorage.removeItem(storageKey);
        return 0;
      }

      return data.count || 0;
    } catch (error) {
      console.error('Error reading daily voice count:', error);
      return 0;
    }
  });

  const limit = DAILY_VOICE_LIMIT;
  const reachedLimit = count >= limit;

  const incrementCount = useCallback(() => {
    if (isPremium) return; // Premium users não têm limites

    setCount((prev) => {
      const next = prev + 1;
      const today = new Date().toISOString().split('T')[0];

      const data: DailyVoiceData = {
        date: today,
        count: next,
      };

      localStorage.setItem(storageKey, JSON.stringify(data));

      // Track quando bater limite
      if (next >= limit) {
        trackFreeTierLimitHit({
          limit_type: 'voice_daily',
          current_count: next,
          limit_value: limit,
          days_since_signup: getDaysSinceSignup(user),
          user_id: user?.id,
        });
      }

      return next;
    });
  }, [isPremium, user, limit, storageKey]);

  // Reset count at midnight
  useEffect(() => {
    if (isPremium || !user) return;

    const checkMidnight = () => {
      const stored = localStorage.getItem(storageKey);
      if (!stored) return;

      try {
        const data: DailyVoiceData = JSON.parse(stored);
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
  }, [isPremium, user, storageKey]);

  return {
    count,
    limit,
    reachedLimit,
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
