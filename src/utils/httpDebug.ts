const toHeaderEntries = (
  headers: HeadersInit | Record<string, unknown> | undefined
): Array<{ name: string; value: string }> => {
  if (!headers) return [];

  if (typeof Headers !== "undefined" && headers instanceof Headers) {
    return Array.from(headers.entries()).map(([name, value]) => ({ name, value }));
  }

  if (Array.isArray(headers)) {
    return headers
      .filter((entry): entry is [string, string] => Array.isArray(entry) && entry.length >= 2)
      .map(([name, value]) => ({ name, value: String(value) }));
  }

  const maybeJson = headers as { toJSON?: () => unknown };
  if (typeof maybeJson?.toJSON === "function") {
    const jsonValue = maybeJson.toJSON() as Record<string, unknown>;
    return Object.entries(jsonValue).map(([name, value]) => ({
      name,
      value: Array.isArray(value) ? value.join(", ") : String(value ?? ""),
    }));
  }

  return Object.entries(headers as Record<string, unknown>).map(([name, value]) => ({
    name,
    value: Array.isArray(value) ? value.join(", ") : String(value ?? ""),
  }));
};

const sanitizeHeaderValue = (name: string, value: string) => {
  const lower = name.toLowerCase();
  if (lower === "authorization") {
    if (value.startsWith("Bearer ")) {
      return "Bearer [redacted]";
    }
    return "[redacted]";
  }
  return value;
};

interface DebugInfo {
  method: string;
  url: string;
  credentials?: RequestCredentials | "include" | "omit" | "same-origin";
  headers?: HeadersInit | Record<string, unknown>;
}

export const logHttpRequestDebug = ({ method, url, credentials, headers }: DebugInfo) => {
  if (!import.meta.env.DEV) return;

  const headerEntries = toHeaderEntries(headers).map(({ name, value }) => ({
    name,
    value: sanitizeHeaderValue(name, value),
  }));

  console.debug("[HTTP DEBUG]", {
    method,
    url,
    credentials: credentials ?? "unspecified",
    headers: headerEntries,
  });
};

export type { DebugInfo as HttpDebugInfo };
