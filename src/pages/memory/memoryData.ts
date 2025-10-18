import { createContext, useContext } from 'react';
import type { Memoria } from '../../api/memoriaApi';
import type { RelatorioEmocional } from '../../api/relatorioEmocionalApi';

export type EndpointFailureReason =
  | 'cors'
  | 'redirect_cross_origin'
  | 'network'
  | 'timeout'
  | '5xx'
  | 'unknown';

export type ApiErrorDetails = {
  endpoint: string;
  status?: number;
  statusText?: string;
  message?: string;
  origin?: string;
  url?: string;
  reason?: EndpointFailureReason;
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
  refetchMemories: () => void;
  refetchPerfil: () => void;
  refetchRelatorio: () => void;
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
  refetchMemories: () => {},
  refetchPerfil: () => {},
  refetchRelatorio: () => {},
};

export const MemoryDataContext = createContext<MemoryData>(defaultValue);
export const useMemoryData = () => useContext(MemoryDataContext);
