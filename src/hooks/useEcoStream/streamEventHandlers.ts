import type { Dispatch, MutableRefObject, SetStateAction } from "react";

import {
  type EcoStreamChunk,
  type EcoStreamControlEvent,
  type EcoStreamDoneEvent,
  type EcoStreamPromptReadyEvent,
} from "../../api/ecoStream";
import { collectTexts, normalizeAskEcoResponse } from "../../api/askEcoResponse";
import type { Message as ChatMessageType } from "../../contexts/ChatContext";
import {
  applyChunkToMessages,
  extractSummaryRecord,
  mergeReplyMetadata,
} from "./chunkProcessor";
import { isDevelopmentEnv } from "./orchestratorConfig";
import { applyMetaToStreamStats } from "./requestBuilder";
import type { StreamSharedContext, RemoveEcoEntryFn } from "./types";
import {
  pickNumberFromRecords,
  pickStringArrayFromRecords,
  pickStringFromRecords,
  toCleanString,
  toRecordSafe,
} from "./utils";

export interface DoneContext extends StreamSharedContext {
  event: EcoStreamDoneEvent | undefined;
  setErroApi: Dispatch<SetStateAction<string | null>>;
  removeEcoEntry: RemoveEcoEntryFn;
  assistantId: string;
}

export type PromptReadyHandlerContext = StreamSharedContext;
export type ChunkHandlerContext = StreamSharedContext;
export type ControlHandlerContext = StreamSharedContext;
export type ErrorHandlerContext = DoneContext;

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

  context.setMessages((prev) =>
    prev.map((m) => {
      if (m.id !== assistantId) return m;
      try {
        console.debug("[DIAG] setMessages:update:before", {
          targetId: assistantId,
          role: m.role ?? m.sender ?? "unknown",
          status: m.status,
          phase: "prompt",
        });
      } catch {
        /* noop */
      }
      const next: ChatMessageType = {
        ...m,
        streaming: true,
        status: "streaming",
        updatedAt,
        createdAt: m.createdAt ?? updatedAt,
        message_id: event?.messageId || m.message_id,
        interaction_id: event?.interactionId || m.interaction_id,
        interactionId: event?.interactionId || m.interactionId,
      };
      try {
        console.debug("[DIAG] setMessages:update:after", {
          targetId: assistantId,
          role: next.role ?? next.sender ?? "unknown",
          status: next.status,
          phase: "prompt",
        });
      } catch {
        /* noop */
      }
      return next;
    }),
  );
};

export const handleChunk = (chunk: EcoStreamChunk, context: StreamSharedContext) => {
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

export const handleDone = (doneContext: DoneContext) => {
  const { event, clientMessageId, normalizedClientId, assistantId } = doneContext;

  const readyStateRef = doneContext.readyStateRef ?? ({ current: false } as MutableRefObject<boolean>);
  const activeStreamClientIdRef =
    doneContext.activeStreamClientIdRef ?? ({ current: null } as MutableRefObject<string | null>);

  const readyReceived = readyStateRef.current === true;
  const noChunksEmitted = readyReceived && !doneContext.streamStats.gotAnyChunk;
  if (noChunksEmitted && !doneContext.streamStats.clientFinishReason) {
    doneContext.streamStats.clientFinishReason = "no_chunks_emitted";
  }

  if (activeStreamClientIdRef.current === clientMessageId) {
    try {
      console.debug("[DIAG] setDigitando:before", {
        clientMessageId,
        value: false,
        phase: "handleDone",
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
  const payloadRecord = toRecordSafe(donePayload);
  const summaryRecord = extractSummaryRecord(donePayload);
  const responseRecord = toRecordSafe(payloadRecord?.response);
  const metadataRecord = toRecordSafe(payloadRecord?.metadata);
  const contextRecord = toRecordSafe(payloadRecord?.context);
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
  const fallbackInteractionFromIds = pickStringFromRecords(recordSources, ["id", "message_id", "messageId"]);
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
    const doneContentCandidate = (() => {
      if (!Array.isArray(doneTexts) || doneTexts.length === 0) return undefined;
      const joined = doneTexts.join("");
      const cleaned = joined
        .replace(/\s*\n\s*/g, "\n")
        .replace(/[ \t\f\v\u00a0]+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
      if (cleaned) return cleaned;
      const normalized = normalizeAskEcoResponse(donePayload);
      if (typeof normalized === "string") {
        const fallback = normalized.trim();
        if (fallback) return fallback;
      }
      return undefined;
    })();

    const normalizedAggregated = aggregatedTextValue.replace(/\s+/g, " ").trim();
    const normalizedDone =
      typeof doneContentCandidate === "string" ? doneContentCandidate.replace(/\s+/g, " ").trim() : "";
    const doneHasRenderableText = typeof doneContentCandidate === "string" && doneContentCandidate.length > 0;

    const hasStructuredDonePayload = (() => {
      if (!payloadRecord) return false;
      const responseRecord = toRecordSafe(payloadRecord.response);
      if (responseRecord && Object.keys(responseRecord).length > 0) return true;
      const responseBodyRecord = toRecordSafe(payloadRecord.responseBody);
      if (responseBodyRecord && Object.keys(responseBodyRecord).length > 0) return true;
      const altResponseBody = toRecordSafe((payloadRecord as { response_body?: unknown }).response_body);
      if (altResponseBody && Object.keys(altResponseBody).length > 0) return true;
      const maybeMessages = (payloadRecord as { messages?: unknown }).messages;
      return Array.isArray(maybeMessages) && maybeMessages.length > 0;
    })();

    let finalContent = aggregatedTextValue;
    if (doneHasRenderableText) {
      if (!normalizedAggregated) {
        finalContent = doneContentCandidate!;
      } else if (normalizedAggregated !== normalizedDone) {
        finalContent = doneContentCandidate!;
      }
    } else if (aggregatedLength > 0 && !hasStructuredDonePayload) {
      try {
        console.debug("[DIAG] done:fallback-aggregated", {
          clientMessageId,
          assistantId,
          aggregatedLength,
        });
      } catch {
        /* noop */
      }
    }

    if (readyReceived && aggregatedLength === 0 && !doneHasRenderableText) {
      if (!doneContext.streamStats.clientFinishReason) {
        doneContext.streamStats.clientFinishReason = "no_text_before_done";
      }
      // A lógica de retry e supressão de erro é agora tratada centralmente.
    }

    if (noChunksEmitted) {
      const finishReason = doneContext.streamStats.clientFinishReason;
      const lastError = doneContext.streamStats?.lastError;

      if (finishReason !== "user_cancelled") {
        console.warn(
          `[EcoStream] Nenhum chunk emitido antes do encerramento. Backend pode estar tendo problemas.`,
          {
            clientMessageId,
            finishReason,
            lastError,
            isDevelopment: isDevelopmentEnv,
          },
        );
      }
      // A chamada a setErroApi foi removida para suprimir a bolha de erro.
    }

    const finalText = finalContent;

    const finalStatus = noChunksEmitted
      ? "error"
      : doneContext.streamStats.status === "no_content"
      ? "no_content"
      : "done";

    const patch: ChatMessageType = {
      id: assistantId,
      streaming: false,
      status: finalStatus,
      updatedAt,
    };

    patch.content = finalText;
    patch.text = finalText;

    patch.metadata = mergeReplyMetadata(metadataBase, normalizedClientId);

    const finishReasonSource = (() => {
      const streamMeta = toRecordSafe(doneContext.streamStats?.lastMeta);
      if (streamMeta && typeof streamMeta === "object") {
        return streamMeta;
      }
      const metadataRecord = toRecordSafe(metadataBase);
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
      if (typeof direct === "string" && direct.trim().length > 0) return direct.trim();
      return direct;
    })();

    const annotateWithFinishReason = (metadata: unknown): unknown => {
      const shouldAnnotateFinishReason = aggregatedLength === 0 && finishReasonValue !== undefined;
      const clientFinishReason = doneContext.streamStats.clientFinishReason;
      if (!shouldAnnotateFinishReason && !clientFinishReason) return metadata;

      const finishAnnotations: Record<string, unknown> = {};
      if (shouldAnnotateFinishReason && finishReasonValue !== undefined) {
        finishAnnotations.finishReason = finishReasonValue;
      }
      if (clientFinishReason) {
        finishAnnotations.clientFinishReason = clientFinishReason;
      }

      if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
        return { ...(metadata as Record<string, unknown>), ...finishAnnotations };
      }
      if (metadata === undefined) return finishAnnotations;
      return { ...finishAnnotations, value: metadata };
    };

    patch.metadata = annotateWithFinishReason(patch.metadata);
    if (donePayload !== undefined) patch.donePayload = donePayload;
    if (resolvedInteractionId) {
      patch.interaction_id = resolvedInteractionId;
      patch.interactionId = resolvedInteractionId;
    }
    if (resolvedMessageId) patch.message_id = resolvedMessageId;
    if (typeof normalizedLatency === "number") patch.latencyMs = normalizedLatency;
    if (moduleCombo && moduleCombo.length > 0) patch.module_combo = moduleCombo;
    if (promptHash) patch.prompt_hash = promptHash;
    if (typeof ecoScore === "number" && Number.isFinite(ecoScore)) patch.eco_score = ecoScore;

    try {
      console.debug("[DIAG] done", {
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
      doneContext.setMessages((prev) =>
        prev.map((m) => {
          if (m.id === assistantId) {
            try {
              console.debug("[DIAG] setMessages:update:before", {
                targetId: assistantId,
                role: m.role ?? m.sender ?? "unknown",
                status: m.status,
                phase: "done",
              });
            } catch {
              /* noop */
            }
            const next: ChatMessageType = {
              ...m,
              streaming: false,
              status: finalStatus,
              updatedAt,
              content: finalText,
              text: finalText,
            };
            next.metadata = mergeReplyMetadata(metadataBase, normalizedClientId);
            next.metadata = annotateWithFinishReason(next.metadata);
            if (donePayload !== undefined) next.donePayload = donePayload;
            if (resolvedInteractionId) {
              next.interaction_id = resolvedInteractionId;
              next.interactionId = resolvedInteractionId;
            }
            if (resolvedMessageId) next.message_id = resolvedMessageId;
            if (typeof normalizedLatency === "number") next.latencyMs = normalizedLatency;
            if (moduleCombo && moduleCombo.length > 0) next.module_combo = moduleCombo;
            if (promptHash) next.prompt_hash = promptHash;
            if (typeof ecoScore === "number" && Number.isFinite(ecoScore)) next.eco_score = ecoScore;
            try {
              console.debug("[DIAG] setMessages:update:after", {
                targetId: assistantId,
                role: next.role ?? next.sender ?? "unknown",
                status: next.status,
                nextLength: typeof next.text === "string" ? next.text.length : 0,
                phase: "done",
              });
            } catch {
              /* noop */
            }
            return next;
          }
          return m;
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

  readyStateRef.current = false;
};

export const handleError = (error: unknown, context: DoneContext) => {
  const message = error instanceof Error ? error.message : "Não foi possível concluir a resposta da Eco.";
  context.setErroApi(message);
  if (!context.streamStats.clientFinishReason) {
    context.streamStats.clientFinishReason = "error";
  }
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
    console.debug("[DIAG] error", {
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

export const handleControl = (event: EcoStreamControlEvent, context: StreamSharedContext) => {
  const explicit = toCleanString(event?.interactionId);
  const payloadRecord = toRecordSafe(event?.payload);
  const eventRecord = toRecordSafe(event);
  const candidates = [
    payloadRecord,
    eventRecord,
    toRecordSafe((eventRecord as { metadata?: unknown })?.metadata),
    toRecordSafe((eventRecord as { meta?: unknown })?.meta),
  ].filter(Boolean) as Record<string, unknown>[];
  const resolvedName = (() => {
    const rawName = pickStringFromRecords(candidates, ["name", "event", "type"]);
    return typeof rawName === "string" ? rawName.trim().toLowerCase() : undefined;
  })();

  const extractMetaRecord = (): Record<string, unknown> | undefined => {
    const candidates = [
      toRecordSafe(payloadRecord?.meta),
      toRecordSafe(payloadRecord?.metadata),
      toRecordSafe(payloadRecord),
    ];
    for (const candidate of candidates) {
      if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
        if (Object.keys(candidate).length === 0) continue;
        return candidate;
      }
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
    console.debug("[DIAG] control", {
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
      console.debug("[SSE] meta", meta ?? null);
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
      console.debug("[SSE] done", {
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
