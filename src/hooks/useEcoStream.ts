// src/hooks/useEcoStream.ts
import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";

import { startEcoStream, type EcoStreamChunk, type EcoStreamControlEvent } from "../api/ecoStream";
import { collectTexts } from "../api/askEcoResponse";
import type { Message as ChatMessageType, UpsertMessageOptions } from "../contexts/ChatContext";
import { sanitizeText } from "../utils/sanitizeText";
import { updatePassiveSignalInteractionId } from "../api/passiveSignals";

interface UseEcoStreamOptions {
  messages?: ChatMessageType[];
  upsertMessage?: (message: ChatMessageType, options?: UpsertMessageOptions) => void;
  setMessages: Dispatch<SetStateAction<ChatMessageType[]>>;
  userId?: string;
  userName?: string;
  sessionId?: string;
  scrollToBottom?: (smooth?: boolean) => void;
  isAtBottom?: boolean;
  guestId?: string;
  isGuest?: boolean;
  onUnauthorized?: () => void;
  activity?: { onSend?: () => void; onDone?: () => void };
  interactionCacheDispatch?: (action: InteractionMapAction) => void;
}

type InteractionMapAction = {
  type: "updateInteractionMap";
  clientId: string;
  interaction_id: string;
};

const toRecord = (value: unknown): Record<string, unknown> | undefined => {
  if (!value || typeof value !== "object") return undefined;
  return value as Record<string, unknown>;
};

const toCleanString = (value: unknown): string | undefined => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return undefined;
};

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

const toStringArray = (value: unknown): string[] | undefined => {
  if (Array.isArray(value)) {
    const normalized = value
      .map((item) => toCleanString(item))
      .filter((item): item is string => Boolean(item));
    if (normalized.length === 0) return undefined;
    return Array.from(new Set(normalized));
  }
  const str = toCleanString(value);
  if (!str) return undefined;
  const parts = str
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (parts.length === 0) return undefined;
  return Array.from(new Set(parts));
};

const collectCandidates = (
  records: Array<Record<string, unknown> | undefined>,
  keys: string[],
): unknown[] => {
  const results: unknown[] = [];
  for (const record of records) {
    if (!record) continue;
    for (const key of keys) {
      if (key in record) {
        const value = record[key];
        if (value !== undefined && value !== null) {
          results.push(value);
        }
      }
    }
  }
  return results;
};

const pickStringFromRecords = (
  records: Array<Record<string, unknown> | undefined>,
  keys: string[],
): string | undefined => {
  const candidates = collectCandidates(records, keys);
  for (const candidate of candidates) {
    const normalized = toCleanString(candidate);
    if (normalized) return normalized;
  }
  return undefined;
};

const pickNumberFromRecords = (
  records: Array<Record<string, unknown> | undefined>,
  keys: string[],
): number | undefined => {
  const candidates = collectCandidates(records, keys);
  for (const candidate of candidates) {
    const normalized = toNumber(candidate);
    if (typeof normalized === "number") return normalized;
  }
  return undefined;
};

const pickStringArrayFromRecords = (
  records: Array<Record<string, unknown> | undefined>,
  keys: string[],
): string[] | undefined => {
  for (const record of records) {
    if (!record) continue;
    for (const key of keys) {
      if (!(key in record)) continue;
      const normalized = toStringArray(record[key]);
      if (normalized && normalized.length > 0) {
        return normalized;
      }
    }
  }
  return undefined;
};

const extractSummaryRecord = (payload: unknown): Record<string, unknown> | undefined => {
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

interface EcoReplyState {
  [assistantMessageId: string]: { text: string; chunkIndexMax: number };
}

const isAlphaNumericChar = (char: string | undefined): boolean =>
  typeof char === "string" && /[0-9A-Za-zÀ-ÖØ-öø-ÿ]/u.test(char);

const isLetterOrQuoteChar = (char: string | undefined): boolean =>
  typeof char === "string" && /[A-Za-zÀ-ÖØ-öø-ÿ"'“”‘’`]/u.test(char);

const smartJoinText = (previous: string, next: string): string => {
  if (!previous) return next;
  if (!next) return previous;

  const lastChar = previous.slice(-1);
  const firstChar = next[0];
  const previousEndsWithWhitespace = /\s$/.test(previous);
  const nextStartsWithWhitespace = /^\s/.test(next);

  let needsSpace = false;

  if (!previousEndsWithWhitespace && !nextStartsWithWhitespace) {
    if (/[.?!,;:]$/.test(lastChar) && isLetterOrQuoteChar(firstChar)) {
      needsSpace = true;
    } else if (isAlphaNumericChar(lastChar) && isAlphaNumericChar(firstChar)) {
      needsSpace = true;
    }
  }

  if (needsSpace) {
    return `${previous} ${next}`;
  }

  return `${previous}${next}`;
};

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
  const [digitando, setDigitando] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [erroApi, setErroApi] = useState<string | null>(null);

  const controllersRef = useRef<Record<string, AbortController>>({});
  const activeStreamClientIdRef = useRef<string | null>(null);
  const activeAssistantIdRef = useRef<string | null>(null);
  const [ecoReplyByAssistantId, setEcoReplyByAssistantId] = useState<EcoReplyState>({});
  const ecoReplyStateRef = useRef<EcoReplyState>({});
  const assistantByClientRef = useRef<Record<string, string>>({});
  const clientByAssistantRef = useRef<Record<string, string>>({});
  const pendingAssistantMetaRef = useRef<
    Record<string, { interactionId?: string; messageId?: string; createdAt?: string }>
  >({});
  const currentInteractionIdRef = useRef<string | null>(null);

  const updateCurrentInteractionId = useCallback((next: string | null | undefined) => {
    const normalized = typeof next === "string" ? next.trim() : "";
    const resolved = normalized.length > 0 ? normalized : null;
    if (currentInteractionIdRef.current === resolved) {
      return;
    }
    currentInteractionIdRef.current = resolved;
    updatePassiveSignalInteractionId(resolved);
  }, []);

  useEffect(() => {
    ecoReplyStateRef.current = ecoReplyByAssistantId;
  }, [ecoReplyByAssistantId]);

  useEffect(() => {
    return () => {
      Object.values(controllersRef.current).forEach((controller) => {
        try {
          controller.abort();
        } catch {
          /* noop */
        }
      });
      controllersRef.current = {};
      activeStreamClientIdRef.current = null;
      activeAssistantIdRef.current = null;
    };
  }, []);

  const removeEcoEntry = useCallback((assistantMessageId?: string | null) => {
    if (!assistantMessageId) return;
    setEcoReplyByAssistantId((prev) => {
      if (!(assistantMessageId in prev)) return prev;
      const next = { ...prev };
      delete next[assistantMessageId];
      ecoReplyStateRef.current = next;
      return next;
    });

    const clientMessageId = clientByAssistantRef.current[assistantMessageId];
    if (clientMessageId) {
      delete clientByAssistantRef.current[assistantMessageId];
      if (assistantByClientRef.current[clientMessageId] === assistantMessageId) {
        delete assistantByClientRef.current[clientMessageId];
      }
      if (pendingAssistantMetaRef.current[clientMessageId]) {
        delete pendingAssistantMetaRef.current[clientMessageId];
      }
    }
  }, []);

  /**
   * Garante a existência/atualização da mensagem da Eco (bolha de resposta).
   * - Mantém um ID local estável para a Eco (eco-<uuid>).
   * - Só cria a bolha quando permitido (primeiro chunk ou finalização sem chunks).
   * - Atualiza metadados assim que o servidor os fornece.
   */
  const ensureAssistantMessage = useCallback(
    (
      clientMessageId: string,
      event?: { interactionId?: string | null; messageId?: string | null; createdAt?: string | null },
      options?: { allowCreate?: boolean },
    ): string | undefined => {
      if (!clientMessageId) return undefined;
      const normalizedClientId = clientMessageId.trim();
      if (!normalizedClientId) return undefined;

      const allowCreate = options?.allowCreate ?? true;

      const normalizeString = (value?: string | null): string => (typeof value === "string" ? value.trim() : "");
      const normalizeTimestamp = (value?: string | null): string | undefined => {
        const trimmed = normalizeString(value);
        return trimmed || undefined;
      };

      const mergePendingMeta = () => {
        const pending = pendingAssistantMetaRef.current[normalizedClientId] ?? {};
        const nextPending = { ...pending } as {
          interactionId?: string;
          messageId?: string;
          createdAt?: string;
        };

        const incomingInteractionId = normalizeString(event?.interactionId);
        const incomingMessageId = normalizeString(event?.messageId);
        const incomingCreatedAt = normalizeTimestamp(event?.createdAt);

        if (incomingInteractionId) {
          nextPending.interactionId = incomingInteractionId;
        }
        if (incomingMessageId) {
          nextPending.messageId = incomingMessageId;
        }
        if (incomingCreatedAt) {
          nextPending.createdAt = incomingCreatedAt;
        }

        const hasPendingValues =
          Boolean(nextPending.interactionId) || Boolean(nextPending.messageId) || Boolean(nextPending.createdAt);

        if (hasPendingValues) {
          pendingAssistantMetaRef.current[normalizedClientId] = nextPending;
        }

        return {
          interactionId: nextPending.interactionId,
          messageId: nextPending.messageId,
          createdAt: nextPending.createdAt,
        };
      };

      const mergedMeta = mergePendingMeta();

      if (mergedMeta.interactionId) {
        updateCurrentInteractionId(mergedMeta.interactionId);
      }

      const ensureReplyEntry = (assistantId: string) => {
        if (!assistantId) return;
        if (!ecoReplyStateRef.current[assistantId]) {
          setEcoReplyByAssistantId((prev) => {
            if (prev[assistantId]) return prev;
            const next: EcoReplyState = { ...prev, [assistantId]: { text: "", chunkIndexMax: -1 } };
            ecoReplyStateRef.current = next;
            return next;
          });
        }
      };

      const existingAssistantId = assistantByClientRef.current[normalizedClientId];
      if (existingAssistantId) {
        assistantByClientRef.current[normalizedClientId] = existingAssistantId;
        if (!clientByAssistantRef.current[existingAssistantId]) {
          clientByAssistantRef.current[existingAssistantId] = normalizedClientId;
        }
        ensureReplyEntry(existingAssistantId);

        if (mergedMeta.interactionId || mergedMeta.messageId || mergedMeta.createdAt) {
          setMessages((prev) =>
            prev.map((message) => {
              if (message.id !== existingAssistantId) return message;
              const nextMessage: ChatMessageType = { ...message };
              if (mergedMeta.interactionId) {
                nextMessage.interaction_id = mergedMeta.interactionId;
                nextMessage.interactionId = mergedMeta.interactionId;
              }
              if (mergedMeta.messageId) {
                nextMessage.message_id = mergedMeta.messageId;
              }
              if (mergedMeta.createdAt && !nextMessage.createdAt) {
                nextMessage.createdAt = mergedMeta.createdAt;
              }
              return nextMessage;
            }),
          );
        }

        return existingAssistantId;
      }

      if (!allowCreate) {
        return undefined;
      }

      const assistantId = `eco-${uuidv4()}`;
      assistantByClientRef.current[normalizedClientId] = assistantId;
      clientByAssistantRef.current[assistantId] = normalizedClientId;
      ensureReplyEntry(assistantId);

      const createdAt = mergedMeta.createdAt ?? new Date().toISOString();
      const assistantMessage: ChatMessageType = {
        id: assistantId,
        client_message_id: normalizedClientId,
        clientMessageId: normalizedClientId,
        sender: "eco",
        role: "assistant",
        content: "",
        text: "",
        streaming: true,
        status: "streaming",
        interaction_id: mergedMeta.interactionId ?? undefined,
        interactionId: mergedMeta.interactionId ?? undefined,
        message_id: mergedMeta.messageId ?? undefined,
        createdAt,
        updatedAt: createdAt,
      };

      if (upsertMessage) {
        upsertMessage(assistantMessage, {
          allowContentUpdate: true,
          patchSource: "stream_init",
        });
      } else {
        setMessages((prevMessages) => [...prevMessages, assistantMessage]);
      }

      return assistantId;
    },
    [setMessages, upsertMessage, updateCurrentInteractionId],
  );

  const applyChunkToMessages = useCallback(
    (clientMessageId: string, chunk: EcoStreamChunk) => {
      if (typeof chunk.index !== "number") return;

      const normalizedClientId = typeof clientMessageId === "string" ? clientMessageId.trim() : "";
      if (!normalizedClientId) return;

      const existingAssistantId = assistantByClientRef.current[normalizedClientId];
      const shouldAllowCreate =
        chunk.index === 0 ||
        chunk.isFirstChunk === true ||
        !existingAssistantId;

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

      const appendedSource =
        typeof chunk.text === "string" && chunk.text.length > 0 ? chunk.text : patchTextValue;

      if (!appendedSource) return;

      const combinedText = smartJoinText(currentEntry.text ?? "", appendedSource);
      const hasVisibleText = /\S/.test(combinedText);
      const nextEntry = {
        chunkIndexMax: chunk.index,
        text: combinedText,
      };

      ecoReplyStateRef.current = {
        ...ecoReplyStateRef.current,
        [assistantId]: nextEntry,
      };

      setEcoReplyByAssistantId((prev) => {
        const existing = prev[assistantId] ?? { text: "", chunkIndexMax: -1 };
        if (chunk.index <= existing.chunkIndexMax) return prev;
        return { ...prev, [assistantId]: nextEntry };
      });

      const updatedAt = new Date().toISOString();

      const visibleContent = hasVisibleText ? combinedText : "";

      const normalizedInteractionId =
        typeof chunk.interactionId === "string" && chunk.interactionId.trim()
          ? chunk.interactionId.trim()
          : undefined;
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
        if (chunk.metadata !== undefined) {
          chunkPatch.metadata = chunk.metadata;
        }
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
                nextMessage.metadata = chunk.metadata;
              }
              if (chunk.payload !== undefined) {
                nextMessage.donePayload = chunk.payload;
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
          if (chunk.metadata !== undefined) {
            fallbackMessage.metadata = chunk.metadata;
          }
          if (chunk.payload !== undefined) {
            fallbackMessage.donePayload = chunk.payload;
          }

          return [...prevMessages, fallbackMessage];
        });
      }
    },
    [ensureAssistantMessage, setDigitando, setMessages, upsertMessage],
  );

  const beginStream = useCallback(
    (history: ChatMessageType[], userMessage: ChatMessageType, systemHint?: string) => {
      const clientMessageId = userMessage.id;
      if (!clientMessageId) return;

      // encerra stream anterior, se houver
      const activeId = activeStreamClientIdRef.current;
      if (activeId && activeId !== clientMessageId) {
        const activeController = controllersRef.current[activeId];
        if (activeController) {
          try {
            activeController.abort();
          } catch {
            /* noop */
          }
          delete controllersRef.current[activeId];
        }
      }

      const controller = new AbortController();
      controllersRef.current[clientMessageId] = controller;
      activeStreamClientIdRef.current = clientMessageId;
      activeAssistantIdRef.current = null;

      updateCurrentInteractionId(null);

      if (pendingAssistantMetaRef.current[clientMessageId]) {
        delete pendingAssistantMetaRef.current[clientMessageId];
      }

      setDigitando(true);

      const streamPromise = startEcoStream({
        history,
        clientMessageId,
        systemHint,
        userId,
        userName,
        guestId,
        isGuest,
        signal: controller.signal,
        onPromptReady: (event) => {
          if (controller.signal.aborted) return;

          const assistantId = ensureAssistantMessage(
            clientMessageId,
            {
              interactionId: event?.interactionId,
              messageId: event?.messageId,
              createdAt: event?.createdAt,
            },
            { allowCreate: false },
          );

          if (assistantId) {
            activeAssistantIdRef.current = assistantId;
            if (event?.interactionId) {
              updateCurrentInteractionId(event.interactionId);
            }
            const timestamp = typeof event?.createdAt === "string" ? event.createdAt.trim() : undefined;
            const updatedAt = timestamp || new Date().toISOString();

            setMessages((prevMessages) =>
              prevMessages.map((message) => {
                if (message.id !== assistantId) return message;
                return {
                  ...message,
                  streaming: true,
                  status: "streaming",
                  updatedAt,
                  createdAt: message.createdAt ?? updatedAt,
                  message_id: event?.messageId || message.message_id,
                  interaction_id: event?.interactionId || message.interaction_id,
                  interactionId: event?.interactionId || message.interactionId,
                };
              }),
            );
          }
        },
        onChunk: (chunk) => {
          if (controller.signal.aborted) return;
          applyChunkToMessages(clientMessageId, chunk);
        },
        onDone: (event) => {
          if (controller.signal.aborted) return;

          const assistantId = ensureAssistantMessage(clientMessageId, {
            interactionId: event?.interactionId,
            messageId: event?.messageId,
            createdAt: event?.createdAt,
          });
          if (!assistantId) return;

          activeAssistantIdRef.current = assistantId;

          if (activeStreamClientIdRef.current === clientMessageId) {
            setDigitando(false);
          }

          if (event?.interactionId) {
            updateCurrentInteractionId(event.interactionId);
          }

          const timestamp = typeof event?.createdAt === "string" ? event.createdAt.trim() : undefined;
          const updatedAt = timestamp || new Date().toISOString();
          const donePayload = event?.payload;
          const aggregatedEntry = ecoReplyStateRef.current[assistantId];
          const aggregatedText = aggregatedEntry?.text ?? "";
          const payloadRecord = toRecord(donePayload);
          const summaryRecord = extractSummaryRecord(donePayload);
          const responseRecord = toRecord(payloadRecord?.response);
          const metadataRecord = toRecord(payloadRecord?.metadata);
          const contextRecord = toRecord(payloadRecord?.context);
          const recordSources = [
            summaryRecord,
            responseRecord,
            metadataRecord,
            contextRecord,
            payloadRecord,
          ];

          const metadata =
            payloadRecord?.metadata !== undefined
              ? (payloadRecord?.metadata as unknown)
              : payloadRecord?.response !== undefined
              ? (payloadRecord?.response as unknown)
              : undefined;

          const interactionFromSummary = pickStringFromRecords(recordSources, [
            "interaction_id",
            "interactionId",
            "interactionID",
          ]);
          const fallbackInteractionFromIds = pickStringFromRecords(recordSources, [
            "id",
            "message_id",
            "messageId",
          ]);
          const eventInteractionId = toCleanString(event?.interactionId);
          const resolvedInteractionId = interactionFromSummary ?? eventInteractionId ?? fallbackInteractionFromIds;

          const resolvedMessageId =
            pickStringFromRecords(recordSources, ["message_id", "messageId", "id"]) ??
            toCleanString(event?.messageId);

          const latencyCandidate = pickNumberFromRecords(recordSources, [
            "latency_ms",
            "latencyMs",
          ]);
          const normalizedLatency =
            typeof latencyCandidate === "number"
              ? Math.max(0, Math.round(latencyCandidate))
              : undefined;

          const moduleCombo = pickStringArrayFromRecords(recordSources, [
            "module_combo",
            "moduleCombo",
            "modules",
            "selected_modules",
            "selectedModules",
          ]);
          const promptHash = pickStringFromRecords(recordSources, [
            "prompt_hash",
            "promptHash",
          ]);
          const ecoScore = pickNumberFromRecords(recordSources, [
            "eco_score",
            "ecoScore",
          ]);

          const doneTexts = collectTexts(donePayload);
          const doneContentCandidate =
            Array.isArray(doneTexts) && doneTexts.length > 0 ? doneTexts.join("") : undefined;
          const normalizedAggregated = aggregatedText.replace(/\s+/g, " ").trim();
          const normalizedDone = typeof doneContentCandidate === "string"
            ? doneContentCandidate.replace(/\s+/g, " ").trim()
            : "";

          let finalContent = aggregatedText;
          if (typeof doneContentCandidate === "string" && doneContentCandidate.length > 0) {
            if (!normalizedAggregated) {
              finalContent = doneContentCandidate;
            } else if (normalizedAggregated !== normalizedDone) {
              finalContent = doneContentCandidate;
            }
          }

          const finalText = finalContent;

          const patch: ChatMessageType = {
            id: assistantId,
            streaming: false,
            status: "done",
            updatedAt,
          };

          patch.content = finalText;
          patch.text = finalText;

          if (metadata !== undefined) {
            patch.metadata = metadata;
          }
          if (donePayload !== undefined) {
            patch.donePayload = donePayload;
          }
          if (resolvedInteractionId) {
            patch.interaction_id = resolvedInteractionId;
            patch.interactionId = resolvedInteractionId;
          }
          if (resolvedMessageId) {
            patch.message_id = resolvedMessageId;
          }
          if (typeof normalizedLatency === "number") {
            patch.latencyMs = normalizedLatency;
          }
          if (moduleCombo && moduleCombo.length > 0) {
            patch.module_combo = moduleCombo;
          }
          if (promptHash) {
            patch.prompt_hash = promptHash;
          }
          if (typeof ecoScore === "number" && Number.isFinite(ecoScore)) {
            patch.eco_score = ecoScore;
          }

          const allowedKeys = [
            "status",
            "streaming",
            "updatedAt",
            "metadata",
            "donePayload",
            "interaction_id",
            "interactionId",
            "message_id",
            "latencyMs",
            "module_combo",
            "prompt_hash",
            "eco_score",
            "content",
            "text",
          ];

          if (upsertMessage) {
            upsertMessage(patch, { patchSource: "stream_done", allowedKeys });
          } else {
            setMessages((prevMessages) =>
              prevMessages.map((message) => {
                if (message.id === assistantId) {
                  const nextMessage: ChatMessageType = {
                    ...message,
                    streaming: false,
                    status: "done",
                    updatedAt,
                    content: finalText,
                    text: finalText,
                  };
                  if (metadata !== undefined) {
                    nextMessage.metadata = metadata;
                  }
                  if (donePayload !== undefined) {
                    nextMessage.donePayload = donePayload;
                  }
                  if (resolvedInteractionId) {
                    nextMessage.interaction_id = resolvedInteractionId;
                    nextMessage.interactionId = resolvedInteractionId;
                  }
                  if (resolvedMessageId) {
                    nextMessage.message_id = resolvedMessageId;
                  }
                  if (typeof normalizedLatency === "number") {
                    nextMessage.latencyMs = normalizedLatency;
                  }
                  if (moduleCombo && moduleCombo.length > 0) {
                    nextMessage.module_combo = moduleCombo;
                  }
                  if (promptHash) {
                    nextMessage.prompt_hash = promptHash;
                  }
                  if (typeof ecoScore === "number" && Number.isFinite(ecoScore)) {
                    nextMessage.eco_score = ecoScore;
                  }
                  return nextMessage;
                }
                return message;
              }),
            );
          }

          const normalizedClientId =
            typeof clientMessageId === "string" ? clientMessageId.trim() : "";
          if (
            interactionCacheDispatch &&
            normalizedClientId &&
            resolvedInteractionId &&
            typeof resolvedInteractionId === "string"
          ) {
            interactionCacheDispatch({
              type: "updateInteractionMap",
              clientId: normalizedClientId,
              interaction_id: resolvedInteractionId,
            });
          }

          removeEcoEntry(assistantId);
        },
        onError: (error) => {
          if (controller.signal.aborted) return;
          const message = error instanceof Error ? error.message : "Não foi possível concluir a resposta da Eco.";
          setErroApi(message);
        },
        onControl: (event: EcoStreamControlEvent) => {
          if (controller.signal.aborted) return;
          const explicit = toCleanString(event?.interactionId);
          const payloadRecord = toRecord(event?.payload);
          const payloadInteraction =
            toCleanString(payloadRecord?.interaction_id) ||
            toCleanString(payloadRecord?.interactionId) ||
            toCleanString(payloadRecord?.id);
          const resolved = explicit ?? payloadInteraction;
          if (resolved) {
            updateCurrentInteractionId(resolved);
          }
        },
      });

      streamPromise.catch((error) => {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : "Falha ao iniciar a resposta da Eco.";
        setErroApi(message);
      });

      streamPromise.finally(() => {
        delete controllersRef.current[clientMessageId];
        const assistantId = assistantByClientRef.current[clientMessageId];

        if (activeStreamClientIdRef.current === clientMessageId) {
          activeStreamClientIdRef.current = null;
          activeAssistantIdRef.current = null;
          removeEcoEntry(assistantId);
          setDigitando(false);
          setIsSending(false);
          activity?.onDone?.();
        } else {
          removeEcoEntry(assistantId);
        }
      });
    },
    [
      activity,
      applyChunkToMessages,
      ensureAssistantMessage,
      guestId,
      interactionCacheDispatch,
      isGuest,
      removeEcoEntry,
      setErroApi,
      updateCurrentInteractionId,
      userId,
      userName,
    ],
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

      setMessages((prev) => {
        const next = [...prev, userMessage];
        // Usamos o array `next` recém-calculado como fonte do histórico para o stream.
        beginStream(next, userMessage, systemHint);
        return next;
      });

      if (scrollToBottom) {
        requestAnimationFrame(() => scrollToBottom(true));
      }
    },
    [activity, beginStream, scrollToBottom, setMessages],
  );

  return { handleSendMessage, digitando, erroApi, setErroApi, pending: isSending } as const;
};
