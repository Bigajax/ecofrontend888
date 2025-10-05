import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, afterEach, describe, expect, test, vi } from 'vitest';
import type { EcoEventHandlers, EcoStreamResult } from '../../api/ecoApi';

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
  default: ({ message }: { message: any }) => (
    <div data-testid={`chat-${message.id}`}>{message.text}</div>
  ),
}));

vi.mock('../../components/EcoMessageWithAudio', () => ({
  default: ({ message }: { message: any }) => (
    <div data-testid={`eco-${message.id}`}>{message.text}</div>
  ),
}));

vi.mock('../../components/QuickSuggestions', () => ({
  __esModule: true,
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
  },
}));

vi.mock('../../api/memoriaApi', () => ({
  buscarMemoriasSemelhantesV2: vi.fn().mockResolvedValue([]),
  buscarUltimasMemoriasComTags: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../api/mensagem', () => ({
  salvarMensagem: vi.fn().mockResolvedValue([{ id: 'saved-id' }]),
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
    enviarMensagemParaEcoMock.mockImplementation((...args: any[]) => {
      inflightPromise = new Promise<EcoStreamResult>((resolve) => {
        handlersRef.current = args[5];
        resolveResponse = resolve;
      });
      return inflightPromise;
    });
  });

  afterEach(() => {
    window.HTMLElement.prototype.scrollTo = originalScrollTo;
    window.requestAnimationFrame = originalRaf;
    vi.clearAllMocks();
  });

  test('keeps typing indicator when first token lacks content until chunk arrives', async () => {
    const user = userEvent.setup();

    render(
      <ChatProvider>
        <ChatPage />
      </ChatProvider>,
    );

    const input = await screen.findByPlaceholderText('Converse com a Eco…');
    await user.type(input, 'Oi{enter}');

    await screen.findByTestId('typing-dots');
    expect(handlersRef.current).toBeDefined();

    act(() => {
      handlersRef.current?.onFirstToken?.({ text: '   ' } as any);
    });

    expect(screen.getByTestId('typing-dots')).toBeInTheDocument();

    act(() => {
      handlersRef.current?.onChunk?.({ text: 'Resposta da Eco' } as any);
    });

    await waitFor(() => {
      expect(screen.queryByTestId('typing-dots')).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText(/Resposta da Eco/)).toBeInTheDocument();
    });

    await act(async () => {
      handlersRef.current?.onDone?.({ text: 'Resposta da Eco' } as any);
      resolveResponse?.({ text: 'Resposta da Eco' });
      await inflightPromise;
    });
  });
});
