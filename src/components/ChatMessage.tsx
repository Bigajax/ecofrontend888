import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Message } from '../contexts/ChatContext';

interface ChatMessageProps {
  message: Message;
  isEcoTyping?: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isEcoTyping }) => {
  const isUser = message.sender === 'user';
  const displayText = String(message.text ?? message.content ?? '');

  // só mostra indicador se for mensagem da Eco
  const showTyping = !!isEcoTyping && !isUser;

  return (
    <div
      className={`flex mb-1 sm:mb-2 ${isUser ? 'justify-end' : 'justify-start'}`}
      role="listitem"
      aria-live="polite"
    >
      <div
        className={[
          // container/bubble base
          'chat-bubble-base px-3 py-2 sm:px-4 sm:py-3 rounded-2xl shadow-sm select-text',
          // vidro por remetente
          isUser ? 'glass-bubble-user rounded-br-sm' : 'glass-bubble-eco rounded-bl-sm',
          // “respirar” levinho enquanto digita (respeita prefers-reduced-motion no CSS global)
          showTyping ? 'animate-gentle-pulse' : '',
        ].join(' ')}
      >
        {showTyping ? (
          // Indicador “3 pontinhos” com onda e acessibilidade
          <div
            className="typing-indicator"
            role="status"
            aria-live="polite"
            aria-label="ECO está digitando…"
          >
            <div className="typing-dots">
              <span
                className="animate-wave-dot w-2 h-2 rounded-full bg-gray-600/80 motion-reduce:animate-none"
                style={{ animationDelay: '0s' }}
                aria-hidden="true"
              />
              <span
                className="animate-wave-dot w-2 h-2 rounded-full bg-gray-600/80 motion-reduce:animate-none"
                style={{ animationDelay: '.2s' }}
                aria-hidden="true"
              />
              <span
                className="animate-wave-dot w-2 h-2 rounded-full bg-gray-600/80 motion-reduce:animate-none"
                style={{ animationDelay: '.4s' }}
                aria-hidden="true"
              />
            </div>
          </div>
        ) : (
          <div
            className={[
              // força Inter/sans e tamanhos coerentes
              'font-sans leading-relaxed text-[14px] sm:text-sm md:text-base',
              'text-gray-900',
            ].join(' ')}
          >
            <div
              className={[
                // Typography, herdando fonte sans
                'prose prose-sm sm:prose-base max-w-none font-sans',
                // neutraliza exageros de ênfase
                'prose-p:font-normal prose-li:font-normal prose-strong:font-semibold prose-em:italic',
                // títulos não viram display
                'prose-headings:font-semibold prose-headings:leading-snug prose-headings:text-[1em] prose-headings:font-sans',
                // espaçamentos suaves
                'prose-p:my-1.5 sm:prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5',
                // links/código/imagens
                'prose-a:break-words prose-a:underline',
                'prose-pre:bg-gray-50/70 prose-pre:border prose-pre:border-gray-200/60 prose-pre:rounded-lg prose-pre:p-3',
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
