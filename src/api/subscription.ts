// src/api/subscription.ts
// API client para gerenciamento de assinaturas

import { apiFetchJson, ApiFetchJsonNetworkError, ApiFetchJsonResult } from '../lib/apiFetch';
import type {
  CreateSubscriptionRequest,
  CreateSubscriptionResponse,
  SubscriptionStatusResponse,
  PaymentHistory,
  PlanType,
} from '../types/subscription';

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
 * Cria uma nova assinatura (mensal ou anual)
 *
 * @param plan - Tipo do plano ('monthly' ou 'annual')
 * @returns URL do checkout do Mercado Pago e ID da subscription
 *
 * @example
 * ```typescript
 * const { initPoint, id } = await createSubscription('monthly');
 * window.location.href = initPoint; // Redireciona para checkout
 * ```
 */
export async function createSubscription(
  plan: PlanType
): Promise<CreateSubscriptionResponse> {
  if (plan !== 'monthly' && plan !== 'annual') {
    throw new Error(ERROR_MESSAGES.INVALID_PLAN);
  }

  // Log the request payload
  const payload = { plan };
  console.log('[subscription] Creating subscription with payload:', payload);

  const result = await apiFetchJson(`${SUBSCRIPTION_BASE_PATH}/create-preference`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  // Debug log
  console.log('[subscription] createSubscription result:', {
    ok: result.ok,
    status: result.ok ? (result as any).status : (result as any).status,
    data: result.data,
  });

  if (isNetworkError(result)) {
    throw new Error(ERROR_MESSAGES.NETWORK);
  }

  if (!result.ok) {
    // Log full error details
    console.error('[subscription] Backend error:', {
      status: (result as any).status,
      data: result.data,
    });
    const message = extractErrorMessage(result.data, ERROR_MESSAGES.SUBSCRIPTION_FAILED);
    throw new Error(message);
  }

  const data = result.data as CreateSubscriptionResponse;

  if (!data.initPoint || !data.id) {
    throw new Error('Resposta inválida do servidor.');
  }

  return {
    initPoint: data.initPoint,
    id: data.id,
    type: data.type || 'preference',
  };
}

/**
 * Busca o status atual da assinatura do usuário
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
  const result = await apiFetchJson(`${SUBSCRIPTION_BASE_PATH}/status`, {
    method: 'GET',
  });

  if (isNetworkError(result)) {
    throw new Error(ERROR_MESSAGES.NETWORK);
  }

  if (!result.ok) {
    const message = extractErrorMessage(result.data, ERROR_MESSAGES.STATUS_FAILED);
    throw new Error(message);
  }

  return result.data as SubscriptionStatusResponse;
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

/**
 * Busca histórico de pagamentos do usuário
 *
 * @returns Lista de pagamentos realizados
 */
export async function getPaymentHistory(): Promise<PaymentHistory[]> {
  const result = await apiFetchJson(`${SUBSCRIPTION_BASE_PATH}/invoices`, {
    method: 'GET',
  });

  if (isNetworkError(result)) {
    throw new Error(ERROR_MESSAGES.NETWORK);
  }

  if (!result.ok) {
    const message = extractErrorMessage(result.data, 'Não foi possível buscar histórico.');
    throw new Error(message);
  }

  return (result.data as { payments: PaymentHistory[] }).payments || [];
}

/**
 * Atualiza método de pagamento da assinatura
 *
 * @param preapprovalId - ID da recorrência no Mercado Pago
 * @returns URL para atualizar método de pagamento
 */
export async function updatePaymentMethod(
  preapprovalId: string
): Promise<{ updateUrl: string }> {
  // Mercado Pago não tem API direta para update de método
  // Retorna URL para gerenciar no painel MP
  const mpDashboardUrl = `https://www.mercadopago.com.br/subscriptions/my-subscriptions`;

  return { updateUrl: mpDashboardUrl };
}

/**
 * Valida se um cupom de desconto é válido
 *
 * @param couponCode - Código do cupom
 * @returns Desconto aplicável e validade
 */
export async function validateCoupon(
  couponCode: string
): Promise<{ valid: boolean; discount: number; message?: string }> {
  const result = await apiFetchJson(`${SUBSCRIPTION_BASE_PATH}/validate-coupon`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ couponCode }),
  });

  if (isNetworkError(result)) {
    throw new Error(ERROR_MESSAGES.NETWORK);
  }

  if (!result.ok) {
    return {
      valid: false,
      discount: 0,
      message: 'Cupom inválido ou expirado',
    };
  }

  return result.data as { valid: boolean; discount: number; message?: string };
}
