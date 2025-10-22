import { buildApiUrl } from "../constants/api";
import { buildIdentityHeaders } from "../lib/guestId";

export type ModuleUsageRequest = {
  moduleKey: string;
  position?: number;
  tokens?: number;
  sessionId?: string | null;
  interactionId?: string | null;
  messageId?: string | null;
};

const envFlag = import.meta.env.VITE_ENABLE_MODULE_USAGE;
export const ENABLE_MODULE_USAGE =
  envFlag === undefined ? true : envFlag !== "false";

const MODULE_USAGE_TIMEOUT_MS = 2500;

const sanitize = <T extends Record<string, unknown>>(payload: T) => {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  ) as T;
};

let hasLogged404 = false;

export async function sendModuleUsage({
  moduleKey,
  position,
  tokens,
  sessionId,
  interactionId,
  messageId,
}: ModuleUsageRequest): Promise<void> {
  if (!ENABLE_MODULE_USAGE) return;
  if (typeof fetch === "undefined") return;

  const normalizedKey = moduleKey.trim();
  if (!normalizedKey) return;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...buildIdentityHeaders(),
  };

  const controller =
    typeof AbortController !== "undefined" ? new AbortController() : null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  if (controller) {
    timeoutId = setTimeout(() => {
      controller?.abort();
    }, MODULE_USAGE_TIMEOUT_MS);
  }

  const body = sanitize({
    moduleKey: normalizedKey,
    position:
      typeof position === "number" && Number.isFinite(position)
        ? Math.max(0, Math.round(position))
        : undefined,
    tokens:
      typeof tokens === "number" && Number.isFinite(tokens)
        ? Math.max(0, Math.round(tokens))
        : undefined,
    sessionId:
      typeof sessionId === "string" && sessionId.trim().length > 0
        ? sessionId.trim()
        : undefined,
    interactionId:
      typeof interactionId === "string" && interactionId.trim().length > 0
        ? interactionId.trim()
        : undefined,
    messageId:
      typeof messageId === "string" && messageId.trim().length > 0
        ? messageId.trim()
        : undefined,
  });

  try {
    const res = await fetch(buildApiUrl("/api/module-usage"), {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller?.signal,
    });

    if (res.status !== 204) {
      if (res.status === 404) {
        if (import.meta.env.DEV && !hasLogged404) {
          hasLogged404 = true;
          console.debug("[module-usage] endpoint /api/module-usage not found (404)");
        }
      } else if (import.meta.env.DEV) {
        console.debug("[module-usage] request failed", {
          status: res.status,
          module: normalizedKey,
        });
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.debug("[module-usage] error", error);
    }
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}
