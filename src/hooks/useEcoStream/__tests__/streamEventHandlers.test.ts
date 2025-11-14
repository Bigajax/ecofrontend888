import { describe, expect, it, vi, afterEach } from "vitest";

vi.mock("../chunkProcessor", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../chunkProcessor")>();
  return {
    ...actual,
    applyChunkToMessages: vi.fn(),
  };
});

import { applyChunkToMessages } from "../chunkProcessor";
import * as requestBuilder from "../requestBuilder";
import type { Message as ChatMessage } from "../../../contexts/ChatContext";
import type { MessageTrackingRefs, ReplyStateController } from "../messageState";
import {
  handlePromptReady,
  handleChunk,
  handleDone,
  handleError,
  handleControl,
  type DoneContext,
} from "../streamEventHandlers";
import type { StreamSharedContext } from "../types";

const createRef = <T,>(value: T) => ({ current: value });

const assistantId = "assistant-1";
const clientMessageId = "client-1";

const createTracking = (): MessageTrackingRefs => ({
  assistantByClientRef: createRef<Record<string, string>>({ [clientMessageId]: assistantId }),
  clientByAssistantRef: createRef<Record<string, string>>({ [assistantId]: clientMessageId }),
  pendingAssistantMetaRef: createRef<Record<string, unknown>>({}),
  userTextByClientIdRef: createRef<Record<string, string>>({}),
});

const createReplyState = (): ReplyStateController => ({
  ecoReplyByAssistantId: {},
  setEcoReplyByAssistantId: vi.fn(),
  ecoReplyStateRef: createRef<Record<string, { text: string; chunkIndexMax: number }>>({}),
});

interface ContextBundle {
  context: StreamSharedContext;
  messagesRef: () => ChatMessage[];
  setMessages: ReturnType<typeof vi.fn>;
}

const createBaseContext = (overrides: Partial<StreamSharedContext> = {}): ContextBundle => {
  let messages: ChatMessage[] = [
    {
      id: assistantId,
      sender: "eco",
      status: "idle",
      streaming: false,
    } as ChatMessage,
  ];

  const setMessages = vi.fn<
    (updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void
  >((updater) => {
    messages =
      typeof updater === "function" ? (updater as (prev: ChatMessage[]) => ChatMessage[])(messages) : updater;
  });

  const base: StreamSharedContext = {
    clientMessageId,
    normalizedClientId: clientMessageId,
    controller: new AbortController(),
    ensureAssistantMessage: vi.fn(() => assistantId),
    setMessages,
    upsertMessage: vi.fn(),
    activeAssistantIdRef: createRef<string | null>(assistantId),
    activeStreamClientIdRef: createRef<string | null>(clientMessageId),
    activeClientIdRef: createRef<string | null>(clientMessageId),
    hasFirstChunkRef: createRef(false),
    readyStateRef: createRef(false),
    setDigitando: vi.fn(),
    updateCurrentInteractionId: vi.fn(),
    streamTimersRef: createRef<Record<string, { startedAt: number; firstChunkAt?: number }>>({}),
    logSse: vi.fn(),
    replyState: createReplyState(),
    tracking: createTracking(),
    interactionCacheDispatch: undefined,
    streamStats: { aggregatedLength: 0, gotAnyChunk: false },
  };

  const context = { ...base, ...overrides } as StreamSharedContext;

  return {
    context,
    messagesRef: () => messages,
    setMessages,
  };
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("streamEventHandlers", () => {
  it("marca mensagem do assistente como streaming ao receber prompt ready", () => {
    const createdAt = new Date().toISOString();
    const { context, messagesRef } = createBaseContext();

    handlePromptReady(
      {
        interactionId: "interaction-123",
        messageId: "assistant-message-1",
        createdAt,
      } as any,
      context,
    );

    const [message] = messagesRef();
    expect(message?.status).toBe("streaming");
    expect(message?.streaming).toBe(true);
    expect(message?.interaction_id).toBe("interaction-123");
    expect(context.updateCurrentInteractionId).toHaveBeenCalledWith("interaction-123");
  });

  it("aplica chunk utilizando o utilitário compartilhado", () => {
    const { context } = createBaseContext();
    const chunk = { index: 0, delta: "Hello" } as any;

    handleChunk(chunk, context);

    expect(applyChunkToMessages).toHaveBeenCalledWith(
      expect.objectContaining({
        clientMessageId,
        chunk,
        ensureAssistantMessage: context.ensureAssistantMessage,
      }),
    );
  });

  it("anota metadata com motivos de finalização ao concluir sem texto agregado", async () => {
    const replyState = createReplyState();
    replyState.ecoReplyStateRef.current[assistantId] = { text: "", chunkIndexMax: 0 };
    const tracking = createTracking();
    tracking.userTextByClientIdRef.current[clientMessageId] = "Pergunta";

    const { context } = createBaseContext({ replyState, tracking });
    context.streamStats = {
      aggregatedLength: 0,
      gotAnyChunk: false,
      lastMeta: { finishReason: "length" },
      clientFinishReason: "no_chunks",
    };

    const doneContext: DoneContext = {
      ...context,
      event: { payload: { metadata: { source: "unit-test" } } } as any,
      setErroApi: vi.fn(),
      removeEcoEntry: vi.fn(),
      assistantId,
    };

    handleDone(doneContext);
    await Promise.resolve();

    expect(context.upsertMessage).toHaveBeenCalledTimes(1);
    const [patch] = context.upsertMessage.mock.calls[0];
    expect(patch.metadata).toMatchObject({
      finishReason: "length",
      clientFinishReason: "no_chunks",
    });
    expect(tracking.userTextByClientIdRef.current[clientMessageId]).toBeUndefined();
  });

  it("registra erro e remove entrada agregada ao falhar", () => {
    const tracking = createTracking();
    const timersRef = createRef<Record<string, { startedAt: number }>>({
      [clientMessageId]: { startedAt: Date.now() },
    });

    const { context } = createBaseContext({ tracking, streamTimersRef: timersRef });
    const setErroApi = vi.fn();
    const removeEcoEntry = vi.fn();

    const doneContext: DoneContext = {
      ...context,
      event: undefined,
      setErroApi,
      removeEcoEntry,
      assistantId,
    };

    handleError(new Error("boom"), doneContext);

    expect(setErroApi).toHaveBeenCalledWith("boom");
    expect(removeEcoEntry).toHaveBeenCalledWith(assistantId);
    expect(doneContext.streamStats.clientFinishReason).toBe("error");
    expect(timersRef.current[clientMessageId]).toBeUndefined();
  });

  it("propaga metadata recebida em eventos de controle", () => {
    const { context } = createBaseContext();
    const spy = vi.spyOn(requestBuilder, "applyMetaToStreamStats");

    handleControl(
      {
        name: "done",
        payload: { metadata: { finishReason: "stop" }, interaction_id: "interaction-xyz" },
      } as any,
      context,
    );

    expect(context.updateCurrentInteractionId).toHaveBeenCalledWith("interaction-xyz");
    expect(spy).toHaveBeenCalledWith(context.streamStats, { finishReason: "stop" });
    spy.mockRestore();
  });
});
