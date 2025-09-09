// src/api/enviarMensagemParaEco.ts
import api from './axios';
import { v4 as uuidv4 } from 'uuid';

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
  userId?: string,     // pode ser opcional se o backend extrair do JWT
  clientHour?: number,
  clientTz?: string
): Promise<string> => {
  const mensagensValidas: Message[] = userMessages
    .slice(-3)
    .filter(
      (msg) =>
        msg &&
        typeof msg.role === 'string' &&
        typeof msg.content === 'string' &&
        msg.content.trim().length > 0
    )
    .map((msg) => ({
      ...msg,
      id: msg.id || uuidv4(),
    }));

  if (mensagensValidas.length === 0) {
    throw new Error('Nenhuma mensagem válida para enviar.');
  }

  // Hora local + timezone IANA
  const hour = typeof clientHour === 'number' ? clientHour : new Date().getHours();
  const tz = clientTz || Intl.DateTimeFormat().resolvedOptions().timeZone; // ex.: "America/Sao_Paulo"

  try {
    // Chama a rota correta do backend (montada em app.use("/api", openrouterRoutes))
    const { data, status } = await api.post<AskEcoResponse>('/api/ask-eco', {
      mensagens: mensagensValidas,
      nome_usuario: userName,
      usuario_id: userId,
      clientHour: hour,
      clientTz: tz,
    });

    if (status < 200 || status >= 300) {
      throw new Error('Erro inesperado da API /api/ask-eco');
    }

    // Aceita variações do backend: message | resposta | data.message | data.resposta
    const texto =
      data?.message ??
      data?.resposta ??
      data?.data?.message ??
      data?.data?.resposta;

    if (typeof texto === 'string') {
      return texto;
    }

    throw new Error('Formato inválido na resposta da Eco.');
  } catch (error: any) {
    const status = error?.response?.status;
    const serverErr = error?.response?.data?.error || error?.response?.data?.message;
    const msg =
      serverErr ||
      (status ? `Erro HTTP ${status}: ${error?.response?.statusText || 'Falha na requisição'}` : '') ||
      (error?.message ?? 'Erro ao obter resposta da Eco.');
    console.error('❌ [ECO API] Erro ao enviar mensagem:', msg);
    throw new Error(msg);
  }
};
