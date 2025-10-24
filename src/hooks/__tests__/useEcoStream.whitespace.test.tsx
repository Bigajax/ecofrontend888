import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { render, screen, act, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useEcoStream } from '../useEcoStream';
import type { Message as ChatMessageType } from '../../contexts/ChatContext';
import type { StartEcoStreamOptions } from '../../api/ecoStream';

let lastStartOptions: StartEcoStreamOptions | null = null;

vi.mock('../../api/ecoStream', async () => {
  const actual = await vi.importActual<typeof import('../../api/ecoStream')>(
    '../../api/ecoStream',
  );
  return {
    ...actual,
    startEcoStream: vi.fn(async (options: StartEcoStreamOptions) => {
      lastStartOptions = options;
    }),
  };
});

const startEcoStreamMock = vi.mocked(
  (await import('../../api/ecoStream')).startEcoStream,
);

type HarnessHandle = {
  send: (text: string) => Promise<void>;
};

const StreamHarness = forwardRef<HarnessHandle>((_, ref) => {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
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
    startEcoStreamMock.mockClear();
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

    expect(startEcoStreamMock).toHaveBeenCalled();
    expect(lastStartOptions).toBeTruthy();

    await act(async () => {
      lastStartOptions?.onChunk?.({
        index: 0,
        text: 'Primeira linha\r\n\r\n  Segunda linha  com  espaços  internos',
      } as any);
    });

    const ecoBubbles = await screen.findAllByTestId(/eco-/);
    const lastBubble = ecoBubbles[ecoBubbles.length - 1];
    expect(lastBubble.textContent).toBe('Primeira linha\n\n  Segunda linha  com  espaços  internos');
  });

  it('keeps the latest user bubble visible while the Eco stream updates', async () => {
    const harnessRef = React.createRef<HarnessHandle>();
    render(<StreamHarness ref={harnessRef} />);

    await act(async () => {
      await harnessRef.current?.send('estou bem');
    });

    const userBubbles = await screen.findAllByTestId(/user-/);
    const latestUserBubble = userBubbles[userBubbles.length - 1];
    expect(latestUserBubble.textContent).toBe('estou bem');

    await act(async () => {
      lastStartOptions?.onChunk?.({ index: 0, text: 'Que bom saber!' } as any);
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

    await act(async () => {
      lastStartOptions?.onChunk?.({ index: 0, text: 'Bom' } as any);
      lastStartOptions?.onChunk?.({ index: 1, text: ' dia, ' } as any);
      lastStartOptions?.onChunk?.({ index: 2, text: 'Rafa.' } as any);
    });

    const ecoBubbles = await screen.findAllByTestId(/eco-/);
    const lastBubble = ecoBubbles[ecoBubbles.length - 1];
    expect(lastBubble.textContent).toBe('Bom dia, Rafa.');
  });
});
