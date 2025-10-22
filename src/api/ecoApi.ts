// src/api/ecoApi.ts
import { v4 as uuidv4 } from "uuid";

import { supabase } from "../lib/supabaseClient";
import { resolveApiUrl } from "../constants/api";
import { logHttpRequestDebug } from "../utils/httpDebug";
import { sanitizeEcoText } from "../utils/sanitizeEcoText";
import { buildIdentityHeaders, getGuestId, syncGuestId, updateBiasHint } from "../lib/guestId";
import { ApiFetchJsonNetworkError, ApiFetchJsonResult } from "../lib/apiFetch";
import { pingHealth } from "../utils/health";

import { EcoApiError, MissingUserIdError } from "./errors";
import { AskEcoResponse, normalizeAskEcoResponse } from "./askEcoResponse";
import { normalizeGuestIdFormat, readPersistedGuestId } from "./guestIdentity";
import { computeBiasHintFromMessages } from "../utils/biasHint";

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

const isNetworkErrorResult = (
  result: ApiFetchJsonResult<unknown>,
): result is ApiFetchJsonNetworkError => {
  return !result.ok && (result as ApiFetchJsonNetworkError).status === 0;
};

const wasAbortedByCaller = (
  result: ApiFetchJsonNetworkError,
  signal?: AbortSignal,
) => {
  if (!signal || !signal.aborted) {
    return false;
  }
  const error = result.error;
  return error instanceof DOMException && error.name === "AbortError";
};

const shouldRetryAfterNetworkFailure = async (
  result: ApiFetchJsonNetworkError,
  signal?: AbortSignal,
) => {
  if (wasAbortedByCaller(result, signal)) {
    return false;
  }

  try {
    const health = await pingHealth();
    return health.responseOk;
  } catch {
    return false;
  }
};

const syncGuestFromHeaders = (headers?: Headers) => {
  if (!headers) return;
  const candidate = headers.get("x-eco-guest-id") ?? headers.get("x-guest-id");
  if (candidate) {
    syncGuestId(candidate);
  }
};

const extractClientErrorMessage = (data: unknown) => {
  if (typeof data === "string") {
    const trimmed = data.trim();
    return trimmed || undefined;
  }

  if (data && typeof data === "object") {
    const candidate = (data as { message?: unknown }).message;
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return undefined;
};

export async function askEco(
  payload: any,
  opts: { stream?: boolean; headers?: Record<string, string>; signal?: AbortSignal } = {}
) {
  if (opts.signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  const baseHeaders: Record<string, string> = { ...(opts.headers ?? {}) };
  const identityHeaders = buildIdentityHeaders();
  for (const [key, value] of Object.entries(identityHeaders)) {
    baseHeaders[key] = value;
  }

  const headers = new Headers(baseHeaders);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (opts.stream) {
    headers.set("Accept", headers.get("Accept") ?? "text/event-stream");
  } else {
    headers.set("Accept", headers.get("Accept") ?? "application/json");
  }

  const serializedHeaders = Object.fromEntries(headers.entries());
  const body = JSON.stringify(payload ?? {});

  const targetPath = opts.stream ? ASK_ENDPOINT : `${ASK_ENDPOINT}?nostream=1`;
  const url = resolveApiUrl(targetPath);

  const executeRequest = async (): Promise<ApiFetchJsonResult<any>> => {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: serializedHeaders,
        body,
        signal: opts.signal,
      });

      const headers = new Headers(response.headers);
      let parsedBody: any = undefined;

      try {
        const raw = await response.text();
        if (raw) {
          try {
            parsedBody = JSON.parse(raw);
          } catch {
            parsedBody = raw;
          }
        }
      } catch {
        parsedBody = undefined;
      }

      if (response.ok) {
        return { ok: true, status: response.status, data: parsedBody, headers };
      }

      return { ok: false, status: response.status, data: parsedBody, headers };
    } catch (error) {
      return {
        ok: false,
        status: 0,
        code: "NETWORK",
        message: NETWORK_ERROR_MESSAGE,
        error,
      } satisfies ApiFetchJsonNetworkError;
    }
  };

  let result = await executeRequest();

  if (isNetworkErrorResult(result)) {
    if (wasAbortedByCaller(result, opts.signal)) {
      throw result.error ?? new DOMException("Aborted", "AbortError");
    }

    const canRetry = await shouldRetryAfterNetworkFailure(result, opts.signal);
    if (canRetry) {
      result = await executeRequest();
    }
  }

  if (result.ok) {
    syncGuestFromHeaders(result.headers);
    const data = result.data;
    if (data && typeof data === "object") {
      const payload = data as { ok?: boolean; data?: unknown; error?: unknown } & Record<
        string,
        unknown
      >;
      if (payload.ok === false) {
        const explicitError =
          typeof payload.error === "string" && payload.error.trim()
            ? payload.error.trim()
            : undefined;
        const message =
          explicitError ?? extractClientErrorMessage(payload) ?? CLIENT_ERROR_FALLBACK_MESSAGE;
        throw new EcoApiError(message, { status: result.status, details: payload });
      }
      if (payload.ok === true && "data" in payload) {
        return payload.data;
      }
    }
    return data;
  }

  if (isNetworkErrorResult(result)) {
    throw new EcoApiError(NETWORK_ERROR_MESSAGE, {
      code: result.code,
      details: result.error,
    });
  }

  const status = result.status;
  const data = result.data;

  if (status >= 500) {
    throw new EcoApiError(SERVER_INSTABILITY_MESSAGE, { status, details: data });
  }

  if (status >= 400) {
    const message = extractClientErrorMessage(data) ?? CLIENT_ERROR_FALLBACK_MESSAGE;
    throw new EcoApiError(message, { status, details: data });
  }

  throw new EcoApiError("Erro ao se comunicar com a Eco.", { status, details: data });
}

interface Message {
  id?: string;
  role: string;
  content: string;
}

const ASK_ENDPOINT = "/api/ask-eco";

const NETWORK_ERROR_MESSAGE =
  "Não consegui conectar ao servidor. Verifique sua internet ou tente novamente em instantes.";
const SERVER_INSTABILITY_MESSAGE = "O servidor está instável agora. Tente novamente em breve.";
const CLIENT_ERROR_FALLBACK_MESSAGE = "Solicitação inválida.";

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
  const rawGuestId =
    typeof options?.guestId === "string" && options.guestId.trim().length > 0
      ? options.guestId.trim()
      : "";
  const storedGuestId = readPersistedGuestId();

  const guestId = providedGuestId || rawGuestId || storedGuestId || getGuestId();

  syncGuestId(guestId);

  return { guestId, isGuest };
};

type RequestPreparation = {
  headers: Record<string, string>;
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
  isStreaming: boolean,
  clientMessageId?: string
) => {
  const biasHint = computeBiasHintFromMessages(mensagens);
  updateBiasHint(biasHint ?? null);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...buildIdentityHeaders({ biasHint }),
  };

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

  const ultimaMensagem = mensagens.length > 0 ? mensagens[mensagens.length - 1] : undefined;
  const promptTexto = (() => {
    if (!ultimaMensagem) return "";
    const { content, text } = ultimaMensagem as { content?: unknown; text?: unknown };
    if (typeof content === "string" && content.trim().length > 0) {
      return content;
    }
    if (typeof text === "string" && text.trim().length > 0) {
      return text;
    }
    return "";
  })();

  bodyPayload.texto = promptTexto.trim();

  if (typeof userName === "string" && userName.trim().length > 0) {
    bodyPayload.nome_usuario = userName;
  }
  const resolvedUserId = userId && userId.trim().length > 0 ? userId : guest.guestId;
  bodyPayload.usuario_id = resolvedUserId;

  const existingContext =
    bodyPayload.contexto && typeof bodyPayload.contexto === "object"
      ? (bodyPayload.contexto as Record<string, unknown>)
      : {};
  bodyPayload.contexto = {
    ...existingContext,
    origem: "web",
    ts: Date.now(),
  };

  if (clientMessageId && clientMessageId.trim().length > 0) {
    bodyPayload.client_message_id = clientMessageId;
    bodyPayload.contexto = {
      ...bodyPayload.contexto,
      client_message_id: clientMessageId,
    };
  }

  if (guest.isGuest) {
    bodyPayload.isGuest = true;
    bodyPayload.guestId = guest.guestId;
  }

  return {
    headers,
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
      const sanitized = sanitizeEcoText(trimmed).trim();
      return {
        text: sanitized,
        done: sanitized ? { response: sanitized } : undefined,
      };
    }
  }

  if (!payload || typeof payload !== "object") {
    return { text: "" };
  }

  const normalizedText = normalizeAskEcoResponse(payload as AskEcoResponse) ?? "";
  const sanitizedText = sanitizeEcoText(normalizedText);
  const text = sanitizedText.trim();
  const metadata = (payload as any)?.metadata ?? (payload as any)?.response ?? undefined;
  const primeiraMemoriaSignificativa = Boolean(
    (payload as any)?.primeiraMemoriaSignificativa ?? (payload as any)?.primeira
  );

  return {
    text,
    metadata,
    done: payload,
    primeiraMemoriaSignificativa,
  };
};

type EnviarMensagemOptions = {
  guestId?: string;
  isGuest?: boolean;
  signal?: AbortSignal;
  stream?: boolean;
  clientMessageId?: string;
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
      isStreaming,
      options.clientMessageId
    );

    logHttpRequestDebug({
      method: "POST",
      url: resolveApiUrl(ASK_ENDPOINT),
      headers,
    });

    // 🔹 Caminho JSON (sem stream)
    if (!isStreaming) {
      const data = await askEco(payload, { stream: false, headers });
      return parseNonStreamPayload(data);
    }

    // 🔹 Caminho de STREAM (SSE) — força consumo do body sempre que existir
    const streamUrl = resolveApiUrl(ASK_ENDPOINT);
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
      const requestInit: RequestInit & { duplex?: "half" } = {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        cache: "no-store",
        redirect: "follow",
        keepalive: false,
        signal: mergedSignal,
      };

        const maybeStreamBody = requestInit.body as unknown;
        if (
          typeof ReadableStream !== "undefined" &&
          maybeStreamBody &&
          (maybeStreamBody instanceof ReadableStream ||
            typeof (maybeStreamBody as { getReader?: () => unknown }).getReader === "function")
        ) {
          requestInit.duplex = "half";
        }

        const response = await fetch(streamUrl, requestInit);
        const serverGuestId =
          normalizeGuestIdFormat(
            response.headers.get("x-eco-guest-id") ?? response.headers.get("x-guest-id"),
          ) || null;
        if (serverGuestId) syncGuestId(serverGuestId);

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
