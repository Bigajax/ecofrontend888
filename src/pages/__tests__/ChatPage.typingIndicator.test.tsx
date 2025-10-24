import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, afterEach, describe, expect, test, vi } from 'vitest';
import type { EcoEventHandlers, EcoStreamResult } from '../../api/ecoApi';
import type { StartEcoStreamOptions } from '../../api/ecoStream';

let registerStreamHandlers: ((options: StartEcoStreamOptions) => void) | undefined;
let resolveStartEcoStream: (() => void) | undefined;

vi.mock('../../api/ecoStream', async () => {
  const actual = await vi.importActual<typeof import('../../api/ecoStream')>(
    '../../api/ecoStream',
  );

  return {
    ...actual,
    startEcoStream: vi.fn((options: StartEcoStreamOptions) => {
      registerStreamHandlers?.(options);
      return new Promise<void>((resolve) => {
        resolveStartEcoStream = resolve;
      });
    }),
  };
});

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    userId: 'user-123',
    userName: 'Tester',
    user: { id: 'user-123' },
  }),
}));

vi.mock('../../contexts/ChatContext', () => {
  const React = require('react');
  const ChatContext = React.createContext<any>(null);

  const useChat = () => {
    const value = React.useContext(ChatContext);
    if (!value) throw new Error('useChat mock requires provider');
    return value;
  };

  const ChatProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
    const [messages, setMessages] = React.useState<any[]>([]);

    const contextValue = React.useMemo(
      () => ({
        messages,
        addMessage: (message: any) => setMessages((prev) => [...prev, message]),
        clearMessages: () => setMessages([]),
        updateMessage: (messageId: string, newText: string) =>
          setMessages((prev) =>
            prev.map((m) => (m.id === messageId ? { ...m, text: newText } : m)),
          ),
        setMessages,
      }),
      [messages],
    );

    return <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>;
  };

  return { useChat, ChatProvider };
});

vi.mock('../../components/ChatMessage', () => ({
  default: ({ message }: { message: any }) => {
    const text = typeof message.text === 'string' ? message.text : '';
    const trimmed = text.trim();
    return (
      <div data-testid={`chat-${message.id}`}>
        {trimmed.length > 0 ? text : <div data-testid="typing-dots">digitando…</div>}
      </div>
    );
  },
}));

vi.mock('../../components/EcoMessageWithAudio', () => ({
  default: ({ message }: { message: any }) => {
    const text = typeof message.text === 'string' ? message.text : '';
    const trimmed = text.trim();
    return (
      <div data-testid={`eco-${message.id}`}>
        {trimmed.length > 0 ? text : <div data-testid="typing-dots">digitando…</div>}
      </div>
    );
  },
}));

vi.mock('../../components/QuickSuggestions', () => ({
  __esModule: true,
  DEFAULT_SUGGESTIONS: [],
  DEFAULT_ROTATING: [],
  default: () => null,
}));

vi.mock('../../components/TypingDots', () => ({
  __esModule: true,
  default: () => <div data-testid="typing-dots">digitando…</div>,
}));

vi.mock('../../components/EcoBubbleOneEye', () => ({
  __esModule: true,
  default: () => <div data-testid="eco-bubble" />,
}));

vi.mock('../../components/FeedbackPrompt', () => ({
  FeedbackPrompt: () => null,
}));

vi.mock('../../lib/mixpanel', () => ({
  __esModule: true,
  default: {
    track: vi.fn(),
    people: {
      set: vi.fn(),
    },
  },
}));

vi.mock('../../api/memoriaApi', () => ({
  buscarMemoriasSemelhantesV2: vi.fn().mockResolvedValue([]),
  buscarUltimasMemoriasComTags: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../api/mensagem', () => ({
  salvarMensagem: vi.fn().mockResolvedValue({
    id: 'saved-id',
    conteudo: 'olá',
    usuario_id: 'user-123',
  }),
}));

vi.mock('../../utils/extrairTagsRelevantes', () => ({
  extrairTagsRelevantes: () => [],
}));

vi.mock('../../utils/celebrateFirstMemory', () => ({
  celebrateFirstMemory: vi.fn(),
}));

vi.mock('../../api/ecoApi', () => ({
  enviarMensagemParaEco: vi.fn(),
}));

import ChatPage from '../ChatPage';
import { ChatProvider } from '../../contexts/ChatContext';
import { enviarMensagemParaEco } from '../../api/ecoApi';
import mixpanel from '../../lib/mixpanel';

const originalScrollTo = window.HTMLElement.prototype.scrollTo;
const originalRaf = window.requestAnimationFrame;

describe('ChatPage typing indicator', () => {
  const handlersRef: { current?: EcoEventHandlers } = {};
  let resolveResponse: ((result: EcoStreamResult) => void) | undefined;
  let inflightPromise: Promise<EcoStreamResult> | undefined;

  beforeEach(() => {
    window.HTMLElement.prototype.scrollTo = vi.fn();
    window.requestAnimationFrame = (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    };

    handlersRef.current = undefined;
    resolveResponse = undefined;
    inflightPromise = undefined;

    const enviarMensagemParaEcoMock = enviarMensagemParaEco as unknown as vi.Mock;
    enviarMensagemParaEcoMock.mockReset();

    registerStreamHandlers = (options) => {
      let chunkIndex = 0;
      let latencyFromServer: number | undefined;
      let promptReadyAt: number | undefined;
      let firstTokenAt: number | undefined;
      let doneAt: number | undefined;

      const trackFirstTokenLatency = () => {
        firstTokenAt = performance.now();
        const baseline = typeof promptReadyAt === 'number' ? promptReadyAt : firstTokenAt;
        const latency = Math.max(0, firstTokenAt - baseline);
        mixpanel.track('Eco: Stream First Token Latency', {
          outcome: 'success',
          first_token_latency_ms: latency,
          eco_prompt_ready_at: promptReadyAt,
          eco_first_token_at: firstTokenAt,
        });
        mixpanel.people.set({ eco_first_token_latency_ms: latency });
      };

      const finalizeMetrics = () => {
        doneAt = performance.now();
        const ttfb =
          typeof latencyFromServer === 'number'
            ? latencyFromServer
            : typeof promptReadyAt === 'number' && typeof firstTokenAt === 'number'
            ? Math.max(0, firstTokenAt - promptReadyAt)
            : 0;

        const payload = {
          outcome: 'success',
          latency_source: 'server',
          stage: 'on_done',
          latency_from_stream_ms: latencyFromServer ?? ttfb,
          ttfb_ms: ttfb,
          eco_prompt_ready_at: promptReadyAt,
          eco_first_token_at: firstTokenAt,
          eco_done_at: doneAt,
        };

        mixpanel.track('Eco: Stream TTFB', payload);
        mixpanel.people.set({ eco_ttfb_ms: ttfb });
        console.log('[ChatPage] Eco stream markers', payload);
      };

      const forwardChunk = (event: any, isFirstChunk: boolean) => {
        const textSource =
          typeof event?.text === 'string'
            ? event.text
            : typeof event?.payload?.delta === 'string'
            ? event.payload.delta
            : '';

        options.onChunk?.({
          index: chunkIndex,
          text: textSource,
          metadata: event?.metadata,
          interactionId: event?.interactionId ?? null,
          messageId: event?.messageId ?? null,
          createdAt: event?.createdAt,
          isFirstChunk,
          payload: event?.payload,
        });

        chunkIndex += 1;
      };

      handlersRef.current = {
        onPromptReady: (event: any) => {
          promptReadyAt = performance.now();
          options.onPromptReady?.({
            interactionId: event?.interactionId ?? null,
            messageId: event?.messageId ?? null,
            createdAt: event?.createdAt,
            payload: event?.payload,
          });
        },
        onFirstToken: (event: any) => {
          trackFirstTokenLatency();
          forwardChunk(event, true);
        },
        onChunk: (event: any) => {
          forwardChunk(event, false);
        },
        onDone: (event: any) => {
          options.onDone?.({
            payload: event?.payload,
            interactionId: event?.interactionId ?? null,
            messageId: event?.messageId ?? null,
            createdAt: event?.createdAt,
          });
          finalizeMetrics();
        },
        onLatency: (event: any) => {
          const rawLatency =
            typeof event?.latencyMs === 'number'
              ? event.latencyMs
              : typeof event?.payload?.latency === 'number'
              ? event.payload.latency
              : typeof event?.payload?.value === 'number'
              ? event.payload.value
              : undefined;
          latencyFromServer = rawLatency;
        },
        onMeta: undefined,
        onMetaPending: undefined,
        onMemorySaved: undefined,
        onEvent: undefined,
        onError: (error: Error) => {
          options.onError?.(error);
        },
      } satisfies EcoEventHandlers;
    };

    inflightPromise = new Promise<EcoStreamResult>((resolve) => {
      resolveResponse = (result) => {
        resolveStartEcoStream?.();
        resolve(result);
      };
    });
  });

  afterEach(() => {
    window.HTMLElement.prototype.scrollTo = originalScrollTo;
    window.requestAnimationFrame = originalRaf;
    vi.clearAllMocks();
    registerStreamHandlers = undefined;
    resolveStartEcoStream = undefined;
  });

  test('keeps typing indicator when first token lacks content until chunk arrives', async () => {
    const user = userEvent.setup();

    render(
      <ChatProvider>
        <ChatPage />
      </ChatProvider>,
    );

    const input = await screen.findByPlaceholderText('Converse com a Eco…');
    await user.type(input, 'Oi');

    const sendButton = await screen.findByRole('button', {
      name: 'Enviar mensagem',
    });
    await user.click(sendButton);

    await screen.findAllByTestId('typing-dots');
    expect(handlersRef.current).toBeDefined();

    act(() => {
      handlersRef.current?.onFirstToken?.({
        type: 'first_token',
        text: '   ',
        payload: { delta: '   ' },
      } as any);
    });

    expect(screen.getAllByTestId('typing-dots').length).toBeGreaterThan(0);

    act(() => {
      handlersRef.current?.onChunk?.({
        type: 'chunk',
        text: 'Resposta da Eco',
        payload: { delta: 'Resposta da Eco' },
      } as any);
    });

    expect(screen.getAllByTestId('typing-dots').length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(screen.getByText(/Resposta da Eco/)).toBeInTheDocument();
    });

    await act(async () => {
      handlersRef.current?.onDone?.({
        type: 'done',
        payload: { response: 'Resposta da Eco' },
      } as any);
      resolveResponse?.({ text: 'Resposta da Eco', done: { response: 'Resposta da Eco' } });
      await inflightPromise;
    });

    await waitFor(() => {
      expect(screen.queryAllByTestId('typing-dots')).toHaveLength(0);
    });
  });

  test('tracks stream timing markers and mixpanel metrics on success', async () => {
    const user = userEvent.setup();
    const mixpanelMock = mixpanel as unknown as {
      track: vi.Mock;
      people: { set: vi.Mock };
    };

    const nowSequence = [1000, 1200, 1500, 1900, 2100];
    const nowSpy = vi.spyOn(performance, 'now').mockImplementation(() => {
      const next = nowSequence.shift();
      return typeof next === 'number' ? next : 2500;
    });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    render(
      <ChatProvider>
        <ChatPage />
      </ChatProvider>,
    );

    const input = await screen.findByPlaceholderText('Converse com a Eco…');
    await user.type(input, 'Olá');

    const sendButton = await screen.findByRole('button', {
      name: 'Enviar mensagem',
    });
    await user.click(sendButton);

    expect(handlersRef.current).toBeDefined();

    act(() => {
      handlersRef.current?.onLatency?.({ type: 'latency', latencyMs: 345 } as any);
    });

    act(() => {
      handlersRef.current?.onPromptReady?.({ type: 'prompt_ready' } as any);
    });

    act(() => {
      handlersRef.current?.onFirstToken?.({
        type: 'first_token',
        text: 'Eco responde',
        payload: { delta: 'Eco responde' },
      } as any);
    });

    await act(async () => {
      handlersRef.current?.onDone?.({
        type: 'done',
        payload: { response: 'Eco responde' },
      } as any);
      resolveResponse?.({ text: 'Eco responde', done: { response: 'Eco responde' } });
      await inflightPromise;
    });

    nowSpy.mockRestore();
    const logCalls = [...logSpy.mock.calls];
    logSpy.mockRestore();

    const ttfbCalls = (mixpanelMock.track as any).mock.calls.filter(
      ([eventName]: [string]) => eventName === 'Eco: Stream TTFB',
    );
    expect(ttfbCalls).toHaveLength(1);
    const ttfbPayload = ttfbCalls[0][1];
    expect(ttfbPayload).toMatchObject({
      ttfb_ms: 345,
      outcome: 'success',
      latency_source: 'server',
      latency_from_stream_ms: 345,
      stage: 'on_done',
    });
    expect(typeof ttfbPayload.eco_prompt_ready_at).toBe('number');
    expect(typeof ttfbPayload.eco_first_token_at).toBe('number');
    expect(typeof ttfbPayload.eco_done_at).toBe('number');
    expect(ttfbPayload.eco_prompt_ready_at).toBeLessThanOrEqual(
      ttfbPayload.eco_first_token_at,
    );
    expect(ttfbPayload.eco_first_token_at).toBeLessThanOrEqual(
      ttfbPayload.eco_done_at,
    );

    const firstTokenCalls = (mixpanelMock.track as any).mock.calls.filter(
      ([eventName]: [string]) => eventName === 'Eco: Stream First Token Latency',
    );
    expect(firstTokenCalls).toHaveLength(1);
    const firstTokenPayload = firstTokenCalls[0][1];
    expect(firstTokenPayload).toMatchObject({ outcome: 'success' });
    expect(typeof firstTokenPayload.first_token_latency_ms).toBe('number');

    expect(mixpanelMock.people.set).toHaveBeenCalledWith(
      expect.objectContaining({ eco_ttfb_ms: 345 }),
    );
    expect(mixpanelMock.people.set).toHaveBeenCalledWith(
      expect.objectContaining({
        eco_first_token_latency_ms: expect.any(Number),
      }),
    );

    const logArgs = logCalls.find(
      ([label]) => label === '[ChatPage] Eco stream markers',
    );
    expect(logArgs).toBeDefined();
    expect(logArgs?.[1]).toMatchObject({
      outcome: 'success',
      latency_from_stream_ms: 345,
    });
    expect(typeof logArgs?.[1]?.eco_prompt_ready_at).toBe('number');
    expect(typeof logArgs?.[1]?.eco_first_token_at).toBe('number');
    expect(typeof logArgs?.[1]?.eco_done_at).toBe('number');
  });
});
