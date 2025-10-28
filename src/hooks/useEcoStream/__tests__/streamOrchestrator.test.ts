import { describe, expect, it, vi } from "vitest";

import type { Message } from "../../../contexts/ChatContext";
import type { MessageTrackingRefs, ReplyStateController } from "../messageState";
import { handleDone, type StreamRunStats } from "../streamOrchestrator";

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
});
