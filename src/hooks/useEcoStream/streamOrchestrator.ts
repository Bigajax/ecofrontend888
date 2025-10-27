import type { Dispatch, MutableRefObject, SetStateAction } from "react";

import {
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
  processSseLine,
  type ProcessSseHandlers,
} from "./chunkProcessor";
import {
  pickNumberFromRecords,
  pickStringArrayFromRecords,
  pickStringFromRecords,
  toCleanString,
  toRecord,
} from "./utils";
import { resolveApiUrl } from "../../constants/api";
import { buildIdentityHeaders } from "../../lib/guestId";
import { setStreamActive } from "./streamStatus";

export interface StreamRunStats {
  aggregatedLength: number;
  gotAnyChunk: boolean;
  lastMeta?: Record<string, unknown>;
  finishReasonFromMeta?: string;
}

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

const mapHistoryMessage = (message: ChatMessageType) => {
  if (!message) return { id: undefined, role: "assistant", content: "" };
  const explicitRole = (message.role ?? undefined) as string | undefined;
  const fallbackRole = message.sender === "user" ? "user" : "assistant";
  const role = explicitRole === "eco" ? "assistant" : explicitRole ?? fallbackRole;
  const rawContent =
    typeof message.content === "string"
      ? message.content
      : typeof message.text === "string"
      ? message.text
      : message.content ?? message.text ?? "";
  const content = typeof rawContent === "string" ? rawContent : String(rawContent ?? "");

  return {
    id: message.id,
    role,
    content,
    client_message_id: message.client_message_id ?? (message as any)?.clientMessageId ?? message.id ?? undefined,
  };
};

const extractFinishReasonFromMeta = (meta: unknown): string | undefined => {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return undefined;
  const record = meta as Record<string, unknown> & {
    finishReason?: unknown;
    finish_reason?: unknown;
    reason?: unknown;
  };
  const candidate =
    record.finishReason ??
    record.finish_reason ??
    record.reason;
  if (typeof candidate === "string") {
    const trimmed = candidate.trim();
    return trimmed ? trimmed : undefined;
  }
  return undefined;
};

const FIRST_EVENT_GRACE_MS = 30_000;
const HEARTBEAT_GRACE_MS = 25_000;

const applyMetaToStreamStats = (
  streamStats: StreamRunStats,
  meta: Record<string, unknown> | undefined,
) => {
  if (!meta) return;
  streamStats.lastMeta = meta;
  const finishReason = extractFinishReasonFromMeta(meta);
  streamStats.finishReasonFromMeta = finishReason;
};

const buildEcoRequestBody = ({
  history,
  clientMessageId,
  systemHint,
  userId,
  userName,
  guestId,
  isGuest,
}: {
  history: ChatMessageType[];
  clientMessageId: string;
  systemHint?: string;
  userId?: string;
  userName?: string;
  guestId?: string;
  isGuest: boolean;
}): Record<string, unknown> => {
  const mappedHistory = history.map(mapHistoryMessage);
  const mensagens = mappedHistory.filter(
    (message) =>
      Boolean(message?.role) && typeof message.content === "string" && message.content.trim().length > 0,
  );

  const recentMensagens = mensagens.slice(-3);
  const lastUserMessage = [...recentMensagens].reverse().find((message) => message.role === "user");

  const texto = (() => {
    if (!lastUserMessage) return "";
    const content = lastUserMessage.content;
    return typeof content === "string" ? content.trim() : "";
  })();

  const resolvedUserId = (() => {
    const normalizedUserId = typeof userId === "string" ? userId.trim() : "";
    if (normalizedUserId) return normalizedUserId;
    const normalizedGuestId = typeof guestId === "string" ? guestId.trim() : "";
    return normalizedGuestId;
  })();

  const now = new Date();
  const timezone = (() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return undefined;
    }
  })();

  const contextPayload: Record<string, unknown> = {
    origem: "web",
    ts: Date.now(),
  };

  if (typeof clientMessageId === "string" && clientMessageId.trim().length > 0) {
    contextPayload.client_message_id = clientMessageId;
  }

  const payload: Record<string, unknown> = {
    history: mappedHistory,
    mensagens: recentMensagens,
    texto,
    clientHour: now.getHours(),
    clientTz: timezone,
    clientMessageId,
    contexto: contextPayload,
  };

  if (resolvedUserId) {
    payload.usuario_id = resolvedUserId;
  }
  if (userName && userName.trim()) {
    payload.nome_usuario = userName.trim();
  }
  if (userId) payload.userId = userId;
  if (userName) payload.userName = userName;
  if (guestId) payload.guestId = guestId;
  if (typeof isGuest === "boolean") payload.isGuest = isGuest;
  if (systemHint && systemHint.trim()) payload.systemHint = systemHint.trim();

  return payload;
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
  streamStats: StreamRunStats;
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
    try {
      console.debug('[DIAG] setDigitando:before', {
        clientMessageId,
        value: false,
        phase: 'handleDone',
      });
    } catch {
      /* noop */
    }
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

    const finishReasonSource = (() => {
      const streamMeta = toRecord(doneContext.streamStats?.lastMeta);
      if (streamMeta && typeof streamMeta === "object") {
        return streamMeta;
      }
      const metadataRecord = toRecord(metadataBase);
      if (metadataRecord && typeof metadataRecord === "object") {
        return metadataRecord;
      }
      return undefined;
    })();
    const finishReasonValue = (() => {
      if (!finishReasonSource) return undefined;
      const direct =
        (finishReasonSource as Record<string, unknown>).finishReason ??
        (finishReasonSource as Record<string, unknown>).finish_reason;
      if (typeof direct === "string" && direct.trim().length > 0) {
        return direct.trim();
      }
      return direct;
    })();
    const annotateWithFinishReason = (metadata: unknown): unknown => {
      if (!(aggregatedLength === 0 && finishReasonValue !== undefined)) {
        return metadata;
      }
      if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
        return {
          ...(metadata as Record<string, unknown>),
          finishReason: finishReasonValue,
        };
      }
      if (metadata === undefined) {
        return { finishReason: finishReasonValue };
      }
      return {
        finishReason: finishReasonValue,
        value: metadata,
      };
    };
    patch.metadata = annotateWithFinishReason(patch.metadata);
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
            nextMessage.metadata = annotateWithFinishReason(nextMessage.metadata);
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
    const scheduleFinalize = () => {
      const latestEntry = doneContext.replyState.ecoReplyStateRef.current[assistantId];
      finalizeWithEntry(latestEntry);
    };

    if (typeof queueMicrotask === "function") {
      queueMicrotask(scheduleFinalize);
    } else {
      void Promise.resolve()
        .then(scheduleFinalize)
        .catch(() => {
          scheduleFinalize();
        });
    }
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
  const resolvedName = (() => {
    const candidates = [toRecord(event) ?? {}, payloadRecord ?? {}];
    const rawName = pickStringFromRecords(candidates, ["name", "event", "type"]);
    return typeof rawName === "string" ? rawName.trim().toLowerCase() : undefined;
  })();
  const extractMetaRecord = (): Record<string, unknown> | undefined => {
    const metaCandidate =
      toRecord(payloadRecord?.meta) ?? toRecord(payloadRecord?.metadata) ?? toRecord(payloadRecord);
    if (metaCandidate && typeof metaCandidate === "object" && !Array.isArray(metaCandidate)) {
      return metaCandidate;
    }
    return undefined;
  };
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

  if (resolvedName === "meta") {
    const meta = extractMetaRecord();
    try {
      console.debug('[SSE] meta', meta ?? null);
    } catch {
      /* noop */
    }
    if (meta) {
      applyMetaToStreamStats(context.streamStats, meta);
    }
  }

  if (resolvedName === "done") {
    const meta = extractMetaRecord();
    try {
      const metaForLog = meta as
        | (Record<string, unknown> & { finishReason?: unknown; usage?: unknown; modelo?: unknown })
        | undefined;
      console.debug('[SSE] done', {
        finishReason: metaForLog?.finishReason,
        usage: metaForLog?.usage,
        modelo: metaForLog?.modelo,
      });
    } catch {
      /* noop */
    }
    if (meta) {
      applyMetaToStreamStats(context.streamStats, meta);
    }
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
}: BeginStreamParams): Promise<StreamRunStats> | void => {
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
        try {
          console.debug('[DIAG] setStreamActive:before', {
            clientMessageId: normalizedActiveId,
            value: false,
            phase: 'abort-existing',
          });
        } catch {
          /* noop */
        }
        setStreamActive(false);
        try {
          console.debug('[DIAG] controller.abort:before', {
            clientMessageId: normalizedActiveId,
            reason: 'new-send',
            timestamp: Date.now(),
          });
        } catch {
          /* noop */
        }
        try {
          console.info("[SSE] aborting_active_stream", {
            clientMessageId: normalizedActiveId,
            reason: "new-send",
            timestamp: Date.now(),
          });
        } catch {
          /* noop */
        }
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
  try {
    console.debug('[DIAG] streamActiveRef:update', {
      clientMessageId,
      value: true,
      phase: 'beginStream:start',
    });
  } catch {
    /* noop */
  }
  streamActiveRef.current = true;

  updateCurrentInteractionId(null);

  if (tracking.pendingAssistantMetaRef.current[clientMessageId]) {
    delete tracking.pendingAssistantMetaRef.current[clientMessageId];
  }

  try {
    console.debug('[DIAG] setDigitando:before', {
      clientMessageId,
      value: true,
      phase: 'beginStream:start',
    });
  } catch {
    /* noop */
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

  const streamStats: StreamRunStats = {
    aggregatedLength: 0,
    gotAnyChunk: false,
    lastMeta: undefined,
    finishReasonFromMeta: undefined,
  };

  let firstEventTimer: ReturnType<typeof setInterval> | null = null;
  let lastActivityAt = Date.now();

  const clearFirstEventGuard = () => {
    if (firstEventTimer !== null) {
      clearInterval(firstEventTimer);
      firstEventTimer = null;
    }
  };

  const bumpActivity = () => {
    lastActivityAt = Date.now();
  };

  const armFirstEventGuard = (onTimeout: (reason: "first_event_timeout") => void) => {
    if (typeof setInterval !== "function") {
      return;
    }
    clearFirstEventGuard();
    lastActivityAt = Date.now();
    firstEventTimer = setInterval(() => {
      const grace = streamStats.gotAnyChunk ? HEARTBEAT_GRACE_MS : FIRST_EVENT_GRACE_MS;
      const since = Date.now() - lastActivityAt;
      if (since > grace) {
        clearFirstEventGuard();
        try {
          console.info("[SSE] first-event-timeout", { clientMessageId, since, grace });
        } catch {
          /* noop */
        }
        onTimeout("first_event_timeout");
      }
    }, 1_000);
  };

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
    streamStats,
  };

  const streamPromise = (async () => {
    const requestBody = buildEcoRequestBody({
      history,
      clientMessageId,
      systemHint,
      userId,
      userName,
      guestId,
      isGuest,
    });

    const identityHeaders = buildIdentityHeaders();
    const baseHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...identityHeaders,
    };
    const diagForceJson =
      typeof window !== "undefined" && Boolean((window as { __ecoDiag?: { forceJson?: boolean } }).__ecoDiag?.forceJson);
    const acceptHeader = diagForceJson ? "application/json" : "text/event-stream";
    baseHeaders["Accept"] = acceptHeader;
    const requestPayload = diagForceJson ? { ...requestBody, stream: false } : requestBody;

    const resolvedClientId = (() => {
      const explicit = identityHeaders["X-Client-Id"] ?? (identityHeaders as Record<string, string | undefined>)["x-client-id"];
      if (typeof explicit === "string" && explicit.trim().length > 0) {
        return explicit.trim();
      }
      return "web";
    })();
    baseHeaders["X-Client-Id"] = resolvedClientId;

    const contexto = (requestBody as { contexto?: { stream_id?: unknown; streamId?: unknown } })?.contexto;
    const streamIdCandidates: unknown[] = [
      (requestBody as { streamId?: unknown })?.streamId,
      contexto?.stream_id,
      contexto?.streamId,
    ];
    const streamId = streamIdCandidates
      .map((candidate) => (typeof candidate === "string" ? candidate.trim() : ""))
      .find((candidate) => candidate.length > 0);
    if (streamId) {
      baseHeaders["X-Stream-Id"] = streamId;
    }

    let response: Response;
    try {
      console.debug('[DIAG] setStreamActive:before', {
        clientMessageId,
        value: true,
        phase: 'fetch:before',
      });
    } catch {
      /* noop */
    }
    setStreamActive(true);
    try {
      const url = resolveApiUrl("/api/ask-eco");
      try {
        console.debug('[DIAG] start', { url, accept: acceptHeader, forcedJson: diagForceJson });
      } catch {
        /* noop */
      }
      response = await fetch(url, {
        method: "POST",
        mode: "cors",
        credentials: "include",
        headers: baseHeaders,
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
        cache: "no-store",
        // keepalive: true,  // ❌ NÃO usar em SSE
      });
    } catch (error) {
      const formatted = formatAbortReason(error);
      logSse("abort", {
        clientMessageId: normalizedClientId,
        reason: formatted,
        source: "fetch",
      });
      throw error;
    }

    const headerEntries = Array.from(response.headers.entries());
    const headerMap = headerEntries.reduce<Record<string, string>>((acc, [key, value]) => {
      acc[key.toLowerCase()] = value;
      return acc;
    }, {});
    const contentType = headerMap["content-type"]?.toLowerCase() ?? "";

    logSse("open", {
      clientMessageId: normalizedClientId,
      status: response.status,
      contentType,
    });
    bumpActivity();
    try {
      console.info("[EcoStream] onStreamOpen", {
        clientMessageId,
        status: response.status ?? null,
        contentType,
      });
    } catch {
      /* noop */
    }

    if (!response.ok) {
      let detail = "";
      try {
        detail = await response.text();
      } catch {
        detail = "";
      }
      const trimmed = detail.trim();
      const preview = trimmed.slice(0, 200);
      const message = trimmed.startsWith("<!DOCTYPE")
        ? `Gateway/edge retornou HTML (${response.status}). Ver backlogs. Trecho: ${preview}...`
        : trimmed || `Eco stream request failed (${response.status})`;
      throw new Error(message);
    }

    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let doneReceived = false;
    let fatalError: Error | null = null;
    let firstChunkDelivered = false;

    const buildRecordChain = (rawEvent?: Record<string, unknown>): Record<string, unknown>[] => {
      const eventRecord = toRecord(rawEvent) ?? undefined;
      const payloadRecord = toRecord(eventRecord?.payload) ?? undefined;
      const metaRecord = toRecord(eventRecord?.meta) ?? undefined;
      const metadataRecord = toRecord(payloadRecord?.metadata) ?? toRecord(eventRecord?.metadata) ?? undefined;
      const responseRecord = toRecord(payloadRecord?.response) ?? undefined;
      const contextRecord = toRecord(payloadRecord?.context) ?? undefined;
      return [metadataRecord, metaRecord, responseRecord, payloadRecord, contextRecord, eventRecord].filter(
        Boolean,
      ) as Record<string, unknown>[];
    };

    const extractPayloadRecord = (rawEvent?: Record<string, unknown>) => {
      const eventRecord = toRecord(rawEvent);
      return toRecord(eventRecord?.payload) ?? undefined;
    };

    const processChunkEvent = (index: number, delta: string, rawEvent: Record<string, unknown>) => {
      if (controller.signal.aborted) return;
      bumpActivity();
      streamStats.gotAnyChunk = true;
      streamStats.aggregatedLength += delta.length;
      if (!firstChunkDelivered) {
        firstChunkDelivered = true;
        onFirstChunk?.();
      }
      try {
        console.debug('[SSE] chunk', {
          idx: index,
          len: delta.length,
          sample: delta.slice(0, 40),
        });
      } catch {
        /* noop */
      }
      const payloadRecord = extractPayloadRecord(rawEvent);
      const metadataRecord =
        toRecord(payloadRecord?.metadata) ?? toRecord((rawEvent as Record<string, unknown>)?.metadata);
      const records = buildRecordChain(rawEvent);
      const interactionId =
        pickStringFromRecords(records, ["interaction_id", "interactionId", "interactionID"]) ?? undefined;
      const messageId = pickStringFromRecords(records, ["message_id", "messageId", "id"]) ?? undefined;
      const createdAt =
        pickStringFromRecords(records, ["created_at", "createdAt", "timestamp"]) ?? undefined;

      const chunk: EcoStreamChunk = {
        index,
        text: delta,
        interactionId,
        messageId,
        createdAt,
        metadata: metadataRecord ?? undefined,
        payload: payloadRecord ?? rawEvent,
        isFirstChunk: index === 0,
      };

      handleChunk(chunk, sharedContext);
    };

    const handlePromptEvent = (rawEvent: Record<string, unknown>) => {
      if (controller.signal.aborted) return;
      bumpActivity();
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

      handlePromptReady(promptEvent, sharedContext);
    };

    const handleControlEvent = (rawEvent: Record<string, unknown>) => {
      if (controller.signal.aborted) return;
      bumpActivity();
      const records = buildRecordChain(rawEvent);
      const interactionId =
        pickStringFromRecords(records, ["interaction_id", "interactionId", "interactionID"]) ?? undefined;
      const messageId = pickStringFromRecords(records, ["message_id", "messageId", "id"]) ?? undefined;
      const payloadRecord = extractPayloadRecord(rawEvent);
      const name =
        pickStringFromRecords([toRecord(rawEvent) ?? {}, payloadRecord ?? {}], ["name", "event", "type"]) ??
        undefined;

      const controlEvent: EcoStreamControlEvent = {
        name,
        interactionId,
        messageId,
        payload: payloadRecord ?? rawEvent,
      };

      handleControl(controlEvent, sharedContext);
    };

    const handleStreamDone = (
      rawEvent?: Record<string, unknown>,
      options?: { reason?: string },
    ) => {
      if (controller.signal.aborted || doneReceived) return;
      doneReceived = true;

      clearFirstEventGuard();
      bumpActivity();

      if (activeStreamClientIdRef.current === clientMessageId) {
        streamActiveRef.current = false;
        try {
          console.debug('[DIAG] setStreamActive:before', {
            clientMessageId,
            value: false,
            phase: 'handleStreamDone',
          });
        } catch {
          /* noop */
        }
        setStreamActive(false);
      }

      const eventRecord = toRecord(rawEvent) ?? undefined;
      const records = buildRecordChain(rawEvent);
      const interactionId =
        pickStringFromRecords(records, ["interaction_id", "interactionId", "interactionID"]) ?? undefined;
      const messageId = pickStringFromRecords(records, ["message_id", "messageId", "id"]) ?? undefined;
      const createdAt =
        pickStringFromRecords(records, ["created_at", "createdAt", "timestamp"]) ?? undefined;
      const clientMetaId =
        pickStringFromRecords(records, ["client_message_id", "clientMessageId"]) ?? undefined;
      const payloadRecord = extractPayloadRecord(rawEvent);
      const eventMetaRecord = toRecord(eventRecord?.meta) ?? undefined;

      const now = Date.now();
      const metrics = streamTimersRef.current[normalizedClientId];
      const totalMs = metrics ? now - metrics.startedAt : undefined;
      const doneReason = (() => {
        if (options?.reason) return options.reason;
        if (rawEvent) {
          if ((rawEvent as { done?: unknown }).done === true) {
            return "done_message_compat";
          }
          return payloadRecord ? "server-done" : "server-done-empty";
        }
        return "missing-event";
      })();
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

      const doneMetaRecord =
        toRecord(payloadRecord?.meta) ??
        toRecord(payloadRecord?.metadata) ??
        eventMetaRecord ??
        toRecord(eventRecord?.metadata) ??
        toRecord(payloadRecord);
      if (doneMetaRecord) {
        applyMetaToStreamStats(sharedContext.streamStats, doneMetaRecord);
      } else if (eventMetaRecord) {
        applyMetaToStreamStats(sharedContext.streamStats, eventMetaRecord);
      } else {
        const finishReasonFallback =
          extractFinishReasonFromMeta(eventRecord) ??
          extractFinishReasonFromMeta(payloadRecord);
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
      const endedBeforeFirstChunk = !sharedContext.streamStats.gotAnyChunk;
      const serverReportedClientDisconnect = finishReasonNormalized === "client_disconnect";
      if (endedBeforeFirstChunk && serverReportedClientDisconnect) {
        try {
          console.warn("[DIAG] server_reported_client_disconnect", {
            clientMessageId,
            totalMs,
            finishReason: sharedContext.streamStats.finishReasonFromMeta ?? null,
          });
        } catch {
          /* noop */
        }
        try {
          console.debug('[DIAG] setErroApi:before', {
            clientMessageId,
            value: 'A conexão foi encerrada antes da Eco responder. Tente novamente.',
            phase: 'server_client_disconnect',
          });
        } catch {
          /* noop */
        }
        try {
          setErroApi("A conexão foi encerrada antes da Eco responder. Tente novamente.");
        } catch {
          /* noop */
        }
        if (!controller.signal.aborted) {
          try {
            console.debug('[DIAG] controller.abort:before', {
              clientMessageId,
              reason: 'server_reported_client_disconnect_before_first_chunk',
              timestamp: Date.now(),
            });
          } catch {
            /* noop */
          }
          try {
            controller.abort('server_reported_client_disconnect_before_first_chunk');
          } catch {
            /* noop */
          }
        }
      }

      const assistantId = ensureAssistantMessage(clientMessageId, ensureMeta);
      if (!assistantId) return;

      activeAssistantIdRef.current = assistantId;

      const doneEvent: EcoStreamDoneEvent = {
        interactionId: interactionId ?? undefined,
        messageId: messageId ?? undefined,
        createdAt: createdAt ?? undefined,
        payload: payloadRecord ?? toRecord(rawEvent) ?? undefined,
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

    const handleErrorEvent = (rawEvent: Record<string, unknown>) => {
      bumpActivity();
      const records = buildRecordChain(rawEvent);
      const message =
        pickStringFromRecords(records, ["message", "error", "detail", "reason"]) ??
        "Erro na stream SSE da Eco.";
      fatalError = new Error(message);
    };

    if (!contentType.includes("text/event-stream")) {
      if (diagForceJson && contentType.includes("application/json")) {
        let jsonPayload: unknown;
        try {
          jsonPayload = await response.json();
        } catch {
          jsonPayload = undefined;
        }
        try {
          console.debug('[DIAG] json_response', jsonPayload);
        } catch {
          /* noop */
        }
        const recordPayload =
          toRecord(jsonPayload) ?? (typeof jsonPayload === "object" && jsonPayload ? (jsonPayload as Record<string, unknown>) : undefined);
        handleStreamDone(recordPayload);
        return streamStats;
      }
      let detail = "";
      try {
        detail = await response.text();
      } catch {
        detail = "";
      }
      const trimmed = detail.trim();
      const preview = trimmed.slice(0, 200);
      const baseMessage = `Resposta inválida: status=${response.status} content-type=${
        contentType || "<desconhecido>"
      }`;
      const message = trimmed.startsWith("<!DOCTYPE")
        ? `Gateway/edge retornou HTML (${response.status}). Ver backlogs. Trecho: ${preview}...`
        : `${baseMessage}${preview ? ` body=${preview}...` : ""}`;
      throw new Error(message);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Eco stream response has no readable body.");
    }

    (globalThis as any).__ecoActiveReader = reader;

    armFirstEventGuard((reason) => {
      handleStreamDone(undefined, { reason });
    });

    const handlers: ProcessSseHandlers = {
      appendAssistantDelta: (index, delta, event) => processChunkEvent(index, delta, event),
      onStreamDone: (event) => handleStreamDone(event),
      onPromptReady: (event) => handlePromptEvent(event),
      onControl: (event) => handleControlEvent(event),
      onError: (event) => handleErrorEvent(event),
    };

    const processEventBlock = (block: string) => {
      if (!block) return;
      const normalizedBlock = block.replace(/\r\n/g, "\n");
      const lines = normalizedBlock.split("\n");
      let currentEventName: string | undefined;
      const dataParts: string[] = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (trimmed.startsWith(":")) {
          const comment = trimmed.slice(1).trim();
          bumpActivity();
          if (comment) {
            try {
              console.info("[SSE] comment", { comment });
            } catch {
              /* noop */
            }
          }
          continue;
        }
        if (trimmed.startsWith("event:")) {
          const declaredEvent = trimmed.slice(6).trim();
          currentEventName = declaredEvent || undefined;
          continue;
        }
        if (!trimmed.startsWith("data:")) continue;

        const dataIndex = line.indexOf("data:");
        const rawValue = dataIndex >= 0 ? line.slice(dataIndex + 5) : line.slice(5);
        const normalizedValue = rawValue.startsWith(" ") ? rawValue.slice(1) : rawValue;
        if (!normalizedValue.trim()) continue;
        dataParts.push(normalizedValue);
      }

      if (dataParts.length === 0) return;

      const payload = dataParts.join("\n");
      const payloadForParse = payload.trim();
      if (!payloadForParse) return;

      try {
        console.info("[SSE] event_data", {
          event: currentEventName ?? "message",
          data: payloadForParse,
        });
      } catch {
        /* noop */
      }

      processSseLine(payloadForParse, handlers, { eventName: currentEventName });
      if (fatalError) return;
    };

    while (true) {
      if (controller.signal.aborted) break;
      let chunk: ReadableStreamReadResult<Uint8Array>;
      try {
        chunk = await reader.read();
      } catch (error: any) {
        if (controller.signal.aborted || error?.name === "AbortError") {
          break;
        }
        throw error;
      }

      const { value, done } = chunk;
      if (done) {
        buffer += decoder.decode();
        if (buffer) {
          processEventBlock(buffer);
          buffer = "";
        }
        break;
      }

      if (value) {
        buffer += decoder.decode(value, { stream: true });
        let delimiterIndex = buffer.indexOf("\n\n");
        while (delimiterIndex !== -1) {
          const eventBlock = buffer.slice(0, delimiterIndex);
          buffer = buffer.slice(delimiterIndex + 2);
          processEventBlock(eventBlock);
          if (fatalError) break;
          delimiterIndex = buffer.indexOf("\n\n");
        }
      }

      if (fatalError) break;
    }

    if (fatalError) {
      throw fatalError;
    }

    if (!doneReceived && !controller.signal.aborted) {
      handleStreamDone();
    }

    return streamStats;
  })();

  streamPromise.catch((error) => {
    if (controller.signal.aborted) return;
    clearFirstEventGuard();
    if (activeStreamClientIdRef.current === clientMessageId) {
      streamActiveRef.current = false;
      try {
        console.debug('[DIAG] setStreamActive:before', {
          clientMessageId,
          value: false,
          phase: 'streamPromise:catch',
        });
      } catch {
        /* noop */
      }
      setStreamActive(false);
    }
    const message = error instanceof Error ? error.message : "Falha ao iniciar a resposta da Eco.";
    try {
      console.debug('[DIAG] setErroApi:before', {
        clientMessageId,
        value: message,
        phase: 'streamPromise:catch',
      });
    } catch {
      /* noop */
    }
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
    clearFirstEventGuard();
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
        const finishReasonFromMeta =
          sharedContext.streamStats.finishReasonFromMeta ??
          (() => {
            const meta = sharedContext.streamStats.lastMeta;
            if (meta && typeof meta === "object" && !Array.isArray(meta)) {
              const record = meta as Record<string, unknown> & {
                finishReason?: unknown;
                finish_reason?: unknown;
                reason?: unknown;
              };
              const candidate = record.finishReason ?? record.finish_reason ?? record.reason;
              if (typeof candidate === "string") {
                const trimmed = candidate.trim();
                return trimmed ? trimmed : undefined;
              }
            }
            return undefined;
          })();
        const logPayload: Record<string, unknown> = {
          clientMessageId,
          gotAnyChunk: streamStats.gotAnyChunk,
          aggregatedLength: streamStats.aggregatedLength,
        };
        if (finishReasonFromMeta !== undefined) {
          logPayload.finishReasonFromMeta = finishReasonFromMeta;
        }
        try {
          console.info('[EcoStream] stream_completed', logPayload);
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
      const closeReason = wasAborted ? "stream_aborted" : "stream_completed";
      try {
        console.info("[SSE] event_source_close:pre", {
          clientMessageId,
          reason: closeReason,
          timestamp: Date.now(),
        });
      } catch {
        /* noop */
      }
      streamActiveRef.current = false;
      try {
        console.debug('[DIAG] setStreamActive:before', {
          clientMessageId,
          value: false,
          phase: 'streamPromise:finally',
        });
      } catch {
        /* noop */
      }
      setStreamActive(false);
      try {
        console.info("[SSE] event_source_close", {
          clientMessageId,
          reason: closeReason,
          timestamp: Date.now(),
        });
      } catch {
        /* noop */
      }
      activeStreamClientIdRef.current = null;
      activeAssistantIdRef.current = null;
      if (wasAborted && assistantId) {
        removeEcoEntry(assistantId);
      }
      try {
        console.debug('[DIAG] setDigitando:before', {
          clientMessageId,
          value: false,
          phase: 'streamPromise:finally:active',
        });
      } catch {
        /* noop */
      }
      setDigitando(false);
      try {
        console.debug('[DIAG] setIsSending:before', {
          clientMessageId,
          value: false,
          phase: 'streamPromise:finally:active',
        });
      } catch {
        /* noop */
      }
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

