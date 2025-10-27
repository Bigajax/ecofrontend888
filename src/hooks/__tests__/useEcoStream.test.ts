import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import * as ecoStreamApi from '../../api/ecoStream';
import type { Message } from '../../contexts/ChatContext';
import { useEcoStream } from '../useEcoStream';
import { processSseLine, type ProcessSseHandlers } from '../useEcoStream/chunkProcessor';

describe('useEcoStream.handleSendMessage', () => {
  it('appends a done user message stamped with a numeric createdAt', async () => {
    const streamResponse = new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.close();
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      },
    );

    const fetchMock = vi
      .spyOn(globalThis as { fetch: typeof fetch }, 'fetch')
      .mockResolvedValue(streamResponse);

    const startEcoStreamSpy = vi.spyOn(ecoStreamApi, 'startEcoStream').mockResolvedValue();

    try {
      const { result } = renderHook(() => {
        const [messages, setMessages] = React.useState<Message[]>([]);
        const stream = useEcoStream({ setMessages });
        return { ...stream, messages };
      });

      await act(async () => {
        await result.current.handleSendMessage('Olá, Eco!');
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(startEcoStreamSpy).not.toHaveBeenCalled();

      const userMessage = result.current.messages.find((message) => message.sender === 'user');

      expect(userMessage).toBeDefined();
      expect(userMessage?.status).toBe('done');

      const createdAt = userMessage?.createdAt;
      expect(typeof createdAt).toBe('number');
      if (typeof createdAt === 'number') {
        expect(createdAt).toBeGreaterThan(0);
      }
    } finally {
      fetchMock.mockRestore();
      startEcoStreamSpy.mockRestore();
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

