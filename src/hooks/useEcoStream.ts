// src/hooks/useEcoStream.ts
import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";

import { normalizeStreamText, startEcoStream, type EcoStreamChunk } from "../api/ecoStream";
import type { Message as ChatMessageType, UpsertMessageOptions } from "../contexts/ChatContext";
import { sanitizeText } from "../utils/sanitizeText";

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
}

interface EcoReplyState {
  [assistantMessageId: string]: { text: string; chunkIndexMax: number };
}

export const useEcoStream = ({
  setMessages,
  userId,
  userName,
  scrollToBottom,
  guestId,
  isGuest = false,
  activity,
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

      setMessages((prevMessages) => {
        const alreadyExists = prevMessages.some(
          (message) =>
            message.id === resolvedAssistantId ||
            message.interaction_id === resolvedAssistantId ||
            message.interactionId === resolvedAssistantId,
        );
        if (alreadyExists) return prevMessages;

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
        return [...prevMessages, assistantMessage];
      });

      return resolvedAssistantId;
    },
    [setMessages],
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

      const appended = typeof chunk.text === "string" ? chunk.text : "";
      const nextEntry = {
        chunkIndexMax: chunk.index,
        text: normalizeStreamText(`${currentEntry.text}${appended}`),
      };

      setEcoReplyByAssistantId((prev) => {
        const existing = prev[assistantId] ?? { text: "", chunkIndexMax: -1 };
        if (chunk.index <= existing.chunkIndexMax) return prev;
        const nextState: EcoReplyState = { ...prev, [assistantId]: nextEntry };
        ecoReplyStateRef.current = nextState;
        return nextState;
      });

      const updatedAt = new Date().toISOString();
      setMessages((prevMessages) =>
        prevMessages.map((message) => {
          if (message.id === assistantId || message.interaction_id === assistantId || message.interactionId === assistantId) {
            return {
              ...message,
              content: nextEntry.text,
              text: nextEntry.text,
              updatedAt,
              streaming: true,
              status: message.status === "done" ? "done" : "streaming",
              // hidrata IDs se chegarem durante chunks
              message_id: chunk.messageId || message.message_id,
              interaction_id: chunk.interactionId || message.interaction_id || assistantId,
              interactionId: chunk.interactionId || message.interactionId || assistantId,
            };
          }
          return message;
        }),
      );
    },
    [ensureAssistantMessage, setMessages],
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

      setDigitando(true);

      const placeholderAssistantId = ensureAssistantMessage(clientMessageId);
      if (placeholderAssistantId) {
        activeAssistantIdRef.current = placeholderAssistantId;
      }

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
          const metadata =
            donePayload && typeof donePayload === "object"
              ? (donePayload as Record<string, any>).metadata ??
                (donePayload as Record<string, any>).response ??
                undefined
              : undefined;

          // finaliza mensagem e hidrata IDs para feedback/bandits
          setMessages((prevMessages) =>
            prevMessages.map((message) => {
              if (message.id === assistantId || message.interaction_id === assistantId || message.interactionId === assistantId) {
                return {
                  ...message,
                  streaming: false,
                  status: "done",
                  updatedAt,
                  metadata: metadata ?? message.metadata,
                  donePayload: donePayload ?? message.donePayload,
                  message_id: event?.messageId || message.message_id,
                  interaction_id: event?.interactionId || message.interaction_id || assistantId,
                  interactionId: event?.interactionId || message.interactionId || assistantId,
                };
              }
              return message;
            }),
          );

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
