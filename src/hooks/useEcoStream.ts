import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { enviarMensagemParaEco, EcoEventHandlers, EcoApiError, EcoClientEvent } from '../api/ecoApi';
import { buscarUltimasMemoriasComTags, buscarMemoriasSemelhantesV2 } from '../api/memoriaApi';
import { salvarMensagem } from '../api/mensagem';
import { celebrateFirstMemory } from '../utils/celebrateFirstMemory';
import { extrairTagsRelevantes } from '../utils/extrairTagsRelevantes';
import { extractDeepQuestionFlag } from '../utils/chat/deepQuestion';
import { gerarMensagemRetorno } from '../utils/chat/memory';
import { sanitizeEcoText } from '../utils/sanitizeEcoText';
import type { Message as ChatMessageType } from '../contexts/ChatContext';
import mixpanel from '../lib/mixpanel';
import { supabase } from '../lib/supabaseClient';
import { resolveApiUrl } from '../constants/api';
import type { EcoActivityControls } from './useEcoActivity';
import {
  normalizeContinuity,
  resolveContinuityMeta,
  type ContinuityMeta,
} from '../utils/chat/continuity';

interface UseEcoStreamOptions {
  messages: ChatMessageType[];
  addMessage: (message: ChatMessageType) => void;
  setMessages: Dispatch<SetStateAction<ChatMessageType[]>>;
  userId?: string;
  userName: string;
  sessionId: string;
  scrollToBottom: (smooth?: boolean) => void;
  isAtBottom: boolean;
  guestId?: string;
  isGuest?: boolean;
  onUnauthorized?: () => void;
  activity?: EcoActivityControls;
}

type BuscarSimilaresResult = Awaited<ReturnType<typeof buscarMemoriasSemelhantesV2>>;
type BuscarPorTagResult = Awaited<ReturnType<typeof buscarUltimasMemoriasComTags>>;

const isDev = Boolean((import.meta as any)?.env?.DEV);
const isTestEnv = Boolean((import.meta as any)?.env?.MODE === 'test');
const CONTEXT_FETCH_TIMEOUT_MS = 3000;
const NO_TEXT_WARNING = '⚠️ Nenhum texto recebido do servidor.';
const NO_TEXT_ALERT_MESSAGE = 'Nenhum texto recebido do servidor. Tente novamente.';

const getNow = () =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

const showToast = (title: string, description?: string) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('toast', {
      detail: { title, description },
    }),
  );
};

const withTimeout = <T>(
  promise: Promise<T>,
  ms: number,
  onTimeout: () => T | PromiseLike<T>,
): Promise<T> => {
  return new Promise<T>((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve(onTimeout());
    }, ms);

    promise
      .then((value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(onTimeout());
      });
  });
};

const flattenToString = (value: unknown): string => {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map((item) => flattenToString(item)).join('');
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return Object.prototype.toString.call(value);
    }
  }
  return String(value);
};

const collectErrorMessages = (error: unknown, acc: Set<string> = new Set()): Set<string> => {
  if (!error) return acc;

  const push = (text: unknown) => {
    const str = typeof text === 'string' ? text : flattenToString(text);
    if (str && str.trim().length > 0) {
      acc.add(str.trim());
    }
  };

  if (typeof error === 'string') {
    push(error);
    return acc;
  }

  if (error instanceof Error) {
    push(error.message);
    if ((error as any).cause) {
      collectErrorMessages((error as any).cause, acc);
    }
  }

  if (typeof error === 'object' && error !== null) {
    const maybeMessage = (error as any).message;
    if (typeof maybeMessage === 'string') push(maybeMessage);

    const maybeDetails = (error as any).details;
    if (maybeDetails && maybeDetails !== error) {
      collectErrorMessages(maybeDetails, acc);
    }

    const maybeReason = (error as any).reason;
    if (typeof maybeReason === 'string') push(maybeReason);
  }

  return acc;
};

const resolveFriendlyNetworkError = (error: unknown) => {
  const texts = Array.from(collectErrorMessages(error));
  if (texts.length === 0) return { type: 'other' as const, message: '' };

  const combined = texts.join(' | ').toLowerCase();
  if (combined.includes('cors') || combined.includes('preflight')) {
    return {
      type: 'cors' as const,
      message: 'O servidor recusou a origem. Atualize e tente novamente.',
    };
  }

  if (
    combined.includes('failed to fetch') ||
    combined.includes('networkerror') ||
    combined.includes('net::err') ||
    combined.includes('err_connection')
  ) {
    return {
      type: 'network' as const,
      message:
        'Não consegui conectar ao servidor. Verifique sua internet ou tente novamente em instantes.',
    };
  }

  return { type: 'other' as const, message: '' };
};

export const useEcoStream = ({
  messages,
  addMessage,
  setMessages,
  userId,
  userName,
  sessionId,
  scrollToBottom,
  isAtBottom,
  guestId,
  isGuest = false,
  onUnauthorized,
  activity,
}: UseEcoStreamOptions) => {
  const [digitando, setDigitando] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [erroApi, setErroApi] = useState<string | null>(null);

  const messagesRef = useRef(messages);
  const isAtBottomRef = useRef(isAtBottom);
  const inFlightRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    isAtBottomRef.current = isAtBottom;
  }, [isAtBottom]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleSendMessage = useCallback(
    async (text: string, systemHint?: string) => {
      const raw = text ?? '';
      const trimmed = raw.trim();
      if (!trimmed) return;
      if (isSending || inFlightRef.current) return;

      setDigitando(true);
      setIsSending(true);
      setErroApi(null);
      activity?.onSend();

      const {
        data: sessionData,
      } = await supabase
        .auth
        .getSession()
        .catch(() => ({ data: { session: null } }));
      const session = sessionData?.session ?? null;
      const authUserId = session?.user?.id ?? undefined;
      const isAuthenticated = Boolean(authUserId);
      const analyticsUserId = authUserId ?? userId ?? guestId ?? 'guest';
      const shouldPersist = isAuthenticated && !isGuest;

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const userMsgId = uuidv4();
      inFlightRef.current = userMsgId;
      addMessage({ id: userMsgId, text: trimmed, content: trimmed, sender: 'user' });

      requestAnimationFrame(() => scrollToBottom(true));

      mixpanel.track('Eco: Mensagem Enviada', {
        userId: analyticsUserId,
        userName,
        mensagem: trimmed,
        timestamp: new Date().toISOString(),
        ...(isGuest ? { guestId } : {}),
        isGuest,
      });

      const messagesSnapshot = messagesRef.current;

      let metricsReported = false;
      let doneAt: number | undefined;
      let logAndSendStreamMetrics: (
        outcome: 'success' | 'error',
        extra?: Record<string, unknown>
      ) => void = () => {};
      let resetEcoMessageTracking: (options?: { removeIfEmpty?: boolean }) => void = () => {};
      let markStreamDone = () => {};

      let ecoMessageId: string | null = null;
      let ecoMessageIndex: number | null = null;
      let resolvedEcoMessageId: string | null = null;
      let resolvedEcoMessageIndex: number | null = null;
      let aggregatedEcoText = '';
      let aggregatedEcoTextRaw = '';
      let latestMetadata: unknown;
      let pendingMetadata: unknown;
      let donePayload: unknown;
      let memoryFromStream: unknown;
      let primeiraMemoriaFlag = false;
      let continuityTracked = false;
      let trackedMemory = false;
      let latencyFromStream: number | undefined;
      let streamErrorMessage: string | null = null;
      let firstContentReceived = false;
      let streamDoneLogged = false;
      const signalEndpoint = resolveApiUrl('/api/signal');
      const dispatchSignal = (
        signal: string,
        extra?: { value?: unknown; meta?: unknown },
      ) => {
        if (!sessionId || !signalEndpoint || isTestEnv || typeof fetch !== 'function') return;
        const payload: Record<string, unknown> = { session_id: sessionId, signal };
        if (extra && 'value' in extra && extra.value !== undefined) {
          payload.value = extra.value;
        }
        if (extra && 'meta' in extra && extra.meta !== undefined) {
          payload.meta = extra.meta;
        }
        try {
          const request = fetch(signalEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            keepalive: true,
          });
          void request.catch(() => {});
        } catch (signalError) {
          if (isDev) {
            console.warn('[useEcoStream] Falha ao enviar sinal', signalError);
          }
        }
      };
      let promptReadySignalSent = false;
      let firstTokenSignalSent = false;
      let doneSignalSent = false;

      try {
        markStreamDone = () => {
          if (streamDoneLogged) return;
          streamDoneLogged = true;
          console.count('STREAM_DONE');
        };

        const tags = extrairTagsRelevantes(trimmed);

        let persistedMensagemId: string | undefined;

        const salvarMensagemPromise: Promise<string | null> = shouldPersist
          ? salvarMensagem({
              conteudo: trimmed,
              sentimento: '',
              salvar_memoria: true,
              usuario_id: authUserId as string,
            })
              .then((saved) => saved.id)
              .catch((err) => {
                if (isDev) {
                  console.warn('[ChatPage] Falha ao persistir mensagem no Supabase', err);
                }
                return null;
              })
          : Promise.resolve(null);

        const mensagemIdPromise = salvarMensagemPromise
          .then((savedMensagemId) => {
            if (savedMensagemId && savedMensagemId !== userMsgId) {
              persistedMensagemId = savedMensagemId;
              setMessages((prev) =>
                prev.map((m) => (m.id === userMsgId ? { ...m, id: savedMensagemId } : m)),
              );
              return savedMensagemId;
            }

            return userMsgId;
          })
          .catch((err) => {
            if (isDev) {
              console.warn('[ChatPage] Erro ao recuperar ID persistido', err);
            }
            return userMsgId;
          });

        const contextFetchStartedAt = getNow();
        let contextFetchDurationMs: number | null = null;
        let similaresTimedOut = false;
        let tagsTimedOut = false;

        const buscarSimilaresPromise = shouldPersist
          ? withTimeout<BuscarSimilaresResult>(
              buscarMemoriasSemelhantesV2(trimmed, {
                k: 3,
                threshold: 0.12,
                usuario_id: authUserId as string,
              }).catch(() => [] as BuscarSimilaresResult),
              CONTEXT_FETCH_TIMEOUT_MS,
              () => {
                similaresTimedOut = true;
                if (isDev) {
                  console.warn(
                    `[ChatPage] Timeout de ${CONTEXT_FETCH_TIMEOUT_MS}ms ao buscar memórias semelhantes`,
                  );
                }
                return [];
              },
            )
          : Promise.resolve<BuscarSimilaresResult>([]);

        const buscarPorTagPromise = shouldPersist && tags.length
          ? withTimeout<BuscarPorTagResult>(
              buscarUltimasMemoriasComTags(authUserId as string, tags, 2).catch(
                () => [] as BuscarPorTagResult,
              ),
              CONTEXT_FETCH_TIMEOUT_MS,
              () => {
                tagsTimedOut = true;
                if (isDev) {
                  console.warn(
                    `[ChatPage] Timeout de ${CONTEXT_FETCH_TIMEOUT_MS}ms ao buscar memórias por tag`,
                  );
                }
                return [];
              },
            )
          : Promise.resolve<BuscarPorTagResult>([]);

        const [similar, porTag] = await Promise.all([
          buscarSimilaresPromise,
          buscarPorTagPromise,
        ]);

        contextFetchDurationMs = Math.max(
          Math.round(getNow() - contextFetchStartedAt),
          0,
        );
        const contextTimedOut = similaresTimedOut || tagsTimedOut;

        const baseHistory = [...messagesSnapshot, { id: userMsgId, role: 'user', content: trimmed }];

        const vistos = new Set<string>();
        const mems = [...(similar || []), ...(porTag || [])].filter((m: any) => {
          const key = m.id || `${m.created_at}-${m.resumo_eco}`;
          if (vistos.has(key)) return false;
          vistos.add(key);
          return true;
        });

        const ctxMems = (mems || [])
          .map((m: any) => {
            const data = new Date(m.created_at || '').toLocaleDateString();
            const tgs = m.tags?.length ? ` [tags: ${m.tags.join(', ')}]` : '';
            const sim = typeof m.similarity === 'number' ? ` ~${Math.round(m.similarity * 100)}%` : '';
            return `(${data}) ${m.resumo_eco}${tgs}${sim}`;
          })
          .join('\n');

        const memSignif = (mems || []).find((m: any) => (m.intensidade ?? 0) >= 7);
        const retorno = gerarMensagemRetorno(memSignif);

        const preSistema: any[] = [];
        if (systemHint) preSistema.push({ role: 'system', content: systemHint });
        if (retorno) preSistema.push({ role: 'system', content: retorno });
        if (ctxMems) preSistema.push({ role: 'system', content: `Memórias recentes relevantes:\n${ctxMems}` });

        const janelaHistorico = baseHistory.slice(-3);

        const mensagensComContexto = [
          ...preSistema,
          ...janelaHistorico.map((m: any) => ({
            role: (m.role as any) || (m.sender === 'eco' ? 'assistant' : 'user'),
            content: m.content || m.text || '',
          })),
        ];

        const clientHour = new Date().getHours();
        const clientTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

        const requestStartedAt = getNow();
        let promptReadyAt: number | undefined;
        let firstTokenAt: number | undefined;
        doneAt = undefined;
        metricsReported = false;

        logAndSendStreamMetrics = (
          outcome: 'success' | 'error',
          extra: Record<string, unknown> = {},
        ) => {
          if (metricsReported) return;
          metricsReported = true;

          const markers = {
            eco_prompt_ready_at: promptReadyAt ?? null,
            eco_first_token_at: firstTokenAt ?? null,
            eco_done_at: doneAt ?? null,
          };

          const latencySource =
            typeof latencyFromStream === 'number' ? 'server' : 'client';

          const ttfbRaw =
            typeof latencyFromStream === 'number'
              ? latencyFromStream
              : typeof firstTokenAt === 'number'
              ? firstTokenAt - requestStartedAt
              : undefined;
          const ttfbMs =
            typeof ttfbRaw === 'number' ? Math.max(Math.round(ttfbRaw), 0) : null;

          const firstTokenLatencyRaw =
            typeof promptReadyAt === 'number' && typeof firstTokenAt === 'number'
              ? firstTokenAt - promptReadyAt
              : undefined;
          const firstTokenLatencyMs =
            typeof firstTokenLatencyRaw === 'number'
              ? Math.max(Math.round(firstTokenLatencyRaw), 0)
              : null;

          const basePayload = {
            ...markers,
            userId: analyticsUserId,
            sessionId,
            outcome,
            mensagem_id: persistedMensagemId ?? null,
            mensagem_local_id: userMsgId,
            latency_from_stream_ms:
              typeof latencyFromStream === 'number' ? latencyFromStream : null,
            latency_source: latencySource,
            ...(contextFetchDurationMs !== null
              ? { context_fetch_duration_ms: contextFetchDurationMs }
              : {}),
            ...(contextTimedOut ? { context_fetch_timed_out: true } : {}),
            ...(similaresTimedOut ? { context_fetch_similares_timed_out: true } : {}),
            ...(tagsTimedOut ? { context_fetch_tags_timed_out: true } : {}),
            isGuest,
            ...(isGuest ? { guestId } : {}),
            ...extra,
          };

          console.log('[ChatPage] Eco stream markers', {
            ...basePayload,
            request_started_at: requestStartedAt,
          });

          mixpanel.track('Eco: Stream TTFB', {
            ...basePayload,
            ttfb_ms: ttfbMs,
          });

          mixpanel.track('Eco: Stream First Token Latency', {
            ...basePayload,
            first_token_latency_ms: firstTokenLatencyMs,
          });

          const mixpanelAny = mixpanel as any;
          if (ttfbMs !== null && typeof mixpanelAny?.people?.set === 'function') {
            mixpanelAny.people.set({ eco_ttfb_ms: ttfbMs });
          }
          if (
            firstTokenLatencyMs !== null &&
            typeof mixpanelAny?.people?.set === 'function'
          ) {
            mixpanelAny.people.set({ eco_first_token_latency_ms: firstTokenLatencyMs });
          }
        };

        const ensureEcoMessage = () => {
          if (ecoMessageId) return;
          const newId = uuidv4();
          ecoMessageId = newId;
          resolvedEcoMessageId = newId;
          setMessages((prev) => {
            const index = prev.length;
          const placeholder: ChatMessageType = {
            id: newId,
            sender: 'eco',
            text: ' ',
            content: '',
            streaming: false,
          };
            ecoMessageIndex = index;
            resolvedEcoMessageIndex = index;
            return [...prev, placeholder];
          });
        };

        const patchEcoMessage = (patch: Partial<ChatMessageType>) => {
          const targetId = ecoMessageId ?? resolvedEcoMessageId;
          if (!targetId) return;
          const normalizedPatch: Partial<ChatMessageType> = {};
          for (const [key, value] of Object.entries(patch)) {
            if (key === 'text') {
              const stringValue = flattenToString(value);
              normalizedPatch.text = stringValue.length > 0 ? stringValue : ' ';
            } else if (key === 'content') {
              normalizedPatch.content = flattenToString(value);
            } else {
              (normalizedPatch as any)[key] = value;
            }
          }
          if (Object.keys(normalizedPatch).length === 0) return;
          setMessages((prev) => {
            const cachedIndex = ecoMessageIndex ?? resolvedEcoMessageIndex;
            let index = cachedIndex ?? prev.findIndex((m) => m.id === targetId);
            if (index < 0) return prev;
            const existing = prev[index];
            if (!existing) return prev;
            if (ecoMessageId && ecoMessageIndex === null) {
              ecoMessageIndex = index;
            }
            resolvedEcoMessageId = targetId;
            resolvedEcoMessageIndex = index;
            let changed = false;
            for (const [key, value] of Object.entries(normalizedPatch)) {
              if ((existing as any)[key] !== value) {
                changed = true;
                break;
              }
            }
            if (!changed) return prev;
            const updated = { ...existing, ...normalizedPatch };
            const next = [...prev];
            next[index] = updated;
            return next;
          });
        };

        const removeStreamingMessageIfEmpty = () => {
          const targetId = ecoMessageId ?? resolvedEcoMessageId;
          if (!targetId) return;
          setMessages((prev) => {
            const index = prev.findIndex((m) => m.id === targetId);
            if (index < 0) return prev;
            const existing = prev[index];
            const textValue = flattenToString(
              (existing?.content as string | undefined) ?? existing?.text ?? ''
            );
            if (textValue.trim().length > 0) return prev;
            const next = [...prev];
            next.splice(index, 1);
            return next;
          });
        };

        resetEcoMessageTracking = ({ removeIfEmpty = false } = {}) => {
          if (removeIfEmpty) {
            removeStreamingMessageIfEmpty();
          }
          ecoMessageId = null;
          ecoMessageIndex = null;
          resolvedEcoMessageId = null;
          resolvedEcoMessageIndex = null;
          aggregatedEcoText = '';
          aggregatedEcoTextRaw = '';
        };

        const syncScroll = () => {
          if (isAtBottomRef.current) {
            requestAnimationFrame(() => scrollToBottom(true));
          }
        };

        const trackMemoryIfSignificant = (bloco: any) => {
          if (trackedMemory || !bloco || typeof bloco !== 'object') return;
          const intensidade = (bloco as any).intensidade;
          if (typeof intensidade === 'number' && intensidade >= 7) {
            trackedMemory = true;
            mixpanel.track('Memória Registrada', {
              intensidade,
              emocao_principal: (bloco as any).emocao_principal || 'desconhecida',
              modulo_ativado: (bloco as any).modulo_ativado || 'não informado',
              dominio_vida: (bloco as any).dominio_vida || 'geral',
              padrao_comportamental: (bloco as any).padrao_comportamental || 'não identificado',
            });
          }
        };

        const trackContinuityEvent = (
          continuity: ContinuityMeta | undefined,
          messageId: string,
        ) => {
          if (!continuity?.hasContinuity || continuityTracked) {
            return;
          }

          const memoryRef = continuity.memoryRef;
          const payload: Record<string, unknown> = {
            message_id: messageId,
            has_continuity: true,
            memory_ref_id: memoryRef?.id ?? null,
            emotion: memoryRef?.emocao_principal ?? null,
            dias_desde: memoryRef?.dias_desde ?? null,
            similarity: memoryRef?.similarity ?? null,
          };

          if (sessionId) {
            payload.session_id = sessionId;
          }

          if (analyticsUserId) {
            payload.user_id = analyticsUserId;
          }

          mixpanel.track('continuity_shown', payload);
          continuityTracked = true;
        };

        const clearPlaceholder = () => {
          aggregatedEcoTextRaw = '';
          aggregatedEcoText = '';
          patchEcoMessage({ text: '', content: '' });
        };

        const appendMessage = (delta: string) => {
          const chunk = flattenToString(delta);
          if (!chunk) return;
          ensureEcoMessage();
          if (aggregatedEcoTextRaw.length === 0) {
            patchEcoMessage({ text: '', content: '' });
          }
          aggregatedEcoTextRaw = `${aggregatedEcoTextRaw}${chunk}`;
          aggregatedEcoText = sanitizeEcoText(aggregatedEcoTextRaw);
          patchEcoMessage({
            text: aggregatedEcoText.length > 0 ? aggregatedEcoText : ' ',
            content: aggregatedEcoText,
            streaming: true,
          });
        };

        const finalizeMessage = () => {
          if (!ecoMessageId && !resolvedEcoMessageId) return;
          patchEcoMessage({ streaming: false });
        };

        const showStreamError = (message: string) => {
          setErroApi(message);
          ensureEcoMessage();
          patchEcoMessage({ streaming: false });
          setDigitando(false);
          activity?.onError(message);
        };

        const canonicalizeEventType = (raw: unknown) => {
          if (raw === null || raw === undefined) return '';
          const base = String(raw).trim();
          if (/^\[object\s/i.test(base)) return '';
          if (!base) return '';
          return base
            .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
            .replace(/[\s.\-]+/g, "_")
            .toLowerCase();
        };

        const extractEventText = (event: EcoClientEvent, fallback?: string) => {
          const candidates = [
            event.delta,
            event.text,
            (event as any)?.content,
            fallback,
            event.payload && (event.payload as any)?.delta,
            event.payload && (event.payload as any)?.text,
            event.payload && (event.payload as any)?.content,
          ];
          for (const candidate of candidates) {
            const str = flattenToString(candidate);
            if (str.length > 0) return str;
          }
          return '';
        };

        const handleStreamEvent = (rawEvent: EcoClientEvent) => {
          const candidateType =
            rawEvent?.type ??
            (rawEvent as any)?.event ??
            (rawEvent as any)?.name ??
            (rawEvent.payload as any)?.type ??
            (rawEvent.payload as any)?.event;
          const candidateName =
            (rawEvent as any)?.name ??
            (rawEvent.payload as any)?.name ??
            (rawEvent.payload as any)?.event;
          const normalizedType =
            canonicalizeEventType(candidateType) || canonicalizeEventType(candidateName);
          const eventChannel = canonicalizeEventType(
            (rawEvent as any)?.channel ?? (rawEvent.payload as any)?.channel,
          );
          const fromControlChannel = eventChannel === 'control';
          if (isDev) {
            console.debug("[useEcoStream] event", normalizedType || rawEvent?.type, rawEvent);
          }
          switch (normalizedType) {
            case 'prompt_ready': {
              if (!promptReadySignalSent) {
                dispatchSignal('prompt_ready');
                promptReadySignalSent = true;
              }
              if (promptReadyAt === undefined) {
                promptReadyAt = getNow();
              }
              activity?.onPromptReady();
              return;
            }
            case 'latency': {
              if (typeof rawEvent.latencyMs === 'number') {
                latencyFromStream = rawEvent.latencyMs;
                ensureEcoMessage();
                patchEcoMessage({ latencyMs: rawEvent.latencyMs });
              }
              return;
            }
            case 'first_token': {
              if (!promptReadySignalSent) {
                dispatchSignal('prompt_ready');
                promptReadySignalSent = true;
              }
              if (promptReadyAt === undefined) {
                promptReadyAt = getNow();
              }
              if (!firstTokenSignalSent) {
                dispatchSignal('first_token');
                firstTokenSignalSent = true;
              }
              if (firstTokenAt === undefined) {
                firstTokenAt = getNow();
              }
              clearPlaceholder();
              ensureEcoMessage();
              patchEcoMessage({ streaming: true });
              const texto = extractEventText(rawEvent);
              if (texto) {
                appendMessage(texto);
              }
              activity?.onToken();
              firstContentReceived = aggregatedEcoText.trim().length > 0;
              syncScroll();
              return;
            }
            case 'chunk':
            case 'chunk_delta':
            case 'delta':
            case 'message_delta': {
              if (!promptReadySignalSent) {
                dispatchSignal('prompt_ready');
                promptReadySignalSent = true;
              }
              if (promptReadyAt === undefined) {
                promptReadyAt = getNow();
              }
              if (!firstTokenSignalSent) {
                dispatchSignal('first_token');
                firstTokenSignalSent = true;
              }
              const chunkText = extractEventText(rawEvent);
              if (!chunkText) return;
              if (aggregatedEcoText.length === 0) {
                clearPlaceholder();
              }
              appendMessage(chunkText);
              activity?.onToken();
              if (!firstContentReceived && aggregatedEcoText.trim().length > 0) {
                firstContentReceived = true;
              }
              syncScroll();
              return;
            }
            case 'meta_pending': {
              const meta = rawEvent.metadata ?? rawEvent.payload;
              pendingMetadata = meta;
              ensureEcoMessage();
              patchEcoMessage({ metadata: meta });
              return;
            }
            case 'meta': {
              const meta = rawEvent.metadata ?? rawEvent.payload;
              latestMetadata = meta;
              ensureEcoMessage();
              patchEcoMessage({ metadata: meta });
              trackMemoryIfSignificant(meta);
              return;
            }
            case 'memory_saved': {
              const memoria =
                rawEvent.memory ??
                (rawEvent.payload as any)?.memory ??
                (rawEvent.payload as any)?.memoria ??
                rawEvent.payload;
              memoryFromStream = memoria;
              if (
                (rawEvent.payload as any)?.primeiraMemoriaSignificativa ||
                (rawEvent.payload as any)?.primeira
              ) {
                primeiraMemoriaFlag = true;
              }
              ensureEcoMessage();
              patchEcoMessage({ memory: memoria });
              trackMemoryIfSignificant(memoria);
              return;
            }
            case 'done': {
              if (!promptReadySignalSent) {
                dispatchSignal('prompt_ready');
                promptReadySignalSent = true;
              }
              if (promptReadyAt === undefined) {
                promptReadyAt = getNow();
              }
              if (!firstTokenSignalSent) {
                dispatchSignal('first_token');
                firstTokenSignalSent = true;
              }
              if (!doneSignalSent) {
                dispatchSignal('done');
                doneSignalSent = true;
              }
              if (doneAt === undefined) {
                doneAt = getNow();
              }
              donePayload = rawEvent.payload;
              markStreamDone();
              const meta =
                rawEvent.metadata ??
                latestMetadata ??
                pendingMetadata ??
                (rawEvent.payload &&
                typeof rawEvent.payload === 'object' &&
                (rawEvent.payload as any).response !== undefined
                  ? (rawEvent.payload as any).response
                  : rawEvent.payload &&
                    typeof rawEvent.payload === 'object' &&
                    (rawEvent.payload as any).metadata !== undefined
                  ? (rawEvent.payload as any).metadata
                  : undefined);
              if (!fromControlChannel && !aggregatedEcoText.length) {
                const doneText =
                  extractEventText(rawEvent) ||
                  flattenToString(
                    (rawEvent.payload as any)?.response ??
                      (rawEvent.payload as any)?.content ??
                      rawEvent.payload
                  );
                if (doneText) {
                  clearPlaceholder();
                  appendMessage(doneText);
                }
              }
              if (!fromControlChannel && meta !== undefined) {
                latestMetadata = meta;
                ensureEcoMessage();
                patchEcoMessage({ metadata: meta, donePayload: rawEvent.payload, streaming: false });
                trackMemoryIfSignificant(meta);
              } else if (!fromControlChannel && rawEvent.payload !== undefined) {
                ensureEcoMessage();
                patchEcoMessage({ donePayload: rawEvent.payload, streaming: false });
              } else if (fromControlChannel) {
                finalizeMessage();
              }
              if (
                (rawEvent.payload as any)?.primeiraMemoriaSignificativa ||
                (rawEvent.payload as any)?.primeira
              ) {
                primeiraMemoriaFlag = true;
              }
              if (aggregatedEcoText.trim().length > 0) {
                firstContentReceived = true;
              }
              setDigitando(false);
              activity?.onDone();
              syncScroll();
              finalizeMessage();
              const metricsExtra: Record<string, unknown> = { stage: 'on_done' };
              if (meta !== undefined) {
                metricsExtra.final_metadata = meta;
              }
              const usage =
                (rawEvent.payload as any)?.usage ??
                (meta && typeof meta === 'object' ? (meta as any).usage : undefined);
              const completionTokens =
                usage && typeof usage === 'object'
                  ? typeof (usage as any).completion_tokens === 'number'
                    ? (usage as any).completion_tokens
                    : typeof (usage as any).output_tokens === 'number'
                    ? (usage as any).output_tokens
                    : undefined
                  : undefined;
              const latencyMs = Math.max(Math.round(getNow() - requestStartedAt), 0);
              metricsExtra.persisted_id = persistedMensagemId ?? null;
              metricsExtra.authenticated = isAuthenticated;
              metricsExtra.latency_ms = latencyMs;
              if (typeof completionTokens === 'number') {
                metricsExtra.sse_tokens = completionTokens;
              }
              logAndSendStreamMetrics('success', metricsExtra);
              mixpanel.track('Eco: Mensagem Concluída', {
                mensagem_id: persistedMensagemId ?? userMsgId,
                auth: isAuthenticated,
                latency_ms: latencyMs,
                sse_tokens: completionTokens ?? 0,
                isGuest,
                ...(isGuest ? { guestId } : {}),
              });
              resetEcoMessageTracking();
              return;
            }
            case 'error': {
              const messageFromEvent =
                typeof rawEvent.message === 'string' && rawEvent.message.trim().length > 0
                  ? rawEvent.message.trim()
                  : 'Erro ao obter resposta da Eco.';
              streamErrorMessage = messageFromEvent;
              markStreamDone();
              showStreamError(messageFromEvent);
              resetEcoMessageTracking({
                removeIfEmpty: aggregatedEcoText.trim().length === 0,
              });
              return;
            }
            default: {
              if (isDev) {
                console.debug('[useEcoStream] evento desconhecido', rawEvent);
              }
              return;
            }
          }
        };

        const handlers: EcoEventHandlers = {
          onEvent: handleStreamEvent,
          onError: (error) => {
            if (doneAt === undefined) {
              doneAt = getNow();
            }
            setDigitando(false);
            markStreamDone();
            if (streamErrorMessage && !erroApi) {
              showStreamError(streamErrorMessage);
            }
            const message =
              typeof error?.message === 'string' ? error.message : undefined;
            const normalizedMessage = message?.toLowerCase() ?? '';
            const reason =
              error?.name === 'AbortError'
                ? 'aborted'
                : normalizedMessage.includes('expirou')
                ? 'timeout'
                : 'error';
            const fallbackMessage = message ?? streamErrorMessage ?? 'Erro desconhecido na stream.';
            activity?.onError(fallbackMessage);
            logAndSendStreamMetrics('error', {
              stage: 'stream_error',
              error_name: error?.name ?? 'Error',
              error_message: fallbackMessage,
              error_reason: reason,
            });
            resetEcoMessageTracking({ removeIfEmpty: aggregatedEcoText.trim().length === 0 });
          },
        };

        // ------------------------------
        // 👇 Fallback automático SSE → JSON
        // ------------------------------
        let resposta: Awaited<ReturnType<typeof enviarMensagemParaEco>>;
        const commonOpts = { guestId, isGuest, signal: controller.signal as AbortSignal };

        try {
          // 1) tenta streaming (SSE)
          resposta = await enviarMensagemParaEco(
            mensagensComContexto,
            userName,
            shouldPersist ? (authUserId as string) : undefined,
            clientHour,
            clientTz,
            handlers,
            { ...commonOpts, stream: true }
          );
        } catch (err) {
          // 2) se falhar (CORS/rede), tenta JSON
          if (isDev) console.warn('[useEcoStream] SSE falhou; usando JSON:', err);
          resposta = await enviarMensagemParaEco(
            mensagensComContexto,
            userName,
            shouldPersist ? (authUserId as string) : undefined,
            clientHour,
            clientTz,
            handlers,
            { ...commonOpts, stream: false }
          );
        }
        // ------------------------------

          if (resposta?.aborted) {
            markStreamDone();
            resetEcoMessageTracking({ removeIfEmpty: aggregatedEcoText.trim().length === 0 });
            return;
          }

        const finalText = flattenToString(resposta?.text ?? aggregatedEcoText ?? '').trim();
        const noTextFromStream = resposta?.noTextReceived === true;
          const finalMetadata =
            latestMetadata ||
            pendingMetadata ||
            (resposta?.metadata && typeof resposta.metadata === 'object' ? resposta.metadata : undefined) ||
            (resposta?.done && typeof resposta.done === 'object' ? resposta.done : undefined);

          const continuitySources = [
            finalMetadata,
            pendingMetadata,
            donePayload,
            resposta?.metadata,
            (resposta as any)?.meta,
            resposta?.done,
            (resposta as any)?.response,
            resposta,
          ];

          let continuity = resolveContinuityMeta(...continuitySources);

          if (!continuity) {
            for (const candidate of continuitySources) {
              if (candidate && typeof candidate === 'object') {
                const normalized = normalizeContinuity(candidate);
                if (normalized.hasContinuity || normalized.memoryRef) {
                  continuity = normalized;
                  break;
                }
              }
            }
          }

          if (!promptReadySignalSent) {
            dispatchSignal('prompt_ready');
            promptReadySignalSent = true;
            if (promptReadyAt === undefined) {
              promptReadyAt = getNow();
            }
          }
          activity?.onPromptReady();
          if (!firstTokenSignalSent) {
            dispatchSignal('first_token');
            firstTokenSignalSent = true;
            if (firstTokenAt === undefined) {
              firstTokenAt = getNow();
            }
          }
          activity?.onToken();
          if (!doneSignalSent) {
            dispatchSignal('done');
            doneSignalSent = true;
          }
          markStreamDone();

        if (!resolvedEcoMessageId) {
          if (finalText || noTextFromStream) {
            const newId = uuidv4();
            resolvedEcoMessageId = newId;
            const ecoMessage: ChatMessageType = {
              id: newId,
              text: finalText || NO_TEXT_WARNING,
              content: finalText || NO_TEXT_WARNING,
              sender: 'eco',
              streaming: false,
              ...(finalMetadata !== undefined ? { metadata: finalMetadata } : {}),
              ...(resposta?.done ? { donePayload: resposta.done } : {}),
              ...(memoryFromStream ? { memory: memoryFromStream } : {}),
              ...(typeof latencyFromStream === 'number' ? { latencyMs: latencyFromStream } : {}),
              ...(continuity ? { continuity } : {}),
            };
            setMessages((prev) => {
              const index = prev.length;
              resolvedEcoMessageIndex = index;
              return [...prev, ecoMessage];
            });
            trackContinuityEvent(continuity, newId);
          }
        } else {
          if (finalText || noTextFromStream) {
            patchEcoMessage({
              text: finalText || NO_TEXT_WARNING,
              content: finalText || NO_TEXT_WARNING,
              streaming: false,
            });
          }
          const patch: Partial<ChatMessageType> = {};
          if (finalMetadata !== undefined) patch.metadata = finalMetadata;
          if (resposta?.done) patch.donePayload = resposta.done;
          if (memoryFromStream) patch.memory = memoryFromStream;
          if (typeof latencyFromStream === 'number') patch.latencyMs = latencyFromStream;
          if (continuity) patch.continuity = continuity;
          if (!('streaming' in patch)) {
            patch.streaming = false;
          }
          if (Object.keys(patch).length > 0) {
            patchEcoMessage(patch);
          }
          const targetId = resolvedEcoMessageId ?? ecoMessageId;
          if (continuity && targetId) {
            trackContinuityEvent(continuity, targetId);
          }
        }


        resetEcoMessageTracking();
        activity?.onDone();

        donePayload = donePayload || resposta?.done;

        const bloco =
          (finalMetadata && typeof finalMetadata === 'object' ? finalMetadata : undefined) ||
          (donePayload && typeof donePayload === 'object' ? donePayload : undefined);

        if (!bloco && isDev) {
          console.debug('[ChatPage] Resposta da Eco sem metadata estruturada', resposta?.metadata);
        }

        const deepQuestionFlag = extractDeepQuestionFlag({
          block: bloco,
          responseText:
            typeof finalMetadata === 'string'
              ? (finalMetadata as string)
              : bloco
              ? JSON.stringify(bloco)
              : undefined,
          messageText: finalText,
        });

        if (resolvedEcoMessageId && deepQuestionFlag) {
          patchEcoMessage({ deepQuestion: true });
        }

        if (resposta?.primeiraMemoriaSignificativa || primeiraMemoriaFlag) {
          celebrateFirstMemory();
        }

        const memoriaParaTracking = memoryFromStream || bloco;
        trackMemoryIfSignificant(memoriaParaTracking);

        const finalMixpanelMetadata =
          finalMetadata !== undefined
            ? finalMetadata
            : pendingMetadata !== undefined
            ? pendingMetadata
            : donePayload;

        if (finalMixpanelMetadata !== undefined) {
          mensagemIdPromise
            .then((mensagemIdFinal) => {
              mixpanel.track('Eco: Resposta Metadata', {
                userId: analyticsUserId,
                sessionId,
                mensagemId: mensagemIdFinal,
                metadata: finalMixpanelMetadata,
                isGuest,
                ...(isGuest ? { guestId } : {}),
              });
            })
            .catch(() => {
              mixpanel.track('Eco: Resposta Metadata', {
                userId: analyticsUserId,
                sessionId,
                mensagemId: userMsgId,
                metadata: finalMixpanelMetadata,
                isGuest,
                ...(isGuest ? { guestId } : {}),
              });
            });
        }

        if (noTextFromStream) {
          console.warn('[ChatPage] Fluxo SSE finalizado sem texto recebido do servidor.');
          showToast('Sem resposta da Eco', NO_TEXT_ALERT_MESSAGE);
          setErroApi(NO_TEXT_ALERT_MESSAGE);
        }

        if (!metricsReported) {
          if (doneAt === undefined) {
            doneAt = getNow();
          }
          logAndSendStreamMetrics('success', { stage: 'post_stream' });
        }
      } catch (err: any) {
        console.error('[ChatPage] erro:', err);

        const isAbortError = err?.name === 'AbortError';

        if (!isAbortError) {
          let displayMessage = err?.message || 'Falha ao enviar mensagem.';
          const friendly = resolveFriendlyNetworkError(err);

          if (friendly.type !== 'other' && friendly.message) {
            displayMessage = friendly.message;
          } else if (err instanceof EcoApiError) {
            if (err.status === 401) {
              displayMessage = 'Faça login para continuar a conversa com a Eco.';
              showToast('Faça login para salvar suas conversas', 'Entre para manter o histórico com a Eco.');
              if (onUnauthorized) {
                try {
                  onUnauthorized();
                } catch (callbackError) {
                  if (isDev) {
                    console.warn('[ChatPage] onUnauthorized falhou', callbackError);
                  }
                }
              }
            } else if (err.status === 429) {
              displayMessage = 'Muitas requisições. Aguarde alguns segundos e tente novamente.';
              showToast('Calma aí 🙂', 'Aguarde alguns segundos antes de enviar outra mensagem.');
            } else if (err.status && err.status >= 500) {
              displayMessage = 'A Eco está instável no momento. Tente novamente em instantes.';
            }
          }

          setErroApi(displayMessage);
          activity?.onError(displayMessage);
          mixpanel.track('Eco: Erro ao Enviar Mensagem', {
            userId: analyticsUserId,
            erro: err?.message || 'desconhecido',
            mensagem: (text || '').slice(0, 120),
            timestamp: new Date().toISOString(),
            isGuest,
            ...(isGuest ? { guestId } : {}),
          });
        }

        markStreamDone();
        resetEcoMessageTracking({ removeIfEmpty: aggregatedEcoText.trim().length === 0 });

        if (!metricsReported) {
          const now =
            typeof performance !== 'undefined' && typeof performance.now === 'function'
              ? performance.now()
              : Date.now();
          if (doneAt === undefined) {
            doneAt = now;
          }
          const reason = isAbortError ? 'aborted' : 'error';
          logAndSendStreamMetrics('error', {
            stage: 'request_catch',
            error_name: err?.name ?? 'Error',
            error_message: err?.message ?? 'Erro desconhecido ao enviar mensagem.',
            error_reason: reason,
            ...(err instanceof EcoApiError && typeof err.status === 'number'
              ? { status: err.status }
              : {}),
          });
        }
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
        inFlightRef.current = null;
        setIsSending(false);
        setDigitando(false);
        if (activity && activity.activity.state !== 'error' && activity.activity.state !== 'synthesizing_audio') {
          activity.onDone();
        }
        scrollToBottom(true);
      }
    },
      [
        addMessage,
        guestId,
        isAtBottom,
        isGuest,
        onUnauthorized,
        isSending,
        scrollToBottom,
        setMessages,
        sessionId,
        userId,
        userName,
        activity,
    ]
  );

  return { handleSendMessage, digitando, erroApi, setErroApi, pending: isSending } as const;
};

