// src/api/ecoApi.ts
import { supabase } from "../lib/supabaseClient";
import { resolveApiUrl } from "../constants/api";
import { logHttpRequestDebug } from "../utils/httpDebug";

import {
  parseNonStreamResponse,
  processEventStream,
} from "./ecoStream";
import type {
  EcoEventHandlers,
  EcoClientEvent,
  EcoSseEvent,
  EcoStreamResult,
} from "./ecoStream";

export type { EcoEventHandlers, EcoClientEvent, EcoSseEvent, EcoStreamResult };

export class EcoApiError extends Error {
  status?: number;
  details?: unknown;
  constructor(message: string, opts?: { status?: number; details?: unknown }) {
    super(message);
    this.name = "EcoApiError";
    this.status = opts?.status;
    this.details = opts?.details;
  }
}

type Message = { role: "user" | "assistant" | "system"; content: string; id?: string };

const ASK_ENDPOINT = "/api/ask-eco";
const NETWORK_ERROR_MESSAGE =
  "Não consegui conectar ao servidor. Verifique sua internet ou tente novamente em instantes.";

const mapStatusToFriendlyMessage = (status: number, fallback: string) => {
  if (status === 401) return "Faça login para continuar a conversa com a Eco.";
  if (status === 429) return "Muitas requisições. Aguarde alguns segundos antes de tentar novamente.";
  if (status === 503) return NETWORK_ERROR_MESSAGE;
  if (status >= 500) return "A Eco está indisponível no momento. Tente novamente em instantes.";
  return fallback;
};

const collectValidMessages = (userMessages: Message[]): Message[] =>
  userMessages
    .slice(-3)
    .filter((m) => m && typeof m.role === "string" && typeof m.content === "string" && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.trim(), id: m.id }));

const normalizeGuest = async (isGuest?: boolean, guestId?: string) => {
  const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } as any }));
  const token = data?.session?.access_token ?? null;
  const effectiveGuest = isGuest || !token;
  const hdrs: Record<string, string> = {};
  if (effectiveGuest && guestId) hdrs["X-Guest-Id"] = guestId;
  if (!effectiveGuest && token) hdrs["Authorization"] = `Bearer ${token}`;
  return { headers: hdrs, credentials: (effectiveGuest ? "omit" : "include") as RequestCredentials, token };
};

type SendOpts = {
  stream?: boolean;           // default true
  guestId?: string;
  isGuest?: boolean;
  signal?: AbortSignal;
  endpoint?: string;          // override se necessário
  credentials?: RequestCredentials; // se quiser forçar
  extraHeaders?: Record<string, string>;
};

export async function enviarMensagemParaEco(
  userMessages: Message[],
  userName?: string,
  userId?: string,
  clientHour?: number,
  clientTz?: string,
  handlers: EcoEventHandlers = {},
  {
    stream = true,
    guestId,
    isGuest,
    signal,
    endpoint = ASK_ENDPOINT,
    credentials,
    extraHeaders = {},
  }: SendOpts = {}
): Promise<EcoStreamResult> {
  const mensagens = collectValidMessages(userMessages);
  if (mensagens.length === 0) throw new Error("Nenhuma mensagem válida para enviar.");

  const hour = typeof clientHour === "number" ? clientHour : new Date().getHours();
  const tz = clientTz || Intl.DateTimeFormat().resolvedOptions().timeZone;

  // auth/guest headers
  const auth = await normalizeGuest(isGuest, guestId);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(auth.headers || {}),
    ...(extraHeaders || {}),
  };
  if (stream) headers["Accept"] = "text/event-stream";

  const payload: Record<string, unknown> = {
    mensagens,
    clientHour: hour,
    clientTz: tz,
    stream,
  };
  if (userName) payload.nome_usuario = userName;
  if (!isGuest && userId) payload.usuario_id = userId;
  if (isGuest) {
    payload.isGuest = true;
    if (guestId) payload.guestId = guestId;
  }

  const url = resolveApiUrl(endpoint);

  logHttpRequestDebug({
    method: "POST",
    url,
    credentials: credentials ?? auth.credentials,
    headers,
  });

  // --- JSON (não-stream) ----------------------------------------------------
  if (!stream) {
    const res = await fetch(url, {
      method: "POST",
      headers: { ...headers, Accept: "application/json" },
      body: JSON.stringify(payload),
      signal,
      credentials: credentials ?? auth.credentials,
      cache: "no-store",
      keepalive: false,
    });

    const result = await parseNonStreamResponse(res);

    if (!res.ok) {
      const friendly = mapStatusToFriendlyMessage(res.status, `Erro HTTP ${res.status}`);
      throw new EcoApiError(result.text || friendly, { status: res.status, details: result });
    }
    return result;
  }

  // --- SSE (stream) ---------------------------------------------------------
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal,
      credentials: credentials ?? auth.credentials,
      cache: "no-store",
      keepalive: false,
    });
  } catch (err: any) {
    const msg = (err?.message || "").toLowerCase();
    const isNet =
      msg.includes("failed to fetch") ||
      msg.includes("networkerror") ||
      msg.includes("net::err") ||
      msg.includes("err_connection");
    throw new EcoApiError(isNet ? NETWORK_ERROR_MESSAGE : err?.message || "Falha ao conectar.", {
      details: err,
    });
  }

  const ct = response.headers.get("content-type") || "";
  const isEventStream = /text\/event-stream/i.test(ct);

  if (!response.ok) {
    let serverErr: string | undefined;
    try {
      if (ct.includes("application/json")) {
        const j = await response.json();
        serverErr = j?.error || j?.message;
      } else {
        serverErr = await response.text();
      }
    } catch {}
    const friendly = mapStatusToFriendlyMessage(response.status, `Erro HTTP ${response.status}`);
    throw new EcoApiError(serverErr?.trim() || friendly, {
      status: response.status,
      details: { statusText: response.statusText },
    });
  }

  if (!response.body || !isEventStream) {
    // Servidor respondeu sem SSE → trata como JSON/text
    return parseNonStreamResponse(response);
  }

  // Mantém a conexão aberta até o done
  return processEventStream(response, handlers, { signal });
}
