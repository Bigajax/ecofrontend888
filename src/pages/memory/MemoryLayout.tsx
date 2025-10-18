import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import PhoneFrame from '../../components/PhoneFrame';
import { useAuth } from '../../contexts/AuthContext';
import { buscarMemoriasPorUsuario } from '../../api/memoriaApi';
import { buscarPerfilEmocional } from '../../api/perfilApi';
import { buscarRelatorioEmocional } from '../../api/relatorioEmocionalApi';
import {
  MemoryDataContext,
  type ApiErrorDetails,
  type MemoryData,
  type EndpointFailureReason,
} from './memoryData';
import { sortMemoriesByCreatedAtDesc } from './memoryCardDto';
import EcoBubbleLoading from '../../components/EcoBubbleLoading';
import { ApiFetchError } from '../../api/apiFetch';
import { track } from '../../analytics/track';

type EndpointKey = 'memories' | 'perfil' | 'relatorio';

type MemoryState = Omit<MemoryData, 'refetchMemories' | 'refetchPerfil' | 'refetchRelatorio'>;

const INITIAL_STATE: MemoryState = {
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

const FRIENDLY_MESSAGES: Record<EndpointKey, string> = {
  memories: 'Eco não conseguiu acessar suas lembranças agora. Respire e tente de novo.',
  perfil: 'Não conseguimos atualizar seu perfil emocional agora. Tente novamente em instantes.',
  relatorio: 'Seu relatório emocional está indisponível no momento. Que tal tentar daqui a pouco?',
};

const ENDPOINT_LABEL: Record<EndpointKey, string> = {
  memories: '/api/memorias',
  perfil: '/api/perfil-emocional',
  relatorio: '/api/relatorio-emocional',
};

const REASON_LABEL: Record<EndpointFailureReason, string> = {
  cors: 'motivo: CORS bloqueado',
  network: 'motivo: rede indisponível',
  timeout: 'motivo: timeout',
  '5xx': 'motivo: erro 5xx',
  unknown: 'motivo desconhecido',
};

type MemoryLike = { salvar_memoria?: unknown } & Record<string, unknown>;

const shouldKeepMemory = (memory: MemoryLike) => {
  const flag = memory?.salvar_memoria;
  if (flag === undefined || flag === null) return true;
  if (typeof flag === 'string') return flag === 'true' || flag === '1';
  if (typeof flag === 'number') return flag === 1;
  return Boolean(flag);
};

const extractServerMessage = (error: ApiFetchError) => {
  if (!error.bodyText) return undefined;
  try {
    const parsed = JSON.parse(error.bodyText);
    if (typeof parsed === 'string') return parsed;
    if (parsed && typeof parsed === 'object') {
      const candidates = [
        (parsed as { error?: unknown }).error,
        (parsed as { message?: unknown }).message,
        (parsed as { detail?: unknown }).detail,
        (parsed as { details?: unknown }).details,
      ];
      const first = candidates.find((value) => typeof value === 'string');
      if (typeof first === 'string') return first;
    }
  } catch {
    return error.bodyText;
  }
  return undefined;
};

const determineReason = (error: ApiFetchError): EndpointFailureReason | undefined => {
  if (error.kind === 'timeout') return 'timeout';
  if (error.kind === 'cors') return 'cors';
  if (error.kind === 'network') return 'network';
  if ((error.status ?? 0) >= 500) return '5xx';
  return undefined;
};

const parseErrorDetails = (error: unknown, endpoint: EndpointKey): ApiErrorDetails => {
  if (error instanceof ApiFetchError) {
    const message = extractServerMessage(error) ?? error.message;
    const reason = determineReason(error);
    return {
      endpoint: ENDPOINT_LABEL[endpoint],
      status: error.status,
      statusText: error.statusText,
      message,
      origin: error.origin,
      url: error.url,
      reason,
    };
  }

  const err = (error ?? {}) as {
    status?: number;
    statusText?: string;
    message?: string;
    toString?: () => string;
  };

  const status = typeof err.status === 'number' ? err.status : undefined;
  const statusText = typeof err.statusText === 'string' ? err.statusText : undefined;
  const message =
    (typeof err.message === 'string' && err.message) ||
    (typeof err.toString === 'function' ? err.toString() : undefined);

  return {
    endpoint: ENDPOINT_LABEL[endpoint],
    status,
    statusText,
    message,
  };
};

const logEndpointError = (endpoint: EndpointKey, info: ApiErrorDetails, error: unknown) => {
  const status = info.status ? `${info.status}${info.statusText ? ` ${info.statusText}` : ''}` : 'desconhecido';
  const message = info.message ?? 'sem mensagem do servidor';
  console.error(
    `[Memórias] Falha ao carregar ${endpoint}: ${status} — ${message}`,
    {
      endpoint: info.endpoint,
      status: info.status,
      statusText: info.statusText,
      serverMessage: info.message,
      origin: info.origin,
      url: info.url,
      reason: info.reason,
      error,
    }
  );
};

const trackFetchFailure = (endpoint: EndpointKey, info: ApiErrorDetails) => {
  if (!info.reason) return;
  track('memories_fetch_failed', {
    endpoint,
    reason: info.reason,
    status: info.status ?? null,
    statusText: info.statusText ?? null,
    origin: info.origin ?? null,
    url: info.url ?? null,
  });
};

const formatTechnicalDetails = (details: ApiErrorDetails | null) => {
  if (!details) return null;
  const parts: string[] = [];
  if (details.status) {
    parts.push(`status ${details.status}${details.statusText ? ` ${details.statusText}` : ''}`);
  } else {
    parts.push('status indisponível');
  }
  if (details.reason) {
    parts.push(REASON_LABEL[details.reason]);
  }
  if (details.message) {
    parts.push(details.message);
  }
  return parts.join(' • ');
};

const MemoryLayout: React.FC = () => {
  const { userId } = useAuth();
  const mountedRef = useRef(true);
  const [state, setState] = useState<MemoryState>(INITIAL_STATE);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const safeSetState = useCallback(
    (updater: (prev: MemoryState) => MemoryState) => {
      if (!mountedRef.current) return;
      setState((prev) => updater(prev));
    },
    []
  );

  const loadMemories = useCallback(async () => {
    if (!userId) {
      safeSetState((prev) => ({ ...prev, memories: [], memoriesLoading: false }));
      return;
    }

    safeSetState((prev) => ({
      ...prev,
      memoriesLoading: prev.memories.length === 0,
      memoriesError: null,
      memoriesErrorDetails: null,
    }));

    try {
      const response = await buscarMemoriasPorUsuario(userId);
      if (!mountedRef.current) return;
      const normalized = sortMemoriesByCreatedAtDesc(response.filter(shouldKeepMemory));
      safeSetState((prev) => ({
        ...prev,
        memories: normalized,
        memoriesLoading: false,
        memoriesError: null,
        memoriesErrorDetails: null,
      }));
    } catch (error) {
      if (!mountedRef.current) return;
      const info = parseErrorDetails(error, 'memories');
      logEndpointError('memories', info, error);
      trackFetchFailure('memories', info);
      safeSetState((prev) => ({
        ...prev,
        memoriesLoading: false,
        memoriesError: FRIENDLY_MESSAGES.memories,
        memoriesErrorDetails: info,
      }));
    }
  }, [safeSetState, userId]);

  const loadPerfil = useCallback(async () => {
    if (!userId) {
      safeSetState((prev) => ({ ...prev, perfil: null, perfilLoading: false }));
      return;
    }

    safeSetState((prev) => ({
      ...prev,
      perfilLoading: prev.perfil == null,
      perfilError: null,
      perfilErrorDetails: null,
    }));

    try {
      const perfil = await buscarPerfilEmocional(userId);
      if (!mountedRef.current) return;
      safeSetState((prev) => ({
        ...prev,
        perfil,
        perfilLoading: false,
        perfilError: null,
        perfilErrorDetails: null,
      }));
    } catch (error) {
      if (!mountedRef.current) return;
      const info = parseErrorDetails(error, 'perfil');
      logEndpointError('perfil', info, error);
      trackFetchFailure('perfil', info);
      safeSetState((prev) => ({
        ...prev,
        perfilLoading: false,
        perfilError: FRIENDLY_MESSAGES.perfil,
        perfilErrorDetails: info,
      }));
    }
  }, [safeSetState, userId]);

  const loadRelatorio = useCallback(async () => {
    if (!userId) {
      safeSetState((prev) => ({ ...prev, relatorio: null, relatorioLoading: false }));
      return;
    }

    safeSetState((prev) => ({
      ...prev,
      relatorioLoading: prev.relatorio == null,
      relatorioError: null,
      relatorioErrorDetails: null,
    }));

    try {
      const relatorio = await buscarRelatorioEmocional(userId);
      if (!mountedRef.current) return;
      safeSetState((prev) => ({
        ...prev,
        relatorio,
        relatorioLoading: false,
        relatorioError: null,
        relatorioErrorDetails: null,
      }));
    } catch (error) {
      if (!mountedRef.current) return;
      const info = parseErrorDetails(error, 'relatorio');
      logEndpointError('relatorio', info, error);
      trackFetchFailure('relatorio', info);
      safeSetState((prev) => ({
        ...prev,
        relatorioLoading: false,
        relatorioError: FRIENDLY_MESSAGES.relatorio,
        relatorioErrorDetails: info,
      }));
    }
  }, [safeSetState, userId]);

  useEffect(() => {
    if (!userId) {
      setState(INITIAL_STATE);
      return;
    }

    setState(INITIAL_STATE);
    void Promise.allSettled([loadMemories(), loadPerfil(), loadRelatorio()]);
  }, [loadMemories, loadPerfil, loadRelatorio, userId]);

  useEffect(() => {
    void import('./ProfileSection');
    void import('./ReportSection');
  }, []);

  const refetchMemories = useCallback(() => {
    void loadMemories();
  }, [loadMemories]);

  const refetchPerfil = useCallback(() => {
    void loadPerfil();
  }, [loadPerfil]);

  const refetchRelatorio = useCallback(() => {
    void loadRelatorio();
  }, [loadRelatorio]);

  const contextValue = useMemo<MemoryData>(() => ({
    ...state,
    refetchMemories,
    refetchPerfil,
    refetchRelatorio,
  }), [state, refetchMemories, refetchPerfil, refetchRelatorio]);

  return (
    <MemoryDataContext.Provider value={contextValue}>
      <PhoneFrame className="flex flex-col h-full bg-white">
        <div className="flex-1 overflow-y-auto px-4 py-4 relative">
          {(() => {
            const items = [
              state.memoriesError && {
                key: 'memories' as const,
                message: state.memoriesError,
                details: state.memoriesErrorDetails,
                onRetry: refetchMemories,
              },
              state.perfilError && {
                key: 'perfil' as const,
                message: state.perfilError,
                details: state.perfilErrorDetails,
                onRetry: refetchPerfil,
              },
              state.relatorioError && {
                key: 'relatorio' as const,
                message: state.relatorioError,
                details: state.relatorioErrorDetails,
                onRetry: refetchRelatorio,
              },
            ].filter(Boolean) as Array<{
              key: EndpointKey;
              message: string;
              details: ApiErrorDetails | null;
              onRetry: () => void;
            }>;

            if (!items.length) return null;

            return (
              <div className="mb-4 space-y-3">
                {items.map(({ key, message, details, onRetry }) => (
                  <div
                    key={key}
                    className="rounded-2xl border border-rose-100/80 bg-rose-50/80 px-4 py-3 text-left shadow-sm"
                  >
                    <p className="text-[13px] font-medium text-rose-600">{message}</p>
                    {formatTechnicalDetails(details) ? (
                      <p className="mt-1 text-[11px] text-rose-500/80">{`Detalhes técnicos: ${formatTechnicalDetails(details)}`}</p>
                    ) : null}
                    <button
                      type="button"
                      onClick={onRetry}
                      className="mt-3 inline-flex items-center justify-center rounded-full border border-rose-200/70 bg-white/90 px-3 py-1.5 text-xs font-semibold text-rose-600 shadow-sm transition hover:bg-white"
                    >
                      Tentar novamente
                    </button>
                  </div>
                ))}
              </div>
            );
          })()}

          {state.memoriesLoading && state.perfilLoading && state.relatorioLoading ? (
            <div className="h-[calc(100%-0px)] min-h-[320px] flex items-center justify-center">
              <EcoBubbleLoading size={120} text="Carregando dados..." />
            </div>
          ) : (
            <Outlet />
          )}
        </div>
      </PhoneFrame>
    </MemoryDataContext.Provider>
  );
};

export default MemoryLayout;
