import type { Dispatch, MutableRefObject, SetStateAction } from "react";

import {
  startEcoStream,
  type EcoStreamChunk,
  type EcoStreamControlEvent,
  type EcoStreamDoneEvent,
  type EcoStreamPromptReadyEvent,
} from "../../api/ecoStream";
import { collectTexts } from "../../api/askEcoResponse";
import type { Message as ChatMessageType, UpsertMessageOptions } from "../../contexts/ChatContext";
import { sanitizeText } from "../../utils/sanitizeText";
import type { EnsureAssistantEventMeta, MessageTrackingRefs, ReplyStateController } from "./messageState";
import {
  applyChunkToMessages,
  extractSummaryRecord,
  mergeReplyMetadata,
} from "./chunkProcessor";
import {
  pickNumberFromRecords,
  pickStringArrayFromRecords,
  pickStringFromRecords,
  toCleanString,
  toRecord,
} from "./utils";

export type InteractionMapAction = {
  type: "updateInteractionMap";
  clientId: string;
  interaction_id: string;
};

export type EnsureAssistantMessageFn = (
  clientMessageId: string,
  event?: EnsureAssistantEventMeta,
  options?: { allowCreate?: boolean; draftMessages?: ChatMessageType[] },
) => string | null | undefined;

export type RemoveEcoEntryFn = (assistantMessageId?: string | null) => void;

const formatAbortReason = (input: unknown): string => {
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
      const nested = formatAbortReason(maybeReason);
      if (nested !== "unknown") return nested;
    }
    try {
      const serialized = JSON.stringify(input);
      if (serialized && serialized !== "{}") return serialized;
    } catch {
      /* noop */
    }
  }
  return "unknown";
};

interface StreamSharedContext {
  clientMessageId: string;
  normalizedClientId: string;
  controller: AbortController;
  ensureAssistantMessage: EnsureAssistantMessageFn;
  setMessages: Dispatch<SetStateAction<ChatMessageType[]>>;
  upsertMessage?: (message: ChatMessageType, options?: UpsertMessageOptions) => void;
  activeAssistantIdRef: MutableRefObject<string | null>;
  activeStreamClientIdRef: MutableRefObject<string | null>;
  activeClientIdRef: MutableRefObject<string | null>;
  setDigitando: Dispatch<SetStateAction<boolean>>;
  updateCurrentInteractionId: (next: string | null | undefined) => void;
  streamTimersRef: MutableRefObject<Record<string, { startedAt: number; firstChunkAt?: number }>>;
  logSse: (
    phase: "open" | "start" | "first-chunk" | "delta" | "done" | "abort",
    payload: Record<string, unknown>,
  ) => void;
  replyState: ReplyStateController;
  tracking: MessageTrackingRefs;
  interactionCacheDispatch?: (action: InteractionMapAction) => void;
}

interface DoneContext extends StreamSharedContext {
  event: EcoStreamDoneEvent | undefined;
  setErroApi: Dispatch<SetStateAction<string | null>>;
  removeEcoEntry: RemoveEcoEntryFn;
  assistantId: string;
}

export const handlePromptReady = (
  event: EcoStreamPromptReadyEvent | undefined,
  context: StreamSharedContext,
) => {
  if (!context.ensureAssistantMessage) return;
  const assistantId = context.ensureAssistantMessage(
    context.clientMessageId,
    {
      interactionId: event?.interactionId,
      messageId: event?.messageId,
      createdAt: event?.createdAt,
    },
    { allowCreate: false },
  );

  if (!assistantId) return;

  context.activeAssistantIdRef.current = assistantId;
  if (event?.interactionId) {
    context.updateCurrentInteractionId(event.interactionId);
  }
  const timestamp = typeof event?.createdAt === "string" ? event.createdAt.trim() : undefined;
  const updatedAt = timestamp || new Date().toISOString();

  context.setMessages((prevMessages) =>
    prevMessages.map((message) => {
      if (message.id !== assistantId) return message;
      try {
        console.debug('[DIAG] setMessages:update:before', {
          targetId: assistantId,
          role: message.role ?? message.sender ?? 'unknown',
          status: message.status,
          phase: 'prompt',
        });
      } catch {
        /* noop */
      }
      const nextMessage: ChatMessageType = {
        ...message,
        streaming: true,
        status: "streaming",
        updatedAt,
        createdAt: message.createdAt ?? updatedAt,
        message_id: event?.messageId || message.message_id,
        interaction_id: event?.interactionId || message.interaction_id,
        interactionId: event?.interactionId || message.interactionId,
      };
      try {
        console.debug('[DIAG] setMessages:update:after', {
          targetId: assistantId,
          role: nextMessage.role ?? nextMessage.sender ?? 'unknown',
          status: nextMessage.status,
          phase: 'prompt',
        });
      } catch {
        /* noop */
      }
      return nextMessage;
    }),
  );
};

export const handleChunk = (
  chunk: EcoStreamChunk,
  context: StreamSharedContext,
) => {
  applyChunkToMessages({
    clientMessageId: context.clientMessageId,
    chunk,
    ensureAssistantMessage: context.ensureAssistantMessage,
    setDigitando: context.setDigitando,
    logSse: context.logSse,
    streamTimersRef: context.streamTimersRef,
    assistantByClientRef: context.tracking.assistantByClientRef,
    activeStreamClientIdRef: context.activeStreamClientIdRef,
    activeAssistantIdRef: context.activeAssistantIdRef,
    setMessages: context.setMessages,
    upsertMessage: context.upsertMessage,
    replyState: context.replyState,
    tracking: context.tracking,
  });
};

export const handleDone = (
  doneContext: DoneContext,
) => {
  const { event, clientMessageId, normalizedClientId, assistantId } = doneContext;
  if (doneContext.activeStreamClientIdRef.current === clientMessageId) {
    doneContext.setDigitando(false);
  }

  if (event?.interactionId) {
    doneContext.updateCurrentInteractionId(event.interactionId);
  }

  if (doneContext.tracking.userTextByClientIdRef.current[clientMessageId]) {
    delete doneContext.tracking.userTextByClientIdRef.current[clientMessageId];
  }

  const timestamp = typeof event?.createdAt === "string" ? event.createdAt.trim() : undefined;
  const updatedAt = timestamp || new Date().toISOString();
  const donePayload = event?.payload;
  const payloadRecord = toRecord(donePayload);
  const summaryRecord = extractSummaryRecord(donePayload);
  const responseRecord = toRecord(payloadRecord?.response);
  const metadataRecord = toRecord(payloadRecord?.metadata);
  const contextRecord = toRecord(payloadRecord?.context);
  const recordSources = [summaryRecord, responseRecord, metadataRecord, contextRecord, payloadRecord];

  const metadataBase =
    payloadRecord?.metadata !== undefined
      ? (payloadRecord?.metadata as unknown)
      : payloadRecord?.response !== undefined
      ? (payloadRecord?.response as unknown)
      : undefined;

  const interactionFromSummary = pickStringFromRecords(recordSources, [
    "interaction_id",
    "interactionId",
    "interactionID",
  ]);
  const fallbackInteractionFromIds = pickStringFromRecords(recordSources, [
    "id",
    "message_id",
    "messageId",
  ]);
  const eventInteractionId = toCleanString(event?.interactionId);
  const resolvedInteractionId = interactionFromSummary ?? eventInteractionId ?? fallbackInteractionFromIds;

  const resolvedMessageId =
    pickStringFromRecords(recordSources, ["message_id", "messageId", "id"]) ?? toCleanString(event?.messageId);

  const latencyCandidate = pickNumberFromRecords(recordSources, ["latency_ms", "latencyMs"]);
  const normalizedLatency =
    typeof latencyCandidate === "number" ? Math.max(0, Math.round(latencyCandidate)) : undefined;

  const moduleCombo = pickStringArrayFromRecords(recordSources, [
    "module_combo",
    "moduleCombo",
    "modules",
    "selected_modules",
    "selectedModules",
  ]);
  const promptHash = pickStringFromRecords(recordSources, ["prompt_hash", "promptHash"]);
  const ecoScore = pickNumberFromRecords(recordSources, ["eco_score", "ecoScore"]);

  const finalizeWithEntry = (entry: { text: string; chunkIndexMax: number } | undefined) => {
    const aggregatedTextValue = entry?.text ?? "";
    const aggregatedLength = aggregatedTextValue.length;
    const doneTexts = collectTexts(donePayload);
    const doneContentCandidate = Array.isArray(doneTexts) && doneTexts.length > 0 ? doneTexts.join("") : undefined;
    const normalizedAggregated = aggregatedTextValue.replace(/\s+/g, " ").trim();
    const normalizedDone = typeof doneContentCandidate === "string"
      ? doneContentCandidate.replace(/\s+/g, " ").trim()
      : "";

    let finalContent = aggregatedTextValue;
    if (typeof doneContentCandidate === "string" && doneContentCandidate.length > 0) {
      if (!normalizedAggregated) {
        finalContent = doneContentCandidate;
      } else if (normalizedAggregated !== normalizedDone) {
        finalContent = doneContentCandidate;
      }
    }

    const finalText = finalContent;

    const patch: ChatMessageType = {
      id: assistantId,
      streaming: false,
      status: "done",
      updatedAt,
    };

    patch.content = finalText;
    patch.text = finalText;

    patch.metadata = mergeReplyMetadata(metadataBase, normalizedClientId);
    if (donePayload !== undefined) {
      patch.donePayload = donePayload;
    }
    if (resolvedInteractionId) {
      patch.interaction_id = resolvedInteractionId;
      patch.interactionId = resolvedInteractionId;
    }
    if (resolvedMessageId) {
      patch.message_id = resolvedMessageId;
    }
    if (typeof normalizedLatency === "number") {
      patch.latencyMs = normalizedLatency;
    }
    if (moduleCombo && moduleCombo.length > 0) {
      patch.module_combo = moduleCombo;
    }
    if (promptHash) {
      patch.prompt_hash = promptHash;
    }
    if (typeof ecoScore === "number" && Number.isFinite(ecoScore)) {
      patch.eco_score = ecoScore;
    }

    try {
      console.debug('[DIAG] done', {
        ecoMsgId: assistantId,
        clientMessageId,
        aggregatedLength,
        finalLength: typeof finalText === "string" ? finalText.length : 0,
      });
    } catch {
      /* noop */
    }

    const allowedKeys = [
      "status",
      "streaming",
      "updatedAt",
      "metadata",
      "donePayload",
      "interaction_id",
      "interactionId",
      "message_id",
      "latencyMs",
      "module_combo",
      "prompt_hash",
      "eco_score",
      "content",
      "text",
    ];

    if (doneContext.upsertMessage) {
      doneContext.upsertMessage(patch, { patchSource: "stream_done", allowedKeys });
    } else {
      doneContext.setMessages((prevMessages) =>
        prevMessages.map((message) => {
          if (message.id === assistantId) {
            try {
              console.debug('[DIAG] setMessages:update:before', {
                targetId: assistantId,
                role: message.role ?? message.sender ?? 'unknown',
                status: message.status,
                phase: 'done',
              });
            } catch {
              /* noop */
            }
            const nextMessage: ChatMessageType = {
              ...message,
              streaming: false,
              status: "done",
              updatedAt,
              content: finalText,
              text: finalText,
            };
            nextMessage.metadata = mergeReplyMetadata(metadataBase, normalizedClientId);
            if (donePayload !== undefined) {
              nextMessage.donePayload = donePayload;
            }
            if (resolvedInteractionId) {
              nextMessage.interaction_id = resolvedInteractionId;
              nextMessage.interactionId = resolvedInteractionId;
            }
            if (resolvedMessageId) {
              nextMessage.message_id = resolvedMessageId;
            }
            if (typeof normalizedLatency === "number") {
              nextMessage.latencyMs = normalizedLatency;
            }
            if (moduleCombo && moduleCombo.length > 0) {
              nextMessage.module_combo = moduleCombo;
            }
            if (promptHash) {
              nextMessage.prompt_hash = promptHash;
            }
            if (typeof ecoScore === "number" && Number.isFinite(ecoScore)) {
              nextMessage.eco_score = ecoScore;
            }
            try {
              console.debug('[DIAG] setMessages:update:after', {
                targetId: assistantId,
                role: nextMessage.role ?? nextMessage.sender ?? 'unknown',
                status: nextMessage.status,
                nextLength: typeof nextMessage.text === 'string' ? nextMessage.text.length : 0,
                phase: 'done',
              });
            } catch {
              /* noop */
            }
            return nextMessage;
          }
          return message;
        }),
      );
    }

    if (
      doneContext.interactionCacheDispatch &&
      normalizedClientId &&
      resolvedInteractionId &&
      typeof resolvedInteractionId === "string"
    ) {
      doneContext.interactionCacheDispatch({
        type: "updateInteractionMap",
        clientId: normalizedClientId,
        interaction_id: resolvedInteractionId,
      });
    }
  };

  const aggregatedEntry = doneContext.replyState.ecoReplyStateRef.current[assistantId];
  const hasChunks = aggregatedEntry?.chunkIndexMax !== undefined && aggregatedEntry.chunkIndexMax >= 0;
  const aggregatedEntryLength = aggregatedEntry?.text ? aggregatedEntry.text.length : 0;

  if (!hasChunks || aggregatedEntryLength === 0) {
    setTimeout(() => {
      const latestEntry = doneContext.replyState.ecoReplyStateRef.current[assistantId];
      finalizeWithEntry(latestEntry);
    }, 100);
  } else {
    finalizeWithEntry(aggregatedEntry);
  }
};

export const handleError = (
  error: unknown,
  context: DoneContext,
) => {
  const message = error instanceof Error ? error.message : "Não foi possível concluir a resposta da Eco.";
  context.setErroApi(message);
  context.logSse("abort", {
    clientMessageId: context.normalizedClientId,
    reason: "error",
    message,
    source: "error-handler",
  });
  delete context.streamTimersRef.current[context.normalizedClientId];
  if (context.tracking.userTextByClientIdRef.current[context.clientMessageId]) {
    delete context.tracking.userTextByClientIdRef.current[context.clientMessageId];
  }
  try {
    console.debug('[DIAG] error', {
      clientMessageId: context.clientMessageId,
      error: message,
    });
  } catch {
    /* noop */
  }
  const assistantIdOnError = context.tracking.assistantByClientRef.current[context.clientMessageId];
  if (assistantIdOnError) {
    context.removeEcoEntry(assistantIdOnError);
  }
};

export const handleControl = (
  event: EcoStreamControlEvent,
  context: StreamSharedContext,
) => {
  const explicit = toCleanString(event?.interactionId);
  const payloadRecord = toRecord(event?.payload);
  const payloadInteraction =
    toCleanString(payloadRecord?.interaction_id) ||
    toCleanString(payloadRecord?.interactionId) ||
    toCleanString(payloadRecord?.id);
  const resolved = explicit ?? payloadInteraction;
  if (resolved) {
    context.updateCurrentInteractionId(resolved);
  }
  try {
    console.debug('[DIAG] control', {
      clientMessageId: context.clientMessageId,
      assistantMessageId: context.activeAssistantIdRef.current,
      interactionId: resolved ?? null,
    });
  } catch {
    /* noop */
  }
};

interface BeginStreamParams {
  history: ChatMessageType[];
  userMessage: ChatMessageType;
  systemHint?: string;
  controllerOverride?: AbortController;
  controllerRef: MutableRefObject<AbortController | null>;
  streamTimersRef: MutableRefObject<Record<string, { startedAt: number; firstChunkAt?: number }>>;
  activeStreamClientIdRef: MutableRefObject<string | null>;
  activeAssistantIdRef: MutableRefObject<string | null>;
  streamActiveRef: MutableRefObject<boolean>;
  activeClientIdRef: MutableRefObject<string | null>;
  onFirstChunk?: () => void;
  setDigitando: Dispatch<SetStateAction<boolean>>;
  setIsSending: Dispatch<SetStateAction<boolean>>;
  setErroApi: Dispatch<SetStateAction<string | null>>;
  activity?: { onSend?: () => void; onDone?: () => void };
  ensureAssistantMessage: EnsureAssistantMessageFn;
  removeEcoEntry: RemoveEcoEntryFn;
  updateCurrentInteractionId: (next: string | null | undefined) => void;
  logSse: (
    phase: "open" | "start" | "first-chunk" | "delta" | "done" | "abort",
    payload: Record<string, unknown>,
  ) => void;
  userId?: string;
  userName?: string;
  guestId?: string;
  isGuest: boolean;
  interactionCacheDispatch?: (action: InteractionMapAction) => void;
  setMessages: Dispatch<SetStateAction<ChatMessageType[]>>;
  upsertMessage?: (message: ChatMessageType, options?: UpsertMessageOptions) => void;
  replyState: ReplyStateController;
  tracking: MessageTrackingRefs;
}

export const beginStream = ({
  history,
  userMessage,
  systemHint,
  controllerOverride,
  controllerRef,
  streamTimersRef,
  activeStreamClientIdRef,
  activeAssistantIdRef,
  streamActiveRef,
  activeClientIdRef,
  onFirstChunk,
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
}: BeginStreamParams) => {
  const clientMessageId = userMessage.id;
  if (!clientMessageId) return;
  const trimmedClientId = typeof clientMessageId === "string" ? clientMessageId.trim() : "";
  const normalizedClientId = trimmedClientId || clientMessageId;

  const normalizedUserText = sanitizeText(userMessage.text ?? userMessage.content ?? "").trim();
  if (normalizedUserText) {
    tracking.userTextByClientIdRef.current[clientMessageId] = normalizedUserText;
  } else if (tracking.userTextByClientIdRef.current[clientMessageId]) {
    delete tracking.userTextByClientIdRef.current[clientMessageId];
  }

  const activeId = activeStreamClientIdRef.current;
  if (activeId && activeId !== clientMessageId) {
    const normalizedActiveId = typeof activeId === "string" && activeId ? activeId.trim() || activeId : activeId;
    const activeController = controllerRef.current;
    if (activeController && !activeController.signal.aborted) {
      try {
        streamActiveRef.current = false;
        activeController.abort("new-send");
        if (typeof normalizedActiveId === "string" && normalizedActiveId) {
          logSse("abort", {
            clientMessageId: normalizedActiveId,
            reason: "new-send",
            source: "controller",
          });
        }
      } catch {
        /* noop */
      }
    }
    if (typeof normalizedActiveId === "string" && normalizedActiveId) {
      delete streamTimersRef.current[normalizedActiveId];
    }
    if (tracking.userTextByClientIdRef.current[activeId]) {
      delete tracking.userTextByClientIdRef.current[activeId];
    }
  }

  const controller = controllerOverride ?? new AbortController();
  controllerRef.current = controller;
  activeStreamClientIdRef.current = clientMessageId;
  activeAssistantIdRef.current = null;
  streamActiveRef.current = true;

  updateCurrentInteractionId(null);

  if (tracking.pendingAssistantMetaRef.current[clientMessageId]) {
    delete tracking.pendingAssistantMetaRef.current[clientMessageId];
  }

  setDigitando(true);
  activity?.onSend?.();

  const placeholderAssistantId = ensureAssistantMessage(clientMessageId, undefined, {
    allowCreate: true,
  });
  if (placeholderAssistantId) {
    activeAssistantIdRef.current = placeholderAssistantId;
  }

  streamTimersRef.current[normalizedClientId] = { startedAt: Date.now() };
  logSse("start", { clientMessageId: normalizedClientId });
  console.log("[SSE] Stream started", { timestamp: Date.now() });

  try {
    console.debug('[DIAG] stream:start', {
      clientMessageId,
      historyLength: history.length,
      systemHint: systemHint ?? null,
    });
  } catch {
    /* noop */
  }

  const sharedContext: StreamSharedContext = {
    clientMessageId,
    normalizedClientId,
    controller,
    ensureAssistantMessage,
    setMessages,
    upsertMessage,
    activeAssistantIdRef,
    activeStreamClientIdRef,
    activeClientIdRef,
    setDigitando,
    updateCurrentInteractionId,
    streamTimersRef,
    logSse,
    replyState,
    tracking,
    interactionCacheDispatch,
  };

    const streamStats = { aggregatedLength: 0, gotAnyChunk: false };
    let doneReceived = false;

    const buildRecordChain = (event?: { payload?: unknown }): Record<string, unknown>[] => {
      const eventRecord = toRecord(event) ?? undefined;
      const payloadRecord = toRecord(eventRecord?.payload) ?? toRecord((event as any)?.payload) ?? undefined;
      const metadataRecord = toRecord(payloadRecord?.metadata) ?? toRecord(eventRecord?.metadata) ?? undefined;
      const responseRecord = toRecord(payloadRecord?.response) ?? undefined;
      const contextRecord = toRecord(payloadRecord?.context) ?? undefined;
      return [metadataRecord, responseRecord, payloadRecord, contextRecord, eventRecord].filter(Boolean) as Record<
        string,
        unknown
      >[];
    };

    const extractPayloadRecord = (event?: { payload?: unknown }) =>
      toRecord((event as { payload?: unknown } | undefined)?.payload) ?? undefined;

    const handlePromptEvent = (event?: EcoStreamPromptReadyEvent) => {
      if (controller.signal.aborted) return;
      const records = buildRecordChain(event);
      const interactionId =
        event?.interactionId ??
        pickStringFromRecords(records, ["interaction_id", "interactionId", "interactionID"]) ??
          undefined;
      const messageId =
        event?.messageId ?? pickStringFromRecords(records, ["message_id", "messageId", "id"]) ?? undefined;
      const createdAt =
        event?.createdAt ?? pickStringFromRecords(records, ["created_at", "createdAt", "timestamp"]) ?? undefined;
      const payloadRecord = extractPayloadRecord(event);

      const promptEvent: EcoStreamPromptReadyEvent = {
        interactionId,
        messageId,
        createdAt,
        payload: payloadRecord ?? event?.payload,
      };

      handlePromptReady(promptEvent, sharedContext);
    };

    const handleControlEvent = (event?: EcoStreamControlEvent) => {
      if (controller.signal.aborted) return;
      const records = buildRecordChain(event);
      const interactionId =
        event?.interactionId ??
        pickStringFromRecords(records, ["interaction_id", "interactionId", "interactionID"]) ??
          undefined;
      const messageId =
        event?.messageId ?? pickStringFromRecords(records, ["message_id", "messageId", "id"]) ?? undefined;
      const payloadRecord = extractPayloadRecord(event);
      const name =
        event?.name ??
        pickStringFromRecords([toRecord(event) ?? {}, payloadRecord ?? {}], ["name", "event", "type"]) ?? undefined;
      const createdAt =
        event?.createdAt ?? pickStringFromRecords(records, ["created_at", "createdAt", "timestamp"]) ?? undefined;

      const controlEvent: EcoStreamControlEvent = {
        type: event?.type,
        name,
        interactionId,
        messageId,
        createdAt,
        payload: payloadRecord ?? event?.payload,
      };

      handleControl(controlEvent, sharedContext);
    };

    const handleStreamDone = (event?: EcoStreamDoneEvent) => {
      if (controller.signal.aborted || doneReceived) return;
      doneReceived = true;

      if (activeStreamClientIdRef.current === clientMessageId) {
        streamActiveRef.current = false;
      }

      const records = buildRecordChain(event);
      const interactionId =
        event?.interactionId ??
        pickStringFromRecords(records, ["interaction_id", "interactionId", "interactionID"]) ??
          undefined;
      const messageId =
        event?.messageId ?? pickStringFromRecords(records, ["message_id", "messageId", "id"]) ?? undefined;
      const createdAt =
        event?.createdAt ?? pickStringFromRecords(records, ["created_at", "createdAt", "timestamp"]) ?? undefined;
      const clientMetaId = pickStringFromRecords(records, ["client_message_id", "clientMessageId"]) ?? undefined;
      const payloadRecord = extractPayloadRecord(event);

      const now = Date.now();
      const metrics = streamTimersRef.current[normalizedClientId];
      const totalMs = metrics ? now - metrics.startedAt : undefined;
      const doneReason = event
        ? payloadRecord
          ? "server-done"
          : "server-done-empty"
        : "missing-event";
      logSse("done", { clientMessageId: normalizedClientId, totalMs, reason: doneReason });
      delete streamTimersRef.current[normalizedClientId];

      const ensureMeta: EnsureAssistantEventMeta = {
        interactionId: interactionId ?? null,
        messageId: messageId ?? null,
        message_id: messageId ?? null,
        clientMessageId: clientMetaId ?? null,
        client_message_id: clientMetaId ?? null,
        createdAt: createdAt ?? null,
      };

      const assistantId = ensureAssistantMessage(clientMessageId, ensureMeta);
      if (!assistantId) return;

      activeAssistantIdRef.current = assistantId;

      const doneEvent: EcoStreamDoneEvent = {
        interactionId: interactionId ?? undefined,
        messageId: messageId ?? undefined,
        createdAt: createdAt ?? undefined,
        payload: payloadRecord ?? event?.payload,
      };

      const doneContext: DoneContext = {
        ...sharedContext,
        event: doneEvent,
        setErroApi,
        removeEcoEntry,
        assistantId,
      };

      handleDone(doneContext);
    };

    const handleErrorEvent = (event: unknown) => {
      const eventRecord = toRecord(event);
      const payloadRecord = toRecord(eventRecord?.payload);
      const records = [payloadRecord, eventRecord].filter(Boolean) as Record<string, unknown>[];
      const message =
        pickStringFromRecords(records, ["message", "error", "detail", "reason"]) ??
        "Erro na stream SSE da Eco.";
      throw new Error(message);
    };

    const streamPromise = startEcoStream({
      history,
      clientMessageId,
      systemHint,
      userId,
      userName,
      guestId,
      isGuest,
      signal: controller.signal,
      onFirstChunk: () => {
        streamStats.gotAnyChunk = true;
        onFirstChunk?.();
      },
      onStreamOpen: ({ status, contentType }) => {
        logSse("open", { clientMessageId: normalizedClientId, status, contentType });
        try {
          console.info("[EcoStream] onStreamOpen", {
            clientMessageId,
            status: status ?? null,
            contentType,
          });
        } catch {
          /* noop */
        }
      },
      onStreamAbort: (reason) => {
        const formatted = formatAbortReason(reason);
        logSse("abort", {
          clientMessageId: normalizedClientId,
          reason: formatted,
          source: "start",
        });
      },
      onChunk: (chunk) => {
        if (controller.signal.aborted) return;
        streamStats.gotAnyChunk = true;
        if (typeof chunk.text === "string") {
          streamStats.aggregatedLength += chunk.text.length;
        }
        handleChunk(chunk, sharedContext);
      },
      onPromptReady: (event) => handlePromptEvent(event),
      onControl: (event) => handleControlEvent(event),
      onDone: (event) => handleStreamDone(event),
      onError: (event) => handleErrorEvent(event),
    });

    streamPromise.catch((error) => {
      if (controller.signal.aborted) return;
      if (activeStreamClientIdRef.current === clientMessageId) {
        streamActiveRef.current = false;
      }
      const message = error instanceof Error ? error.message : "Falha ao iniciar a resposta da Eco.";
      setErroApi(message);
      logSse("abort", {
        clientMessageId: normalizedClientId,
        reason: "start-error",
        message,
        source: "start",
      });
      delete streamTimersRef.current[normalizedClientId];
      try {
        console.debug('[DIAG] error', {
          clientMessageId,
          error: message,
          phase: 'start',
        });
      } catch {
        /* noop */
      }
      const assistantIdOnStartError = tracking.assistantByClientRef.current[clientMessageId];
      if (assistantIdOnStartError) {
        removeEcoEntry(assistantIdOnStartError);
      }
    });

    streamPromise.finally(() => {
      const isCurrentClient = activeClientIdRef.current === clientMessageId;
      if (isCurrentClient && controllerRef.current === controller) {
        controllerRef.current = null;
      }
      const assistantId = tracking.assistantByClientRef.current[clientMessageId];
      delete streamTimersRef.current[normalizedClientId];

      const isActiveStream = activeStreamClientIdRef.current === clientMessageId;
      const wasAborted = controller.signal.aborted;

      if (isCurrentClient) {
        if (!wasAborted) {
          try {
            console.info('[EcoStream] stream_completed', {
              clientMessageId,
              gotAnyChunk: streamStats.gotAnyChunk,
              aggregatedLength: streamStats.aggregatedLength,
            });
          } catch {
            /* noop */
          }
        }
        activeClientIdRef.current = null;
      } else {
        try {
          console.debug('[EcoStream] stream_final_ignored', { clientMessageId });
        } catch {
          /* noop */
        }
      }

      if (isActiveStream) {
        streamActiveRef.current = false;
        activeStreamClientIdRef.current = null;
        activeAssistantIdRef.current = null;
        if (wasAborted && assistantId) {
          removeEcoEntry(assistantId);
        }
        setDigitando(false);
        setIsSending(false);
        activity?.onDone?.();
        try {
          console.debug('[DIAG] done/abort', {
            clientMessageId,
            assistantMessageId: assistantId ?? null,
            reason: wasAborted ? 'stream_aborted' : 'stream_completed',
          });
        } catch {
          /* noop */
        }
      } else if (wasAborted && assistantId) {
        removeEcoEntry(assistantId);
        try {
          console.debug('[DIAG] done/abort', {
            clientMessageId,
            assistantMessageId: assistantId ?? null,
            reason: 'stream_aborted_inactive',
          });
        } catch {
          /* noop */
        }
      } else {
        try {
          console.debug('[DIAG] done/abort', {
            clientMessageId,
            assistantMessageId: assistantId ?? null,
            reason: 'stream_completed_inactive',
          });
        } catch {
          /* noop */
        }
      }
    });
    return streamPromise;
  };
