import React, { memo, useMemo } from 'react';
import clsx from 'clsx';
import ReactMarkdown from 'react-markdown';

import TypingDots from './TypingDots';
import { Message } from '../contexts/ChatContext';

type ChatMessageProps = {
  message: Message;
  isEcoTyping?: boolean;
};

const ChatMessageComponent: React.FC<ChatMessageProps> = ({ message, isEcoTyping }) => {
  const isUser = message.sender === 'user';
  const showTyping = Boolean(isEcoTyping && !isUser);

  const content = useMemo(() => {
    if (showTyping) return '';
    const raw = (message.text ?? message.content ?? '') as string;
    const fragments = Array.isArray((message as any).fragments)
      ? (message as any).fragments.join('')
      : '';
    const joined = `${fragments}${raw}`;
    return joined.trim();
  }, [message, showTyping]);

  if (showTyping) {
    return (
      <div className="typing-bubble" role="status" aria-live="polite" aria-label="ECO está digitando…">
        <TypingDots variant="inline" size="md" />
      </div>
    );
  }

  return (
    <div
      className={clsx('message-bubble message-markdown', isUser ? 'justify-self-end' : 'justify-self-start')}
      data-role={isUser ? 'user' : 'eco'}
      role="listitem"
      dir="auto"
    >
      {content ? (
        <ReactMarkdown
          className="prose prose-sm sm:prose-base max-w-none font-sans leading-relaxed text-[0.96rem]"
          components={{
            p: ({ node, ...props }) => <p className="my-2 first:mt-0 last:mb-0" {...props} />,
            strong: ({ node, ...props }) => <strong className="font-semibold" {...props} />,
            em: ({ node, ...props }) => <em className="italic" {...props} />,
            ul: ({ node, ...props }) => <ul className="my-2 ml-4 list-disc space-y-1" {...props} />,
            ol: ({ node, ...props }) => <ol className="my-2 ml-4 list-decimal space-y-1" {...props} />,
            li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
            a: ({ node, ...props }) => (
              <a className="underline underline-offset-2" target="_blank" rel="noreferrer" {...props} />
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      ) : (
        <span aria-hidden>&nbsp;</span>
      )}
    </div>
  );
};

export default memo(ChatMessageComponent);
