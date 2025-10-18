import { createContext, useContext } from 'react';
import type { Memoria } from '../../api/memoriaApi';
import type { RelatorioEmocional } from '../../api/relatorioEmocionalApi';

export type ApiErrorDetails = {
  endpoint: string;
  status?: number;
  statusText?: string;
  message?: string;
};

export type MemoryData = {
  memories: Memoria[];
  perfil: any | null;
  relatorio: RelatorioEmocional | null;
  memoriesLoading: boolean;
  perfilLoading: boolean;
  relatorioLoading: boolean;
  memoriesError: string | null;
  perfilError: string | null;
  relatorioError: string | null;
  memoriesErrorDetails: ApiErrorDetails | null;
  perfilErrorDetails: ApiErrorDetails | null;
  relatorioErrorDetails: ApiErrorDetails | null;
};

const defaultValue: MemoryData = {
  memories: [],
  perfil: null,
  relatorio: null,
  memoriesLoading: true,
  perfilLoading: true,
  relatorioLoading: true,
  memoriesError: null,
  perfilError: null,
  relatorioError: null,
  memoriesErrorDetails: null,
  perfilErrorDetails: null,
  relatorioErrorDetails: null,
};

export const MemoryDataContext = createContext<MemoryData>(defaultValue);
export const useMemoryData = () => useContext(MemoryDataContext);
