// src/api/ecoApi.ts
import { supabase } from "../lib/supabaseClient";
import { logHttpRequestDebug } from "../utils/httpDebug";
import { buildIdentityHeaders, syncGuestId } from "../lib/guestId";
import { ApiFetchJsonNetworkError, ApiFetchJsonResult } from "../lib/apiFetch";
import { pingHealth } from "../utils/health";

import { EcoApiError, MissingUserIdError } from "./errors";
import type { EcoEventHandlers, EcoClientEvent, EcoSseEvent, EcoStreamResult } from "./ecoStream";
import { resolveGuestHeaders, resolveUserId } from "./auth";
import { collectValidMessages, parseNonStreamPayload, prepareRequest } from "./request";
import { executeStreamRequest, isLikelyNetworkError, isNavigatorOffline } from "./streaming";
import type { EnviarMensagemOptions, Message } from "./types";
import { ASK_ECO_ENDPOINT_PATH, buildAskEcoUrl } from "./askEcoUrl";

export { EcoApiError };
export type { EcoClientEvent, EcoEventHandlers, EcoSseEvent, EcoStreamResult };

interface AskEcoOptions {
  stream?: boolean;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  identity?: { guestId?: string | null; sessionId?: string | null };
}

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

export async function askEco(payload: any, opts: AskEcoOptions = {}) {
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
  const resolveHeaderValue = (name: string): string | undefined => {
    const target = name.toLowerCase();
    for (const [key, value] of Object.entries(serializedHeaders)) {
      if (key.toLowerCase() === target) {
        return value;
      }
    }
    return undefined;
  };

  const guestIdentity = opts.identity?.guestId ?? resolveHeaderValue("x-eco-guest-id");
  const sessionIdentity = opts.identity?.sessionId ?? resolveHeaderValue("x-eco-session-id");

  const body = JSON.stringify(payload ?? {});

  const targetPath = opts.stream ? ASK_ENDPOINT : `${ASK_ENDPOINT}?nostream=1`;
  const baseUrl = buildAskEcoUrl(targetPath);
  const url = (() => {
    if (opts.stream !== false) {
      return baseUrl;
    }
    const applyIdentity = (input: URL) => {
      if (guestIdentity) input.searchParams.set("guest", guestIdentity);
      if (sessionIdentity) input.searchParams.set("session", sessionIdentity);
      return input;
    };
    try {
      return applyIdentity(new URL(baseUrl)).toString();
    } catch {
      try {
        const fallback = applyIdentity(new URL(baseUrl, "https://local.eco"));
        if (fallback.origin === "https://local.eco") {
          return `${fallback.pathname}${fallback.search}`;
        }
        return fallback.toString();
      } catch {
        const segments: string[] = [];
        if (guestIdentity) segments.push(`guest=${encodeURIComponent(guestIdentity)}`);
        if (sessionIdentity) segments.push(`session=${encodeURIComponent(sessionIdentity)}`);
        if (!segments.length) return baseUrl;
        const hasQuery = baseUrl.includes("?");
        const joiner = hasQuery ? "&" : "?";
        return `${baseUrl}${joiner}${segments.join("&")}`;
      }
    }
  })();

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
      const payload = data as { ok?: boolean; data?: unknown; error?: unknown } & Record<string, unknown>;
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

const ASK_ENDPOINT = ASK_ECO_ENDPOINT_PATH;

const NETWORK_ERROR_MESSAGE =
  "Não consegui conectar ao servidor. Verifique sua internet ou tente novamente em instantes.";
const SERVER_INSTABILITY_MESSAGE = "O servidor está instável agora. Tente novamente em breve.";
const CLIENT_ERROR_FALLBACK_MESSAGE = "Solicitação inválida.";

export const enviarMensagemParaEco = async (
  userMessages: Message[],
  userName?: string,
  userId?: string,
  clientHour?: number,
  clientTz?: string,
  handlers: EcoEventHandlers = {},
  options: EnviarMensagemOptions = {},
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
    const normalizedUserId = resolveUserId(userId, sessionUser?.id, guest);

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
      options.clientMessageId,
    );

    logHttpRequestDebug({
      method: "POST",
      url: buildAskEcoUrl(ASK_ENDPOINT),
      headers,
    });

    if (!isStreaming) {
      const sessionHeader = headers["X-Eco-Session-Id"] ?? headers["x-eco-session-id"];
      const data = await askEco(payload, {
        stream: false,
        headers,
        identity: { guestId: guest.guestId, sessionId: sessionHeader },
      });
      return parseNonStreamPayload(data);
    }

    return await executeStreamRequest({
      headers,
      payload,
      streamUrl: buildAskEcoUrl(ASK_ENDPOINT),
      handlers,
      signal: options.signal,
      networkErrorMessage: NETWORK_ERROR_MESSAGE,
    });
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
