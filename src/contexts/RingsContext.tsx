import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import * as ringsApi from '@/api/ringsApi';
import { getTodayDate, diasEntre } from '@/utils/dataLocal';
import { registrarPratica } from '@/utils/caminhoReino';
import type {
  JornadaMeta,
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
      const lista = JSON.parse(stored);
      return Array.isArray(lista) ? lista.map(comRespostas) : [];
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
 * Todo ritual com lista de respostas. O histórico do backend antigo vinha em
 * snake_case, sem "answers"; guardado no aparelho, quebrava o progresso.
 */
function comRespostas(r: DailyRitual): DailyRitual {
  return Array.isArray(r?.answers) ? r : { ...r, answers: [] };
}

/** Une rituais do backend e do aparelho por data; um concluído vence um em andamento. */
function juntarRituais(doBackend: DailyRitual[], doAparelho: DailyRitual[]): DailyRitual[] {
  const porData = new Map<string, DailyRitual>();
  for (const r of [...doBackend, ...doAparelho].map(comRespostas)) {
    const atual = porData.get(r.date);
    if (!atual || (atual.status !== 'completed' && r.status === 'completed')) porData.set(r.date, r);
  }
  return Array.from(porData.values());
}

/**
 * Initialize progress from rituals
 */
function calculateProgress(rituals: DailyRitual[], userId?: string | null): RingsProgress {
  const completed = rituals.filter((r) => r.status === 'completed');
  const uniqueDates = new Set(completed.map((r) => r.date));

  // Sequência atual (termina hoje ou ontem) e a maior de todas. Antes a
  // "maior" era sempre igual à atual.
  const sorted = Array.from(uniqueDates).sort().reverse();
  const today = getTodayDate();

  let currentStreak = 0;
  if (sorted.length > 0 && diasEntre(today, sorted[0]) <= 1) {
    currentStreak = 1;
    for (let i = 1; i < sorted.length && diasEntre(sorted[i - 1], sorted[i]) === 1; i++) currentStreak++;
  }

  let longestStreak = 0;
  let corrida = 0;
  for (let i = 0; i < sorted.length; i++) {
    corrida = i > 0 && diasEntre(sorted[i - 1], sorted[i]) === 1 ? corrida + 1 : 1;
    longestStreak = Math.max(longestStreak, corrida);
  }

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
            const response = await ringsApi.historico(100);
            const doServidor = response.rituals || [];
            const doAparelho = [...loadRituals(userId), ...loadRituals(null)];
            // Junta em vez de substituir: um dia feito aqui que o servidor ainda
            // não tem não pode sumir do progresso.
            rituals = juntarRituais(doServidor, doAparelho);

            // O que só está no aparelho (dias antigos, dia feito como visitante)
            // sobe para o servidor, sem esperar e sem duplicar.
            const noServidor = new Set(doServidor.filter((r) => r.status === 'completed').map((r) => r.date));
            const soAqui = doAparelho.filter((r) => r.status === 'completed' && r.answers?.length && !noServidor.has(r.date));
            if (soAqui.length) {
              ringsApi.migrar(soAqui).catch((e) => console.warn('[RingsContext] migrar falhou:', e));
            }

            // Cache in localStorage
            saveRituals(rituals, userId);
          } catch (error) {
            console.error('[RingsContext] Failed to load from backend, using localStorage:', error);
            // Fallback to localStorage
            rituals = juntarRituais(loadRituals(userId), loadRituals(null));
            saveRituals(rituals, userId);
          }
          // O dia feito como visitante fica na chave "anon"; a migração do
          // cadastro procura pelo guestId e não achava. Já foi juntado acima.
          try {
            localStorage.removeItem(keyForRituals(null));
          } catch {
            // nada a limpar
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
      // Um dia novo (ou nenhum ritual carregado): começa em branco.
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
    },
    [currentRitual]
  );

  // Complete ritual (with backend integration)
  const completeRitual = useCallback(async (resposta?: { ringId: RingType; answer: string; metadata: RingResponse & JornadaMeta }) => {
    if (!currentRitual) {
      throw new Error('No current ritual');
    }

    // A resposta do dia entra junto: salvar e concluir no mesmo clique, sem
    // depender do estado já ter atualizado.
    let base = currentRitual;
    if (resposta) {
      const nova: RingAnswer = { ...resposta, timestamp: new Date().toISOString() };
      base = { ...currentRitual, answers: [...currentRitual.answers.filter((a) => a.ringId !== nova.ringId), nova] };
    }

    // Jornada de 30 dias: o dia fecha com a resposta do anel da vez (antes
    // eram obrigatórias as 5).
    if (base.answers.length === 0) {
      throw new Error('O dia precisa de pelo menos uma resposta');
    }

    const completed = {
      ...base,
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
    // O ritual de hoje continua existindo, agora concluído. Antes virava null, a
    // tela do ritual criava outro em branco na hora e o hub voltava a mostrar
    // "Começar o ritual de hoje" até recarregar.
    setCurrentRitual(completed);
    saveRituals(updated, userId);

    registrarPratica(userId, 'aneis');

    // Recalculate progress (optimistic)
    const newProgress = calculateProgress(updated, userId);
    setProgress(newProgress);

    // Servidor: o dia inteiro num POST (a resposta do dia fecha o dia).
    const doDia = resposta ?? completed.answers[completed.answers.length - 1];
    if (user && doDia) {
      ringsApi
        .salvarDia({ date: completed.date, ringId: doDia.ringId, answer: doDia.answer, metadata: doDia.metadata })
        .catch((e) => console.error('[RingsContext] salvarDia falhou (fica no aparelho e sobe depois):', e));
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
