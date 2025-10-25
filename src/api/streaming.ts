import { v4 as uuidv4 } from "uuid";
import { syncGuestId } from "../lib/guestId";
import { EcoApiError } from "./errors";
import { normalizeGuestIdFormat } from "./guestIdentity";
import { parseNonStreamResponse, processEventStream } from "./ecoStream";
import type { EcoStreamResult } from "./ecoStream";
import type { AbortCleanup, HandleStreamResponseArgs, StreamExecutionArgs, StreamResponseResult } from "./types";

const combineAbortSignals = (...signals: (AbortSignal | null | undefined)[]): AbortCleanup => {
  const active = signals.filter(Boolean) as AbortSignal[];
  if (!active.length) return { cleanup: () => {} };
  const controller = new AbortController();
  const abort = (reason?: unknown) => {
    if (controller.signal.aborted) return;
    try {
      controller.abort(reason);
    } catch {
      controller.abort();
    }
  };
  const listeners = active.map((signal) => {
    const handler = () => abort((signal as any).reason);
    if (signal.aborted) {
      abort((signal as any).reason);
    } else {
      signal.addEventListener("abort", handler, { once: true });
    }
    return { signal, handler };
  });
  return { signal: controller.signal, cleanup: () => listeners.forEach(({ signal, handler }) => signal.removeEventListener("abort", handler)) };
};

let currentStreamController: AbortController | null = null;

export const isNavigatorOffline = () => typeof navigator !== "undefined" && typeof navigator.onLine === "boolean" && navigator.onLine === false;

export const isLikelyNetworkError = (error: unknown) => {
  const message = typeof (error as { message?: unknown })?.message === "string" ? ((error as { message: string }).message || "").toLowerCase() : "";
  return message.includes("failed to fetch") || message.includes("networkerror") || message.includes("net::err") || message.includes("err_connection");
};

const mapStatusToFriendlyMessage = (status: number, fallback: string, networkErrorMessage: string) => {
  if (status === 401) return "Faça login para continuar a conversa com a Eco.";
  if (status === 429) return "Muitas requisições. Aguarde alguns segundos antes de tentar novamente.";
  if (status === 503) return networkErrorMessage;
  if (status >= 500) return "A Eco está indisponível no momento. Tente novamente em instantes.";
  return fallback;
};

const logResponse = (label: string, response: Response, extra?: Record<string, unknown>) => {
  console.error(label, { url: response.url, status: response.status, statusText: response.statusText, redirected: response.redirected, ...extra });
};

const readServerError = async (response: Response): Promise<{ serverErr?: string; details: unknown }> => {
  try {
    const responseContentType = response.headers.get("content-type") || "";
    if (responseContentType.includes("application/json")) {
      const errJson = await response.json();
      return { serverErr: errJson?.error || errJson?.message, details: errJson };
    }
    const errText = await response.text();
    return { serverErr: errText, details: errText };
  } catch {
    return { serverErr: undefined, details: undefined };
  }
};

export const handleStreamResponse = async ({ response, handlers, signal, networkErrorMessage }: HandleStreamResponseArgs): Promise<StreamResponseResult> => {
  if (!response.ok) {
    logResponse("❌ [ECO API] SSE request falhou", response);
    const { serverErr, details } = await readServerError(response);
    const baseMessage = `Erro HTTP ${response.status}: ${response.statusText || "Falha na requisição"}`;
    const friendly = mapStatusToFriendlyMessage(response.status, baseMessage, networkErrorMessage);
    const retryAfter = response.headers.get("retry-after") || undefined;
    throw new EcoApiError(serverErr?.trim() || friendly, { status: response.status, details: { statusText: response.statusText, body: details, ...(retryAfter ? { retryAfter } : {}) } });
  }
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("text/event-stream")) {
    const diagnosticBody = await response.clone().text().catch(() => undefined);
    logResponse("❌ [ECO API] Resposta inesperada para stream", response, { contentType, bodyPreview: diagnosticBody?.slice(0, 500) });
    throw new EcoApiError("Não foi possível iniciar a transmissão da Eco. Tente novamente em instantes.", { status: response.status, details: { reason: "invalid_content_type", contentType, body: diagnosticBody } });
  }
  if (response.body) {
    const result = await processEventStream(response, handlers, { signal });
    return { result, streamOpened: true };
  }
  const fallback = await parseNonStreamResponse(response);
  return { result: fallback, streamOpened: true };
};

export const executeStreamRequest = async ({ headers, payload, streamUrl, handlers, signal, networkErrorMessage }: StreamExecutionArgs): Promise<EcoStreamResult> => {
  const maxStreamRetries = 1;
  for (let attempt = 0; attempt <= maxStreamRetries; attempt += 1) {
    headers["X-Stream-Id"] = uuidv4();
    if (currentStreamController) {
      try {
        currentStreamController.abort();
      } catch {
        currentStreamController.abort();
      }
    }
    const streamController = typeof AbortController !== "undefined" ? new AbortController() : null;
    currentStreamController = streamController;
    const { signal: mergedSignal, cleanup } = combineAbortSignals(signal, streamController?.signal);
    let streamOpened = false;
    try {
      const requestInit: RequestInit & { duplex?: "half" } = { method: "POST", headers, body: JSON.stringify(payload), cache: "no-store", redirect: "follow", keepalive: false, signal: mergedSignal };
      const maybeStreamBody = requestInit.body as unknown;
      if (typeof ReadableStream !== "undefined" && maybeStreamBody && (maybeStreamBody instanceof ReadableStream || typeof (maybeStreamBody as { getReader?: () => unknown }).getReader === "function")) {
        requestInit.duplex = "half";
      }
      const response = await fetch(streamUrl, requestInit);
      const serverGuestId = normalizeGuestIdFormat(response.headers.get("x-eco-guest-id") ?? response.headers.get("x-guest-id")) || null;
      if (serverGuestId) syncGuestId(serverGuestId);
      const { result, streamOpened: opened } = await handleStreamResponse({ response, handlers, signal: mergedSignal, networkErrorMessage });
      streamOpened = opened;
      return result;
    } catch (error: any) {
      if (error instanceof EcoApiError) throw error;
      const abortError = error?.name === "AbortError" || error instanceof DOMException;
      const abortedByCaller = Boolean(abortError && (signal?.aborted || streamController?.signal.aborted));
      if (abortedByCaller) throw error;
      const networkFailure = !streamOpened && (isNavigatorOffline() || error instanceof TypeError || isLikelyNetworkError(error));
      if (networkFailure && attempt < maxStreamRetries) continue;
      throw error;
    } finally {
      cleanup();
      if (currentStreamController === streamController) currentStreamController = null;
    }
  }
  throw new EcoApiError(networkErrorMessage, { details: { reason: "stream_unreachable" } });
};
