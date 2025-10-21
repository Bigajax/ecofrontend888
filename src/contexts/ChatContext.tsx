// src/contexts/ChatContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
  Dispatch,
  SetStateAction,
} from 'react';
import { useAuth } from './AuthContext';
import type { ContinuityMeta } from '../utils/chat/continuity';

export interface Message {
  id: string;
  text?: string | null;
  content?: string;
  sender: 'user' | 'eco';
  role?: 'user' | 'assistant' | 'system';
  deepQuestion?: boolean;
  metadata?: unknown;
  memory?: unknown;
  donePayload?: unknown;
  latencyMs?: number;
  streaming?: boolean;
  interaction_id?: string | null;
  interactionId?: string | null;
  message_id?: string | null;
  continuity?: ContinuityMeta;
}

interface ChatContextType {
  messages: Message[];
  addMessage: (message: Message) => void;
  clearMessages: () => void;
  updateMessage: (messageId: string, newText: string) => void;
  setMessages: Dispatch<SetStateAction<Message[]>>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Versão + namespace para isolar chaves antigas
const CHAT_NS = 'eco.chat.v1';
const keyFor = (uid?: string | null) => (uid ? `${CHAT_NS}.${uid}` : `${CHAT_NS}.anon`);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const loadedFor = useRef<string | null | undefined>(undefined);

  // 1) Hidrata mensagens quando o usuário muda (login/logout/troca de conta)
  useEffect(() => {
    if (loadedFor.current === userId) return; // evita hidratar duas vezes
    loadedFor.current = userId;

    if (!userId) {
      // sem usuário logado: zera estado
      setMessages([]);
      return;
    }

    try {
      const raw = localStorage.getItem(keyFor(userId));
      setMessages(raw ? (JSON.parse(raw) as Message[]) : []);
    } catch {
      setMessages([]);
    }
  }, [userId]);

  // 2) Persiste sempre que mensagens mudarem (somente se houver userId)
  useEffect(() => {
    if (!userId) return;
    try {
      localStorage.setItem(keyFor(userId), JSON.stringify(messages));
    } catch {}
  }, [messages, userId]);

  // 3) Responde a alterações vindas de outras abas / limpeza externa
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!userId) return;
      if (e.key !== keyFor(userId)) return;

      // Se o valor foi removido ou vazio → zera
      if (e.newValue == null) {
        setMessages([]);
        return;
      }
      try {
        setMessages(JSON.parse(e.newValue));
      } catch {
        setMessages([]);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [userId]);

  const addMessage = useCallback((message: Message) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    try {
      if (userId) localStorage.removeItem(keyFor(userId));
    } catch {}
  }, [userId]);

  const updateMessage = useCallback((messageId: string, newText: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, text: newText } : m))
    );
  }, []);

  return (
    <ChatContext.Provider
      value={{ messages, addMessage, clearMessages, updateMessage, setMessages }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within a ChatProvider');
  return ctx;
};
