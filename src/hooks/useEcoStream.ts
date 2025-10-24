// src/hooks/useEcoStream.ts
import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";

import { normalizeStreamText, startEcoStream, type EcoStreamChunk } from "../api/ecoStream";
import type { Message as ChatMessageType, UpsertMessageOptions } from "../contexts/ChatContext";
import { sanitizeText } from "../utils/sanitizeText";
import { glue } from "../utils/streamJoin";

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
    }
  }, []);

  /**
   * Garante a existência/atualização da mensagem da Eco (bolha de resposta).
   * - Cria com status "streaming" quando necessário (no prompt_ready).
   * - Atualiza IDs (interaction/message) assim que o servidor os fornece.
   */
  const ensureAssistantMessage = useCallback(
    (
      clientMessageId: string,
      event?: { interactionId?: string | null; messageId?: string | null; createdAt?: string | null },
    ): string | undefined => {
      if (!clientMessageId) return undefined;
      const normalizedClientId = clientMessageId.trim();
      if (!normalizedClientId) return undefined;

      const normalizeString = (value?: string | null): string => (typeof value === "string" ? value.trim() : "");
      const normalizeTimestamp = (value?: string | null): string | undefined => {
        const trimmed = normalizeString(value);
        return trimmed || undefined;
      };

      const incomingInteractionId = normalizeString(event?.interactionId);
      const incomingMessageId = normalizeString(event?.messageId);
      const existingAssistantId = assistantByClientRef.current[normalizedClientId];
      const candidateId = incomingInteractionId || incomingMessageId || existingAssistantId;
      const resolvedAssistantId = candidateId || uuidv4();

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

      const upgradeAssistantIdIfNeeded = (oldId: string, newId: string) => {
        if (!oldId || !newId || oldId === newId) return newId;

        assistantByClientRef.current[normalizedClientId] = newId;
        clientByAssistantRef.current[newId] = normalizedClientId;
        if (clientByAssistantRef.current[oldId] === normalizedClientId) {
          delete clientByAssistantRef.current[oldId];
        }

        setEcoReplyByAssistantId((prev) => {
          const previousEntry = prev[oldId];
          if (!previousEntry) return prev;
          const nextState: EcoReplyState = { ...prev, [newId]: previousEntry };
          delete nextState[oldId];
          ecoReplyStateRef.current = nextState;
          return nextState;
        });

        const updatedAt = new Date().toISOString();
        const createdAt = normalizeTimestamp(event?.createdAt) ?? updatedAt;
        const resolvedMessageId = incomingMessageId || newId;

        setMessages((prevMessages) =>
          prevMessages.map((message) => {
            if (message.id === oldId || message.interaction_id === oldId || message.interactionId === oldId) {
              return {
                ...message,
                id: newId,
                interaction_id: newId,
                interactionId: newId,
                client_message_id: normalizedClientId,
                clientMessageId: normalizedClientId,
                message_id: resolvedMessageId || message.message_id || undefined,
                updatedAt,
                createdAt: message.createdAt ?? createdAt,
                streaming: true,
                status: "streaming",
              };
            }
            return message;
          }),
        );

        ensureReplyEntry(newId);
        return newId;
      };

      if (existingAssistantId) {
        if (incomingInteractionId && existingAssistantId !== incomingInteractionId) {
          return upgradeAssistantIdIfNeeded(existingAssistantId, incomingInteractionId);
        }
        assistantByClientRef.current[normalizedClientId] = existingAssistantId;
        if (!clientByAssistantRef.current[existingAssistantId]) {
          clientByAssistantRef.current[existingAssistantId] = normalizedClientId;
        }
        ensureReplyEntry(existingAssistantId);

        // hidrata IDs se chegarem depois
        if (incomingMessageId || incomingInteractionId) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === existingAssistantId || m.interaction_id === existingAssistantId || m.interactionId === existingAssistantId
                ? {
                    ...m,
                    message_id: incomingMessageId || m.message_id,
                    interaction_id: incomingInteractionId || m.interaction_id || existingAssistantId,
                    interactionId: incomingInteractionId || m.interactionId || existingAssistantId,
                  }
                : m,
            ),
          );
        }
        return existingAssistantId;
      }

      // cria nova bolha da Eco (streaming)
      assistantByClientRef.current[normalizedClientId] = resolvedAssistantId;
      clientByAssistantRef.current[resolvedAssistantId] = normalizedClientId;
      ensureReplyEntry(resolvedAssistantId);

      const createdAt = normalizeTimestamp(event?.createdAt) ?? new Date().toISOString();
      const resolvedMessageId = incomingMessageId || resolvedAssistantId;

      const assistantMessage: ChatMessageType = {
        id: resolvedAssistantId,
        client_message_id: normalizedClientId,
        clientMessageId: normalizedClientId,
        sender: "eco",
        role: "assistant",
        content: "",
        text: "",
        streaming: true,
        status: "streaming",
        interaction_id: resolvedAssistantId,
        interactionId: resolvedAssistantId,
        message_id: resolvedMessageId || undefined,
        createdAt,
        updatedAt: createdAt,
      };

      if (upsertMessage) {
        upsertMessage(assistantMessage, {
          allowContentUpdate: true,
          patchSource: "stream_init",
        });
      } else {
        setMessages((prevMessages) => {
          const alreadyExists = prevMessages.some(
            (message) =>
              message.id === resolvedAssistantId ||
              message.interaction_id === resolvedAssistantId ||
              message.interactionId === resolvedAssistantId,
          );
          if (alreadyExists) {
            return prevMessages;
          }
          return [...prevMessages, assistantMessage];
        });
      }

      return resolvedAssistantId;
    },
    [setMessages, upsertMessage],
  );

  const applyChunkToMessages = useCallback(
    (clientMessageId: string, chunk: EcoStreamChunk) => {
      if (typeof chunk.index !== "number") return;

      const assistantId = ensureAssistantMessage(clientMessageId, {
        interactionId: chunk.interactionId,
        messageId: chunk.messageId,
        createdAt: chunk.createdAt,
      });
      if (!assistantId) return;

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

      const combinedText = normalizeStreamText(glue(currentEntry.text, appendedSource));
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
          interaction_id: assistantId,
          interactionId: assistantId,
          updatedAt,
        };
        if (chunk.metadata !== undefined) {
          chunkPatch.metadata = chunk.metadata;
        }
        if (chunk.payload !== undefined) {
          chunkPatch.donePayload = chunk.payload;
        }
        if (chunk.messageId) {
          chunkPatch.message_id = chunk.messageId;
        }
        upsertMessage(chunkPatch, {
          allowContentUpdate: true,
          patchSource: "stream_chunk",
        });
      } else {
        setMessages((prevMessages) => {
          let updated = false;
          const mapped = prevMessages.map((message) => {
            if (
              message.id === assistantId ||
              message.interaction_id === assistantId ||
              message.interactionId === assistantId
            ) {
              updated = true;
              const nextMessage: ChatMessageType = {
                ...message,
                content: visibleContent,
                text: visibleContent,
                updatedAt,
                streaming: true,
                status: message.status === "done" ? "done" : "streaming",
              };
              if (chunk.metadata !== undefined) {
                nextMessage.metadata = chunk.metadata;
              }
              if (chunk.payload !== undefined) {
                nextMessage.donePayload = chunk.payload;
              }
              if (chunk.messageId) {
                nextMessage.message_id = chunk.messageId;
              }
              return nextMessage;
            }
            return message;
          });
          return updated ? mapped : prevMessages;
        });
      }
    },
    [ensureAssistantMessage, setMessages, upsertMessage],
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

      const precreatedAssistantId = ensureAssistantMessage(clientMessageId);
      if (precreatedAssistantId) {
        activeAssistantIdRef.current = precreatedAssistantId;
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

          // cria/atualiza bolha da Eco já no prompt_ready
          const assistantId = ensureAssistantMessage(clientMessageId, {
            interactionId: event?.interactionId,
            messageId: event?.messageId,
            createdAt: event?.createdAt,
          });
          if (assistantId) {
            activeAssistantIdRef.current = assistantId;
            const timestamp = typeof event?.createdAt === "string" ? event.createdAt.trim() : undefined;
            const updatedAt = timestamp || new Date().toISOString();

            setMessages((prevMessages) =>
              prevMessages.map((message) => {
                if (message.id === assistantId || message.interaction_id === assistantId || message.interactionId === assistantId) {
                  return {
                    ...message,
                    streaming: true,
                    status: "streaming",
                    updatedAt,
                    createdAt: message.createdAt ?? updatedAt,
                    // hidrata IDs se só chegaram agora
                    message_id: event?.messageId || message.message_id,
                    interaction_id: event?.interactionId || message.interaction_id || assistantId,
                    interactionId: event?.interactionId || message.interactionId || assistantId,
                  };
                }
                return message;
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

          const timestamp = typeof event?.createdAt === "string" ? event.createdAt.trim() : undefined;
          const updatedAt = timestamp || new Date().toISOString();
          const donePayload = event?.payload;
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
          const resolvedInteractionId =
            interactionFromSummary ??
            eventInteractionId ??
            fallbackInteractionFromIds ??
            assistantId;

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

          const patch: ChatMessageType = {
            id: assistantId,
            streaming: false,
            status: "done",
            updatedAt,
          };

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
          ];

          if (upsertMessage) {
            upsertMessage(patch, { patchSource: "stream_done", allowedKeys });
          } else {
            setMessages((prevMessages) =>
              prevMessages.map((message) => {
                if (
                  message.id === assistantId ||
                  message.interaction_id === assistantId ||
                  message.interactionId === assistantId
                ) {
                  const nextMessage: ChatMessageType = {
                    ...message,
                    streaming: false,
                    status: "done",
                    updatedAt,
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
    [activity, applyChunkToMessages, ensureAssistantMessage, guestId, isGuest, removeEcoEntry, setErroApi, userId, userName],
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
