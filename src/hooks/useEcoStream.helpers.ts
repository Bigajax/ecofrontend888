export const isDev = Boolean((import.meta as any)?.env?.DEV);
export const isTestEnv = Boolean((import.meta as any)?.env?.MODE === 'test');

export const CONTEXT_FETCH_TIMEOUT_MS = 3000;
export const NO_TEXT_WARNING = '⚠️ Nenhum texto recebido do servidor.';
export const NO_TEXT_ALERT_MESSAGE = 'Nenhum texto recebido do servidor. Tente novamente.';

export const getNow = () =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

export const showToast = (title: string, description?: string) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('toast', {
      detail: { title, description },
    }),
  );
};

export const withTimeout = <T>(
  promise: Promise<T>,
  ms: number,
  onTimeout: () => T | PromiseLike<T>,
): Promise<T> => {
  return new Promise<T>((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve(onTimeout());
    }, ms);

    promise
      .then((value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(onTimeout());
      });
  });
};

export const flattenToString = (value: unknown): string => {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map((item) => flattenToString(item)).join('');
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return Object.prototype.toString.call(value);
    }
  }
  return String(value);
};

export const collectErrorMessages = (
  error: unknown,
  acc: Set<string> = new Set(),
): Set<string> => {
  if (!error) return acc;

  const push = (text: unknown) => {
    const str = typeof text === 'string' ? text : flattenToString(text);
    if (str && str.trim().length > 0) {
      acc.add(str.trim());
    }
  };

  if (typeof error === 'string') {
    push(error);
    return acc;
  }

  if (error instanceof Error) {
    push(error.message);
    if ((error as any).cause) {
      collectErrorMessages((error as any).cause, acc);
    }
  }

  if (typeof error === 'object' && error !== null) {
    const maybeMessage = (error as any).message;
    if (typeof maybeMessage === 'string') push(maybeMessage);

    const maybeDetails = (error as any).details;
    if (maybeDetails && maybeDetails !== error) {
      collectErrorMessages(maybeDetails, acc);
    }

    const maybeReason = (error as any).reason;
    if (typeof maybeReason === 'string') push(maybeReason);
  }

  return acc;
};

export const resolveFriendlyNetworkError = (error: unknown) => {
  if (error instanceof TypeError) {
    return {
      type: 'network' as const,
      message: 'Sem conexão. Tente novamente.',
    };
  }

  const texts = Array.from(collectErrorMessages(error));
  if (texts.length === 0) return { type: 'other' as const, message: '' };

  const combined = texts.join(' | ').toLowerCase();
  if (combined.includes('cors') || combined.includes('preflight')) {
    return {
      type: 'cors' as const,
      message: 'O servidor recusou a origem. Atualize e tente novamente.',
    };
  }

  if (
    combined.includes('failed to fetch') ||
    combined.includes('networkerror') ||
    combined.includes('net::err') ||
    combined.includes('err_connection')
  ) {
    return {
      type: 'network' as const,
      message:
        'Não consegui conectar ao servidor. Verifique sua internet ou tente novamente em instantes.',
    };
  }

  return { type: 'other' as const, message: '' };
};
