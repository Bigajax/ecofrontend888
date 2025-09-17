import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Message } from '../contexts/ChatContext';

interface ChatMessageProps {
  message: Message;
  isEcoTyping?: boolean;
}

function TypingIndicator() {
  // largura/altura fixas para estabilidade
  return (
    <div
      className="typing-indicator"
      role="status"
      aria-live="polite"
      aria-label="ECO está digitando…"
      style={{ minWidth: 64 }} // evita layout shift
    >
      <div className="typing-dots">
        {/* anima só quando o usuário NÃO pede redução (desktop com “reduzir animações” = fica estático visível) */}
        <span className="w-2 h-2 rounded-full bg-gray-600/80 motion-safe:animate-wave-dot [animation-delay:0s] motion-reduce:opacity-60" />
        <span className="w-2 h-2 rounded-full bg-gray-600/80 motion-safe:animate-wave-dot [animation-delay:.2s] motion-reduce:opacity-60" />
        <span className="w-2 h-2 rounded-full bg-gray-600/80 motion-safe:animate-wave-dot [animation-delay:.4s] motion-reduce:opacity-60" />
      </div>
    </div>
  );
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isEcoTyping }) => {
  const isUser = message.sender === 'user';
  const showTyping = !!isEcoTyping && !isUser;

  // evita custo do markdown enquanto a Eco “digita”
  const displayText = showTyping ? '' : String(message.text ?? message.content ?? '');

  return (
    <div
      className={`flex mb-1 sm:mb-2 ${isUser ? 'justify-end' : 'justify-start'}`}
      role="listitem"
      aria-live="polite"
      aria-atomic="false"
    >
      <div
        className={[
          'chat-bubble-base px-3 py-2 sm:px-4 sm:py-3 rounded-2xl shadow-sm select-text',
          isUser ? 'glass-bubble-user rounded-br-sm' : 'glass-bubble-eco rounded-bl-sm',
          showTyping ? 'motion-safe:animate-gentle-pulse' : '',
        ].join(' ')}
        aria-busy={showTyping || undefined}
      >
        {showTyping ? (
          <TypingIndicator />
        ) : (
          <div className="font-sans leading-relaxed text-[14px] sm:text-sm md:text-base text-gray-900">
            <div
              className={[
                'prose prose-sm sm:prose-base max-w-none font-sans',
                'prose-p:font-normal prose-li:font-normal prose-strong:font-semibold prose-em:italic',
                'prose-headings:font-semibold prose-headings:leading-snug prose-headings:text-[1em] prose-headings:font-sans',
                'prose-p:my-1.5 sm:prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5',
                'prose-a:break-words prose-a:underline',
                'prose-pre:bg-gray-50/70 prose-pre:border prose-pre:border-gray-200/60 prose-pre:rounded-lg prose-pre:p-3',
                'prose-code:before:content-[""] prose-code:after:content-[""]',
                'prose-img:rounded-lg prose-img:max-w-full prose-img:h-auto',
              ].join(' ')}
            >
              <div className="overflow-x-auto">
                <ReactMarkdown
                  components={{
                    p: ({ node, ...props }) => <p className="m-0 mb-2 last:mb-0" {...props} />,
                  }}
                >
                  {displayText}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
