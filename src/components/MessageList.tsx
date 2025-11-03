import React, { RefObject, useMemo } from 'react';
import { motion } from 'framer-motion';

import ChatMessage from './ChatMessage';
import EcoMessageWithAudio from './EcoMessageWithAudio';
import TypingDots from '../components/TypingDots';
import type { Message } from '../contexts/ChatContext';
import { isEcoMessage, resolveMessageSender } from '../utils/chat/messages';

const extractClientMessageId = (message: Message | undefined): string | undefined => {
  if (!message) return undefined;
  if (typeof message.client_message_id === 'string') {
    const trimmed = message.client_message_id.trim();
    if (trimmed) return trimmed;
  }
  const camelCaseId = (message as { clientMessageId?: unknown }).clientMessageId;
  if (typeof camelCaseId === 'string') {
    const trimmed = camelCaseId.trim();
    if (trimmed) return trimmed;
  }
  return undefined;
};

type MessageListProps = {
  messages: Message[];
  prefersReducedMotion: boolean;
  ecoActivityTTS?: (payload: any) => void;
  /** Controla exibição do indicador global de digitação */
  isEcoTyping?: boolean;
  /** Nó opcional injetado pelo pai para indicador de digitação; se ausente, usa <TypingDots/> */
  typingIndicator?: React.ReactNode;
  /** Nó opcional com o prompt de feedback (renderizado após a lista) */
  feedbackPrompt?: React.ReactNode;
  endRef?: RefObject<HTMLDivElement>;
};

const MessageList: React.FC<MessageListProps> = ({
  messages,
  prefersReducedMotion,
  ecoActivityTTS,
  feedbackPrompt,
  isEcoTyping,
  typingIndicator,
  endRef,
}) => {
  const handleTTS = ecoActivityTTS ?? (() => {});

  const buildMessageKey = (message: Message, index: number): string => {
    const role = message.role ?? resolveMessageSender(message) ?? message.sender ?? 'unknown';
    const normalizedRole = typeof role === 'string' && role.trim().length > 0 ? role.trim() : 'unknown';
    const clientMessageId = extractClientMessageId(message);
    if (clientMessageId) {
      return `${normalizedRole}:${clientMessageId}`;
    }
    const messageId =
      (typeof message.id === 'string' && message.id.trim()) ||
      (typeof (message as { message_id?: unknown }).message_id === 'string'
        ? ((message as { message_id?: string }).message_id ?? '').trim()
        : '');
    if (messageId) {
      return `${normalizedRole}:${messageId}`;
    }
    const interactionId =
      (typeof message.interaction_id === 'string' && message.interaction_id.trim()) ||
      (typeof message.interactionId === 'string' && message.interactionId.trim()) ||
      '';
    if (interactionId) {
      return `${normalizedRole}:${interactionId}`;
    }
    return `${normalizedRole}:local-${index}`;
  };

  const uniqueMessages = useMemo(() => {
    if (!Array.isArray(messages) || messages.length === 0) {
      return messages;
    }

    const seen = new Set<string>();
    return messages.filter((message, index) => {
      if (!message) return false;
      const key = buildMessageKey(message, index);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }, [messages]);

  try {
    console.debug(
      '[DIAG] render:list',
      messages.map((message) => ({
        id: message?.id ?? null,
        role: message?.role ?? message?.sender ?? 'unknown',
        status: message?.status ?? null,
        len:
          typeof message?.text === 'string'
            ? message.text.length
            : message?.content
            ? String(message.content).length
            : 0,
      })),
    );
  } catch {
    /* noop */
  }

  return (
    <div className="w-full space-y-3 md:space-y-4">
      {uniqueMessages.map((message, index) => {
        const normalizedRole = message.role ?? resolveMessageSender(message) ?? message.sender ?? 'unknown';
        const interactionId =
          (typeof message.interaction_id === 'string' && message.interaction_id.trim()) ||
          (typeof message.interactionId === 'string' && message.interactionId.trim()) ||
          '';
        const clientLocalId =
          (typeof message.client_message_id === 'string' && message.client_message_id.trim()) ||
          (typeof (message as { clientMessageId?: unknown }).clientMessageId === 'string'
            ? ((message as { clientMessageId?: string }).clientMessageId ?? '').trim()
            : '') ||
          (typeof message.id === 'string' && message.id.trim()) ||
          (typeof (message as { message_id?: unknown }).message_id === 'string'
            ? ((message as { message_id?: string }).message_id ?? '').trim()
            : '');
        const interactionOrLocal = interactionId || clientLocalId || `local-${index}`;
        const messageKey = buildMessageKey(message, index);

        return (
          <motion.div
            key={messageKey || `auto-${index}`}
            className="w-full"
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: prefersReducedMotion ? 0 : 0.18,
              ease: prefersReducedMotion ? 'linear' : 'easeOut',
            }}
          >
            {isEcoMessage(message) ? (
              <EcoMessageWithAudio message={message as any} onActivityTTS={handleTTS} />
            ) : (
              <ChatMessage message={message} />
            )}
          </motion.div>
        );
      })}

      {feedbackPrompt}

      {isEcoTyping && (
        <div className="flex items-center gap-2 mt-1">
          {typingIndicator ?? <TypingDots variant="bubble" size="md" tone="auto" />}
          <span className="text-gray-500 italic">Eco refletindo...</span>
        </div>
      )}

      <div ref={endRef} className="anchor-end h-px" />
    </div>
  );
};

export default MessageList;
