import type { Message as ChatMessageType } from "@/contexts/ChatContext";

import type { StreamRunStats } from "./types";

export const mapHistoryMessage = (message: ChatMessageType) => {
  if (!message) return { id: undefined, role: "assistant", content: "" };
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
      message.client_message_id ?? (message as any)?.clientMessageId ?? message.id ?? undefined,
  };
};

export const extractFinishReasonFromMeta = (meta: unknown): string | undefined => {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return undefined;
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
  return undefined;
};

export const applyMetaToStreamStats = (
  streamStats: StreamRunStats,
  meta: Record<string, unknown> | undefined,
) => {
  if (!meta) return;
  streamStats.lastMeta = meta;
  const finishReason = extractFinishReasonFromMeta(meta);
  streamStats.finishReasonFromMeta = finishReason;
};

interface BuildEcoRequestBodyParams {
  history: ChatMessageType[];
  clientMessageId: string;
  systemHint?: string;
  userId?: string;
  userName?: string;
  guestId?: string;
  isGuest: boolean;
}

export const buildEcoRequestBody = ({
  history,
  clientMessageId,
  systemHint,
  userId,
  userName,
  guestId,
  isGuest,
}: BuildEcoRequestBodyParams): Record<string, unknown> => {
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

  if (typeof clientMessageId === "string" && clientMessageId.trim().length > 0) {
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

  return payload;
};

export type { BuildEcoRequestBodyParams };
