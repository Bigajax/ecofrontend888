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
import type { MessageTrackingRefs, ReplyStateController } from "./messageState";
import { applyChunkToMessages, extractSummaryRecord, mergeReplyMetadata } from "./chunkProcessor";
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
  event?: { interactionId?: string | null; messageId?: string | null; createdAt?: string | null },
  options?: { allowCreate?: boolean; draftMessages?: ChatMessageType[] },
) => string | null | undefined;

export type RemoveEcoEntryFn = (assistantMessageId?: string | null) => void;

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
  logSse: (phase: "start" | "first-chunk" | "done" | "abort", payload: Record<string, unknown>) => void;
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
  context.logSse("abort", { clientMessageId: context.normalizedClientId, reason: "error", message });
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
  logSse: (phase: "start" | "first-chunk" | "done" | "abort", payload: Record<string, unknown>) => void;
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
          logSse("abort", { clientMessageId: normalizedActiveId, reason: "new-send" });
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
      onFirstChunk?.();
    },
    onPromptReady: (event) => {
      if (controller.signal.aborted) return;
      handlePromptReady(event, sharedContext);
    },
    onChunk: (chunk) => {
      if (controller.signal.aborted) return;
      handleChunk(chunk, sharedContext);
    },
    onDone: (event) => {
      if (controller.signal.aborted) return;

      if (activeStreamClientIdRef.current === clientMessageId) {
        streamActiveRef.current = false;
      }

      const now = Date.now();
      const metrics = streamTimersRef.current[normalizedClientId];
      const totalMs = metrics ? now - metrics.startedAt : undefined;
      logSse("done", { clientMessageId: normalizedClientId, totalMs });
      delete streamTimersRef.current[normalizedClientId];

      const assistantId = ensureAssistantMessage(clientMessageId, {
        interactionId: event?.interactionId,
        messageId: event?.messageId,
        createdAt: event?.createdAt,
      });
      if (!assistantId) return;

      activeAssistantIdRef.current = assistantId;

      const doneContext: DoneContext = {
        ...sharedContext,
        event,
        setErroApi,
        removeEcoEntry,
        assistantId,
      };

      handleDone(doneContext);
    },
    onError: (error) => {
      if (controller.signal.aborted) return;
      if (activeStreamClientIdRef.current === clientMessageId) {
        streamActiveRef.current = false;
      }
      const doneContext: DoneContext = {
        ...sharedContext,
        event: undefined,
        setErroApi,
        removeEcoEntry,
        assistantId: sharedContext.activeAssistantIdRef.current ??
          sharedContext.tracking.assistantByClientRef.current[clientMessageId] ??
          "",
      };
      handleError(error, doneContext);
    },
    onControl: (event: EcoStreamControlEvent) => {
      if (controller.signal.aborted) return;
      handleControl(event, sharedContext);
    },
  });

  streamPromise.catch((error) => {
    if (controller.signal.aborted) return;
    if (activeStreamClientIdRef.current === clientMessageId) {
      streamActiveRef.current = false;
    }
    const message = error instanceof Error ? error.message : "Falha ao iniciar a resposta da Eco.";
    setErroApi(message);
    logSse("abort", { clientMessageId: normalizedClientId, reason: "start-error", message });
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
          console.info('[EcoStream] stream_completed', { clientMessageId });
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

