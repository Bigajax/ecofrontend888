const DEFAULT_API_BASE = "https://ecobackend888.onrender.com";

const normalizeCandidate = (candidate: unknown): string | undefined => {
  if (typeof candidate !== "string") return undefined;
  const trimmed = candidate.trim();
  if (!trimmed) return undefined;
  const withoutTrailingSlash = trimmed.replace(/\/+$/, "");
  return withoutTrailingSlash || undefined;
};

const readWindowApiBase = (): string | undefined => {
  if (typeof window === "undefined") return undefined;
  const candidate = (window as { __API_BASE__?: unknown }).__API_BASE__;
  return normalizeCandidate(candidate);
};

const rawEnvApiBase = (() => {
  const value = (import.meta as any)?.env?.VITE_API_BASE;
  return typeof value === "string" ? value : undefined;
})();

export const getRawEnvApiBase = (): string | undefined => rawEnvApiBase;

export const getApiBase = (): string => {
  const envBase = normalizeCandidate(rawEnvApiBase);
  const windowBase = readWindowApiBase();
  return envBase ?? windowBase ?? DEFAULT_API_BASE;
};

export { DEFAULT_API_BASE };
