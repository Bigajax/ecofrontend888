// safeFetch.ts
export type SafeFetchResult = {
  ok: boolean;
  response?: Response;
  aborted?: boolean;
  error?: unknown;
};

const FIVE_SECONDS = 5000;

/** Try to stringify whatever RequestInfo we got */
const resolveRequestUrl = (input: RequestInfo | URL): string | undefined => {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  if (typeof Request !== "undefined" && input instanceof Request) return input.url;
  return undefined;
};

/** Resolve HTTP method, defaulting to GET */
const resolveRequestMethod = (input: RequestInfo | URL, init?: RequestInit): string => {
  const explicit = init?.method;
  if (explicit) return explicit;
  if (typeof Request !== "undefined" && input instanceof Request) return input.method;
  return "GET";
};

/** Health checks should prefer keepalive=TRUE on GET */
const shouldKeepAlive = (input: RequestInfo | URL, method: string): boolean => {
  if (method.toUpperCase() !== "GET") return false;
  const target = resolveRequestUrl(input);
  if (!target) return false;
  return /\/(?:api\/)?health(?:\b|\/|\?|$)/.test(target);
};

/** If dev accidentally used https://api/... try to swap to VITE_API_URL */
const coerceApiHost = (urlStr: string): string => {
  try {
    // absolute URL?
    const u = new URL(urlStr);
    const looksLikeBareApi =
      u.hostname === "api" || /^https?:\/\/api(?=\/|:|$)/i.test(urlStr);

    if (looksLikeBareApi) {
      // Prefer environment override when available (Vite)
      // Falls back to original URL if not present.
      const base = (import.meta as any)?.env?.VITE_API_URL as string | undefined;
      if (base && /^https?:\/\//i.test(base)) {
        const b = new URL(base);
        const rebuilt = new URL(u.pathname + u.search + u.hash, b);
        return rebuilt.toString();
      } else {
        try {
          console.error(
            "[safeFetch] Invalid API host 'api'. Set VITE_API_URL to your backend origin.",
            { url: urlStr }
          );
        } catch {
          /* noop */
        }
      }
    }
    return urlStr;
  } catch {
    // Not an absolute URL — leave as-is (browser will resolve relative paths)
    return urlStr;
  }
};

/** Normalize abort reasons into a few canonical buckets */
const normalizeAbortReason = (value: unknown): string => {
  const toStr = (v: unknown): string | undefined => {
    if (typeof v === "string") return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
    if (v instanceof DOMException) return (v.message || v.name || "DOMException").trim();
    if (v instanceof Error) return (v.message || v.name || "Error").trim();
    if (v && typeof v === "object") {
      const nested = (v as any).reason;
      const nestedStr = toStr(nested);
      if (nestedStr) return nestedStr;
      try {
        const s = JSON.stringify(v);
        if (s && s !== "{}") return s;
      } catch {/* noop */}
    }
    return undefined;
  };

  const raw = (toStr(value) || "unknown").toLowerCase();

  // Map common phrasings to canonical tokens
  if (raw.includes("timed out") || raw.includes("timeouterror") || raw === "timeout") {
    return "timeout";
  }
  if (raw.includes("visibilitychange") || raw.includes("pagehide") || raw.includes("hidden")) {
    return "visibilitychange";
  }
  if (raw.includes("watchdog")) return "watchdog_timeout";
  if (raw.includes("user_cancel")) return "user_cancelled";
  if (raw === "domexception" || raw === "error") return "unknown";

  return raw || "unknown";
};

export async function safeFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<SafeFetchResult> {
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

  // Propagate user-provided AbortSignal
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

  // Add timeout guard
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
    const timeoutId = setTimeout(() => abort("timeout"), FIVE_SECONDS);
    cleanups.push(() => clearTimeout(timeoutId));
  }

  const method = resolveRequestMethod(input, init).toUpperCase();

  // Coerce bad absolute host `https://api/...` → VITE_API_URL when available
  const originalUrlStr = resolveRequestUrl(input);
  const coercedUrlStr = originalUrlStr ? coerceApiHost(originalUrlStr) : undefined;

  // If we changed the URL string, use it as the actual fetch input
  const inputForFetch: RequestInfo | URL =
    coercedUrlStr && coercedUrlStr !== originalUrlStr ? coercedUrlStr : input;

  const ka = shouldKeepAlive(inputForFetch, method) ? true : init.keepalive;

  const fetchInit: RequestInit = {
    ...init,
    method,
    signal: controller.signal,
    ...(typeof ka === "boolean" ? { keepalive: ka } : {}),
  };

  const pickAbortReason = (): unknown =>
    (controller.signal as AbortSignal & { reason?: unknown }).reason ??
    (init.signal as AbortSignal & { reason?: unknown })?.reason;

  try {
    const response = await fetch(inputForFetch, fetchInit);
    return { ok: response.ok, response };
  } catch (error) {
    const aborted = (error as DOMException)?.name === "AbortError";
    const normalizedReason = normalizeAbortReason(pickAbortReason());
    const expected = new Set([
      "timeout",
      "visibilitychange",
      "pagehide",
      "hidden",
      "finalize",
      "watchdog_timeout",
      "user_cancelled",
    ]);

    const logPayload = {
      method,
      url: coercedUrlStr ?? originalUrlStr ?? null,
      aborted,
      reason: (controller.signal as any)?.reason ?? null,
      normalizedReason: normalizedReason || null,
    };

    try {
      if (aborted || expected.has(normalizedReason)) {
        console.debug("[safeFetch] aborted", logPayload);
      } else {
        console.error("[safeFetch] fetch_failed", { ...logPayload, error });
      }
    } catch {
      /* noop */
    }

    return { ok: false, aborted, error };
  } finally {
    for (const fn of cleanups) {
      try {
        fn();
      } catch {
        /* noop */
      }
    }
  }
}
