// src/components/__tests__/ChatMessage.test.tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import ChatMessage from "../ChatMessage";
import type { Message } from "../../contexts/ChatContext";

describe("ChatMessage", () => {
  it("should display the finish reason label for assistant messages", () => {
    const message: Message = {
      id: "1",
      role: "assistant",
      content: "",
      metadata: {
        finishReason: "stop",
      },
    };
    render(<ChatMessage message={message} />);
    expect(screen.getByText("(stop)")).toBeInTheDocument();
  });
});
