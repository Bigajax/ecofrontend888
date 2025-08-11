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
      className={`flex mb-0.5 sm:mb-2 ${isUser ? 'justify-end' : 'justify-start'}`}
      role="listitem"
      aria-live="polite"
    >
      <div
        className={[
          // dimensões + base responsiva consistente
          'px-3 py-2 sm:px-4 sm:py-3 rounded-2xl shadow select-text',
          'max-w-[88vw] md:max-w-[72ch] whitespace-pre-wrap',
          // quebras seguras
          'break-words overflow-hidden',
          // usa a classe base do CSS para overflow-wrap:anywhere
          'chat-bubble-base',
          // cores
          isUser
            ? 'bg-[#d8f1f5] text-gray-900 rounded-br-sm'
            : 'bg-white text-gray-900 rounded-bl-sm',
        ].join(' ')}
        style={{ WebkitTextSizeAdjust: '100%', textSizeAdjust: '100%' }}
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
              // fonte estável em todos os mobiles
              'leading-[1.6]',
              'text-[15px] sm:text-[15px] md:text-[16px]',
              isUser ? 'text-gray-900' : 'text-gray-800',
            ].join(' ')}
          >
            {/* Markdown com estilos minimamente tipográficos, sem “encolher” */}
            <ReactMarkdown
              components={{
                p: ({ node, ...props }) => (
                  <p className="my-1.5">{props.children}</p>
                ),
                a: ({ node, ...props }) => (
                  <a
                    className="underline break-words"
                    target="_blank"
                    rel="noopener noreferrer"
                    {...props}
                  />
                ),
                ul: ({ node, ...props }) => (
                  <ul className="list-disc pl-5 my-1.5 space-y-1">{props.children}</ul>
                ),
                ol: ({ node, ...props }) => (
                  <ol className="list-decimal pl-5 my-1.5 space-y-1">{props.children}</ol>
                ),
                li: ({ node, ...props }) => <li className="pl-0.5">{props.children}</li>,
                h1: ({ node, ...props }) => (
                  <h1 className="text-[16px] font-semibold my-1.5">{props.children}</h1>
                ),
                h2: ({ node, ...props }) => (
                  <h2 className="text-[15px] font-semibold my-1.5">{props.children}</h2>
                ),
                h3: ({ node, ...props }) => (
                  <h3 className="text-[15px] font-medium my-1.5">{props.children}</h3>
                ),
                img: ({ node, ...props }) => (
                  <img className="rounded-lg max-w-full h-auto my-2" {...props} />
                ),
                pre: ({ node, ...props }) => (
                  <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 my-2 overflow-x-auto text-[13px]">
                    {props.children}
                  </pre>
                ),
                code: ({ inline, node, ...props }) =>
                  inline ? (
                    <code className="bg-gray-100 px-1 py-0.5 rounded text-[13px]">
                      {props.children}
                    </code>
                  ) : (
                    <code className="block">{props.children}</code>
                  ),
                table: ({ node, ...props }) => (
                  <div className="overflow-x-auto -mx-1 my-2">
                    <table className="min-w-[480px] text-left" {...props} />
                  </div>
                ),
              }}
            >
              {displayText}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
