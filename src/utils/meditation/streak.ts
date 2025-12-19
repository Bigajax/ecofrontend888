/**
 * Meditation Streak Tracking System
 *
 * Tracks consecutive days of meditation completion via localStorage.
 * Increments streak for consecutive days, resets if gap > 1 day.
 */

const STORAGE_KEY = 'eco.meditation.streak';

export interface MeditationStreak {
  currentStreak: number;       // Dias consecutivos atuais
  lastCompletionDate: string;  // ISO date "2024-12-19"
  longestStreak: number;       // Recorde pessoal (futuro)
}

const DEFAULT_STREAK: MeditationStreak = {
  currentStreak: 0,
  lastCompletionDate: '',
  longestStreak: 0,
};

/**
 * Gets current meditation streak from localStorage
 */
export function getMeditationStreak(): MeditationStreak {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { ...DEFAULT_STREAK };

    const parsed = JSON.parse(stored);
    return {
      currentStreak: parsed.currentStreak || 0,
      lastCompletionDate: parsed.lastCompletionDate || '',
      longestStreak: parsed.longestStreak || 0,
    };
  } catch (error) {
    console.error('[Streak] Error reading streak:', error);
    return { ...DEFAULT_STREAK };
  }
}

/**
 * Calculates difference in days between two ISO date strings
 * Returns positive number of days (always > 0)
 */
function getDaysDifference(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffMs = Math.abs(d2.getTime() - d1.getTime());
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Gets today's date in ISO format (YYYY-MM-DD)
 */
function getTodayISO(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Updates meditation streak based on completion today
 * Logic:
 * - If already completed today: no change
 * - If completed yesterday: increment streak
 * - If gap > 1 day: reset to 1
 *
 * @returns Updated current streak number
 */
export function updateMeditationStreak(): number {
  try {
    const currentStreak = getMeditationStreak();
    const today = getTodayISO();

    // Already completed today - no change
    if (currentStreak.lastCompletionDate === today) {
      return currentStreak.currentStreak;
    }

    let newStreak = 1; // Default: reset to 1

    if (currentStreak.lastCompletionDate) {
      const daysSinceLastCompletion = getDaysDifference(
        currentStreak.lastCompletionDate,
        today
      );

      // Completed yesterday - increment streak
      if (daysSinceLastCompletion === 1) {
        newStreak = currentStreak.currentStreak + 1;
      }
      // Gap > 1 day - reset to 1 (already set above)
    }

    const updatedStreak: MeditationStreak = {
      currentStreak: newStreak,
      lastCompletionDate: today,
      longestStreak: Math.max(newStreak, currentStreak.longestStreak),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedStreak));

    return newStreak;
  } catch (error) {
    console.error('[Streak] Error updating streak:', error);
    return 1; // Fallback to 1 on error
  }
}

/**
 * Resets meditation streak to zero
 * Used for testing or manual reset
 */
export function resetMeditationStreak(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_STREAK));
  } catch (error) {
    console.error('[Streak] Error resetting streak:', error);
  }
}
