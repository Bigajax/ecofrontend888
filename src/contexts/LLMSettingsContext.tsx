import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export interface LLMSettingsContextValue {
  autonomy: number;
  setAutonomy: (value: number) => void;
}

const DEFAULT_AUTONOMY = 0.5;
const STORAGE_KEY = 'eco.llm.autonomy';

const clampAutonomy = (value: number): number => {
  if (!Number.isFinite(value)) return DEFAULT_AUTONOMY;
  return Math.min(Math.max(value, 0), 1);
};

const readStoredAutonomy = (): number => {
  if (typeof window === 'undefined') return DEFAULT_AUTONOMY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_AUTONOMY;
    const parsed = Number.parseFloat(raw);
    if (!Number.isFinite(parsed)) return DEFAULT_AUTONOMY;
    return clampAutonomy(parsed);
  } catch {
    return DEFAULT_AUTONOMY;
  }
};

const LLMSettingsContext = createContext<LLMSettingsContextValue | undefined>(undefined);

export const LLMSettingsProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [autonomy, setAutonomyState] = useState<number>(() => readStoredAutonomy());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, autonomy.toString());
    } catch {}
  }, [autonomy]);

  const setAutonomy = useCallback((value: number) => {
    setAutonomyState((prev) => {
      const next = clampAutonomy(value);
      if (Object.is(prev, next)) return prev;
      return next;
    });
  }, []);

  const contextValue = useMemo<LLMSettingsContextValue>(
    () => ({ autonomy, setAutonomy }),
    [autonomy, setAutonomy],
  );

  return (
    <LLMSettingsContext.Provider value={contextValue}>{children}</LLMSettingsContext.Provider>
  );
};

export const useLLMSettings = (): LLMSettingsContextValue => {
  const ctx = useContext(LLMSettingsContext);
  if (!ctx) throw new Error('useLLMSettings must be used within a LLMSettingsProvider');
  return ctx;
};
