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
          // layout/tamanho
          'px-3 py-2 sm:px-4 sm:py-3 rounded-2xl shadow select-text',
          'max-w-[min(720px,88vw)] whitespace-pre-wrap break-words',
          // cores
          isUser
            ? 'bg-[#d8f1f5] text-gray-900 rounded-br-sm'
            : 'bg-white text-gray-900 rounded-bl-sm',
          // tipografia consistente (nada de serif aqui)
          'font-sans'
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
          <div className={['leading-relaxed', 'text-[14px] sm:text-[15px]'].join(' ')}>
            {/* Conteúdo Markdown com estilização manual (sem prose) */}
            <div className="overflow-x-auto">
              <ReactMarkdown
                components={{
                  p: ({ node, ...props }) => (
                    <p className="mb-2 last:mb-0 font-normal" {...props} />
                  ),
                  em: ({ node, ...props }) => (
                    // se quiser remover itálico, troque 'italic' por 'not-italic'
                    <em className="italic font-medium" {...props} />
                  ),
                  strong: ({ node, ...props }) => (
                    <strong className="font-semibold" {...props} />
                  ),
                  a: ({ node, ...props }) => (
                    <a
                      className="underline break-words text-gray-900"
                      target="_blank"
                      rel="noreferrer noopener"
                      {...props}
                    />
                  ),
                  ul: ({ node, ...props }) => (
                    <ul className="list-disc ml-5 my-2 space-y-1" {...props} />
                  ),
                  ol: ({ node, ...props }) => (
                    <ol className="list-decimal ml-5 my-2 space-y-1" {...props} />
                  ),
                  li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
                  blockquote: ({ node, ...props }) => (
                    <blockquote
                      className="border-l-4 border-gray-200 pl-3 my-2 text-gray-800 italic"
                      {...props}
                    />
                  ),
                  code: ({ inline, className, children, ...props }) =>
                    inline ? (
                      <code
                        className="bg-gray-100 rounded px-1 py-0.5 text-xs font-mono"
                        {...props}
                      >
                        {children}
                      </code>
                    ) : (
                      <code className="font-mono text-xs" {...props}>
                        {children}
                      </code>
                    ),
                  pre: ({ node, ...props }) => (
                    <pre
                      className="bg-gray-50 border border-gray-200 rounded-lg p-3 my-2 overflow-x-auto"
                      {...props}
                    />
                  ),
                  img: ({ node, ...props }) => (
                    <img className="rounded-lg max-w-full h-auto my-2" {...props} />
                  ),
                  h1: ({ node, ...props }) => (
                    <h1 className="text-base font-semibold mb-2" {...props} />
                  ),
                  h2: ({ node, ...props }) => (
                    <h2 className="text-[15px] font-semibold mb-2" {...props} />
                  ),
                  h3: ({ node, ...props }) => (
                    <h3 className="text-[14px] font-semibold mb-1.5" {...props} />
                  )
                }}
              >
                {displayText}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
