import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import * as ecoStreamApi from '../../api/ecoStream';
import type { Message } from '../../contexts/ChatContext';
import { useEcoStream } from '../useEcoStream';

describe('useEcoStream.handleSendMessage', () => {
  it('appends a done user message stamped with a numeric createdAt', async () => {
    const startEcoStreamSpy = vi
      .spyOn(ecoStreamApi, 'startEcoStream')
      .mockResolvedValue();

    try {
      const { result } = renderHook(() => {
        const [messages, setMessages] = React.useState<Message[]>([]);
        const stream = useEcoStream({ setMessages });
        return { ...stream, messages };
      });

      await act(async () => {
        await result.current.handleSendMessage('Olá, Eco!');
      });

      expect(startEcoStreamSpy).toHaveBeenCalledTimes(1);

      const userMessage = result.current.messages.find((message) => message.sender === 'user');

      expect(userMessage).toBeDefined();
      expect(userMessage?.status).toBe('done');

      const createdAt = userMessage?.createdAt;
      expect(typeof createdAt).toBe('number');
      if (typeof createdAt === 'number') {
        expect(createdAt).toBeGreaterThan(0);
      }
    } finally {
      startEcoStreamSpy.mockRestore();
    }
  });
});

