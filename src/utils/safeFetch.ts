export type SafeFetchResult = {
  ok: boolean;
  response?: Response;
  aborted?: boolean;
  error?: unknown;
};

const FIVE_SECONDS = 5000;

const resolveRequestUrl = (input: RequestInfo | URL): string | undefined => {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  if (typeof Request !== "undefined" && input instanceof Request) {
    return input.url;
  }
  return undefined;
};

const resolveRequestMethod = (input: RequestInfo | URL, init?: RequestInit): string => {
  const explicit = init?.method;
  if (explicit) return explicit;
  if (typeof Request !== "undefined" && input instanceof Request) {
    return input.method;
  }
  return "GET";
};

const shouldKeepAlive = (input: RequestInfo | URL, method: string): boolean => {
  if (method.toUpperCase() !== "GET") return false;
  const target = resolveRequestUrl(input);
  if (!target) return false;
  return /\/(?:api\/)?health(?:\b|\?|$|\/)/.test(target);
};

export async function safeFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<SafeFetchResult> {
  const controller = new AbortController();
  const abort = (reason?: unknown) => {
    if (!controller.signal.aborted) {
      try {
        controller.abort(reason);
      } catch {
        controller.abort();
      }
    }
  };

  const cleanups: Array<() => void> = [];

  const userSignal = init.signal;
  if (userSignal) {
    if (userSignal.aborted) {
      abort((userSignal as any).reason);
    } else {
      const onAbort = () => abort((userSignal as any).reason);
      userSignal.addEventListener("abort", onAbort, { once: true });
      cleanups.push(() => userSignal.removeEventListener("abort", onAbort));
    }
  }

  if (typeof AbortSignal !== "undefined" && typeof (AbortSignal as any).timeout === "function") {
    const timeoutSignal: AbortSignal = (AbortSignal as any).timeout(FIVE_SECONDS);
    if (timeoutSignal.aborted) {
      abort((timeoutSignal as any).reason);
    } else {
      const onTimeout = () => abort((timeoutSignal as any).reason);
      timeoutSignal.addEventListener("abort", onTimeout, { once: true });
      cleanups.push(() => timeoutSignal.removeEventListener("abort", onTimeout));
    }
  } else {
    const timeoutId = setTimeout(() => abort(), FIVE_SECONDS);
    cleanups.push(() => clearTimeout(timeoutId));
  }

  const method = resolveRequestMethod(input, init).toUpperCase();
  const keepalive = shouldKeepAlive(input, method) ? true : init.keepalive;

  const fetchInit: RequestInit = {
    ...init,
    method,
    signal: controller.signal,
  };

  if (typeof keepalive === "boolean") {
    fetchInit.keepalive = keepalive;
  }

  try {
    const response = await fetch(input, fetchInit);
    return { ok: response.ok, response };
  } catch (error) {
    const aborted = (error as DOMException)?.name === "AbortError";
    return { ok: false, aborted, error };
  } finally {
    cleanups.forEach((cleanup) => {
      try {
        cleanup();
      } catch {
        // ignore cleanup errors
      }
    });
  }
}
