// src/components/MessageList.tsx
import React, { RefObject, useMemo } from "react";
import { motion } from "framer-motion";

import ChatMessage from "./ChatMessage";
import EcoMessageWithAudio from "./EcoMessageWithAudio";
import TypingDots from "./TypingDots"; // garante o componente

import type { Message } from "../contexts/ChatContext";
import { isEcoMessage, resolveMessageSender } from "../utils/chat/messages";

const extractClientMessageId = (message: Message | undefined): string | undefined => {
  if (!message) return undefined;
  if (typeof message.client_message_id === "string") {
    const trimmed = message.client_message_id.trim();
    if (trimmed) return trimmed;
  }
  const camelCaseId = (message as { clientMessageId?: unknown }).clientMessageId;
  if (typeof camelCaseId === "string") {
    const trimmed = camelCaseId.trim();
    if (trimmed) return trimmed;
  }
  return undefined;
};

const hasVisibleText = (m: Message | undefined): boolean => {
  if (!m) return false;
  const raw =
    typeof m.content === "string"
      ? m.content
      : typeof (m as any).text === "string"
      ? (m as any).text
      : "";
  return raw.trim().length > 0;
};

const isStreaming = (m: Message | undefined): boolean => {
  if (!m) return false;
  return (m as any)?.streaming === true || (m as any)?.status === "streaming";
};

// Se a última mensagem for da Eco, estiver streamando e ainda sem texto,
// o ChatMessage já mostra os três pontinhos dentro da bolha.
// Então evitamos repetir o indicador global "Eco refletindo..." no rodapé.
const lastEcoIsTypingInsideBubble = (list: Message[]): boolean => {
  if (!Array.isArray(list) || list.length === 0) return false;
  const last = list[list.length - 1];
  return isEcoMessage(last) && isStreaming(last) && !hasVisibleText(last);
};

export type MessageListProps = {
  messages: Message[];
  prefersReducedMotion: boolean;
  ecoActivityTTS?: (payload: any) => void;
  isEcoTyping?: boolean;
  feedbackPrompt?: React.ReactNode; // tipado
  endRef?: RefObject<HTMLDivElement>;
  onRetryMessage?: (messageId: string) => void;
};

const MessageList: React.FC<MessageListProps> = ({
  messages,
  prefersReducedMotion,
  ecoActivityTTS,
  feedbackPrompt,
  isEcoTyping,
  endRef,
  onRetryMessage,
}) => {
  const handleTTS = ecoActivityTTS ?? (() => {});

  const buildMessageKey = (message: Message, index: number): string => {
    const role = message.role ?? resolveMessageSender(message) ?? (message as any).sender ?? "unknown";
    const normalizedRole = typeof role === "string" && role.trim().length > 0 ? role.trim() : "unknown";
    const clientMessageId = extractClientMessageId(message);
    if (clientMessageId) {
      return `${normalizedRole}:${clientMessageId}`;
    }
    const messageId =
      (typeof (message as any).id === "string" && (message as any).id.trim()) ||
      (typeof (message as { message_id?: unknown }).message_id === "string"
        ? (((message as { message_id?: string }).message_id as string) ?? "").trim()
        : "");
    if (messageId) {
      return `${normalizedRole}:${messageId}`;
    }
    const interactionId =
      (typeof (message as any).interaction_id === "string" && (message as any).interaction_id.trim()) ||
      (typeof (message as any).interactionId === "string" && (message as any).interactionId.trim()) ||
      "";
    if (interactionId) {
      return `${normalizedRole}:${interactionId}`;
    }
    return `${normalizedRole}:local-${index}`;
  };

  const uniqueMessages = useMemo(() => {
    if (!Array.isArray(messages) || messages.length === 0) return messages;
    const seen = new Set<string>();
    return messages.filter((message, index) => {
      if (!message) return false;
      const key = buildMessageKey(message, index);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [messages]);

  const showGlobalTyping = Boolean(isEcoTyping) && !lastEcoIsTypingInsideBubble(uniqueMessages);

  try {
    console.debug(
      "[DIAG] render:list",
      messages.map((message) => ({
        id: (message as any)?.id ?? null,
        role: (message as any)?.role ?? (message as any)?.sender ?? "unknown",
        status: (message as any)?.status ?? null,
        len:
          typeof (message as any)?.text === "string"
            ? (message as any).text.length
            : (message as any)?.content
            ? String((message as any).content).length
            : 0,
      })),
    );
  } catch {
    /* noop */
  }

  return (
    <div className="w-full space-y-fluid-sm md:space-y-fluid-md">
      {uniqueMessages.map((message, index) => {
        const messageKey = buildMessageKey(message, index);
        return (
          <motion.div
            key={messageKey || `auto-${index}`}
            className="w-full"
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: prefersReducedMotion ? 0 : 0.18,
              ease: prefersReducedMotion ? "linear" : "easeOut",
            }}
          >
            {isEcoMessage(message) ? (
              <EcoMessageWithAudio
                message={message as any}
                onActivityTTS={handleTTS}
                onRetry={onRetryMessage ? () => onRetryMessage(message.id) : undefined}
              />
            ) : (
              // Passa isEcoTyping para o ChatMessage para que ele controle os três pontinhos na bolha
              <ChatMessage
                message={message}
                isEcoTyping={isEcoTyping}
                onRetry={onRetryMessage ? () => onRetryMessage(message.id) : undefined}
              />
            )}
          </motion.div>
        );
      })}

      {feedbackPrompt}

      {showGlobalTyping && (
        <div className="mt-fluid-2xs flex items-center gap-fluid-xs" role="status" aria-live="polite">
          <TypingDots variant="bubble" size="md" tone="auto" />
          <span className="text-fluid-sm italic text-gray-500">Eco refletindo...</span>
        </div>
      )}

      <div ref={endRef} className="anchor-end h-px" />
    </div>
  );
};

export default MessageList;
