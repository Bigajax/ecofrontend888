// src/api/ecoApi.ts
import api from "./axios";
import { v4 as uuidv4 } from "uuid";

interface Message {
  id?: string;
  role: string;
  content: string;
}

type AskEcoResponse =
  | { message?: string; resposta?: string; data?: { message?: string; resposta?: string } }
  | any;

export const enviarMensagemParaEco = async (
  userMessages: Message[],
  userName?: string,
  userId?: string,
  clientHour?: number,
  clientTz?: string,
  options?: { signal?: AbortSignal }
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
    const { data, status } = await api.post<AskEcoResponse>(
      "/ask-eco",
      {
        mensagens: mensagensValidas, // o backend normaliza (messages | mensagens | mensagem)
        nome_usuario: userName,
        usuario_id: userId,
        clientHour: hour,
        clientTz: tz,
      },
      { signal: options?.signal }
    );

    if (status < 200 || status >= 300) throw new Error("Erro inesperado da API /ask-eco");

    const texto =
      data?.message ?? data?.resposta ?? data?.data?.message ?? data?.data?.resposta;

    if (typeof texto === "string") return texto;

    throw new Error("Formato inválido na resposta da Eco.");
  } catch (error: any) {
    if (options?.signal?.aborted || error?.code === 'ERR_CANCELED') {
      throw error;
    }
    const status = error?.response?.status;
    const serverErr = error?.response?.data?.error || error?.response?.data?.message;
    const msg =
      serverErr ||
      (status ? `Erro HTTP ${status}: ${error?.response?.statusText || "Falha na requisição"}` : "") ||
      (error?.message ?? "Erro ao obter resposta da Eco.");
    console.error("❌ [ECO API] Erro ao enviar mensagem:", msg);
    throw Object.assign(new Error(msg), { status });
  }
};
