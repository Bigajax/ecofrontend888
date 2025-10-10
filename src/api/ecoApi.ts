// src/api/ecoApi.ts
import api from "./axios";
import { supabase } from "../lib/supabaseClient";
import { v4 as uuidv4 } from "uuid";

export class EcoApiError extends Error {
  status?: number;
  details?: unknown;

  constructor(
    message: string,
    options: { status?: number; details?: unknown } = {}
  ) {
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
      output_text?: AskEcoTextValue;
      outputText?: AskEcoTextValue;
      output?: AskEcoTextValue;
      answer?: AskEcoTextValue;
      resposta?: AskEcoTextValue;
      respostaFinal?: AskEcoTextValue;
      reply?: AskEcoTextValue;
      fala?: AskEcoTextValue;
      speech?: AskEcoTextValue;
    };

interface AskEcoChoiceMessage {
  content?: AskEcoTextValue;
  texto?: AskEcoTextValue;
  text?: AskEcoTextValue;
  output_text?: AskEcoTextValue;
  outputText?: AskEcoTextValue;
  output?: AskEcoTextValue;
  answer?: AskEcoTextValue;
  reply?: AskEcoTextValue;
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
      response?: AskEcoPayload;
      result?: AskEcoPayload;
      payload?: AskEcoPayload;
      choices?: AskEcoChoice[];
    };

type AskEcoResponse = AskEcoPayload;

export interface EcoStreamResult {
  text: string;
  metadata?: unknown;
  done?: unknown;
  primeiraMemoriaSignificativa?: boolean;
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
const SSE_INACTIVITY_TIMEOUT_MS = 120_000;
const SSE_GUEST_INACTIVITY_TIMEOUT_MS = 300_000;

const hasWindow = () => typeof window !== "undefined";

// normaliza formatos antigos: "guest:uuid" | "guest-uuid" → "guest_uuid"
const normalizeGuestIdFormat = (id: string | null | undefined) =>
  (id ?? "").replace(/^guest[:\-]/i, "guest_");

const safeLocalStorageGet = (key: string) => {
  if (!hasWindow()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    if (isDev) console.warn(`⚠️ [ECO API] Falha ao ler localStorage (${key})`, error);
    return null;
  }
};

const safeLocalStorageSet = (key: string, value: string) => {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    if (isDev) console.warn(`⚠️ [ECO API] Falha ao salvar localStorage (${key})`, error);
  }
};

const generateGuestId = () => {
  if (hasWindow()) {
    const { crypto } = window;
    if (crypto && typeof crypto.randomUUID === "function") {
      try {
        return `guest_${crypto.randomUUID()}`;
      } catch (error) {
        if (isDev) console.warn("⚠️ [ECO API] Falha ao gerar guestId com crypto.randomUUID", error);
      }
    }
  }
  return `guest_${uuidv4()}`;
};

const TEXTUAL_KEYS = [
  "content",
  "texto",
  "text",
  "output_text",
  "outputText",
  "output",
  "answer",
  "resposta",
  "respostaFinal",
  "reply",
  "fala",
  "speech",

] as const;
const NESTED_KEYS = [
  "message",
  "resposta",
  "mensagem",
  "data",
  "value",
  "delta",
  "response",
  "result",
  "payload",
] as const;

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

/**
 * Parser SSE robusto:
 * - Suporta "event: <nome>" + "data: ..."
 * - Suporta "data: [DONE]" (não-JSON)
 * - Suporta payloads JSON com/sem campo "type"
 * - Retorna um objeto com { type?, payload?, rawData? }
 */
const parseSseEvent = (
  eventBlock: string
): { type?: string; payload?: any; rawData?: string } | undefined => {
  const lines = eventBlock
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith(":"));

  if (lines.length === 0) return undefined;

  let eventName: string | undefined;
  const dataParts: string[] = [];

  for (const line of lines) {
    if (line.startsWith("event:")) {
      eventName = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      dataParts.push(line.slice(5).trimStart());
    } else {
      // linha sem prefixo, trata como parte de dados
      dataParts.push(line);
    }
  }

  const dataStr = dataParts.join("\n").trim();
  if (!dataStr) return { type: eventName, payload: undefined };

  if (dataStr === "[DONE]") {
    return { type: eventName ?? "done", payload: { done: true }, rawData: dataStr };
  }

  try {
    const parsed = JSON.parse(dataStr);
    return { type: eventName, payload: parsed, rawData: dataStr };
  } catch {
    // não é JSON: devolve como texto cru
    return { type: eventName, payload: { text: dataStr }, rawData: dataStr };
  }
};

const normalizeSseNewlines = (value: string): string => value.replace(/\r\n?/g, "\n");

const normalizeAskEcoResponse = (payload: AskEcoResponse): string | undefined => {
  const texts = collectTexts(payload);
  const unique = Array.from(
    new Set(texts.map((text) => text.trim()).filter((text) => text.length > 0))
  );
  if (unique.length === 0) return undefined;
  return unique.join("\n\n");
};

// -------- baseURL resolvida e normalizada --------
// pega axios.defaults.baseURL -> VITE_API_URL -> window.origin
// remove / no final e remove um /api acidental; o endpoint já adiciona /api
const resolveBaseUrl = (): string => {
  const fromAxios = (api as any)?.defaults?.baseURL;
  const fromEnv = (import.meta as any)?.env?.VITE_API_URL;
  const fromWindow = hasWindow() ? window.location.origin : "";
  const raw = String(fromAxios || fromEnv || fromWindow || "").trim();

  if (!raw) throw new Error("Configuração de baseURL ausente para a Eco.");

  const noSlash = raw.replace(/\/+$/, "");
  const noApi = noSlash.replace(/\/api$/i, "");
  return noApi; // raiz do backend (ex.: https://ecobackend888.onrender.com)
};

const ASK_ENDPOINT = "/api/ask-eco";

// -------------------------------------------------

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
    .filter(
      (m) =>
        m &&
        typeof m.role === "string" &&
        typeof m.content === "string" &&
        m.content.trim().length > 0
    )
    .map((m) => ({ ...m, id: m.id || uuidv4() }));

  if (mensagensValidas.length === 0)
    throw new Error("Nenhuma mensagem válida para enviar.");

  const hour = typeof clientHour === "number" ? clientHour : new Date().getHours();
  const tz = clientTz || Intl.DateTimeFormat().resolvedOptions().timeZone;

  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let inactivityTimeoutMs = SSE_INACTIVITY_TIMEOUT_MS;
  const resetTimeout = () => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => controller.abort(), inactivityTimeoutMs);
  };

  try {
    const baseUrl = resolveBaseUrl();

    // --- sessão do supabase (pode não existir) ---
    const { data: sessionData } =
      (await supabase.auth.getSession().catch(() => ({ data: { session: null } as any }))) || {
        data: { session: null },
      };
    const token = sessionData?.session?.access_token ?? null;

    // --- guest id persistente (fallback automático quando não há token) ---
    const persistedGuestId =
      normalizeGuestIdFormat(safeLocalStorageGet("eco_guest_id")) ||
      (() => {
        const id = generateGuestId();
        safeLocalStorageSet("eco_guest_id", id);
        return id;
      })();

    const userWantsGuest = options?.isGuest === true;
    const isGuest = userWantsGuest || !token;
    inactivityTimeoutMs = isGuest
      ? SSE_GUEST_INACTIVITY_TIMEOUT_MS
      : SSE_INACTIVITY_TIMEOUT_MS;
    resetTimeout();

    const guestId = normalizeGuestIdFormat(options?.guestId || persistedGuestId);

    // --- headers ---
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    };
    if (!isGuest && token) {
      headers.Authorization = `Bearer ${token}`;
    } else {
      headers["x-guest-mode"] = "1";
      headers["x-guest-id"] = guestId;
    }

    // --- body ---
    const bodyPayload: Record<string, unknown> = {
      mensagens: mensagensValidas,
      nome_usuario: userName,
      clientHour: hour,
      clientTz: tz,
    };
    if (!isGuest && userId) bodyPayload.usuario_id = userId;
    if (isGuest) {
      bodyPayload.isGuest = true;
      bodyPayload.guestId = guestId;
    }

    const response = await fetch(`${baseUrl}${ASK_ENDPOINT}`, {
      method: "POST",
      headers,
      mode: "cors",
      // você usa Bearer token; não precisa enviar cookies
      credentials: "omit",
      body: JSON.stringify(bodyPayload),
      signal: controller.signal,
    });

    // capture e persista o guest-id que o backend pode ter gerado/normalizado
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

    if (!response.body)
      throw new Error("Resposta da Eco não suportou streaming SSE.");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let doneReceived = false;
    let streamError: Error | null = null;
    const aggregatedParts: string[] = [];
    let donePayload: any;
    let metadata: unknown;
    let primeiraMemoriaSignificativa = false;
    let gotAnyToken = false;
    let lastNonEmptyText: string | undefined;

    const rememberText = (text: string | undefined) => {
      if (typeof text !== "string") return;
      const trimmed = text.trim();
      if (trimmed.length === 0) return;
      lastNonEmptyText = trimmed;
      gotAnyToken = true;
    };

    const pushAggregatedPart = (text: string | undefined) => {
      if (typeof text !== "string") return;
      aggregatedParts.push(text);
      rememberText(text);
    };

    const safeInvoke = (
      cb: ((event: EcoSseEvent) => void) | undefined,
      event: EcoSseEvent
    ) => {
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

      // Nosso parser pode ter { type?, payload?, rawData? }
      const parsed = eventData as { type?: string; payload?: any; rawData?: string } & Record<string, any>;

      const hintedType = typeof parsed.type === "string" ? parsed.type : undefined;
      const payload =
        parsed.payload && typeof parsed.payload === "object"
          ? (parsed.payload as Record<string, any>)
          : (parsed as Record<string, any>);

      const payloadType = typeof payload.type === "string" ? payload.type : undefined;
      let type = payloadType ?? hintedType;

      // Reconhecimento de "done" em formatos não-JSON
      const rawData = parsed.rawData;
      const looksLikeDone =
        (typeof rawData === "string" && rawData === "[DONE]") ||
        (payload && (payload.done === true || payload.DONE === true));

      if (!type && looksLikeDone) type = "done";

      // Fallback: se só veio texto cru, trate como chunk
      if (!type && typeof payload?.text === "string") type = "chunk";

      if (!type) {
        if (isDev)
          console.debug("ℹ️ [ECO API] Evento SSE sem tipo reconhecido:", eventData);
        return;
      }

      const baseEventInfo: EcoSseEvent = {
        type,
        payload,
        raw: eventData,
      };

      if (type === "error" || (payload as any)?.status === "error") {
        const errMessage =
          (payload as any)?.error?.message ||
          (payload as any)?.error ||
          (payload as any)?.message ||
          "Erro na stream SSE da Eco.";
        streamError = new Error(String(errMessage));
        safeInvokeError(handlers.onError, streamError);
        return;
      }

      if (type === "prompt_ready") {
        safeInvoke(handlers.onPromptReady, baseEventInfo);
        return;
      }

      if (type === "latency") {
        const latencyValue =
          typeof (payload as any)?.value === "number"
            ? (payload as any).value
            : undefined;
        const eventWithLatency: EcoSseEvent = {
          ...baseEventInfo,
          latencyMs: latencyValue,
        };
        safeInvoke(handlers.onLatency, eventWithLatency);
        return;
      }

      const fallbackText = normalizeAskEcoResponse(payload as AskEcoResponse);

      if (type === "first_token") {
        const source =
          (payload as any).delta ??
          (payload as any).content ??
          (payload as any).message ??
          payload;
        const texts = collectTexts(source);
        const chunkText = texts.join("");
        if (chunkText.length > 0) pushAggregatedPart(chunkText);
        else if (!chunkText && fallbackText) pushAggregatedPart(fallbackText);
        const eventWithText: EcoSseEvent = {
          ...baseEventInfo,
          text: chunkText.length > 0 ? chunkText : fallbackText,
        };
        safeInvoke(handlers.onFirstToken, eventWithText);
        return;
      }

      if (type === "chunk") {
        const source =
          (payload as any).delta ??
          (payload as any).content ??
          (payload as any).message ??
          payload;
        const texts = collectTexts(source);
        const chunkText = texts.join("");
        if (chunkText.length > 0) pushAggregatedPart(chunkText);
        else if (!chunkText && fallbackText) pushAggregatedPart(fallbackText);
        const eventWithText: EcoSseEvent = {
          ...baseEventInfo,
          text: chunkText.length > 0 ? chunkText : fallbackText,
        };
        safeInvoke(handlers.onChunk, eventWithText);
        return;
      }

      if (type === "meta" || type === "meta_pending" || type === "meta-pending") {
        const metaPayload = (payload as any)?.metadata ?? payload;
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
        const memoryPayload = (payload as any)?.memory ?? (payload as any)?.memoria ?? payload;
        const eventWithMemory: EcoSseEvent = {
          ...baseEventInfo,
          memory: memoryPayload,
        };
        if ((payload as any)?.primeiraMemoriaSignificativa || (payload as any)?.primeira) {
          primeiraMemoriaSignificativa = true;
        }
        safeInvoke(handlers.onMemorySaved, eventWithMemory);
        return;
      }

      if (type === "done") {
        doneReceived = true;
        donePayload = payload;
        const responseMetadata =
          (payload as any)?.response ?? (payload as any)?.metadata ?? payload;
        metadata = responseMetadata ?? metadata;

        if ((payload as any)?.primeiraMemoriaSignificativa || (payload as any)?.primeira) {
          primeiraMemoriaSignificativa = true;
        }

        const source =
          (payload as any).delta ??
          (payload as any).content ??
          (payload as any).message ??
          (payload as any).response;
        const texts = collectTexts(source);
        const doneText = texts.join("");
        if (doneText.length > 0 && aggregatedParts.length === 0) {
          pushAggregatedPart(doneText);
        } else if ((!doneText || doneText.length === 0) && fallbackText) {
          pushAggregatedPart(fallbackText);
        }

        const eventWithMeta: EcoSseEvent = {
          ...baseEventInfo,
          metadata: responseMetadata,
          text: doneText.length > 0 ? doneText : fallbackText,
        };
        safeInvoke(handlers.onDone, eventWithMeta);
        return;
      }

      if (fallbackText) {
        pushAggregatedPart(fallbackText);
        const eventWithText: EcoSseEvent = { ...baseEventInfo, text: fallbackText };
        safeInvoke(handlers.onChunk, eventWithText);
        return;
      }

      if (isDev) console.debug("ℹ️ [ECO API] Evento SSE ignorado:", eventData);
    };

    const flushBuffer = (final = false) => {
      buffer = normalizeSseNewlines(buffer);
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
          const parsed = parseSseEvent(remainder);
          if (parsed !== undefined) handleEvent(parsed);
        }
        buffer = "";
      }
    };

    while (!doneReceived && !streamError) {
      const { value, done } = await reader.read();
      if (done) break;
      resetTimeout();
      buffer += decoder.decode(value, { stream: true });
      flushBuffer();
    }
    if (!streamError) {
      buffer += decoder.decode();
      flushBuffer(true);
    }
    if (streamError) throw streamError;

    // tolera término sem "done" se já recebemos conteúdo
    if (!doneReceived && !gotAnyToken) {
      throw new Error('Fluxo SSE encerrado sem evento "done".');
    }

    let texto = aggregatedParts.join("");
    if (!texto.trim() && lastNonEmptyText) {
      texto = lastNonEmptyText;
    }
    texto = texto.trim();

    if (!texto && donePayload) {
      const fallback = normalizeAskEcoResponse(donePayload as AskEcoResponse);
      if (fallback) texto = fallback;
    }
    if (!texto) throw new Error("Formato inválido na resposta da Eco.");

    return {
      text: texto,
      metadata,
      done: donePayload,
      primeiraMemoriaSignificativa,
    };
  } catch (error: any) {
    let message: string;
    if (error?.name === "AbortError")
      message = "A requisição à Eco expirou. Tente novamente.";
    else if (typeof error?.message === "string" && error.message.trim().length > 0)
      message = error.message;
    else message = "Erro ao obter resposta da Eco.";
    console.error("❌ [ECO API]", message, error);
    throw new Error(message);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};
