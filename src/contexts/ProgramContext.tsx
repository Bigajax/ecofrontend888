import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import * as programsApi from '@/api/programsApi';

export interface OngoingProgram {
  id: string;
  enrollmentId?: string; // Backend enrollment ID
  title: string;
  description: string;
  currentLesson: string;
  progress: number; // 0-100
  duration: string;
  startedAt: string;
  lastAccessedAt: string;
}

interface ProgramContextType {
  ongoingProgram: OngoingProgram | null;
  startProgram: (program: OngoingProgram) => Promise<void>;
  updateProgress: (progress: number, currentLesson: string) => Promise<void>;
  completeProgram: () => Promise<void>;
  resumeProgram: () => void;
  syncing: boolean;
}

const ProgramContext = createContext<ProgramContextType | undefined>(undefined);

export function ProgramProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [ongoingProgram, setOngoingProgram] = useState<OngoingProgram | null>(null);
  const [syncing, setSyncing] = useState(false);

  // Load program from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('eco.ongoingProgram');
    if (saved) {
      try {
        setOngoingProgram(JSON.parse(saved));
      } catch (error) {
        console.error('Erro ao carregar programa:', error);
      }
    }
  }, []);

  // Save program to localStorage whenever it changes
  useEffect(() => {
    if (ongoingProgram) {
      localStorage.setItem('eco.ongoingProgram', JSON.stringify(ongoingProgram));
    } else {
      localStorage.removeItem('eco.ongoingProgram');
    }
  }, [ongoingProgram]);

  const startProgram = async (program: OngoingProgram) => {
    console.log('[ProgramContext] Starting program:', program);

    const newProgram: OngoingProgram = {
      ...program,
      startedAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
    };

    // Optimistic update (local first)
    setOngoingProgram(newProgram);
    console.log('[ProgramContext] Local state updated:', newProgram);

    // Sync with backend if authenticated
    if (user) {
      try {
        setSyncing(true);
        console.log('[ProgramContext] Syncing with backend...', {
          programId: program.id,
          title: program.title,
          userId: user.id
        });

        const response = await programsApi.startProgram({
          programId: program.id,
          title: program.title,
          description: program.description,
          duration: program.duration,
        });

        console.log('[ProgramContext] Backend response:', response);

        // Update with enrollmentId from backend
        const syncedProgram = {
          ...newProgram,
          enrollmentId: response.enrollmentId,
        };
        setOngoingProgram(syncedProgram);
        console.log('[ProgramContext] ✅ Program synced successfully! enrollmentId:', response.enrollmentId);
      } catch (error) {
        console.error('[ProgramContext] ❌ Erro ao sincronizar programa com backend:', error);
        // Continue with localStorage-only mode
      } finally {
        setSyncing(false);
      }
    } else {
      console.log('[ProgramContext] ⚠️  User not authenticated - localStorage only mode');
    }
  };

  const updateProgress = async (progress: number, currentLesson: string) => {
    if (!ongoingProgram) return;

    const updated = {
      ...ongoingProgram,
      progress: Math.min(100, Math.max(0, progress)),
      currentLesson,
      lastAccessedAt: new Date().toISOString(),
    };

    // Optimistic update
    setOngoingProgram(updated);

    // Sync with backend if authenticated and has enrollmentId
    if (user && ongoingProgram.enrollmentId) {
      try {
        const currentStep = Math.floor((progress / 100) * 6);
        await programsApi.updateProgress(ongoingProgram.enrollmentId, {
          progress,
          currentStep,
          currentLesson,
        });
      } catch (error) {
        console.error('Erro ao atualizar progresso no backend:', error);
        // Local state is already updated, continue
      }
    }
  };

  const completeProgram = async () => {
    console.log('[ProgramContext] Completing program:', {
      hasUser: !!user,
      enrollmentId: ongoingProgram?.enrollmentId,
      programId: ongoingProgram?.id
    });

    // Complete in backend first if possible
    if (user && ongoingProgram?.enrollmentId) {
      try {
        console.log('[ProgramContext] Marking as complete in backend:', ongoingProgram.enrollmentId);
        await programsApi.completeProgram(ongoingProgram.enrollmentId);
        console.log('[ProgramContext] ✅ Program completed in backend successfully!');
      } catch (error) {
        console.error('[ProgramContext] ❌ Erro ao completar programa no backend:', error);
      }
    } else {
      console.log('[ProgramContext] ⚠️  Cannot complete in backend - missing user or enrollmentId');
    }

    // Clear local state
    setOngoingProgram(null);
    console.log('[ProgramContext] Local state cleared');
  };

  const resumeProgram = () => {
    if (ongoingProgram) {
      setOngoingProgram({
        ...ongoingProgram,
        lastAccessedAt: new Date().toISOString(),
      });
    }
  };

  return (
    <ProgramContext.Provider
      value={{
        ongoingProgram,
        startProgram,
        updateProgress,
        completeProgram,
        resumeProgram,
        syncing,
      }}
    >
      {children}
    </ProgramContext.Provider>
  );
}

export function useProgram() {
  const context = useContext(ProgramContext);
  if (context === undefined) {
    throw new Error('useProgram deve ser usado dentro de ProgramProvider');
  }
  return context;
}
