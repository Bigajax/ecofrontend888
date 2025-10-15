import { getOrCreateGuestId } from "../api/guestIdentity";

const AUTH_TOKEN_KEY = "auth_token";

type JwtPayload = {
  sub?: string;
  [key: string]: unknown;
};

function decodeJwt(token: string): JwtPayload | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const hasBuffer =
      typeof globalThis !== "undefined" && typeof (globalThis as any).Buffer !== "undefined";
    const json =
      typeof window === "undefined" && hasBuffer
        ? (globalThis as any).Buffer.from(padded, "base64").toString("utf-8")
        : typeof atob === "function"
        ? atob(padded)
        : "";
    if (!json) return null;
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function getUserIdFromStore(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return null;
    const payload = decodeJwt(token);
    return typeof payload?.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export function getSessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return getOrCreateGuestId();
  } catch {
    return null;
  }
}
