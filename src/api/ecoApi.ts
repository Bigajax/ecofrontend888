import api from './axios';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabaseClient';

interface Message {
  id?: string;
  role: string;
  content: string;
}

export const enviarMensagemParaEco = async (
  userMessages: Message[],
  userName?: string,
  userId?: string,
  clientHour?: number,   // ⬅️ já existia
  clientTz?: string      // ⬅️ NOVO
): Promise<string | undefined> => {
  try {
    if (!userId) throw new Error('Usuário não autenticado. ID ausente.');

    const mensagensValidas: Message[] = userMessages
      .slice(-3)
      .filter(
        msg =>
          msg &&
          typeof msg.role === 'string' &&
          typeof msg.content === 'string' &&
          msg.content.trim().length > 0
      )
      .map(msg => ({
        ...msg,
        id: msg.id || uuidv4(),
      }));

    if (mensagensValidas.length === 0) {
      throw new Error('Nenhuma mensagem válida para enviar.');
    }

    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();
    if (authError || !session?.access_token) {
      throw new Error('Token de acesso ausente. Faça login novamente.');
    }

    // Hora local (caso não venha do chamador) + timezone IANA
    const hour = typeof clientHour === 'number' ? clientHour : new Date().getHours();
    const tz = clientTz || Intl.DateTimeFormat().resolvedOptions().timeZone; // ex.: "America/Sao_Paulo"

    const response = await api.post(
      '/ask-eco',
      {
        mensagens: mensagensValidas,
        nome_usuario: userName,
        usuario_id: userId,
        clientHour: hour, // ⬅️ envia hora local
        clientTz: tz,     // ⬅️ envia timezone IANA
      },
      {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    if (response.status >= 200 && response.status < 300) {
      const resposta = response.data;
      if (resposta && typeof resposta.message === 'string') {
        return resposta.message;
      }
      throw new Error('Formato inválido na resposta da Eco.');
    }

    throw new Error(response.data?.error || 'Erro inesperado da API /ask-eco');
  } catch (error: any) {
    let mensagemErro = 'Erro ao obter resposta da Eco.';

    if (error.response?.data?.error) {
      mensagemErro = `Erro do servidor: ${error.response.data.error}`;
    } else if (error.response?.status) {
      mensagemErro = `Erro HTTP ${error.response.status}: ${error.response.statusText}`;
    } else if (error.request) {
      mensagemErro = 'Sem resposta do servidor. Verifique se o backend está ativo.';
    } else {
      mensagemErro = error.message || 'Erro inesperado';
    }

    console.error('❌ [ECO API] Erro ao enviar mensagem:', mensagemErro);
    throw new Error(mensagemErro);
  }
};
