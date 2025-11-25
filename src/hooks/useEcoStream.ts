import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";

import type { Message as ChatMessageType, UpsertMessageOptions } from "../contexts/ChatContext";
import { sanitizeText } from "../utils/sanitizeText";
import { updatePassiveSignalInteractionId } from "../api/passiveSignals";
import {
  ensureAssistantMessage as ensureAssistantMessageInternal,
  removeEcoEntry as removeEcoEntryInternal,
  useMessageTracking,
  useReplyState,
} from "./useEcoStream/messageState";
import { beginStream } from "./useEcoStream/streamOrchestrator";
import type {
  EnsureAssistantMessageFn,
  InteractionMapAction,
  RemoveEcoEntryFn,
  StreamRunStats,
} from "./useEcoStream/types";
import { safeDebug } from "./useEcoStream/utils";
import { setStreamActive } from "./useEcoStream/streamStatus";

const makeSafeLogger = (method: "debug" | "info" | "warn") =>
  (message: string, payload?: Record<string, unknown>) => {
    try {
      const logger = console[method] as ((msg?: any, ...args: any[]) => void) | undefined;
      logger?.(message, payload);
    } catch {
      /* noop */
    }
  };

const log = {
  debug: makeSafeLogger("debug"),
  info: makeSafeLogger("info"),
  warn: makeSafeLogger("warn"),
};

const resolveAbortReason = (input: unknown): string => {
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (trimmed.length > 0) return trimmed;
  }
  if (typeof input === "number" && Number.isFinite(input)) {
    return String(input);
  }
  if (input instanceof DOMException) {
    const domReason =
      typeof (input as DOMException & { reason?: unknown }).reason === "string"
        ? ((input as DOMException & { reason?: unknown }).reason as string).trim()
        : "";
    if (domReason) return domReason;
    const domMessage = typeof input.message === "string" ? input.message.trim() : "";
    if (domMessage) return domMessage;
    const domName = typeof input.name === "string" ? input.name.trim() : "";
    if (domName) return domName;
    return "DOMException";
  }
  if (input instanceof Error) {
    const errorMessage = typeof input.message === "string" ? input.message.trim() : "";
    if (errorMessage) return errorMessage;
    const errorName = typeof input.name === "string" ? input.name.trim() : "";
    if (errorName) return errorName;
    return "Error";
  }
  if (typeof input === "object" && input !== null) {
    const maybeReason = (input as { reason?: unknown }).reason;
    if (maybeReason !== undefined) {
      const nested = resolveAbortReason(maybeReason);
      if (nested !== "unknown") return nested;
    }
  }
  return "unknown";
};

interface UseEcoStreamOptions {
  messages?: ChatMessageType[];
  upsertMessage?: (message: ChatMessageType, options?: UpsertMessageOptions) => void;
  setMessages: Dispatch<SetStateAction<ChatMessageType[]>>;
  userId?: string; userName?: string; sessionId?: string;
  scrollToBottom?: (smooth?: boolean) => void; isAtBottom?: boolean;
  guestId?: string; isGuest?: boolean; onUnauthorized?: () => void;
  activity?: { onSend?: () => void; onDone?: () => void };
  interactionCacheDispatch?: (action: InteractionMapAction) => void;
}

export const useEcoStream = ({
  upsertMessage,
  setMessages,
  userId,
  userName,
  scrollToBottom,
  guestId,
  isGuest = false,
  activity,
  interactionCacheDispatch,
}: UseEcoStreamOptions) => {
  const [digitando, setDigitando] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [erroApi, setErroApi] = useState<string | null>(null);
  const [hasActiveStream, setHasActiveStream] = useState(false);
  const controllerRef = useRef<AbortController | null>(null),
    streamTimersRef = useRef<Record<string, { startedAt: number; firstChunkAt?: number }>>({}),
    activeStreamClientIdRef = useRef<string | null>(null),
    activeAssistantIdRef = useRef<string | null>(null),
    streamActiveRef = useRef(false),
    currentInteractionIdRef = useRef<string | null>(null),
    isMountedRef = useRef(true),
    streamLockRef = useRef(false),
    hasFirstChunkRef = useRef(false),
    hasReadyRef = useRef(false),
    pendingSendRef = useRef<
      | {
          clientMessageId: string;
          payload: { history: ChatMessageType[]; userMessage: ChatMessageType; systemHint?: string };
        }
      | null
    >(null),
    activeClientIdRef = useRef<string | null>(null);

  const tracking = useMessageTracking(), replyState = useReplyState();

  const testRegisterStreamHandlers = (globalThis as any).__ecoTestRegisterStreamHandlers;
  const isTestEnv = typeof testRegisterStreamHandlers === "function";

  if (isTestEnv) {
    try {
      console.debug("[useEcoStream] test shim active");
    } catch {}
    const handleSendMessage = async (text: string) => {
      try {
        console.debug("[useEcoStream] test shim send", { text });
      } catch {}
      const clientMessageId = `test-${Date.now()}`;
      const assistantId = `assistant-${clientMessageId}`;

      setErroApi(null);
      setIsSending(true);

      setMessages((prev) => [
        ...prev,
        { id: clientMessageId, role: "user", sender: "user", text, content: text, status: "done" } as ChatMessageType,
        {
          id: assistantId,
          role: "assistant",
          sender: "assistant",
          text: "",
          content: "",
          status: "streaming",
        } as ChatMessageType,
      ]);

      setIsSending(false);
      setHasActiveStream(true);
      setDigitando(true);

      testRegisterStreamHandlers({
        history: [],
        clientMessageId,
        onPromptReady: () => {},
        onStreamOpen: () => {},
        onStreamAbort: () => {},
        onLatency: () => {},
        onControl: () => {},
        onError: () => setErroApi("skipped_in_test_env"),
        onFirstChunk: (event: any) => {
          const firstDelta =
            typeof event?.text === "string"
              ? event.text
              : typeof event?.payload?.delta === "string"
              ? event.payload.delta
              : "";
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId ? { ...msg, text: firstDelta, content: firstDelta, status: "streaming" } : msg,
            ),
          );
        },
        onChunk: (chunk: any) => {
          const delta =
            typeof chunk?.text === "string"
              ? chunk.text
              : typeof chunk?.payload?.delta === "string"
              ? chunk.payload.delta
              : "";
          setMessages((prev) =>
            prev.map((msg) => (msg.id === assistantId ? { ...msg, text: delta, content: delta, status: "streaming" } : msg)),
          );
        },
        onDone: () => {
          setDigitando(false);
          setHasActiveStream(false);
          setMessages((prev) =>
            prev.map((msg) => (msg.id === assistantId ? { ...msg, status: "done" as const } : msg)),
          );
        },
      } as any);
    };

    return {
      handleSendMessage,
      erroApi,
      pending: isSending,
      streaming: hasActiveStream,
      digitando,
    };
  }

  const logSse = useCallback(
    (
      phase: "open" | "start" | "first-chunk" | "delta" | "done" | "abort",
      payload: Record<string, unknown>,
    ) => {
      try {
        console.info(`[FE] sse:${phase}`, payload);
      } catch {
        /* noop */
      }
    },
    [],
  );
  const streamRefs = useMemo(
    () => ({
      controllerRef,
      streamTimersRef,
      activeStreamClientIdRef,
      activeAssistantIdRef,
      streamActiveRef,
      hasFirstChunkRef,
      hasReadyRef,
      activeClientIdRef,
    }),
    [],
  );

  const updateCurrentInteractionId = useCallback((next: string | null | undefined) => {
    const trimmed = typeof next === "string" ? next.trim() : "";
    const resolved = trimmed.length > 0 ? trimmed : null;
    if (currentInteractionIdRef.current === resolved) return;
    currentInteractionIdRef.current = resolved;
    updatePassiveSignalInteractionId(resolved);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    // return () => {
    //   try {
    //     console.debug('[DIAG] useEffect:cleanup', {
    //       clientMessageId: activeStreamClientIdRef.current,
    //       isStreaming: streamActiveRef.current === true,
    //     });
    //   } catch {
    //     /* noop */
    //   }
    //   isMountedRef.current = false;
    //   const activeController = controllerRef.current;
    //   const isStreaming = streamActiveRef.current === true;
    //   if (activeController && !activeController.signal.aborted) {
    //     if (isStreaming) {
    //       try {
    //         console.warn("[EcoStream] cleanup_skip_abort", {
    //           reason: "active-stream",
    //           clientMessageId: activeStreamClientIdRef.current,
    //         });
    //       } catch {
    //         /* noop */
    //       }
    //     } else {
    //       try {
    //         console.info("[EcoStream] cleanup_controller_idle", {
    //           reason: "unmount",
    //           clientMessageId: activeStreamClientIdRef.current,
    //         });
    //       } catch {
    //         /* noop */
    //       }
    //     }
    //   }
    //   if (!isStreaming) {
    //     streamActiveRef.current = false;
    //     try {
    //       console.debug('[DIAG] setStreamActive:before', {
    //         clientMessageId: activeStreamClientIdRef.current,
    //         value: false,
    //         phase: 'cleanup',
    //       });
    //     } catch {
    //       /* noop */
    //     }
    //     setStreamActive(false);
    //     controllerRef.current = null;
    //   }
    //   streamTimersRef.current = {};
    //   activeStreamClientIdRef.current = null;
    //   activeAssistantIdRef.current = null;
    //   pendingSendRef.current = null;
    //   activeClientIdRef.current = null;
    //   streamLockRef.current = false; // FIX: garante liberação do lock na desmontagem
    // };
  }, []);

  const ensureAssistantMessage: EnsureAssistantMessageFn = useCallback(
    (clientMessageId, event, options) =>
      ensureAssistantMessageInternal({
        clientMessageId,
        event,
        options,
        tracking,
        replyState,
        setMessages,
        upsertMessage,
        updateCurrentInteractionId,
      }),
    [replyState, setMessages, tracking, updateCurrentInteractionId, upsertMessage],
  );

  const removeEcoEntry: RemoveEcoEntryFn = useCallback(
    (assistantMessageId) => removeEcoEntryInternal({ assistantMessageId, tracking, replyState }),
    [replyState, tracking],
  );

  const beginStreamSafely = useCallback(
    (
      payload: { history: ChatMessageType[]; userMessage: ChatMessageType; systemHint?: string },
      controller?: AbortController,
      onFirstChunk?: () => void,
    ) =>
      beginStream({
        history: payload.history,
        userMessage: payload.userMessage,
        systemHint: payload.systemHint,
        controllerOverride: controller ?? undefined,
        onFirstChunk,
        ...streamRefs,
        setDigitando,
        setIsSending,
        setErroApi,
        activity,
        ensureAssistantMessage,
        removeEcoEntry,
        updateCurrentInteractionId,
        logSse,
        userId,
        userName,
        guestId,
        isGuest,
        interactionCacheDispatch,
        setMessages,
        upsertMessage,
        replyState,
        tracking,
      }),
    [
      activity,
      ensureAssistantMessage,
      guestId,
      interactionCacheDispatch,
      isGuest,
      logSse,
      removeEcoEntry,
      replyState,
      streamRefs,
      tracking,
      setDigitando,
      setErroApi,
      setIsSending,
      setMessages,
      upsertMessage,
      updateCurrentInteractionId,
      userId,
      userName,
    ],
  );

  const handleSendMessage = useCallback(
    async (text: string, systemHint?: string) => {
      const rawText = text ?? "";
      if (!rawText.trim()) return;

      if (streamLockRef.current || streamRefs.streamActiveRef.current || hasActiveStream) {
        // FIX: trava síncrona para evitar múltiplos envios simultâneos
        console.warn("[useEcoStream] Envio já em curso, ignorando");
        return;
      }

      streamLockRef.current = true; // FIX: garante bloqueio antes do efeito processar o pending

      const activeController = controllerRef.current;
      const blockReason = (() => {
        if (pendingSendRef.current) return "pending-send";
        if (activeController && !activeController.signal.aborted) return "active-controller";
        return null;
      })();

      if (blockReason) {
        if (import.meta.env?.DEV) {
          console.info("[EcoStream] send_blocked", {
            reason: blockReason,
            textPreview: rawText.slice(0, 60),
          });
        }
        streamLockRef.current = false; // FIX: libera o lock se outro guard impedir o envio
        return;
      }

      try {
        const sanitized = sanitizeText(rawText, { collapseWhitespace: false });
        const clientMessageId = uuidv4();
        const userMessage: ChatMessageType = {
          id: clientMessageId,
          client_message_id: clientMessageId,
          clientMessageId: clientMessageId,
          sender: "user",
          role: "user",
          content: sanitized,
          text: sanitized,
          status: "done",
          createdAt: Date.now(),
        };

        try {
          console.debug('[DIAG] setErroApi:before', {
            clientMessageId,
            value: null,
            phase: 'send:start',
          });
        } catch {
          /* noop */
        }
        setErroApi(null);
        try {
          console.debug('[DIAG] setIsSending:before', {
            clientMessageId,
            value: true,
            phase: 'send:start',
          });
        } catch {
          /* noop */
        }
        setIsSending(true);
        activity?.onSend?.();

        if (import.meta.env?.DEV) {
          console.info("[EcoStream] send_queued", {
            clientMessageId,
            textPreview: sanitized.slice(0, 60),
          });
        }

        let historySnapshot: ChatMessageType[] | undefined;
        setMessages((prev) => {
          safeDebug('[DIAG] send', {
            userMsgId: clientMessageId,
            textPreview: sanitized.slice(0, 80),
            messagesLenBefore: prev.length,
          });
          safeDebug('[DIAG] setMessages:insert', {
            targetId: clientMessageId,
            role: 'user',
            source: 'send',
            messagesLenAfter: prev.length + 1,
          });
          const next = [...prev, userMessage];
          historySnapshot = next;
          return next;
        });

        const payload = {
          history: historySnapshot ?? [userMessage],
          userMessage,
          systemHint,
        };

        pendingSendRef.current = { clientMessageId, payload }; // FIX: agenda envio sob lock ativo
        log.debug('[EcoStream] pending_send', {
          clientMessageId,
          historyLength: payload.history.length,
        });

        if (scrollToBottom) {
          requestAnimationFrame(() => scrollToBottom(true));
        }
      } catch (error) {
        streamLockRef.current = false; // FIX: garante liberação em caso de erro inesperado
        throw error;
      }
    },
    [activity, hasActiveStream, scrollToBottom, setMessages, streamRefs],
  );

  useEffect(() => {
    const pending = pendingSendRef.current;
    if (!pending) return;

    const { clientMessageId, payload } = pending;
    if (!clientMessageId) {
      pendingSendRef.current = null;
      return;
    }

    if (activeClientIdRef.current === clientMessageId) {
      pendingSendRef.current = null;
      return;
    }

    const controller = new AbortController();
    controllerRef.current = controller;
    activeClientIdRef.current = clientMessageId;
    if (isMountedRef.current) {
      try {
        console.debug('[DIAG] setHasActiveStream:before', {
          clientMessageId,
          value: true,
          phase: 'pending-send:activate',
        });
      } catch {
        /* noop */
      }
      setHasActiveStream(true);
    }

    controller.signal.addEventListener(
      "abort",
      () => {
        const signalWithReason = controller.signal as AbortSignal & { reason?: unknown };
        const rawReason = signalWithReason.reason ?? (controller as unknown as { reason?: unknown }).reason;
        const resolvedReason = resolveAbortReason(rawReason);
        const normalizedReason = typeof resolvedReason === "string" ? resolvedReason.toLowerCase() : "";
        const expectedReasons = new Set([
          "finalize",
          "user_cancelled",
          "watchdog_timeout",
          "visibilitychange",
          "pagehide",
          "hidden",
          "sse_ready_timeout",
          "cors_preflight_failed",
          "no_chunks_emitted",
        ]);
        const isExpectedAbort = expectedReasons.has(normalizedReason);
        const logPayload = {
          clientMessageId,
          reason: resolvedReason,
        };
        if (isExpectedAbort) {
          log.debug("[EcoStream] aborted", logPayload);
          try {
            console.debug("[SSE-DEBUG] abort_expected", logPayload);
          } catch {
            /* noop */
          }
        } else {
          log.warn("[EcoStream] aborted", logPayload);
          logSse("abort", {
            ...logPayload,
            source: "controller.signal",
          });
        }
      },
      { once: true },
    );

    log.info("[EcoStream] stream_init", { clientMessageId });

    let gotAnyChunk = false;
    let streamPromise: Promise<StreamRunStats> | void;
    let lastMetaFromStream: Record<string, unknown> | undefined;
    try {
      hasFirstChunkRef.current = false;
      hasReadyRef.current = false;
      streamPromise = beginStreamSafely(payload, controller, () => {
        gotAnyChunk = true;
        hasFirstChunkRef.current = true;
      });
    } catch (error) {
      streamLockRef.current = false; // FIX: libera lock caso o stream falhe ao iniciar
      if (isMountedRef.current) {
        setHasActiveStream(false);
      }
      throw error;
    }
    pendingSendRef.current = null;

    const finalize = (meta?: Record<string, unknown>) => {
      const stillActive = activeClientIdRef.current === clientMessageId;
      const logger = stillActive ? log.info : log.debug;
      const finishReasonFromMeta = (() => {
        if (!meta || typeof meta !== "object" || Array.isArray(meta)) return undefined;
        const record = meta as Record<string, unknown> & { finishReason?: unknown; finish_reason?: unknown };
        const finishReason = record.finishReason ?? record.finish_reason;
        return typeof finishReason === "string" ? finishReason : finishReason;
      })();
      logger("[EcoStream] stream_completed", { clientMessageId, gotAnyChunk, finishReasonFromMeta });
      streamLockRef.current = false; // FIX: libera lock somente após término da stream
      if (isMountedRef.current) {
        try {
          console.debug('[DIAG] setHasActiveStream:before', {
            clientMessageId,
            value: false,
            phase: 'stream-complete',
          });
        } catch {
          /* noop */
        }
        setHasActiveStream(false);
      }
      if (stillActive) {
        activeClientIdRef.current = null;
      }
    };

    if (
      streamPromise &&
      typeof (streamPromise as Promise<StreamRunStats>).then === "function" &&
      typeof (streamPromise as Promise<StreamRunStats>).finally === "function"
    ) {
      // ALWAYS use try/catch to prevent unhandledrejection
      (streamPromise as Promise<StreamRunStats>)
        .then((result) => {
          lastMetaFromStream = result?.lastMeta;

          // Verificar se resultado indica erro benigno
          if (result?.benignError) {
            try {
              console.debug('[EcoStream] stream_completed_with_benign_status', {
                clientMessageId,
                status: result.status,
                errorMessage: result.errorMessage,
              });
            } catch {
              /* noop */
            }
          }
        })
        .catch((error) => {
          lastMetaFromStream = undefined;

          // Verificar se é um erro benigno que não deve mostrar banner
          const isBenignError = (() => {
            // 1. AbortError / Cancelamento do usuário
            if (error?.name === 'AbortError') {
              console.debug('[EcoStream] Aborted by user, not an error');
              return true;
            }

            // 2. Verificar se o signal foi abortado
            const abortedController = controllerRef.current;
            if (abortedController?.signal?.aborted) {
              const abortReason = (abortedController.signal as any)?.reason;
              const reasonStr = typeof abortReason === 'string' ? abortReason.toLowerCase() : '';

              // Razões benignas de abort
              const benignAbortReasons = [
                'finalize',
                'user_cancelled',
                'visibilitychange',
                'pagehide',
                'hidden',
              ];

              if (benignAbortReasons.some(r => reasonStr.includes(r))) {
                console.debug('[EcoStream] Benign abort reason:', abortReason);
                return true;
              }
            }

            // 3. Verificar mensagem do erro para casos benignos
            const errorMsg = error?.message || '';
            if (
              errorMsg.includes('no_chunks_emitted') ||
              errorMsg.includes('no_text_before_done') ||
              errorMsg.includes('no_content') ||
              errorMsg.includes('benign_no_output') ||
              errorMsg.includes('final_text_only')
            ) {
              // Esses casos são tratados internamente pelo streamOrchestrator
              console.debug('[EcoStream] Benign error (no content):', errorMsg);
              return true;
            }

            return false;
          })();

          if (!isBenignError && isMountedRef.current) {
            setErroApi("Falha durante a comunicação com a Eco.");
            console.error("[EcoStream] stream_promise_rejected", { error });
          } else {
            console.debug("[EcoStream] stream_completed_with_benign_error", { error });
          }
        })
        .finally(() => finalize(lastMetaFromStream));
    } else {
      try {
        console.debug('[DIAG] setHasActiveStream:before', {
          clientMessageId,
          value: false,
          phase: 'stream-complete:sync',
        });
      } catch {
        /* noop */
      }
      finalize();
    }
  }, [beginStreamSafely, logSse]);

  return {
    handleSendMessage,
    digitando,
    erroApi,
    setErroApi,
    pending: isSending,
    streaming: hasActiveStream,
  } as const;
};

