/**
 * useMeditationStreak Hook
 *
 * React hook for managing meditation streak state.
 * Provides current streak and update function.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getMeditationStreak,
  updateMeditationStreak as updateStreakUtil,
  resetMeditationStreak as resetStreakUtil,
} from '@/utils/meditation/streak';

export function useMeditationStreak() {
  const [currentStreak, setCurrentStreak] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial streak on mount
  useEffect(() => {
    const streak = getMeditationStreak();
    setCurrentStreak(streak.currentStreak);
    setIsLoading(false);
  }, []);

  // Update streak function
  const updateStreak = useCallback(() => {
    const newStreak = updateStreakUtil();
    setCurrentStreak(newStreak);
    return newStreak;
  }, []);

  // Reset streak function
  const resetStreak = useCallback(() => {
    resetStreakUtil();
    setCurrentStreak(0);
  }, []);

  return {
    currentStreak,
    isLoading,
    updateStreak,
    resetStreak,
  };
}
