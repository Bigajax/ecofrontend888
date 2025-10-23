import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";

import {
  normalizeStreamText,
  startEcoStream,
  type EcoStreamChunk,
} from "../api/ecoStream";
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
  [clientMessageId: string]: { text: string; chunkIndexMax: number };
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
  const activeStreamIdRef = useRef<string | null>(null);
  const [ecoReplyByClientId, setEcoReplyByClientId] = useState<EcoReplyState>({});
  const ecoReplyStateRef = useRef<EcoReplyState>({});

  useEffect(() => {
    ecoReplyStateRef.current = ecoReplyByClientId;
  }, [ecoReplyByClientId]);

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
      activeStreamIdRef.current = null;
    };
  }, []);

  const removeEcoEntry = useCallback((clientMessageId: string) => {
    setEcoReplyByClientId((prev) => {
      if (!(clientMessageId in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next[clientMessageId];
      ecoReplyStateRef.current = next;
      return next;
    });
  }, []);

  const ensureEcoReplyEntry = useCallback(
    (clientMessageId: string) => {
      if (!clientMessageId) return;

      if (!ecoReplyStateRef.current[clientMessageId]) {
        setEcoReplyByClientId((prev) => {
          if (prev[clientMessageId]) {
            return prev;
          }
          const next: EcoReplyState = {
            ...prev,
            [clientMessageId]: { text: "", chunkIndexMax: -1 },
          };
          ecoReplyStateRef.current = next;
          return next;
        });
      }

      setMessages((prevMessages) => {
        const hasAssistant = prevMessages.some(
          (message) =>
            message.role === "assistant" &&
            (message.client_message_id === clientMessageId ||
              message.clientMessageId === clientMessageId),
        );
        if (hasAssistant) {
          return prevMessages;
        }
        const assistantMessage: ChatMessageType = {
          id: `eco-${clientMessageId}`,
          client_message_id: clientMessageId,
          clientMessageId: clientMessageId,
          sender: "eco",
          role: "assistant",
          content: "",
          text: "",
        };
        return [...prevMessages, assistantMessage];
      });
    },
    [setMessages],
  );

  const applyChunkToMessages = useCallback(
    (clientMessageId: string, chunk: EcoStreamChunk) => {
      if (typeof chunk.index !== "number") {
        return;
      }

      setEcoReplyByClientId((prev) => {
        const current = prev[clientMessageId] ?? { text: "", chunkIndexMax: -1 };
        // 🛡️ Ignora duplicatas ou chunks fora de ordem reutilizando `chunkIndexMax`.
        if (chunk.index <= current.chunkIndexMax) {
          return prev;
        }

        const appended = typeof chunk.text === "string" ? chunk.text : "";
        const nextEntry = {
          chunkIndexMax: chunk.index,
          text: normalizeStreamText(`${current.text}${appended}`),
        };

        const nextState: EcoReplyState = { ...prev, [clientMessageId]: nextEntry };
        ecoReplyStateRef.current = nextState;

        setMessages((prevMessages) =>
          prevMessages.map((message) => {
            if (
              message.client_message_id === clientMessageId ||
              message.clientMessageId === clientMessageId
            ) {
              return {
                ...message,
                content: nextEntry.text,
                text: nextEntry.text,
              };
            }
            return message;
          }),
        );

        return nextState;
      });
    },
    [setMessages],
  );

  const beginStream = useCallback(
    (history: ChatMessageType[], userMessage: ChatMessageType, systemHint?: string) => {
      const clientMessageId = userMessage.id;
      if (!clientMessageId) {
        return;
      }

      const activeId = activeStreamIdRef.current;
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
      activeStreamIdRef.current = clientMessageId;

      ensureEcoReplyEntry(clientMessageId);
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
        onChunk: (chunk) => {
          if (controller.signal.aborted) {
            return;
          }
          applyChunkToMessages(clientMessageId, chunk);
        },
        onDone: () => {
          removeEcoEntry(clientMessageId);
        },
        onError: (error) => {
          if (controller.signal.aborted) {
            return;
          }
          const message =
            error instanceof Error
              ? error.message
              : "Não foi possível concluir a resposta da Eco.";
          setErroApi(message);
        },
      });

      streamPromise.catch((error) => {
        if (controller.signal.aborted) {
          return;
        }
        const message =
          error instanceof Error ? error.message : "Falha ao iniciar a resposta da Eco.";
        setErroApi(message);
      });

      streamPromise.finally(() => {
        delete controllersRef.current[clientMessageId];
        if (activeStreamIdRef.current === clientMessageId) {
          activeStreamIdRef.current = null;
          removeEcoEntry(clientMessageId);
          setDigitando(false);
          setIsSending(false);
          activity?.onDone?.();
        } else {
          removeEcoEntry(clientMessageId);
        }
      });
    },
    [
      activity,
      applyChunkToMessages,
      ensureEcoReplyEntry,
      guestId,
      isGuest,
      removeEcoEntry,
      setErroApi,
      userId,
      userName,
    ],
  );

  const handleSendMessage = useCallback(
    async (text: string, systemHint?: string) => {
      const trimmed = (text ?? "").trim();
      if (!trimmed) {
        return;
      }

      const sanitized = sanitizeText(trimmed);
      const clientMessageId = uuidv4();
      const userMessage: ChatMessageType = {
        id: clientMessageId,
        client_message_id: clientMessageId,
        clientMessageId: clientMessageId,
        sender: "user",
        role: "user",
        content: sanitized,
        text: sanitized,
      };

      setErroApi(null);
      setIsSending(true);
      activity?.onSend?.();

      setMessages((prev) => {
        const next = [...prev, userMessage];
        // ✅ Usamos o array `next` recém-calculado como única fonte para o payload do stream.
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

