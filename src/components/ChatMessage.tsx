import React from "react";
import ReactMarkdown from "react-markdown";
import { Message } from "../contexts/ChatContext";

interface ChatMessageProps {
  message: Message;
  isEcoTyping?: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isEcoTyping }) => {
  const isUser = message.sender === "user";
  const showTyping = !!isEcoTyping && !isUser;

  const text = showTyping ? "" : String(message.text ?? message.content ?? "").trim();

  const bubbleClass =
    (isUser ? "message-user" : "message-eco") +
    " chat-bubble-base whitespace-pre-wrap select-text w-auto shrink-0 " + // <- impede encolher
    "max-w-[82%] md:max-w-[70%]";

  if (showTyping) {
    return (
      <div className={`w-full flex ${isUser ? "justify-end" : "justify-start"} min-w-0 mb-1 sm:mb-2`} role="status">
        <div className="message-eco bubble-typing">
          <span className="typing-dots"><span/><span/><span/></span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-full flex ${isUser ? "justify-end" : "justify-start"} min-w-0 mb-1 sm:mb-2`}
      role="listitem"
      aria-live="polite"
      aria-atomic="false"
    >
      <div className={bubbleClass} dir="auto">
        {text ? (
          <ReactMarkdown components={{ p: ({ node, ...props }) => <p className="m-0 mb-2 last:mb-0" {...props} /> }}>
            {text}
          </ReactMarkdown>
        ) : (
          <span>&nbsp;</span>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
