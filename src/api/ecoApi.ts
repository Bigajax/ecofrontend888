// src/api/ecoApi.ts
import { v4 as uuidv4 } from "uuid";

import { supabase } from "../lib/supabaseClient";
import { resolveApiUrl } from "../constants/api";
import { logHttpRequestDebug } from "../utils/httpDebug";

import { EcoApiError } from "./errors";
import {
  generateGuestId,
  normalizeGuestIdFormat,
  safeLocalStorageGet,
  safeLocalStorageSet,
} from "./guestIdentity";
import {
  EcoEventHandlers,
  EcoSseEvent,
  EcoStreamResult,
  parseNonStreamResponse,
  processEventStream,
} from "./ecoStream";

export { EcoApiError };
export type { EcoEventHandlers, EcoSseEvent, EcoStreamResult };

interface Message {
  id?: string;
  role: string;
  content: string;
}

const ASK_ENDPOINT = "/api/ask-eco";

const NETWORK_ERROR_MESSAGE =
  "Não consegui conectar ao servidor. Verifique sua internet ou tente novamente em instantes.";

const mapStatusToFriendlyMessage = (status: number, fallback: string) => {
  if (status === 401) {
    return "Faça login para continuar a conversa com a Eco.";
  }
  if (status === 429) {
    return "Muitas requisições. Aguarde alguns segundos antes de tentar novamente.";
  }
  if (status === 503) {
    return NETWORK_ERROR_MESSAGE;
  }
  if (status >= 500) {
    return "A Eco está indisponível no momento. Tente novamente em instantes.";
  }
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

  let storedGuestId = normalizeGuestIdFormat(safeLocalStorageGet("eco_guest_id"));
  if (!storedGuestId) {
    storedGuestId = generateGuestId();
    safeLocalStorageSet("eco_guest_id", storedGuestId);
  }

  const providedGuestId = normalizeGuestIdFormat(options?.guestId);
  const guestId = providedGuestId || storedGuestId;

  return { guestId, isGuest };
};

const buildRequestInit = (
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
  if (!guest.isGuest && userId) bodyPayload.usuario_id = userId;
  if (guest.isGuest) {
    bodyPayload.isGuest = true;
    bodyPayload.guestId = guest.guestId;
  }

  return {
    method: "POST",
    headers,
    credentials: guest.isGuest ? "omit" : "include",
    body: JSON.stringify(bodyPayload),
  } satisfies RequestInit;
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
    const token = sessionData?.session?.access_token ?? null;

    const guest = resolveGuestHeaders(options, token);

    const isStreaming = options.stream !== false;

    const requestInit = buildRequestInit(
      mensagensValidas,
      userName,
      userId,
      hour,
      tz,
      guest,
      token,
      isStreaming
    );

    logHttpRequestDebug({
      method: requestInit.method ?? "GET",
      url: resolveApiUrl(ASK_ENDPOINT),
      credentials: requestInit.credentials,
      headers: requestInit.headers,
    });

    const response = await fetch(resolveApiUrl(ASK_ENDPOINT), {
      ...requestInit,
      signal: options.signal,
    });

    const serverGuestId = normalizeGuestIdFormat(response.headers.get("x-guest-id"));
    if (serverGuestId) safeLocalStorageSet("eco_guest_id", serverGuestId);

    if (!response.ok) {
      let serverErr: string | undefined;
      let details: unknown;
      try {
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
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

    const contentType = response.headers.get("content-type") || "";
    const isEventStream = /text\/event-stream/i.test(contentType);

    if (!isStreaming || !response.body || !isEventStream) {
      return parseNonStreamResponse(response);
    }

    return await processEventStream(response, handlers, { signal: options.signal });
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
      normalized.includes("failed to fetch") ||
      normalized.includes("networkerror") ||
      normalized.includes("net::err") ||
      normalized.includes("err_connection");

    const message = isNetworkIssue ? NETWORK_ERROR_MESSAGE : rawMessage;
    console.error("❌ [ECO API]", message, error);
    throw new EcoApiError(message, { details: error });
  }
};
