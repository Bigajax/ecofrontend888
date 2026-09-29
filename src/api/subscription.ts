// src/api/subscription.ts
// API client para gerenciamento de assinaturas

import { apiFetchJson, ApiFetchJsonNetworkError, ApiFetchJsonResult } from '../lib/apiFetch';
import type { SubscriptionStatusResponse } from '../types/subscription';

const SUBSCRIPTION_BASE_PATH = '/api/subscription';

/**
 * Mensagens de erro amigáveis
 */
const ERROR_MESSAGES = {
  NETWORK: 'Não foi possível conectar ao servidor. Verifique sua conexão.',
  SERVER_ERROR: 'Erro no servidor. Tente novamente em instantes.',
  INVALID_PLAN: 'Plano inválido. Escolha entre mensal ou anual.',
  SUBSCRIPTION_FAILED: 'Não foi possível criar a assinatura. Tente novamente.',
  STATUS_FAILED: 'Não foi possível verificar o status da assinatura.',
  CANCEL_FAILED: 'Não foi possível cancelar a assinatura.',
};

/**
 * Verifica se é erro de rede
 */
const isNetworkError = (
  result: ApiFetchJsonResult<unknown>
): result is ApiFetchJsonNetworkError => {
  return !result.ok && (result as ApiFetchJsonNetworkError).status === 0;
};

/**
 * Extrai mensagem de erro da API
 */
const extractErrorMessage = (data: unknown, fallback: string): string => {
  if (typeof data === 'string' && data.trim()) {
    return data.trim();
  }

  if (data && typeof data === 'object') {
    const msg = (data as { message?: unknown }).message;
    if (typeof msg === 'string' && msg.trim()) {
      return msg.trim();
    }
  }

  return fallback;
};

/**
 * Helper: sleep com Promise
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Busca o status atual da assinatura do usuário
 * Com retry automático em caso de erro de rede
 *
 * @returns Status completo da assinatura, incluindo trial e datas
 *
 * @example
 * ```typescript
 * const status = await getSubscriptionStatus();
 * if (status.isPremium) {
 *   console.log('Usuário tem acesso premium');
 * }
 * ```
 */
export async function getSubscriptionStatus(): Promise<SubscriptionStatusResponse> {
  const MAX_RETRIES = 2;
  const RETRY_DELAYS = [1000, 2000]; // 1s, 2s

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await apiFetchJson(`${SUBSCRIPTION_BASE_PATH}/status`, {
        method: 'GET',
      });

      if (isNetworkError(result)) {
        lastError = new Error(ERROR_MESSAGES.NETWORK);

        // Retry em caso de erro de rede
        if (attempt < MAX_RETRIES) {
          const delay = RETRY_DELAYS[attempt];
          console.warn(`[subscription] Network error, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})...`);
          await sleep(delay);
          continue;
        }

        throw lastError;
      }

      if (!result.ok) {
        const message = extractErrorMessage(result.data, ERROR_MESSAGES.STATUS_FAILED);
        // Não retry em erros HTTP 4xx/5xx - são erros de lógica/autorização
        throw new Error(message);
      }

      return result.data as SubscriptionStatusResponse;
    } catch (error) {
      lastError = error as Error;

      // Se for erro de timeout/rede, retry
      const isRetryable = error instanceof Error && (
        error.message.includes('rede') ||
        error.message.includes('network') ||
        error.message.includes('timeout') ||
        error.message.includes('conectar')
      );

      if (isRetryable && attempt < MAX_RETRIES) {
        const delay = RETRY_DELAYS[attempt];
        console.warn(`[subscription] Retryable error, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})...`, error);
        await sleep(delay);
        continue;
      }

      // Se não for retryable ou acabaram as tentativas, throw
      throw error;
    }
  }

  // Fallback (nunca deve chegar aqui)
  throw lastError || new Error(ERROR_MESSAGES.STATUS_FAILED);
}

/**
 * Cancela a assinatura ativa do usuário
 *
 * @param reason - Motivo do cancelamento (opcional, para analytics)
 * @returns Mensagem de confirmação
 *
 * @example
 * ```typescript
 * await cancelSubscription('Muito caro');
 * // Assinatura cancelada, acesso mantido até fim do período pago
 * ```
 */
export async function cancelSubscription(reason?: string): Promise<{ message: string }> {
  const result = await apiFetchJson(`${SUBSCRIPTION_BASE_PATH}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reason }),
  });

  if (isNetworkError(result)) {
    throw new Error(ERROR_MESSAGES.NETWORK);
  }

  if (!result.ok) {
    const message = extractErrorMessage(result.data, ERROR_MESSAGES.CANCEL_FAILED);
    throw new Error(message);
  }

  return result.data as { message: string };
}

/**
 * Reativa uma assinatura cancelada
 *
 * @returns Status atualizado da assinatura
 */
export async function reactivateSubscription(): Promise<SubscriptionStatusResponse> {
  const result = await apiFetchJson(`${SUBSCRIPTION_BASE_PATH}/reactivate`, {
    method: 'POST',
  });

  if (isNetworkError(result)) {
    throw new Error(ERROR_MESSAGES.NETWORK);
  }

  if (!result.ok) {
    const message = extractErrorMessage(result.data, 'Não foi possível reativar a assinatura.');
    throw new Error(message);
  }

  return result.data as SubscriptionStatusResponse;
}
