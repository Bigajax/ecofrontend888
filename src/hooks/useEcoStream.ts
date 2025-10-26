import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";

import type { Message as ChatMessageType, UpsertMessageOptions } from "../contexts/ChatContext";
import { sanitizeText } from "../utils/sanitizeText";
import { updatePassiveSignalInteractionId } from "../api/passiveSignals";
import {
  ensureAssistantMessage as ensureAssistantMessageInternal,
  removeEcoEntry as removeEcoEntryInternal,
  useMessageTracking,
  useReplyState,
} from "./useEcoStream/messageState";
import {
  beginStream,
  type EnsureAssistantMessageFn,
  type InteractionMapAction,
  type RemoveEcoEntryFn,
} from "./useEcoStream/streamOrchestrator";
import { safeDebug } from "./useEcoStream/utils";

interface UseEcoStreamOptions {
  messages?: ChatMessageType[];
  upsertMessage?: (message: ChatMessageType, options?: UpsertMessageOptions) => void;
  setMessages: Dispatch<SetStateAction<ChatMessageType[]>>;
  userId?: string; userName?: string; sessionId?: string;
  scrollToBottom?: (smooth?: boolean) => void; isAtBottom?: boolean;
  guestId?: string; isGuest?: boolean; onUnauthorized?: () => void;
  activity?: { onSend?: () => void; onDone?: () => void };
  interactionCacheDispatch?: (action: InteractionMapAction) => void;
}

export const useEcoStream = ({
  upsertMessage,
  setMessages,
  userId,
  userName,
  scrollToBottom,
  guestId,
  isGuest = false,
  activity,
  interactionCacheDispatch,
}: UseEcoStreamOptions) => {
  const [digitando, setDigitando] = useState(false),
    [isSending, setIsSending] = useState(false),
    [erroApi, setErroApi] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null),
    streamTimersRef = useRef<Record<string, { startedAt: number; firstChunkAt?: number }>>({}),
    activeStreamClientIdRef = useRef<string | null>(null),
    activeAssistantIdRef = useRef<string | null>(null),
    streamActiveRef = useRef(false),
    currentInteractionIdRef = useRef<string | null>(null);

  const tracking = useMessageTracking(), replyState = useReplyState();

  const logSse = useCallback((phase: "start" | "first-chunk" | "done" | "abort", payload: Record<string, unknown>) => {
    try {
      console.info(`[FE] sse:${phase}`, payload);
    } catch {
      /* noop */
    }
  }, []);
  const streamRefs = useMemo(
    () => ({ controllerRef, streamTimersRef, activeStreamClientIdRef, activeAssistantIdRef, streamActiveRef }),
    [],
  );

  const updateCurrentInteractionId = useCallback((next: string | null | undefined) => {
    const trimmed = typeof next === "string" ? next.trim() : "";
    const resolved = trimmed.length > 0 ? trimmed : null;
    if (currentInteractionIdRef.current === resolved) return;
    currentInteractionIdRef.current = resolved;
    updatePassiveSignalInteractionId(resolved);
  }, []);

  useEffect(() => () => {
    const activeController = controllerRef.current;
    if (activeController && !activeController.signal.aborted) {
      try {
        activeController.abort();
      } catch {
        /* noop */
      }
    }
    streamActiveRef.current = false;
    controllerRef.current = null;
    streamTimersRef.current = {};
    activeStreamClientIdRef.current = null;
    activeAssistantIdRef.current = null;
  }, []);

  const ensureAssistantMessage: EnsureAssistantMessageFn = useCallback(
    (clientMessageId, event, options) =>
      ensureAssistantMessageInternal({
        clientMessageId,
        event,
        options,
        tracking,
        replyState,
        setMessages,
        upsertMessage,
        updateCurrentInteractionId,
      }),
    [replyState, setMessages, tracking, updateCurrentInteractionId, upsertMessage],
  );

  const removeEcoEntry: RemoveEcoEntryFn = useCallback(
    (assistantMessageId) => removeEcoEntryInternal({ assistantMessageId, tracking, replyState }),
    [replyState, tracking],
  );

  const beginStreamSafely = useCallback(
    (history: ChatMessageType[], userMessage: ChatMessageType, systemHint?: string) =>
      beginStream({
        history,
        userMessage,
        systemHint,
        ...streamRefs,
        setDigitando,
        setIsSending,
        setErroApi,
        activity,
        ensureAssistantMessage,
        removeEcoEntry,
        updateCurrentInteractionId,
        logSse,
        userId,
        userName,
        guestId,
        isGuest,
        interactionCacheDispatch,
        setMessages,
        upsertMessage,
        replyState,
        tracking,
      }),
    [activity, ensureAssistantMessage, guestId, interactionCacheDispatch, isGuest, logSse, removeEcoEntry, replyState, streamRefs, tracking, setDigitando, setErroApi, setIsSending, setMessages, upsertMessage, updateCurrentInteractionId, userId, userName],
  );

  const handleSendMessage = useCallback(
    async (text: string, systemHint?: string) => {
      const rawText = text ?? "";
      if (!rawText.trim()) return;

      const sanitized = sanitizeText(rawText, { collapseWhitespace: false });
      const clientMessageId = uuidv4();
      const userMessage: ChatMessageType = {
        id: clientMessageId,
        client_message_id: clientMessageId,
        clientMessageId: clientMessageId,
        sender: "user",
        role: "user",
        content: sanitized,
        text: sanitized,
        status: "done",
        createdAt: Date.now(),
      };

      setErroApi(null);
      setIsSending(true);
      activity?.onSend?.();

      let placeholderAssistantId: string | null = null;
      setMessages((prev) => {
        safeDebug('[DIAG] send', {
          userMsgId: clientMessageId,
          textPreview: sanitized.slice(0, 80),
          messagesLenBefore: prev.length,
        });
        safeDebug('[DIAG] setMessages:insert', {
          targetId: clientMessageId,
          role: 'user',
          source: 'send',
          messagesLenAfter: prev.length + 1,
        });
        const next = [...prev, userMessage];
        const ensureOptions = !upsertMessage ? { draftMessages: next } : undefined;
        const assistantId = ensureAssistantMessage(clientMessageId, undefined, ensureOptions);
        if (assistantId) {
          placeholderAssistantId = assistantId;
        }
        beginStreamSafely(next, userMessage, systemHint);
        return next;
      });

      if (placeholderAssistantId) {
        activeAssistantIdRef.current = placeholderAssistantId;
      }

      if (scrollToBottom) {
        requestAnimationFrame(() => scrollToBottom(true));
      }
    },
    [activity, beginStreamSafely, ensureAssistantMessage, scrollToBottom, setMessages, upsertMessage],
  );

  return { handleSendMessage, digitando, erroApi, setErroApi, pending: isSending } as const;
};

