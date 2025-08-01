import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Message } from '../contexts/ChatContext';

interface ChatMessageProps {
  message: Message;
  isEcoTyping?: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isEcoTyping }) => {
  const isUser = message.sender === 'user';
  const displayText = message.text ?? message.content ?? '';

  return (
    <div
      className={`flex mb-1 sm:mb-2 ${isUser ? 'justify-end' : 'justify-start'}`}
      role="listitem"
      aria-live="polite"
    >
      <div
        className={[
          // dimensões
          'px-3 py-2 sm:px-4 sm:py-3 rounded-2xl shadow',
          'max-w-[80vw] sm:max-w-[70ch]',
          'break-words break-anywhere',
          // cores
          isUser
            ? 'bg-[#d8f1f5] text-gray-900 rounded-br-sm'
            : 'bg-white text-gray-900 rounded-bl-sm',
        ].join(' ')}
      >
        {isEcoTyping ? (
          <div className="flex items-end gap-1" aria-label="Eco está digitando">
            {/* respeita prefers-reduced-motion */}
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-wave-dot motion-reduce:animate-none" style={{ animationDelay: '0s' }} />
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-wave-dot motion-reduce:animate-none" style={{ animationDelay: '0.2s' }} />
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-wave-dot motion-reduce:animate-none" style={{ animationDelay: '0.4s' }} />
          </div>
        ) : (
          <div
            className={[
              'leading-relaxed',
              'text-[15px] sm:text-sm md:text-base',
              isUser ? 'text-gray-900' : 'text-gray-800',
            ].join(' ')}
          >
            <div
              className={[
                'prose prose-sm sm:prose-base max-w-none',
                // títulos e listas mais sutis no chat
                'prose-h1:text-lg prose-h2:text-base prose-h3:text-sm',
                'prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5',
                // links e imagens
                'prose-a:break-words prose-a:underline',
                'prose-img:rounded-lg prose-img:max-h-64 prose-img:w-auto',
                // blocos de código
                'prose-pre:bg-gray-50 prose-pre:border prose-pre:border-gray-200 prose-pre:rounded-lg',
                'prose-pre:p-3 prose-code:before:content-[""] prose-code:after:content-[""]',
              ].join(' ')}
            >
              {/* Permite rolagem horizontal em código/tabelas */}
              <div className="overflow-x-auto">
                <ReactMarkdown>{displayText}</ReactMarkdown>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
