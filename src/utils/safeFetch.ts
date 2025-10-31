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
  const requestUrl = resolveRequestUrl(input);
  const keepalive = shouldKeepAlive(input, method) ? true : init.keepalive;

  const fetchInit: RequestInit = {
    ...init,
    method,
    signal: controller.signal,
  };

  if (typeof keepalive === "boolean") {
    fetchInit.keepalive = keepalive;
  }

  const formatAbortReason = (value: unknown): string => {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
    if (value instanceof DOMException) {
      const domReason = (value as DOMException & { reason?: unknown }).reason;
      if (typeof domReason === "string" && domReason.trim()) {
        return domReason.trim();
      }
      if (typeof value.message === "string" && value.message.trim()) {
        return value.message.trim();
      }
      if (typeof value.name === "string" && value.name.trim()) {
        return value.name.trim();
      }
      return "DOMException";
    }
    if (value instanceof Error) {
      if (typeof value.message === "string" && value.message.trim()) {
        return value.message.trim();
      }
      if (typeof value.name === "string" && value.name.trim()) {
        return value.name.trim();
      }
      return "Error";
    }
    if (typeof value === "object" && value !== null) {
      const nested = (value as { reason?: unknown }).reason;
      if (nested !== undefined) {
        const formattedNested = formatAbortReason(nested);
        if (formattedNested !== "unknown") {
          return formattedNested;
        }
      }
      try {
        const serialized = JSON.stringify(value);
        if (serialized && serialized !== "{}") {
          return serialized;
        }
      } catch {
        /* noop */
      }
    }
    return "unknown";
  };

  const pickAbortReason = (): unknown =>
    (controller.signal as AbortSignal & { reason?: unknown }).reason ??
    (init.signal as AbortSignal & { reason?: unknown })?.reason;

  try {
    const response = await fetch(input, fetchInit);
    return { ok: response.ok, response };
  } catch (error) {
    const aborted = (error as DOMException)?.name === "AbortError";
    const rawReason = pickAbortReason();
    const normalizedReason = formatAbortReason(rawReason).toLowerCase();
    const expectedReasons = new Set([
      "timeout",
      "visibilitychange",
      "pagehide",
      "hidden",
      "finalize",
      "watchdog_timeout",
      "user_cancel",
    ]);
    const logPayload = {
      method,
      url: requestUrl ?? null,
      aborted,
      reason: rawReason ?? null,
      normalizedReason: normalizedReason || null,
    };
    if (aborted || expectedReasons.has(normalizedReason)) {
      try {
        console.debug("[safeFetch] aborted", logPayload);
      } catch {
        /* noop */
      }
    } else {
      try {
        console.error("[safeFetch] fetch_failed", { ...logPayload, error });
      } catch {
        /* noop */
      }
    }
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
