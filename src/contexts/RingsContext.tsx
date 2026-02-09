import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import * as ringsApi from '@/api/ringsApi';
import type {
  DailyRitual,
  OnboardingState,
  RingAnswer,
  RingResponse,
  RingType,
  RingsContextType,
  RingsProgress,
} from '@/types/rings';

/**
 * Storage keys with version namespace
 */
const RINGS_NS = 'eco.rings.v1';
const keyForOnboarding = (uid?: string | null) =>
  uid ? `${RINGS_NS}.onboarding.${uid}` : `${RINGS_NS}.onboarding.anon`;
const keyForRituals = (uid?: string | null) => (uid ? `${RINGS_NS}.rituals.${uid}` : `${RINGS_NS}.rituals.anon`);
const keyForProgress = (uid?: string | null) => (uid ? `${RINGS_NS}.progress.${uid}` : `${RINGS_NS}.progress.anon`);

/**
 * Generate UUID v4
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDate(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

/**
 * Load onboarding state from localStorage
 */
function loadOnboardingState(userId?: string | null): OnboardingState {
  try {
    const key = keyForOnboarding(userId);
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('[RingsContext] Error loading onboarding state:', error);
  }

  return {
    userId: userId || 'anonymous',
    hasSeenOnboarding: false,
  };
}

/**
 * Save onboarding state to localStorage
 */
function saveOnboardingState(state: OnboardingState, userId?: string | null): void {
  try {
    const key = keyForOnboarding(userId);
    localStorage.setItem(key, JSON.stringify(state));
  } catch (error) {
    console.error('[RingsContext] Error saving onboarding state:', error);
  }
}

/**
 * Load all rituals from localStorage
 */
function loadRituals(userId?: string | null): DailyRitual[] {
  try {
    const key = keyForRituals(userId);
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('[RingsContext] Error loading rituals:', error);
  }
  return [];
}

/**
 * Save rituals to localStorage
 */
function saveRituals(rituals: DailyRitual[], userId?: string | null): void {
  try {
    const key = keyForRituals(userId);
    localStorage.setItem(key, JSON.stringify(rituals));
  } catch (error) {
    console.error('[RingsContext] Error saving rituals:', error);
  }
}

/**
 * Initialize progress from rituals
 */
function calculateProgress(rituals: DailyRitual[], userId?: string | null): RingsProgress {
  const completed = rituals.filter((r) => r.status === 'completed');
  const uniqueDates = new Set(completed.map((r) => r.date));

  // Calculate streak
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  const sorted = Array.from(uniqueDates).sort().reverse();
  const today = getTodayDate();

  for (let i = 0; i < sorted.length; i++) {
    const date = sorted[i];
    const prevDate = sorted[i + 1];

    const dateObj = new Date(date);
    const prevDateObj = prevDate ? new Date(prevDate) : null;

    const diffDays = prevDateObj
      ? Math.floor((dateObj.getTime() - prevDateObj.getTime()) / (1000 * 60 * 60 * 24))
      : -1;

    if (i === 0) {
      // Check if today or yesterday
      const todayObj = new Date(today);
      const days = Math.floor((todayObj.getTime() - dateObj.getTime()) / (1000 * 60 * 60 * 24));
      if (days <= 1) {
        tempStreak = 1;
      } else {
        break;
      }
    } else if (diffDays === 1) {
      tempStreak++;
    } else {
      break;
    }
  }

  currentStreak = tempStreak;
  longestStreak = Math.max(currentStreak, tempStreak);

  // Ring stats (simplified for now)
  const ringStats = {
    earth: { ringId: 'earth' as const, totalResponses: 0, streakDays: 0 },
    water: { ringId: 'water' as const, totalResponses: 0, streakDays: 0 },
    fire: { ringId: 'fire' as const, totalResponses: 0, streakDays: 0 },
    wind: { ringId: 'wind' as const, totalResponses: 0, streakDays: 0 },
    void: { ringId: 'void' as const, totalResponses: 0, streakDays: 0 },
  };

  completed.forEach((ritual) => {
    ritual.answers.forEach((answer) => {
      ringStats[answer.ringId].totalResponses++;
    });
  });

  return {
    userId: userId || 'anonymous',
    totalDaysCompleted: completed.length,
    totalDaysTracked: rituals.length,
    currentStreak,
    longestStreak,
    complianceRate: rituals.length > 0 ? (completed.length / rituals.length) * 100 : 0,
    ringStats: ringStats as any,
    lastRitualDate: sorted[0],
    nextRitualDate: getTodayDate(),
  };
}

const RingsContext = createContext<RingsContextType | undefined>(undefined);

export function RingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;

  // State
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentRitual, setCurrentRitual] = useState<DailyRitual | null>(null);
  const [allRituals, setAllRituals] = useState<DailyRitual[]>([]);
  const [progress, setProgress] = useState<RingsProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize on mount (with backend integration)
  useEffect(() => {
    async function initialize() {
      try {
        setLoading(true);

        // Load onboarding state
        const onboardingState = loadOnboardingState(userId);
        setShowOnboarding(!onboardingState.hasSeenOnboarding);

        let rituals: DailyRitual[] = [];

        // Try to load from backend first (if authenticated)
        if (user) {
          try {
            const response = await ringsApi.getRitualHistory({ limit: 100, includeAnswers: true });
            rituals = response.rituals || [];
            console.log('[RingsContext] Loaded rituals from backend:', rituals.length);

            // Cache in localStorage
            saveRituals(rituals, userId);
          } catch (error) {
            console.error('[RingsContext] Failed to load from backend, using localStorage:', error);
            // Fallback to localStorage
            rituals = loadRituals(userId);
          }
        } else {
          // Guest: use localStorage only
          rituals = loadRituals(userId);
        }

        setAllRituals(rituals);

        // Load or create today's ritual
        const today = getTodayDate();
        let todayRitual = rituals.find((r) => r.date === today);
        if (!todayRitual) {
          todayRitual = {
            id: generateUUID(),
            userId: userId || 'anonymous',
            date: today,
            answers: [],
            status: 'in_progress',
            completedAt: new Date().toISOString(),
          };
        }
        setCurrentRitual(todayRitual);

        // Calculate progress
        const newProgress = calculateProgress(rituals, userId);
        setProgress(newProgress);

        setLoading(false);
      } catch (err) {
        console.error('[RingsContext] Initialization error:', err);
        setError(String(err));
        setLoading(false);
      }
    }

    initialize();
  }, [userId, user]);

  // Dismiss onboarding
  const dismissOnboarding = useCallback(() => {
    const state = loadOnboardingState(userId);
    state.dismissedAt = new Date().toISOString();
    saveOnboardingState(state, userId);
    setShowOnboarding(false);
  }, [userId]);

  // Complete onboarding
  const completeOnboarding = useCallback(() => {
    const state = loadOnboardingState(userId);
    state.hasSeenOnboarding = true;
    state.onboardingCompletedAt = new Date().toISOString();
    saveOnboardingState(state, userId);
    setShowOnboarding(false);
  }, [userId]);

  // Start a new ritual (create if doesn't exist)
  const startRitual = useCallback(() => {
    const today = getTodayDate();
    let ritual = currentRitual;

    if (!ritual || ritual.date !== today) {
      ritual = {
        id: generateUUID(),
        userId: userId || 'anonymous',
        date: today,
        answers: [],
        status: 'in_progress',
        completedAt: new Date().toISOString(),
      };
    }

    setCurrentRitual(ritual);
  }, [userId, currentRitual]);

  // Save a ring answer (with backend integration)
  const saveRingAnswer = useCallback(
    async (ringId: RingType, answer: string, metadata: RingResponse) => {
      if (!currentRitual) {
        console.warn('[RingsContext] No current ritual');
        return;
      }

      // Optimistic update (update UI immediately)
      const ritual = { ...currentRitual };
      const existingIndex = ritual.answers.findIndex((a) => a.ringId === ringId);

      const newAnswer: RingAnswer = {
        ringId,
        answer,
        metadata,
        timestamp: new Date().toISOString(),
      };

      if (existingIndex >= 0) {
        ritual.answers[existingIndex] = newAnswer;
      } else {
        ritual.answers.push(newAnswer);
      }

      setCurrentRitual(ritual);

      // Background API call (only for authenticated users)
      if (user) {
        try {
          await ringsApi.saveRingAnswer(currentRitual.id, { ringId, answer, metadata });
          console.log('[RingsContext] Answer saved to backend:', ringId);
        } catch (error) {
          console.error('[RingsContext] Failed to save answer to backend:', error);
          // Note: Optimistic update is already applied, so UI stays consistent
          // Could implement retry queue here if needed
        }
      }
    },
    [currentRitual, user]
  );

  // Complete ritual (with backend integration)
  const completeRitual = useCallback(async () => {
    if (!currentRitual) {
      throw new Error('No current ritual');
    }

    // All 5 rings must be answered
    if (currentRitual.answers.length !== 5) {
      throw new Error('All 5 rings must be answered');
    }

    const completed = {
      ...currentRitual,
      status: 'completed' as const,
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Update rituals list (optimistic)
    const updated = [...allRituals];
    const existingIndex = updated.findIndex((r) => r.date === completed.date);
    if (existingIndex >= 0) {
      updated[existingIndex] = completed;
    } else {
      updated.push(completed);
    }

    setAllRituals(updated);
    setCurrentRitual(null);
    saveRituals(updated, userId);

    // Recalculate progress (optimistic)
    const newProgress = calculateProgress(updated, userId);
    setProgress(newProgress);

    // Backend call (only for authenticated users)
    if (user) {
      try {
        const response = await ringsApi.completeRitual(completed.id);
        console.log('[RingsContext] Ritual completed on backend:', response);

        // Update progress with backend streak data
        if (response.streak) {
          setProgress((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              currentStreak: response.streak.current,
              longestStreak: response.streak.longest,
            };
          });
        }
      } catch (error) {
        console.error('[RingsContext] Failed to complete ritual on backend:', error);
        // Optimistic update already applied, ritual is marked complete locally
      }
    }
  }, [currentRitual, allRituals, userId, user]);

  // Get ritual for specific date
  const getRitualForDate = useCallback(
    (date: string): DailyRitual | undefined => {
      return allRituals.find((r) => r.date === date);
    },
    [allRituals]
  );

  // Get rituals for date range
  const getRitualsForDateRange = useCallback(
    (startDate: string, endDate: string): DailyRitual[] => {
      return allRituals.filter((r) => r.date >= startDate && r.date <= endDate);
    },
    [allRituals]
  );

  // Load progress
  const loadProgress = useCallback(async () => {
    try {
      setLoading(true);
      const newProgress = calculateProgress(allRituals, userId);
      setProgress(newProgress);
    } catch (err) {
      console.error('[RingsContext] Error loading progress:', err);
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [allRituals, userId]);

  const value: RingsContextType = {
    showOnboarding,
    dismissOnboarding,
    completeOnboarding,
    currentRitual,
    startRitual,
    saveRingAnswer,
    completeRitual,
    getRitualForDate,
    allRituals,
    getRitualsForDateRange,
    progress,
    loadProgress,
    loading,
    error,
  };

  return <RingsContext.Provider value={value}>{children}</RingsContext.Provider>;
}

/**
 * Hook to use the Rings context
 */
export function useRings(): RingsContextType {
  const context = useContext(RingsContext);
  if (!context) {
    throw new Error('useRings must be used within RingsProvider');
  }
  return context;
}
