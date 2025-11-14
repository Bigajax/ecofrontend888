import { ASK_ECO_ENDPOINT_PATH } from "@/api/askEcoUrl";

export type ResolveAskEcoUrlResult = {
  url: string;
  base: string;
  source: "VITE_API_URL" | "NEXT_PUBLIC_API_URL" | "DEFINE_FALLBACK";
  nodeEnv: string;
};

const detectImportMetaEnv = (): { env?: { DEV?: boolean; MODE?: string; mode?: string } } => {
  try {
    return import.meta as { env?: { DEV?: boolean; MODE?: string; mode?: string } };
  } catch {
    return {};
  }
};

const detectProcessEnv = (): Record<string, string | undefined> => {
  try {
    return (
      (globalThis as typeof globalThis & {
        process?: { env?: Record<string, string | undefined> };
      }).process?.env ?? {}
    );
  } catch {
    return {};
  }
};

const extractNodeEnv = (
  env: Record<string, string | undefined>,
  importMetaEnv?: { MODE?: string; mode?: string },
): string => {
  const fromProcess = typeof env.NODE_ENV === "string" ? env.NODE_ENV.trim() : "";
  if (fromProcess) return fromProcess;
  const fromMode = typeof importMetaEnv?.MODE === "string" ? importMetaEnv.MODE.trim() : "";
  if (fromMode) return fromMode;
  return typeof importMetaEnv?.mode === "string" ? importMetaEnv.mode.trim() : "";
};

export const isDevelopmentEnv = (() => {
  const meta = detectImportMetaEnv();
  if (typeof meta?.env?.DEV === "boolean") {
    return meta.env.DEV;
  }

  const mode = meta?.env?.MODE ?? meta?.env?.mode;
  if (typeof mode === "string" && mode.trim()) {
    return mode.trim().toLowerCase() === "development";
  }

  const processEnv = detectProcessEnv();
  const nodeEnv = processEnv.NODE_ENV;
  if (typeof nodeEnv === "string" && nodeEnv.trim()) {
    return nodeEnv.trim().toLowerCase() === "development";
  }

  return false;
})();

export const logDev = (label: string, payload: Record<string, unknown>) => {
  if (!isDevelopmentEnv) return;
  try {
    console.debug(`[EcoStream] ${label}`, payload);
  } catch {
    /* noop */
  }
};

declare const __API_BASE__: string | undefined;

export const resolveAbsoluteAskEcoUrl = (): ResolveAskEcoUrlResult => {
  const envContainer = import.meta as { env?: Record<string, string | undefined> };
  const env = envContainer.env ?? {};
  const processEnv = detectProcessEnv();

  const fromDefine = (typeof __API_BASE__ !== "undefined" ? __API_BASE__ : "") ?? "";
  const rawVite = env?.VITE_API_URL ?? processEnv?.VITE_API_URL ?? "";
  const rawNext = env?.NEXT_PUBLIC_API_URL ?? processEnv?.NEXT_PUBLIC_API_URL ?? "";
  const trimmedVite = typeof rawVite === "string" ? rawVite.trim() : "";
  const trimmedNext = typeof rawNext === "string" ? rawNext.trim() : "";
  const trimmedDefine = typeof fromDefine === "string" ? fromDefine.trim() : "";

  console.log("[SSE-DEBUG] env_probe", {
    hasVite: trimmedVite.length > 0,
    hasNextPub: trimmedNext.length > 0,
    hasDefine: trimmedDefine.length > 0,
  });

  const baseCandidate = trimmedVite || trimmedNext || trimmedDefine;
  const selectedSource: ResolveAskEcoUrlResult["source"] = trimmedVite
    ? "VITE_API_URL"
    : trimmedNext
    ? "NEXT_PUBLIC_API_URL"
    : "DEFINE_FALLBACK";

  const nodeEnv = extractNodeEnv(processEnv, env as { MODE?: string; mode?: string });

  if (!baseCandidate) {
    const message =
      nodeEnv.toLowerCase() === "production"
        ? "API_BASE missing: defina VITE_API_URL (ou NEXT_PUBLIC_API_URL) nas envs de Preview/Production e faça redeploy."
        : "API_BASE missing";
    console.error(message);
    throw new Error(message);
  }

  const base = baseCandidate.replace(/\/+$/, "");
  let parsed: URL;
  try {
    parsed = new URL(base);
  } catch {
    console.error("[SSE] Invalid API_BASE", { base: baseCandidate, source: selectedSource });
    throw new Error("API_BASE invalid");
  }

  if (nodeEnv.toLowerCase() === "production") {
    const host = parsed.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1") {
      console.error("[SSE] API_BASE localhost blocked in production", {
        base: parsed.toString(),
        source: selectedSource,
      });
      throw new Error("API_BASE localhost not allowed in production");
    }
  }

  const isPageHttps = typeof window !== "undefined" && window.location?.protocol === "https:";
  if (isPageHttps && parsed.protocol === "http:") {
    const pageHost = window.location.hostname;
    if (parsed.hostname === pageHost) {
      console.error("[SSE] API_BASE forced to https", {
        base: parsed.toString(),
        source: selectedSource,
      });
      parsed.protocol = "https:";
      if (!window.location.port && parsed.port === "80") {
        parsed.port = "";
      }
    } else {
      console.error("[SSE] API_BASE insecure http blocked on https page", {
        base: parsed.toString(),
        source: selectedSource,
        pageHost,
      });
      throw new Error("API_BASE insecure on https page");
    }
  }

  parsed.hash = "";
  parsed.search = "";
  parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  const normalizedBase = parsed.pathname ? `${parsed.origin}${parsed.pathname}` : parsed.origin;
  const trimmedBase = normalizedBase.replace(/\/+$/, "");

  const askEcoPath = ASK_ECO_ENDPOINT_PATH.startsWith("/")
    ? ASK_ECO_ENDPOINT_PATH
    : `/${ASK_ECO_ENDPOINT_PATH}`;
  const normalizedPath = askEcoPath.replace(/\/+$/, "");
  const pathSuffix = trimmedBase.endsWith("/api")
    ? normalizedPath.replace(/^\/api/, "")
    : normalizedPath;
  const url = `${trimmedBase}${pathSuffix}`;

  return {
    url,
    base: trimmedBase,
    source: selectedSource,
    nodeEnv,
  };
};
