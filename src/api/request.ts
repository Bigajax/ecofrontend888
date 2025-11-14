import { v4 as uuidv4 } from "uuid";

import { buildIdentityHeaders, updateBiasHint } from "../lib/guestId";
import { computeBiasHintFromMessages } from "../utils/biasHint";
import { sanitizeEcoText } from "../utils/sanitizeEcoText";
import { AskEcoResponse, normalizeAskEcoResponse } from "./askEcoResponse";
import type { EcoStreamResult } from "./ecoStream";
import type {
  GuestResolution,
  Message,
  RequestPreparation,
} from "./types";

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

export const collectValidMessages = (userMessages: Message[]): Message[] =>
  userMessages
    .slice(-3)
    .filter(
      (m) =>
        m &&
        typeof m.role === "string" &&
        typeof m.content === "string" &&
        m.content.trim().length > 0,
    )
    .map((m) => ({ ...m, id: m.id || createMessageId() }));

export const prepareRequest = (
  mensagens: Message[],
  userName: string | undefined,
  userId: string | undefined,
  hour: number,
  tz: string,
  guest: GuestResolution,
  token: string | null,
  isStreaming: boolean,
  clientMessageId?: string,
): RequestPreparation => {
  const biasHint = computeBiasHintFromMessages(mensagens);
  updateBiasHint(biasHint ?? null);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...buildIdentityHeaders({ biasHint }),
  };
  if (guest.guestId) {
    headers["X-Eco-Guest-Id"] = guest.guestId;
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
  };
};

export const parseNonStreamPayload = (payload: unknown): EcoStreamResult => {
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
    (payload as any)?.primeiraMemoriaSignificativa ?? (payload as any)?.primeira,
  );

  return {
    text,
    metadata,
    done: payload,
    primeiraMemoriaSignificativa,
  };
};
