import { AskEcoResponse, collectTexts, normalizeAskEcoResponse, unwrapPayload } from "../askEcoResponse";
import { isDev } from "../environment";
import { resolveChunkIdentifier, resolveChunkIndex } from "../../utils/chat/chunkSignals";
import { resolveApiUrl } from "../../constants/api";
import { buildIdentityHeaders } from "../../lib/guestId";
import type { Message } from "../contexts/ChatContext";
import {
  EcoClientEvent,
  EcoEventHandlers,
  EcoSseEvent,
  EcoStreamChunk,
  EcoStreamControlEvent,
  EcoStreamDoneEvent,
  EcoStreamPromptReadyEvent,
  EcoStreamResult,
  StartEcoStreamOptions,
} from "./types";
import {
  extractCreatedAt,
  extractInteractionId,
  extractMessageId,
  mapResponseEventType,
  normalizeChunkData,
  normalizeControlName,
} from "./eventMapper";
import { normalizeSseNewlines, parseSseEvent } from "./sseParser";

const safeInvoke = (
  cb: ((event: EcoSseEvent) => void) | undefined,
  event: EcoSseEvent
) => {
  if (!cb) return;
  try {
    cb(event);
  } catch (err) {
    console.error("❌ [ECO API] Falha ao executar callback de stream", err);
  }
};

const safeInvokeUnified = (
  cb: ((event: EcoClientEvent) => void) | undefined,
  event: EcoClientEvent
) => {
  if (!cb) return;
  try {
    cb(event);
  } catch (err) {
    console.error("❌ [ECO API] Falha ao executar callback onEvent da stream", err);
  }
};

const safeInvokeError = (cb: ((error: Error) => void) | undefined, error: Error) => {
  if (!cb) return;
  try {
    cb(error);
  } catch (err) {
    console.error("❌ [ECO API] Falha ao executar callback de erro da stream", err);
  }
};

const mapResponseEventType = (
  type: string | undefined,
): { normalized?: string; original?: string } => {
  if (!type) return { normalized: type };
  if (!type.startsWith("response.")) return { normalized: type };

  const original = type;
  const lower = type.toLowerCase();

  if (
    lower === "response.created" ||
    lower === "response.started" ||
    lower === "response.in_progress" ||
    lower === "response.input_message.delta"
  ) {
    return { normalized: "prompt_ready", original };
  }

  if (lower === "response.error") {
    return { normalized: "error", original };
  }

  if (
    lower === "response.completed" ||
    lower.endsWith(".completed") ||
    lower.endsWith(".done") ||
    lower === "response.final"
  ) {
    return { normalized: "done", original };
  }

  if (lower.includes("metadata")) {
    const isPending = lower.includes("pending") || lower.endsWith(".delta");
    return { normalized: isPending ? "meta_pending" : "meta", original };
  }

  if (lower.includes("memory")) {
    return { normalized: "memory_saved", original };
  }

  if (lower.includes("latency")) {
    return { normalized: "latency", original };
  }

  if (
    lower.includes("output") ||
    lower.includes("message") ||
    lower.includes("tool") ||
    lower.includes("refusal") ||
    lower.endsWith(".delta")
  ) {
    return { normalized: "chunk", original };
  }

  return { normalized: "chunk", original };
};

const normalizeControlName = (value: unknown): string | undefined => {
  if (!value) return undefined;
  const raw = String(value).trim();
  if (!raw) return undefined;
  return raw
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[\s.\-]+/g, "_")
    .toLowerCase();
};

export const processEventStream = async (
  response: Response,
  handlers: EcoEventHandlers = {},
  options: { signal?: AbortSignal } = {}
): Promise<EcoStreamResult> => {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Fluxo SSE indisponível na resposta da Eco.");

  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let doneReceived = false;
  let streamError: Error | null = null;
  const aggregatedParts: string[] = [];
  let aggregatedText = "";
  const chunkDebugInfo = isDev
    ? {
        first: undefined as string | undefined,
        last: [] as string[],
      }
    : null;
  const seenChunkIdentifiers = new Set<string>();
  let lastChunkIndex: number | null = null;
  let donePayload: any;
  let metadata: unknown;
  let primeiraMemoriaSignificativa = false;
  let gotAnyToken = false;
  let lastNonEmptyText: string | undefined;
  let promptReadyReceived = false;
  let doneWithoutText = false;

  const rememberText = (text: string | undefined) => {
    if (typeof text !== "string") return;
    const trimmed = text.trim();
    if (trimmed.length === 0) return;
    lastNonEmptyText = trimmed;
    gotAnyToken = true;
  };

  const pushAggregatedPart = (text: string | undefined) => {
    if (typeof text !== "string") return;
    aggregatedText += text;
    aggregatedParts.push(text);
    rememberText(text);
  };

  const shouldIgnoreText = (text: unknown): boolean => {
    if (typeof text !== "string") return false;
    if (text.length === 0) return true;
    const normalized = text.trim().toLowerCase();
    if (normalized.length === 0) return false;
    if (normalized === "ok") return true;
    return false;
  };

  const userSignal = options.signal;
  const internalCtrl = new AbortController();
  const supportsAbortAny = typeof AbortSignal !== "undefined" && typeof (AbortSignal as any).any === "function";
  const effectiveSignal =
    userSignal && !userSignal.aborted && supportsAbortAny
      ? (AbortSignal as any).any([internalCtrl.signal, userSignal])
      : internalCtrl.signal;
  (globalThis as any).__ecoActiveCtrl = internalCtrl;

  let aborted = false;

  const handleAbort = () => {
    if (aborted) return;
    aborted = true;
  };

  if (userSignal?.aborted) {
    handleAbort();
    internalCtrl.abort();
    throw new DOMException("Aborted", "AbortError");
  }

  if (userSignal && !userSignal.aborted) {
    userSignal.addEventListener(
      "abort",
      () => {
        try {
          internalCtrl.abort();
        } catch {
          /* noop */
        }
      },
      { once: true },
    );
  }

  const signal = effectiveSignal;
  signal.addEventListener?.("abort", handleAbort, { once: true });

  const recordChunkPreview = (text: unknown) => {
    if (!chunkDebugInfo) return;
    if (typeof text !== "string") return;
    const preview = text.length > 200 ? `${text.slice(0, 200)}…` : text;
    if (!chunkDebugInfo.first) {
      chunkDebugInfo.first = preview;
      console.debug("🔎 [EcoStream] Primeiro chunk recebido:", preview);
    }
    chunkDebugInfo.last.push(preview);
    if (chunkDebugInfo.last.length > 3) {
      chunkDebugInfo.last.shift();
    }
  };

  const handleEvent = (eventData: unknown) => {
    if (!eventData || typeof eventData !== "object") return;

    // ⚠️ Precisamos saber cedo se o handler unificado existe
    const usingUnifiedHandler = typeof handlers.onEvent === "function";

    const parsed = eventData as { type?: string; payload?: any; rawData?: string } & Record<
      string,
      any
    >;

    const hintedType = typeof parsed.type === "string" ? parsed.type : undefined;
    const payload =
      parsed.payload && typeof parsed.payload === "object"
        ? (parsed.payload as Record<string, any>)
        : (parsed as Record<string, any>);

    const unwrappedPayload = unwrapPayload(payload);

    const payloadType = typeof payload.type === "string" ? payload.type : undefined;
    const unwrappedType =
      typeof (unwrappedPayload as any)?.type === "string"
        ? ((unwrappedPayload as any).type as string)
        : undefined;
    let type = payloadType ?? unwrappedType ?? hintedType;
    const contractPayload =
      payload && typeof payload === "object" ? (payload as Record<string, unknown>) : undefined;
    const resolveContractIndex = (value: unknown): number | undefined => {
      if (typeof value === "number" && Number.isFinite(value)) {
        return value;
      }
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) return undefined;
        const parsedNumber = Number(trimmed);
        if (Number.isFinite(parsedNumber)) return parsedNumber;
      }
      return undefined;
    };
    const contractIndex = resolveContractIndex(contractPayload?.index);
    const contractHasText = typeof contractPayload?.text === "string";
    const contractIsDone = contractPayload?.done === true;
    if (contractIndex !== undefined) {
      if (contractIsDone) {
        type = "done";
      } else if (!type || type === "delta" || type === "data" || type === "chunk") {
        if (contractHasText) {
          type = "chunk";
        }
      }
    }
    const hintedChannel = normalizeControlName(
      hintedType === "control" || payloadType === "control" || unwrappedType === "control"
        ? "control"
        : undefined,
    );
    const { normalized: responseNormalizedType, original: responseOriginalType } = mapResponseEventType(type);
    type = responseNormalizedType ?? type;

    const rawData = parsed.rawData;
    const looksLikeDone =
      (typeof rawData === "string" && rawData === "[DONE]") ||
      (payload && (payload.done === true || (payload as any).DONE === true));

    if (!type && looksLikeDone) type = "done";
    if (!type && typeof payload?.text === "string") type = "chunk";

    if (!type) {
      if (usingUnifiedHandler) {
        safeInvokeUnified(handlers.onEvent, {
          type: type as any,
          payload: unwrappedPayload,
          raw: eventData,
          originalType: responseOriginalType,
        });
        return;
      }
      if (isDev) console.debug("ℹ️ [ECO API] Evento SSE sem tipo reconhecido:", eventData);
      return;
    }

    const baseEventInfo: EcoSseEvent = {
      type,
      payload: unwrappedPayload,
      raw: eventData,
      originalType: responseOriginalType,
      channel: hintedChannel === "control" || type === "control" ? "control" : "data",
    };

    try {
      const payloadKeys = baseEventInfo.payload
        ? Object.keys(baseEventInfo.payload as Record<string, unknown>)
        : [];
      console.debug("[SSE]", baseEventInfo.type, payloadKeys);
    } catch {
      console.debug("[SSE]", baseEventInfo.type, []);
    }

    if (baseEventInfo.channel === "control") {
      const controlName =
        normalizeControlName((unwrappedPayload as any)?.name) ??
        normalizeControlName((unwrappedPayload as any)?.event) ??
        normalizeControlName((payload as any)?.name) ??
        normalizeControlName((payload as any)?.event);

      const normalizedControl = controlName ? mapResponseEventType(controlName).normalized ?? controlName : undefined;
      const controlEvent: EcoSseEvent = {
        ...baseEventInfo,
        type: normalizedControl ?? "control",
        name: controlName ?? undefined,
      };

      if (normalizedControl === "prompt_ready") {
        promptReadyReceived = true;
      }

      if (normalizedControl === "done") {
        doneReceived = true;
        donePayload = unwrappedPayload;
        if (!gotAnyToken) {
          doneWithoutText = true;
        }
      }

      safeInvoke(handlers.onControl, controlEvent);

      if (usingUnifiedHandler) {
        safeInvokeUnified(handlers.onEvent, {
          type: controlEvent.type,
          payload: unwrappedPayload,
          raw: eventData,
          originalType: responseOriginalType,
          channel: "control",
          name: controlEvent.name,
        });
      } else {
        if (normalizedControl === "prompt_ready") {
          safeInvoke(handlers.onPromptReady, controlEvent);
        } else if (normalizedControl === "done") {
          safeInvoke(handlers.onDone, controlEvent);
        }
      }
      return;
    }

    if (type === "error" || (payload as any)?.status === "error") {
      const errMessage =
        (payload as any)?.error?.message ||
        (payload as any)?.error ||
        (payload as any)?.message ||
        "Erro na stream SSE da Eco.";
      const normalizedError = String(errMessage);
      if (usingUnifiedHandler) {
        safeInvokeUnified(handlers.onEvent, {
          type: "error",
          message: normalizedError,
          payload: unwrappedPayload,
          raw: eventData,
          originalType: responseOriginalType,
        });
      }
      streamError = new Error(normalizedError);
      safeInvokeError(handlers.onError, streamError);
      return;
    }

    if (type === "prompt_ready") {
      promptReadyReceived = true;
      if (usingUnifiedHandler) {
        safeInvokeUnified(handlers.onEvent, {
          type: "prompt_ready",
          payload: unwrappedPayload,
          raw: eventData,
          originalType: responseOriginalType,
        });
      } else {
        safeInvoke(handlers.onPromptReady, baseEventInfo);
      }
      return;
    }

    if (type === "latency") {
      const latencyPayload = unwrapPayload(payload);
      const latencyValue =
        typeof (latencyPayload as any)?.value === "number"
          ? (latencyPayload as any).value
          : typeof (latencyPayload as any)?.latency === "number"
          ? (latencyPayload as any).latency
          : undefined;
      const eventWithLatency: EcoSseEvent = { ...baseEventInfo, latencyMs: latencyValue };
      if (usingUnifiedHandler) {
        safeInvokeUnified(handlers.onEvent, {
          type: "latency",
          latencyMs: latencyValue,
          payload: unwrappedPayload,
          raw: eventData,
          originalType: responseOriginalType,
        });
      } else {
        safeInvoke(handlers.onLatency, eventWithLatency);
      }
      return;
    }

    const fallbackText =
      normalizeAskEcoResponse(unwrappedPayload as AskEcoResponse) ||
      normalizeAskEcoResponse(payload as AskEcoResponse);

    const dedupeSources = [parsed, payload, unwrappedPayload];
    const shouldSkipChunkEvent = (eventType: string) => {
      const identifier = resolveChunkIdentifier(...dedupeSources);
      const chunkIndexValue = resolveChunkIndex(...dedupeSources);

      if (identifier && seenChunkIdentifiers.has(identifier)) {
        if (isDev) {
          console.debug("🔁 [EcoStream] chunk ignorado (duplicado)", {
            eventType,
            identifier,
          });
        }
        return true;
      }

      if (
        chunkIndexValue !== null &&
        lastChunkIndex !== null &&
        chunkIndexValue <= lastChunkIndex
      ) {
        if (isDev) {
          console.debug("🔁 [EcoStream] chunk ignorado (fora de ordem)", {
            eventType,
            chunkIndex: chunkIndexValue,
            lastChunkIndex,
          });
        }
        return true;
      }

      if (identifier) {
        seenChunkIdentifiers.add(identifier);
      }
      if (chunkIndexValue !== null) {
        lastChunkIndex = chunkIndexValue;
      }

      return false;
    };

    if (type === "first_token") {
      if (shouldSkipChunkEvent("first_token")) {
        return;
      }
      const source =
        (unwrappedPayload as any)?.delta ??
        (unwrappedPayload as any)?.content ??
        (unwrappedPayload as any)?.message ??
        unwrappedPayload;
      const texts = collectTexts(source);
      const chunkText = texts.join("");
      const resolvedText = chunkText.length > 0 ? chunkText : fallbackText;
      if (shouldIgnoreText(resolvedText)) {
        if (isDev) {
          console.debug("🔁 [EcoStream] chunk ignorado (texto trivial)", {
            eventType: "first_token",
            preview: typeof resolvedText === "string" ? resolvedText : undefined,
          });
        }
        return;
      }
      if (chunkText.length > 0) pushAggregatedPart(chunkText);
      else if (!chunkText && fallbackText) pushAggregatedPart(fallbackText);
      const eventWithText: EcoSseEvent = {
        ...baseEventInfo,
        text: resolvedText,
      };
      recordChunkPreview(
        typeof eventWithText.text === "string"
          ? eventWithText.text
          : typeof fallbackText === "string"
          ? fallbackText
          : undefined,
      );
      if (usingUnifiedHandler) {
        const firstDelta =
          typeof eventWithText.text === "string"
            ? eventWithText.text
            : typeof fallbackText === "string"
            ? fallbackText
            : "";
        safeInvokeUnified(handlers.onEvent, {
          type: "first_token",
          delta: firstDelta,
          text: eventWithText.text ?? firstDelta,
          content: eventWithText.text ?? firstDelta,
          payload: unwrappedPayload,
          raw: eventData,
          originalType: responseOriginalType,
        });
      } else {
        safeInvoke(handlers.onFirstToken, eventWithText);
      }
      return;
    }

    if (type === "chunk") {
      if (shouldSkipChunkEvent("chunk")) {
        return;
      }
      const source =
        (unwrappedPayload as any)?.delta ??
        (unwrappedPayload as any)?.content ??
        (unwrappedPayload as any)?.message ??
        unwrappedPayload;
      const texts = collectTexts(source);
      const chunkText = texts.join("");
      const resolvedText = chunkText.length > 0 ? chunkText : fallbackText;
      if (shouldIgnoreText(resolvedText)) {
        if (isDev) {
          console.debug("🔁 [EcoStream] chunk ignorado (texto trivial)", {
            eventType: "chunk",
            preview: typeof resolvedText === "string" ? resolvedText : undefined,
          });
        }
        return;
      }
      if (chunkText.length > 0) pushAggregatedPart(chunkText);
      else if (!chunkText && fallbackText) pushAggregatedPart(fallbackText);
      const eventWithText: EcoSseEvent = {
        ...baseEventInfo,
        text: resolvedText,
      };
      recordChunkPreview(
        typeof eventWithText.text === "string"
          ? eventWithText.text
          : typeof fallbackText === "string"
          ? fallbackText
          : undefined,
      );
      if (usingUnifiedHandler) {
        const chunkDelta =
          typeof eventWithText.text === "string"
            ? eventWithText.text
            : typeof fallbackText === "string"
            ? fallbackText
            : "";
        safeInvokeUnified(handlers.onEvent, {
          type: "chunk",
          delta: chunkDelta,
          text: eventWithText.text ?? chunkDelta,
          content: eventWithText.text ?? chunkDelta,
          payload: unwrappedPayload,
          raw: eventData,
          originalType: responseOriginalType,
        });
      } else {
        safeInvoke(handlers.onChunk, eventWithText);
      }
      return;
    }

    if (type === "meta" || type === "meta_pending" || type === "meta-pending") {
      const metaSource =
        (unwrappedPayload as any)?.metadata ??
        (unwrappedPayload as any)?.response ??
        unwrappedPayload;
      const eventWithMeta: EcoSseEvent = { ...baseEventInfo, metadata: metaSource };
      metadata = metaSource ?? metadata;
      if (usingUnifiedHandler) {
        const normalizedMetaType = type === "meta" ? "meta" : "meta_pending";
        safeInvokeUnified(handlers.onEvent, {
          type: normalizedMetaType,
          metadata: metaSource,
          payload: unwrappedPayload,
          raw: eventData,
          originalType: responseOriginalType,
        });
      } else if (type === "meta") {
        safeInvoke(handlers.onMeta, eventWithMeta);
      } else {
        safeInvoke(handlers.onMetaPending, eventWithMeta);
      }
      return;
    }

    if (type === "memory_saved") {
      const memoryPayload =
        (unwrappedPayload as any)?.memory ??
        (unwrappedPayload as any)?.memoria ??
        unwrappedPayload;
      const eventWithMemory: EcoSseEvent = { ...baseEventInfo, memory: memoryPayload };
      if (
        (unwrappedPayload as any)?.primeiraMemoriaSignificativa ||
        (unwrappedPayload as any)?.primeira
      ) {
        primeiraMemoriaSignificativa = true;
      }
      if (usingUnifiedHandler) {
        safeInvokeUnified(handlers.onEvent, {
          type: "memory_saved",
          memory: memoryPayload,
          payload: unwrappedPayload,
          raw: eventData,
          originalType: responseOriginalType,
        });
      } else {
        safeInvoke(handlers.onMemorySaved, eventWithMemory);
      }
      return;
    }

    if (type === "done") {
      doneReceived = true;
      donePayload = unwrappedPayload;
      const responseMetadata =
        (unwrappedPayload as any)?.response ??
        (unwrappedPayload as any)?.metadata ??
        unwrappedPayload;
      metadata = responseMetadata ?? metadata;

      if (
        (unwrappedPayload as any)?.primeiraMemoriaSignificativa ||
        (unwrappedPayload as any)?.primeira
      ) {
        primeiraMemoriaSignificativa = true;
      }

      const source =
        (unwrappedPayload as any)?.delta ??
        (unwrappedPayload as any)?.content ??
        (unwrappedPayload as any)?.message ??
        (unwrappedPayload as any)?.response;
      const texts = collectTexts(source);
      const doneText = texts.join("");
      if (doneText.length > 0 && aggregatedParts.length === 0) {
        pushAggregatedPart(doneText);
      } else if (!doneText && fallbackText && aggregatedParts.length === 0) {
        pushAggregatedPart(fallbackText);
      }

      const eventWithMeta: EcoSseEvent = {
        ...baseEventInfo,
        payload: unwrappedPayload,
        metadata: responseMetadata,
        text: doneText.length > 0 ? doneText : fallbackText,
      };
      if (usingUnifiedHandler) {
        safeInvokeUnified(handlers.onEvent, {
          type: "done",
          metadata: responseMetadata,
          payload: unwrappedPayload,
          text:
            typeof eventWithMeta.text === "string"
              ? eventWithMeta.text
              : typeof fallbackText === "string"
              ? fallbackText
              : undefined,
          content:
            typeof eventWithMeta.text === "string"
              ? eventWithMeta.text
              : typeof fallbackText === "string"
              ? fallbackText
              : undefined,
          raw: eventData,
          originalType: responseOriginalType,
          done: unwrappedPayload,
        });
      } else {
        safeInvoke(handlers.onDone, eventWithMeta);
      }
      if (!gotAnyToken) {
        doneWithoutText = true;
      }
      if (chunkDebugInfo && chunkDebugInfo.last.length > 0) {
        console.debug(
          "🔎 [EcoStream] Últimos chunks recebidos:",
          [...chunkDebugInfo.last],
        );
      }
      return;
    }

    if (fallbackText) {
      pushAggregatedPart(fallbackText);
      const eventWithText: EcoSseEvent = { ...baseEventInfo, text: fallbackText };
      if (usingUnifiedHandler) {
        safeInvokeUnified(handlers.onEvent, {
          type,
          delta: fallbackText,
          text: fallbackText,
          content: fallbackText,
          payload: unwrappedPayload,
          raw: eventData,
          originalType: responseOriginalType,
        });
      } else {
        safeInvoke(handlers.onChunk, eventWithText);
      }
      return;
    }

    if (isDev) console.debug("ℹ️ [ECO API] Evento SSE ignorado:", eventData);
  };

  const flushBuffer = (final = false) => {
    buffer = normalizeSseNewlines(buffer);
    let idx = buffer.indexOf("\n\n");
    while (idx !== -1) {
      const segment = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const parsed = parseSseEvent(segment);
      if (parsed !== undefined) handleEvent(parsed);
      idx = buffer.indexOf("\n\n");
    }
    if (final) {
      const remainder = buffer;
      if (remainder.length > 0) {
        const parsed = parseSseEvent(remainder);
        if (parsed !== undefined) handleEvent(parsed);
      }
      buffer = "";
    }
  };

  try {
    while (!doneReceived && !streamError && !aborted) {
      if (signal?.aborted) {
        handleAbort();
        break;
      }

      let chunk: ReadableStreamReadResult<Uint8Array>;
      try {
        chunk = await reader.read();
      } catch (error: any) {
        if (signal?.aborted || error?.name === "AbortError") {
          handleAbort();
          break;
        }
        throw error;
      }

      const { value, done } = chunk;
      if (done) break;
      if (!value) continue;
      buffer += decoder.decode(value, { stream: true });
      flushBuffer();
    }

    if (aborted) {
      throw new DOMException("A leitura do stream foi abortada.", "AbortError");
    }

    if (!streamError) {
      buffer += decoder.decode();
      flushBuffer(true);
    }
    if (streamError) throw streamError;

    if (!doneReceived) {
      console.warn("Fluxo encerrado sem done", {
        doneReceived,
        gotAnyToken,
        aggregatedPartsCount: aggregatedParts.length,
        promptReadyReceived,
        donePayload,
      });
    }

    let texto = aggregatedText || aggregatedParts.join("");
    if (!texto.trim() && lastNonEmptyText) {
      texto = lastNonEmptyText;
    }
    texto = texto.trim();

    if (!texto && donePayload) {
      const fallback = normalizeAskEcoResponse(donePayload as AskEcoResponse);
      if (fallback) texto = fallback;
    }

    if (!texto) texto = "";

    const noTextReceived = (!gotAnyToken && doneReceived) || (doneWithoutText && promptReadyReceived);
    if (noTextReceived) {
      console.warn("⚠️ [ECO API] Stream encerrada sem nenhum texto recebido.", {
        promptReadyReceived,
        doneReceived,
        aggregatedPartsCount: aggregatedParts.length,
        donePayload,
      });
    }

    return {
      text: texto,
      metadata,
      done: donePayload,
      primeiraMemoriaSignificativa,
      ...(noTextReceived ? { noTextReceived: true } : {}),
    };
  } finally {
    if (signal && typeof signal.removeEventListener === "function") {
      signal.removeEventListener("abort", handleAbort);
    }
    try {
      reader.releaseLock();
    } catch {}
  }
};

export const parseNonStreamResponse = async (response: Response): Promise<EcoStreamResult> => {
  let fallbackRaw = "";
  try {
    fallbackRaw = await response.text();
  } catch (err) {
    if (isDev) console.warn("⚠️ [ECO API] Falha ao ler resposta não-SSE da Eco", err);
  }

  let parsedPayload: any = undefined;
  if (fallbackRaw) {
    try {
      parsedPayload = JSON.parse(fallbackRaw);
    } catch {
      parsedPayload = fallbackRaw;
    }
  }

  const normalizedText =
    typeof parsedPayload === "string"
      ? parsedPayload
      : normalizeAskEcoResponse(parsedPayload as AskEcoResponse);

  const text = (normalizedText || "").trim();
  const isObjectPayload = typeof parsedPayload === "object" && parsedPayload !== null;

  return {
    text,
    metadata: isObjectPayload
      ? (parsedPayload as any).metadata ?? (parsedPayload as any).response ?? undefined
      : undefined,
    done: isObjectPayload
      ? parsedPayload
      : text
      ? { response: text }
      : undefined,
    primeiraMemoriaSignificativa: isObjectPayload
      ? Boolean(
          (parsedPayload as any).primeiraMemoriaSignificativa ||
            (parsedPayload as Record<string, unknown>).primeira
        )
      : false,
  };
};

const mapHistoryMessage = (message: Message) => {
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
    client_message_id:
      message.client_message_id ?? message.clientMessageId ?? message.id ?? undefined,
  };
};

const dispatchSseBlock = (
  block: string,
  context: {
    nextChunkIndex: () => number;
    onChunk?: (chunk: EcoStreamChunk) => void;
    onDone?: (event: EcoStreamDoneEvent) => void;
    onPromptReady?: (event: EcoStreamPromptReadyEvent) => void;
    onControl?: (event: EcoStreamControlEvent) => void;
  },
) => {
  const normalizedBlock = normalizeSseNewlines(block);
  const parsed = parseSseEvent(normalizedBlock);
  if (!parsed) return;

  const rawType = parsed.type;
  const payload = parsed.payload ?? {};
  const payloadType = typeof (payload as any)?.type === "string" ? (payload as any).type : undefined;
  const rawControlName = (payload as any)?.name ?? (payload as any)?.event;
  const controlName = normalizeControlName(rawControlName);
  const primaryType = rawType ?? payloadType ?? controlName ?? "chunk";
  const { normalized: mappedType } = mapResponseEventType(primaryType);
  let resolvedType = mappedType ?? primaryType;

  if (resolvedType === "control" && controlName) {
    const mappedControl = mapResponseEventType(controlName).normalized;
    resolvedType = mappedControl ?? controlName;
  }

  const baseEventInfo = {
    interactionId: extractInteractionId(payload),
    messageId: extractMessageId(payload),
    createdAt: extractCreatedAt(payload),
  };

  if (resolvedType === "control") {
    context.onControl?.({
      type: typeof payloadType === "string" ? payloadType : undefined,
      name: typeof rawControlName === "string" ? rawControlName : undefined,
      payload,
      interactionId: baseEventInfo.interactionId,
      messageId: baseEventInfo.messageId,
      createdAt: baseEventInfo.createdAt,
    });
    return;
  }

  if (resolvedType === "prompt_ready") {
    context.onPromptReady?.({
      interactionId: baseEventInfo.interactionId,
      messageId: baseEventInfo.messageId,
      createdAt: baseEventInfo.createdAt,
      payload,
    });
    return;
  }

  if (resolvedType === "done") {
    context.onDone?.({
      payload: parsed.payload,
      interactionId: baseEventInfo.interactionId,
      messageId: baseEventInfo.messageId,
      createdAt: baseEventInfo.createdAt,
    });
    return;
  }

  const isFirstToken = resolvedType === "first_token";
  const treatedType = resolvedType === "first_token" ? "chunk" : resolvedType;

  if (treatedType === "chunk") {
    const payloadRecord =
      payload && typeof payload === "object" ? (payload as Record<string, unknown>) : undefined;
    const dataRecord =
      payloadRecord && payloadRecord.data && typeof payloadRecord.data === "object"
        ? (payloadRecord.data as Record<string, unknown>)
        : payloadRecord;
    const metaRecord =
      dataRecord && typeof dataRecord.meta === "object"
        ? (dataRecord.meta as Record<string, unknown>)
        : undefined;
    const rawTextCandidate = (() => {
      if (!dataRecord || typeof dataRecord !== "object") return undefined;
      const directText = (dataRecord as { text?: unknown }).text;
      if (typeof directText === "string") return directText;
      const deltaText = (dataRecord as { delta?: unknown }).delta;
      if (typeof deltaText === "string") return deltaText;
      const contentText = (dataRecord as { content?: unknown }).content;
      if (typeof contentText === "string") return contentText;
      return undefined;
    })();

    if (
      metaRecord &&
      typeof metaRecord.status === "string" &&
      metaRecord.status.toLowerCase() === "connected" &&
      (typeof rawTextCandidate !== "string" || rawTextCandidate.length === 0)
    ) {
      console.log("[SSE-FE] Connection frame received, waiting for real chunks");
      return;
    }

    const normalizedData = normalizeChunkData(payload);
    if (!normalizedData) {
      return;
    }

    const fallbackIndex = context.nextChunkIndex();
    const index =
      typeof normalizedData.index === "number" && Number.isFinite(normalizedData.index)
        ? normalizedData.index
        : fallbackIndex;
    const resolvedText =
      typeof normalizedData.text === "string"
        ? normalizedData.text
        : typeof parsed.text === "string"
        ? parsed.text
        : undefined;

    context.onChunk?.({
      index,
      text: resolvedText,
      metadata: normalizedData.meta,
      interactionId: baseEventInfo.interactionId,
      messageId: baseEventInfo.messageId,
      createdAt: baseEventInfo.createdAt,
      isFirstChunk: isFirstToken || index === 0 || fallbackIndex === 0,
      payload: normalizedData,
    });
    return;
  }
};

export const startEcoStream = async (options: StartEcoStreamOptions): Promise<void> => {
  const {
    history,
    clientMessageId,
    systemHint,
    userId,
    userName,
    guestId,
    isGuest,
    onFirstChunk,
    onStreamOpen,
    onStreamAbort,
    headers,
    onChunk,
    onDone,
    onError,
    onPromptReady,
    onControl,
  } = options;

  // --- Abort/Signal robusto para SSE ---
  const userSignal = options.signal;
  const internalCtrl = new AbortController();
  // Fallback para navegadores sem AbortSignal.any
  const anySignal = (signals: AbortSignal[]): AbortSignal => {
    const ctrl = new AbortController();
    const abortFrom = (s: AbortSignal) => {
      if (!ctrl.signal.aborted) ctrl.abort((s as any).reason ?? "any-abort");
    };
    for (const s of signals) {
      if (!s) continue;
      if (s.aborted) {
        abortFrom(s);
        break;
      }
      s.addEventListener("abort", () => abortFrom(s), { once: true });
    }
    return ctrl.signal;
  };
  const supportsAbortAny =
    typeof AbortSignal !== "undefined" && typeof (AbortSignal as any).any === "function";
  const effectiveSignal = supportsAbortAny
    ? (AbortSignal as any).any([internalCtrl.signal, ...(userSignal ? [userSignal] : [])])
    : anySignal([internalCtrl.signal, ...(userSignal ? [userSignal] : [])]);
  (globalThis as any).__ecoActiveCtrl = internalCtrl;
  if (userSignal?.aborted) {
    internalCtrl.abort(); // sincroniza estado
    throw new DOMException("Aborted", "AbortError");
  }
  if (userSignal && !userSignal.aborted) {
    userSignal.addEventListener(
      "abort",
      () => {
        try {
          internalCtrl.abort();
        } catch {
          /* noop */
        }
      },
      { once: true },
    );
  }

  const baseHeaders: Record<string, string> = {
    Accept: "text/event-stream",
    "Content-Type": "application/json",
    ...buildIdentityHeaders(),
    ...(headers ?? {}),
  };

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

  if (clientMessageId && clientMessageId.trim().length > 0) {
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

  let chunkIndex = -1;
  const nextChunkIndex = () => {
    chunkIndex += 1;
    return chunkIndex;
  };

  const url = resolveApiUrl("/api/ask-eco");

  let chunkTimeoutId: ReturnType<typeof setTimeout> | undefined;
  const clearChunkTimeout = () => {
    if (chunkTimeoutId) {
      clearTimeout(chunkTimeoutId);
      chunkTimeoutId = undefined;
    }
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: baseHeaders,
      body: JSON.stringify(payload),
      signal: effectiveSignal,
      cache: "no-store",
      redirect: "follow",
      keepalive: true,
    });

    const headerEntries = Array.from(response.headers.entries());
    const headerMap = headerEntries.reduce<Record<string, string>>((acc, [key, value]) => {
      acc[key.toLowerCase()] = value;
      return acc;
    }, {});
    const contentType = headerMap["content-type"]?.toLowerCase() ?? "";
    const isSseResponse = contentType.includes("text/event-stream");

    if (isDev) {
      try {
        console.debug("[DIAG] stream:response", {
          clientMessageId,
          status: response.status,
          decision: isSseResponse ? "sse" : "fallback",
          headers: headerMap,
        });
      } catch {
        /* noop */
      }
    }

    if (!response.ok || !isSseResponse) {
      let detail = "";
      try {
        detail = await response.text();
      } catch {
        detail = "";
      }

      const trimmedDetail = detail.trim();
      const preview = trimmedDetail.slice(0, 200);
      const baseMessage = !response.ok
        ? `Eco stream request failed (${response.status})`
        : `Resposta inválida: status=${response.status} content-type=${contentType || "<desconhecido>"}`;
      const message = trimmedDetail.startsWith("<!DOCTYPE")
        ? `Gateway/edge retornou HTML (${response.status}). Ver backlogs. Trecho: ${preview}...`
        : `${baseMessage}${preview ? ` body=${preview}...` : ""}`;

      const error = new Error(message);
      try {
        onStreamAbort?.(error);
      } catch {
        /* noop */
      }
      onError?.(error);
      throw error;
    }

    try {
      onStreamOpen?.({ status: response.status, contentType: contentType || null });
    } catch {
      /* noop */
    }

    const reader = response.body?.getReader();
    if (!reader) {
      const error = new Error("Eco stream response has no readable body.");
      try {
        onStreamAbort?.("no-readable-body");
      } catch {
        /* noop */
      }
      onError?.(error);
      throw error;
    }
    (globalThis as any).__ecoActiveReader = reader;

    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let chunkReceived = false;
    const chunkTimeoutMs = 180000;

    chunkTimeoutId = setTimeout(() => {
      if (!chunkReceived && isDev) {
        try {
          console.warn("⚠️ [ECO API] SSE sem chunks", {
            clientMessageId,
            status: response.status,
            contentType: contentType || null,
          });
        } catch {
          /* noop */
        }
      }
    }, chunkTimeoutMs);

    const wrappedOnChunk = (chunk: EcoStreamChunk) => {
      if (!chunkReceived) {
        chunkReceived = true;
        clearChunkTimeout();
        onFirstChunk?.();
      }
      onChunk?.(chunk);
    };

    const wrappedOnDone = (event: EcoStreamDoneEvent) => {
      clearChunkTimeout();
      if (!chunkReceived) {
        const fallbackText = normalizeAskEcoResponse(event?.payload as AskEcoResponse);
        if (fallbackText) {
          chunkReceived = true;
          if (isDev) {
            try {
              console.info("ℹ️ [ECO API] fallback aplicado", {
                clientMessageId,
                reason: "no_chunks",
                status: response.status,
              });
            } catch {
              /* noop */
            }
          }

          const payloadRecord =
            event?.payload && typeof event.payload === "object"
              ? (event.payload as Record<string, unknown>)
              : undefined;

          const fallbackMetadata = (payloadRecord?.metadata as unknown) ?? undefined;

          wrappedOnChunk({
            index: 0,
            text: fallbackText,
            metadata: fallbackMetadata,
            interactionId: event?.interactionId,
            messageId: event?.messageId,
            createdAt: event?.createdAt,
            isFirstChunk: true,
            payload: event?.payload,
          });
        }
      }

      onDone?.(event);
    };

    const flushBuffer = (finalFlush = false) => {
      if (buffer.length === 0) return;
      let searchIndex = buffer.indexOf("\n\n");
      while (searchIndex !== -1) {
        const eventBlock = buffer.slice(0, searchIndex);
        buffer = buffer.slice(searchIndex + 2);
        if (eventBlock.length > 0) {
          dispatchSseBlock(eventBlock, {
            nextChunkIndex,
            onChunk: wrappedOnChunk,
            onDone: wrappedOnDone,
            onPromptReady,
            onControl,
          });
        }
        searchIndex = buffer.indexOf("\n\n");
      }

      if (finalFlush && buffer.length > 0) {
        dispatchSseBlock(buffer, {
          nextChunkIndex,
          onChunk: wrappedOnChunk,
          onDone: wrappedOnDone,
          onPromptReady,
          onControl,
        });
        buffer = "";
      }
    };

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          buffer = normalizeSseNewlines(buffer + decoder.decode());
          flushBuffer(true);
          break;
        }

        buffer = normalizeSseNewlines(buffer + decoder.decode(value, { stream: true }));
        flushBuffer();
      }
    } finally {
      try {
        reader.releaseLock();
      } catch {
        /* noop */
      }
    }

    clearChunkTimeout();

    onDone?.({ payload: undefined });
  } catch (error) {
    clearChunkTimeout();
    const effective = effectiveSignal as AbortSignal & { reason?: unknown };
    if (effective?.aborted) {
      const abortReason =
        effective?.reason ?? (userSignal as (AbortSignal & { reason?: unknown }) | undefined)?.reason ?? error;
      try {
        onStreamAbort?.(abortReason);
      } catch {
        /* noop */
      }
      const abortError =
        error instanceof DOMException && error.name === "AbortError"
          ? error
          : new DOMException("Aborted", "AbortError");
      onError?.(abortError);
      throw abortError;
    }
    try {
      onStreamAbort?.(error);
    } catch {
      /* noop */
    }
    onError?.(error);
    throw error;
  }
};

export const normalizeStreamText = (s: string): string => {
  // Preserve user-visible spacing by only normalizing carriage returns.
  return s.replace(/\r\n?/g, "\n");
};

