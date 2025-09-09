import React, { createContext, useContext } from 'react';
import type { Memoria } from '../../api/memoriaApi';
import type { RelatorioEmocional } from '../../api/relatorioEmocionalApi';

export type MemoryData = {
  memories: Memoria[];
  perfil: any | null;
  relatorio: RelatorioEmocional | null;
  loading: boolean;
  error: string | null;
};

const defaultValue: MemoryData = {
  memories: [],
  perfil: null,
  relatorio: null,
  loading: true,
  error: null,
};

export const MemoryDataContext = createContext<MemoryData>(defaultValue);
export const useMemoryData = () => useContext(MemoryDataContext);
