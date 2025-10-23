import React, { RefObject, useMemo } from 'react';
import { motion } from 'framer-motion';

import ChatMessage from './ChatMessage';
import EcoMessageWithAudio from './EcoMessageWithAudio';
import type { Message } from '../contexts/ChatContext';

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
    const seenInteractionSenders = new Set<string>();
    const deduped: Message[] = [];

    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (!message) continue;
      const id = typeof message.id === 'string' ? message.id : '';
      const interactionKey =
        (typeof message.interaction_id === 'string' && message.interaction_id.trim()) ||
        (typeof message.interactionId === 'string' && message.interactionId.trim()) ||
        '';
      const interactionSenderKey =
        interactionKey && typeof message.sender === 'string' && message.sender
          ? `${interactionKey}:${message.sender}`
          : '';

      if (id && seen.has(id)) {
        continue;
      }
      if (interactionSenderKey && seenInteractionSenders.has(interactionSenderKey)) {
        continue;
      }
      if (id) {
        seen.add(id);
      }
      if (interactionSenderKey) {
        seenInteractionSenders.add(interactionSenderKey);
      }
      deduped.unshift(message);
    }

    return deduped;
  }, [messages]);

  return (
    <div className="w-full space-y-3 md:space-y-4">
      {uniqueMessages.map((message) => (
        <motion.div
          key={message.id}
          className="w-full"
          initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: prefersReducedMotion ? 0 : 0.18,
            ease: prefersReducedMotion ? 'linear' : 'easeOut',
          }}
        >
          {message.sender === 'eco' ? (
            <EcoMessageWithAudio
              message={message as any}
              onActivityTTS={handleTTS}
            />
          ) : (
            <ChatMessage message={message} />
          )}
        </motion.div>
      ))}

      {feedbackPrompt}

      {typingIndicator}

      <div ref={endRef} className="anchor-end h-px" />
    </div>
  );
};

export default MessageList;
