import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { render, screen, act, cleanup, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useEcoStream } from '../useEcoStream';
import type { Message as ChatMessageType } from '../../contexts/ChatContext';
import type { BeginStreamParams } from '../useEcoStream/streamOrchestrator';
import { applyChunkToMessages } from '../useEcoStream/chunkProcessor';

let lastStartOptions: BeginStreamParams | null = null;

vi.mock('../useEcoStream/streamOrchestrator', async () => {
  const actual = await vi.importActual<typeof import('../useEcoStream/streamOrchestrator')>(
    '../useEcoStream/streamOrchestrator',
  );
  return {
    ...actual,
    beginStream: vi.fn(async (options: BeginStreamParams) => {
      lastStartOptions = options;
      options.ensureAssistantMessage(options.userMessage.id, {}, { allowCreate: true });
    }),
  };
});

const beginStreamMock = vi.mocked(
  (await import('../useEcoStream/streamOrchestrator')).beginStream,
);

type HarnessHandle = {
  send: (text: string) => Promise<void>;
};

const StreamHarness = forwardRef<HarnessHandle>((_, ref) => {
  const [messages, setMessagesState] = useState<ChatMessageType[]>([]);
  const setMessages = React.useCallback(
    (update: React.SetStateAction<ChatMessageType[]>) =>
      setMessagesState((prev) =>
        typeof update === 'function' ? (update as (draft: ChatMessageType[]) => ChatMessageType[])(prev) : update,
      ),
    [messages],
  );
  const { handleSendMessage } = useEcoStream({ setMessages });

  useImperativeHandle(ref, () => ({
    send: handleSendMessage,
  }));

  return (
    <div>
      {messages.map((message) => (
        <div key={message.id} data-testid={`${message.sender}-${message.id}`}>
          {typeof message.text === 'string' ? message.text : ''}
        </div>
      ))}
    </div>
  );
});

StreamHarness.displayName = 'StreamHarness';

describe('useEcoStream whitespace handling', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    lastStartOptions = null;
    beginStreamMock.mockClear();
  });

  it('preserves whitespace from user messages when rendering', async () => {
    const harnessRef = React.createRef<HarnessHandle>();
    render(<StreamHarness ref={harnessRef} />);

    await act(async () => {
      await harnessRef.current?.send('Olá,  Eco!\n\nLinha 2  com  espaços');
    });

    const userBubbles = await screen.findAllByTestId(/user-/);
    const lastBubble = userBubbles[userBubbles.length - 1];
    expect(lastBubble.textContent).toBe('Olá,  Eco!\n\nLinha 2  com  espaços');
  });

  it('preserves whitespace from streamed chunks when rendering', async () => {
    const harnessRef = React.createRef<HarnessHandle>();
    render(<StreamHarness ref={harnessRef} />);

    await act(async () => {
      await harnessRef.current?.send('Olá');
    });

    await waitFor(() => {
      expect(beginStreamMock).toHaveBeenCalled();
    });
    expect(lastStartOptions).toBeTruthy();

    await act(async () => {
      if (!lastStartOptions) throw new Error('beginStream not called');
      applyChunkToMessages({
        clientMessageId: lastStartOptions.userMessage.id,
        chunk: {
          index: 0,
          text: 'Primeira linha\r\n\r\n  Segunda linha  com  espaços  internos',
        },
        ensureAssistantMessage: lastStartOptions.ensureAssistantMessage,
        setDigitando: lastStartOptions.setDigitando,
        logSse: lastStartOptions.logSse,
        streamTimersRef: lastStartOptions.streamTimersRef,
        assistantByClientRef: lastStartOptions.tracking.assistantByClientRef,
        activeStreamClientIdRef: lastStartOptions.activeStreamClientIdRef,
        activeAssistantIdRef: lastStartOptions.activeAssistantIdRef,
        setMessages: lastStartOptions.setMessages,
        upsertMessage: lastStartOptions.upsertMessage,
        replyState: lastStartOptions.replyState,
        tracking: lastStartOptions.tracking,
      });
    });

    const ecoBubbles = await screen.findAllByTestId(/eco-/);
    const lastBubble = ecoBubbles[ecoBubbles.length - 1];
    expect(lastBubble.textContent).toBe('Primeira linha\r\n\r\n  Segunda linha  com  espaços  internos');
  });

  it('keeps the latest user bubble visible while the Eco stream updates', async () => {
    const harnessRef = React.createRef<HarnessHandle>();
    render(<StreamHarness ref={harnessRef} />);

    await act(async () => {
      await harnessRef.current?.send('estou bem');
    });

    await waitFor(() => {
      expect(beginStreamMock).toHaveBeenCalled();
    });
    expect(lastStartOptions).toBeTruthy();

    const userBubbles = await screen.findAllByTestId(/user-/);
    const latestUserBubble = userBubbles[userBubbles.length - 1];
    expect(latestUserBubble.textContent).toBe('estou bem');

    await act(async () => {
      if (!lastStartOptions) throw new Error('beginStream not called');
      applyChunkToMessages({
        clientMessageId: lastStartOptions.userMessage.id,
        chunk: { index: 0, text: 'Que bom saber!' },
        ensureAssistantMessage: lastStartOptions.ensureAssistantMessage,
        setDigitando: lastStartOptions.setDigitando,
        logSse: lastStartOptions.logSse,
        streamTimersRef: lastStartOptions.streamTimersRef,
        assistantByClientRef: lastStartOptions.tracking.assistantByClientRef,
        activeStreamClientIdRef: lastStartOptions.activeStreamClientIdRef,
        activeAssistantIdRef: lastStartOptions.activeAssistantIdRef,
        setMessages: lastStartOptions.setMessages,
        upsertMessage: lastStartOptions.upsertMessage,
        replyState: lastStartOptions.replyState,
        tracking: lastStartOptions.tracking,
      });
    });

    const updatedUserBubbles = await screen.findAllByTestId(/user-/);
    const persistedUserBubble = updatedUserBubbles[updatedUserBubbles.length - 1];
    expect(persistedUserBubble.textContent).toBe('estou bem');
  });

  it('inserts a single glue space between alpha-numeric chunk boundaries', async () => {
    const harnessRef = React.createRef<HarnessHandle>();
    render(<StreamHarness ref={harnessRef} />);

    await act(async () => {
      await harnessRef.current?.send('Oi');
    });

    await waitFor(() => {
      expect(beginStreamMock).toHaveBeenCalled();
    });
    expect(lastStartOptions).toBeTruthy();

    await act(async () => {
      if (!lastStartOptions) throw new Error('beginStream not called');
      const baseParams = {
        clientMessageId: lastStartOptions.userMessage.id,
        ensureAssistantMessage: lastStartOptions.ensureAssistantMessage,
        setDigitando: lastStartOptions.setDigitando,
        logSse: lastStartOptions.logSse,
        streamTimersRef: lastStartOptions.streamTimersRef,
        assistantByClientRef: lastStartOptions.tracking.assistantByClientRef,
        activeStreamClientIdRef: lastStartOptions.activeStreamClientIdRef,
        activeAssistantIdRef: lastStartOptions.activeAssistantIdRef,
        setMessages: lastStartOptions.setMessages,
        upsertMessage: lastStartOptions.upsertMessage,
        replyState: lastStartOptions.replyState,
        tracking: lastStartOptions.tracking,
      };
      applyChunkToMessages({ ...baseParams, chunk: { index: 0, text: 'Bom' } });
      applyChunkToMessages({ ...baseParams, chunk: { index: 1, text: ' dia, ' } });
      applyChunkToMessages({ ...baseParams, chunk: { index: 2, text: 'Rafa.' } });
    });

    const ecoBubbles = await screen.findAllByTestId(/eco-/);
    const lastBubble = ecoBubbles[ecoBubbles.length - 1];
    expect(lastBubble.textContent).toBe('Bom dia, Rafa.');
  });
});
