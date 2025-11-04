/* -------------------------------------------------------------------------- */
/*  streamEvents.ts — correção de referência a toRecord (usa helper local)    */
/* -------------------------------------------------------------------------- */

// Helper local para normalizar qualquer valor em Record<string, unknown>
export const toRecordSafe = (input: unknown): Record<string, unknown> => {
  if (input && typeof input === "object" && !Array.isArray(input)) {
    return input as Record<string, unknown>;
  }
  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      /* não é JSON; segue */
    }
  }
  return {};
};

import type { Dispatch, MutableRefObject, SetStateAction } from "react";

import type {
  EcoStreamChunk,
  EcoStreamControlEvent,
  EcoStreamDoneEvent,
  EcoStreamPromptReadyEvent,
} from "../../../api/ecoStream";
import type {
  EnsureAssistantEventMeta,
  MessageTrackingRefs,
  ReplyStateController,
} from "../messageState";
import type { StreamRunStats, StreamSharedContext, RemoveEcoEntryFn } from "../types";

/* ------------------------------ Tipagens util ----------------------------- */

type PickStringFromRecords = (
  records: Array<Record<string, unknown> | undefined>,
  keys: string[],
) => string | undefined;

type BuildRecordChainFn = (event?: Record<string, unknown>) => Record<string, unknown>[];

type ExtractPayloadRecordFn = (event?: Record<string, unknown>) => Record<string, unknown> | undefined;

type CollectTextsFn = (payload: unknown) => string[] | undefined;

type RegisterNoContentFn = (reason: string) => void;

type EnsureAssistantForNoContentFn = (meta?: EnsureAssistantEventMeta) => string | null;

type HandleChunkFn = (chunk: EcoStreamChunk, context: StreamSharedContext) => void;

type HandlePromptReadyFn = (
  event: EcoStreamPromptReadyEvent | undefined,
  context: StreamSharedContext,
) => void;

type HandleControlFn = (event: EcoStreamControlEvent, context: StreamSharedContext) => void;

type DoneHandler = (
  context: StreamSharedContext & {
    event: EcoStreamDoneEvent | undefined;
    setErroApi: Dispatch<SetStateAction<string | null>>;
    removeEcoEntry: RemoveEcoEntryFn;
    assistantId: string;
  },
) => void;

type HandleStreamDoneFn = (rawEvent?: Record<string, unknown>, options?: { reason?: string }) => void;

type ExtractTextFn = (event: Record<string, unknown>) => string | undefined;

/* --------------------------------- Estados -------------------------------- */

type StreamState = {
  fallbackRequested: boolean;
  firstChunkDelivered: boolean;
  readyReceived: boolean;
};

type DoneState = { value: boolean };

type FatalErrorState = { current: Error | null };

/* --------------------------------- Logs SSE -------------------------------- */

type LogSseFn = (
  phase: "open" | "start" | "first-chunk" | "delta" | "done" | "abort",
  payload: Record<string, unknown>,
) => void;

/* -------------------- Conjuntos de dependências por handler -------------------- */

type ProcessChunkDeps = {
  controller: AbortController;
  streamState: StreamState;
  sharedContext: StreamSharedContext;
  streamStats: StreamRunStats;
  onFirstChunk?: (() => void) | null;
  clearFallbackGuardTimer: () => void;
  bumpFirstTokenWatchdog: () => void;
  bumpHeartbeatWatchdog: () => void;
  buildRecordChain: BuildRecordChainFn;
  extractPayloadRecord: ExtractPayloadRecordFn;
  pickStringFromRecords: PickStringFromRecords;
  handleChunk?: HandleChunkFn | null;
};

type PromptReadyDeps = {
  controller: AbortController;
  streamState: StreamState;
  markPromptReadyWatchdog: () => void;
  onReady?: (() => void) | null;
  buildRecordChain: BuildRecordChainFn;
  pickStringFromRecords: PickStringFromRecords;
  extractPayloadRecord: ExtractPayloadRecordFn;
  diag: (...args: unknown[]) => void;
  normalizedClientId: string;
  handlePromptReady?: HandlePromptReadyFn | null;
  sharedContext: StreamSharedContext;
};

type ControlDeps = {
  controller: AbortController;
  streamState: StreamState;
  buildRecordChain: BuildRecordChainFn;
  extractPayloadRecord: ExtractPayloadRecordFn;
  pickStringFromRecords: PickStringFromRecords;
  bumpHeartbeatWatchdog: () => void;
  diag: (...args: unknown[]) => void;
  normalizedClientId: string;
  handleControl?: HandleControlFn | null;
  sharedContext: StreamSharedContext;
};

type MessageDeps = {
  controller: AbortController;
  streamState: StreamState;
  extractPayloadRecord: ExtractPayloadRecordFn;
  buildRecordChain: BuildRecordChainFn;
  pickStringFromRecords: PickStringFromRecords;
  collectTexts: CollectTextsFn;
  sharedContext: StreamSharedContext;
  streamStats: StreamRunStats;
  clearFallbackGuardTimer: () => void;
  bumpFirstTokenWatchdog: () => void;
  bumpHeartbeatWatchdog: () => void;
};

type DoneDeps = {
  clearTypingWatchdog: () => void;
  controller: AbortController;
  doneState: DoneState;
  clearWatchdog: () => void;
  streamActiveRef: MutableRefObject<boolean>;
  clientMessageId: string;
  setStreamActive: (value: boolean) => void;
  buildRecordChain: BuildRecordChainFn;
  pickStringFromRecords: PickStringFromRecords;
  extractPayloadRecord: ExtractPayloadRecordFn;
  streamTimersRef: MutableRefObject<Record<string, { startedAt: number; firstChunkAt?: number }>>;
  normalizedClientId: string;
  streamStats: StreamRunStats;
  sharedContext: StreamSharedContext;
  registerNoContent: RegisterNoContentFn;
  logSse: LogSseFn;
  ensureAssistantForNoContent: EnsureAssistantForNoContentFn;
  handleDone?: DoneHandler | null;
  setErroApi: Dispatch<SetStateAction<string | null>>;
  removeEcoEntry: RemoveEcoEntryFn;
  applyMetaToStreamStats: (streamStats: StreamRunStats, meta: Record<string, unknown> | undefined) => void;
  extractFinishReasonFromMeta: (event?: Record<string, unknown>) => string | undefined;
  // Novas dependências para o fluxo de retry
  collectTexts: CollectTextsFn;
  processChunk?: ((index: number, delta: string, rawEvent: Record<string, unknown>) => void) | null;
  retry: () => void;
  retriedNoChunk: boolean;
};

type ErrorDeps = {
  bumpHeartbeatWatchdog: () => void;
  buildRecordChain: BuildRecordChainFn;
  pickStringFromRecords: PickStringFromRecords;
  replyState: ReplyStateController;
  tracking: MessageTrackingRefs;
  clientMessageId: string;
  processChunk?: ((index: number, delta: string, rawEvent: Record<string, unknown>) => void) | null;
  sharedContext: StreamSharedContext;
  diag: (...args: unknown[]) => void;
  normalizedClientId: string;
  handleDone?: HandleStreamDoneFn | null;
  fatalErrorState: FatalErrorState;
  extractText: ExtractTextFn;
};

/* ============================= Handlers principais ============================= */

export const processChunk = ({
  controller,
  streamState,
  sharedContext,
  streamStats,
  onFirstChunk,
  clearFallbackGuardTimer,
  bumpFirstTokenWatchdog,
  bumpHeartbeatWatchdog,
  buildRecordChain,
  extractPayloadRecord,
  pickStringFromRecords,
  handleChunk,
}: ProcessChunkDeps) => {
  const chunkHandler = typeof handleChunk === "function" ? handleChunk : null;
  if (!chunkHandler) {
    try {
      console.debug("[SSE-DEBUG] onChunk missing");
    } catch {}
  }
  const firstChunkHandler = typeof onFirstChunk === "function" ? onFirstChunk : null;

  return (index: number, delta: string, rawEvent: Record<string, unknown>) => {
    if (controller.signal.aborted) return;
    if (streamState.fallbackRequested) return;

    const payloadRecord = extractPayloadRecord(rawEvent);
    const records = buildRecordChain(rawEvent);

    let effectiveDelta = typeof delta === "string" ? delta : "";
    let trimmedDelta = effectiveDelta.trim();

    if (!trimmedDelta) {
      const fallbackText =
        pickStringFromRecords(records, ["message", "detail", "reason", "warning", "warn"]) ??
        (() => {
          const payloadMessage =
            typeof payloadRecord === "object" && payloadRecord
              ? pickStringFromRecords([payloadRecord], ["message", "detail", "reason"])
              : undefined;
          return payloadMessage ?? undefined;
        })();

      const normalizedFallback = typeof fallbackText === "string" ? fallbackText.trim() : "";
      if (normalizedFallback) {
        const hasAlertFlag =
          (rawEvent as { error?: unknown }).error === true ||
          (rawEvent as { warn?: unknown }).warn === true ||
          (rawEvent as { warning?: unknown }).warning === true ||
          (payloadRecord as { error?: unknown })?.error === true ||
          (payloadRecord as { warn?: unknown })?.warn === true ||
          (payloadRecord as { warning?: unknown })?.warning === true;

        effectiveDelta = hasAlertFlag ? `⚠️ ${normalizedFallback}` : normalizedFallback;
        trimmedDelta = effectiveDelta.trim();
      }
    }

    if (!trimmedDelta) {
      bumpHeartbeatWatchdog();
      return;
    }

    sharedContext.hasFirstChunkRef.current = true;
    streamStats.gotAnyChunk = true;
    streamStats.aggregatedLength += effectiveDelta.length;

    if (!streamState.firstChunkDelivered) {
      streamState.firstChunkDelivered = true;
      clearFallbackGuardTimer();
      try {
        console.log("[SSE-DEBUG] first_chunk_received", {
          clientMessageId: sharedContext.clientMessageId,
          streamId: sharedContext.streamStats.streamId ?? null,
        });
      } catch {}
      if (firstChunkHandler) {
        try {
          firstChunkHandler();
        } catch (error) {
          try {
            console.warn("[SSE-DEBUG] onFirstChunk_error", { error });
          } catch {}
        }
      }
    } else {
      clearFallbackGuardTimer();
    }

    bumpFirstTokenWatchdog();

    try {
      console.debug("[SSE] chunk", {
        idx: index,
        len: effectiveDelta.length,
        sample: effectiveDelta.slice(0, 40),
      });
    } catch {}

    const metadataRecord =
      toRecordSafe((payloadRecord as any)?.metadata) ?? toRecordSafe((rawEvent as any)?.metadata);

    const interactionId =
      pickStringFromRecords(records, ["interaction_id", "interactionId", "interactionID"]) ?? undefined;
    const messageId = pickStringFromRecords(records, ["message_id", "messageId", "id"]) ?? undefined;
    const createdAt =
      pickStringFromRecords(records, ["created_at", "createdAt", "timestamp"]) ?? undefined;

    const chunk: EcoStreamChunk = {
      index,
      text: effectiveDelta,
      interactionId,
      messageId,
      createdAt,
      metadata: metadataRecord ?? undefined,
      payload: payloadRecord ?? rawEvent,
      isFirstChunk: index === 0,
    };

    if (chunkHandler) {
      try {
        chunkHandler(chunk, sharedContext);
      } catch (error) {
        try {
          console.warn("[SSE-DEBUG] onChunk_error", { error });
        } catch {}
      }
    }
  };
};

export const onPromptReady = ({
  controller,
  streamState,
  markPromptReadyWatchdog,
  onReady,
  buildRecordChain,
  pickStringFromRecords,
  extractPayloadRecord,
  diag,
  normalizedClientId,
  handlePromptReady,
  sharedContext,
}: PromptReadyDeps) => {
  const readyHandler = typeof onReady === "function" ? onReady : null;
  if (!readyHandler) {
    try {
      console.debug("[SSE-DEBUG] onReady missing");
    } catch {}
  }
  const promptHandler = typeof handlePromptReady === "function" ? handlePromptReady : null;
  if (!promptHandler) {
    try {
      console.debug("[SSE-DEBUG] onPromptReady missing");
    } catch {}
  }

  return (rawEvent: Record<string, unknown>) => {
    if (controller.signal.aborted) return;
    if (streamState.fallbackRequested) return;

    if (!streamState.readyReceived) {
      streamState.readyReceived = true;
      try {
        console.log("[SSE-DEBUG] ready_received", {
          clientMessageId: sharedContext.clientMessageId,
          streamId: sharedContext.streamStats.streamId ?? null,
        });
      } catch {}
      sharedContext.readyStateRef.current = true;
      if (readyHandler) {
        try {
          readyHandler();
        } catch (error) {
          try {
            console.warn("[SSE-DEBUG] onReady_error", { error });
          } catch {}
        }
      }
    }

    markPromptReadyWatchdog();

    const records = buildRecordChain(rawEvent);
    const interactionId =
      pickStringFromRecords(records, ["interaction_id", "interactionId", "interactionID"]) ?? undefined;
    const messageId = pickStringFromRecords(records, ["message_id", "messageId", "id"]) ?? undefined;
    const createdAt =
      pickStringFromRecords(records, ["created_at", "createdAt", "timestamp"]) ?? undefined;
    const payloadRecord = extractPayloadRecord(rawEvent);

    const promptEvent: EcoStreamPromptReadyEvent = {
      interactionId,
      messageId,
      createdAt,
      payload: payloadRecord ?? rawEvent,
    };

    diag("prompt_ready", {
      clientMessageId: normalizedClientId,
      interactionId: promptEvent.interactionId ?? null,
      messageId: promptEvent.messageId ?? null,
    });

    if (promptHandler) {
      try {
        promptHandler(promptEvent, sharedContext);
      } catch (error) {
        try {
          console.warn("[SSE-DEBUG] onPromptReady_error", { error });
        } catch {}
      }
    }
  };
};

export const onControl = ({
  controller,
  streamState,
  buildRecordChain,
  extractPayloadRecord,
  pickStringFromRecords,
  bumpHeartbeatWatchdog,
  diag,
  normalizedClientId,
  handleControl,
  sharedContext,
}: ControlDeps) => {
  const controlHandler = typeof handleControl === "function" ? handleControl : null;
  if (!controlHandler) {
    try {
      console.debug("[SSE-DEBUG] onControl missing");
    } catch {}
  }

  return (rawEvent: Record<string, unknown>) => {
    if (controller.signal.aborted) return;
    if (streamState.fallbackRequested) return;

    const records = buildRecordChain(rawEvent);
    const interactionId =
      pickStringFromRecords(records, ["interaction_id", "interactionId", "interactionID"]) ?? undefined;
    const messageId = pickStringFromRecords(records, ["message_id", "messageId", "id"]) ?? undefined;
    const payloadRecord = extractPayloadRecord(rawEvent);

    const name =
      pickStringFromRecords(
        [toRecordSafe(rawEvent), payloadRecord ?? {}],
        ["name", "event", "type"],
      ) ?? undefined;

    const normalizedName = typeof name === "string" ? name.trim().toLowerCase() : undefined;

    const controlEvent: EcoStreamControlEvent = {
      name,
      interactionId,
      messageId,
      payload: payloadRecord ?? rawEvent,
    };

    bumpHeartbeatWatchdog();
    diag("control_event", { name: normalizedName ?? name, clientMessageId: normalizedClientId });

    if (controlHandler) {
      try {
        controlHandler(controlEvent, sharedContext);
      } catch (error) {
        // Verificar se é erro benigno antes de propagar para UI
        const errorMessage = error instanceof Error ? error.message : String(error);
        const isBenignError =
          (error as any)?.name === 'AbortError' ||
          controller.signal.aborted ||
          (typeof errorMessage === 'string' && (
            errorMessage.includes('no_chunks_emitted') ||
            errorMessage.includes('no_text_before_done') ||
            errorMessage.includes('no_content') ||
            errorMessage.includes('benign_no_output') ||
            errorMessage.includes('final_text_only')
          ));

        // Verificar se já existe texto final acumulado
        const hasFinalText = sharedContext.streamStats.aggregatedLength > 0;

        if (!isBenignError && !hasFinalText) {
          // Erro real sem texto: propagar para UI
          try {
            console.error("[SSE-DEBUG] onControl_error_critical", {
              error: errorMessage,
              clientMessageId: normalizedClientId,
              hasFinalText,
            });
          } catch {}
          // Aqui poderia chamar setErroApi se tivesse acesso, mas o contexto atual
          // já tem tratamento de erros no nível superior
        } else {
          // Erro benigno ou já tem texto: apenas logar
          try {
            console.debug("[SSE-DEBUG] onControl_error_benign_or_has_text", {
              error: errorMessage,
              isBenignError,
              hasFinalText,
              aggregatedLength: sharedContext.streamStats.aggregatedLength,
            });
          } catch {}
        }
      }
    }
  };
};

export const onMessage = ({
  controller,
  streamState,
  extractPayloadRecord,
  buildRecordChain,
  pickStringFromRecords,
  collectTexts,
  sharedContext,
  streamStats,
  clearFallbackGuardTimer,
  bumpFirstTokenWatchdog,
  bumpHeartbeatWatchdog,
}: MessageDeps) => {
  return (rawEvent: Record<string, unknown>) => {
    if (controller.signal.aborted) return;
    if (streamState.fallbackRequested) return;

    const payloadRecord = extractPayloadRecord(rawEvent);
    const records = buildRecordChain(rawEvent);

    const directText =
      pickStringFromRecords(records, ["text", "delta", "content"]) ??
      (() => {
        const collected = collectTexts(payloadRecord);
        if (Array.isArray(collected) && collected.length > 0) {
          return collected.join("");
        }
        return undefined;
      })();

    const normalized = typeof directText === "string" ? directText.trim() : "";
    if (normalized) {
      sharedContext.hasFirstChunkRef.current = true;
      streamState.firstChunkDelivered = true;
      streamStats.gotAnyChunk = true;
      clearFallbackGuardTimer();
      bumpFirstTokenWatchdog();
      return;
    }

    bumpHeartbeatWatchdog();
  };
};

/**
 * Handler para evento 'start' do SSE
 * Confirma que o stream foi inicializado no backend
 */
export const onStart = ({
  bumpHeartbeatWatchdog,
  diag,
  normalizedClientId,
}: {
  bumpHeartbeatWatchdog: () => void;
  diag: (...args: unknown[]) => void;
  normalizedClientId: string;
}) => {
  return (rawEvent: Record<string, unknown>) => {
    bumpHeartbeatWatchdog();
    diag("start_event", { clientMessageId: normalizedClientId, status: "initialized" });
    try {
      console.log("[SSE] Stream inicializado no backend", { clientMessageId: normalizedClientId });
    } catch {}
  };
};

/**
 * Handler para evento 'empty' do SSE
 * Trata streams que não retornaram dados
 */
export const onEmpty = ({
  bumpHeartbeatWatchdog,
  diag,
  normalizedClientId,
}: {
  bumpHeartbeatWatchdog: () => void;
  diag: (...args: unknown[]) => void;
  normalizedClientId: string;
}) => {
  return (rawEvent: Record<string, unknown>) => {
    bumpHeartbeatWatchdog();
    diag("empty_event", { clientMessageId: normalizedClientId });
    try {
      console.warn("[SSE] Stream vazio recebido do backend", {
        clientMessageId: normalizedClientId,
        event: rawEvent
      });
    } catch {}
  };
};

export const onDone = ({
  clearTypingWatchdog,
  controller,
  doneState,
  clearWatchdog,
  streamActiveRef,
  clientMessageId,
  setStreamActive,
  buildRecordChain,
  pickStringFromRecords,
  extractPayloadRecord,
  streamTimersRef,
  normalizedClientId,
  streamStats,
  sharedContext,
  registerNoContent,
  logSse,
  ensureAssistantForNoContent,
  handleDone,
  setErroApi,
  removeEcoEntry,
  applyMetaToStreamStats,
  extractFinishReasonFromMeta,
  // ✅ novas deps exigidas pelo tipo DoneDeps
  collectTexts,
  processChunk,
  retry,
  retriedNoChunk,
}: DoneDeps): HandleStreamDoneFn => {
  const doneHandler = typeof handleDone === "function" ? handleDone : null;
  if (!doneHandler) {
    try {
      console.debug("[SSE-DEBUG] onDone missing");
    } catch {}
  }

  return (rawEvent?: Record<string, unknown>, options?: { reason?: string }) => {
    clearTypingWatchdog();
    if (controller.signal.aborted || doneState.value) return;
    doneState.value = true;
    clearWatchdog();

    if (sharedContext.activeStreamClientIdRef.current === clientMessageId) {
      streamActiveRef.current = false;
      try {
        console.debug("[DIAG] setStreamActive:before", {
          clientMessageId,
          value: false,
          phase: "handleStreamDone",
        });
      } catch {}
      setStreamActive(false);
    }

    const eventRecord = toRecordSafe(rawEvent) || undefined;

    const records = buildRecordChain(rawEvent);
    const interactionId =
      pickStringFromRecords(records, ["interaction_id", "interactionId", "interactionID"]) ?? undefined;
    const messageId = pickStringFromRecords(records, ["message_id", "messageId", "id"]) ?? undefined;
    const createdAt =
      pickStringFromRecords(records, ["created_at", "createdAt", "timestamp"]) ?? undefined;
    const clientMetaId =
      pickStringFromRecords(records, ["client_message_id", "clientMessageId"]) ?? undefined;
    const payloadRecord = extractPayloadRecord(rawEvent);

    const eventMetaRecord = toRecordSafe((eventRecord as any)?.meta) || undefined;

    const now = Date.now();
    const metrics = streamTimersRef.current[normalizedClientId];
    const totalMs = metrics ? now - metrics.startedAt : undefined;

    const doneReason = (() => {
      if (options?.reason) return options.reason;
      if (rawEvent) {
        if ((rawEvent as { done?: unknown }).done === true) return "done_message_compat";
        return payloadRecord ? "server-done" : "server-done-empty";
      }
      return "missing-event";
    })();

    streamStats.timing = {
      startedAt: metrics?.startedAt ?? streamStats.timing?.startedAt,
      firstChunkAt: metrics?.firstChunkAt ?? streamStats.timing?.firstChunkAt,
      totalMs,
    };

    // ✅ calcular UMA vez e reutilizar
    const endedBeforeFirstChunk = !sharedContext.streamStats.gotAnyChunk;

    if (endedBeforeFirstChunk) {
      const doneTexts = collectTexts(payloadRecord);
      const fallbackText =
        pickStringFromRecords(records, ["text", "finalText"]) ||
        (Array.isArray(doneTexts) && doneTexts.length > 0 ? doneTexts.join("") : undefined);

      if (fallbackText) {
        try {
          console.log("[SSE] Texto encontrado no evento 'done', usando como fallback.", {
            length: fallbackText.length,
          });
        } catch {}
        if (typeof processChunk === "function") {
          // index alto proposital para não colidir com a sequência real
          processChunk(9999, fallbackText, rawEvent || {});
          sharedContext.streamStats.gotAnyChunk = true;
        }
      } else {
        // Verificar se há finishReason benigno antes de tratar como erro
        const finishReasonFromMeta = sharedContext.streamStats.finishReasonFromMeta;
        const normalizedFinishReason = typeof finishReasonFromMeta === "string"
          ? finishReasonFromMeta.trim().toLowerCase()
          : "";

        const benignFinishReasons = new Set([
          "stop",
          "end",
          "completed",
          "greeting",
          "shortcut",
          "filtered",
          "length",
          "content_filter",
        ]);

        const isBenignFinishReason = benignFinishReasons.has(normalizedFinishReason);

        if (isBenignFinishReason) {
          // FinishReason benigno sem chunks: finalizar silenciosamente sem erro
          try {
            console.log("[SSE] Stream finalizado sem chunks mas com finishReason benigno:", normalizedFinishReason);
          } catch {}
          streamStats.clientFinishReason = normalizedFinishReason || "no_content_benign";
          // Não registrar como no_content nem fazer retry
        } else if (!retriedNoChunk) {
          try {
            console.warn("[SSE] Stream finalizado sem chunks. Tentando 1 retry silencioso.", { clientMessageId });
          } catch {}
          streamStats.clientFinishReason = "no_chunks_emitted_retry";
          retry();
          return; // interrompe este ciclo de done — o retry assumirá
        } else {
          try {
            console.warn("[SSE] Retry não produziu chunks. Finalizando como no_content.", { clientMessageId });
          } catch {}
          registerNoContent("no_text_after_retry");
          streamStats.clientFinishReason = "no_text_before_done";
        }
      }
    }

    const doneMetaRecord =
      toRecordSafe((payloadRecord as any)?.meta) ||
      toRecordSafe((payloadRecord as any)?.metadata) ||
      eventMetaRecord ||
      toRecordSafe((eventRecord as any)?.metadata) ||
      toRecordSafe(payloadRecord);

    if (doneMetaRecord) {
      applyMetaToStreamStats(sharedContext.streamStats, doneMetaRecord);
    } else if (eventMetaRecord) {
      applyMetaToStreamStats(sharedContext.streamStats, eventMetaRecord);
    } else {
      const finishReasonFallback =
        extractFinishReasonFromMeta(eventRecord) ?? extractFinishReasonFromMeta(payloadRecord);
      if (finishReasonFallback) {
        sharedContext.streamStats.finishReasonFromMeta = finishReasonFallback;
      }
    }

    const finishReasonNormalized = (() => {
      const finishReason = sharedContext.streamStats.finishReasonFromMeta;
      if (typeof finishReason === "string") {
        const trimmed = finishReason.trim().toLowerCase();
        return trimmed || undefined;
      }
      return undefined;
    })();

    const serverReportedClientDisconnect = finishReasonNormalized === "client_disconnect";
    if (endedBeforeFirstChunk && serverReportedClientDisconnect) {
      try {
        console.warn("[DIAG] server_reported_client_disconnect", {
          clientMessageId,
          totalMs,
          finishReason: sharedContext.streamStats.finishReasonFromMeta ?? null,
        });
      } catch {}
      registerNoContent("client_disconnect");
      const ensuredAssistantId = ensureAssistantForNoContent({
        interactionId: interactionId ?? null,
        messageId: messageId ?? null,
        message_id: messageId ?? null,
        clientMessageId: clientMetaId ?? null,
        client_message_id: clientMetaId ?? null,
        createdAt: createdAt ?? null,
      });
      if (ensuredAssistantId) {
        sharedContext.activeAssistantIdRef.current = ensuredAssistantId;
      }
    }

    logSse("done", { clientMessageId: normalizedClientId, totalMs, reason: doneReason });
    delete streamTimersRef.current[normalizedClientId];

    const assistantId = sharedContext.ensureAssistantMessage(clientMessageId, {
      interactionId: interactionId ?? null,
      messageId: messageId ?? null,
      message_id: messageId ?? null,
      clientMessageId: clientMetaId ?? null,
      client_message_id: clientMetaId ?? null,
      createdAt: createdAt ?? null,
    });
    if (!assistantId) return;

    sharedContext.activeAssistantIdRef.current = assistantId;

    const doneEvent: EcoStreamDoneEvent = {
      interactionId: interactionId ?? undefined,
      messageId: messageId ?? undefined,
      createdAt: createdAt ?? undefined,
      payload: payloadRecord ?? toRecordSafe(rawEvent) ?? undefined,
    };

    const doneContext = {
      ...sharedContext,
      event: doneEvent,
      setErroApi,
      removeEcoEntry,
      assistantId,
    };

    try {
      console.log("[SSE-DEBUG] done_received", {
        clientMessageId: sharedContext.clientMessageId,
        streamId: sharedContext.streamStats.streamId ?? null,
      });
    } catch {}

    if (doneHandler) {
      try {
        doneHandler(doneContext);
      } catch (error) {
        try {
          console.warn("[SSE-DEBUG] onDone_error", { error });
        } catch {}
      }
    }
  };
};

export const onError = ({
  bumpHeartbeatWatchdog,
  buildRecordChain,
  pickStringFromRecords,
  replyState,
  tracking,
  clientMessageId,
  processChunk,
  sharedContext,
  diag,
  normalizedClientId,
  handleDone,
  fatalErrorState,
  extractText,
}: ErrorDeps) => {
  const chunkHandler = typeof processChunk === "function" ? processChunk : null;
  const doneHandler = typeof handleDone === "function" ? handleDone : null;
  if (!chunkHandler || !doneHandler) {
    try {
      console.debug("[SSE-DEBUG] onError missing");
    } catch {}
  }

  return (rawEvent: Record<string, unknown>) => {
    bumpHeartbeatWatchdog();

    const records = buildRecordChain(rawEvent);
    const reasonRaw = pickStringFromRecords(records, ["reason", "error", "code", "type"]) ?? undefined;
    const normalizedReason = typeof reasonRaw === "string" ? reasonRaw.trim().toLowerCase() : undefined;

    if (normalizedReason === "internal_error") {
      const assistantId = tracking.assistantByClientRef.current[clientMessageId];
      const currentEntry = assistantId ? replyState.ecoReplyStateRef.current[assistantId] : undefined;
      const nextIndex =
        typeof currentEntry?.chunkIndexMax === "number" ? currentEntry.chunkIndexMax + 1 : 0;

      const messageText = "⚠️ Ocorreu um erro interno. Tente novamente.";

      const syntheticEvent: Record<string, unknown> = {
        ...rawEvent,
        error: true,
        text: messageText,
        delta: messageText,
        message: messageText,
        payload: {
          ...(toRecordSafe((rawEvent as { payload?: unknown }).payload) ?? {}),
          error: true,
          text: messageText,
          delta: messageText,
          message: messageText,
        },
      };

      if (chunkHandler) {
        try {
          chunkHandler(nextIndex, messageText, syntheticEvent);
        } catch (error) {
          try {
            console.warn("[SSE-DEBUG] onError_chunk_error", { error });
          } catch {}
        }
      }

      sharedContext.streamStats.clientFinishReason = "internal_error";
      diag("stream_error_internal", { clientMessageId: normalizedClientId });

      if (doneHandler) {
        try {
          doneHandler(undefined, { reason: "internal_error" });
        } catch (error) {
          try {
            console.warn("[SSE-DEBUG] onError_done_error", { error });
          } catch {}
        }
      }

      fatalErrorState.current = null;
      return;
    }

    const extractedMessage = extractText(rawEvent);
    const message =
      extractedMessage ||
      pickStringFromRecords(records, ["message", "error", "detail", "reason"]) ||
      "Erro na stream SSE da Eco.";
    fatalErrorState.current = new Error(message);
  };
};
