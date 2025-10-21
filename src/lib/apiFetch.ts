import { getApiBase } from "@/config/apiBase";

export type ApiFetchJsonErrorCode = "NETWORK" | "TIMEOUT";

export type ApiFetchJsonInit = RequestInit & { timeoutMs?: number };

export type ApiFetchJsonSuccess<T = unknown> = {
  ok: true;
  status: number;
  data: T;
  headers: Headers;
};

export type ApiFetchJsonHttpError<T = unknown> = {
  ok: false;
  status: number;
  data?: T;
  headers?: Headers;
};

export type ApiFetchJsonNetworkError = {
  ok: false;
  status: 0;
  code: ApiFetchJsonErrorCode;
  message: string;
  error?: unknown;
};

export type ApiFetchJsonResult<T = unknown> =
  | ApiFetchJsonSuccess<T>
  | ApiFetchJsonHttpError<T>
  | ApiFetchJsonNetworkError;

const DEFAULT_TIMEOUT_MS = 20_000;
const NETWORK_FRIENDLY_MESSAGE = "Sem conexão com o servidor. Tente novamente.";

const buildUrl = (path: string) => {
  if (/^https?:/i.test(path)) {
    return path;
  }
  const base = getApiBase();
  const prefix = path.startsWith("/") ? "" : "/";
  return `${base}${prefix}${path}`;
};

const toHeaders = (source?: HeadersInit): Headers => {
  const headers = new Headers(source);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }
  return headers;
};

const readJsonSafely = async <T>(response: Response): Promise<T | undefined> => {
  try {
    return (await response.clone().json()) as T;
  } catch {
    try {
      const text = await response.clone().text();
      return text as unknown as T;
    } catch {
      return undefined;
    }
  }
};

export async function apiFetchJson<T = unknown>(
  path: string,
  init: ApiFetchJsonInit = {},
): Promise<ApiFetchJsonResult<T>> {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    signal,
    headers: headersInit,
    mode,
    credentials,
    ...rest
  } = init;

  const controller = new AbortController();
  const cleanups: Array<() => void> = [];
  let timedOut = false;

  const abort = (reason?: unknown) => {
    if (!controller.signal.aborted) {
      try {
        controller.abort(reason);
      } catch {
        controller.abort();
      }
    }
  };

  if (signal) {
    if (signal.aborted) {
      abort((signal as any).reason);
    } else {
      const onAbort = () => abort((signal as any).reason);
      signal.addEventListener("abort", onAbort, { once: true });
      cleanups.push(() => signal.removeEventListener("abort", onAbort));
    }
  }

  if (timeoutMs > 0) {
    const timeoutId = setTimeout(() => {
      timedOut = true;
      abort(new DOMException("Request timed out", "AbortError"));
    }, timeoutMs);
    cleanups.push(() => clearTimeout(timeoutId));
  }

  const headers = toHeaders(headersInit);

  const fetchInit: RequestInit = {
    ...rest,
    headers,
    mode: mode ?? "cors",
    credentials: credentials ?? "include",
    signal: controller.signal,
  };

  try {
    const response = await fetch(buildUrl(path), fetchInit);
    const status = response.status;
    const responseHeaders = new Headers(response.headers);
    const data = await readJsonSafely<T>(response);

    if (response.ok) {
      return { ok: true, status, data: data as T, headers: responseHeaders };
    }

    return { ok: false, status, data, headers: responseHeaders };
  } catch (error) {
    const errorName = (error as DOMException)?.name;
    const isAbortError = errorName === "AbortError";
    const code: ApiFetchJsonErrorCode = timedOut ? "TIMEOUT" : "NETWORK";

    return {
      ok: false,
      status: 0,
      code: isAbortError && timedOut ? "TIMEOUT" : code,
      message: NETWORK_FRIENDLY_MESSAGE,
      error,
    };
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
