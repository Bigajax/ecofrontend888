import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import * as streamOrchestrator from '../useEcoStream/streamOrchestrator';
import type { Message } from '../../contexts/ChatContext';
import { useEcoStream } from '../useEcoStream';
import { processSseLine, type ProcessSseHandlers } from '../useEcoStream/chunkProcessor';

describe('useEcoStream.handleSendMessage', () => {
  it('appends a done user message stamped with a numeric createdAt', async () => {
    const beginStreamSpy = vi.spyOn(streamOrchestrator, 'beginStream').mockResolvedValue({} as any);

    try {
      const { result } = renderHook(() => {
        const [messages, setMessagesState] = React.useState<Message[]>([]);
        const setMessages = React.useCallback(
          (update: React.SetStateAction<Message[]>) =>
            setMessagesState((prev) =>
              typeof update === 'function' ? (update as (draft: Message[]) => Message[])(prev) : update,
            ),
          [messages],
        );
        const stream = useEcoStream({ setMessages });
        return { ...stream, messages };
      });

      await act(async () => {
        await result.current.handleSendMessage('Olá, Eco!');
      });

      await waitFor(() => {
        expect(beginStreamSpy).toHaveBeenCalledTimes(1);
      });

      const userMessage = result.current.messages.find((message) => message.sender === 'user');

      expect(userMessage).toBeDefined();
      expect(userMessage?.status).toBe('done');

      const createdAt = userMessage?.createdAt;
      expect(typeof createdAt).toBe('number');
      if (typeof createdAt === 'number') {
        expect(createdAt).toBeGreaterThan(0);
      }
    } finally {
      beginStreamSpy.mockRestore();
    }
  });
});

describe('processSseLine event normalization', () => {
  const buildHandlers = () => {
    const appendAssistantDelta = vi.fn();
    const onStreamDone = vi.fn();
    const handlers: ProcessSseHandlers = {
      appendAssistantDelta,
      onStreamDone,
      onControl: vi.fn(),
      onPromptReady: vi.fn(),
      onError: vi.fn(),
    };
    return { handlers, appendAssistantDelta, onStreamDone };
  };

  it('routes response.output_text.delta events to appendAssistantDelta', () => {
    const { handlers, appendAssistantDelta, onStreamDone } = buildHandlers();

    processSseLine(
      JSON.stringify({
        type: 'response.output_text.delta',
        payload: { index: 3, delta: 'Olá' },
      }),
      handlers,
      { eventName: 'message' },
    );

    expect(appendAssistantDelta).toHaveBeenCalledTimes(1);
    expect(appendAssistantDelta).toHaveBeenCalledWith(3, 'Olá', expect.any(Object));
    expect(onStreamDone).not.toHaveBeenCalled();
  });

  it('supports payload deltas provided as objects with nested text', () => {
    const { handlers, appendAssistantDelta } = buildHandlers();

    processSseLine(
      JSON.stringify({
        type: 'response.output_text.delta',
        payload: { index: 1, delta: { text: 'Texto parcial' } },
      }),
      handlers,
      { eventName: 'message' },
    );

    expect(appendAssistantDelta).toHaveBeenCalledTimes(1);
    expect(appendAssistantDelta).toHaveBeenCalledWith(1, 'Texto parcial', expect.any(Object));
  });

  it('joins text fragments collected from nested payload arrays', () => {
    const { handlers, appendAssistantDelta } = buildHandlers();

    processSseLine(
      JSON.stringify({
        type: 'response.output_text.delta',
        payload: {
          index: 2,
          delta: {
            content: [
              { text: 'Olá' },
              { text: ' ' },
              { text: 'Eco!' },
            ],
          },
        },
      }),
      handlers,
      { eventName: 'message' },
    );

    expect(appendAssistantDelta).toHaveBeenCalledTimes(1);
    expect(appendAssistantDelta).toHaveBeenCalledWith(2, 'Olá Eco!', expect.any(Object));
  });

  it('routes response.completed events to onStreamDone', () => {
    const { handlers, appendAssistantDelta, onStreamDone } = buildHandlers();

    processSseLine(
      JSON.stringify({
        type: 'response.completed',
        payload: { status: 'ok' },
      }),
      handlers,
      { eventName: 'message' },
    );

    expect(onStreamDone).toHaveBeenCalledTimes(1);
    expect(onStreamDone).toHaveBeenCalledWith(expect.objectContaining({ payload: { status: 'ok' } }));
    expect(appendAssistantDelta).not.toHaveBeenCalled();
  });
});

