import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface OngoingProgram {
  id: string;
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
  startProgram: (program: OngoingProgram) => void;
  updateProgress: (progress: number, currentLesson: string) => void;
  completeProgram: () => void;
  resumeProgram: () => void;
}

const ProgramContext = createContext<ProgramContextType | undefined>(undefined);

export function ProgramProvider({ children }: { children: ReactNode }) {
  const [ongoingProgram, setOngoingProgram] = useState<OngoingProgram | null>(null);

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

  const startProgram = (program: OngoingProgram) => {
    const newProgram: OngoingProgram = {
      ...program,
      startedAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
    };
    setOngoingProgram(newProgram);
  };

  const updateProgress = (progress: number, currentLesson: string) => {
    if (ongoingProgram) {
      setOngoingProgram({
        ...ongoingProgram,
        progress: Math.min(100, Math.max(0, progress)),
        currentLesson,
        lastAccessedAt: new Date().toISOString(),
      });
    }
  };

  const completeProgram = () => {
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
