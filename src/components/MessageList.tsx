import React, { RefObject, useMemo } from 'react';
import { motion } from 'framer-motion';

import ChatMessage from './ChatMessage';
import EcoMessageWithAudio from './EcoMessageWithAudio';
import type { Message } from '../contexts/ChatContext';
import { isEcoMessage, resolveMessageSender } from '../utils/chat/messages';

type MessageListProps = {
  messages: Message[];
  prefersReducedMotion: boolean;
  ecoActivityTTS?: (payload: any) => void;
  feedbackPrompt?: React.ReactNode;
  typingIndicator?: React.ReactNode;
  endRef?: RefObject<HTMLDivElement>;
};

const MessageList: React.FC<MessageListProps> = ({
  messages,
  prefersReducedMotion,
  ecoActivityTTS,
  feedbackPrompt,
  typingIndicator,
  endRef,
}) => {
  const handleTTS = ecoActivityTTS ?? (() => {});

  const uniqueMessages = useMemo(() => {
    if (!Array.isArray(messages) || messages.length === 0) {
      return messages;
    }

    const seen = new Set<string>();
    return messages.filter((message) => {
      if (!message) return false;
      const key = `${message.id ?? ''}-${message.sender ?? ''}`;
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
        len: typeof message?.text === 'string' ? message.text.length : message?.content
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
        const renderId = typeof message.id === 'string' && message.id ? message.id : undefined;

        if (!renderId) {
          try {
            console.warn('[DIAG] render:missing-id', {
              fallbackKey: interactionOrLocal,
              role: normalizedRole,
            });
          } catch {
            /* noop */
          }
          return null;
        }

        return (
          <motion.div
            key={`${message.id ?? ''}-${message.sender ?? ''}`}
            className="w-full"
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: prefersReducedMotion ? 0 : 0.18,
              ease: prefersReducedMotion ? 'linear' : 'easeOut',
            }}
          >
            {isEcoMessage(message) ? (
              <EcoMessageWithAudio
                message={message as any}
                onActivityTTS={handleTTS}
              />
            ) : (
              <ChatMessage message={message} />
            )}
          </motion.div>
        );
      })}

      {feedbackPrompt}

      {typingIndicator}

      <div ref={endRef} className="anchor-end h-px" />
    </div>
  );
};

export default MessageList;
