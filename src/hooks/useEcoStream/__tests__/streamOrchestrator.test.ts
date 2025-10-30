import { describe, expect, it, vi } from "vitest";

import type { Dispatch, SetStateAction } from "react";
import type { Message, UpsertMessageOptions } from "../../../contexts/ChatContext";
import type { MessageTrackingRefs, ReplyStateController } from "../messageState";
import { beginStream, handleDone, type StreamRunStats } from "../streamOrchestrator";

const createRef = <T>(value: T) => ({ current: value });

type SetErroApiArg = string | null | ((prev: string | null) => string | null);

process.on("unhandledRejection", (reason) => {
  if (reason instanceof Error) {
    const message = reason.message ?? "";
    if (
      message.includes("network_error") ||
      message.includes("Resposta inválida") ||
      message.includes("skipped_in_test_env")
    ) {
      return;
    }
  }
  throw reason;
});

describe("handleDone", () => {
  it("usa texto do payload done quando nenhum chunk foi agregado", async () => {
    const assistantId = "assistant-1";
    const clientMessageId = "client-1";
    const donePayload = {
      type: "done",
      response: {
        messages: [
          {
            role: "assistant",
            content: [
              { type: "output_text", text: "Olá" },
              { type: "output_text", text: " mundo" },
            ],
          },
        ],
      },
    };

    let messages: Message[] = [
      {
        id: assistantId,
        sender: "eco",
        status: "streaming",
        streaming: true,
      },
    ];

    const setMessagesImpl = (
      updater: Message[] | ((prev: Message[]) => Message[]),
    ) => {
      messages =
        typeof updater === "function"
          ? (updater as (prev: Message[]) => Message[])(messages)
          : updater;
    };
    const setMessages = vi.fn<
      (updater: Message[] | ((prev: Message[]) => Message[])) => void
    >(setMessagesImpl);

    const upsertMessage = vi.fn();
    const setDigitando = vi.fn();
    const updateCurrentInteractionId = vi.fn();

    const replyState: ReplyStateController = {
      ecoReplyByAssistantId: {},
      setEcoReplyByAssistantId: vi.fn(),
      ecoReplyStateRef: createRef({}),
    };

    const tracking: MessageTrackingRefs = {
      assistantByClientRef: createRef({ [clientMessageId]: assistantId }),
      clientByAssistantRef: createRef({ [assistantId]: clientMessageId }),
      pendingAssistantMetaRef: createRef({}),
      userTextByClientIdRef: createRef({ [clientMessageId]: "Pergunta" }),
    };

    const streamStats: StreamRunStats = {
      aggregatedLength: 0,
      gotAnyChunk: false,
    };

    handleDone({
      event: { payload: donePayload },
      assistantId,
      clientMessageId,
      normalizedClientId: clientMessageId,
      controller: new AbortController(),
      ensureAssistantMessage: vi.fn(),
      setMessages,
      upsertMessage,
      activeAssistantIdRef: createRef<string | null>(assistantId),
      activeStreamClientIdRef: createRef<string | null>(clientMessageId),
      activeClientIdRef: createRef<string | null>(clientMessageId),
      hasFirstChunkRef: createRef(false),
      setDigitando,
      updateCurrentInteractionId,
      streamTimersRef: createRef({}),
      logSse: vi.fn(),
      replyState,
      tracking,
      interactionCacheDispatch: undefined,
      streamStats,
      setErroApi: vi.fn(),
      removeEcoEntry: vi.fn(),
    });

    await Promise.resolve();

    expect(setDigitando).toHaveBeenCalledWith(false);
    expect(tracking.userTextByClientIdRef.current[clientMessageId]).toBeUndefined();
    expect(upsertMessage).toHaveBeenCalledTimes(1);
    expect(upsertMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        id: assistantId,
        content: "Olá mundo",
        text: "Olá mundo",
        status: "done",
        streaming: false,
        donePayload,
      }),
      expect.objectContaining({ patchSource: "stream_done" })
    );
    expect(updateCurrentInteractionId).not.toHaveBeenCalled();
    expect(messages).toHaveLength(1);
  });

  it("consolida texto quando payload usa estruturas aninhadas", async () => {
    const assistantId = "assistant-1";
    const clientMessageId = "client-1";
    const donePayload = {
      type: "response.completed",
      response: {
        messages: [
          {
            role: "assistant",
            content: [
              {
                type: "output_text",
                text: { value: "Olá" },
              },
              {
                type: "output_text",
                text: { value: " mundo" },
              },
            ],
          },
        ],
      },
      metadata: {
        answer: { content: { text: "Olá mundo" } },
      },
    };

    const upsertMessage = vi.fn();

    handleDone({
      event: { payload: donePayload },
      assistantId,
      clientMessageId,
      normalizedClientId: clientMessageId,
      controller: new AbortController(),
      ensureAssistantMessage: vi.fn(),
      setMessages: vi.fn(),
      upsertMessage,
      activeAssistantIdRef: createRef<string | null>(assistantId),
      activeStreamClientIdRef: createRef<string | null>(clientMessageId),
      activeClientIdRef: createRef<string | null>(clientMessageId),
      hasFirstChunkRef: createRef(false),
      setDigitando: vi.fn(),
      updateCurrentInteractionId: vi.fn(),
      streamTimersRef: createRef({}),
      logSse: vi.fn(),
      replyState: {
        ecoReplyByAssistantId: {},
        setEcoReplyByAssistantId: vi.fn(),
        ecoReplyStateRef: createRef({}),
      },
      tracking: {
        assistantByClientRef: createRef({ [clientMessageId]: assistantId }),
        clientByAssistantRef: createRef({ [assistantId]: clientMessageId }),
        pendingAssistantMetaRef: createRef({}),
        userTextByClientIdRef: createRef({}),
      },
      interactionCacheDispatch: undefined,
      streamStats: { aggregatedLength: 0, gotAnyChunk: false },
      setErroApi: vi.fn(),
      removeEcoEntry: vi.fn(),
    });

    await Promise.resolve();

    expect(upsertMessage).toHaveBeenCalledWith(
      expect.objectContaining({ content: "Olá mundo", text: "Olá mundo" }),
      expect.objectContaining({ patchSource: "stream_done" }),
    );
  });

  it("recupera texto de payloads com responseBody e candidates", async () => {
    const assistantId = "assistant-1";
    const clientMessageId = "client-1";
    const donePayload = {
      type: "done",
      responseBody: {
        data: {
          assistantResponse: {
            candidates: [
              {
                messages: [
                  {
                    content: [
                      {
                        type: "output_text",
                        text: {
                          values: [{ value: "Olá" }, { value: " mundo" }],
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
    };

    const upsertMessage = vi.fn();

    handleDone({
      event: { payload: donePayload },
      assistantId,
      clientMessageId,
      normalizedClientId: clientMessageId,
      controller: new AbortController(),
      ensureAssistantMessage: vi.fn(),
      setMessages: vi.fn(),
      upsertMessage,
      activeAssistantIdRef: createRef<string | null>(assistantId),
      activeStreamClientIdRef: createRef<string | null>(clientMessageId),
      activeClientIdRef: createRef<string | null>(clientMessageId),
      hasFirstChunkRef: createRef(false),
      setDigitando: vi.fn(),
      updateCurrentInteractionId: vi.fn(),
      streamTimersRef: createRef({}),
      logSse: vi.fn(),
      replyState: {
        ecoReplyByAssistantId: {},
        setEcoReplyByAssistantId: vi.fn(),
        ecoReplyStateRef: createRef({}),
      },
      tracking: {
        assistantByClientRef: createRef({ [clientMessageId]: assistantId }),
        clientByAssistantRef: createRef({ [assistantId]: clientMessageId }),
        pendingAssistantMetaRef: createRef({}),
        userTextByClientIdRef: createRef({}),
      },
      interactionCacheDispatch: undefined,
      streamStats: { aggregatedLength: 0, gotAnyChunk: false },
      setErroApi: vi.fn(),
      removeEcoEntry: vi.fn(),
    });

    await Promise.resolve();

    expect(upsertMessage).toHaveBeenCalledWith(
      expect.objectContaining({ content: "Olá mundo", text: "Olá mundo" }),
      expect.objectContaining({ patchSource: "stream_done" }),
    );
  });

  it("usa texto agregado quando done chega sem payload estruturado", async () => {
    const assistantId = "assistant-1";
    const clientMessageId = "client-1";
    const aggregatedText = "Resposta parcial agregada";

    const replyState: ReplyStateController = {
      ecoReplyByAssistantId: {},
      setEcoReplyByAssistantId: vi.fn(),
      ecoReplyStateRef: createRef({
        [assistantId]: { text: aggregatedText, chunkIndexMax: 0 },
      }),
    };

    const tracking: MessageTrackingRefs = {
      assistantByClientRef: createRef({ [clientMessageId]: assistantId }),
      clientByAssistantRef: createRef({ [assistantId]: clientMessageId }),
      pendingAssistantMetaRef: createRef({}),
      userTextByClientIdRef: createRef({}),
    };

    const upsertMessage = vi.fn();

    handleDone({
      event: { payload: { type: "done" } },
      assistantId,
      clientMessageId,
      normalizedClientId: clientMessageId,
      controller: new AbortController(),
      ensureAssistantMessage: vi.fn(),
      setMessages: vi.fn(),
      upsertMessage,
      activeAssistantIdRef: createRef<string | null>(assistantId),
      activeStreamClientIdRef: createRef<string | null>(clientMessageId),
      activeClientIdRef: createRef<string | null>(clientMessageId),
      hasFirstChunkRef: createRef(true),
      setDigitando: vi.fn(),
      updateCurrentInteractionId: vi.fn(),
      streamTimersRef: createRef({}),
      logSse: vi.fn(),
      replyState,
      tracking,
      interactionCacheDispatch: undefined,
      streamStats: { aggregatedLength: aggregatedText.length, gotAnyChunk: true },
      setErroApi: vi.fn(),
      removeEcoEntry: vi.fn(),
    });

    await Promise.resolve();

    expect(upsertMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        id: assistantId,
        text: aggregatedText,
        content: aggregatedText,
        status: "done",
      }),
      expect.objectContaining({ patchSource: "stream_done" }),
    );
  });
});

describe("beginStream start error", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("marks placeholder message as error when stream start fails (setMessages path)", async () => {
    const controllerOverride = new AbortController();
    const controllerRef = createRef<AbortController | null>(null);
    const streamTimersRef = createRef<Record<string, { startedAt: number; firstChunkAt?: number }>>({});
    const activeStreamClientIdRef = createRef<string | null>(null);
    const activeAssistantIdRef = createRef<string | null>(null);
    const streamActiveRef = createRef<boolean>(false);
    const activeClientIdRef = createRef<string | null>("client-1");
    const hasFirstChunkRef = createRef<boolean>(false);
    const setDigitando = vi.fn();
    const setIsSending = vi.fn();
    const setErroApi = vi.fn<(value: SetErroApiArg) => void>();
    const updateCurrentInteractionId = vi.fn();
    const logSse = vi.fn();
    const removeEcoEntry = vi.fn();

    const assistantId = "assistant-1";
    const clientMessageId = "client-1";

    let messages: Message[] = [
      {
        id: assistantId,
        sender: "eco",
        streaming: true,
        status: "streaming",
      },
    ];
    const snapshots: Message[][] = [];
    const setMessages = vi.fn<
      (updater: Message[] | ((prev: Message[]) => Message[])) => void
    >((updater) => {
      messages =
        typeof updater === "function"
          ? (updater as (prev: Message[]) => Message[])(messages)
          : updater;
      snapshots.push(messages.map((message) => ({ ...message })));
    });

    const replyState: ReplyStateController = {
      ecoReplyByAssistantId: {},
      setEcoReplyByAssistantId: vi.fn(),
      ecoReplyStateRef: createRef({}),
    };
    const tracking: MessageTrackingRefs = {
      assistantByClientRef: createRef({ [clientMessageId]: assistantId }),
      clientByAssistantRef: createRef({ [assistantId]: clientMessageId }),
      pendingAssistantMetaRef: createRef({}),
      userTextByClientIdRef: createRef({}),
    };

    const ensureAssistantMessage = vi.fn(() => {
      tracking.assistantByClientRef.current[clientMessageId] = assistantId;
      tracking.clientByAssistantRef.current[assistantId] = clientMessageId;
      return assistantId;
    });

    const history: Message[] = [
      { id: clientMessageId, sender: "user", text: "Olá" },
    ];
    const userMessage: Message = { id: clientMessageId, sender: "user", text: "Olá" };

    const streamPromise = beginStream({
      history,
      userMessage,
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
      setErroApi: setErroApi as unknown as Dispatch<SetStateAction<string | null>>,
      activity: undefined,
      ensureAssistantMessage: ensureAssistantMessage as any,
      removeEcoEntry,
      updateCurrentInteractionId,
      logSse,
      userId: undefined,
      userName: undefined,
      guestId: undefined,
      isGuest: false,
      interactionCacheDispatch: undefined,
      setMessages,
      upsertMessage: undefined,
      replyState,
      tracking,
    }) as Promise<StreamRunStats>;

    await streamPromise.catch(() => undefined);
    await Promise.resolve();

    expect(messages).toHaveLength(1);
    const errorSnapshotMessage = (() => {
      for (const list of snapshots) {
        const found = list.find(
          (message) =>
            message.id === assistantId && message.streaming === false && message.status === "error",
        );
        if (found) return found;
      }
      return null;
    })();
    expect(errorSnapshotMessage).not.toBeNull();
    const errorText = errorSnapshotMessage?.text ?? "";
    expect(typeof errorText).toBe("string");
    expect(errorText.length).toBeGreaterThan(0);
    expect(removeEcoEntry).toHaveBeenCalledWith(assistantId);
  });

  it("upserts fallback error message when stream start fails", async () => {
    const controllerOverride = new AbortController();
    const controllerRef = createRef<AbortController | null>(null);
    const streamTimersRef = createRef<Record<string, { startedAt: number; firstChunkAt?: number }>>({});
    const activeStreamClientIdRef = createRef<string | null>(null);
    const activeAssistantIdRef = createRef<string | null>(null);
    const streamActiveRef = createRef<boolean>(false);
    const activeClientIdRef = createRef<string | null>("client-2");
    const hasFirstChunkRef = createRef<boolean>(false);
    const setDigitando = vi.fn();
    const setIsSending = vi.fn();
    const setErroApi = vi.fn<(value: SetErroApiArg) => void>();
    const updateCurrentInteractionId = vi.fn();
    const logSse = vi.fn();
    const removeEcoEntry = vi.fn();

    const assistantId = "assistant-2";
    const clientMessageId = "client-2";

    let messages: Message[] = [
      {
        id: assistantId,
        sender: "eco",
        streaming: true,
        status: "streaming",
      },
    ];
    const setMessages = vi.fn<
      (updater: Message[] | ((prev: Message[]) => Message[])) => void
    >((updater) => {
      messages =
        typeof updater === "function"
          ? (updater as (prev: Message[]) => Message[])(messages)
          : updater;
    });

    const upsertMessage = vi.fn<
      (message: Message, options?: UpsertMessageOptions) => void
    >((patch) => {
      const index = messages.findIndex((message) => message.id === patch.id);
      if (index >= 0) {
        messages[index] = { ...messages[index], ...patch };
      } else {
        messages.push({ ...patch, sender: "eco" });
      }
    });

    const replyState: ReplyStateController = {
      ecoReplyByAssistantId: {},
      setEcoReplyByAssistantId: vi.fn(),
      ecoReplyStateRef: createRef({}),
    };
    const tracking: MessageTrackingRefs = {
      assistantByClientRef: createRef({ [clientMessageId]: assistantId }),
      clientByAssistantRef: createRef({ [assistantId]: clientMessageId }),
      pendingAssistantMetaRef: createRef({}),
      userTextByClientIdRef: createRef({}),
    };

    const ensureAssistantMessage = vi.fn(() => {
      tracking.assistantByClientRef.current[clientMessageId] = assistantId;
      tracking.clientByAssistantRef.current[assistantId] = clientMessageId;
      return assistantId;
    });

    const history: Message[] = [
      { id: clientMessageId, sender: "user", text: "Oi" },
    ];
    const userMessage: Message = { id: clientMessageId, sender: "user", text: "Oi" };

    const streamPromise = beginStream({
      history,
      userMessage,
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
      setErroApi: setErroApi as unknown as Dispatch<SetStateAction<string | null>>,
      activity: undefined,
      ensureAssistantMessage: ensureAssistantMessage as any,
      removeEcoEntry,
      updateCurrentInteractionId,
      logSse,
      userId: undefined,
      userName: undefined,
      guestId: undefined,
      isGuest: false,
      interactionCacheDispatch: undefined,
      setMessages,
      upsertMessage: upsertMessage as any,
      replyState,
      tracking,
    }) as Promise<StreamRunStats>;

    await streamPromise.catch(() => undefined);
    await Promise.resolve();

    const startErrorPatch = upsertMessage.mock.calls.find(([, options]) => options?.patchSource === "stream_start_error");
    const patchedMessage = startErrorPatch?.[0] as Message | undefined;
    expect(patchedMessage).toMatchObject({ id: assistantId, streaming: false, status: "error" });
    expect(typeof patchedMessage?.text).toBe("string");
    expect((patchedMessage?.text ?? "").length).toBeGreaterThan(0);
    expect(messages[0]).toMatchObject({
      id: assistantId,
      streaming: false,
      status: "error",
      text: patchedMessage?.text,
    });
    expect(removeEcoEntry).toHaveBeenCalledWith(assistantId);
  });
});

describe("beginStream fallback", () => {
  const originalMode = import.meta.env.MODE;
  const originalVitestFlag = import.meta.env.VITEST;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalProcessVitest = process.env.VITEST;
  const originalWorkerId = process.env.VITEST_WORKER_ID;
  const originalFetch = global.fetch;

  beforeEach(() => {
    import.meta.env.MODE = "development";
    delete import.meta.env.VITEST;
    process.env.NODE_ENV = "development";
    delete process.env.VITEST;
    delete process.env.VITEST_WORKER_ID;
  });

  afterEach(() => {
    import.meta.env.MODE = originalMode;
    if (originalVitestFlag === undefined) {
      delete import.meta.env.VITEST;
    } else {
      import.meta.env.VITEST = originalVitestFlag;
    }
    process.env.NODE_ENV = originalNodeEnv;
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
    if (originalFetch) {
      global.fetch = originalFetch;
    } else {
      delete (global as { fetch?: typeof fetch }).fetch;
    }
    vi.restoreAllMocks();
  });

  it("aborts the SSE controller before starting the fallback POST", async () => {
    const controllerOverride = new AbortController();
    const fallbackResponse = {
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({ text: "fallback" }),
      text: async () => JSON.stringify({ text: "fallback" }),
    } as unknown as Response;

    const fetchImpl = vi.fn<typeof fetch>((_url, init) => {
      const method = typeof init?.method === "string" ? init.method.toUpperCase() : "GET";
      if (method === "HEAD") {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers(),
          text: async () => "",
        } as unknown as Response);
      }
      if (method === "GET") {
        return Promise.reject(new Error("network_error"));
      }
      expect(controllerOverride.signal.aborted).toBe(true);
      return Promise.resolve(fallbackResponse);
    });

    global.fetch = fetchImpl;

    const controllerRef = createRef<AbortController | null>(null);
    const streamTimersRef = createRef<Record<string, { startedAt: number; firstChunkAt?: number }>>({});
    const activeStreamClientIdRef = createRef<string | null>(null);
    const activeAssistantIdRef = createRef<string | null>(null);
    const streamActiveRef = createRef<boolean>(false);
    const activeClientIdRef = createRef<string | null>("client-1");
    const hasFirstChunkRef = createRef<boolean>(false);
    const setDigitando = vi.fn();
    const setIsSending = vi.fn();
    const setErroApi = vi.fn();
    const ensureAssistantMessage = vi.fn(() => "assistant-1");
    const removeEcoEntry = vi.fn();
    const updateCurrentInteractionId = vi.fn();
    const logSse = vi.fn();
    const upsertMessage = vi.fn();
    const replyState: ReplyStateController = {
      ecoReplyByAssistantId: {},
      setEcoReplyByAssistantId: vi.fn(),
      ecoReplyStateRef: createRef({}),
    };
    const tracking: MessageTrackingRefs = {
      assistantByClientRef: createRef({}),
      clientByAssistantRef: createRef({}),
      pendingAssistantMetaRef: createRef({}),
      userTextByClientIdRef: createRef({}),
    };

    let messages: Message[] = [];
    const setMessages = vi.fn<
      (updater: Message[] | ((prev: Message[]) => Message[])) => void
    >((updater) => {
      messages =
        typeof updater === "function"
          ? (updater as (prev: Message[]) => Message[])(messages)
          : updater;
    });

    const history: Message[] = [
      { id: "client-1", sender: "user", text: "Olá" },
    ];
    const userMessage: Message = { id: "client-1", sender: "user", text: "Olá" };

    const streamPromise = beginStream({
      history,
      userMessage,
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
      ensureAssistantMessage: ensureAssistantMessage as any,
      removeEcoEntry,
      updateCurrentInteractionId,
      logSse,
      userId: undefined,
      userName: undefined,
      guestId: undefined,
      isGuest: false,
      interactionCacheDispatch: undefined,
      setMessages,
      upsertMessage,
      replyState,
      tracking,
    }) as Promise<StreamRunStats>;

    await streamPromise.catch(() => undefined);
    for (let i = 0; i < 5; i += 1) {
      const hasPost = fetchImpl.mock.calls.some(([, init]) =>
        typeof (init as RequestInit | undefined)?.method === "string"
          ? ((init as RequestInit).method as string).toUpperCase() === "POST"
          : false,
      );
      if (hasPost) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    const postCall = fetchImpl.mock.calls.find(([, init]) =>
      typeof (init as RequestInit | undefined)?.method === "string"
        ? ((init as RequestInit).method as string).toUpperCase() === "POST"
        : false,
    );
    expect(postCall).toBeDefined();
    expect(streamActiveRef.current).toBe(false);
    expect(setDigitando.mock.calls.at(-1)?.[0]).toBe(false);
  });
});
