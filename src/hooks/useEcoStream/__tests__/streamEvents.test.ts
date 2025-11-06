
import { describe, it, expect, vi } from "vitest";
import { toRecordSafe } from "../utils";
import { onControl, onDone, onError, onMessage, onPromptReady, processChunk } from "../session/streamEvents";
import { collectTexts } from "../../../api/askEcoResponse";
import { pickStringFromRecords } from "../utils";
import type { StreamRunStats, StreamSharedContext } from "../types";
import type { MessageTrackingRefs, ReplyStateController } from "../messageState";

const createStreamStats = (): StreamRunStats => ({
  aggregatedLength: 0,
  gotAnyChunk: false,
});

const createTracking = (): MessageTrackingRefs => ({
  assistantByClientRef: { current: {} },
  clientByAssistantRef: { current: {} },
  pendingAssistantMetaRef: { current: {} },
  userTextByClientIdRef: { current: {} },
});

const createReplyState = (): ReplyStateController => ({
  ecoReplyByAssistantId: {},
  setEcoReplyByAssistantId: vi.fn(),
  ecoReplyStateRef: { current: {} },
});

type ContextOverrides = Partial<StreamSharedContext> & {
  streamStats?: StreamRunStats;
  replyState?: ReplyStateController;
  tracking?: MessageTrackingRefs;
};

const createSharedContext = (
  controller: AbortController,
  overrides: ContextOverrides = {},
): StreamSharedContext => {
  const streamStats = overrides.streamStats ?? createStreamStats();
  const replyState = overrides.replyState ?? createReplyState();
  const tracking = overrides.tracking ?? createTracking();

  const context: StreamSharedContext = {
    clientMessageId: overrides.clientMessageId ?? "client-1",
    normalizedClientId: overrides.normalizedClientId ?? "client-1",
    controller,
    ensureAssistantMessage:
      overrides.ensureAssistantMessage ??
      vi.fn(() => "assistant-1"),
    setMessages: overrides.setMessages ?? vi.fn(),
    upsertMessage: overrides.upsertMessage,
    activeAssistantIdRef: overrides.activeAssistantIdRef ?? { current: null },
    activeStreamClientIdRef: overrides.activeStreamClientIdRef ?? { current: "client-1" },
    activeClientIdRef: overrides.activeClientIdRef ?? { current: "client-1" },
    hasFirstChunkRef: overrides.hasFirstChunkRef ?? { current: false },
    readyStateRef: overrides.readyStateRef ?? { current: false },
    setDigitando: overrides.setDigitando ?? vi.fn(),
    updateCurrentInteractionId: overrides.updateCurrentInteractionId ?? vi.fn(),
    streamTimersRef: overrides.streamTimersRef ?? { current: {} },
    logSse: overrides.logSse ?? vi.fn(),
    replyState,
    tracking,
    interactionCacheDispatch: overrides.interactionCacheDispatch,
    streamStats,
  };

  return context;
};

describe("toRecordSafe", () => {
  it("should return an object when given an object", () => {
    const obj = { a: 1 };
    expect(toRecordSafe(obj)).toBe(obj);
  });

  it("should return a parsed object when given a valid JSON string", () => {
    const json = '{"a": 1}';
    expect(toRecordSafe(json)).toEqual({ a: 1 });
  });

  it("should return an empty object when given an invalid JSON string", () => {
    const json = '{"a": 1';
    expect(toRecordSafe(json)).toEqual({});
  });

  it("should return an empty object when given a non-object, non-string value", () => {
    expect(toRecordSafe(123)).toEqual({});
    expect(toRecordSafe(null)).toEqual({});
    expect(toRecordSafe(undefined)).toEqual({});
    expect(toRecordSafe([])).toEqual({});
  });
});

describe("stream event helpers", () => {
  it("processChunk applies chunk and updates state", () => {
    const controller = new AbortController();
    const streamState = { fallbackRequested: false, firstChunkDelivered: false, readyReceived: false };
    const streamStats = createStreamStats();
    const sharedContext = createSharedContext(controller, { streamStats });
    const clearFallbackGuardTimer = vi.fn();
    const bumpFirstTokenWatchdog = vi.fn();
    const bumpHeartbeatWatchdog = vi.fn();
    const handleChunk = vi.fn();
    const onFirstChunk = vi.fn();

    const buildRecordChain = (event?: Record<string, unknown>) => {
      const payload = toRecordSafe(event?.payload);
      return [payload, toRecordSafe(event)].filter(Boolean) as Record<string, unknown>[];
    };

    const extractPayloadRecord = (event?: Record<string, unknown>) => toRecordSafe(event?.payload);

    const processChunkEvent = processChunk({
      controller,
      streamState,
      sharedContext,
      streamStats,
      onFirstChunk,
      clearFallbackGuardTimer,
      bumpFirstTokenWatchdog,
      bumpHeartbeatWatchdog,
      buildRecordChain,
      extractPayloadRecord,
      pickStringFromRecords,
      handleChunk,
      toRecordSafe,
    });

    const rawEvent = {
      payload: { metadata: { foo: "bar" } },
      message_id: "assistant-123",
      interaction_id: "interaction-789",
      created_at: "2024-01-01T00:00:00Z",
    } as Record<string, unknown>;

    processChunkEvent(0, "hello", rawEvent);

    expect(sharedContext.hasFirstChunkRef.current).toBe(true);
    expect(streamState.firstChunkDelivered).toBe(true);
    expect(streamStats.gotAnyChunk).toBe(true);
    expect(streamStats.aggregatedLength).toBe(5);
    expect(clearFallbackGuardTimer).toHaveBeenCalledTimes(1);
    expect(bumpFirstTokenWatchdog).toHaveBeenCalledTimes(1);
    expect(handleChunk).toHaveBeenCalledTimes(1);
    expect(onFirstChunk).toHaveBeenCalledTimes(1);
    expect(handleChunk.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        index: 0,
        text: "hello",
        messageId: "assistant-123",
        interactionId: "interaction-789",
      }),
    );
  });

  it("onPromptReady forwards prompt metadata", () => {
    const controller = new AbortController();
    const streamState = { fallbackRequested: false, firstChunkDelivered: false, readyReceived: false };
    const sharedContext = createSharedContext(controller);
    const markPromptReadyWatchdog = vi.fn();
    const handlePromptReady = vi.fn();
    const diag = vi.fn();

    const buildRecordChain = (event?: Record<string, unknown>) =>
      [toRecordSafe(event?.payload), toRecordSafe(event)].filter(Boolean) as Record<string, unknown>[];
    const extractPayloadRecord = (event?: Record<string, unknown>) => toRecordSafe(event?.payload);

    const handlePromptEvent = onPromptReady({
      controller,
      streamState,
      markPromptReadyWatchdog,
      buildRecordChain,
      pickStringFromRecords,
      extractPayloadRecord,
      diag,
      normalizedClientId: sharedContext.normalizedClientId,
      handlePromptReady,
      sharedContext,
    });

    const rawEvent = {
      payload: {},
      interaction_id: "interaction-1",
      message_id: "message-1",
      created_at: "2024-01-01T10:00:00Z",
    } as Record<string, unknown>;

    handlePromptEvent(rawEvent);

    expect(markPromptReadyWatchdog).toHaveBeenCalledTimes(1);
    expect(handlePromptReady).toHaveBeenCalledTimes(1);
    expect(handlePromptReady.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        interactionId: "interaction-1",
        messageId: "message-1",
      }),
    );
    expect(diag).toHaveBeenCalledWith(
      "prompt_ready",
      expect.objectContaining({ clientMessageId: sharedContext.normalizedClientId }),
    );
  });

  it("onMessage marks first chunk when text is present", () => {
    const controller = new AbortController();
    const streamState = { fallbackRequested: false, firstChunkDelivered: false, readyReceived: false };
    const streamStats = createStreamStats();
    const sharedContext = createSharedContext(controller, { streamStats });
    const clearFallbackGuardTimer = vi.fn();
    const bumpFirstTokenWatchdog = vi.fn();
    const bumpHeartbeatWatchdog = vi.fn();

    const buildRecordChain = (event?: Record<string, unknown>) =>
      [toRecordSafe(event?.payload), toRecordSafe(event)].filter(Boolean) as Record<string, unknown>[];
    const extractPayloadRecord = (event?: Record<string, unknown>) => toRecordSafe(event?.payload);

    const handleMessageEvent = onMessage({
      controller,
      streamState,
      extractPayloadRecord,
      buildRecordChain,
      pickStringFromRecords,
      collectTexts,
      sharedContext,
      streamStats,
      clearFallbackGuardTimer,
      bumpFirstTokenWatchdog,
      bumpHeartbeatWatchdog,
    });

    handleMessageEvent({ text: "hello" } as Record<string, unknown>);

    expect(sharedContext.hasFirstChunkRef.current).toBe(true);
    expect(streamState.firstChunkDelivered).toBe(true);
    expect(streamStats.gotAnyChunk).toBe(true);
    expect(clearFallbackGuardTimer).toHaveBeenCalledTimes(1);
    expect(bumpFirstTokenWatchdog).toHaveBeenCalledTimes(1);
    expect(bumpHeartbeatWatchdog).not.toHaveBeenCalled();
  });

  it("onDone finalizes stream and notifies handler", () => {
    const controller = new AbortController();
    const streamStats = createStreamStats();
    const streamTimersRef = { current: { "client-1": { startedAt: Date.now() - 100 } } };
    const activeAssistantIdRef = { current: null as string | null };
    const ensureAssistantMessage = vi.fn(() => "assistant-42");
    const logSse = vi.fn();
    const handleDone = vi.fn();
    const sharedContext = createSharedContext(controller, {
      streamStats,
      streamTimersRef,
      activeAssistantIdRef,
      ensureAssistantMessage,
      activeStreamClientIdRef: { current: "client-1" },
    });
    const doneState = { value: false };
    const clearTypingWatchdog = vi.fn();
    const clearWatchdog = vi.fn();
    const streamActiveRef = { current: true };
    const setStreamActive = vi.fn();
    const registerNoContent = vi.fn();
    const ensureAssistantForNoContent = vi.fn(() => null);
    const removeEcoEntry = vi.fn();

    const handleStreamDone = onDone({
      clearTypingWatchdog,
      controller,
      doneState,
      clearWatchdog,
      streamActiveRef,
      clientMessageId: sharedContext.clientMessageId,
      setStreamActive,
      buildRecordChain: (event?: Record<string, unknown>) =>
        [toRecordSafe(event?.payload), toRecordSafe(event)].filter(Boolean) as Record<string, unknown>[],
      pickStringFromRecords,
      extractPayloadRecord: (event?: Record<string, unknown>) => toRecordSafe(event?.payload),
      toRecordSafe,
      streamTimersRef,
      normalizedClientId: sharedContext.normalizedClientId,
      streamStats,
      sharedContext,
      registerNoContent,
      logSse,
      ensureAssistantForNoContent,
      handleDone,
      setErroApi: vi.fn(),
      removeEcoEntry,
      applyMetaToStreamStats: (stats, meta) => {
        stats.lastMeta = meta;
      },
      extractFinishReasonFromMeta: () => undefined,
      collectTexts,
      processChunk: vi.fn(),
      retry: vi.fn(),
      retriedNoChunk: false,
    });

    handleStreamDone({ payload: {} } as Record<string, unknown>);

    expect(doneState.value).toBe(true);
    expect(streamActiveRef.current).toBe(false);
    expect(setStreamActive).toHaveBeenCalledWith(false);
    expect(logSse).toHaveBeenCalledWith("done", expect.any(Object));
    expect(ensureAssistantMessage).toHaveBeenCalled();
    expect(activeAssistantIdRef.current).toBe("assistant-42");
    expect(handleDone).toHaveBeenCalledWith(
      expect.objectContaining({ assistantId: "assistant-42" }),
    );
    expect(streamTimersRef.current).toEqual({});
    expect(clearTypingWatchdog).toHaveBeenCalled();
    expect(clearWatchdog).toHaveBeenCalled();
    expect(removeEcoEntry).not.toHaveBeenCalled();
  });

  it("onError handles internal error events", () => {
    const controller = new AbortController();
    const streamStats = createStreamStats();
    const tracking = createTracking();
    tracking.assistantByClientRef.current["client-1"] = "assistant-1";
    const replyState = createReplyState();
    replyState.ecoReplyStateRef.current["assistant-1"] = { text: "", chunkIndexMax: 1 };
    const sharedContext = createSharedContext(controller, { streamStats, tracking, replyState });
    const fatalErrorState = { current: null as Error | null };
    const processChunkSpy = vi.fn();
    const handleDoneSpy = vi.fn();
    const diag = vi.fn();

    const handleErrorEvent = onError({
      bumpHeartbeatWatchdog: vi.fn(),
      buildRecordChain: (event?: Record<string, unknown>) =>
        [toRecordSafe(event)].filter(Boolean) as Record<string, unknown>[],
      pickStringFromRecords,
      replyState,
      tracking,
      clientMessageId: sharedContext.clientMessageId,
      processChunk: processChunkSpy,
      sharedContext,
      diag,
      normalizedClientId: sharedContext.normalizedClientId,
      handleDone: handleDoneSpy,
      fatalErrorState,
      extractText: () => undefined,
      toRecordSafe,
    });

    handleErrorEvent({ reason: "internal_error" } as Record<string, unknown>);

    expect(sharedContext.streamStats.clientFinishReason).toBe("internal_error");
    expect(diag).toHaveBeenCalledWith("stream_error_internal", {
      clientMessageId: sharedContext.normalizedClientId,
    });
    expect(handleDoneSpy).toHaveBeenCalledWith(undefined, { reason: "internal_error" });
    expect(fatalErrorState.current).toBeNull();
  });

  it("onError captures generic failures", () => {
    const controller = new AbortController();
    const sharedContext = createSharedContext(controller);
    const fatalErrorState = { current: null as Error | null };

    const handleErrorEvent = onError({
      bumpHeartbeatWatchdog: vi.fn(),
      buildRecordChain: (event?: Record<string, unknown>) =>
        [toRecordSafe(event)].filter(Boolean) as Record<string, unknown>[],
      pickStringFromRecords,
      replyState: createReplyState(),
      tracking: createTracking(),
      clientMessageId: sharedContext.clientMessageId,
      processChunk: vi.fn(),
      sharedContext,
      diag: vi.fn(),
      normalizedClientId: sharedContext.normalizedClientId,
      handleDone: vi.fn(),
      fatalErrorState,
      extractText: () => undefined,
      toRecordSafe,
    });

    handleErrorEvent({ message: "Unexpected failure" } as Record<string, unknown>);

    expect(fatalErrorState.current).toBeInstanceOf(Error);
    expect(fatalErrorState.current?.message).toBe("Unexpected failure");
  });

  describe("onControl", () => {
    it("should ignore control events without a name and log a warning", () => {
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const controlHandler = vi.fn();
      const deps = {
        controller: new AbortController(),
        streamState: { fallbackRequested: false, firstChunkDelivered: false, readyReceived: false },
        buildRecordChain: () => [],
        extractPayloadRecord: () => ({}),
        pickStringFromRecords: () => undefined,
        bumpHeartbeatWatchdog: () => {},
        diag: () => {},
        normalizedClientId: "test-client-id",
        handleControl: controlHandler,
        sharedContext: {} as any,
        toRecordSafe,
      };

      const onControlHandler = onControl(deps);
      onControlHandler({ data: JSON.stringify({ a: 1 }) });

      expect(consoleWarnSpy).toHaveBeenCalledWith("[SSE] Control event without name", { payload: { a: 1 } });
      expect(controlHandler).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });
  });
});
