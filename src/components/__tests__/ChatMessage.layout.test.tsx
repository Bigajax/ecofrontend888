import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ChatMessage from '../ChatMessage';
import type { Message } from '../../contexts/ChatContext';

describe('ChatMessage layout', () => {
  const userMessage: Message = {
    id: 'user-1',
    sender: 'user',
    text: 'Olá Eco',
  };

  it('applies user bubble styling and alignment', () => {
    const { container } = render(<ChatMessage message={userMessage} />);
    const wrapper = container.firstElementChild as HTMLElement;

    expect(wrapper).toHaveClass('flex', 'w-full', 'mb-2', 'justify-end');

    const bubble = container.querySelector('[data-sender="user"]');
    expect(bubble).not.toBeNull();
    expect(bubble).toHaveClass('bg-[#007AFF]', 'text-white', 'max-w-[80%]', 'whitespace-pre-wrap');
  });

  it('renders eco avatar spacing and preserves multi-line text', () => {
    const ecoMessage: Message = {
      id: 'eco-1',
      sender: 'eco',
      text: 'Linha 1\nLinha 2',
    };

    const { container } = render(<ChatMessage message={ecoMessage} />);
    const wrapper = container.firstElementChild as HTMLElement;

    expect(wrapper).toHaveClass('justify-start');

    const bubble = container.querySelector('[data-sender="eco"]');
    expect(bubble).not.toBeNull();
    expect(bubble).toHaveClass('bg-white', 'text-gray-900', 'whitespace-pre-wrap');
    expect(bubble?.textContent).toBe('Linha 1\nLinha 2');

    const ecoAvatar = container.querySelector('.mr-2.mt-1');
    expect(ecoAvatar).not.toBeNull();
  });
});
