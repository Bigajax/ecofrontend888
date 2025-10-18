import { buildApiUrl } from "../constants/api";
import { getOrCreateGuestId } from "./guestIdentity";

const AUTH_TOKEN_KEY = "auth_token";

export type ApiFetchErrorKind = "timeout" | "network" | "cors" | "http";
export type ApiFetchFailureReason = "cors" | "network" | "timeout" | "5xx";

export interface ApiFetchOptions extends Omit<RequestInit, "body" | "headers"> {
  method?: string;
  headers?: HeadersInit;
  timeoutMs?: number;
  retries?: number;
  retryDelays?: number[];
  baseUrl?: string;
  json?: unknown;
}

const DEFAULT_TIMEOUT = 10_000;
const DEFAULT_RETRY_DELAYS = [500, 1500];

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

export class ApiFetchError extends Error {
  public readonly kind: ApiFetchErrorKind;
  public readonly status?: number;
  public readonly statusText?: string;
  public readonly response?: Response;
  public readonly url: string;
  public readonly origin?: string;
  public readonly bodyText?: string;
  public readonly retryable: boolean;

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
    }: {
      kind: ApiFetchErrorKind;
      status?: number;
      statusText?: string;
      response?: Response;
      url: string;
      origin?: string;
      bodyText?: string;
      retryable: boolean;
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

  if (!hasToken) {
    headers.set("X-Guest-Id", getOrCreateGuestId());
  } else {
    headers.delete("X-Guest-Id");
    headers.delete("x-guest-id");
  }

  if (isJsonMethod(method)) {
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
    credentials,
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

  const headers = prepareHeaders(method, headersInit, hasToken);

  if (hasToken) {
    headers.set("Authorization", `Bearer ${token}`);
  } else {
    headers.delete("Authorization");
    headers.delete("authorization");
  }

  const resolvedCredentials = credentials ?? (hasToken ? "include" : "omit");

  const fetchInit: RequestInit = {
    ...rest,
    method,
    headers,
    credentials: resolvedCredentials,
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
            retryable: true,
          });
        }

        const isTypeError = rawError instanceof TypeError;
        const isCors = Boolean(isTypeError && origin && hasWindow && origin !== window.location.origin);

        return new ApiFetchError(isCors ? "CORS error" : "Network error", {
          kind: isCors ? "cors" : "network",
          url: targetUrl,
          origin,
          retryable: true,
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
