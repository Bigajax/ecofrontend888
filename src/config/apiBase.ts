export const RAW_API_BASE = "";

export const DEFAULT_API_BASE = "/api";

const trimmedRawApiBase = RAW_API_BASE.trim();

export const IS_API_BASE_EMPTY = trimmedRawApiBase.length === 0;

export function getApiBase(): string {
  return trimmedRawApiBase;
}

const isLocalhost = (() => {
  if (typeof location === "undefined") {
    return false;
  }
  const host = location.hostname;
  return host === "localhost" || host === "127.0.0.1";
})();

export const SHOW_API_BASE_WARNING = IS_API_BASE_EMPTY && isLocalhost;
