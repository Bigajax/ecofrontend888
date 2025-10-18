import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import PhoneFrame from '../../components/PhoneFrame';
import { useAuth } from '../../contexts/AuthContext';
import { buscarMemoriasPorUsuario } from '../../api/memoriaApi';
import { buscarPerfilEmocional } from '../../api/perfilApi';
import { buscarRelatorioEmocional } from '../../api/relatorioEmocionalApi';
import { MemoryDataContext, type ApiErrorDetails, type MemoryData } from './memoryData';
import EcoBubbleLoading from '../../components/EcoBubbleLoading';

type EndpointKey = 'memories' | 'perfil' | 'relatorio';

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

type MemoryLike = { salvar_memoria?: unknown } & Record<string, unknown>;

const shouldKeepMemory = (memory: MemoryLike) => {
  const flag = memory?.salvar_memoria;
  if (flag === undefined || flag === null) return true;
  if (typeof flag === 'string') return flag === 'true' || flag === '1';
  if (typeof flag === 'number') return flag === 1;
  return Boolean(flag);
};

const parseErrorDetails = (error: unknown, endpoint: EndpointKey): ApiErrorDetails => {
  const err = (error ?? {}) as {
    response?: { status?: number; statusText?: string; data?: unknown };
    data?: unknown;
    message?: string;
    toString?: () => string;
  };
  const response = err.response ?? {};
  const status = typeof response.status === 'number' ? response.status : undefined;
  const statusText = typeof response.statusText === 'string' ? response.statusText : undefined;

  const data = response.data ?? err.data;
  const serverMessage =
    (typeof data === 'string' && data) ||
    (typeof (data as { error?: unknown })?.error === 'string' && (data as { error?: string }).error) ||
    (typeof (data as { message?: unknown })?.message === 'string' &&
      (data as { message?: string }).message) ||
    (typeof (data as { detail?: unknown })?.detail === 'string' && (data as { detail?: string }).detail) ||
    (typeof (data as { details?: unknown })?.details === 'string' && (data as { details?: string }).details) ||
    undefined;

  const fallbackMessage =
    (typeof err.message === 'string' && err.message) ||
    (typeof err.toString === 'function' ? err.toString() : undefined);

  return {
    endpoint: ENDPOINT_LABEL[endpoint],
    status,
    statusText,
    message: serverMessage ?? fallbackMessage,
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
      error,
    }
  );
};

const MemoryLayout: React.FC = () => {
  const { userId } = useAuth();

  const [state, setState] = useState<MemoryData>({
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
  });

  useEffect(() => {
    let alive = true;

    const load = async () => {
      if (!userId) {
        setState({
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
        });
        return;
      }

      setState({
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
      });

      const [memoriesResult, perfilResult, relatorioResult] = await Promise.allSettled([
        buscarMemoriasPorUsuario(userId),
        buscarPerfilEmocional(userId),
        buscarRelatorioEmocional(userId),
      ]);

      if (!alive) return;

      setState((s) => {
        const next: MemoryData = {
          ...s,
          memoriesLoading: false,
          perfilLoading: false,
          relatorioLoading: false,
        };

        if (memoriesResult.status === 'fulfilled') {
          next.memories = memoriesResult.value.filter(shouldKeepMemory);
          next.memoriesError = null;
          next.memoriesErrorDetails = null;
        } else {
          const info = parseErrorDetails(memoriesResult.reason, 'memories');
          logEndpointError('memories', info, memoriesResult.reason);
          next.memories = [];
          next.memoriesError = FRIENDLY_MESSAGES.memories;
          next.memoriesErrorDetails = info;
        }

        if (perfilResult.status === 'fulfilled') {
          next.perfil = perfilResult.value;
          next.perfilError = null;
          next.perfilErrorDetails = null;
        } else {
          const info = parseErrorDetails(perfilResult.reason, 'perfil');
          logEndpointError('perfil', info, perfilResult.reason);
          next.perfil = null;
          next.perfilError = FRIENDLY_MESSAGES.perfil;
          next.perfilErrorDetails = info;
        }

        if (relatorioResult.status === 'fulfilled') {
          next.relatorio = relatorioResult.value;
          next.relatorioError = null;
          next.relatorioErrorDetails = null;
        } else {
          const info = parseErrorDetails(relatorioResult.reason, 'relatorio');
          logEndpointError('relatorio', info, relatorioResult.reason);
          next.relatorio = null;
          next.relatorioError = FRIENDLY_MESSAGES.relatorio;
          next.relatorioErrorDetails = info;
        }

        return next;
      });
    };

    void load();
    return () => {
      alive = false;
    };
  }, [userId]);

  useEffect(() => {
    void import('./ProfileSection');
    void import('./ReportSection');
  }, []);

  return (
    <MemoryDataContext.Provider value={state}>
      {/* Sem paddings de header/side aqui — o MainLayout já aplica.
          Mantemos a estrutura simples pra evitar “topo duplicado” em webviews */}
      <PhoneFrame className="flex flex-col h-full bg-white">
        <div className="flex-1 overflow-y-auto px-4 py-4 relative">
          {(() => {
            const items = [
              state.memoriesError && {
                key: 'memories',
                message: state.memoriesError,
                details: state.memoriesErrorDetails,
              },
              state.perfilError && {
                key: 'perfil',
                message: state.perfilError,
                details: state.perfilErrorDetails,
              },
              state.relatorioError && {
                key: 'relatorio',
                message: state.relatorioError,
                details: state.relatorioErrorDetails,
              },
            ].filter(Boolean) as Array<{ key: string; message: string; details: ApiErrorDetails | null }>;

            if (!items.length) return null;

            return (
              <div className="mb-4 space-y-3">
                {items.map(({ key, message, details }) => (
                  <div
                    key={key}
                    className="rounded-2xl border border-rose-100/80 bg-rose-50/80 px-4 py-3 text-left shadow-sm"
                  >
                    <p className="text-[13px] font-medium text-rose-600">{message}</p>
                    {details?.status || details?.message ? (
                      <p className="mt-1 text-[11px] text-rose-500/80">
                        Detalhes técnicos: {details?.status ? `${details.status}${details.statusText ? ` ${details.statusText}` : ''}` : 'status indisponível'}
                        {details?.message ? ` • ${details.message}` : ''}
                      </p>
                    ) : null}
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
