import { buildApiUrl } from "../constants/api";
import { buildIdentityHeaders } from "../lib/guestId";

const ADMIN_TIMEOUT_MS = 3000;

type HttpMethod = "POST" | "PUT" | "PATCH";

type CommandOptions = {
  method?: HttpMethod;
};

const sendAdminCommand = async (
  path: string,
  payload: unknown,
  { method = "POST" }: CommandOptions = {},
): Promise<void> => {
  if (typeof fetch === "undefined") {
    throw new Error("fetch is not available in this environment");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...buildIdentityHeaders(),
  };

  const controller =
    typeof AbortController !== "undefined" ? new AbortController() : null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  if (controller) {
    timeoutId = setTimeout(() => controller?.abort(), ADMIN_TIMEOUT_MS);
  }

  try {
    const response = await fetch(buildApiUrl(path), {
      method,
      headers,
      body: JSON.stringify(payload ?? {}),
      credentials: "include",
      mode: "cors",
      signal: controller?.signal,
    });

    if (response.status === 204) {
      return;
    }

    const text = await response.text().catch(() => "");
    const errorMessage = text || `Request to ${path} failed with status ${response.status}`;
    const error = new Error(errorMessage);
    (error as any).status = response.status;
    throw error;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

export const updatePolicy = async (
  payload: unknown,
  options?: CommandOptions,
): Promise<void> => {
  await sendAdminCommand("/api/policy", payload, { method: "PUT", ...options });
};

export const updateBanditArms = async (
  payload: unknown,
  options?: CommandOptions,
): Promise<void> => {
  await sendAdminCommand("/api/bandit/arms", payload, {
    method: "POST",
    ...options,
  });
};

export type { CommandOptions as AdminCommandOptions };
