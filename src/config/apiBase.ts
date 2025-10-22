const resolveRawApiBase = () => {
  const env = import.meta.env as Record<string, string | undefined>;
  if (typeof env?.VITE_API_URL === "string") {
    return env.VITE_API_URL;
  }

  if (typeof env?.VITE_API_BASE === "string") {
    return env.VITE_API_BASE;
  }

  if (typeof env?.VITE_API_BASE_URL === "string") {
    return env.VITE_API_BASE_URL;
  }

  return "";
};

export const RAW_API_BASE = resolveRawApiBase();

export const DEFAULT_API_BASE = "https://ecobackend888.onrender.com";

const trimmedRawApiBase = RAW_API_BASE.trim();

export const IS_API_BASE_EMPTY = trimmedRawApiBase.length === 0;

const sanitizeBase = (candidate: string) => candidate.replace(/\/+$/, "");

export function getApiBase(): string {
  const normalized = sanitizeBase(trimmedRawApiBase || DEFAULT_API_BASE);
  return normalized || DEFAULT_API_BASE;
}

const isLocalhost = (() => {
  if (typeof location === "undefined") {
    return false;
  }
  const host = location.hostname;
  return host === "localhost" || host === "127.0.0.1";
})();

export const SHOW_API_BASE_WARNING = IS_API_BASE_EMPTY && isLocalhost;
