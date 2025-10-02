// src/api/ecoApi.ts
import api from "./axios";
import { supabase } from "../lib/supabaseClient";
import { v4 as uuidv4 } from "uuid";

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
  clientTz?: string
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

    const response = await fetch(`${baseUrl}/ask-eco`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
      body: JSON.stringify({
        mensagens: mensagensValidas,
        nome_usuario: userName,
        usuario_id: userId,
        clientHour: hour,
        clientTz: tz,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      let serverErr: string | undefined;
      try {
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const errJson = await response.json();
          serverErr = errJson?.error || errJson?.message;
        } else {
          serverErr = await response.text();
        }
      } catch {}
      throw new Error(serverErr?.trim() || `Erro HTTP ${response.status}: ${response.statusText || "Falha na requisição"}`);
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

    const handleEvent = (eventData: unknown) => {
      if (!eventData || typeof eventData !== "object") return;

      const baseEvent = eventData as Record<string, any>;
      const topType = typeof baseEvent.type === "string" ? baseEvent.type : undefined;
      const eventPayloadRaw = baseEvent.payload && typeof baseEvent.payload === "object" ? baseEvent.payload : baseEvent;
      const payload = eventPayloadRaw as Record<string, any>;
      const payloadType = typeof payload.type === "string" ? payload.type : topType;

      if (payloadType === "chunk") {
        const source = payload.delta ?? payload.content ?? payload.message ?? payload;
        const texts = collectTexts(source);
        if (texts.length > 0) aggregatedParts.push(texts.join(""));
        return;
      }

      if (payloadType === "done") {
        doneReceived = true;
        donePayload = payload;
        metadata = payload?.response ?? payload?.metadata ?? payload;

        // 👇 se o backend mandou a flag, guardamos
        if (payload?.primeiraMemoriaSignificativa || payload?.primeira) {
          primeiraMemoriaSignificativa = true;
        }
        return;
      }

      if (payloadType === "error" || payload?.status === "error") {
        const errMessage = payload?.error?.message || payload?.error || payload?.message || "Erro na stream SSE da Eco.";
        streamError = new Error(String(errMessage));
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
