import { describe, expect, it, vi } from "vitest";

import type { Message } from "../../../contexts/ChatContext";
import type { MessageTrackingRefs, ReplyStateController } from "../messageState";
import { beginStream, handleDone, type StreamRunStats } from "../streamOrchestrator";

const createRef = <T>(value: T) => ({ current: value });

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

describe("beginStream", () => {
  it("não inclui payload na query durante streaming", async () => {
    const mutableEnv = import.meta.env as Record<string, any>;
    const originalMode = mutableEnv.MODE;
    const originalModeLower = mutableEnv.mode;
    const originalVitestFlag = mutableEnv.VITEST;
    const originalNodeEnv = process.env.NODE_ENV;
    const originalProcessMode = process.env.MODE;
    const originalProcessVitest = process.env.VITEST;
    const originalWorkerId = process.env.VITEST_WORKER_ID;
    const originalFetch = globalThis.fetch;

    mutableEnv.MODE = "development";
    mutableEnv.mode = "development";
    mutableEnv.VITEST = undefined;
    process.env.NODE_ENV = "development";
    delete process.env.MODE;
    delete process.env.VITEST;
    delete process.env.VITEST_WORKER_ID;

    const fetchCalls: Array<{ url: string; init?: RequestInit }> = [];

    const fetchSpy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input instanceof URL ? input.toString() : typeof input === "string" ? input : input.url;
      fetchCalls.push({ url, init });

      const method = (init?.method ?? "GET").toUpperCase();
      if (method === "HEAD") {
        return new Response(null, { status: 200, headers: { "content-type": "text/event-stream" } });
      }

      if (method === "GET") {
        const encoder = new TextEncoder();
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(
              encoder.encode('event: done\ndata: {"type":"done","payload":{"source":"test"}}\n\n'),
            );
            controller.close();
          },
        });
        return new Response(stream, {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        });
      }

      return new Response(JSON.stringify({ text: "fallback" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });

    globalThis.fetch = fetchSpy as typeof fetch;

    const controllerRef = createRef<AbortController | null>(null);
    const streamTimersRef = createRef<Record<string, { startedAt: number; firstChunkAt?: number }>>({});
    const activeStreamClientIdRef = createRef<string | null>(null);
    const activeAssistantIdRef = createRef<string | null>(null);
    const streamActiveRef = createRef(false);
    const activeClientIdRef = createRef<string | null>(null);
    const hasFirstChunkRef = createRef(false);
    const replyState = {
      ecoReplyByAssistantId: {},
      setEcoReplyByAssistantId: vi.fn(),
      ecoReplyStateRef: createRef({}),
    };
    const tracking = {
      assistantByClientRef: createRef<Record<string, string>>({}),
      clientByAssistantRef: createRef<Record<string, string>>({}),
      pendingAssistantMetaRef: createRef<Record<string, { interactionId?: string; messageId?: string; createdAt?: string }>>({}),
      userTextByClientIdRef: createRef<Record<string, string>>({}),
    };

    let messages: Message[] = [];
    const setMessages = vi.fn(
      (updater: Message[] | ((prev: Message[]) => Message[])) => {
        if (typeof updater === "function") {
          messages = (updater as (prev: Message[]) => Message[])(messages);
        } else {
          messages = updater;
        }
      },
    );

    const setDigitando = vi.fn();
    const setIsSending = vi.fn();
    const setErroApi = vi.fn();
    const ensureAssistantMessage = vi.fn(() => "assistant-1");
    const removeEcoEntry = vi.fn();
    const updateCurrentInteractionId = vi.fn();
    const logSse = vi.fn();
    const upsertMessage = vi.fn();

    try {
      const streamPromise = beginStream({
        history: [],
        userMessage: { id: "client-1", sender: "user", content: "Olá" },
        controllerRef,
        controllerOverride: undefined,
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
        upsertMessage,
        replyState,
        tracking,
      }) as Promise<StreamRunStats>;

      await expect(streamPromise).resolves.toMatchObject({ aggregatedLength: expect.any(Number) });
    } finally {
      globalThis.fetch = originalFetch;
      mutableEnv.MODE = originalMode;
      mutableEnv.mode = originalModeLower;
      mutableEnv.VITEST = originalVitestFlag;
      if (originalNodeEnv === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = originalNodeEnv;
      }
      if (originalProcessMode === undefined) {
        delete process.env.MODE;
      } else {
        process.env.MODE = originalProcessMode;
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
    }

    const streamCall = fetchCalls.find((call) => (call.init?.method ?? "GET").toUpperCase() === "GET");
    expect(streamCall).toBeDefined();
    const url = new URL(streamCall!.url);
    expect(url.searchParams.has("payload")).toBe(false);
  });
});
