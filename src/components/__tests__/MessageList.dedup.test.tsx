import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import MessageList from '../MessageList';

vi.mock('../ChatMessage', () => ({
  __esModule: true,
  default: ({ message }: { message: any }) => (
    <div data-testid={`chat-${message.id}`}>{message.text}</div>
  ),
}));

vi.mock('../EcoMessageWithAudio', () => ({
  __esModule: true,
  default: ({ message }: { message: any }) => (
    <div data-testid={`eco-${message.id}`}>{message.text}</div>
  ),
}));

describe('MessageList deduplication', () => {
  it('keeps both user and eco messages that share an interaction id', () => {
    const messages = [
      {
        id: 'user-1',
        sender: 'user' as const,
        text: 'Olá Eco',
        interaction_id: 'shared-interaction',
      },
      {
        id: 'eco-1',
        sender: 'eco' as const,
        text: 'Olá humano',
        interaction_id: 'shared-interaction',
      },
      {
        id: 'user-1',
        sender: 'user' as const,
        text: 'Mensagem duplicada',
        interaction_id: 'shared-interaction',
      },
    ];

    render(
      <MessageList
        messages={messages}
        prefersReducedMotion
        feedbackPrompt={null}
        typingIndicator={null}
      />,
    );

    expect(screen.getByTestId('chat-user-1')).toBeInTheDocument();
    expect(screen.getByTestId('eco-eco-1')).toBeInTheDocument();
    expect(screen.getAllByTestId('chat-user-1')).toHaveLength(1);
  });
});
