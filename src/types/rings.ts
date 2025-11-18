/**
 * Types for Five Rings of Discipline (Cinco Anéis da Disciplina)
 * Based on Miyamoto Musashi's philosophy
 */

/**
 * The five rings representing different aspects of discipline
 */
export type RingType = 'earth' | 'water' | 'fire' | 'wind' | 'void';

export interface Ring {
  id: RingType;
  nameKey: string; // e.g., 'earth', 'water'
  titlePt: string; // e.g., "Anel da Terra"
  subtitlePt: string; // e.g., "ver a verdade"
  descriptionPt: string;
  impactPhrase: string; // e.g., "A maioria pensa que está ocupada, mas está apenas distraída"
  question: string; // Daily question
  icon: string; // Emoji or icon identifier
  color: string; // Tailwind color class base
  order: number;
}

/**
 * Response metadata for Earth Ring (Distraction tracking)
 */
export interface EarthRingResponse {
  distraction?: string;
  focusReason?: string; // What took the focus away
  focusReasons?: ('redes_sociais' | 'sono' | 'ansiedade' | 'interrupcoes' | 'outro')[];
  focusScore?: number; // 0-10 slider
  customReason?: string;
}

/**
 * Response metadata for Water Ring (Daily adjustments)
 */
export interface WaterRingResponse {
  adjustment?: string;
  adjustmentType?: ('sono' | 'ambiente' | 'rotina' | 'corpo' | 'relacoes' | 'outro')[];
  customType?: string;
}

/**
 * Response metadata for Fire Ring (Emotion transformation)
 */
export interface FireRingResponse {
  emotion?: string;
  emotionType?: ('raiva' | 'frustracao' | 'ansiedade' | 'culpa' | 'tristeza' | 'outro')[];
  emotionIntensity?: number; // 0-10 scale
  actionFromEmotion?: string;
}

/**
 * Response metadata for Wind Ring (Learning)
 */
export interface WindRingResponse {
  learning?: string;
  learningSource?: ('erro_proprio' | 'outra_pessoa' | 'conteudo' | 'trabalho_estudo' | 'outro')[];
  customSource?: string;
}

/**
 * Response metadata for Void Ring (Identity)
 */
export interface VoidRingResponse {
  identity?: string;
  identityKeyword?: (
    | 'mais_disciplinado'
    | 'mais_calmo'
    | 'mais_presente'
    | 'mais_forte'
    | 'menos_impulsivo'
    | 'outro'
  )[];
  customKeyword?: string;
}

/**
 * Union type for all ring response metadata
 */
export type RingResponse =
  | EarthRingResponse
  | WaterRingResponse
  | FireRingResponse
  | WindRingResponse
  | VoidRingResponse;

/**
 * Individual answer to a ring's daily question
 */
export interface RingAnswer {
  ringId: RingType;
  answer: string; // Main text answer
  metadata: RingResponse; // Structured metadata specific to this ring
  timestamp: string; // ISO timestamp
}

/**
 * Complete daily ritual response (all 5 rings answered)
 */
export interface DailyRitual {
  id: string;
  userId: string;
  date: string; // ISO date (YYYY-MM-DD)
  answers: RingAnswer[];
  completedAt: string; // ISO timestamp
  updatedAt?: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  notes?: string; // Optional user notes
}

/**
 * Aggregated statistics for a single ring
 */
export interface RingStatistics {
  ringId: RingType;
  totalResponses: number;
  lastResponse?: string;
  streakDays: number;
  averageScore?: number; // For rings with scores (Earth focus, Fire intensity)
  topThemes?: Array<{
    theme: string;
    count: number;
    percentage: number;
  }>;
  complianceRate?: number; // % of days ritual was completed
}

/**
 * Overall progress across all rings
 */
export interface RingsProgress {
  userId: string;
  totalDaysCompleted: number;
  totalDaysTracked: number;
  currentStreak: number;
  longestStreak: number;
  complianceRate: number; // overall percentage
  ringStats: Record<RingType, RingStatistics>;
  lastRitualDate?: string;
  nextRitualDate?: string;
}

/**
 * Onboarding state tracking
 */
export interface OnboardingState {
  userId: string;
  hasSeenOnboarding: boolean;
  onboardingCompletedAt?: string;
  dismissedAt?: string;
}

/**
 * Context value type
 */
export interface RingsContextType {
  // Onboarding
  showOnboarding: boolean;
  dismissOnboarding: () => void;
  completeOnboarding: () => void;

  // Daily ritual
  currentRitual: DailyRitual | null;
  startRitual: () => void;
  saveRingAnswer: (ringId: RingType, answer: string, metadata: RingResponse) => void;
  completeRitual: () => Promise<void>;
  getRitualForDate: (date: string) => DailyRitual | undefined;

  // Timeline/History
  allRituals: DailyRitual[];
  getRitualsForDateRange: (startDate: string, endDate: string) => DailyRitual[];

  // Progress/Statistics
  progress: RingsProgress | null;
  loadProgress: () => Promise<void>;

  // Loading states
  loading: boolean;
  error: string | null;
}
