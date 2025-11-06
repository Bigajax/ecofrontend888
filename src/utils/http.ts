// utils/http.ts
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeout = 12000,
) {
  if (typeof AbortController === "undefined") {
    return fetch(input, init);
  }

  const controller = new AbortController();
  const { signal: userSignal, ...rest } = init;
  const cleanups: Array<() => void> = [];

  const abort = (reason?: unknown) => {
    if (!controller.signal.aborted) {
      try {
        controller.abort(reason);
      } catch {
        controller.abort();
      }
    }
  };

  if (userSignal) {
    if (userSignal.aborted) {
      abort((userSignal as any).reason);
    } else {
      const onAbort = () => abort((userSignal as any).reason);
      userSignal.addEventListener("abort", onAbort, { once: true });
      cleanups.push(() => userSignal.removeEventListener("abort", onAbort));
    }
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  if (timeout > 0) {
    timeoutId = setTimeout(() => abort(new DOMException("Request timed out", "AbortError")), timeout);
    cleanups.push(() => clearTimeout(timeoutId));
  }

  try {
    return await fetch(input, { ...rest, signal: controller.signal });
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

export async function withRetry<T>(fn: () => Promise<T>, retries = 2, backoffMs = 700): Promise<T> {
  let attempt = 0;
   
  while (true) {
    try { return await fn(); }
    catch (e) {
      if (attempt >= retries) throw e;
      await new Promise(r => setTimeout(r, backoffMs * Math.pow(2, attempt)));
      attempt++;
    }
  }
}
