import React, { RefObject } from 'react';
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

  return (
    <div className="w-full space-y-3 md:space-y-4">
      {messages.map((message) => (
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
