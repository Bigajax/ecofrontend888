import api from '@/api/axios';
import { buildApiUrl } from '@/constants/api';

const PROMPT_ENDPOINT = '/api/prompt-mestre';

export const gerarPromptMestre = async (): Promise<string> => {
  const targetUrl = buildApiUrl(PROMPT_ENDPOINT);
  console.log('Frontend: iniciando chamada para', targetUrl);

  try {
    const { data } = await api.get<{ prompt: string }>(PROMPT_ENDPOINT, {
      headers: { Accept: 'application/json' },
      withCredentials: true,
    });
    if (!data.prompt) {
      console.error('Frontend: resposta sem campo prompt:', data);
      throw new Error('Formato de resposta inesperado do servidor');
    }
    console.log('Frontend: prompt mestre extraído com sucesso');
    return data.prompt;
  } catch (err) {
    console.error('Frontend: erro ao buscar o prompt mestre:', err);
    throw err;
  }
};
