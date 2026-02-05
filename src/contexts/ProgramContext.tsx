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
    const newProgram: OngoingProgram = {
      ...program,
      startedAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
    };

    // Optimistic update (local first)
    setOngoingProgram(newProgram);

    // Sync with backend if authenticated
    if (user) {
      try {
        setSyncing(true);
        const response = await programsApi.startProgram({
          programId: program.id,
          title: program.title,
          description: program.description,
          duration: program.duration,
        });

        // Update with enrollmentId from backend
        const syncedProgram = {
          ...newProgram,
          enrollmentId: response.enrollmentId,
        };
        setOngoingProgram(syncedProgram);
      } catch (error) {
        console.error('Erro ao sincronizar programa com backend:', error);
        // Continue with localStorage-only mode
      } finally {
        setSyncing(false);
      }
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
    // Complete in backend first if possible
    if (user && ongoingProgram?.enrollmentId) {
      try {
        await programsApi.completeProgram(ongoingProgram.enrollmentId);
      } catch (error) {
        console.error('Erro ao completar programa no backend:', error);
      }
    }

    // Clear local state
    setOngoingProgram(null);
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
