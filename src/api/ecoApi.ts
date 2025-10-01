// src/api/ecoApi.ts
import api from "./axios";
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

const isDev = Boolean((import.meta as any)?.env?.DEV);

const TEXTUAL_KEYS = ["content", "texto", "text"] as const;
const NESTED_KEYS = ["message", "resposta", "mensagem", "data", "value", "delta"] as const;

const collectTexts = (value: unknown, visited = new WeakSet<object>()): string[] => {
  if (typeof value === "string") return [value];

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectTexts(item, visited));
  }

  if (value && typeof value === "object") {
    if (visited.has(value as object)) return [];
    visited.add(value as object);

    const obj = value as Record<string, unknown> & { choices?: unknown };
    const results: string[] = [];

    TEXTUAL_KEYS.forEach((key) => {
      if (key in obj) {
        results.push(...collectTexts(obj[key], visited));
      }
    });

    NESTED_KEYS.forEach((key) => {
      if (key in obj) {
        results.push(...collectTexts(obj[key], visited));
      }
    });

    if (Array.isArray(obj.choices)) {
      results.push(...obj.choices.flatMap((choice) => collectTexts(choice, visited)));
    }

    return results;
  }

  return [];
};

const normalizeAskEcoResponse = (payload: AskEcoResponse): string | undefined => {
  const texts = collectTexts(payload);
  const unique = Array.from(
    new Set(
      texts
        .map((text) => text.trim())
        .filter((text) => text.length > 0)
    )
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
): Promise<string> => {
  const mensagensValidas: Message[] = userMessages
    .slice(-3)
    .filter((m) => m && typeof m.role === "string" && typeof m.content === "string" && m.content.trim().length > 0)
    .map((m) => ({ ...m, id: m.id || uuidv4() }));

  if (mensagensValidas.length === 0) throw new Error("Nenhuma mensagem válida para enviar.");

  const hour = typeof clientHour === "number" ? clientHour : new Date().getHours();
  const tz = clientTz || Intl.DateTimeFormat().resolvedOptions().timeZone;

  try {
    // 👇 sem /api aqui!
    const { data, status } = await api.post<AskEcoResponse>("/ask-eco", {
      mensagens: mensagensValidas,      // o backend normaliza (messages | mensagens | mensagem)
      nome_usuario: userName,
      usuario_id: userId,
      clientHour: hour,
      clientTz: tz,
    });

    if (status < 200 || status >= 300) throw new Error("Erro inesperado da API /ask-eco");

    const texto = normalizeAskEcoResponse(data);

    if (typeof texto === "string") return texto;

    if (isDev) {
      console.warn("⚠️ [ECO API] Resposta inesperada:", data);
    }

    throw new Error("Formato inválido na resposta da Eco.");
  } catch (error: any) {
    const status = error?.response?.status;
    const serverErr = error?.response?.data?.error || error?.response?.data?.message;
    const msg =
      serverErr ||
      (status ? `Erro HTTP ${status}: ${error?.response?.statusText || "Falha na requisição"}` : "") ||
      (error?.message ?? "Erro ao obter resposta da Eco.");
    console.error("❌ [ECO API] Erro ao enviar mensagem:", msg);
    throw new Error(msg);
  }
};
