import type { Dispatch, MutableRefObject, SetStateAction } from "react";

import type { EcoStreamChunk } from "../../api/ecoStream";
import { sanitizeText } from "../../utils/sanitizeText";
import type { Message as ChatMessageType, UpsertMessageOptions } from "../../contexts/ChatContext";
import type { ReplyStateController, MessageTrackingRefs, EcoReplyState } from "./messageState";
import {
  isAlphaNumericChar,
  isLetterOrQuoteChar,
  pickNumberFromRecords,
  pickStringArrayFromRecords,
  pickStringFromRecords,
  toCleanString,
  toRecord,
} from "./utils";

export const smartJoinText = (previous: string, next: string): string => {
  const parts: string[] = [];
  if (previous) parts.push(previous);
  if (next) parts.push(next);
  if (parts.length === 0) return "";
  return parts.join("");
};

export const mergeReplyMetadata = (metadata: unknown, replyTo: string): unknown => {
  if (!replyTo) return metadata;
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    return { ...(metadata as Record<string, unknown>), reply_to_client_message_id: replyTo };
  }
  if (metadata === undefined) {
    return { reply_to_client_message_id: replyTo };
  }
  return {
    reply_to_client_message_id: replyTo,
    value: metadata,
  };
};

export const extractSummaryRecord = (payload: unknown): Record<string, unknown> | undefined => {
  const record = toRecord(payload);
  if (!record) return undefined;
  const candidates = [
    toRecord(record.summary),
    toRecord((record.response as Record<string, unknown> | undefined)?.summary),
    toRecord((record.metadata as Record<string, unknown> | undefined)?.summary),
    toRecord((record.context as Record<string, unknown> | undefined)?.summary),
  ];
  for (const candidate of candidates) {
    if (candidate) return candidate;
  }
  return undefined;
};

interface ApplyChunkToMessagesParams {
  clientMessageId: string;
  chunk: EcoStreamChunk;
  ensureAssistantMessage: (clientMessageId: string, event?: unknown, options?: unknown) => string | null | undefined;
  setDigitando: Dispatch<SetStateAction<boolean>>;
  logSse: (
    phase: "open" | "start" | "first-chunk" | "delta" | "done" | "abort",
    payload: Record<string, unknown>,
  ) => void;
  streamTimersRef: MutableRefObject<Record<string, { startedAt: number; firstChunkAt?: number }>>;
  assistantByClientRef: MutableRefObject<Record<string, string>>;
  activeStreamClientIdRef: MutableRefObject<string | null>;
  activeAssistantIdRef: MutableRefObject<string | null>;
  setMessages: Dispatch<SetStateAction<ChatMessageType[]>>;
  upsertMessage?: (message: ChatMessageType, options?: UpsertMessageOptions) => void;
  replyState: ReplyStateController;
  tracking: MessageTrackingRefs;
}

export const applyChunkToMessages = ({
  clientMessageId,
  chunk,
  ensureAssistantMessage,
  setDigitando,
  logSse,
  streamTimersRef,
  assistantByClientRef,
  activeStreamClientIdRef,
  activeAssistantIdRef,
  setMessages,
  upsertMessage,
  replyState,
  tracking,
}: ApplyChunkToMessagesParams) => {
  if (typeof chunk.index !== "number") return;

  const normalizedClientId = typeof clientMessageId === "string" ? clientMessageId.trim() : "";
  if (!normalizedClientId) return;

  const existingAssistantId = assistantByClientRef.current[normalizedClientId];
  const hasRenderableText = typeof chunk.text === "string" && chunk.text.length > 0;
  const shouldAllowCreate = hasRenderableText && (chunk.index === 0 || chunk.isFirstChunk === true || !existingAssistantId);

  const assistantId = ensureAssistantMessage(
    clientMessageId,
    {
      interactionId: chunk.interactionId,
      messageId: chunk.messageId,
      createdAt: chunk.createdAt,
    },
    { allowCreate: shouldAllowCreate },
  );
  if (!assistantId) return;

  if ((chunk.index === 0 || chunk.isFirstChunk === true) && activeStreamClientIdRef.current === clientMessageId) {
    setDigitando(false);
  }

  activeAssistantIdRef.current = assistantId;

  const { ecoReplyStateRef, setEcoReplyByAssistantId } = replyState;
  const currentEntry = ecoReplyStateRef.current[assistantId] ?? { text: "", chunkIndexMax: -1 };
  if (chunk.index <= currentEntry.chunkIndexMax) return;

  const payloadRecord = toRecord(chunk.payload);
  const patchRecord = toRecord(payloadRecord?.patch);
  const patchSourceRaw = typeof payloadRecord?.source === "string" ? payloadRecord.source : undefined;
  const normalizedPatchSource = patchSourceRaw?.trim().toLowerCase();
  const patchTextValue =
    typeof patchRecord?.text === "string"
      ? patchRecord.text
      : typeof patchRecord?.content === "string"
      ? patchRecord.content
      : "";

  if (
    (!chunk.text || chunk.text.length === 0) &&
    patchRecord &&
    (!patchTextValue || normalizedPatchSource === "stream_init")
  ) {
    return;
  }

  const appendedSource = typeof chunk.text === "string" && chunk.text.length > 0 ? chunk.text : patchTextValue;

  if (!appendedSource) return;

  const { userTextByClientIdRef } = tracking;
  const isFirstChunk = chunk.index === 0 || chunk.isFirstChunk === true;

  try {
    logSse("delta", {
      clientMessageId: normalizedClientId,
      chunkIndex: chunk.index,
      len: appendedSource.length,
      isFirstChunk,
    });
  } catch {
    /* noop */
  }
  if (isFirstChunk) {
    const metrics = streamTimersRef.current[normalizedClientId];
    if (metrics && metrics.firstChunkAt === undefined) {
      const now = Date.now();
      console.log("[SSE] First frame", { timestamp: now, data: chunk });
      metrics.firstChunkAt = now;
      logSse("first-chunk", {
        clientMessageId: normalizedClientId,
        deltaMs: now - metrics.startedAt,
      });
    }
  }
  if (isFirstChunk) {
    const normalizedChunkText = sanitizeText(appendedSource);
    const userEcho = userTextByClientIdRef.current[normalizedClientId];
    if (normalizedChunkText && userEcho && normalizedChunkText === userEcho) {
      try {
        console.debug('[DIAG] chunk:echo-skip', {
          ecoMsgId: assistantId,
          clientMessageId,
          chunkIndex: chunk.index,
        });
      } catch {
        /* noop */
      }
      return;
    }
  }

  try {
    console.debug('[DIAG] chunk', {
      ecoMsgId: assistantId,
      clientMessageId,
      chunkIndex: chunk.index,
      chunkTextPreview: appendedSource.slice(0, 60),
    });
  } catch {
    /* noop */
  }

  const combinedText = smartJoinText(currentEntry.text ?? "", appendedSource);
  const hasVisibleText = /\S/.test(combinedText);
  const nextEntry = {
    chunkIndexMax: chunk.index,
    text: combinedText,
  };

  ecoReplyStateRef.current = {
    ...ecoReplyStateRef.current,
    [assistantId]: nextEntry,
  } as EcoReplyState;

  setEcoReplyByAssistantId((prev) => {
    const existing = prev[assistantId] ?? { text: "", chunkIndexMax: -1 };
    if (chunk.index <= existing.chunkIndexMax) return prev;
    return { ...prev, [assistantId]: nextEntry };
  });

  const updatedAt = new Date().toISOString();

  const visibleContent = hasVisibleText ? combinedText : "";

  const normalizedInteractionId =
    typeof chunk.interactionId === "string" && chunk.interactionId.trim() ? chunk.interactionId.trim() : undefined;
  const normalizedMessageId =
    typeof chunk.messageId === "string" && chunk.messageId.trim() ? chunk.messageId.trim() : undefined;
  const normalizedCreatedAt =
    typeof chunk.createdAt === "string" && chunk.createdAt ? chunk.createdAt : undefined;

  if (upsertMessage) {
    const chunkPatch: ChatMessageType = {
      id: assistantId,
      client_message_id: clientMessageId,
      clientMessageId,
      sender: "eco",
      role: "assistant",
      content: visibleContent,
      text: visibleContent,
      streaming: true,
      status: "streaming",
      updatedAt,
    };
    if (normalizedInteractionId) {
      chunkPatch.interaction_id = normalizedInteractionId;
      chunkPatch.interactionId = normalizedInteractionId;
    }
    if (normalizedMessageId) {
      chunkPatch.message_id = normalizedMessageId;
    }
    chunkPatch.metadata = mergeReplyMetadata(chunk.metadata, normalizedClientId);
    if (chunk.payload !== undefined) {
      chunkPatch.donePayload = chunk.payload;
    }
    upsertMessage(chunkPatch, {
      allowContentUpdate: true,
      patchSource: "stream_chunk",
    });
  } else {
    setMessages((prevMessages) => {
      let updated = false;
      const mapped = prevMessages.map((message) => {
        if (message.id === assistantId) {
          try {
            console.debug('[DIAG] setMessages:update:before', {
              targetId: assistantId,
              role: message.role ?? message.sender ?? 'unknown',
              prevLength: typeof message.text === 'string' ? message.text.length : 0,
              chunkIndex: chunk.index,
            });
          } catch {
            /* noop */
          }
          updated = true;
          const nextMessage: ChatMessageType = {
            ...message,
            content: visibleContent,
            text: visibleContent,
            updatedAt,
            streaming: true,
            status: message.status === "done" ? "done" : "streaming",
          };
          if (normalizedInteractionId) {
            nextMessage.interaction_id = normalizedInteractionId;
            nextMessage.interactionId = normalizedInteractionId;
          }
          if (normalizedMessageId) {
            nextMessage.message_id = normalizedMessageId;
          }
          if (normalizedCreatedAt && !nextMessage.createdAt) {
            nextMessage.createdAt = normalizedCreatedAt;
          }
          if (chunk.metadata !== undefined) {
            nextMessage.metadata = mergeReplyMetadata(chunk.metadata, normalizedClientId);
          } else if (normalizedClientId) {
            nextMessage.metadata = mergeReplyMetadata(nextMessage.metadata, normalizedClientId);
          }
          if (chunk.payload !== undefined) {
            nextMessage.donePayload = chunk.payload;
          }
          try {
            console.debug('[DIAG] setMessages:update:after', {
              targetId: assistantId,
              role: nextMessage.role ?? nextMessage.sender ?? 'unknown',
              nextLength: typeof nextMessage.text === 'string' ? nextMessage.text.length : 0,
              chunkIndex: chunk.index,
            });
          } catch {
            /* noop */
          }
          return nextMessage;
        }
        return message;
      });
      if (updated) {
        return mapped;
      }

      const fallbackMessage: ChatMessageType = {
        id: assistantId,
        client_message_id: clientMessageId,
        clientMessageId,
        sender: "eco",
        role: "assistant",
        content: visibleContent,
        text: visibleContent,
        streaming: true,
        status: "streaming",
        updatedAt,
        createdAt: normalizedCreatedAt ?? updatedAt,
      };

      if (normalizedInteractionId) {
        fallbackMessage.interaction_id = normalizedInteractionId;
        fallbackMessage.interactionId = normalizedInteractionId;
      }
      if (normalizedMessageId) {
        fallbackMessage.message_id = normalizedMessageId;
      }
      fallbackMessage.metadata = mergeReplyMetadata(chunk.metadata, normalizedClientId);
      if (chunk.payload !== undefined) {
        fallbackMessage.donePayload = chunk.payload;
      }

      try {
        console.debug('[DIAG] setMessages:insert', {
          targetId: assistantId,
          role: fallbackMessage.role ?? fallbackMessage.sender ?? 'unknown',
          source: 'chunk-fallback',
          chunkIndex: chunk.index,
        });
      } catch {
        /* noop */
      }

      return [...prevMessages, fallbackMessage];
    });
  }
};

export type SummaryExtraction = {
  summaryRecord?: Record<string, unknown>;
  summaryText?: string;
  ecoScore?: number;
  promptHash?: string;
  moduleCombo?: string[];
};

export const extractSummaryData = (payload: unknown): SummaryExtraction => {
  const summaryRecord = extractSummaryRecord(payload);
  if (!summaryRecord) {
    return {};
  }

  const summaryText = pickStringFromRecords([summaryRecord], ["texto", "text", "resumo", "summary"]);
  const ecoScore = pickNumberFromRecords([summaryRecord], ["eco_score", "ecoScore", "score"]);
  const promptHash = pickStringFromRecords([summaryRecord], ["prompt_hash", "promptHash"]);
  const moduleCombo = pickStringArrayFromRecords([summaryRecord], ["module_combo", "modules", "combo"]);

  return { summaryRecord, summaryText, ecoScore, promptHash, moduleCombo };
};

export const shouldAppendSpace = (current: string, appended: string): boolean => {
  if (!current || !appended) return false;
  const lastChar = current[current.length - 1];
  const firstChar = appended[0];
  if (!lastChar || !firstChar) return false;
  if (lastChar === " " || firstChar === " ") return false;
  if (!isAlphaNumericChar(lastChar) || !isLetterOrQuoteChar(firstChar)) return false;
  return true;
};

