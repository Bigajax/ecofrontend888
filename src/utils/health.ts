import { safeFetch } from "./safeFetch";

export type HealthStatus = "idle" | "ok" | "degraded" | "down";

export type HealthCheckResult = {
  status: HealthStatus;
  aborted: boolean;
  responseOk: boolean;
};

const resolveHealthUrl = () => "/api/health";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function pingHealth(signal?: AbortSignal): Promise<HealthCheckResult> {
  const url = resolveHealthUrl();
  const result = await safeFetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  });

  if (result.aborted) {
    return { status: "degraded", aborted: true, responseOk: false };
  }

  const responseOk = result.response?.ok === true;

  if (!result.response) {
    return { status: "down", aborted: false, responseOk: false };
  }

  if (!responseOk) {
    return { status: "down", aborted: false, responseOk: false };
  }

  let payloadOk = false;
  try {
    const data = await result.response.clone().json();
    payloadOk = Boolean(data && typeof data === "object" && (data as { ok?: unknown }).ok);
  } catch {
    payloadOk = false;
  }

  return {
    status: payloadOk ? "ok" : "degraded",
    aborted: false,
    responseOk,
  };
}

export async function pingWithRetry(
  tries = 2,
  delayMs = 800,
  signal?: AbortSignal,
): Promise<HealthCheckResult> {
  if (signal?.aborted) {
    return { status: "degraded", aborted: true, responseOk: false };
  }

  let status: HealthCheckResult = { status: "degraded", aborted: false, responseOk: false };
  for (let attempt = 0; attempt < tries; attempt++) {
    if (signal?.aborted) {
      return { status: "degraded", aborted: true, responseOk: false };
    }

    const current = await pingHealth(signal);
    if (current.aborted) {
      return current;
    }

    if (current.status === "ok") {
      return current;
    }
    if (current.status === "down") {
      status = current;
    } else if (status.status !== "down") {
      status = current;
    }

    if (attempt < tries - 1) {
      if (signal?.aborted) {
        return { status: "degraded", aborted: true, responseOk: false };
      }
      await wait(delayMs);
    }
  }

  return status;
}
