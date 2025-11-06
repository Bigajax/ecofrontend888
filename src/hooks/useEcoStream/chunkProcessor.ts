import type { Dispatch, MutableRefObject, SetStateAction } from "react";

import type { EcoStreamChunk } from "../../api/ecoStream";
import { collectTexts } from "../../api/askEcoResponse";
import { mapResponseEventType, normalizeControlName } from "../../api/ecoStream/eventMapper";
import { sanitizeText } from "../../utils/sanitizeText";
import { smartJoin } from "../../utils/streamJoin";
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

const toTrimmedString = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const pickFirstString = (...values: Array<unknown>): string | undefined => {
  for (const value of values) {
    const result = toTrimmedString(value);
    if (result) return result;
  }
  return undefined;
};

const toNumberOrUndefined = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

export interface ProcessSseHandlers {
  appendAssistantDelta: (index: number, delta: string, event: Record<string, unknown>) => void;
  onStreamDone: (event?: Record<string, unknown>) => void;
  onControl?: (event: Record<string, unknown>) => void;
  onPromptReady?: (event: Record<string, unknown>) => void;
  onError?: (event: Record<string, unknown>) => void;
  onMessage?: (event: Record<string, unknown>, info?: { eventName?: string | null }) => void;
  onStart?: (event: Record<string, unknown>) => void;
  onEmpty?: (event: Record<string, unknown>) => void;
}

export interface ProcessSseLineOptions {
  eventName?: string | null;
}

const normalizeEventKey = (value?: string | null): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const mapped = mapResponseEventType(trimmed);
  const candidate = mapped.normalized ?? trimmed;
  return normalizeControlName(candidate);
};

export const processSseLine = (
  jsonLine: string,
  handlers: ProcessSseHandlers,
  options?: ProcessSseLineOptions,
): void => {
  if (!jsonLine) return;
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonLine);
  } catch {
    return;
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return;
  }

  const event = parsed as Record<string, unknown>;
  const clientMessageId = pickFirstString(
    (event as { client_message_id?: unknown }).client_message_id,
    (event as { clientMessageId?: unknown }).clientMessageId,
    (event as { id?: unknown }).id,
  );
  if (clientMessageId) {
    (event as { client_message_id?: string }).client_message_id = clientMessageId;
    (event as { clientMessageId?: string }).clientMessageId = clientMessageId;
  }

  const fallbackEvent = normalizeEventKey(options?.eventName);
  const type = normalizeEventKey(toTrimmedString(event.type)) ?? fallbackEvent;

  const payloadRecord = toRecord(event.payload);
  const payloadName = pickFirstString(event.name, event.event, payloadRecord?.name, payloadRecord?.event);
  const normalizedPayloadName = normalizeEventKey(payloadName) ?? fallbackEvent;

  const normalizedType = type ?? normalizedPayloadName ?? fallbackEvent;

  try {
    console.log("[SSE EVENT]", normalizedType ?? null, event);
  } catch {
    /* noop */
  }

  if ((event as { done?: unknown }).done === true) {
    handlers.onStreamDone?.(event);
    return;
  }

  const isPromptReady =
    normalizedPayloadName === "prompt_ready" ||
    normalizedPayloadName === "promptready" ||
    normalizedPayloadName === "ready" ||
    type === "prompt_ready" ||
    type === "ready" ||
    normalizedType === "ready";
  const isDone = normalizedPayloadName === "done" || type === "done";
  const isControl =
    type === "control" ||
    normalizedPayloadName === "control" ||
    type === "control_command" ||
    isPromptReady ||
    isDone;

  if (isControl) {
    if (isDone) {
      handlers.onStreamDone?.(event);
      return;
    }
    if (isPromptReady) {
      handlers.onPromptReady?.(event);
      return;
    }
    handlers.onControl?.(event);
    return;
  }

  const isChunk = type === "chunk" || normalizedPayloadName === "chunk";
  if (isChunk) {
    const indexCandidate =
      toNumberOrUndefined(event.index) ?? toNumberOrUndefined(payloadRecord?.index) ?? 0;
    const partCandidate = (() => {
      const directSources = [
        event.delta,
        event.text,
        event.content,
        (event as { message?: unknown }).message,
        (event as { detail?: unknown }).detail,
        (event as { reason?: unknown }).reason,
        payloadRecord?.delta,
        payloadRecord?.text,
        payloadRecord?.content,
        payloadRecord?.message,
        payloadRecord?.detail,
        payloadRecord?.reason,
      ];

      const directText = pickFirstString(...directSources);
      if (directText) {
        return directText;
      }

      const nestedSources = [...directSources, payloadRecord];

      for (const source of nestedSources) {
        if (!source) continue;

        if (typeof source === "string") {
          const normalized = source.trim();
          if (normalized.length > 0) {
            return source;
          }
          continue;
        }

        if (typeof source === "object") {
          const collected = collectTexts(source);
          if (collected.length === 0) {
            continue;
          }
          // FIX: Use smartJoin instead of join("") to properly handle word boundaries
          // This fixes "Umaforçainterior" → "Uma força interior" when Sonnet sends nested chunks
          const joined = collected.reduce((acc: string, fragment: string) => {
            return acc ? smartJoin(acc, fragment) : fragment;
          }, "");
          if (joined.trim().length > 0) {
            return joined;
          }
        }
      }

      return "";
    })();
    if (!partCandidate) {
      return;
    }

    // DEBUG: Log raw chunks to diagnose spacing issues
    try {
      const chunkPreview = partCandidate.length > 100 ? partCandidate.slice(0, 100) + "..." : partCandidate;
      console.log(
        `[CHUNK_DEBUG] idx=${indexCandidate} len=${partCandidate.length} preview="${chunkPreview}" hasSpaces=${/\s/.test(partCandidate)}`
      );
    } catch (e) {
      /* noop */
    }

    handlers.appendAssistantDelta(indexCandidate ?? 0, partCandidate, event);
    return;
  }

  const normalizedEventKey = normalizedPayloadName ?? type ?? fallbackEvent;

  // Tratar evento 'start'
  if (normalizedEventKey === "start" || type === "start") {
    handlers.onStart?.(event);
    return;
  }

  // Tratar evento 'empty'
  if (normalizedEventKey === "empty" || type === "empty") {
    handlers.onEmpty?.(event);
    return;
  }

  if (normalizedEventKey === "message") {
    handlers.onMessage?.(event, { eventName: options?.eventName ?? null });
    return;
  }

  if (type === "error" || normalizedPayloadName === "error") {
    handlers.onError?.(event);
  }
};

export function extractText(evt: any): string {
  if (!evt) return "";
  if (evt.error && typeof evt.message === "string" && evt.message.trim()) {
    return `⚠️ ${evt.message}`;
  }
  if (typeof evt.text === "string" && evt.text.trim()) {
    return evt.text;
  }
  const deltaContent = evt?.choices?.[0]?.delta?.content;
  if (typeof deltaContent === "string" && deltaContent.trim()) {
    return deltaContent;
  }
  const payloadText = evt?.payload?.text ?? evt?.payload?.delta ?? evt?.delta;
  if (typeof payloadText === "string" && payloadText.trim()) {
    return payloadText;
  }
  if (typeof evt === "string") {
    const trimmed = evt.trim();
    if (trimmed && trimmed !== ":" && trimmed !== "ok") {
      return trimmed;
    }
  }
  return "";
}

export const smartJoinText = (previous: string, next: string): string => {
  const prev = previous ?? "";
  const nxt = next ?? "";

  if (!prev || !nxt) return prev + nxt;

  const lastChar = prev[prev.length - 1];
  const firstChar = nxt[0];

  // If there's already whitespace at the boundary, don't add more
  if (lastChar === " " || lastChar === "\n" || firstChar === " " || firstChar === "\n") {
    return prev + nxt;
  }

  // If previous ends with punctuation followed by next starting with letter, add space
  if (/[.!?;:…]$/.test(prev) && /^[a-záéíóúâêôãõ]/i.test(nxt)) {
    return prev + " " + nxt;
  }

  // Rule: If next starts with uppercase, it's likely a new sentence/word → add space
  if (/^[A-ZÁÉÍÓÚÂÊÔÃÕ]/.test(nxt)) {
    return prev + " " + nxt;
  }

  // Rule: Avoid breaking accented character combinations
  // Portuguese/Spanish accents: "conex" + "ão", "padr" + "ões"
  // These typically have pattern: consonant cluster + accent vowel
  const isAccentCombination = /[^aeiouáéíóúâêôãõ]$/i.test(prev) && /^[àáâãäåèéêëìíîïòóôõöùúûüýÿ]/i.test(nxt);
  if (isAccentCombination) {
    return prev + nxt;
  }

  // Rule: Check character types for word boundary detection
  const prevEndsVowel = /[aeiouáéíóúâêôãõ]$/i.test(prev);
  const prevEndsConsonant = /[bcdfghjklmnpqrstvwxyzç]$/i.test(prev);
  const nextStartsConsonant = /^[bcdfghjklmnpqrstvwxyzç]/i.test(nxt);
  const nextStartsVowel = /^[aeiouáéíóúâêôãõ]/i.test(nxt);

  // PRIORITY: Check if this looks like a backend-forced mid-word split BEFORE other rules
  // This must happen before the "common word endings" rule
  const lastWordInPrev = prev.trim().split(/\s+/).pop() ?? "";
  const isLikelyMidWordChunk = lastWordInPrev.length < 6 && lastWordInPrev.length > 0;
  const commonCompleteWords = /\b(com|para|sem|até|são|das|dos|pela|pelo)$/i;
  if (isLikelyMidWordChunk && nextStartsVowel && !commonCompleteWords.test(lastWordInPrev)) {
    // This looks like "pes" + "ada" → concatenate directly
    return prev + nxt;
  }

  // If previous ends with vowel AND next starts with consonant (except 'h'), add space
  // This catches: "está" + "buscando", "ele" + "disse"
  if (prevEndsVowel && nextStartsConsonant && !/^h/i.test(nxt)) {
    return prev + " " + nxt;
  }

  // If previous ends with common word-ending consonants (m, s, r, z, d, n) AND next starts with vowel
  // This catches: "com" + "outras", "para" + "ele"
  const commonWordEndings = /[msrzdn]$/i;
  if (prevEndsConsonant && commonWordEndings.test(prev) && nextStartsVowel) {
    return prev + " " + nxt;
  }

  // NEW RULE: If previous ends with vowel and next starts with vowel, likely a word boundary
  // This handles: "força" + "interior", "uma" + "explicação"
  // EXCEPT when next is just an accent vowel (e.g., "conex" + "ão")
  if (prevEndsVowel && nextStartsVowel) {
    // But exclude if next starts with an accent vowel (indicates mid-word accent join)
    if (!/^[àáâãäåèéêëìíîïòóôõöùúûüýÿ]/i.test(firstChar)) {
      return prev + " " + nxt;
    }
  }

  // Default: concatenate directly (conservative for mid-word UTF-8 splits)
  return prev + nxt;
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
  setDigitando: _setDigitando,
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

  // DEBUG: Log the join operation to diagnose spacing
  try {
    const prevPreview = (currentEntry.text ?? "").slice(-20);
    const nextPreview = appendedSource.slice(0, 20);
    const combinedPreview = combinedText.slice(-40);
    console.log(
      `[JOIN_DEBUG] prev="${prevPreview}" + next="${nextPreview}" → combined ends with="${combinedPreview}"`
    );
  } catch (e) {
    /* noop */
  }

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

