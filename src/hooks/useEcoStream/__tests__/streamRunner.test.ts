import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import type { Dispatch, SetStateAction } from "react";

import type { Message, UpsertMessageOptions } from "../../../contexts/ChatContext";
import type { MessageTrackingRefs, ReplyStateController } from "../messageState";
import * as streamOrchestrator from "../streamOrchestrator";
import type {
  StreamRunStats,
  StreamRunnerFactoryOptions,
  StreamRunnerTimers,
} from "../streamOrchestrator";

type BeginStreamParams = Parameters<typeof streamOrchestrator.beginStream>[0];

const createRef = <T>(value: T) => ({ current: value });

const createManualTimers = () => {
  const queue: {
    handle: ReturnType<typeof setTimeout>;
    active: boolean;
    run: () => void;
    timeout: number;
  }[] = [];
  const registry = new Set<ReturnType<typeof setTimeout>>();
  const timers: StreamRunnerTimers = {
    setTimeout: ((handler: (...args: any[]) => void, ms?: number, ...args: any[]) => {
      const handle = Symbol("timer") as unknown as ReturnType<typeof setTimeout>;
      registry.add(handle);
      queue.push({ handle, active: true, run: () => handler(...args), timeout: typeof ms === "number" ? ms : 0 });
      return handle;
    }) as StreamRunnerTimers["setTimeout"],
    clearTimeout: ((handle: ReturnType<typeof setTimeout>) => {
      for (const item of queue) {
        if (item.handle === handle) {
          item.active = false;
        }
      }
      registry.delete(handle);
    }) as StreamRunnerTimers["clearTimeout"],
  };

  const runNext = () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) return false;
      if (!item.active) continue;
      if (item.timeout >= 45_000) {
        // Ignore typing watchdog timers during tests
        item.active = false;
        registry.delete(item.handle);
        continue;
      }
      item.active = false;
      registry.delete(item.handle);
      item.run();
      return true;
    }
    return false;
  };

  const runAll = () => {
    while (runNext()) {
      // keep draining
    }
  };

  const hasPending = () => queue.some((item) => item.active);
  const pendingCount = () => queue.filter((item) => item.active).length;

  return { timers, runNext, runAll, hasPending, pendingCount };
};

const flushManualTimersUntil = async (
  harness: ReturnType<typeof createManualTimers>,
  predicate: () => boolean,
  maxIterations: number = 25,
) => {
  for (let i = 0; i < maxIterations && !predicate(); i += 1) {
    if (harness.hasPending()) {
      harness.runAll();
    }
    await Promise.resolve();
  }
  await Promise.resolve();
  if (harness.hasPending()) {
    harness.runAll();
  }
};

const createWatchdogStub = () => ({
  markPromptReady: vi.fn(),
  bumpFirstToken: vi.fn(),
  bumpHeartbeat: vi.fn(),
  clear: vi.fn(),
  get sincePromptReadyMs() {
    return 0;
  },
});

const buildBaseParams = (
  overrides: Partial<BeginStreamParams> = {},
  extra?: {
    setErroApiMock?: Dispatch<SetStateAction<string | null>>;
    setMessagesMock?: (updater: Message[] | ((prev: Message[]) => Message[])) => void;
    upsertMessageMock?: (message: Message, options?: UpsertMessageOptions) => void;
    clientId?: string;
    assistantId?: string;
  },
) => {
  const overrideUserMessage = overrides.userMessage as Message | undefined;
  const assistantId = extra?.assistantId ?? "assistant-eco";
  const clientMessageId =
    extra?.clientId ??
    (typeof overrideUserMessage?.id === "string" && overrideUserMessage.id.trim()
      ? overrideUserMessage.id
      : "client-eco");
  const controllerOverride = new AbortController();
  const controllerRef = createRef<AbortController | null>(null);
  const streamTimersRef = createRef<Record<string, { startedAt: number; firstChunkAt?: number }>>({});
  const activeStreamClientIdRef = createRef<string | null>(null);
  const activeAssistantIdRef = createRef<string | null>(null);
  const streamActiveRef = createRef<boolean>(false);
  const activeClientIdRef = createRef<string | null>(clientMessageId);
  const hasFirstChunkRef = createRef<boolean>(false);
  const setDigitando = vi.fn<Dispatch<SetStateAction<boolean>>>();
  const setIsSending = vi.fn<Dispatch<SetStateAction<boolean>>>();
  const setErroApi =
    extra?.setErroApiMock ??
    (vi.fn<Dispatch<SetStateAction<string | null>>>() as Dispatch<SetStateAction<string | null>>);
  const updateCurrentInteractionId = vi.fn();
  const logSse = vi.fn();
  let messages: Message[] = [
    { id: assistantId, sender: "eco", status: "streaming", streaming: true },
  ];
  const setMessagesImpl = (
    updater: Message[] | ((prev: Message[]) => Message[]),
  ) => {
    messages =
      typeof updater === "function"
        ? (updater as (prev: Message[]) => Message[])(messages)
        : updater;
  };
  const setMessages = vi
    .fn<(updater: Message[] | ((prev: Message[]) => Message[])) => void>()
    .mockImplementation(extra?.setMessagesMock ?? setMessagesImpl);

  const removeEcoEntry = vi.fn((assistantMessageId?: string | null) => {
    if (!assistantMessageId) return;
    messages = messages.filter((message) => message.id !== assistantMessageId);
  });

  const replyState: ReplyStateController = {
    ecoReplyByAssistantId: {},
    setEcoReplyByAssistantId: vi.fn(),
    ecoReplyStateRef: createRef({}),
  };

  const tracking: MessageTrackingRefs = {
    assistantByClientRef: createRef<Record<string, string>>({}),
    clientByAssistantRef: createRef<Record<string, string>>({}),
    pendingAssistantMetaRef: createRef({}),
    userTextByClientIdRef: createRef<Record<string, string>>({}),
  };

  const ensureAssistantMessage = vi.fn(() => {
    tracking.assistantByClientRef.current[clientMessageId] = assistantId;
    tracking.clientByAssistantRef.current[assistantId] = clientMessageId;
    if (!messages.some((message) => message.id === assistantId)) {
      messages = [
        ...messages,
        { id: assistantId, sender: "eco", streaming: true, status: "streaming" },
      ];
    }
    return assistantId;
  });

  const params: BeginStreamParams = {
    history: [{ id: clientMessageId, sender: "user", text: "Olá" }],
    userMessage: { id: clientMessageId, sender: "user", text: "Olá" },
    systemHint: undefined,
    controllerOverride,
    controllerRef,
    streamTimersRef,
    activeStreamClientIdRef,
    activeAssistantIdRef,
    streamActiveRef,
    activeClientIdRef,
    onFirstChunk: undefined,
    hasFirstChunkRef,
    setDigitando,
    setIsSending,
    setErroApi,
    activity: undefined,
    ensureAssistantMessage,
    removeEcoEntry,
    updateCurrentInteractionId,
    logSse,
    userId: undefined,
    userName: undefined,
    guestId: undefined,
    isGuest: false,
    interactionCacheDispatch: undefined,
    setMessages,
    upsertMessage: extra?.upsertMessageMock,
    replyState,
    tracking,
    ...overrides,
  };

  return {
    params,
    context: {
      assistantId,
      clientMessageId,
      controllerOverride,
      controllerRef,
      streamTimersRef,
      activeStreamClientIdRef,
      activeAssistantIdRef,
      streamActiveRef,
      activeClientIdRef,
      hasFirstChunkRef,
      setDigitando,
      setIsSending,
      setErroApi,
      updateCurrentInteractionId,
      logSse,
      removeEcoEntry,
      messagesRef: () => messages,
      setMessages,
      ensureAssistantMessage,
      replyState,
      tracking,
    },
  };
};

const createSseResponse = (events: Array<Record<string, unknown>>) => {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const event of events) {
        const payload = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      }
      controller.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: new Headers({ "content-type": "text/event-stream" }),
  });
};

const createHangingSseResponse = (signal?: AbortSignal) => {
  let abortHandler: (() => void) | null = null;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      if (signal?.aborted) {
        controller.error(new DOMException("Aborted", "AbortError"));
        return;
      }
      abortHandler = () => {
        try {
          controller.error(new DOMException("Aborted", "AbortError"));
        } catch {
          controller.close();
        }
      };
      signal?.addEventListener("abort", abortHandler);
    },
    cancel() {
      if (abortHandler) {
        signal?.removeEventListener("abort", abortHandler);
      }
    },
  });
  return new Response(stream, {
    status: 200,
    headers: new Headers({ "content-type": "text/event-stream" }),
  });
};

describe("createStreamRunner", () => {
  const originalMode = import.meta.env.MODE;
  const originalVitestFlag = import.meta.env.VITEST;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalProcessVitest = process.env.VITEST;
  const originalWorkerId = process.env.VITEST_WORKER_ID;
  const originalGuardTimeoutMeta = import.meta.env.VITE_ECO_STREAM_GUARD_TIMEOUT_MS;
  const originalGuardTimeoutProcess = process.env.VITE_ECO_STREAM_GUARD_TIMEOUT_MS;
  const originalEcoDiag = (globalThis as typeof globalThis & {
    __ecoDiag?: { forceJson?: boolean };
  }).__ecoDiag;
  const originalWindowEcoDiag = (typeof window !== "undefined"
    ? (window as typeof window & { __ecoDiag?: { forceJson?: boolean } }).__ecoDiag
    : undefined);

  beforeEach(() => {
    import.meta.env.MODE = "development";
    delete import.meta.env.VITEST;
    import.meta.env.VITE_ECO_STREAM_GUARD_TIMEOUT_MS = "1";
    process.env.NODE_ENV = "development";
    delete process.env.VITEST;
    delete process.env.VITEST_WORKER_ID;
    process.env.VITE_ECO_STREAM_GUARD_TIMEOUT_MS = "1";
    const diagPayload = { forceJson: true };
    (globalThis as typeof globalThis & { __ecoDiag?: { forceJson?: boolean } }).__ecoDiag = diagPayload;
    if (typeof window !== "undefined") {
      (window as typeof window & { __ecoDiag?: { forceJson?: boolean } }).__ecoDiag = diagPayload;
    }
  });

  afterEach(() => {
    import.meta.env.MODE = originalMode;
    if (originalVitestFlag === undefined) {
      delete import.meta.env.VITEST;
    } else {
      import.meta.env.VITEST = originalVitestFlag;
    }
    if (originalGuardTimeoutMeta === undefined) {
      delete import.meta.env.VITE_ECO_STREAM_GUARD_TIMEOUT_MS;
    } else {
      import.meta.env.VITE_ECO_STREAM_GUARD_TIMEOUT_MS = originalGuardTimeoutMeta;
    }
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
    if (originalProcessVitest === undefined) {
      delete process.env.VITEST;
    } else {
      process.env.VITEST = originalProcessVitest;
    }
    if (originalWorkerId === undefined) {
      delete process.env.VITEST_WORKER_ID;
    } else {
      process.env.VITEST_WORKER_ID = originalWorkerId;
    }
    if (originalGuardTimeoutProcess === undefined) {
      delete process.env.VITE_ECO_STREAM_GUARD_TIMEOUT_MS;
    } else {
      process.env.VITE_ECO_STREAM_GUARD_TIMEOUT_MS = originalGuardTimeoutProcess;
    }
    if (originalEcoDiag === undefined) {
      delete (globalThis as typeof globalThis & { __ecoDiag?: { forceJson?: boolean } }).__ecoDiag;
    } else {
      (globalThis as typeof globalThis & { __ecoDiag?: { forceJson?: boolean } }).__ecoDiag =
        originalEcoDiag;
    }
    if (typeof window !== "undefined") {
      if (originalWindowEcoDiag === undefined) {
        delete (window as typeof window & { __ecoDiag?: { forceJson?: boolean } }).__ecoDiag;
      } else {
        (window as typeof window & { __ecoDiag?: { forceJson?: boolean } }).__ecoDiag =
          originalWindowEcoDiag;
      }
    }
    vi.restoreAllMocks();
  });

  it("streams prompt, chunk and done events from a custom ReadableStream", async () => {
    const { timers, runAll } = createManualTimers();
    const watchdogFactory = vi.fn(() => createWatchdogStub());
    const fetchImpl = vi.fn<NonNullable<StreamRunnerFactoryOptions["fetchImpl"]>>(async (_url, init) => {
      const method = (init?.method ?? "GET").toString().toUpperCase();
      if (method === "HEAD") {
        return new Response(null, { status: 200, headers: new Headers() });
      }
      return createSseResponse([
        { type: "control", name: "prompt_ready", payload: { interactionId: "ia-1" } },
        { type: "chunk", delta: "Olá" },
        { type: "chunk", delta: " mundo" },
        {
          type: "control",
          name: "done",
          payload: { text: "Olá mundo", metadata: { finish_reason: "stop" } },
        },
      ]);
    });

    const runner = streamOrchestrator.createStreamRunner({ fetchImpl, timers, watchdogFactory });
    const { params, context } = buildBaseParams({}, { clientId: "client-stream-success" });

    const result = (await runner.beginStream(params)) as StreamRunStats;

    runAll();

    expect(fetchImpl).toHaveBeenCalled();
    expect(result.gotAnyChunk).toBe(true);
    expect(result.aggregatedLength).toBeGreaterThanOrEqual(7);
    expect(context.setDigitando).toHaveBeenCalledWith(false);
    expect(context.setErroApi).not.toHaveBeenCalledWith(expect.any(String));
    expect(watchdogFactory).toHaveBeenCalledTimes(1);
    const [watchdogId, timersArg] = watchdogFactory.mock.calls[0];
    expect(watchdogId).toBe(params.userMessage.id);
    expect(timersArg).toMatchObject({
      setTimeout: expect.any(Function),
      clearTimeout: expect.any(Function),
    });
    const messages = context.messagesRef();
    const assistantMessage = messages.find((message) => message.id === context.assistantId);
    expect(assistantMessage).toBeTruthy();
    expect(assistantMessage).toMatchObject({ streaming: false, status: "done" });
    const renderedText = assistantMessage?.text ?? assistantMessage?.content;
    expect(renderedText).toContain("Olá");
  });

  it(
    "uses guard timeout to trigger JSON fallback when no chunks arrive",
    async () => {
    const timersHarness = createManualTimers();
    const { timers, hasPending, pendingCount } = timersHarness;
    const watchdogFactory = vi.fn(() => createWatchdogStub());
    let fallbackRequested = false;
    const fetchImpl = vi.fn<NonNullable<StreamRunnerFactoryOptions["fetchImpl"]>>(async (_url, init) => {
      const method = (init?.method ?? "GET").toString().toUpperCase();
      if (method === "HEAD") {
        return new Response(null, { status: 200, headers: new Headers() });
      }
      const isStreamRequest = init?.signal === context.controllerOverride.signal;
      if (isStreamRequest) {
        return createHangingSseResponse(init?.signal as AbortSignal | undefined);
      }
      fallbackRequested = true;
      return new Response(JSON.stringify({ text: "Resposta alternativa" }), {
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
      });
    });

    const runner = streamOrchestrator.createStreamRunner({ fetchImpl, timers, watchdogFactory });
    const { params, context } = buildBaseParams({}, { clientId: "client-guard-success" });

    const streamPromise = runner.beginStream(params) as Promise<StreamRunStats>;
    await Promise.resolve();
    expect(pendingCount()).toBeGreaterThan(0);
    await flushManualTimersUntil(timersHarness, () => fallbackRequested);
    const stats = await streamPromise;
    await flushManualTimersUntil(
      timersHarness,
      () => stats.gotAnyChunk === true || stats.jsonFallbackSucceeded === true,
    );

    expect(fallbackRequested).toBe(true);
    expect(stats.guardFallbackTriggered).toBe(true);
    expect(stats.jsonFallbackAttempts).toBe(1);
    expect(stats.gotAnyChunk).toBe(true);
    expect(context.setDigitando).toHaveBeenCalledWith(false);
    const messages = context.messagesRef();
    const assistantMessage = messages.find((message) => message.id === context.assistantId);
    expect(assistantMessage?.text ?? assistantMessage?.content).toContain("Resposta alternativa");
    },
    15000,
  );

  it(
    "records fallback errors when JSON request fails",
    async () => {
    const timersHarness = createManualTimers();
    const { timers, hasPending, pendingCount } = timersHarness;
    const watchdogFactory = vi.fn(() => createWatchdogStub());
    const fetchImpl = vi.fn<NonNullable<StreamRunnerFactoryOptions["fetchImpl"]>>(async (_url, init) => {
      const method = (init?.method ?? "GET").toString().toUpperCase();
      if (method === "HEAD") {
        return new Response(null, { status: 200, headers: new Headers() });
      }
      const isStreamRequest = init?.signal === context.controllerOverride.signal;
      if (isStreamRequest) {
        return createHangingSseResponse(init?.signal as AbortSignal | undefined);
      }
      return new Response("erro", {
        status: 500,
        headers: new Headers({ "content-type": "text/plain" }),
      });
    });

    const runner = streamOrchestrator.createStreamRunner({ fetchImpl, timers, watchdogFactory });
    const { params, context } = buildBaseParams({}, { clientId: "client-guard-failure" });

    const streamPromise = runner.beginStream(params) as Promise<StreamRunStats>;
    await Promise.resolve();
    expect(pendingCount()).toBeGreaterThan(0);
    await flushManualTimersUntil(timersHarness, () => context.setErroApi.mock.calls.length > 0);
    const stats = await streamPromise;
    await flushManualTimersUntil(timersHarness, () => stats.jsonFallbackAttempts === 1);

    expect(stats.guardFallbackTriggered).toBe(true);
    expect(stats.jsonFallbackAttempts).toBe(1);
    expect(stats.gotAnyChunk).toBe(false);
    expect(context.setErroApi).toHaveBeenCalledWith(
      expect.stringContaining("Eco não chegou a enviar nada"),
    );
    expect(context.setDigitando).toHaveBeenCalledWith(false);
    },
    15000,
  );
});
