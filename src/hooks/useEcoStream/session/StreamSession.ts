import type { Dispatch, MutableRefObject, SetStateAction } from "react";

import type {
  EcoStreamChunk,
} from "../../../api/ecoStream";
import type {
  Message as ChatMessageType,
  UpsertMessageOptions,
} from "../../../contexts/ChatContext";
import { buildAskEcoUrl } from "@/api/askEcoUrl";
import {
  getOrCreateGuestId,
  getOrCreateSessionId,
  rememberIdsFromResponse,
} from "@/utils/identity";
import { buildIdentityHeaders } from "../../../lib/guestId";
import { sanitizeText } from "../../../utils/sanitizeText";
import type { EnsureAssistantEventMeta, MessageTrackingRefs, ReplyStateController } from "../messageState";
import { setStreamActive } from "../streamStatus";

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

export function createSseWatchdogs(id: string = "legacy") {
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
      clearTimeout(t);
      t = null;
    }
    mode = "idle";
    promptReadyAt = 0;
    if (lastHandler) {
      const handler = lastHandler;
      lastHandler = null;
      try {
        const registered = streamWatchdogRegistry.get(id);
        if (registered === clear) {
          streamWatchdogRegistry.delete(id);
        }
        handler("server_done");
      } catch {
        /* noop */
      }
    } else {
      const registered = streamWatchdogRegistry.get(id);
      if (registered === clear) {
        streamWatchdogRegistry.delete(id);
      }
    }
  };

  const arm = (nextMode: WatchdogMode, onTimeout?: (reason: CloseReason) => void) => {
    lastHandler = onTimeout ?? null;
    if (t) {
      clearTimeout(t);
      t = null;
    }
    mode = nextMode;
    const timeoutMs = (() => {
      if (nextMode === "first") return 25_000;
      if (nextMode === "steady") return 30_000;
      return 0;
    })();
    if (timeoutMs > 0) {
      t = setTimeout(() => {
        t = null;
        if (!lastHandler) return;
        const handler = lastHandler;
        lastHandler = null;
        streamWatchdogRegistry.delete(id);
        handler(nextMode === "first" ? "watchdog_first_token" : "watchdog_heartbeat");
      }, timeoutMs);
      streamWatchdogRegistry.set(id, clear);
    } else {
      streamWatchdogRegistry.delete(id);
    }
  };

  return {
    markPromptReady(onTimeout?: (reason: CloseReason) => void) {
      promptReadyAt = now();
      arm("first", onTimeout);
    },
    bumpFirstToken(onTimeout?: (reason: CloseReason) => void) {
      if (mode === "idle") {
        arm("steady", onTimeout);
        return;
      }
      if (mode === "first") {
        const elapsed = promptReadyAt ? now() - promptReadyAt : 0;
        if (elapsed > 0) {
          console.log("[WATCHDOG] first token in", { elapsed });
        }
      }
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

export const withTypingWatchdog = (id: string, onTimeout: () => void) => {
  if (TYPING_WATCHDOG_MS <= 0) {
    return () => {
      /* noop */
    };
  }

  const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
    try {
      onTimeout();
    } catch {
      /* noop */
    } finally {
      streamWatchdogRegistry.delete(id);
    }
  }, TYPING_WATCHDOG_MS);

  return () => clearTimeout(timer);
};

export type InteractionMapAction = {
  type: "updateInteractionMap";
  clientId: string;
  interaction_id: string;
};

export interface StreamRunStats {
  aggregatedLength: number;
  gotAnyChunk: boolean;
  lastMeta?: Record<string, unknown>;
  finishReasonFromMeta?: string;
  status?: "no_content";
  timing?: { startedAt?: number; firstChunkAt?: number; totalMs?: number };
  responseHeaders?: Record<string, string>;
  noContentReason?: string;
  clientFinishReason?: string;
  streamId?: string;
  guardTimeoutMs?: number;
  guardFallbackTriggered?: boolean;
  jsonFallbackAttempts?: number;
  jsonFallbackSucceeded?: boolean;
}

export type EnsureAssistantMessageFn = (
  clientMessageId: string,
  event?: EnsureAssistantEventMeta,
  options?: { allowCreate?: boolean; draftMessages?: ChatMessageType[] },
) => string | null | undefined;

export type RemoveEcoEntryFn = (assistantMessageId?: string | null) => void;

export interface StreamSharedContext {
  clientMessageId: string;
  normalizedClientId: string;
  controller: AbortController;
  ensureAssistantMessage: EnsureAssistantMessageFn;
  setMessages: Dispatch<SetStateAction<ChatMessageType[]>>;
  upsertMessage?: (message: ChatMessageType, options?: UpsertMessageOptions) => void;
  activeAssistantIdRef: MutableRefObject<string | null>;
  activeStreamClientIdRef: MutableRefObject<string | null>;
  activeClientIdRef: MutableRefObject<string | null>;
  hasFirstChunkRef: MutableRefObject<boolean>;
  setDigitando: Dispatch<SetStateAction<boolean>>;
  updateCurrentInteractionId: (next: string | null | undefined) => void;
  streamTimersRef: MutableRefObject<Record<string, { startedAt: number; firstChunkAt?: number }>>;
  logSse: (
    phase: "open" | "start" | "first-chunk" | "delta" | "done" | "abort",
    payload: Record<string, unknown>,
  ) => void;
  replyState: ReplyStateController;
  tracking: MessageTrackingRefs;
  interactionCacheDispatch?: (action: InteractionMapAction) => void;
  streamStats: StreamRunStats;
}

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
}

export class StreamSession {
  private readonly params: BeginStreamParams;
  private readonly inflightControllers: Map<string, AbortController>;
  private readonly streamStartLogged: Set<string>;
  private readonly logDev: (label: string, payload: Record<string, unknown>) => void;

  private controller: AbortController | null = null;
  private clientMessageId: string | null = null;
  private normalizedClientId: string | null = null;
  private guardTimeoutMs = DEFAULT_STREAM_GUARD_TIMEOUT_MS;
  private diagForceJson = false;
  private requestMethod: "GET" | "POST" = "GET";
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
    const requestMethod: "GET" | "POST" = diagForceJson ? "POST" : "GET";
    const acceptHeader = diagForceJson ? "application/json" : "text/event-stream";
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

    this.watchdog = createSseWatchdogs(this.normalizedClientId);
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
  firstChunkState: { value: boolean };
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
  private readonly firstChunkState: { value: boolean };

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
    this.firstChunkState = options.firstChunkState;
  }

  initializeTypingWatchdog(onTimeout: () => void) {
    this.clearTypingWatchdog = withTypingWatchdog(
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
      if (typeof window !== "undefined") {
        window.clearTimeout(this.fallbackGuardTimer);
      } else {
        clearTimeout(this.fallbackGuardTimer);
      }
    } catch {
      clearTimeout(this.fallbackGuardTimer);
    }
    this.fallbackGuardTimer = null;
  }

  startFallbackGuardTimer(triggerJsonFallback: (reason: string) => void) {
    if (!this.fallbackEnabled) return;
    if (this.guardTimeoutMs <= 0) return;
    if (typeof window === "undefined") return;
    this.clearFallbackGuardTimer();
    this.fallbackGuardTimer = window.setTimeout(() => {
      const controller = this.session.getController();
      if (controller.signal.aborted || this.sharedContext.hasFirstChunkRef.current) return;
      if (this.firstChunkState.value) return;
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
    if (this.firstChunkState.value || this.sharedContext.hasFirstChunkRef.current) {
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
    if (this.firstChunkState.value || this.sharedContext.hasFirstChunkRef.current) {
      return false;
    }

    const controller = this.session.getController();
    if (
      this.activeStreamClientIdRef.current !== this.session.getClientMessageId() ||
      !this.streamActiveRef.current
    ) {
      return false;
    }

    const abortReason = (controller.signal as AbortSignal & { reason?: unknown }).reason;
    const normalizedAbortReason = this.resolveAbortReason(abortReason);
    if (normalizedAbortReason === "new-send" || normalizedAbortReason === "ui_abort") {
      return false;
    }

    const started = this.beginFallback(options.reason ?? "json_fallback");
    if (!started) {
      return false;
    }

    this.abortSseForFallback(options.reason);

    const { reason = "json_fallback", logError } = options;
    this.streamStats.jsonFallbackAttempts = (this.streamStats.jsonFallbackAttempts ?? 0) + 1;

    if (logError !== undefined) {
      console.error("[SSE] Stream failed, tentando JSON", logError);
    }

    try {
      const fallbackUrl = buildAskEcoUrl(undefined, {
        clientMessageId: this.session.getClientMessageId(),
      });
      const fallbackGuestId = this.session.getEffectiveGuestId();
      const fallbackSessionId = this.session.getEffectiveSessionId();
      const fallbackHeaders: Record<string, string> = {
        ...this.baseHeaders(),
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Eco-Guest-Id": fallbackGuestId,
        "X-Eco-Session-Id": fallbackSessionId,
        "X-Client-Id": this.session.getNormalizedClientId() || "webapp",
        ...(this.session.getClientMessageId()
          ? {
              "X-Eco-Client-Message-Id": this.session.getClientMessageId(),
              "x-eco-client-message-id": this.session.getClientMessageId(),
            }
          : {}),
      };

      const fallbackController = new AbortController();
      const payload = this.getRequestPayload();
      const fallbackFetch =
        typeof globalThis.fetch === "function" ? (globalThis.fetch as typeof fetch) : fetch;
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
        this.firstChunkState.value = true;
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
