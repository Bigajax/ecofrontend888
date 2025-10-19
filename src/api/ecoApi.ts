// src/api/ecoApi.ts
import { v4 as uuidv4 } from "uuid";

import api from "./axios";
import { supabase } from "../lib/supabaseClient";
import { resolveApiUrl } from "../constants/api";
import { logHttpRequestDebug } from "../utils/httpDebug";
import { sanitizeEcoText } from "../utils/sanitizeEcoText";

import { EcoApiError, MissingUserIdError } from "./errors";
import { AskEcoResponse, normalizeAskEcoResponse } from "./askEcoResponse";
import {
  ensureGuestId,
  normalizeGuestIdFormat,
  persistGuestId,
  readPersistedGuestId,
} from "./guestIdentity";

// ⚠️ Estes são tipos, não valores em runtime
import { parseNonStreamResponse, processEventStream } from "./ecoStream";
import type {
  EcoEventHandlers,
  EcoClientEvent,
  EcoSseEvent,
  EcoStreamResult,
} from "./ecoStream";

export { EcoApiError };
export type { EcoClientEvent, EcoEventHandlers, EcoSseEvent, EcoStreamResult };

export async function askEco(
  payload: any,
  opts: { stream?: boolean; headers?: Record<string, string> } = {}
) {
  const headers: Record<string, string> = { ...(opts.headers ?? {}) };
  if (opts.stream) headers["Accept"] = headers["Accept"] ?? "text/event-stream";

  const response = await api.post("/api/ask-eco", payload, {
    headers,
    responseType: opts.stream ? "text" : "json",
  });

  return response.data;
}

interface Message {
  id?: string;
  role: string;
  content: string;
}

const ASK_ENDPOINT = "/api/ask-eco";

const NETWORK_ERROR_MESSAGE =
  "Não consegui conectar ao servidor. Verifique sua internet ou tente novamente em instantes.";

type AbortCleanup = { cleanup: () => void; signal?: AbortSignal };

const combineAbortSignals = (
  ...signals: (AbortSignal | null | undefined)[]
): AbortCleanup => {
  const active = signals.filter(Boolean) as AbortSignal[];
  if (active.length === 0) {
    return { cleanup: () => {} };
  }

  const controller = new AbortController();
  const abort = (reason?: unknown) => {
    if (!controller.signal.aborted) {
      try {
        controller.abort(reason);
      } catch {
        controller.abort();
      }
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

  return {
    signal: controller.signal,
    cleanup: () => {
      listeners.forEach(({ signal, handler }) => {
        signal.removeEventListener("abort", handler);
      });
    },
  };
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type FetchWithRetryOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
  retries?: number;
};

let currentStreamController: AbortController | null = null;

const isNavigatorOffline = () => {
  if (typeof navigator === "undefined") return false;
  if (typeof navigator.onLine !== "boolean") return false;
  return navigator.onLine === false;
};

const isLikelyNetworkError = (error: unknown) => {
  const message =
    typeof (error as { message?: unknown })?.message === "string"
      ? ((error as { message: string }).message || "").toLowerCase()
      : "";

  return (
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("net::err") ||
    message.includes("err_connection")
  );
};

const ensureHttpsUrl = (url: string) => {
  if (!url || !/^http:\/\//i.test(url)) return url;

  const runningInBrowser = typeof window !== "undefined" && !!window.location;
  const shouldForceHttps =
    (runningInBrowser && window.location.protocol === "https:") || !Boolean(import.meta.env?.DEV);

  return shouldForceHttps ? url.replace(/^http:\/\//i, "https://") : url;
};

const fetchWithRetry = async (
  url: string,
  init: RequestInit & { signal?: AbortSignal },
  { signal, timeoutMs = 12_000, retries = 2 }: FetchWithRetryOptions = {}
): Promise<Response> => {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const timeoutController =
      typeof AbortController !== "undefined" ? new AbortController() : null;
    let timedOut = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    if (timeoutController && Number.isFinite(timeoutMs) && timeoutMs > 0) {
      timeoutId = setTimeout(() => {
        timedOut = true;
        timeoutController.abort();
      }, timeoutMs);
    }

    const { signal: mergedSignal, cleanup } = combineAbortSignals(
      signal,
      init.signal,
      timeoutController?.signal
    );

    try {
      const response = await fetch(url, { ...init, signal: mergedSignal });
      if (timeoutId) clearTimeout(timeoutId);

      if (response.status === 503 && attempt < retries) {
        if (import.meta.env?.DEV) {
          console.warn(
            "[ECO API] HTTP 503 recebido, tentando novamente",
            {
              attempt: attempt + 1,
              retries,
              url: response.url,
            }
          );
        }
        try {
          await response.body?.cancel?.();
        } catch {
          /* ignore */
        }
        lastError = response;
        await sleep(250 * (attempt + 1));
        continue;
      }

      return response;
    } catch (error: any) {
      if (timeoutId) clearTimeout(timeoutId);

      const abortError = error?.name === "AbortError" || error instanceof DOMException;
      const abortedByCaller = Boolean(
        abortError && (signal?.aborted || init.signal?.aborted)
      );

      if (abortedByCaller) {
        cleanup();
        throw error;
      }

      const shouldRetry =
        attempt < retries && (timedOut || error instanceof TypeError);

      if (shouldRetry) {
        lastError = error;
        await sleep(250 * (attempt + 1));
        continue;
      }

      throw error;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      cleanup();
    }
  }

  if (lastError instanceof Response) {
    return lastError;
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Falha ao se conectar ao servidor da Eco.");
};

const mapStatusToFriendlyMessage = (status: number, fallback: string) => {
  if (status === 401) return "Faça login para continuar a conversa com a Eco.";
  if (status === 429) return "Muitas requisições. Aguarde alguns segundos antes de tentar novamente.";
  if (status === 503) return NETWORK_ERROR_MESSAGE;
  if (status >= 500) return "A Eco está indisponível no momento. Tente novamente em instantes.";
  return fallback;
};

const createMessageId = () => {
  const globalCrypto: Crypto | undefined =
    typeof globalThis !== "undefined" ? (globalThis as any).crypto : undefined;

  if (globalCrypto && typeof globalCrypto.randomUUID === "function") {
    try {
      return globalCrypto.randomUUID();
    } catch {}
  }
  return uuidv4();
};

const collectValidMessages = (userMessages: Message[]): Message[] =>
  userMessages
    .slice(-3)
    .filter(
      (m) =>
        m &&
        typeof m.role === "string" &&
        typeof m.content === "string" &&
        m.content.trim().length > 0
    )
    .map((m) => ({ ...m, id: m.id || createMessageId() }));

const resolveGuestHeaders = (
  options: { guestId?: string; isGuest?: boolean } | undefined,
  token: string | null
) => {
  const userWantsGuest = options?.isGuest === true;
  const isGuest = userWantsGuest || !token;

  const providedGuestId = normalizeGuestIdFormat(options?.guestId);
  const storedGuestId = readPersistedGuestId();

  const guestId = providedGuestId || storedGuestId || ensureGuestId();

  persistGuestId(guestId);

  return { guestId, isGuest };
};

type RequestPreparation = {
  headers: Record<string, string>;
  credentials: RequestCredentials;
  payload: Record<string, unknown>;
};

const prepareRequest = (
  mensagens: Message[],
  userName: string | undefined,
  userId: string | undefined,
  hour: number,
  tz: string,
  guest: { guestId: string; isGuest: boolean },
  token: string | null,
  isStreaming: boolean
) => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (guest.isGuest) {
    headers["X-Guest-Id"] = guest.guestId;
  }

  if (!guest.isGuest && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (isStreaming) {
    headers.Accept = "text/event-stream";
  }

  const bodyPayload: Record<string, unknown> = {
    mensagens,
    clientHour: hour,
    clientTz: tz,
  };

  if (typeof userName === "string" && userName.trim().length > 0) {
    bodyPayload.nome_usuario = userName;
  }
  if (userId) {
    bodyPayload.usuario_id = userId;
  }
  if (guest.isGuest) {
    bodyPayload.isGuest = true;
    bodyPayload.guestId = guest.guestId;
  }

  return {
    headers,
    credentials: "omit",
    payload: bodyPayload,
  } satisfies RequestPreparation;
};

const parseNonStreamPayload = (payload: unknown): EcoStreamResult => {
  if (typeof payload === "string") {
    const trimmed = payload.trim();
    if (!trimmed) return { text: "" };
    try {
      return parseNonStreamPayload(JSON.parse(trimmed));
    } catch {
      return { text: sanitizeEcoText(trimmed).trim() };
    }
  }

  if (!payload || typeof payload !== "object") {
    return { text: "" };
  }

  const normalizedText = normalizeAskEcoResponse(payload as AskEcoResponse) ?? "";
  const sanitizedText = sanitizeEcoText(normalizedText);
  const text = sanitizedText.trim();
  const metadata = (payload as any)?.metadata ?? (payload as any)?.response ?? undefined;
  const done = (payload as any)?.done ?? (payload as any)?.response ?? undefined;
  const primeiraMemoriaSignificativa = Boolean(
    (payload as any)?.primeiraMemoriaSignificativa ?? (payload as any)?.primeira
  );

  return {
    text,
    metadata,
    done,
    primeiraMemoriaSignificativa,
  };
};

type EnviarMensagemOptions = {
  guestId?: string;
  isGuest?: boolean;
  signal?: AbortSignal;
  stream?: boolean;
};

export const enviarMensagemParaEco = async (
  userMessages: Message[],
  userName?: string,
  userId?: string,
  clientHour?: number,
  clientTz?: string,
  handlers: EcoEventHandlers = {},
  options: EnviarMensagemOptions = {}
): Promise<EcoStreamResult> => {
  const mensagensValidas = collectValidMessages(userMessages);
  if (mensagensValidas.length === 0) throw new Error("Nenhuma mensagem válida para enviar.");

  const hour = typeof clientHour === "number" ? clientHour : new Date().getHours();
  const tz = clientTz || Intl.DateTimeFormat().resolvedOptions().timeZone;

  try {
    const { data: sessionData } =
      (await supabase.auth.getSession().catch(() => ({ data: { session: null } as any }))) || {
        data: { session: null },
      };
    const sessionUser = sessionData?.session?.user as { id?: string } | undefined;
    const token = sessionData?.session?.access_token ?? null;

    const guest = resolveGuestHeaders(options, token);

    const normalizedUserId = (() => {
      const directId = typeof userId === "string" ? userId.trim() : "";
      if (directId) return directId;
      const sessionId = typeof sessionUser?.id === "string" ? sessionUser.id.trim() : "";
      if (sessionId) return sessionId;
      return guest.isGuest ? guest.guestId : "";
    })();

    if (!normalizedUserId) {
      throw new MissingUserIdError(ASK_ENDPOINT);
    }

    const isStreaming = options.stream !== false;

    const { headers, payload } = prepareRequest(
      mensagensValidas,
      userName,
      normalizedUserId,
      hour,
      tz,
      guest,
      token,
      isStreaming
    );

    logHttpRequestDebug({
      method: "POST",
      url: resolveApiUrl(ASK_ENDPOINT),
      credentials: "omit",
      headers,
    });

    // 🔹 Caminho JSON (sem stream)
    if (!isStreaming) {
      const data = await askEco(payload, { stream: false, headers });
      return parseNonStreamPayload(data);
    }

    // 🔹 Caminho de STREAM (SSE) — força consumo do body sempre que existir
    const streamUrl = ensureHttpsUrl(resolveApiUrl(ASK_ENDPOINT));
    const maxStreamRetries = 1;
    let attempt = 0;

    while (attempt <= maxStreamRetries) {
      headers["X-Stream-Id"] = uuidv4();

      if (currentStreamController) {
        try {
          currentStreamController.abort();
        } catch {
          currentStreamController.abort();
        }
      }

      const streamController =
        typeof AbortController !== "undefined" ? new AbortController() : null;
      currentStreamController = streamController;

      const { signal: mergedSignal, cleanup } = combineAbortSignals(
        options.signal,
        streamController?.signal
      );

      let streamOpened = false;

      try {
        const response = await fetch(streamUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
          cache: "no-store",
          credentials: "omit",
          mode: "cors",
          redirect: "follow",
          keepalive: false,
          signal: mergedSignal,
        });

        const serverGuestId = normalizeGuestIdFormat(response.headers.get("x-guest-id"));
        if (serverGuestId) persistGuestId(serverGuestId);

        if (!response.ok) {
          if (response.status >= 500 && attempt < maxStreamRetries) {
            attempt += 1;
            try {
              await response.body?.cancel?.();
            } catch {
              /* ignore */
            }
            continue;
          }

          console.error("❌ [ECO API] SSE request falhou", {
            url: response.url,
            status: response.status,
            statusText: response.statusText,
            redirected: response.redirected,
          });

          let serverErr: string | undefined;
          let details: unknown;
          try {
            const responseContentType = response.headers.get("content-type") || "";
            if (responseContentType.includes("application/json")) {
              const errJson = await response.json();
              serverErr = errJson?.error || errJson?.message;
              details = errJson;
            } else {
              const errText = await response.text();
              serverErr = errText;
              details = errText;
            }
          } catch {}

          const baseMessage = `Erro HTTP ${response.status}: ${
            response.statusText || "Falha na requisição"
          }`;
          const friendly = mapStatusToFriendlyMessage(response.status, baseMessage);
          const message = serverErr?.trim() || friendly;
          const retryAfter = response.headers.get("retry-after") || undefined;
          const errorDetails = {
            statusText: response.statusText,
            body: details,
            ...(retryAfter ? { retryAfter } : {}),
          };
          throw new EcoApiError(message, { status: response.status, details: errorDetails });
        }

        const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
        if (!contentType.startsWith("text/event-stream")) {
          let diagnosticBody: string | undefined;
          try {
            diagnosticBody = await response.clone().text();
          } catch {
            diagnosticBody = undefined;
          }
          console.error("❌ [ECO API] Resposta inesperada para stream", {
            url: response.url,
            status: response.status,
            statusText: response.statusText,
            contentType,
            redirected: response.redirected,
            bodyPreview: diagnosticBody?.slice(0, 500),
          });
          throw new EcoApiError(
            "Não foi possível iniciar a transmissão da Eco. Tente novamente em instantes.",
            {
              status: response.status,
              details: {
                reason: "invalid_content_type",
                contentType,
                body: diagnosticBody,
              },
            }
          );
        }

        streamOpened = true;

        // 👇 Não dependa do Content-Type: se tem body, consome via stream
        if (response.body) {
          return await processEventStream(response, handlers, { signal: mergedSignal });
        }

        // Se por alguma razão não existe body, faz fallback para parser não-stream
        return await parseNonStreamResponse(response);
      } catch (error: any) {
        if (error instanceof EcoApiError) {
          throw error;
        }

        const abortError = error?.name === "AbortError" || error instanceof DOMException;
        const abortedByCaller = Boolean(
          abortError && (options.signal?.aborted || streamController?.signal.aborted)
        );
        if (abortedByCaller) {
          throw error;
        }

        const networkFailure =
          !streamOpened && (isNavigatorOffline() || error instanceof TypeError || isLikelyNetworkError(error));
        if (networkFailure && attempt < maxStreamRetries) {
          attempt += 1;
          continue;
        }

        throw error;
      } finally {
        cleanup();
        if (currentStreamController === streamController) {
          currentStreamController = null;
        }
      }
    }
  } catch (error: any) {
    if (error?.name === "AbortError" || options.signal?.aborted) {
      return { text: "", aborted: true, noTextReceived: true };
    }

    if (error instanceof EcoApiError) {
      throw error;
    }

    const rawMessage =
      typeof error?.message === "string" && error.message.trim().length > 0
        ? error.message
        : "Erro ao obter resposta da Eco.";

    const normalized = rawMessage.toLowerCase();
    const isNetworkIssue =
      isNavigatorOffline() ||
      isLikelyNetworkError(error) ||
      normalized.includes("network offline");

    const message = isNetworkIssue ? NETWORK_ERROR_MESSAGE : rawMessage;
    console.error("❌ [ECO API]", message, error);
    throw new EcoApiError(message, { details: error });
  }
};
