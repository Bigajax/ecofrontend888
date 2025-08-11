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
          // container/bubble
          'px-3 py-2 sm:px-4 sm:py-3 rounded-2xl shadow select-text',
          'max-w-[min(720px,88vw)] whitespace-pre-wrap break-words',
          // cores
          isUser
            ? 'bg-[#d8f1f5] text-gray-900 rounded-br-sm'
            : 'bg-white text-gray-900 rounded-bl-sm',
        ].join(' ')}
      >
        {isEcoTyping ? (
          <div className="flex items-end gap-1" aria-label="Eco está digitando">
            <span
              className="w-2 h-2 bg-gray-400 rounded-full animate-wave-dot motion-reduce:animate-none"
              style={{ animationDelay: '0s' }}
            />
            <span
              className="w-2 h-2 bg-gray-400 rounded-full animate-wave-dot motion-reduce:animate-none"
              style={{ animationDelay: '0.2s' }}
            />
            <span
              className="w-2 h-2 bg-gray-400 rounded-full animate-wave-dot motion-reduce:animate-none"
              style={{ animationDelay: '0.4s' }}
            />
          </div>
        ) : (
          <div
            className={[
              // força Inter/sans e tamanhos coerentes
              'font-sans leading-relaxed text-[14px] sm:text-sm md:text-base',
              isUser ? 'text-gray-900' : 'text-gray-800',
            ].join(' ')}
          >
            <div
              className={[
                // Typography, mas herdando fonte sans
                'prose prose-sm sm:prose-base max-w-none font-sans',
                // neutraliza exageros de ênfase do plugin
                'prose-p:font-normal prose-li:font-normal prose-strong:font-semibold prose-em:italic',
                // títulos não mudam família/tamanho (parecem texto normal)
                'prose-headings:font-semibold prose-headings:leading-snug prose-headings:text-[1em] prose-headings:font-sans',
                // espaçamentos suaves
                'prose-p:my-1.5 sm:prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5',
                // links/código/imagens
                'prose-a:break-words prose-a:underline',
                'prose-pre:bg-gray-50 prose-pre:border prose-pre:border-gray-200 prose-pre:rounded-lg prose-pre:p-3',
                'prose-code:before:content-[""] prose-code:after:content-[""]',
                'prose-img:rounded-lg prose-img:max-w-full prose-img:h-auto',
              ].join(' ')}
            >
              {/* scroll horizontal seguro p/ código/tabelas */}
              <div className="overflow-x-auto">
                <ReactMarkdown
                  components={{
                    p: ({ node, ...props }) => (
                      <p className="m-0 mb-2 last:mb-0" {...props} />
                    ),
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
