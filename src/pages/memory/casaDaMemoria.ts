import { createContext, useContext } from 'react';
import type { Memoria, Retrato } from '@/api/emocional';

/** O que o MemoryLayout entrega aos cômodos (Memórias, Perfil emocional, Relatórios). */
export interface CasaDaMemoria {
  memorias: Memoria[];
  totalGuardadas: number;
  janela: { dias: number; max: number } | null;
  retrato: Retrato | null;
  carregando: boolean;
  erro: string | null;
  recarregar: () => void;
}

export const CasaDaMemoriaContexto = createContext<CasaDaMemoria | null>(null);

export function useCasaDaMemoria(): CasaDaMemoria {
  const ctx = useContext(CasaDaMemoriaContexto);
  if (!ctx) throw new Error('useCasaDaMemoria fora do MemoryLayout');
  return ctx;
}
