import type { Dispatch, MutableRefObject, SetStateAction } from "react";

import type {
  EcoStreamChunk,
} from "../../../api/ecoStream";
import type {
  Message as ChatMessageType,
  UpsertMessageOptions,
} from "../../../contexts/ChatContext";
import { ASK_ECO_ENDPOINT_PATH } from "@/api/askEcoUrl";
import {
  getOrCreateGuestId,
  getOrCreateSessionId,
  rememberIdsFromResponse,
} from "@/utils/identity";
import { buildIdentityHeaders } from "../../../lib/guestId";
import { sanitizeText } from "../../../utils/sanitizeText";
import type { EnsureAssistantEventMeta, MessageTrackingRefs, ReplyStateController } from "../messageState";
import { setStreamActive } from "../streamStatus";
import type {
  EnsureAssistantMessageFn,
  InteractionMapAction,
  RemoveEcoEntryFn,
  StreamRunStats,
  StreamSharedContext,
} from "../types";

declare const __API_BASE__: string | undefined;

export type WatchdogMode = "idle" | "first" | "steady";

export type CloseReason =
  | "server_done"
  | "server_error"
  | "ui_abort"
  | "watchdog_first_token"
  | "watchdog_heartbeat"
  | "network_error";

const DEFAULT_STREAM_GUARD_TIMEOUT_MS = 15_000;

export const TYPING_WATCHDOG_MS = 45_000;

const streamWatchdogRegistry = new Map<string, () => void>();

const now = () => Date.now();

export interface StreamRunnerTimers {
  setTimeout: (
    handler: (...args: any[]) => void,
    timeout?: number,
    ...args: any[]
  ) => ReturnType<typeof setTimeout>;
  clearTimeout: (handle: ReturnType<typeof setTimeout>) => void;
}

export const createDefaultTimers = (): StreamRunnerTimers => {
  const setTimeoutImpl: StreamRunnerTimers["setTimeout"] = ((
    handler: (...args: any[]) => void,
    timeout?: number,
    ...args: any[]
  ) => setTimeout(handler, timeout, ...args)) as StreamRunnerTimers["setTimeout"];
  const clearTimeoutImpl: StreamRunnerTimers["clearTimeout"] = ((
    handle: ReturnType<typeof setTimeout>,
  ) => clearTimeout(handle)) as StreamRunnerTimers["clearTimeout"];
  return { setTimeout: setTimeoutImpl, clearTimeout: clearTimeoutImpl };
};

export const resolveStreamGuardTimeoutMs = (): number => {
  const envContainer = import.meta as { env?: Record<string, unknown> };
  const envCandidates: unknown[] = [
    envContainer?.env?.VITE_ECO_STREAM_GUARD_TIMEOUT_MS,
    envContainer?.env?.VITE_STREAM_GUARD_TIMEOUT_MS,
  ];
  try {
    const processEnv = (globalThis as typeof globalThis & {
      process?: { env?: Record<string, unknown> };
    }).process?.env;
    if (processEnv) {
      envCandidates.push(
        processEnv.VITE_ECO_STREAM_GUARD_TIMEOUT_MS,
        processEnv.VITE_STREAM_GUARD_TIMEOUT_MS,
      );
    }
  } catch {
    /* noop */
  }

  for (const candidate of envCandidates) {
    if (candidate === undefined || candidate === null) continue;
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      if (candidate >= 0) return candidate;
      continue;
    }
    if (typeof candidate === "string") {
      const trimmed = candidate.trim();
      if (!trimmed) continue;
      const parsed = Number(trimmed);
      if (Number.isFinite(parsed) && parsed >= 0) return parsed;
    }
  }

  return DEFAULT_STREAM_GUARD_TIMEOUT_MS;
};

export function createSseWatchdogs(
  id: string = "legacy",
  timers: StreamRunnerTimers = createDefaultTimers(),
) {
  const previousClear = streamWatchdogRegistry.get(id);
  if (previousClear) {
    try {
      previousClear();
    } catch {
      /* noop */
    }
  }

  let t: ReturnType<typeof setTimeout> | null = null;
  let mode: WatchdogMode = "idle";
  let promptReadyAt = 0;
  let lastHandler: ((reason: CloseReason) => void) | null = null;

  const clear = () => {
    if (t) {
      try {
        timers.clearTimeout(t);
      } catch {
        clearTimeout(t);
      }
      t = null;
    }
    mode = "idle";
    const registered = streamWatchdogRegistry.get(id);
    if (registered && registered === clear) {
      streamWatchdogRegistry.delete(id);
    }
  };

  const arm = (
    nextMode: Exclude<WatchdogMode, "idle">,
    onTimeout?: (reason: CloseReason) => void,
  ) => {
    clear();
    mode = nextMode;
    if (onTimeout) {
      lastHandler = onTimeout;
    }
    const handler = onTimeout ?? lastHandler;
    if (!handler) return;
    const timeoutMs = nextMode === "first" ? 25_000 : 30_000;
    t = timers.setTimeout(() => {
      const registered = streamWatchdogRegistry.get(id);
      if (registered && registered === clear) {
        streamWatchdogRegistry.delete(id);
      }
      handler(nextMode === "first" ? "watchdog_first_token" : "watchdog_heartbeat");
    }, timeoutMs);
    streamWatchdogRegistry.set(id, clear);
  };

  return {
    markPromptReady(onTimeout?: (reason: CloseReason) => void) {
      promptReadyAt = now();
      arm("first", onTimeout);
    },
    bumpFirstToken(onTimeout?: (reason: CloseReason) => void) {
      arm("steady", onTimeout);
    },
    bumpHeartbeat(onTimeout?: (reason: CloseReason) => void) {
      arm("steady", onTimeout);
    },
    clear,
    get sincePromptReadyMs() {
      return promptReadyAt ? now() - promptReadyAt : 0;
    },
  };
}

export const withTypingWatchdog = (
  id: string,
  onTimeout: () => void,
  timers: StreamRunnerTimers = createDefaultTimers(),
) => {
  if (TYPING_WATCHDOG_MS <= 0) {
    return () => {
      /* noop */
    };
  }

  const timer = timers.setTimeout(() => {
    try {
      onTimeout();
    } catch {
      /* noop */
    } finally {
      streamWatchdogRegistry.delete(id);
    }
  }, TYPING_WATCHDOG_MS);

  return () => {
    try {
      timers.clearTimeout(timer);
    } catch {
      clearTimeout(timer);
    }
  };
};

export interface BeginStreamParams {
  history: ChatMessageType[];
  userMessage: ChatMessageType;
  systemHint?: string;
  controllerOverride?: AbortController;
  controllerRef: MutableRefObject<AbortController | null>;
  streamTimersRef: MutableRefObject<Record<string, { startedAt: number; firstChunkAt?: number }>>;
  activeStreamClientIdRef: MutableRefObject<string | null>;
  activeAssistantIdRef: MutableRefObject<string | null>;
  streamActiveRef: MutableRefObject<boolean>;
  activeClientIdRef: MutableRefObject<string | null>;
  onFirstChunk?: () => void;
  hasFirstChunkRef: MutableRefObject<boolean>;
  setDigitando: Dispatch<SetStateAction<boolean>>;
  setIsSending: Dispatch<SetStateAction<boolean>>;
  setErroApi: Dispatch<SetStateAction<string | null>>;
  activity?: { onSend?: () => void; onDone?: () => void };
  ensureAssistantMessage: EnsureAssistantMessageFn;
  removeEcoEntry: RemoveEcoEntryFn;
  updateCurrentInteractionId: (next: string | null | undefined) => void;
  logSse: (
    phase: "open" | "start" | "first-chunk" | "delta" | "done" | "abort",
    payload: Record<string, unknown>,
  ) => void;
  userId?: string;
  userName?: string;
  guestId?: string;
  isGuest: boolean;
  interactionCacheDispatch?: (action: InteractionMapAction) => void;
  setMessages: Dispatch<SetStateAction<ChatMessageType[]>>;
  upsertMessage?: (message: ChatMessageType, options?: UpsertMessageOptions) => void;
  replyState: ReplyStateController;
  tracking: MessageTrackingRefs;
}

export type AllowedAbortReason = "watchdog_timeout" | "user_cancel";

const ALLOWED_ABORT_REASONS = new Set<AllowedAbortReason>([
  "watchdog_timeout",
  "user_cancel",
]);

const logAbortDebug = (reason: AllowedAbortReason) => {
  try {
    console.log("[DEBUG] Abortando conexão", { reason, stack: new Error().stack });
  } catch {
    /* noop */
  }
};

export const abortControllerSafely = (
  controller: AbortController,
  reason: AllowedAbortReason,
): boolean => {
  if (controller.signal.aborted) {
    return false;
  }
  if (!ALLOWED_ABORT_REASONS.has(reason)) {
    try {
      console.warn("[SSE] abort_ignored", { reason });
    } catch {
      /* noop */
    }
    return false;
  }
  logAbortDebug(reason);
  try {
    controller.abort(reason);
    return true;
  } catch {
    try {
      controller.abort();
      return true;
    } catch {
      /* noop */
    }
  }
  return false;
};

export interface StreamSessionStartResult {
  clientMessageId: string;
  normalizedClientId: string;
  controller: AbortController;
  streamStats: StreamRunStats;
  guardTimeoutMs: number;
  diagForceJson: boolean;
  requestMethod: "GET" | "POST";
  acceptHeader: string;
  fallbackEnabled: boolean;
  effectiveGuestId: string;
  effectiveSessionId: string;
  resolvedClientId: string;
}

interface StreamSessionOptions {
  params: BeginStreamParams;
  inflightControllers: Map<string, AbortController>;
  streamStartLogged: Set<string>;
  logDev: (label: string, payload: Record<string, unknown>) => void;
  timers: StreamRunnerTimers;
  watchdogFactory?: (id: string) => ReturnType<typeof createSseWatchdogs>;
}

export class StreamSession {
  private readonly params: BeginStreamParams;
  private readonly inflightControllers: Map<string, AbortController>;
  private readonly streamStartLogged: Set<string>;
  private readonly logDev: (label: string, payload: Record<string, unknown>) => void;
  private readonly timers: StreamRunnerTimers;
  private readonly watchdogFactory: (id: string) => ReturnType<typeof createSseWatchdogs>;

  private controller: AbortController | null = null;
  private clientMessageId: string | null = null;
  private normalizedClientId: string | null = null;
  private guardTimeoutMs = DEFAULT_STREAM_GUARD_TIMEOUT_MS;
  private diagForceJson = false;
  private requestMethod: "GET" | "POST" = "POST";
  private acceptHeader = "text/event-stream";
  private fallbackEnabled = false;
  private effectiveGuestId = "";
  private effectiveSessionId = "";
  private resolvedClientId = "webapp";
  private identityHeaders: Record<string, string> = {};
  private streamStatsValue: StreamRunStats | null = null;
  private watchdog = createSseWatchdogs();
  private onWatchdogTimeout: ((reason: CloseReason) => void) | null = null;

  constructor(options: StreamSessionOptions) {
    this.params = options.params;
    this.inflightControllers = options.inflightControllers;
    this.streamStartLogged = options.streamStartLogged;
    this.logDev = options.logDev;
    this.timers = options.timers;
    this.watchdogFactory =
      options.watchdogFactory ?? ((id: string) => createSseWatchdogs(id, this.timers));
  }

  start(): StreamSessionStartResult | null {
    const {
      userMessage,
      controllerOverride,
      controllerRef,
      activeStreamClientIdRef,
      activeAssistantIdRef,
      streamActiveRef,
      hasFirstChunkRef,
      updateCurrentInteractionId,
      setDigitando,
      logSse,
      tracking,
      streamTimersRef,
      setErroApi,
    } = this.params;

    const clientMessageId = userMessage.id;
    if (!clientMessageId) {
      return null;
    }

    const trimmedClientId =
      typeof clientMessageId === "string" ? clientMessageId.trim() : "";
    const normalizedClientId = trimmedClientId || clientMessageId;

    const existingInflight = this.inflightControllers.get(normalizedClientId);
    if (existingInflight && !existingInflight.signal.aborted) {
      try {
        console.warn("duplicated stream", { clientMessageId: normalizedClientId });
      } catch {
        /* noop */
      }
      return null;
    }
    if (existingInflight) {
      this.inflightControllers.delete(normalizedClientId);
    }

    const normalizedUserText = sanitizeText(
      userMessage.text ?? userMessage.content ?? "",
    ).trim();
    if (normalizedUserText) {
      tracking.userTextByClientIdRef.current[clientMessageId] = normalizedUserText;
    } else if (tracking.userTextByClientIdRef.current[clientMessageId]) {
      delete tracking.userTextByClientIdRef.current[clientMessageId];
    }

    const activeId = activeStreamClientIdRef.current;
    if (activeId && activeId !== clientMessageId) {
      const normalizedActiveId =
        typeof activeId === "string" && activeId
          ? activeId.trim() || activeId
          : activeId;
      const activeController = controllerRef.current;
      if (activeController && !activeController.signal.aborted) {
        try {
          streamActiveRef.current = false;
          try {
            console.debug("[DIAG] setStreamActive:before", {
              clientMessageId: normalizedActiveId,
              value: false,
              phase: "abort-existing",
            });
          } catch {
            /* noop */
          }
          setStreamActive(false);
          try {
            console.debug("[DIAG] controller.abort:before", {
              clientMessageId: normalizedActiveId,
              reason: "new-send",
              timestamp: Date.now(),
            });
          } catch {
            /* noop */
          }
          try {
            console.info("[SSE] aborting_active_stream", {
              clientMessageId: normalizedActiveId,
              reason: "new-send",
              timestamp: Date.now(),
            });
          } catch {
            /* noop */
          }
          abortControllerSafely(activeController, "user_cancel");
          if (typeof normalizedActiveId === "string" && normalizedActiveId) {
            logSse("abort", {
              clientMessageId: normalizedActiveId,
              reason: "new-send",
              source: "controller",
            });
          }
        } catch {
          /* noop */
        }
      }
      if (typeof normalizedActiveId === "string" && normalizedActiveId) {
        delete streamTimersRef.current[normalizedActiveId];
      }
      if (tracking.userTextByClientIdRef.current[activeId]) {
        delete tracking.userTextByClientIdRef.current[activeId];
      }
    }

    const controller = controllerOverride ?? new AbortController();
    controllerRef.current = controller;
    this.inflightControllers.set(normalizedClientId, controller);
    console.log("[DEBUG] Controller criado", {
      isAborted: controller.signal.aborted,
      reason: (controller.signal as any).reason,
      stack: new Error().stack,
    });

    if (controller.signal.aborted) {
      console.error("[ERROR] Controller CRIADO JÁ ABORTADO!", {
        reason: (controller.signal as any).reason,
        stack: new Error().stack,
      });
    }

    activeStreamClientIdRef.current = clientMessageId;
    activeAssistantIdRef.current = null;
    try {
      console.debug("[DIAG] streamActiveRef:update", {
        clientMessageId,
        value: true,
        phase: "beginStream:start",
      });
    } catch {
      /* noop */
    }
    streamActiveRef.current = true;
    hasFirstChunkRef.current = false;

    updateCurrentInteractionId(null);

    if (tracking.pendingAssistantMetaRef.current[clientMessageId]) {
      delete tracking.pendingAssistantMetaRef.current[clientMessageId];
    }

    try {
      console.debug("[DIAG] setDigitando:before", {
        clientMessageId,
        value: true,
        phase: "beginStream:start",
      });
    } catch {
      /* noop */
    }
    setDigitando(true);

    const identityHeaders = buildIdentityHeaders();
    this.identityHeaders = identityHeaders;
    const resolveIdentityHeader = (key: string) => {
      const exact = identityHeaders[key];
      if (typeof exact === "string" && exact.trim().length > 0) return exact.trim();
      const lower = identityHeaders[key.toLowerCase() as keyof typeof identityHeaders];
      if (typeof lower === "string" && lower.trim().length > 0) return lower.trim();
      return "";
    };

    const resolvedGuestId = resolveIdentityHeader("X-Eco-Guest-Id");
    const resolvedSessionId = resolveIdentityHeader("X-Eco-Session-Id");
    const effectiveGuestId = resolvedGuestId || getOrCreateGuestId();
    const effectiveSessionId = resolvedSessionId || getOrCreateSessionId();

    const resolvedClientId = (() => {
      const explicit = resolveIdentityHeader("X-Client-Id");
      if (explicit) {
        return explicit;
      }
      const lowercase = resolveIdentityHeader("x-client-id");
      if (lowercase) {
        return lowercase;
      }
      return "webapp";
    })();
    this.resolvedClientId = resolvedClientId;

    const diagForceJson =
      typeof window !== "undefined" &&
      Boolean((window as { __ecoDiag?: { forceJson?: boolean } }).__ecoDiag?.forceJson);
    const requestMethod: "GET" | "POST" = "POST";
    const acceptHeader = "text/event-stream";
    const fallbackEnabled = diagForceJson;

    this.logDev("identifiers", {
      guestId: effectiveGuestId,
      sessionId: effectiveSessionId,
      clientMessageId: normalizedClientId,
      method: requestMethod,
    });

    streamTimersRef.current[normalizedClientId] = { startedAt: Date.now() };
    logSse("start", {
      clientMessageId: normalizedClientId,
      guestId: effectiveGuestId,
      sessionId: effectiveSessionId,
      method: requestMethod,
    });
    console.log("[SSE] Stream started", {
      timestamp: Date.now(),
      clientMessageId: normalizedClientId,
      guestId: effectiveGuestId,
      sessionId: effectiveSessionId,
      method: requestMethod,
    });

    if (this.streamStartLogged.has(normalizedClientId)) {
      try {
        console.warn("duplicated stream", { clientMessageId: normalizedClientId });
      } catch {
        /* noop */
      }
    } else {
      this.streamStartLogged.add(normalizedClientId);
      try {
        console.debug("[DIAG] stream:start", {
          clientMessageId,
          historyLength: this.params.history.length,
          systemHint: this.params.systemHint ?? null,
        });
      } catch {
        /* noop */
      }
    }

    this.controller = controller;
    this.clientMessageId = clientMessageId as string;
    this.normalizedClientId = normalizedClientId as string;
    this.guardTimeoutMs = resolveStreamGuardTimeoutMs();
    this.diagForceJson = diagForceJson;
    this.requestMethod = requestMethod;
    this.acceptHeader = acceptHeader;
    this.fallbackEnabled = fallbackEnabled;
    this.effectiveGuestId = effectiveGuestId;
    this.effectiveSessionId = effectiveSessionId;

    this.streamStatsValue = {
      aggregatedLength: 0,
      gotAnyChunk: false,
      lastMeta: undefined,
      finishReasonFromMeta: undefined,
    };

    this.watchdog = this.watchdogFactory(this.normalizedClientId);
    this.onWatchdogTimeout = null;

    if (typeof setErroApi === "function") {
      setErroApi((previous) => previous);
    }

    return {
      clientMessageId: this.clientMessageId,
      normalizedClientId: this.normalizedClientId,
      controller: this.controller,
      streamStats: this.streamStatsValue,
      guardTimeoutMs: this.guardTimeoutMs,
      diagForceJson: this.diagForceJson,
      requestMethod: this.requestMethod,
      acceptHeader: this.acceptHeader,
      fallbackEnabled: this.fallbackEnabled,
      effectiveGuestId: this.effectiveGuestId,
      effectiveSessionId: this.effectiveSessionId,
      resolvedClientId: this.resolvedClientId,
    };
  }

  getStreamStats(): StreamRunStats {
    if (!this.streamStatsValue) {
      this.streamStatsValue = {
        aggregatedLength: 0,
        gotAnyChunk: false,
      };
    }
    return this.streamStatsValue;
  }

  getController(): AbortController {
    if (!this.controller) {
      throw new Error("StreamSession controller unavailable. Did you call start()? ");
    }
    return this.controller;
  }

  getClientMessageId(): string {
    if (!this.clientMessageId) {
      throw new Error("StreamSession clientMessageId unavailable.");
    }
    return this.clientMessageId;
  }

  getNormalizedClientId(): string {
    if (!this.normalizedClientId) {
      throw new Error("StreamSession normalizedClientId unavailable.");
    }
    return this.normalizedClientId;
  }

  getGuardTimeoutMs(): number {
    return this.guardTimeoutMs;
  }

  isFallbackEnabled(): boolean {
    return this.fallbackEnabled;
  }

  getRequestMethod(): "GET" | "POST" {
    return this.requestMethod;
  }

  getAcceptHeader(): string {
    return this.acceptHeader;
  }

  getEffectiveGuestId(): string {
    return this.effectiveGuestId;
  }

  getEffectiveSessionId(): string {
    return this.effectiveSessionId;
  }

  getDiagForceJson(): boolean {
    return this.diagForceJson;
  }

  getResolvedClientId(): string {
    return this.resolvedClientId;
  }

  getIdentityHeaders(): Record<string, string> {
    return { ...this.identityHeaders };
  }

  setWatchdogTimeoutHandler(handler: ((reason: CloseReason) => void) | null) {
    this.onWatchdogTimeout = handler;
  }

  markPromptReadyWatchdog() {
    this.watchdog.markPromptReady(this.onWatchdogTimeout ?? undefined);
  }

  bumpFirstTokenWatchdog() {
    this.watchdog.bumpFirstToken(this.onWatchdogTimeout ?? undefined);
  }

  bumpHeartbeatWatchdog() {
    this.watchdog.bumpHeartbeat(this.onWatchdogTimeout ?? undefined);
  }

  clearWatchdog() {
    this.watchdog.clear();
  }

  finalize() {
    const {
      setDigitando,
      setIsSending,
      activeAssistantIdRef,
      activeStreamClientIdRef,
      streamActiveRef,
    } = this.params;

    streamActiveRef.current = false;
    try {
      console.debug("[DIAG] setStreamActive:before", {
        clientMessageId: this.clientMessageId,
        value: false,
        phase: "session:finalize",
      });
    } catch {
      /* noop */
    }
    setStreamActive(false);
    activeStreamClientIdRef.current = null;
    activeAssistantIdRef.current = null;
    try {
      setDigitando(false);
    } catch {
      /* noop */
    }
    try {
      setIsSending(false);
    } catch {
      /* noop */
    }
  }

  handleAbort(reason: AllowedAbortReason): boolean {
    if (!this.controller) return false;
    return abortControllerSafely(this.controller, reason);
  }
}

type ResolveAskEcoUrlResult = {
  url: string;
  base: string;
  source: "VITE_API_URL" | "NEXT_PUBLIC_API_URL" | "DEFINE_FALLBACK";
  nodeEnv: string;
};

const resolveAbsoluteAskEcoUrl = (): ResolveAskEcoUrlResult => {
  const envContainer = import.meta as { env?: Record<string, string | undefined> };
  const env = envContainer.env ?? {};
  const processEnv = (() => {
    try {
      return (
        (globalThis as typeof globalThis & {
          process?: { env?: Record<string, string | undefined> };
        }).process?.env ?? {}
      );
    } catch {
      return {};
    }
  })();
  const fromDefine =
    (typeof __API_BASE__ !== "undefined" ? __API_BASE__ : "") ?? "";
  const rawVite = env?.VITE_API_URL ?? processEnv?.VITE_API_URL ?? "";
  const rawNext = env?.NEXT_PUBLIC_API_URL ?? processEnv?.NEXT_PUBLIC_API_URL ?? "";
  const trimmedVite = typeof rawVite === "string" ? rawVite.trim() : "";
  const trimmedNext = typeof rawNext === "string" ? rawNext.trim() : "";
  const trimmedDefine = typeof fromDefine === "string" ? fromDefine.trim() : "";

  try {
    console.log("[SSE-DEBUG] env_probe", {
      hasVite: trimmedVite.length > 0,
      hasNextPub: trimmedNext.length > 0,
      hasDefine: trimmedDefine.length > 0,
    });
  } catch {
    /* noop */
  }

  const baseCandidate = trimmedVite || trimmedNext || trimmedDefine;
  const selectedSource: ResolveAskEcoUrlResult["source"] = trimmedVite
    ? "VITE_API_URL"
    : trimmedNext
    ? "NEXT_PUBLIC_API_URL"
    : "DEFINE_FALLBACK";

  const nodeEnvRaw =
    (typeof processEnv?.NODE_ENV === "string" ? processEnv.NODE_ENV.trim() : "") ||
    (typeof env?.MODE === "string" ? env.MODE.trim() : "") ||
    (typeof env?.mode === "string" ? env.mode.trim() : "");
  const nodeEnv = nodeEnvRaw;

  if (!baseCandidate) {
    const message =
      nodeEnv.toLowerCase() === "production"
        ? "API_BASE missing: defina VITE_API_URL (ou NEXT_PUBLIC_API_URL) nas envs de Preview/Production e faça redeploy."
        : "API_BASE missing";
    console.error(message);
    throw new Error(message);
  }

  let base = baseCandidate.replace(/\/+$/, "");
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
  const normalizedBase = parsed.pathname
    ? `${parsed.origin}${parsed.pathname}`
    : parsed.origin;
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

interface FallbackManagerOptions {
  session: StreamSession;
  sharedContext: StreamSharedContext;
  streamStats: StreamRunStats;
  guardTimeoutMs: number;
  fallbackEnabled: boolean;
  logSse: (
    phase: "open" | "start" | "first-chunk" | "delta" | "done" | "abort",
    payload: Record<string, unknown>,
  ) => void;
  setDigitando: Dispatch<SetStateAction<boolean>>;
  setErroApi: Dispatch<SetStateAction<string | null>>;
  diag: (...args: unknown[]) => void;
  registerNoContent: (reason: string) => void;
  tracking: MessageTrackingRefs;
  streamActiveRef: MutableRefObject<boolean>;
  activeStreamClientIdRef: MutableRefObject<string | null>;
  clearWatchdog: () => void;
  resolveAbortReason: (input: unknown) => string;
  baseHeaders: () => Record<string, string>;
  getRequestPayload: () => Record<string, unknown> | null;
  handleChunk: (chunk: EcoStreamChunk, context: StreamSharedContext) => void;
  handleStreamDone: (rawEvent?: Record<string, unknown>, options?: { reason?: string }) => void;
  timers: StreamRunnerTimers;
  typingWatchdogFactory: (id: string, onTimeout: () => void) => () => void;
  fallbackFetch?: typeof fetch;
}

export class StreamFallbackManager {
  private readonly session: StreamSession;
  private readonly sharedContext: StreamSharedContext;
  private readonly streamStats: StreamRunStats;
  private readonly guardTimeoutMs: number;
  private readonly fallbackEnabled: boolean;
  private readonly logSse: FallbackManagerOptions["logSse"];
  private readonly setDigitando: Dispatch<SetStateAction<boolean>>;
  private readonly setErroApi: Dispatch<SetStateAction<string | null>>;
  private readonly diag: (...args: unknown[]) => void;
  private readonly registerNoContent: (reason: string) => void;
  private readonly tracking: MessageTrackingRefs;
  private readonly streamActiveRef: MutableRefObject<boolean>;
  private readonly activeStreamClientIdRef: MutableRefObject<string | null>;
  private readonly clearWatchdogFn: () => void;
  private readonly resolveAbortReason: (input: unknown) => string;
  private readonly baseHeaders: () => Record<string, string>;
  private readonly getRequestPayload: () => Record<string, unknown> | null;
  private readonly handleChunk: (chunk: EcoStreamChunk, context: StreamSharedContext) => void;
  private readonly handleStreamDone: (
    rawEvent?: Record<string, unknown>,
    options?: { reason?: string },
  ) => void;
  private readonly timers: StreamRunnerTimers;
  private readonly typingWatchdogFactory: (id: string, onTimeout: () => void) => () => void;
  private readonly fallbackFetch?: typeof fetch;

  private fallbackGuardTimer: ReturnType<typeof setTimeout> | null = null;
  private fallbackGuardTriggered = false;
  private fallbackRequested = false;
  private clearTypingWatchdog: () => void = () => {
    /* noop */
  };

  constructor(options: FallbackManagerOptions) {
    this.session = options.session;
    this.sharedContext = options.sharedContext;
    this.streamStats = options.streamStats;
    this.guardTimeoutMs = options.guardTimeoutMs;
    this.fallbackEnabled = options.fallbackEnabled;
    this.logSse = options.logSse;
    this.setDigitando = options.setDigitando;
    this.setErroApi = options.setErroApi;
    this.diag = options.diag;
    this.registerNoContent = options.registerNoContent;
    this.tracking = options.tracking;
    this.streamActiveRef = options.streamActiveRef;
    this.activeStreamClientIdRef = options.activeStreamClientIdRef;
    this.clearWatchdogFn = options.clearWatchdog;
    this.resolveAbortReason = options.resolveAbortReason;
    this.baseHeaders = options.baseHeaders;
    this.getRequestPayload = options.getRequestPayload;
    this.handleChunk = options.handleChunk;
    this.handleStreamDone = options.handleStreamDone;
    this.timers = options.timers;
    this.typingWatchdogFactory = options.typingWatchdogFactory;
    this.fallbackFetch = options.fallbackFetch;
  }

  initializeTypingWatchdog(onTimeout: () => void) {
    this.clearTypingWatchdog = this.typingWatchdogFactory(
      this.session.getNormalizedClientId(),
      onTimeout,
    );
  }

  clearTypingWatchdogTimer() {
    this.clearTypingWatchdog();
  }

  clearFallbackGuardTimer() {
    if (!this.fallbackGuardTimer) return;
    try {
      this.timers.clearTimeout(this.fallbackGuardTimer);
    } catch {
      clearTimeout(this.fallbackGuardTimer);
    }
    this.fallbackGuardTimer = null;
  }

  startFallbackGuardTimer(triggerJsonFallback: (reason: string) => void) {
    if (!this.fallbackEnabled) return;
    if (this.guardTimeoutMs <= 0) return;
    this.clearFallbackGuardTimer();
    this.fallbackGuardTimer = this.timers.setTimeout(() => {
      const controller = this.session.getController();
      if (controller.signal.aborted || this.sharedContext.hasFirstChunkRef.current) return;
      if (this.fallbackRequested) return;
      this.fallbackGuardTriggered = true;
      this.streamStats.guardFallbackTriggered = true;
      this.streamStats.guardTimeoutMs = this.guardTimeoutMs;
      this.diag("fallback_guard_timeout", {
        clientMessageId: this.session.getNormalizedClientId(),
        timeoutMs: this.guardTimeoutMs,
      });
      try {
        console.warn("[SSE] fallback_guard_timeout", {
          clientMessageId: this.session.getClientMessageId(),
          timeoutMs: this.guardTimeoutMs,
        });
      } catch {
        /* noop */
      }
      this.logSse("abort", {
        clientMessageId: this.session.getNormalizedClientId(),
        reason: "fallback_guard_timeout",
        timeoutMs: this.guardTimeoutMs,
        source: "fallback-guard",
      });
      this.registerNoContent("fallback_guard_timeout");
      triggerJsonFallback("fallback_guard_timeout");
    }, this.guardTimeoutMs);
  }

  beginFallback(reason: string): boolean {
    if (!this.fallbackEnabled) {
      return false;
    }
    if (this.sharedContext.hasFirstChunkRef.current) {
      return false;
    }
    if (this.fallbackRequested) {
      return false;
    }
    this.fallbackRequested = true;
    this.streamStats.clientFinishReason ??= reason;
    this.clearFallbackGuardTimer();
    this.clearTypingWatchdog();
    this.clearWatchdogFn();
    if (this.activeStreamClientIdRef.current === this.session.getClientMessageId()) {
      this.streamActiveRef.current = false;
      try {
        console.debug("[DIAG] setStreamActive:before", {
          clientMessageId: this.session.getClientMessageId(),
          value: false,
          phase: "fallback-init",
        });
      } catch {
        /* noop */
      }
      setStreamActive(false);
      try {
        console.debug("[DIAG] setDigitando:before", {
          clientMessageId: this.session.getClientMessageId(),
          value: false,
          phase: "fallback-init",
        });
      } catch {
        /* noop */
      }
      this.setDigitando(false);
    } else {
      try {
        console.debug("[DIAG] fallback-init:inactive", {
          clientMessageId: this.session.getClientMessageId(),
        });
      } catch {
        /* noop */
      }
    }
    return true;
  }

  abortSseForFallback(reason?: string) {
    if (!this.fallbackEnabled) {
      return;
    }
    const fallbackReason =
      typeof reason === "string" && reason.trim() ? reason : "json_fallback";
    if (this.session.handleAbort("watchdog_timeout")) {
      try {
        console.warn("[SSE] aborting_for_fallback", {
          clientMessageId: this.session.getClientMessageId(),
          reason: fallbackReason,
        });
      } catch {
        /* noop */
      }
    }
  }

  async runJsonFallbackRequest(options: { reason?: string; logError?: unknown } = {}) {
    if (!this.fallbackEnabled) {
      return false;
    }
    if (this.sharedContext.hasFirstChunkRef.current) {
      return false;
    }

    const controller = this.session.getController();

    const abortReason = (controller.signal as AbortSignal & { reason?: unknown }).reason;
    const normalizedAbortReason = this.resolveAbortReason(abortReason);
    if (normalizedAbortReason === "new-send" || normalizedAbortReason === "ui_abort") {
      return false;
    }

    const { reason = "json_fallback", logError } = options;

    if (!this.fallbackRequested) {
      const started = this.beginFallback(reason);
      if (!started) {
        return false;
      }
    }

    this.abortSseForFallback(reason);
    this.streamStats.jsonFallbackAttempts = (this.streamStats.jsonFallbackAttempts ?? 0) + 1;

    if (logError !== undefined) {
      console.error("[SSE] Stream failed, tentando JSON", logError);
    }

    try {
      const endpointInfo = resolveAbsoluteAskEcoUrl();
      const fallbackUrl = endpointInfo.url;
      const apiBaseSource = endpointInfo.source;
      const resolvedNodeEnv = endpointInfo.nodeEnv;
      try {
        console.log("[SSE-DEBUG] resolved_ask_eco_url", {
          resolved_ask_eco_url: fallbackUrl,
          api_base_source: apiBaseSource,
          node_env: resolvedNodeEnv || null,
        });
      } catch {
        /* noop */
      }
      const once = (value?: string | null): string => {
        if (typeof value !== "string") return "";
        const [head] = value.split(",");
        return head.trim();
      };
      const fallbackGuestId = once(this.session.getEffectiveGuestId());
      const fallbackSessionId = once(this.session.getEffectiveSessionId());
      const fallbackClientId = once(this.session.getNormalizedClientId());
      const fallbackClientMessageId = once(this.session.getClientMessageId());
      const fallbackHeaders: Record<string, string> = {
        ...this.baseHeaders(),
        Accept: "application/json",
        "Content-Type": "application/json",
      };
      if (fallbackGuestId) {
        fallbackHeaders["X-Eco-Guest-Id"] = fallbackGuestId;
      }
      if (fallbackSessionId) {
        fallbackHeaders["X-Eco-Session-Id"] = fallbackSessionId;
      }
      if (fallbackClientId) {
        fallbackHeaders["X-Client-Id"] = fallbackClientId;
      } else if (!fallbackHeaders["X-Client-Id"]) {
        fallbackHeaders["X-Client-Id"] = "webapp";
      }
      if (fallbackClientMessageId) {
        fallbackHeaders["X-Eco-Client-Message-Id"] = fallbackClientMessageId;
      }

      const fallbackController = new AbortController();
      const payload = this.getRequestPayload();
      const fallbackFetch =
        this.fallbackFetch ??
        (typeof globalThis.fetch === "function" ? (globalThis.fetch as typeof fetch) : fetch);
      try {
        console.log("[SSE-DEBUG] fetch_endpoint_info", {
          resolved_ask_eco_url: fallbackUrl,
          api_base_source: apiBaseSource,
          node_env: resolvedNodeEnv || null,
        });
      } catch {
        /* noop */
      }
      const res = await fallbackFetch(fallbackUrl, {
        method: "POST",
        headers: fallbackHeaders,
        body: JSON.stringify(payload),
        signal: fallbackController.signal,
      });
      rememberIdsFromResponse(res);
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        const trimmedDetail = detail.trim();
        const message = trimmedDetail || `Eco fallback request failed (${res.status})`;
        this.setErroApi(message);
        this.logSse("abort", {
          clientMessageId: this.session.getNormalizedClientId(),
          reason: "json_fallback_http_error",
          status: res.status,
          source: "json_fallback",
        });
        return false;
      }

      const data = await res.json().catch(() => null);
      const fallbackText =
        typeof data?.text === "string"
          ? data.text
          : typeof data?.content === "string"
          ? data.content
          : undefined;

      if (fallbackText) {
        this.sharedContext.hasFirstChunkRef.current = true;
        this.streamStats.gotAnyChunk = true;
        this.streamStats.aggregatedLength += fallbackText.length;
        this.streamStats.jsonFallbackSucceeded = true;
        this.streamStats.clientFinishReason ??= reason;
        const fallbackChunk: EcoStreamChunk = {
          index: 0,
          text: fallbackText,
          isFirstChunk: true,
          payload: {
            source: "json_fallback",
            patch: {
              type: "json_fallback",
              text: fallbackText,
              content: fallbackText,
            },
          },
        } as EcoStreamChunk;
        this.handleChunk(fallbackChunk, this.sharedContext);
        this.handleStreamDone(
          {
            type: "control",
            name: "done",
            payload: {
              text: fallbackText,
              response: { text: fallbackText },
              metadata: { finish_reason: "json_fallback", source: "json_fallback" },
            },
          } as unknown as Record<string, unknown>,
        );
        return true;
      }
    } catch (fallbackErr) {
      console.error("[SSE] Fallback JSON também falhou", fallbackErr);
    }

    return false;
  }

  isFallbackRequested() {
    return this.fallbackRequested;
  }

  wasFallbackGuardTriggered() {
    return this.fallbackGuardTriggered;
  }
}
