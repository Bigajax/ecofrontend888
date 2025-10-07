// src/api/ecoApi.ts
import api from "./axios";
import { supabase } from "../lib/supabaseClient";
import { v4 as uuidv4 } from "uuid";

export class EcoApiError extends Error {
  status?: number;
  details?: unknown;

  constructor(message: string, options: { status?: number; details?: unknown } = {}) {
    super(message);
    this.name = "EcoApiError";
    this.status = options.status;
    this.details = options.details;
  }
}

interface Message {
  id?: string;
  role: string;
  content: string;
}

type AskEcoTextValue =
  | string
  | AskEcoTextValue[]
  | {
      content?: AskEcoTextValue;
      texto?: AskEcoTextValue;
      text?: AskEcoTextValue;
    };

interface AskEcoChoiceMessage {
  content?: AskEcoTextValue;
  texto?: AskEcoTextValue;
}

interface AskEcoChoice {
  message?: AskEcoChoiceMessage;
  delta?: AskEcoChoiceMessage;
  text?: AskEcoTextValue;
}

type AskEcoPayload =
  | AskEcoTextValue
  | {
      message?: AskEcoPayload;
      resposta?: AskEcoPayload;
      mensagem?: AskEcoPayload;
      data?: AskEcoPayload;
      choices?: AskEcoChoice[];
    };

type AskEcoResponse = AskEcoPayload;

export interface EcoStreamResult {
  text: string;
  metadata?: unknown;
  done?: unknown;
  primeiraMemoriaSignificativa?: boolean; // 👈 adicionada
}

export interface EcoSseEvent<TPayload = Record<string, any>> {
  type: string;
  payload: TPayload;
  raw: unknown;
  text?: string;
  metadata?: unknown;
  memory?: unknown;
  latencyMs?: number;
}

export interface EcoEventHandlers {
  onPromptReady?: (event: EcoSseEvent) => void;
  onFirstToken?: (event: EcoSseEvent) => void;
  onChunk?: (event: EcoSseEvent) => void;
  onDone?: (event: EcoSseEvent) => void;
  onMeta?: (event: EcoSseEvent) => void;
  onMetaPending?: (event: EcoSseEvent) => void;
  onMemorySaved?: (event: EcoSseEvent) => void;
  onLatency?: (event: EcoSseEvent) => void;
  onError?: (error: Error) => void;
}

const isDev = Boolean((import.meta as any)?.env?.DEV);
const SSE_TIMEOUT_MS = 60_000;

const TEXTUAL_KEYS = ["content", "texto", "text"] as const;
const NESTED_KEYS = ["message", "resposta", "mensagem", "data", "value", "delta"] as const;

const collectTexts = (value: unknown, visited = new WeakSet<object>()): string[] => {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap((item) => collectTexts(item, visited));

  if (value && typeof value === "object") {
    if (visited.has(value as object)) return [];
    visited.add(value as object);

    const obj = value as Record<string, unknown> & { choices?: unknown };
    const results: string[] = [];

    TEXTUAL_KEYS.forEach((key) => {
      if (key in obj) results.push(...collectTexts(obj[key], visited));
    });

    NESTED_KEYS.forEach((key) => {
      if (key in obj) results.push(...collectTexts(obj[key], visited));
    });

    if (Array.isArray(obj.choices)) {
      results.push(...obj.choices.flatMap((choice) => collectTexts(choice, visited)));
    }

    return results;
  }
  return [];
};

const parseSseEvent = (eventBlock: string): unknown | undefined => {
  const lines = eventBlock
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith(":"));

  if (lines.length === 0) return undefined;

  const payload = lines
    .map((line) => (line.startsWith("data:") ? line.slice(5).trimStart() : line))
    .join("\n");

  if (!payload) return undefined;

  try {
    return JSON.parse(payload);
  } catch (error) {
    if (isDev) console.warn("⚠️ [ECO API] Evento SSE inválido:", payload, error);
    return undefined;
  }
};

const normalizeAskEcoResponse = (payload: AskEcoResponse): string | undefined => {
  const texts = collectTexts(payload);
  const unique = Array.from(
    new Set(texts.map((text) => text.trim()).filter((text) => text.length > 0))
  );
  if (unique.length === 0) return undefined;
  return unique.join("\n\n");
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
  const mensagensValidas: Message[] = userMessages
    .slice(-3)
    .filter((m) => m && typeof m.role === "string" && typeof m.content === "string" && m.content.trim().length > 0)
    .map((m) => ({ ...m, id: m.id || uuidv4() }));

  if (mensagensValidas.length === 0) throw new Error("Nenhuma mensagem válida para enviar.");

  const hour = typeof clientHour === "number" ? clientHour : new Date().getHours();
  const tz = clientTz || Intl.DateTimeFormat().resolvedOptions().timeZone;

  const controller = new AbortController();
  const timeoutId: ReturnType<typeof setTimeout> = setTimeout(() => controller.abort(), SSE_TIMEOUT_MS);

  try {
    const baseUrl = api.defaults?.baseURL?.replace(/\/+$/, "");
    if (!baseUrl) throw new Error("Configuração de baseURL ausente para a Eco.");

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    const { guestId: guestIdOption, isGuest = false } = options;

    const response = await fetch(`${baseUrl}/ask-eco`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(isGuest && guestIdOption ? { "x-guest-id": guestIdOption } : {}),
      },
      credentials: "include",
      body: (() => {
        const payload: Record<string, unknown> = {
          mensagens: mensagensValidas,
          nome_usuario: userName,
          clientHour: hour,
          clientTz: tz,
        };
        if (userId) payload.usuario_id = userId;
        if (isGuest) {
          payload.isGuest = true;
          if (guestIdOption) payload.guestId = guestIdOption;
        }
        return JSON.stringify(payload);
      })(),
      signal: controller.signal,
    });

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

      const message = serverErr?.trim() || `Erro HTTP ${response.status}: ${response.statusText || "Falha na requisição"}`;
      throw new EcoApiError(message, { status: response.status, details });
    }

    if (!response.body) throw new Error("Resposta da Eco não suportou streaming SSE.");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let doneReceived = false;
    let streamError: Error | null = null;
    const aggregatedParts: string[] = [];
    let donePayload: any;
    let metadata: unknown;
    let primeiraMemoriaSignificativa = false; // 👈 nova flag

    const safeInvoke = (cb: ((event: EcoSseEvent) => void) | undefined, event: EcoSseEvent) => {
      if (!cb) return;
      try {
        cb(event);
      } catch (err) {
        console.error("❌ [ECO API] Falha ao executar callback de stream", err);
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

    const handleEvent = (eventData: unknown) => {
      if (!eventData || typeof eventData !== "object") return;

      const baseEvent = eventData as Record<string, any>;
      const topType = typeof baseEvent.type === "string" ? baseEvent.type : undefined;
      const eventPayloadRaw =
        baseEvent.payload && typeof baseEvent.payload === "object"
          ? (baseEvent.payload as Record<string, any>)
          : baseEvent;
      const payload = eventPayloadRaw as Record<string, any>;
      const payloadType = typeof payload.type === "string" ? payload.type : topType;
      const type = payloadType ?? topType;

      if (!type) {
        if (isDev) console.debug("ℹ️ [ECO API] Evento SSE sem tipo reconhecido:", eventData);
        return;
      }

      const baseEventInfo: EcoSseEvent = {
        type,
        payload,
        raw: eventData,
      };

      if (type === "error" || payload?.status === "error") {
        const errMessage =
          payload?.error?.message || payload?.error || payload?.message || "Erro na stream SSE da Eco.";
        streamError = new Error(String(errMessage));
        safeInvokeError(handlers.onError, streamError);
        return;
      }

      if (type === "prompt_ready") {
        safeInvoke(handlers.onPromptReady, baseEventInfo);
        return;
      }

      if (type === "latency") {
        const latencyValue = typeof payload?.value === "number" ? payload.value : undefined;
        const eventWithLatency: EcoSseEvent = {
          ...baseEventInfo,
          latencyMs: latencyValue,
        };
        safeInvoke(handlers.onLatency, eventWithLatency);
        return;
      }

      if (type === "first_token") {
        const source = payload.delta ?? payload.content ?? payload.message ?? payload;
        const texts = collectTexts(source);
        const chunkText = texts.join("");
        if (chunkText.length > 0) {
          aggregatedParts.push(chunkText);
        }
        const eventWithText: EcoSseEvent = {
          ...baseEventInfo,
          text: chunkText,
        };
        safeInvoke(handlers.onFirstToken, eventWithText);
        return;
      }

      if (type === "chunk") {
        const source = payload.delta ?? payload.content ?? payload.message ?? payload;
        const texts = collectTexts(source);
        const chunkText = texts.join("");
        if (chunkText.length > 0) {
          aggregatedParts.push(chunkText);
        }
        const eventWithText: EcoSseEvent = {
          ...baseEventInfo,
          text: chunkText,
        };
        safeInvoke(handlers.onChunk, eventWithText);
        return;
      }

      if (type === "meta" || type === "meta_pending" || type === "meta-pending") {
        const metaPayload = payload?.metadata ?? payload;
        const eventWithMeta: EcoSseEvent = {
          ...baseEventInfo,
          metadata: metaPayload,
        };
        metadata = metaPayload ?? metadata;
        if (type === "meta") safeInvoke(handlers.onMeta, eventWithMeta);
        else safeInvoke(handlers.onMetaPending, eventWithMeta);
        return;
      }

      if (type === "memory_saved") {
        const memoryPayload = payload?.memory ?? payload?.memoria ?? payload;
        const eventWithMemory: EcoSseEvent = {
          ...baseEventInfo,
          memory: memoryPayload,
        };
        if (payload?.primeiraMemoriaSignificativa || payload?.primeira) {
          primeiraMemoriaSignificativa = true;
        }
        safeInvoke(handlers.onMemorySaved, eventWithMemory);
        return;
      }

      if (type === "done") {
        doneReceived = true;
        donePayload = payload;
        const responseMetadata = payload?.response ?? payload?.metadata ?? payload;
        metadata = responseMetadata ?? metadata;

        if (payload?.primeiraMemoriaSignificativa || payload?.primeira) {
          primeiraMemoriaSignificativa = true;
        }

        const source = payload.delta ?? payload.content ?? payload.message ?? payload.response;
        const texts = collectTexts(source);
        const doneText = texts.join("");
        if (doneText.length > 0 && aggregatedParts.length === 0) {
          aggregatedParts.push(doneText);
        }

        const eventWithMeta: EcoSseEvent = {
          ...baseEventInfo,
          metadata: responseMetadata,
          text: doneText.length > 0 ? doneText : undefined,
        };
        safeInvoke(handlers.onDone, eventWithMeta);
        return;
      }

      if (isDev) console.debug("ℹ️ [ECO API] Evento SSE ignorado:", eventData);
    };

    const flushBuffer = (final = false) => {
      let idx = buffer.indexOf("\n\n");
      while (idx !== -1) {
        const segment = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        const parsed = parseSseEvent(segment);
        if (parsed !== undefined) handleEvent(parsed);
        idx = buffer.indexOf("\n\n");
      }
      if (final) {
        const remainder = buffer.trim();
        if (remainder.length > 0) {
          const parsed = parseSseEvent(buffer);
          if (parsed !== undefined) handleEvent(parsed);
        }
        buffer = "";
      }
    };

    while (!doneReceived && !streamError) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      flushBuffer();
    }
    if (!streamError) {
      buffer += decoder.decode();
      flushBuffer(true);
    }
    if (streamError) throw streamError;
    if (!doneReceived) throw new Error('Fluxo SSE encerrado sem evento "done".');

    let texto = aggregatedParts.join("").trim();
    if (!texto && donePayload) {
      const fallback = normalizeAskEcoResponse(donePayload as AskEcoResponse);
      if (fallback) texto = fallback;
    }
    if (!texto) throw new Error("Formato inválido na resposta da Eco.");

    return { text: texto, metadata, done: donePayload, primeiraMemoriaSignificativa };
  } catch (error: any) {
    let message: string;
    if (error?.name === "AbortError") message = "A requisição à Eco expirou. Tente novamente.";
    else if (typeof error?.message === "string" && error.message.trim().length > 0) message = error.message;
    else message = "Erro ao obter resposta da Eco.";
    console.error("❌ [ECO API]", message, error);
    throw new Error(message);
  } finally {
    clearTimeout(timeoutId);
  }
};
