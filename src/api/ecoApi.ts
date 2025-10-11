// src/api/ecoApi.ts
import { v4 as uuidv4 } from "uuid";

import api from "./axios";
import { supabase } from "../lib/supabaseClient";

import { EcoApiError } from "./errors";
import {
  generateGuestId,
  normalizeGuestIdFormat,
  safeLocalStorageGet,
  safeLocalStorageSet,
} from "./guestIdentity";
import { hasWindow } from "./environment";
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

const resolveBaseUrl = (): string => {
  const fromAxios = (api as any)?.defaults?.baseURL;
  const fromEnv = (import.meta as any)?.env?.VITE_API_URL;
  const fromWindow = hasWindow() ? window.location.origin : "";
  const raw = String(fromAxios || fromEnv || fromWindow || "").trim();

  if (!raw) throw new Error("Configuração de baseURL ausente para a Eco.");

  const noSlash = raw.replace(/\/+$/, "");
  const noApi = noSlash.replace(/\/api$/i, "");
  return noApi;
};

const ASK_ENDPOINT = "/api/ask-eco";

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
  token: string | null
) => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
  };

  if (!guest.isGuest && token) {
    headers.Authorization = `Bearer ${token}`;
  } else {
    headers["x-guest-mode"] = "1";
  }

  headers["X-Guest-Id"] = guest.guestId;

  const bodyPayload: Record<string, unknown> = {
    mensagens,
    nome_usuario: userName,
    clientHour: hour,
    clientTz: tz,
  };

  if (!guest.isGuest && userId) bodyPayload.usuario_id = userId;
  if (guest.isGuest) {
    bodyPayload.isGuest = true;
    bodyPayload.guestId = guest.guestId;
  }

  return {
    method: "POST",
    headers,
    mode: "cors" as const,
    credentials: "include" as const,
    body: JSON.stringify(bodyPayload),
  } satisfies RequestInit;
};

export const enviarMensagemParaEco = async (
  userMessages: Message[],
  userName?: string,
  userId?: string,
  clientHour?: number,
  clientTz?: string,
  handlers: EcoEventHandlers = {},
  options: { guestId?: string; isGuest?: boolean } = {}
): Promise<EcoStreamResult> => {
  const mensagensValidas = collectValidMessages(userMessages);
  if (mensagensValidas.length === 0) throw new Error("Nenhuma mensagem válida para enviar.");

  const hour = typeof clientHour === "number" ? clientHour : new Date().getHours();
  const tz = clientTz || Intl.DateTimeFormat().resolvedOptions().timeZone;

  try {
    const baseUrl = resolveBaseUrl();

    const { data: sessionData } =
      (await supabase.auth.getSession().catch(() => ({ data: { session: null } as any }))) || {
        data: { session: null },
      };
    const token = sessionData?.session?.access_token ?? null;

    const guest = resolveGuestHeaders(options, token);

    const requestInit = buildRequestInit(
      mensagensValidas,
      userName,
      userId,
      hour,
      tz,
      guest,
      token
    );

    const response = await fetch(`${baseUrl}${ASK_ENDPOINT}`, requestInit);

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

      const message =
        serverErr?.trim() ||
        `Erro HTTP ${response.status}: ${response.statusText || "Falha na requisição"}`;
      throw new EcoApiError(message, { status: response.status, details });
    }

    const contentType = response.headers.get("content-type") || "";
    const isEventStream = /text\/event-stream/i.test(contentType);

    if (!response.body || !isEventStream) {
      return parseNonStreamResponse(response);
    }

    return await processEventStream(response, handlers);
  } catch (error: any) {
    let message: string;
    if (error?.name === "AbortError")
      message = "A requisição à Eco expirou. Tente novamente.";
    else if (typeof error?.message === "string" && error.message.trim().length > 0)
      message = error.message;
    else message = "Erro ao obter resposta da Eco.";
    console.error("❌ [ECO API]", message, error);
    throw new Error(message);
  }
};
