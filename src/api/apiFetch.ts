import { API_BASE_URL, buildApiUrl } from "../constants/api";
import { getOrCreateGuestId } from "./guestIdentity";

const AUTH_TOKEN_KEY = "auth_token";

export type ApiFetchErrorKind = "timeout" | "network" | "cors" | "http";
export type ApiFetchFailureReason =
  | "cors"
  | "redirect_cross_origin"
  | "network"
  | "timeout"
  | "5xx";

export interface ApiFetchOptions extends Omit<RequestInit, "body" | "headers"> {
  method?: string;
  headers?: HeadersInit;
  timeoutMs?: number;
  retries?: number;
  retryDelays?: number[];
  baseUrl?: string;
  json?: unknown;
}

const DEFAULT_TIMEOUT = 12_000;
const DEFAULT_RETRY_DELAYS = [600, 1800];

const hasWindow = typeof window !== "undefined";

const readAuthToken = () => {
  if (!hasWindow) return "";
  try {
    return window.localStorage.getItem(AUTH_TOKEN_KEY) || "";
  } catch {
    return "";
  }
};

const resolveOrigin = (targetUrl: string): string | undefined => {
  try {
    return new URL(targetUrl, hasWindow ? window.location.href : undefined).origin;
  } catch {
    return undefined;
  }
};

const parseUrl = (value: string): URL | undefined => {
  try {
    if (!value) return undefined;
    return new URL(value);
  } catch {
    return undefined;
  }
};

export class ApiFetchError extends Error {
  public readonly kind: ApiFetchErrorKind;
  public readonly status?: number;
  public readonly statusText?: string;
  public readonly response?: Response;
  public readonly url: string;
  public readonly origin?: string;
  public readonly bodyText?: string;
  public readonly retryable: boolean;
  public readonly failureReason?: ApiFetchFailureReason;

  constructor(
    message: string,
    {
      kind,
      status,
      statusText,
      response,
      url,
      origin,
      bodyText,
      retryable,
      failureReason,
    }: {
      kind: ApiFetchErrorKind;
      status?: number;
      statusText?: string;
      response?: Response;
      url: string;
      origin?: string;
      bodyText?: string;
      retryable: boolean;
      failureReason?: ApiFetchFailureReason;
    }
  ) {
    super(message);
    this.name = "ApiFetchError";
    this.kind = kind;
    this.status = status;
    this.statusText = statusText;
    this.response = response;
    this.url = url;
    this.origin = origin;
    this.bodyText = bodyText;
    this.retryable = retryable;
    this.failureReason = failureReason;
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isJsonMethod = (method: string) => method === "POST" || method === "PUT" || method === "PATCH";

const normalizeBase = (baseUrl?: string) => {
  if (!baseUrl) return undefined;
  return baseUrl.replace(/\/+$/, "");
};

const computeUrl = (input: string, baseUrl?: string) => {
  if (/^https?:/i.test(input)) return input;
  if (baseUrl) {
    const trimmedBase = normalizeBase(baseUrl) ?? "";
    const safePath = input.startsWith("/") ? input : `/${input}`;
    return `${trimmedBase}${safePath}`;
  }
  return buildApiUrl(input);
};

const prepareHeaders = (method: string, headersInit?: HeadersInit, hasToken = false) => {
  const headers = new Headers(headersInit);
  headers.delete("Content-Type");
  headers.delete("content-type");
  headers.set("Accept", "application/json");

  const normalizedMethod = method.toUpperCase();

  if (normalizedMethod === "GET") {
    headers.delete("Authorization");
    headers.delete("authorization");
    if (!hasToken) {
      headers.set("X-Guest-Id", getOrCreateGuestId());
    } else {
      headers.delete("X-Guest-Id");
      headers.delete("x-guest-id");
    }
    return headers;
  }

  if (!hasToken) {
    headers.set("X-Guest-Id", getOrCreateGuestId());
  } else {
    headers.delete("X-Guest-Id");
    headers.delete("x-guest-id");
  }

  if (isJsonMethod(normalizedMethod)) {
    headers.set("Content-Type", "application/json");
  }

  return headers;
};

const stringifyBody = (json: unknown) => {
  try {
    return JSON.stringify(json);
  } catch (error) {
    if (import.meta.env?.DEV) {
      console.error("[apiFetch] Falha ao serializar JSON do request", error);
    }
    return undefined;
  }
};

export async function apiFetch(path: string, options: ApiFetchOptions = {}): Promise<Response> {
  const {
    method: rawMethod,
    headers: headersInit,
    timeoutMs = DEFAULT_TIMEOUT,
    retries = DEFAULT_RETRY_DELAYS.length,
    retryDelays = DEFAULT_RETRY_DELAYS,
    baseUrl,
    json,
    body,
    ...rest
  } = options;

  const method = (rawMethod ?? (json ? "POST" : "GET")).toUpperCase();

  if (method === "GET" && (json !== undefined || body)) {
    if (import.meta.env?.DEV) {
      console.warn("[apiFetch] Ignorando corpo em request GET para evitar preflight.");
    }
  }

  const token = readAuthToken();
  const hasToken = Boolean(token);
  const targetUrl = computeUrl(path, baseUrl);
  const origin = resolveOrigin(targetUrl);
  const normalizedBase = normalizeBase(baseUrl ?? API_BASE_URL) ?? "";

  const headers = prepareHeaders(method, headersInit, hasToken);

  if (hasToken && method !== "GET") {
    headers.set("Authorization", `Bearer ${token}`);
  } else {
    headers.delete("Authorization");
    headers.delete("authorization");
  }

  const fetchInit: RequestInit = {
    ...rest,
    method,
    headers,
    credentials: "omit",
    mode: "cors",
    redirect: "follow",
    keepalive: false,
  };

  if (method !== "GET" && method !== "HEAD") {
    if (json !== undefined && body === undefined) {
      const serialized = stringifyBody(json);
      if (serialized !== undefined) {
        fetchInit.body = serialized;
      }
    } else if (body !== undefined) {
      fetchInit.body = body;
    }
  }

  let attempt = 0;
  let lastError: ApiFetchError | null = null;

  while (attempt <= retries) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(targetUrl, { ...fetchInit, signal: controller.signal });
      clearTimeout(timeoutId);

      const finalUrl = response.url ?? "";
      const finalUrlParsed = parseUrl(finalUrl);
      const baseUrlParsed = normalizedBase ? parseUrl(normalizedBase) : undefined;
      let redirectedToDifferentOrigin = response.redirected;

      if (!redirectedToDifferentOrigin && baseUrlParsed && finalUrlParsed) {
        const expectedOrigin = baseUrlParsed.origin;
        const expectedPath = baseUrlParsed.pathname.replace(/\/+$/, "");
        const finalOrigin = finalUrlParsed.origin;
        const finalPath = finalUrlParsed.pathname;
        redirectedToDifferentOrigin =
          expectedOrigin !== finalOrigin ||
          (expectedPath && !finalPath.startsWith(expectedPath));
      }

      if (!redirectedToDifferentOrigin && origin && finalUrlParsed?.origin) {
        redirectedToDifferentOrigin = origin !== finalUrlParsed.origin;
      }

      if (redirectedToDifferentOrigin) {
        const error = new ApiFetchError("Redirected cross-origin", {
          kind: "cors",
          status: response.status,
          statusText: response.statusText,
          response,
          url: targetUrl,
          origin,
          bodyText: undefined,
          retryable: false,
          failureReason: "redirect_cross_origin",
        });
        console.error("[apiFetch] Redirect cross-origin detectado", {
          url: error.url,
          finalUrl,
          origin: error.origin,
          status: error.status,
          redirected: response.redirected,
        });
        throw error;
      }

      if (!response.ok) {
        const cloned = response.clone();
        let bodyText: string | undefined;
        try {
          bodyText = await cloned.text();
        } catch {
          bodyText = undefined;
        }
        const error = new ApiFetchError(`HTTP ${response.status}`, {
          kind: "http",
          status: response.status,
          statusText: response.statusText,
          response,
          url: targetUrl,
          origin,
          bodyText,
          retryable: response.status === 503,
          failureReason: response.status >= 500 ? "5xx" : undefined,
        });
        lastError = error;
        if (error.retryable && attempt < retries) {
          await sleep(retryDelays[Math.min(attempt, retryDelays.length - 1)]);
          attempt += 1;
          continue;
        }
        console.error("[apiFetch] Falha HTTP", {
          url: error.url,
          origin: error.origin,
          status: error.status,
          statusText: error.statusText,
          body: error.bodyText,
        });
        throw error;
      }

      return response;
    } catch (rawError) {
      clearTimeout(timeoutId);
      if (rawError instanceof ApiFetchError) {
        lastError = rawError;
        throw rawError;
      }

      const error = (() => {
        if ((rawError as DOMException)?.name === "AbortError") {
          return new ApiFetchError("Request timeout", {
            kind: "timeout",
            url: targetUrl,
            origin,
            retryable: false,
            failureReason: "timeout",
          });
        }

        const isTypeError = rawError instanceof TypeError;
        const isCors = Boolean(isTypeError && origin && hasWindow && origin !== window.location.origin);

        return new ApiFetchError(isCors ? "CORS error" : "Network error", {
          kind: isCors ? "cors" : "network",
          url: targetUrl,
          origin,
          retryable: isCors ? false : true,
          failureReason: isCors ? "cors" : "network",
        });
      })();

      lastError = error;

      if (error.retryable && attempt < retries) {
        await sleep(retryDelays[Math.min(attempt, retryDelays.length - 1)]);
        attempt += 1;
        continue;
      }

      console.error("[apiFetch] Falha de rede", {
        url: error.url,
        origin: error.origin,
        kind: error.kind,
      });

      throw error;
    }
  }

  if (lastError) {
    console.error("[apiFetch] Falha na requisição", {
      url: lastError.url,
      origin: lastError.origin,
      status: lastError.status,
      statusText: lastError.statusText,
      message: lastError.message,
      kind: lastError.kind,
    });
    throw lastError;
  }

  throw new Error(`Falha desconhecida ao buscar ${path}`);
}

export async function apiFetchJson<T = unknown>(path: string, options?: ApiFetchOptions): Promise<T> {
  const response = await apiFetch(path, options);
  if (response.status === 204) {
    return undefined as unknown as T;
  }
  const contentType = response.headers.get("Content-Type") || "";
  if (!contentType.includes("application/json")) {
    const text = await response.text();
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  }
  return (await response.json()) as T;
}
