import type { Dispatch, MutableRefObject, SetStateAction } from "react";

import {
  type EcoStreamChunk,
  type EcoStreamControlEvent,
  type EcoStreamDoneEvent,
  type EcoStreamPromptReadyEvent,
} from "../../api/ecoStream";
import { collectTexts } from "../../api/askEcoResponse";
import type { Message as ChatMessageType, UpsertMessageOptions } from "../../contexts/ChatContext";
import type { EnsureAssistantEventMeta, MessageTrackingRefs, ReplyStateController } from "./messageState";
import {
  applyMetaToStreamStats,
  buildEcoRequestBody,
  extractFinishReasonFromMeta,
} from "./requestBuilder";
import type {
  EnsureAssistantMessageFn,
  InteractionMapAction,
  RemoveEcoEntryFn,
  StreamRunStats,
  StreamSharedContext,
} from "./types";
import {
  applyChunkToMessages,
  extractText,
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
import { rememberGuestIdentityFromResponse, rememberSessionIdentityFromResponse } from "../../lib/guestId";
import { setStreamActive } from "./streamStatus";
import { NO_TEXT_ALERT_MESSAGE, showToast } from "../useEcoStream.helpers";
import { API_BASE } from "@/api/config";
import { ASK_ECO_ENDPOINT_PATH } from "@/api/askEcoUrl";
import { getOrCreateGuestId, getOrCreateSessionId, rememberIdsFromResponse } from "@/utils/identity";
import {
  onControl,
  onDone,
  onError,
  onMessage,
  onPromptReady,
  processChunk,
} from "./session/streamEvents";
import {
  StreamSession,
  StreamFallbackManager,
  createDefaultTimers,
  createSseWatchdogs,
  withTypingWatchdog,
  resolveStreamGuardTimeoutMs,
  abortControllerSafely,
  TYPING_WATCHDOG_MS,
  type StreamRunnerTimers,
  type CloseReason,
  type BeginStreamParams,
} from "./session/StreamSession";
export type {
  StreamRunStats,
  StreamSharedContext,
  EnsureAssistantMessageFn,
  RemoveEcoEntryFn,
  InteractionMapAction,
} from "./types";
export type { StreamRunnerTimers, CloseReason, BeginStreamParams } from "./session/StreamSession";

const FALLBACK_NO_CHUNK_REASONS = new Set<string>([
  "client_disconnect",
  "stream_aborted",
  "watchdog_first_token",
  "watchdog_heartbeat",
  "fallback_guard_timeout",
  "server-done-empty",
  "missing-event",
  "start-error",
]);

const inflightControllers = new Map<string, AbortController>();
const streamStartLogged = new Set<string>();

const isDevelopmentEnv = (() => {
  try {
    const meta = import.meta as { env?: { DEV?: boolean; MODE?: string; mode?: string } };
    if (typeof meta?.env?.DEV === "boolean") {
      return meta.env.DEV;
    }
    const mode = meta?.env?.MODE ?? meta?.env?.mode;
    if (typeof mode === "string" && mode.trim()) {
      return mode.trim().toLowerCase() === "development";
    }
  } catch {
    /* noop */
  }
  try {
    const nodeEnv = (
      globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }
    ).process?.env?.NODE_ENV;
    if (typeof nodeEnv === "string" && nodeEnv.trim()) {
      return nodeEnv.trim().toLowerCase() === "development";
    }
  } catch {
    /* noop */
  }
  return false;
})();

const logDev = (label: string, payload: Record<string, unknown>) => {
  if (!isDevelopmentEnv) return;
  try {
    console.debug(`[EcoStream] ${label}`, payload);
  } catch {
    /* noop */
  }
};

type AllowedAbortReason = "watchdog_timeout" | "user_cancel";

const ALLOWED_ABORT_REASONS = new Set<AllowedAbortReason>(["watchdog_timeout", "user_cancel"]);

const logAbortDebug = (reason: AllowedAbortReason) => {
  try {
    console.log('[DEBUG] Abortando conexão', { reason, stack: new Error().stack });
  } catch {
    /* noop */
  }
};

const abortControllerSafely = (
  controller: AbortController,
  reason: AllowedAbortReason,
): boolean => {
  if (controller.signal.aborted) {
    return false;
  }
  if (!ALLOWED_ABORT_REASONS.has(reason)) {
    try {
      console.warn('[SSE] abort_ignored', { reason });
    } catch {
      /* noop */
    }
    return false;
  }
  logAbortDebug(reason);
  try {
    controller.abort(reason);
    return true;
  } catch {
    try {
      controller.abort();
      return true;
    } catch {
      /* noop */
    }
  }
  return false;
};

export async function openEcoSseStream(opts: {
  url: string;
  body: unknown;
  onPromptReady?: () => void;
  onChunk?: (delta: string) => void;
  onControl?: (name: string, payload?: any) => void;
  onDone?: (meta?: any) => void;
  onError?: (err: Error) => void;
  controller?: AbortController;
}) {
  const {
    url,
    body: _body,
    onPromptReady,
    onChunk,
    onControl,
    onDone,
    onError,
    controller = new AbortController(),
  } = opts;

  const wd = createSseWatchdogs("legacy", createDefaultTimers());
  let closed = false;
  let closeReason: CloseReason | null = null;
  let streamErrored = false;

  const safeClose = (reason: CloseReason) => {
    if (closed) return;
    closed = true;
    closeReason = reason;
    if (reason === "watchdog_first_token" || reason === "watchdog_heartbeat") {
      abortControllerSafely(controller, "watchdog_timeout");
    } else if (reason === "ui_abort") {
      abortControllerSafely(controller, "user_cancel");
    } else if (!controller.signal.aborted) {
      try {
        console.warn('[SSE] abort_ignored', { reason });
      } catch {
        /* noop */
      }
    }
    try {
      wd.clear();
    } catch {
      /* noop */
    }
  };
  const onWdTimeout = (reason: CloseReason) => {
    safeClose(reason);
    streamErrored = true;
    onError?.(new Error(`SSE watchdog timeout: ${reason}`));
  };

  const acceptHeader = "text/event-stream";
  const forcedJson = false;
  const requestMethod = "POST" as const;
  const requestBody = _body === undefined ? undefined : JSON.stringify(_body);
  const requestHeaders: Record<string, string> = {
    Accept: acceptHeader,
    "Content-Type": "application/json",
  };

  console.log("[DIAG] start", { url, accept: acceptHeader, forcedJson, method: requestMethod });
  console.log("[SSE-DEBUG] Conectando", {
    url,
    method: requestMethod,
    headers: Object.keys(requestHeaders),
  });

  const res = await fetch(url, {
    method: requestMethod,
    headers: requestHeaders,
    credentials: "omit",
    mode: "cors",
    signal: controller.signal,
    body: requestBody,
  });

  const responseHeaders = (() => {
    try {
      return Object.fromEntries(res.headers.entries());
    } catch {
      return {} as Record<string, string>;
    }
  })();

  console.log("[DIAG] response", {
    ok: res.ok,
    status: res.status,
    ct: res.headers.get("content-type"),
    xab: res.headers.get("x-accel-buffering"),
    headers: responseHeaders,
  });

  if (!res.ok || !res.body) {
    streamErrored = true;
    onError?.(new Error(`SSE failed: ${res.status}`));
    safeClose("network_error");
    return { abort: () => safeClose("ui_abort") } as const;
  }

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let bytes = 0;
  let chunks = 0;

  const markPromptReady = () => {
    onPromptReady?.();
    wd.markPromptReady(onWdTimeout);
  };

  const readLoop = async () => {
    try {
      while (!closed) {
        const { value, done } = await reader.read();
        if (value && value.byteLength > 0) {
          bytes += value.byteLength;
          chunks += 1;
        }
        if (done) break;
        if (value) {
          buf += dec.decode(value, { stream: true });
        }

        let idx: number;
        while ((idx = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, idx).trim();
          buf = buf.slice(idx + 1);
          if (!line || line.startsWith(":")) continue;

          if (line.startsWith("data:")) {
            const json = line.slice(5).trim();
            try {
              const evt = JSON.parse(json);
              const type = evt?.type ?? evt?.event ?? "chunk";
              try {
                const previewSource =
                  typeof evt?.delta === "string"
                    ? evt.delta
                    : typeof evt?.text === "string"
                    ? evt.text
                    : typeof evt?.payload?.text === "string"
                    ? evt.payload.text
                    : typeof evt?.data === "string"
                    ? evt.data
                    : undefined;
                console.log("[SSE-DEBUG] Evento", {
                  type: evt?.event ?? evt?.name ?? type,
                  hasData: Boolean(evt?.data ?? evt?.delta ?? evt?.text ?? evt?.payload),
                  preview: typeof previewSource === "string" ? previewSource.slice(0, 50) : undefined,
                });
              } catch {
                /* noop */
              }
              if (type === "control" && evt?.name === "prompt_ready") {
                markPromptReady();
                continue;
              }
              if (type === "control" && evt?.name === "ping") {
                wd.bumpHeartbeat(onWdTimeout);
                continue;
              }
              if (type === "control" && evt?.name === "guard_fallback_trigger") {
                onControl?.("guard_fallback_trigger", evt?.payload);
                wd.bumpHeartbeat(onWdTimeout);
                continue;
              }
              if (type === "control" && evt?.name === "done") {
                if (chunks === 0) {
                  const payloadText =
                    typeof evt?.payload?.text === "string" ? evt.payload.text : undefined;
                  const dataText = (() => {
                    if (typeof evt?.data === "string") return evt.data;
                    if (evt?.data && typeof evt.data === "object") {
                      const nestedText = (evt.data as { text?: unknown }).text;
                      if (typeof nestedText === "string") return nestedText;
                    }
                    return undefined;
                  })();
                  const directText = typeof evt?.text === "string" ? evt.text : undefined;
                  const collected = collectTexts(evt?.payload);
                  const collectedText =
                    Array.isArray(collected) && collected.length > 0 ? collected.join("") : undefined;
                  const finalText = payloadText || dataText || directText || collectedText;

                  if (finalText) {
                    try {
                      console.warn("[SSE] Resposta completa recebida no done (sem chunks)");
                    } catch {
                      /* noop */
                    }
                    onChunk?.(String(finalText));
                    wd.bumpFirstToken(onWdTimeout);
                    chunks = 1;
                    const donePayload = (() => {
                      if (evt?.payload && typeof evt.payload === "object") {
                        const basePayload = { ...(evt.payload as Record<string, unknown>) };
                        if (typeof basePayload.text !== "string") {
                          basePayload.text = String(finalText);
                        }
                        return basePayload;
                      }
                      if (evt?.payload !== undefined) {
                        return { value: evt.payload, text: String(finalText) };
                      }
                      return { text: String(finalText) };
                    })();
                    onDone?.(donePayload);
                    safeClose("server_done");
                  } else {
                    streamErrored = true;
                    onError?.(new Error("Stream vazio: backend finalizou sem enviar chunks."));
                    safeClose("server_error");
                  }
                } else {
                  onDone?.(evt?.payload);
                  safeClose("server_done");
                }
                break;
              }
              if (type === "chunk") {
                if (evt?.delta) onChunk?.(String(evt.delta));
                wd.bumpFirstToken(onWdTimeout);
                continue;
              }
              if (type === "control") {
                onControl?.(evt?.name ?? "control", evt?.payload);
                wd.bumpHeartbeat(onWdTimeout);
                continue;
              }
            } catch {
              /* linha quebrada */
            }
          }
        }
      }
    } catch (e: any) {
      if (!closed && e?.name !== "AbortError") {
        streamErrored = true;
        onError?.(e instanceof Error ? e : new Error(String(e)));
        safeClose("server_error");
      }
    } finally {
      console.log("[DIAG] stream:end", { bytes, chunks });
      const endedByUiAbort = closeReason === "ui_abort";
      const endedByWatchdog =
        closeReason === "watchdog_first_token" || closeReason === "watchdog_heartbeat";
      if (!streamErrored && chunks === 0 && !endedByUiAbort && !endedByWatchdog) {
        streamErrored = true;
        onError?.(new Error("Stream vazio: backend finalizou sem enviar chunks."));
      }
      try {
        await reader.cancel();
      } catch {
        /* noop */
      }
      wd.clear();
      if (!closed) safeClose("server_error");
      try {
        console.info("[FE] sse:finalize", { reason: closeReason });
      } catch {
        /* noop */
      }
    }
  };

  void readLoop();
  return { abort: () => safeClose("ui_abort"), get closed() { return closed; } } as const;
}

const diag = (...args: unknown[]) => {
  try {
    const envContainer = import.meta as { env?: Record<string, unknown> };
    const isDev = Boolean(envContainer?.env?.DEV);
    const hasDebug =
      typeof window !== "undefined" && Boolean((window as { ECO_DEBUG?: boolean }).ECO_DEBUG);
    if (isDev || hasDebug) {
      console.log("[eco-stream]", ...args);
    }
  } catch {
    /* noop */
  }
};

export interface StreamRunnerFactoryOptions {
  fetchImpl?: typeof fetch;
  timers?: StreamRunnerTimers;
  watchdogFactory?: (
    id: string,
    timers: StreamRunnerTimers,
  ) => ReturnType<typeof createSseWatchdogs>;
}

interface ResolvedStreamRunnerDeps {
  fetchImpl?: typeof fetch;
  timers: StreamRunnerTimers;
  watchdogFactory: (id: string) => ReturnType<typeof createSseWatchdogs>;
  typingWatchdogFactory: (id: string, onTimeout: () => void) => () => void;
}

const resolveStreamRunnerDeps = (
  options?: StreamRunnerFactoryOptions,
): ResolvedStreamRunnerDeps => {
  const timers = options?.timers ?? createDefaultTimers();
  const fetchImpl =
    typeof options?.fetchImpl === "function"
      ? options.fetchImpl
      : typeof globalThis.fetch === "function"
      ? (globalThis.fetch as typeof fetch)
      : undefined;
  const watchdogFactory: ResolvedStreamRunnerDeps["watchdogFactory"] =
    typeof options?.watchdogFactory === "function"
      ? (id: string) => options.watchdogFactory!(id, timers)
      : (id: string) => createSseWatchdogs(id, timers);
  const typingWatchdogFactory: ResolvedStreamRunnerDeps["typingWatchdogFactory"] = (
    id: string,
    onTimeout: () => void,
  ) => withTypingWatchdog(id, onTimeout, timers);
  return { fetchImpl, timers, watchdogFactory, typingWatchdogFactory };
};

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

const resolveAbortReason = (input: unknown): string => formatAbortReason(input);

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
    const doneHasRenderableText = typeof doneContentCandidate === "string" && doneContentCandidate.length > 0;
    const hasStructuredDonePayload = (() => {
      if (!payloadRecord) return false;
      const responseRecord = toRecord(payloadRecord.response);
      if (responseRecord && Object.keys(responseRecord).length > 0) return true;
      const responseBodyRecord = toRecord(payloadRecord.responseBody);
      if (responseBodyRecord && Object.keys(responseBodyRecord).length > 0) return true;
      const altResponseBody = toRecord((payloadRecord as { response_body?: unknown }).response_body);
      if (altResponseBody && Object.keys(altResponseBody).length > 0) return true;
      const maybeMessages = (payloadRecord as { messages?: unknown }).messages;
      return Array.isArray(maybeMessages) && maybeMessages.length > 0;
    })();

    let finalContent = aggregatedTextValue;
    if (doneHasRenderableText) {
      if (!normalizedAggregated) {
        finalContent = doneContentCandidate;
      } else if (normalizedAggregated !== normalizedDone) {
        finalContent = doneContentCandidate;
      }
    } else if (aggregatedLength > 0 && !hasStructuredDonePayload) {
      try {
        console.debug('[DIAG] done:fallback-aggregated', {
          clientMessageId,
          assistantId,
          aggregatedLength,
        });
      } catch {
        /* noop */
      }
    }

    if (aggregatedLength === 0 && !doneHasRenderableText) {
      if (!doneContext.streamStats.clientFinishReason) {
        doneContext.streamStats.clientFinishReason = "no_text_before_done";
      }
      if (doneContext.streamStats.clientFinishReason === "no_text_before_done") {
        try {
          showToast(NO_TEXT_ALERT_MESSAGE);
        } catch {
          /* noop */
        }
      }
    }

    const finalText = finalContent;

    const finalStatus = doneContext.streamStats.status === "no_content" ? "no_content" : "done";
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
      const shouldAnnotateFinishReason = aggregatedLength === 0 && finishReasonValue !== undefined;
      const clientFinishReason = doneContext.streamStats.clientFinishReason;
      if (!shouldAnnotateFinishReason && !clientFinishReason) {
        return metadata;
      }
      const finishAnnotations: Record<string, unknown> = {};
      if (shouldAnnotateFinishReason && finishReasonValue !== undefined) {
        finishAnnotations.finishReason = finishReasonValue;
      }
      if (clientFinishReason) {
        finishAnnotations.clientFinishReason = clientFinishReason;
      }
      if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
        return {
          ...(metadata as Record<string, unknown>),
          ...finishAnnotations,
        };
      }
      if (metadata === undefined) {
        return finishAnnotations;
      }
      return {
        ...finishAnnotations,
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
              status: finalStatus,
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

const beginStreamInternal = (
  params: BeginStreamParams,
  deps: ResolvedStreamRunnerDeps,
): Promise<StreamRunStats> | void => {
  const {
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
    hasFirstChunkRef,
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
  } = params;
  const { fetchImpl, timers, watchdogFactory, typingWatchdogFactory } = deps;

  const session = new StreamSession({
    params,
    inflightControllers,
    streamStartLogged,
    logDev,
    timers,
    watchdogFactory,
  });

  const startResult = session.start();
  if (!startResult) {
    return;
  }

  const {
    clientMessageId,
    normalizedClientId,
    controller,
    streamStats,
    guardTimeoutMs,
    diagForceJson,
    requestMethod,
    acceptHeader,
    fallbackEnabled,
    effectiveGuestId,
    effectiveSessionId,
    resolvedClientId,
  } = startResult;

  let triggerJsonFallback: ((reason: string) => void) | null = null;
  let startErrorTriggered = false;
  let startErrorMessage: string | null = null;
  let startErrorAssistantId: string | null = null;

  session.setWatchdogTimeoutHandler(null);

  const markPromptReadyWatchdog = () => {
    session.markPromptReadyWatchdog();
  };
  let runJsonFallbackRequest: (
    options?: { reason?: string; logError?: unknown },
  ) => Promise<boolean> = async () => false;
  const streamState = {
    fallbackRequested: false,
    firstChunkDelivered: false,
  };

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
        abortControllerSafely(activeController, "user_cancel");
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

  const bumpFirstTokenWatchdog = () => {
    session.bumpFirstTokenWatchdog();
  };

  const bumpHeartbeatWatchdog = () => {
    session.bumpHeartbeatWatchdog();
  };

  const clearWatchdog = () => {
    session.clearWatchdog();
  };

  let onWatchdogTimeout: ((reason: CloseReason) => void) | null = null;

  let fallbackManager: StreamFallbackManager | null = null;

  const clearFallbackGuardTimer = () => {
    fallbackManager?.clearFallbackGuardTimer();
  };

  const clearTypingWatchdog = () => {
    fallbackManager?.clearTypingWatchdogTimer();
  };

  const beginFallback = (reason: string): boolean => {
    const started = fallbackManager?.beginFallback(reason) ?? false;
    if (started) {
      streamState.fallbackRequested = true;
      streamStats.clientFinishReason ??= reason;
    }
    return started;
  };

  const abortSseForFallback = (reason?: string) => {
    fallbackManager?.abortSseForFallback(reason);
  };

  const startFallbackGuardTimer = () => {
    fallbackManager?.startFallbackGuardTimer((reason) => {
      triggerJsonFallback?.(reason);
    });
  };

  const handleTypingWatchdogTimeout = () => {
    try {
      console.warn('[SSE] typing_watchdog_timeout', {
        clientMessageId: normalizedClientId,
        timeoutMs: TYPING_WATCHDOG_MS,
      });
    } catch {
      /* noop */
    }
    try {
      setDigitando(false);
    } catch {
      /* noop */
    }
    try {
      setErroApi((previous) => {
        if (typeof previous === "string" && previous.trim().length > 0) {
          return previous;
        }
        return "Tempo limite atingido. Tente novamente.";
      });
    } catch {
      /* noop */
    }
    try {
      logSse('abort', {
        clientMessageId: normalizedClientId,
        reason: 'typing_watchdog',
        source: 'typing-watchdog',
        timeoutMs: TYPING_WATCHDOG_MS,
      });
    } catch {
      /* noop */
    }
  };

  const existingAssistantForClient =
    tracking.assistantByClientRef.current[normalizedClientId] ??
    tracking.assistantByClientRef.current[clientMessageId];

  let placeholderAssistantId: string | null | undefined = null;
  if (existingAssistantForClient) {
    placeholderAssistantId =
      ensureAssistantMessage(clientMessageId, undefined, { allowCreate: false }) ??
      existingAssistantForClient;
  } else {
    placeholderAssistantId = ensureAssistantMessage(clientMessageId, undefined, {
      allowCreate: true,
    });
  }
  if (placeholderAssistantId) {
    activeAssistantIdRef.current = placeholderAssistantId;
  }

  console.log("[SSE] Stream started", {
    timestamp: Date.now(),
    clientMessageId: normalizedClientId,
    guestId: effectiveGuestId,
    sessionId: effectiveSessionId,
    method: requestMethod,
  });

  if (streamStartLogged.has(normalizedClientId)) {
    try {
      console.warn("duplicated stream", { clientMessageId: normalizedClientId });
    } catch {
      /* noop */
    }
  } else {
    streamStartLogged.add(normalizedClientId);
    try {
      console.debug('[DIAG] stream:start', {
        clientMessageId,
        historyLength: history.length,
        systemHint: systemHint ?? null,
      });
    } catch {
      /* noop */
    }
  }

  const NO_CONTENT_MESSAGE = "A Eco não chegou a enviar nada. Tente novamente.";

  const registerNoContent = (reason: string) => {
    clearFallbackGuardTimer();
    if (streamStats.status === "no_content") return;
    streamStats.status = "no_content";
    streamStats.noContentReason = reason;
    if (!streamStats.clientFinishReason) {
      streamStats.clientFinishReason = "no_content";
    }
    const metrics = streamTimersRef.current[normalizedClientId];
    const now = Date.now();
    const totalMs = metrics ? now - metrics.startedAt : streamStats.timing?.totalMs;
    streamStats.timing = {
      startedAt: metrics?.startedAt ?? streamStats.timing?.startedAt,
      firstChunkAt: metrics?.firstChunkAt ?? streamStats.timing?.firstChunkAt,
      totalMs,
    };
    const telemetry = {
      clientMessageId: normalizedClientId,
      reason,
      timing: streamStats.timing ?? {},
      headers: streamStats.responseHeaders ?? {},
    };
    diag("eco_stream_no_content", telemetry);
    try {
      console.info("[EcoStream] eco_stream_no_content", telemetry);
    } catch {
      /* noop */
    }
    try {
      setErroApi(NO_CONTENT_MESSAGE);
    } catch {
      /* noop */
    }
    if (
      fallbackEnabled &&
      !streamStats.gotAnyChunk &&
      triggerJsonFallback &&
      FALLBACK_NO_CHUNK_REASONS.has(reason)
    ) {
      triggerJsonFallback(reason);
    }
  };

  const patchAssistantNoContent = (assistantId: string | null | undefined) => {
    if (!assistantId) return;
    const updatedAt = new Date().toISOString();
    const fallbackText = NO_CONTENT_MESSAGE;
    const patch: ChatMessageType = {
      id: assistantId,
      streaming: false,
      status: "no_content",
      updatedAt,
      content: fallbackText,
      text: fallbackText,
    };
    const allowedKeys = ["status", "streaming", "updatedAt", "content", "text"] as string[];
    if (upsertMessage) {
      upsertMessage(patch, { patchSource: "stream_no_content", allowedKeys });
      return;
    }
    setMessages((prevMessages) =>
      prevMessages.map((message) => {
        if (message.id !== assistantId) return message;
        const existingText = (() => {
          if (typeof message.text === "string") {
            const trimmedText = message.text.trim();
            if (trimmedText) return trimmedText;
          }
          if (typeof message.content === "string") {
            const trimmedContent = message.content.trim();
            if (trimmedContent) return trimmedContent;
          }
          return "";
        })();
        if (existingText) {
          return {
            ...message,
            streaming: false,
            status: "no_content",
            updatedAt,
          };
        }
        return {
          ...message,
          streaming: false,
          status: "no_content",
          updatedAt,
          content: fallbackText,
          text: fallbackText,
        };
      }),
    );
  };

  const patchAssistantStartError = (
    assistantId: string | null | undefined,
    fallbackText: string | undefined,
  ) => {
    if (!assistantId) return;
    const updatedAt = new Date().toISOString();
    const resolvedText = (() => {
      if (typeof fallbackText === "string") {
        const trimmed = fallbackText.trim();
        if (trimmed) return trimmed;
      }
      return "Falha ao iniciar a resposta da Eco.";
    })();
    const patch: ChatMessageType = {
      id: assistantId,
      streaming: false,
      status: "error",
      updatedAt,
      content: resolvedText,
      text: resolvedText,
    };
    const allowedKeys = ["status", "streaming", "updatedAt", "content", "text"] as string[];
    if (upsertMessage) {
      upsertMessage(patch, { patchSource: "stream_start_error", allowedKeys });
      return;
    }
    setMessages((prevMessages) =>
      prevMessages.map((message) => {
        if (message.id !== assistantId) return message;
        return {
          ...message,
          streaming: false,
          status: "error",
          updatedAt,
          content: resolvedText,
          text: resolvedText,
        };
      }),
    );
  };

  const ensureAssistantForNoContent = (meta?: EnsureAssistantEventMeta) => {
    const assistantId = ensureAssistantMessage(clientMessageId, meta, { allowCreate: true });
    if (!assistantId) return null;
    patchAssistantNoContent(assistantId);
    return assistantId;
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
    hasFirstChunkRef,
    setDigitando,
    updateCurrentInteractionId,
    streamTimersRef,
    logSse,
    replyState,
    tracking,
    interactionCacheDispatch,
    streamStats,
  };

  let requestPayload: Record<string, unknown> | null = null;
  let baseHeadersCache: Record<string, string> | null = null;

  const baseHeaders = (): Record<string, string> => {
    if (baseHeadersCache) {
      return { ...baseHeadersCache };
    }
    return {};
  };

  let streamPromise: Promise<StreamRunStats>;
  try {
    streamPromise = (async () => {
      const requestBody = buildEcoRequestBody({
        history,
        clientMessageId,
        systemHint,
        userId,
        userName,
        guestId,
        isGuest,
      });

    const once = (value?: string | null): string => {
      if (typeof value !== "string") return "";
      const [head] = value.split(",");
      return head.trim();
    };

    const sanitizedClientId = once(resolvedClientId);
    const sanitizedGuestId = once(effectiveGuestId);
    const sanitizedSessionId = once(effectiveSessionId);
    const sanitizedClientMessageId = once(clientMessageId);

    const headers: Record<string, string> = {};
    const seenHeaderKeys = new Set<string>();
    const appendHeader = (key: string, value: unknown) => {
      if (typeof value !== "string") return;
      const trimmed = value.trim();
      if (!trimmed) return;
      const normalizedKey = key.toLowerCase();
      if (seenHeaderKeys.has(normalizedKey)) return;
      headers[key] = trimmed;
      seenHeaderKeys.add(normalizedKey);
    };

    const identityHeaders = session.getIdentityHeaders();
    for (const [key, value] of Object.entries(identityHeaders)) {
      appendHeader(key, value);
    }

    appendHeader("X-Client-Id", sanitizedClientId);
    appendHeader("X-Eco-Guest-Id", sanitizedGuestId);
    appendHeader("X-Eco-Session-Id", sanitizedSessionId);
    appendHeader("X-Eco-Client-Message-Id", sanitizedClientMessageId);

    requestPayload = diagForceJson ? { ...requestBody, stream: false } : requestBody;

    const normalizedBase = API_BASE.endsWith("/") ? API_BASE.slice(0, -1) : API_BASE;
    const requestUrl = normalizedBase ? `${normalizedBase}/ask-eco` : ASK_ECO_ENDPOINT_PATH;

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
      appendHeader("X-Stream-Id", streamId);
      streamStats.streamId = streamId;
    }

    let handleStreamDoneRef: (
      rawEvent?: Record<string, unknown>,
      options?: { reason?: string },
    ) => void = () => {
      /* noop */
    };

    fallbackManager = new StreamFallbackManager({
      session,
      sharedContext,
      streamStats,
      guardTimeoutMs,
      fallbackEnabled,
      logSse,
      setDigitando,
      setErroApi,
      diag,
      registerNoContent,
      tracking,
      streamActiveRef,
      activeStreamClientIdRef,
      clearWatchdog,
      resolveAbortReason,
      baseHeaders,
      getRequestPayload: () => requestPayload,
      handleChunk,
      handleStreamDone: (event, options) => handleStreamDoneRef(event, options),
      timers,
      typingWatchdogFactory,
      fallbackFetch: fetchImpl,
    });
    fallbackManager.initializeTypingWatchdog(handleTypingWatchdogTimeout);
    runJsonFallbackRequest = (options = {}) =>
      fallbackManager?.runJsonFallbackRequest(options) ?? Promise.resolve(false);
    startFallbackGuardTimer();

      baseHeadersCache = headers;

      let response: Response | null = null;
      let fetchError: unknown = null;
      const envContainer = import.meta as { env?: { MODE?: string; mode?: string; VITEST?: unknown } };
      const rawMode = envContainer.env?.MODE ?? envContainer.env?.mode ?? "";
      const normalizedImportMode =
        typeof rawMode === "string" ? rawMode.trim().toLowerCase() : "";
      const processEnv = (() => {
        try {
          const candidate = (globalThis as typeof globalThis & {
            process?: { env?: Record<string, string | undefined> };
          }).process;
          return candidate?.env ?? undefined;
        } catch {
          return undefined;
        }
      })();
      const processModeRaw =
        (processEnv?.NODE_ENV && processEnv.NODE_ENV.trim().length > 0
          ? processEnv.NODE_ENV
          : processEnv?.MODE) ?? "";
      const normalizedProcessMode =
        typeof processModeRaw === "string" ? processModeRaw.trim().toLowerCase() : "";
      const isTestEnv = normalizedImportMode === "test" || normalizedProcessMode === "test";
      const vitestFlag = envContainer.env?.VITEST;
      const processVitestFlag = processEnv?.VITEST;
      const processVitestWorker = processEnv?.VITEST_WORKER_ID;
      const isVitest =
        vitestFlag === true ||
        vitestFlag === "true" ||
        processVitestFlag === "true" ||
        processVitestFlag === "1" ||
        typeof processVitestWorker === "string";
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

      const fetchFn = fetchImpl;
      let fetchSource: string | null = null;
      if (fetchFn) {
        try {
          fetchSource = Function.prototype.toString.call(fetchFn);
        } catch {
          fetchSource = null;
        }
      }
      const shouldSkipFetchInTest = isTestEnv || isVitest;

    const tryJsonFallback = async (reason: string): Promise<boolean> => {
      if (!fallbackEnabled) return false;
      if (streamState.firstChunkDelivered) return false;
      if (streamStats.gotAnyChunk) return false;
      if (activeStreamClientIdRef.current !== clientMessageId) return false;
      if (!streamActiveRef.current) return false;
      const abortReason = (controller.signal as AbortSignal & { reason?: unknown }).reason;
      const normalizedAbortReason = resolveAbortReason(abortReason);
      if (normalizedAbortReason === "new-send" || normalizedAbortReason === "ui_abort") {
        return false;
      }
      const started = beginFallback(reason);
      if (!started) {
        return false;
      }

      abortSseForFallback(reason);
      const succeeded = await runJsonFallbackRequest({ reason });
      return succeeded;
    };

    triggerJsonFallback = (reason: string) => {
      void tryJsonFallback(reason);
    };

    if (fetchFn && !shouldSkipFetchInTest) {
      try {
        try {
          console.debug('[DIAG] start', {
            url: requestUrl,
            accept: acceptHeader,
            forcedJson: diagForceJson,
            method: requestMethod,
          });
        } catch {
          /* noop */
        }
        console.log('[DEBUG] Antes do fetch', {
          isAborted: controller.signal.aborted,
          reason: (controller.signal as any).reason,
        });

        if (controller.signal.aborted) {
          throw new Error(
            `Signal já abortado antes do fetch: ${
              (controller.signal as any).reason || 'no reason'
            }`,
          );
        }

        const requestHeaders = {
          ...baseHeaders(),
          Accept: acceptHeader,
        };
        requestHeaders["Content-Type"] = "application/json";

        const fetchInit: RequestInit = {
          method: requestMethod,
          mode: "cors",
          credentials: "omit",
          headers: requestHeaders,
          signal: controller.signal,
          cache: "no-store",
          body: requestPayload === null ? undefined : JSON.stringify(requestPayload),
          // keepalive: true,  // ❌ NÃO usar em SSE
        };

        response = await fetchFn(requestUrl, fetchInit);
        if (!response.ok) {
          const httpError = new Error(`HTTP ${response.status}: ${response.statusText}`);
          fetchError = httpError;
          response = null;
          throw httpError;
        }
      } catch (error) {
        fetchError = error;
        const formatted = formatAbortReason(error);
        logSse("abort", {
          clientMessageId: normalizedClientId,
          reason: formatted,
          source: "fetch",
        });
      }
    } else {
      fetchError = new Error(shouldSkipFetchInTest ? "skipped_in_test_env" : "fetch_unavailable");
      logSse("abort", {
        clientMessageId: normalizedClientId,
        reason: shouldSkipFetchInTest ? "skipped_in_test_env" : "fetch_unavailable",
        source: "fetch",
      });
    }

    if (!response) {
      throw fetchError ?? new Error('Eco stream request failed to start.');
    }

    const fatalErrorState: { current: Error | null } = { current: null };
    let handledReaderError = false;

    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    const doneState = { value: false };

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

    const processChunkEvent = processChunk({
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
      toRecord,
    });

    const handlePromptEvent = onPromptReady({
      controller,
      streamState,
      markPromptReadyWatchdog,
      buildRecordChain,
      pickStringFromRecords,
      extractPayloadRecord,
      diag,
      normalizedClientId,
      handlePromptReady,
      sharedContext,
    });

    const handleControlEvent = onControl({
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
    });

    const handleMessageEvent = onMessage({
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
    });

    const handleStreamDone = onDone({
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
      toRecord,
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
    });

    handleStreamDoneRef = handleStreamDone;
    startFallbackGuardTimer();

    onWatchdogTimeout = (reason) => {
      if (!streamStats.gotAnyChunk) {
        diag("watchdog_timeout_no_chunk", { reason, clientMessageId: normalizedClientId });
        streamStats.clientFinishReason = "no_content";
        registerNoContent(reason);
        try {
          showToast(NO_TEXT_ALERT_MESSAGE);
        } catch {
          /* noop */
        }
      } else {
        diag("watchdog_timeout", { reason, clientMessageId: normalizedClientId });
        if (!streamStats.clientFinishReason) {
          streamStats.clientFinishReason = reason;
        }
      }
      handleStreamDone(undefined, { reason });
    };

    const handleErrorEvent = onError({
      bumpHeartbeatWatchdog,
      buildRecordChain,
      pickStringFromRecords,
      replyState,
      tracking,
      clientMessageId,
      processChunk: processChunkEvent,
      sharedContext,
      diag,
      normalizedClientId,
      handleDone: handleStreamDone,
      fatalErrorState,
      extractText,
      toRecord,
    });

    const responseNonNull = response as Response;
    const headerEntries = Array.from(responseNonNull.headers.entries());
    const headerMap = headerEntries.reduce<Record<string, string>>((acc, [key, value]) => {
      acc[key.toLowerCase()] = value;
      return acc;
    }, {});
    rememberGuestIdentityFromResponse(responseNonNull.headers);
    rememberSessionIdentityFromResponse(responseNonNull.headers);
    rememberIdsFromResponse(responseNonNull);
    streamStats.responseHeaders = { ...headerMap };
    const contentType = headerMap["content-type"]?.toLowerCase() ?? "";

    logSse("open", {
      clientMessageId: normalizedClientId,
      status: responseNonNull.status,
      contentType,
    });
    startFallbackGuardTimer();
    bumpHeartbeatWatchdog();
    try {
      console.info("[EcoStream] onStreamOpen", {
        clientMessageId,
        status: responseNonNull.status ?? null,
        contentType,
      });
    } catch {
      /* noop */
    }

    if (!responseNonNull.ok) {
      let detail = "";
      try {
        detail = await responseNonNull.text();
      } catch {
        detail = "";
      }
      const trimmed = detail.trim();
      const preview = trimmed.slice(0, 200);
      const message = trimmed.startsWith("<!DOCTYPE")
        ? `Gateway/edge retornou HTML (${responseNonNull.status}). Ver backlogs. Trecho: ${preview}...`
        : trimmed || `Eco stream request failed (${responseNonNull.status})`;
      throw new Error(message);
    }

    if (!contentType.includes("text/event-stream")) {
      if (diagForceJson && contentType.includes("application/json")) {
        let jsonPayload: unknown;
        try {
          jsonPayload = await responseNonNull.json();
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
        detail = await responseNonNull.text();
      } catch {
        detail = "";
      }
      const trimmed = detail.trim();
      const preview = trimmed.slice(0, 200);
      const baseMessage = `Resposta inválida: status=${responseNonNull.status} content-type=${
        contentType || "<desconhecido>"
      }`;
      const message = trimmed.startsWith("<!DOCTYPE")
        ? `Gateway/edge retornou HTML (${responseNonNull.status}). Ver backlogs. Trecho: ${preview}...`
        : `${baseMessage}${preview ? ` body=${preview}...` : ""}`;
      throw new Error(message);
    }

    const reader = responseNonNull.body?.getReader();

    console.log('[DEBUG] Reader obtido');
    console.log('[DEBUG] ===== INICIANDO LOOP DE LEITURA =====');

    let loopIteration = 0;

    if (!reader) {
      throw new Error("Eco stream response has no readable body.");
    }

    let initialChunk: ReadableStreamReadResult<Uint8Array> | null = null;

    try {
      console.log('[DEBUG] Testando reader.read()...');
      const testRead = reader.read();
      console.log('[DEBUG] reader.read() retornou Promise:', testRead);

      const testResult = await testRead;
      console.log('[DEBUG] Primeiro read() resultado:', {
        done: testResult.done,
        hasValue: !!testResult.value,
        valueLength: testResult.value?.length,
        valuePreview: testResult.value
          ? new TextDecoder().decode(testResult.value.slice(0, 100))
          : null,
      });

      initialChunk = testResult;
    } catch (e) {
      console.error('[DEBUG] ERRO ao testar reader:', e);
    }

    (globalThis as any).__ecoActiveReader = reader;

    const handlers: ProcessSseHandlers = {
      appendAssistantDelta: (index, delta, event) => processChunkEvent(index, delta, event),
      onStreamDone: (event) => handleStreamDone(event),
      onPromptReady: (event) => handlePromptEvent(event),
      onControl: (event) => handleControlEvent(event),
      onError: (event) => handleErrorEvent(event),
      onMessage: (event) => handleMessageEvent(event),
    };

    const findEventDelimiter = (input: string): { index: number; length: number } | null => {
      const crlfIndex = input.indexOf("\r\n\r\n");
      const lfIndex = input.indexOf("\n\n");
      if (crlfIndex === -1 && lfIndex === -1) {
        return null;
      }
      if (crlfIndex === -1) {
        return { index: lfIndex, length: 2 };
      }
      if (lfIndex === -1) {
        return { index: crlfIndex, length: 4 };
      }
      return crlfIndex <= lfIndex
        ? { index: crlfIndex, length: 4 }
        : { index: lfIndex, length: 2 };
    };

    const processEventBlock = (block: string) => {
      if (!block) return;
      if (streamState.fallbackRequested) return;
      const normalizedBlock = block.replace(/\r\n/g, "\n");
      const lines = normalizedBlock.split("\n");
      let currentEventName: string | undefined;
      const dataParts: string[] = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (trimmed.startsWith(":")) {
          const comment = trimmed.slice(1).trim();
          bumpHeartbeatWatchdog();
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
      if (fatalErrorState.current) return;
    };

    while (true) {
      loopIteration++;
      console.log(`[DEBUG] Loop iteração ${loopIteration}`);

      if (controller.signal.aborted) {
        console.log('[DEBUG] Loop abortado pelo controller.signal');
        break;
      }

      let chunk: ReadableStreamReadResult<Uint8Array>;
      try {
        if (initialChunk) {
          console.log('[DEBUG] Utilizando chunk pré-lido do teste', {
            done: initialChunk.done,
            hasValue: !!initialChunk.value,
            valueLength: initialChunk.value?.length,
          });
          chunk = initialChunk;
          initialChunk = null;
        } else {
          console.log('[DEBUG] Chamando reader.read()...');
          chunk = await reader.read();
          console.log('[DEBUG] reader.read() retornou:', {
            done: chunk.done,
            hasValue: !!chunk.value,
            valueLength: chunk.value?.length,
          });
        }
      } catch (error: any) {
        console.error('[DEBUG] reader.read() ERRO:', error);
        if (controller.signal.aborted || error?.name === "AbortError") {
          break;
        }
        handledReaderError = true;
        fatalErrorState.current =
          error instanceof Error ? error : new Error(String(error ?? "reader_error"));
        diag("reader_read_failed", {
          clientMessageId: normalizedClientId,
          message: fatalErrorState.current?.message,
        });
        try {
          setErroApi("Falha no stream, tente novamente");
        } catch {
          /* noop */
        }
        handleStreamDone(undefined, { reason: "reader_error" });
        break;
      }

      const { value, done } = chunk;
      if (done) {
        buffer += decoder.decode();
        while (true) {
          const delimiter = findEventDelimiter(buffer);
          if (!delimiter) break;
          const eventBlock = buffer.slice(0, delimiter.index);
          buffer = buffer.slice(delimiter.index + delimiter.length);
          processEventBlock(eventBlock);
          if (fatalErrorState.current) break;
        }
        if (!fatalErrorState.current && buffer) {
          processEventBlock(buffer);
          buffer = "";
        }
        break;
      }

      if (value) {
        buffer += decoder.decode(value, { stream: true });
        while (true) {
          const delimiter = findEventDelimiter(buffer);
          if (!delimiter) break;
          const eventBlock = buffer.slice(0, delimiter.index);
          buffer = buffer.slice(delimiter.index + delimiter.length);
          processEventBlock(eventBlock);
          if (fatalErrorState.current) break;
        }
      }

      if (fatalErrorState.current) break;
    }

    console.log('[DEBUG] ===== LOOP DE LEITURA FINALIZADO =====', {
      totalIterations: loopIteration,
    });

    if (fatalErrorState.current) {
      if (!handledReaderError) {
        throw fatalErrorState.current;
      }
      diag("reader_error_handled", {
        clientMessageId: normalizedClientId,
        message: fatalErrorState.current.message,
      });
    }

    if (!doneState.value && !controller.signal.aborted) {
      handleStreamDone();
    }

    return streamStats;
    })();
  } catch (error) {
    clearTypingWatchdog();
    inflightControllers.delete(normalizedClientId);
    throw error;
  }

  streamPromise.catch(async (error) => {
    startErrorTriggered = true;
    if (controller.signal.aborted) return;
    clearTypingWatchdog();
    clearWatchdog();
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
    const fallbackAlreadyRequested = streamState.fallbackRequested;
    const canBeginFallback =
      !streamState.firstChunkDelivered && (fallbackAlreadyRequested || beginFallback("json_fallback"));
    let fallbackSucceeded = false;
    if (canBeginFallback) {
      abortSseForFallback("json_fallback");
      fallbackSucceeded = await runJsonFallbackRequest({
        reason: "json_fallback",
        logError: error,
      });
      if (fallbackSucceeded) {
        return;
      }
    }
    const message = error instanceof Error ? error.message : "Falha ao iniciar a resposta da Eco.";
    startErrorMessage = message;
    streamStats.clientFinishReason = "start_error";
    streamStats.status = "error";
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
    const assistantIdOnStartError =
      tracking.assistantByClientRef.current[clientMessageId] ??
      tracking.assistantByClientRef.current[normalizedClientId] ??
      activeAssistantIdRef.current ??
      ensureAssistantMessage(clientMessageId, undefined, { allowCreate: false });
    startErrorAssistantId = assistantIdOnStartError ?? startErrorAssistantId;
    const applyStartErrorPatch = () => {
      patchAssistantStartError(assistantIdOnStartError, message);
    };
    applyStartErrorPatch();
    try {
      if (typeof queueMicrotask === "function") {
        queueMicrotask(applyStartErrorPatch);
      } else {
        void Promise.resolve()
          .then(applyStartErrorPatch)
          .catch(() => {
            applyStartErrorPatch();
          });
      }
    } catch {
      try {
        applyStartErrorPatch();
      } catch {
        /* noop */
      }
    }
    if (assistantIdOnStartError) {
      removeEcoEntry(assistantIdOnStartError);
    }
  });

  streamPromise.finally(() => {
    clearTypingWatchdog();
    inflightControllers.delete(normalizedClientId);
    clearWatchdog();
    clearFallbackGuardTimer();
    triggerJsonFallback = null;
    const isCurrentClient = activeClientIdRef.current === clientMessageId;
    if (isCurrentClient && controllerRef.current === controller) {
      controllerRef.current = null;
    }
    let assistantId = tracking.assistantByClientRef.current[clientMessageId];
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
          assistantId: assistantId ?? null,
          streamId: streamStats.streamId ?? null,
          gotAnyChunk: streamStats.gotAnyChunk,
          aggregatedLength: streamStats.aggregatedLength,
        };
        if (finishReasonFromMeta !== undefined) {
          logPayload.finishReasonFromMeta = finishReasonFromMeta;
        }
        if (streamStats.clientFinishReason) {
          logPayload.clientFinishReason = streamStats.clientFinishReason;
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
      if (startErrorTriggered) {
        const assistantForError =
          startErrorAssistantId ??
          assistantId ??
          tracking.assistantByClientRef.current[clientMessageId] ??
          tracking.assistantByClientRef.current[normalizedClientId] ??
          sharedContext.activeAssistantIdRef.current;
        patchAssistantStartError(assistantForError, startErrorMessage ?? "Falha ao iniciar a resposta da Eco.");
      } else if (
        wasAborted &&
        !sharedContext.hasFirstChunkRef.current &&
        !startErrorTriggered &&
        streamStats.clientFinishReason !== "start_error"
      ) {
        registerNoContent("stream_aborted");
        const ensuredAssistantId = ensureAssistantForNoContent();
        if (ensuredAssistantId) {
          assistantId = ensuredAssistantId;
          sharedContext.activeAssistantIdRef.current = ensuredAssistantId;
        }
      }
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
      session.finalize();
      try {
        console.info("[SSE] event_source_close", {
          clientMessageId,
          reason: closeReason,
          timestamp: Date.now(),
        });
      } catch {
        /* noop */
      }
      if (wasAborted && assistantId) {
        if (streamStats.status === "no_content") {
          patchAssistantNoContent(assistantId);
        } else {
          removeEcoEntry(assistantId);
        }
      }
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

export const beginStream = (
  params: BeginStreamParams,
  options?: StreamRunnerFactoryOptions,
): Promise<StreamRunStats> | void => {
  const deps = resolveStreamRunnerDeps(options);
  return beginStreamInternal(params, deps);
};

export const createStreamRunner = (options: StreamRunnerFactoryOptions = {}) => {
  const deps = resolveStreamRunnerDeps(options);
  return {
    beginStream: (params: BeginStreamParams) => beginStreamInternal(params, deps),
  };
};

