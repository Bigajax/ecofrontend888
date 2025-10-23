import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { enviarMensagemParaEco, EcoEventHandlers, EcoApiError, EcoSseEvent } from '../api/ecoApi';
import { MissingUserIdError } from '../api/errors';
import { buscarUltimasMemoriasComTags, buscarMemoriasSemelhantesV2 } from '../api/memoriaApi';
import { salvarMensagem } from '../api/mensagem';
import { celebrateFirstMemory } from '../utils/celebrateFirstMemory';
import { extrairTagsRelevantes } from '../utils/extrairTagsRelevantes';
import { extractDeepQuestionFlag } from '../utils/chat/deepQuestion';
import { gerarMensagemRetorno } from '../utils/chat/memory';
import { sanitizeEcoText } from '../utils/sanitizeEcoText';
import { sanitizeText } from '../utils/sanitizeText';
import { smartJoin } from '../utils/streamJoin';
import type { Message as ChatMessageType, UpsertMessageOptions } from '../contexts/ChatContext';
import mixpanel from '../lib/mixpanel';
import { supabase } from '../lib/supabaseClient';
import { buildIdentityHeaders } from '../lib/guestId';
import { updatePassiveSignalInteractionId } from '../api/passiveSignals';
import { resolveApiUrl } from '../constants/api';
import { findInteractionId, findMessageId } from '../utils/chat/identifiers';
import type { EcoActivityControls } from './useEcoActivity';
import {
  normalizeContinuity,
  resolveContinuityMeta,
  type ContinuityMeta,
} from '../utils/chat/continuity';
import { resolveChunkIdentifier, resolveChunkIndex } from '../utils/chat/chunkSignals';
import {
  CONTEXT_FETCH_TIMEOUT_MS,
  NO_TEXT_ALERT_MESSAGE,
  NO_TEXT_WARNING,
  flattenToString,
  getNow,
  isDev,
  isTestEnv,
  resolveFriendlyNetworkError,
  showToast,
  withTimeout,
} from './useEcoStream.helpers';

interface UseEcoStreamOptions {
  messages: ChatMessageType[];
  upsertMessage: (message: ChatMessageType, options?: UpsertMessageOptions) => void;
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

export const useEcoStream = ({
  messages,
  upsertMessage,
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
  const activeStreamRef = useRef<{
    controller: AbortController | null;
    streamId: string | null;
  }>({ controller: null, streamId: null });
  type StreamDraft = {
    messageId: string | null;
    buffer: string;
    pendingPatch: Partial<ChatMessageType>;
    lastChunkIndex: number | null;
    createdAtChunkIndex: number | null;
    interactionId: string | null;
    seenIndexes: Set<number>;
    firstChunkLogged: boolean;
  };

  const streamsRef = useRef<Map<string, StreamDraft>>(new Map());
  const draftsByInteractionRef = useRef<Map<string, StreamDraft>>(new Map());

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    isAtBottomRef.current = isAtBottom;
  }, [isAtBottom]);

  useEffect(() => {
    return () => {
      const { controller } = activeStreamRef.current;
      controller?.abort();
      activeStreamRef.current = { controller: null, streamId: null };
      abortControllerRef.current = null;
    };
  }, []);

  const handleSendMessage = useCallback(
    async (text: string, systemHint?: string) => {
      const raw = text ?? '';
      const trimmed = raw.trim();
      if (!trimmed) return;

      const nextClientMessageId = uuidv4();

      let supersededPreviousStream = false;
      const { controller: previousController, streamId: previousStreamId } =
        activeStreamRef.current;
      if (previousController) {
        supersededPreviousStream = true;
        if (isDev) {
          console.info('[useEcoStream] AbortController: superseded run', {
            previousStreamId,
            nextStreamId: nextClientMessageId,
          });
        }
        try {
          previousController.abort('superseded');
        } catch (abortError) {
          if (isDev) {
            console.warn('[useEcoStream] Falha ao abortar stream anterior', abortError);
          }
        }
        if (abortControllerRef.current === previousController) {
          abortControllerRef.current = null;
        }
        if (typeof previousStreamId === 'string' && previousStreamId) {
          const draft = streamsRef.current.get(previousStreamId);
          if (draft?.interactionId) {
            draftsByInteractionRef.current.delete(draft.interactionId);
          }
          streamsRef.current.delete(previousStreamId);
        }
        activeStreamRef.current = { controller: null, streamId: null };
        inFlightRef.current = null;
        setDigitando(false);
        setIsSending(false);
      }

      if (!supersededPreviousStream && (isSending || inFlightRef.current)) return;

      const clientMessageId = nextClientMessageId;
      inFlightRef.current = clientMessageId;

      setDigitando(true);
      setIsSending(true);
      setErroApi(null);
      activity?.onSend();

      const controller = new AbortController();
      abortControllerRef.current = controller;
      activeStreamRef.current = { controller, streamId: clientMessageId };

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

      const sanitizedUserText = sanitizeText(trimmed);
      upsertMessage(
        {
          id: clientMessageId,
          client_message_id: clientMessageId,
          text: sanitizedUserText,
          content: sanitizedUserText,
          sender: 'user',
          role: 'user',
          status: 'pending',
        },
        { allowContentUpdate: true, patchSource: 'useEcoStream:send' },
      );

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

      const messageIdsForTurn = new Set<string>([clientMessageId]);
      const recordMessageId = (id: string | null | undefined) => {
        if (!id) return;
        messageIdsForTurn.add(id);
      };

      streamsRef.current.set(clientMessageId, {
        messageId: clientMessageId,
        buffer: '',
        pendingPatch: {},
        lastChunkIndex: null,
        createdAtChunkIndex: null,
        interactionId: null,
        seenIndexes: new Set<number>(),
        firstChunkLogged: false,
      });

      let currentInteractionId: string | null = null;
      updatePassiveSignalInteractionId(null);
      const pendingSignals: Array<{ signal: string; extra?: { value?: unknown; meta?: unknown } }> = [];

      const hydrateEcoMessageFromInteraction = (interactionId: string) => {
        const normalized = typeof interactionId === 'string' ? interactionId.trim() : '';
        if (!normalized) return;
        if (ecoMessageCreated) return;
        const existingIndex = messagesRef.current.findIndex((message) => {
          if (!message) return false;
          const rawInteraction =
            (typeof message.interaction_id === 'string' && message.interaction_id.trim()) ||
            (typeof message.interactionId === 'string' && message.interactionId.trim()) ||
            '';
          return rawInteraction === normalized;
        });
        if (existingIndex < 0) return;
        const existing = messagesRef.current[existingIndex];
        if (!existing) return;
        const resolvedId =
          (typeof existing.message_id === 'string' && existing.message_id.trim()) ||
          (typeof existing.id === 'string' && existing.id.trim()) ||
          null;
        const entry = streamsRef.current.get(clientMessageId) ?? draftsByInteractionRef.current.get(normalized);
        if (entry) {
          entry.messageId = resolvedId ?? entry.messageId;
          entry.interactionId = normalized;
          const snapshot =
            (typeof existing.content === 'string' && existing.content) ||
            (typeof existing.text === 'string' && existing.text) ||
            '';
          entry.buffer = snapshot;
        }
        ecoMessageId = (typeof existing.id === 'string' && existing.id.trim()) || ecoMessageId;
        resolvedEcoMessageId = resolvedId ?? ecoMessageId;
        ecoMessageCreated = true;
        aggregatedEcoTextRaw = flattenToString(existing.content ?? existing.text ?? '');
        aggregatedEcoText = aggregatedEcoTextRaw;
        if (typeof existing.id === 'string') {
          messageIdsForTurn.add(existing.id);
        }
        if (typeof existing.message_id === 'string') {
          messageIdsForTurn.add(existing.message_id);
        }
      };

      const registerDraftForInteraction = (interactionId: string) => {
        const normalized = typeof interactionId === 'string' ? interactionId.trim() : '';
        if (!normalized) return;
        const existingEntry = draftsByInteractionRef.current.get(normalized);
        const currentEntry = streamsRef.current.get(clientMessageId);
        if (existingEntry && existingEntry !== currentEntry) {
          draftsByInteractionRef.current.set(normalized, existingEntry);
          streamsRef.current.set(clientMessageId, existingEntry);
          existingEntry.interactionId = normalized;
        } else if (currentEntry) {
          currentEntry.interactionId = normalized;
          draftsByInteractionRef.current.set(normalized, currentEntry);
        }
        hydrateEcoMessageFromInteraction(normalized);
      };

      const annotateMessagesWithInteractionId = (interactionId: string) => {
        if (!interactionId) return;
        messageIdsForTurn.forEach((id) => {
          if (!id) return;
          const snapshot = messagesRef.current.find((message) => {
            if (!message) return false;
            if (message.id === id) return true;
            if (typeof message.client_message_id === 'string' && message.client_message_id === id) {
              return true;
            }
            if (typeof message.message_id === 'string' && message.message_id === id) {
              return true;
            }
            return false;
          });
          const basePatch: Partial<ChatMessageType> = {
            id,
            interaction_id: interactionId,
            interactionId: interactionId,
          };
          if (snapshot?.sender) {
            basePatch.sender = snapshot.sender;
          }
          if (snapshot?.role) {
            basePatch.role = snapshot.role;
          }
          upsertMessage(basePatch as ChatMessageType, {
            allowedKeys: ['interaction_id', 'interactionId'],
            patchSource: 'useEcoStream:interaction',
          });
        });
        registerDraftForInteraction(interactionId);
      };

      const signalEndpoint = resolveApiUrl('/api/signal');

      let metricsReported = false;
      let doneAt: number | undefined;
      let logAndSendStreamMetrics: (
        outcome: 'success' | 'error',
        extra?: Record<string, unknown>
      ) => void = () => {};
      let resetEcoMessageTracking: (options?: { removeIfEmpty?: boolean }) => void = () => {};
      let markStreamDone = () => {};

      let ecoMessageId: string | null = clientMessageId;
      let ecoMessageCreated = false;
      let resolvedEcoMessageId: string | null = null;
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
      let pendingEcoPatch: Partial<ChatMessageType> = {};

      const resolveActiveMessageId = () => resolvedEcoMessageId ?? ecoMessageId;

      const sendSignal = (
        signal: string,
        extra: { value?: unknown; meta?: unknown } | undefined,
        interactionId: string | null,
      ) => {
        if (!interactionId) {
          return;
        }
        if (!sessionId || !signalEndpoint || isTestEnv || typeof fetch !== 'function') return;

        const payload: Record<string, unknown> = { session_id: sessionId, signal };
        payload.interaction_id = interactionId;
        if (authUserId) {
          payload.usuario_id = authUserId;
        }
        const messageId = resolveActiveMessageId();
        if (messageId) {
          payload.message_id = messageId;
        }
        if (extra && 'value' in extra && extra.value !== undefined) {
          payload.value = extra.value;
        }
        if (extra && 'meta' in extra && extra.meta !== undefined) {
          payload.meta = extra.meta;
        }

        try {
          const request = fetch(signalEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...buildIdentityHeaders(),
              'X-Eco-Interaction-Id': interactionId,
            },
            body: JSON.stringify(payload),
            redirect: 'follow',
            keepalive: true,
          });
          void request.catch(() => {});
        } catch (signalError) {
          if (isDev) {
            console.warn('[useEcoStream] Falha ao enviar sinal', signalError);
          }
        }
      };

      const flushPendingSignals = () => {
        if (!currentInteractionId || pendingSignals.length === 0) return;
        const queue = pendingSignals.splice(0, pendingSignals.length);
        queue.forEach(({ signal, extra }) => {
          sendSignal(signal, extra, currentInteractionId);
        });
      };

      const updateInteractionId = (value: unknown) => {
        const candidate = findInteractionId(value);
        if (!candidate) return;
        const normalized = candidate.trim();
        if (!normalized) return;
        if (currentInteractionId === normalized) return;
        currentInteractionId = normalized;
        registerDraftForInteraction(normalized);
        annotateMessagesWithInteractionId(normalized);
        flushPendingSignals();
        updatePassiveSignalInteractionId(normalized);
      };

      const updateMessageIdFrom = (value: unknown) => {
        const candidate = findMessageId(value);
        if (!candidate) return;
        if (resolvedEcoMessageId === candidate) return;
        resolvedEcoMessageId = candidate;
        recordMessageId(candidate);
        const streamEntry = streamsRef.current.get(clientMessageId);
        if (streamEntry) {
          streamEntry.messageId = candidate;
        }
        const patch: Partial<ChatMessageType> = { message_id: candidate };
        if (ecoMessageCreated) {
          patchEcoMessage(patch, {
            allowedKeys: ['message_id'],
            patchSource: 'useEcoStream:message-id',
          });
        } else {
          mergePendingPatch(patch);
        }
      };

      const dispatchSignal = (
        signal: string,
        extra?: { value?: unknown; meta?: unknown },
      ) => {
        if (!currentInteractionId) {
          pendingSignals.push({ signal, extra });
          return;
        }
        if (signal === 'done') {
          flushPendingSignals();
        }
        sendSignal(signal, extra, currentInteractionId);
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
            if (savedMensagemId) {
              persistedMensagemId = savedMensagemId;
              recordMessageId(savedMensagemId);
              upsertMessage(
                {
                  id: clientMessageId,
                  client_message_id: clientMessageId,
                  message_id: savedMensagemId,
                  server_ids: [savedMensagemId],
                  status: 'sent',
                },
                {
                  allowedKeys: ['status', 'server_ids', 'message_id', 'updatedAt', 'createdAt', 'flags', 'audioUrl'],
                  patchSource: 'useEcoStream:persist',
                },
              );
              return savedMensagemId;
            }

            recordMessageId(clientMessageId);
            upsertMessage(
              {
                id: clientMessageId,
                client_message_id: clientMessageId,
                status: 'sent',
              },
              {
                allowedKeys: ['status', 'server_ids', 'message_id', 'updatedAt', 'createdAt', 'flags', 'audioUrl'],
                patchSource: 'useEcoStream:persist',
              },
            );
            return clientMessageId;
          })
          .catch((err) => {
            if (isDev) {
              console.warn('[ChatPage] Erro ao recuperar ID persistido', err);
            }
            upsertMessage(
              {
                id: clientMessageId,
                client_message_id: clientMessageId,
                status: 'sent',
              },
              {
                allowedKeys: ['status', 'server_ids', 'message_id', 'updatedAt', 'createdAt', 'flags', 'audioUrl'],
                patchSource: 'useEcoStream:persist',
              },
            );
            return clientMessageId;
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

        const baseHistory = [
          ...messagesSnapshot,
          { id: clientMessageId, role: 'user', content: trimmed, client_message_id: clientMessageId },
        ];

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
            mensagem_local_id: clientMessageId,
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

        const normalizePatch = (patch: Partial<ChatMessageType>) => {
          const normalized: Partial<ChatMessageType> = {};
          for (const [key, value] of Object.entries(patch)) {
            if (key === 'text') {
              const stringValue = flattenToString(value);
              normalized.text = stringValue.length > 0 ? stringValue : ' ';
            } else if (key === 'content') {
              normalized.content = flattenToString(value);
            } else {
              (normalized as any)[key] = value;
            }
          }
          return normalized;
        };

        const mergePendingPatch = (patch: Partial<ChatMessageType>) => {
          if (!patch || Object.keys(patch).length === 0) return;
          const normalized = normalizePatch(patch);
          if (Object.keys(normalized).length === 0) return;
          pendingEcoPatch = { ...pendingEcoPatch, ...normalized };
          const streamEntry = streamsRef.current.get(clientMessageId);
          if (streamEntry) {
            streamEntry.pendingPatch = { ...streamEntry.pendingPatch, ...pendingEcoPatch };
          }
        };

        const patchEcoMessage = (
          patch: Partial<ChatMessageType>,
          options?: UpsertMessageOptions,
        ) => {
          const normalizedPatch = normalizePatch(patch);
          if (Object.keys(normalizedPatch).length === 0) return;
          if (!ecoMessageCreated) {
            mergePendingPatch(normalizedPatch);
            return;
          }

          const targetId = resolvedEcoMessageId ?? ecoMessageId ?? clientMessageId;
          if (!targetId) return;
          recordMessageId(targetId);

          const baseMessage: ChatMessageType = {
            id: targetId,
            client_message_id: clientMessageId,
            sender: 'eco',
            role: 'assistant',
            ...(currentInteractionId
              ? { interaction_id: currentInteractionId, interactionId: currentInteractionId }
              : {}),
          };

          const message = { ...baseMessage, ...normalizedPatch } as ChatMessageType;

          upsertMessage(message, {
            ...options,
            patchSource: options?.patchSource ?? 'useEcoStream:patch',
          });
        };

        const createEcoMessageIfNeeded = (
          initialPatch: Partial<ChatMessageType> = {},
          originChunkIndex?: number | null,
        ) => {
          const normalizedInitialPatch = normalizePatch({
            ...pendingEcoPatch,
            ...initialPatch,
          });

          if (ecoMessageCreated) {
            if (Object.keys(normalizedInitialPatch).length > 0) {
              patchEcoMessage(normalizedInitialPatch, {
                allowContentUpdate: true,
                patchSource: 'useEcoStream:create',
              });
            }
            return;
          }

          const targetId = ecoMessageId ?? uuidv4();
          ecoMessageId = targetId;
          resolvedEcoMessageId = resolvedEcoMessageId ?? targetId;
          recordMessageId(targetId);

          const streamEntry = streamsRef.current.get(clientMessageId);
          if (streamEntry) {
            streamEntry.messageId = targetId;
            if (typeof originChunkIndex === 'number') {
              streamEntry.createdAtChunkIndex = originChunkIndex;
              if (
                streamEntry.lastChunkIndex == null ||
                streamEntry.lastChunkIndex < originChunkIndex
              ) {
                streamEntry.lastChunkIndex = originChunkIndex;
              }
            }
          }

          const baseMessage: ChatMessageType = {
            id: targetId,
            client_message_id: clientMessageId,
            sender: 'eco',
            role: 'assistant',
            text: ' ',
            content: '',
            streaming: true,
            status: 'streaming',
            ...(currentInteractionId
              ? { interaction_id: currentInteractionId, interactionId: currentInteractionId }
              : {}),
          };

          const message = Object.keys(normalizedInitialPatch).length
            ? ({ ...baseMessage, ...normalizedInitialPatch } as ChatMessageType)
            : baseMessage;

          upsertMessage(message, {
            allowContentUpdate: true,
            patchSource: 'useEcoStream:create',
          });

          pendingEcoPatch = {};
          const updatedEntry = streamsRef.current.get(clientMessageId);
          if (updatedEntry) {
            updatedEntry.pendingPatch = {};
          }
          ecoMessageCreated = true;
          if (currentInteractionId) {
            registerDraftForInteraction(currentInteractionId);
          }
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
          ecoMessageCreated = false;
          resolvedEcoMessageId = null;
          aggregatedEcoText = '';
          aggregatedEcoTextRaw = '';
          pendingEcoPatch = {};
          const existingEntry = streamsRef.current.get(clientMessageId);
          if (existingEntry?.interactionId) {
            draftsByInteractionRef.current.delete(existingEntry.interactionId);
          }
          streamsRef.current.delete(clientMessageId);
        };

        const syncScroll = () => {
          if (isAtBottomRef.current) {
            requestAnimationFrame(() => scrollToBottom(true));
          }
        };

        const isStreamSuperseded = () => activeStreamRef.current.streamId !== clientMessageId;

        const resolveEventClientMessageId = (event?: EcoSseEvent): string | null => {
          if (!event) return null;
          const potentialSources = [
            event as Record<string, unknown>,
            (event as any)?.payload as Record<string, unknown> | undefined,
            (event as any)?.metadata as Record<string, unknown> | undefined,
            (event as any)?.done as Record<string, unknown> | undefined,
          ];

          for (const source of potentialSources) {
            if (!source || typeof source !== 'object') continue;
            const candidate =
              (source as any).clientMessageId ??
              (source as any).client_message_id ??
              (source as any).clientmessageid;
            if (typeof candidate === 'string' && candidate.trim().length > 0) {
              return candidate.trim();
            }
          }

          return null;
        };

        const guardSupersededEvent = (eventType: string, event?: EcoSseEvent) => {
          if (isStreamSuperseded()) {
            if (isDev) {
              console.debug('[useEcoStream] evento ignorado (stream superseded)', {
                eventType,
                active: activeStreamRef.current.streamId,
                received: clientMessageId,
              });
            }
            return true;
          }

          const eventClientId = resolveEventClientMessageId(event);
          if (eventClientId && eventClientId !== clientMessageId) {
            if (isDev) {
              console.debug('[useEcoStream] evento ignorado (client_message_id divergente)', {
                eventType,
                active: clientMessageId,
                received: eventClientId,
              });
            }
            return true;
          }

          return false;
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
          const streamEntry = streamsRef.current.get(clientMessageId);
          if (streamEntry) {
            streamEntry.buffer = '';
            streamEntry.lastChunkIndex = null;
            streamEntry.seenIndexes.clear();
            streamEntry.firstChunkLogged = false;
          }
          if (ecoMessageCreated) {
            patchEcoMessage(
              { text: '', content: '' },
              { allowContentUpdate: true, patchSource: 'useEcoStream:clear-placeholder' },
            );
          }
        };

        const seenChunkIdentifiers = new Set<string>();
        let lastSeenChunkIndex: number | null = null;

        const appendDelta = (
          interactionId: string | null,
          chunkIndex: number | null,
          delta: string,
          event?: EcoSseEvent,
        ) => {
          const chunk = flattenToString(delta);
          if (!chunk) return;

          const identifier = resolveChunkIdentifier(event);
          if (identifier) {
            if (seenChunkIdentifiers.has(identifier)) {
              if (isDev) {
                console.debug('[useEcoStream] delta ignorado (duplicado)', {
                  type: event?.type,
                  identifier,
                  chunk,
                });
              }
              return;
            }
            seenChunkIdentifiers.add(identifier);
          }

          const baseEntry =
            (interactionId ? draftsByInteractionRef.current.get(interactionId) : undefined) ??
            streamsRef.current.get(clientMessageId);

          if (!baseEntry) {
            if (isDev) {
              console.debug('[useEcoStream] sem draft ativo para aplicar delta', {
                interactionId,
                chunk,
              });
            }
            return;
          }

          const resolvedInteractionId =
            interactionId ?? baseEntry.interactionId ?? currentInteractionId ?? null;
          if (resolvedInteractionId && baseEntry.interactionId !== resolvedInteractionId) {
            baseEntry.interactionId = resolvedInteractionId;
            draftsByInteractionRef.current.set(resolvedInteractionId, baseEntry);
          }

          const interactionForLog = resolvedInteractionId ?? 'pending';

          if (!(baseEntry.seenIndexes instanceof Set)) {
            baseEntry.seenIndexes = new Set<number>();
          }

          if (chunkIndex !== null) {
            if (baseEntry.seenIndexes.has(chunkIndex)) {
              if (isDev) {
                console.debug('[useEcoStream] delta ignorado (index duplicado)', {
                  interaction: interactionForLog,
                  chunkIndex,
                });
              }
              return;
            }
            const lastIndex = baseEntry.lastChunkIndex ?? lastSeenChunkIndex;
            if (lastIndex !== null && chunkIndex < lastIndex) {
              if (isDev) {
                console.debug('[useEcoStream] delta ignorado (fora de ordem)', {
                  interaction: interactionForLog,
                  identifier,
                  chunk,
                  chunkIndex,
                  lastIndex,
                });
              }
              return;
            }
            baseEntry.seenIndexes.add(chunkIndex);
            baseEntry.lastChunkIndex = chunkIndex;
            lastSeenChunkIndex = chunkIndex;
          }

          if (!baseEntry.firstChunkLogged) {
            console.debug('[STREAM]', interactionForLog, 'first-chunk');
            baseEntry.firstChunkLogged = true;
            setDigitando(false);
          }

          console.debug('[STREAM]', interactionForLog, 'chunk', chunkIndex ?? -1, chunk.length);

          const previousBuffer = baseEntry.buffer ?? '';
          const nextBuffer = smartJoin(previousBuffer, chunk);

          aggregatedEcoTextRaw = nextBuffer;
          aggregatedEcoText = nextBuffer;
          baseEntry.buffer = nextBuffer;
          if (nextBuffer.length > 0) {
            setDigitando(false);
          }

          const patch: Partial<ChatMessageType> = {
            text: nextBuffer.length > 0 ? nextBuffer : ' ',
            content: nextBuffer,
            streaming: true,
            status: 'streaming',
          };

          if (!ecoMessageCreated) {
            if (nextBuffer.length === 0) {
              mergePendingPatch({ streaming: true });
              return;
            }
            if (
              chunkIndex !== null &&
              chunkIndex > 0 &&
              baseEntry.createdAtChunkIndex == null
            ) {
              mergePendingPatch(patch);
              return;
            }
            createEcoMessageIfNeeded(patch, chunkIndex);
            return;
          }

          patchEcoMessage(patch, {
            allowContentUpdate: true,
            patchSource: 'useEcoStream:chunk',
          });
        };

        const finalizeMessage = () => {
          if (!ecoMessageId && !resolvedEcoMessageId) return;
          patchEcoMessage(
            { streaming: false, status: 'final' },
            { allowedKeys: ['streaming', 'status'], patchSource: 'useEcoStream:finalize' },
          );
        };

        const showStreamError = (message: string) => {
          setErroApi(message);
          createEcoMessageIfNeeded();
          patchEcoMessage(
            { streaming: false, status: 'error' },
            { allowedKeys: ['streaming', 'status'], patchSource: 'useEcoStream:error' },
          );
          setDigitando(false);
          activity?.onError(message);
        };

        const extractEventText = (event: EcoSseEvent, fallback?: string) => {
          if (!event || event.type !== 'chunk') {
            return '';
          }
          const payload = event.payload as Record<string, unknown> | undefined;
          const candidates = [
            payload?.delta,
            payload?.text,
            payload?.content,
            event?.text,
            fallback,
            payload?.response,
          ];
          for (const candidate of candidates) {
            const str = flattenToString(candidate);
            if (str.length > 0) return str;
          }
          return '';
        };

        const logSseEvent = (event: EcoSseEvent) => {
          if (!isDev) return;
          try {
            console.debug('[useEcoStream] event', event.type, event);
          } catch {
            /* noop */
          }
        };

        const trackEventContext = (event: EcoSseEvent) => {
          updateInteractionId(event);
          updateMessageIdFrom(event);
          if (event?.payload) {
            updateInteractionId(event.payload);
            updateMessageIdFrom(event.payload);
          }
          if (event?.metadata) {
            updateInteractionId(event.metadata);
            updateMessageIdFrom(event.metadata);
          }
          if ((event as any)?.memory) {
            const memoryPayload = (event as any).memory;
            updateInteractionId(memoryPayload);
            updateMessageIdFrom(memoryPayload);
          }
        };

        const ensurePromptReadySignal = () => {
          if (!promptReadySignalSent) {
            dispatchSignal('prompt_ready');
            promptReadySignalSent = true;
          }
          if (promptReadyAt === undefined) {
            promptReadyAt = getNow();
          }
        };

        const ensureFirstTokenSignal = () => {
          ensurePromptReadySignal();
          if (!firstTokenSignalSent) {
            dispatchSignal('first_token');
            firstTokenSignalSent = true;
          }
          if (firstTokenAt === undefined) {
            firstTokenAt = getNow();
          }
        };

        const ensureDoneSignal = () => {
          ensureFirstTokenSignal();
          if (!doneSignalSent) {
            dispatchSignal('done');
            doneSignalSent = true;
          }
        };

        const handlePromptReadyEvent = (event: EcoSseEvent) => {
          if (guardSupersededEvent('prompt_ready', event)) return;
          logSseEvent(event);
          trackEventContext(event);
          ensurePromptReadySignal();
          activity?.onPromptReady();
        };

        const handleLatencyEvent = (event: EcoSseEvent) => {
          if (guardSupersededEvent('latency', event)) return;
          logSseEvent(event);
          trackEventContext(event);
          if (typeof event.latencyMs === 'number') {
            latencyFromStream = event.latencyMs;
            patchEcoMessage(
              { latencyMs: event.latencyMs },
              { allowedKeys: ['latencyMs'], patchSource: 'useEcoStream:latency' },
            );
          }
        };

        const handleFirstTokenEvent = (event: EcoSseEvent) => {
          if (guardSupersededEvent('first_token', event)) return;
          logSseEvent(event);
          trackEventContext(event);
          ensureFirstTokenSignal();
          clearPlaceholder();
          patchEcoMessage(
            { streaming: true, status: 'streaming' },
            { allowedKeys: ['streaming', 'status'], patchSource: 'useEcoStream:first-token' },
          );
          activity?.onToken();
          firstContentReceived = aggregatedEcoText.trim().length > 0;
          syncScroll();
        };

        const handleChunkEvent = (event: EcoSseEvent) => {
          if (guardSupersededEvent('chunk', event)) return;
          logSseEvent(event);
          trackEventContext(event);
          ensureFirstTokenSignal();
          const chunkText = extractEventText(event);
          if (!chunkText) return;
          if (isDev) {
            console.debug('[useEcoStream] chunk:event', {
              type: event.type,
              identifier: resolveChunkIdentifier(event),
              chunk: chunkText,
            });
          }
          if (aggregatedEcoText.length === 0) {
            clearPlaceholder();
          }
          const interactionForChunk =
            currentInteractionId ??
            findInteractionId(event) ??
            findInteractionId(event.payload) ??
            null;
          const chunkIndex = resolveChunkIndex(event);
          appendDelta(interactionForChunk, chunkIndex, chunkText, event);
          activity?.onToken();
          if (!firstContentReceived && aggregatedEcoText.trim().length > 0) {
            firstContentReceived = true;
          }
          syncScroll();
        };

        const handleMetaEvent = (event: EcoSseEvent) => {
          if (guardSupersededEvent('meta', event)) return;
          logSseEvent(event);
          trackEventContext(event);
          const meta = event.metadata ?? event.payload;
          if (event.type === 'meta_pending') {
            pendingMetadata = meta;
          } else {
            latestMetadata = meta;
          }
          patchEcoMessage(
            { metadata: meta },
            { allowedKeys: ['metadata'], patchSource: 'useEcoStream:meta' },
          );
          if (event.type !== 'meta_pending') {
            trackMemoryIfSignificant(meta);
          }
        };

        const handleMemorySavedEvent = (event: EcoSseEvent) => {
          if (guardSupersededEvent('memory_saved', event)) return;
          logSseEvent(event);
          trackEventContext(event);
          const memoria =
            event.memory ??
            (event.payload as any)?.memory ??
            (event.payload as any)?.memoria ??
            event.payload;
          memoryFromStream = memoria;
          if (
            (event.payload as any)?.primeiraMemoriaSignificativa ||
            (event.payload as any)?.primeira
          ) {
            primeiraMemoriaFlag = true;
          }
          patchEcoMessage(
            { memory: memoria },
            { allowedKeys: ['memory'], patchSource: 'useEcoStream:memory' },
          );
          trackMemoryIfSignificant(memoria);
        };

        const handleDoneEvent = (event: EcoSseEvent) => {
          if (guardSupersededEvent('done', event)) return;
          logSseEvent(event);
          trackEventContext(event);
          const doneInteraction =
            currentInteractionId ??
            findInteractionId(event) ??
            findInteractionId(event.payload) ??
            null;
          console.debug('[STREAM]', doneInteraction ?? 'pending', 'done');
          ensureDoneSignal();
          setDigitando(false);
          if (doneAt === undefined) {
            doneAt = getNow();
          }
          donePayload = event.payload;
          markStreamDone();

          const fromControlChannel = event.channel === 'control';
          const meta =
            event.metadata ??
            latestMetadata ??
            pendingMetadata ??
            (event.payload &&
            typeof event.payload === 'object' &&
            ((event.payload as any).response !== undefined ||
              (event.payload as any).metadata !== undefined)
              ? (event.payload as any).response ?? (event.payload as any).metadata
              : undefined);

          if (!fromControlChannel && meta !== undefined) {
            latestMetadata = meta;
            patchEcoMessage(
              {
                metadata: meta,
                donePayload: event.payload,
                streaming: false,
                status: 'final',
              },
              {
                allowedKeys: ['metadata', 'donePayload', 'streaming', 'status'],
                patchSource: 'useEcoStream:done-meta',
              },
            );
            trackMemoryIfSignificant(meta);
          } else if (!fromControlChannel && event.payload !== undefined) {
            patchEcoMessage(
              { donePayload: event.payload, streaming: false, status: 'final' },
              {
                allowedKeys: ['donePayload', 'streaming', 'status'],
                patchSource: 'useEcoStream:done-meta',
              },
            );
          } else if (fromControlChannel) {
            finalizeMessage();
          }

          if (
            (event.payload as any)?.primeiraMemoriaSignificativa ||
            (event.payload as any)?.primeira
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
            (event.payload as any)?.usage ??
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
            mensagem_id: persistedMensagemId ?? clientMessageId,
            auth: isAuthenticated,
            latency_ms: latencyMs,
            sse_tokens: completionTokens ?? 0,
            isGuest,
            ...(isGuest ? { guestId } : {}),
          });
          resetEcoMessageTracking();
        };

        const handlers: EcoEventHandlers = {
          onPromptReady: handlePromptReadyEvent,
          onFirstToken: handleFirstTokenEvent,
          onChunk: handleChunkEvent,
          onMeta: handleMetaEvent,
          onMemorySaved: handleMemorySavedEvent,
          onLatency: handleLatencyEvent,
          onDone: handleDoneEvent,
          onError: (error) => {
            if (doneAt === undefined) {
              doneAt = getNow();
            }
            setDigitando(false);
            markStreamDone();
            if (!streamErrorMessage && typeof error?.message === 'string') {
              streamErrorMessage = error.message;
            }
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
        // 👇 Fluxo principal de envio via SSE
        // ------------------------------
        const resposta = await enviarMensagemParaEco(
          mensagensComContexto,
          userName,
          shouldPersist ? (authUserId as string) : undefined,
          clientHour,
          clientTz,
          handlers,
          {
            guestId,
            isGuest,
            signal: controller.signal as AbortSignal,
            stream: true,
            clientMessageId,
          }
        );
        // ------------------------------

        updateInteractionId(resposta);
        updateMessageIdFrom(resposta);
        if (resposta?.metadata) {
          updateInteractionId(resposta.metadata);
          updateMessageIdFrom(resposta.metadata);
        }
        if (resposta?.done) {
          updateInteractionId(resposta.done);
          updateMessageIdFrom(resposta.done);
        }

          if (resposta?.aborted) {
            markStreamDone();
            resetEcoMessageTracking({ removeIfEmpty: aggregatedEcoText.trim().length === 0 });
            updatePassiveSignalInteractionId(null);
            return;
          }

        const finalTextRaw = flattenToString(
          resposta?.text ?? aggregatedEcoTextRaw ?? aggregatedEcoText ?? '',
        );
        const finalText = finalTextRaw ? sanitizeEcoText(finalTextRaw) : '';
        const noTextFromStream = resposta?.noTextReceived === true;
          const finalMetadata =
            latestMetadata ||
            pendingMetadata ||
            (resposta?.metadata && typeof resposta.metadata === 'object' ? resposta.metadata : undefined) ||
            (resposta?.done && typeof resposta.done === 'object' ? resposta.done : undefined);
          updateInteractionId(finalMetadata);

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
            let reusedExisting = false;
            if (currentInteractionId) {
              const normalizedInteractionId = currentInteractionId.trim();
              if (normalizedInteractionId) {
                const existingIndex = messagesRef.current.findIndex((message) => {
                  if (!message) return false;
                  const candidateInteraction =
                    (typeof message.interaction_id === 'string' && message.interaction_id.trim()) ||
                    (typeof message.interactionId === 'string' && message.interactionId.trim()) ||
                    '';
                  return candidateInteraction === normalizedInteractionId;
                });
                if (existingIndex >= 0) {
                  const existingMessage = messagesRef.current[existingIndex];
                  const existingId =
                    (typeof existingMessage?.message_id === 'string' && existingMessage.message_id.trim()) ||
                    (typeof existingMessage?.id === 'string' && existingMessage.id.trim()) ||
                    uuidv4();
                  resolvedEcoMessageId = existingId;
                  ecoMessageId = existingMessage?.id ?? existingId;
                  ecoMessageCreated = true;
                  reusedExisting = true;
                  patchEcoMessage(
                    {
                      text: finalText || NO_TEXT_WARNING,
                      content: finalText || NO_TEXT_WARNING,
                      streaming: false,
                      status: 'final',
                    },
                    {
                      allowContentUpdate: true,
                      patchSource: 'useEcoStream:done',
                    },
                  );
                  const patch: Partial<ChatMessageType> = {};
                  if (finalMetadata !== undefined) patch.metadata = finalMetadata;
                  if (resposta?.done) patch.donePayload = resposta.done;
                  if (memoryFromStream) patch.memory = memoryFromStream;
                  if (typeof latencyFromStream === 'number') patch.latencyMs = latencyFromStream;
                  if (continuity) patch.continuity = continuity;
                  if (Object.keys(patch).length > 0) {
                    patchEcoMessage(patch, {
                      allowContentUpdate: true,
                      patchSource: 'useEcoStream:done-meta',
                    });
                  }
                  if (continuity) {
                    const targetId = resolvedEcoMessageId ?? existingId;
                    if (targetId) {
                      trackContinuityEvent(continuity, targetId);
                    }
                  }
                  registerDraftForInteraction(normalizedInteractionId);
                }
              }
            }

            if (!reusedExisting) {
              const newId = uuidv4();
              resolvedEcoMessageId = newId;
              recordMessageId(newId);
              const ecoMessage: ChatMessageType = {
                id: newId,
                client_message_id: clientMessageId,
                text: finalText || NO_TEXT_WARNING,
                content: finalText || NO_TEXT_WARNING,
                sender: 'eco',
                role: 'assistant',
                streaming: false,
                status: 'final',
                ...(currentInteractionId
                  ? { interaction_id: currentInteractionId, interactionId: currentInteractionId }
                  : {}),
                ...(finalMetadata !== undefined ? { metadata: finalMetadata } : {}),
                ...(resposta?.done ? { donePayload: resposta.done } : {}),
                ...(memoryFromStream ? { memory: memoryFromStream } : {}),
                ...(typeof latencyFromStream === 'number' ? { latencyMs: latencyFromStream } : {}),
                ...(continuity ? { continuity } : {}),
              };
              upsertMessage(ecoMessage, {
                allowContentUpdate: true,
                patchSource: 'useEcoStream:done-create',
              });
              messageIdsForTurn.add(newId);
              trackContinuityEvent(continuity, newId);
            }
          }
        } else {
          if (finalText || noTextFromStream) {
            patchEcoMessage(
              {
                text: finalText || NO_TEXT_WARNING,
                content: finalText || NO_TEXT_WARNING,
                streaming: false,
                status: 'final',
              },
              {
                allowContentUpdate: true,
                patchSource: 'useEcoStream:done',
              },
            );
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
          patch.status = 'final';
          if (Object.keys(patch).length > 0) {
            if (currentInteractionId) {
              patch.interaction_id = currentInteractionId;
              patch.interactionId = currentInteractionId;
            }
            patchEcoMessage(patch, {
              allowContentUpdate: true,
              patchSource: 'useEcoStream:done-meta',
            });
          }
          const targetId = resolvedEcoMessageId ?? ecoMessageId;
          if (continuity && targetId) {
            trackContinuityEvent(continuity, targetId);
          }
        }

        upsertMessage(
          {
            id: clientMessageId,
            client_message_id: clientMessageId,
            status: 'final',
          },
          {
            allowedKeys: ['status', 'server_ids', 'message_id', 'updatedAt', 'createdAt', 'flags', 'audioUrl'],
            patchSource: 'useEcoStream:done',
          },
        );

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
          patchEcoMessage(
            { deepQuestion: true },
            { allowedKeys: ['deepQuestion'], patchSource: 'useEcoStream:deep-question' },
          );
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
                mensagemId: clientMessageId,
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
          let displayMessage =
            err instanceof EcoApiError ? err.message : err?.message || 'Falha ao enviar mensagem.';
          const friendly = resolveFriendlyNetworkError(err);

          if (err instanceof MissingUserIdError) {
            displayMessage = 'Faça login para continuar a conversa com a Eco.';
            showToast('Faça login para continuar', 'Entre para manter o bate-papo com a Eco.');
            if (onUnauthorized) {
              try {
                onUnauthorized();
              } catch (callbackError) {
                if (isDev) {
                  console.warn('[ChatPage] onUnauthorized falhou', callbackError);
                }
              }
            }
          } else if (err instanceof EcoApiError) {
            displayMessage = err.message || displayMessage;

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
            }
          } else if (friendly.type !== 'other' && friendly.message) {
            displayMessage = friendly.message;
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
        updatePassiveSignalInteractionId(null);

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
        if (activeStreamRef.current.controller === controller) {
          activeStreamRef.current = { controller: null, streamId: null };
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
        guestId,
        isAtBottom,
        isGuest,
        onUnauthorized,
        isSending,
        scrollToBottom,
        setMessages,
        upsertMessage,
        sessionId,
        userId,
        userName,
        activity,
    ]
  );

  return { handleSendMessage, digitando, erroApi, setErroApi, pending: isSending } as const;
};

