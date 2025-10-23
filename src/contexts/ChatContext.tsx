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
  client_message_id?: string | null;
  status?: 'pending' | 'sent' | 'streaming' | 'final' | 'error';
  server_ids?: string[];
  createdAt?: string | null;
  updatedAt?: string | null;
  flags?: Record<string, unknown> | null;
  audioUrl?: string | null;
  continuity?: ContinuityMeta;
}

export interface UpsertMessageOptions {
  allowContentUpdate?: boolean;
  patchSource?: string;
  allowedKeys?: Array<keyof Message | string>;
}

interface ChatContextType {
  messages: Message[];
  addMessage: (message: Message) => void;
  upsertMessage: (message: Message, options?: UpsertMessageOptions) => void;
  clearMessages: () => void;
  updateMessage: (messageId: string, newText: string) => void;
  setMessages: Dispatch<SetStateAction<Message[]>>;
  byId: Record<string, number>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Versão + namespace para isolar chaves antigas
const CHAT_NS = 'eco.chat.v1';
const keyFor = (uid?: string | null) => (uid ? `${CHAT_NS}.${uid}` : `${CHAT_NS}.anon`);

const normalizeMessageForState = (message: Message): Message => {
  if (!message) return message;

  const normalized: Message = { ...message };
  const shouldTrim = normalized.streaming !== true;

  const maybeTrim = (field: 'text' | 'content') => {
    const value = normalized[field];
    if (typeof value !== 'string') return;
    normalized[field] = shouldTrim ? value.trim() : value;
  };

  maybeTrim('text');
  maybeTrim('content');

  return normalized;
};

const resolveInteractionKey = (message: Message | null | undefined): string => {
  if (!message) return '';
  const direct =
    (typeof message.interaction_id === 'string' && message.interaction_id.trim()) ||
    (typeof message.interactionId === 'string' && message.interactionId.trim()) ||
    '';
  return direct;
};

export function ChatProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth();

  const [messages, setMessagesState] = useState<Message[]>([]);
  const [byId, setById] = useState<Record<string, number>>({});
  const byIdRef = useRef<Map<string, number>>(new Map());
  const interactionByRef = useRef<Map<string, number>>(new Map());
  const loadedFor = useRef<string | null | undefined>(undefined);

  // 1) Hidrata mensagens quando o usuário muda (login/logout/troca de conta)
  useEffect(() => {
    if (loadedFor.current === userId) return; // evita hidratar duas vezes
    loadedFor.current = userId;

    if (!userId) {
      // sem usuário logado: zera estado
      setMessagesState([]);
      return;
    }

    try {
      const raw = localStorage.getItem(keyFor(userId));
      setMessagesState(raw ? (JSON.parse(raw) as Message[]) : []);
    } catch {
      setMessagesState([]);
    }
  }, [userId]);

  // 2) Persiste sempre que mensagens mudarem (somente se houver userId)
  useEffect(() => {
    if (!userId) return;
    try {
      localStorage.setItem(keyFor(userId), JSON.stringify(messages));
    } catch {}
  }, [messages, userId]);

  useEffect(() => {
    const map = new Map<string, number>();
    const interactionMap = new Map<string, number>();
    messages.forEach((message, index) => {
      if (!message) return;
      const ids = new Set<string>();
      if (typeof message.id === 'string' && message.id) {
        ids.add(message.id);
      }
      if (typeof message.client_message_id === 'string' && message.client_message_id) {
        ids.add(message.client_message_id);
      }
      if (typeof message.message_id === 'string' && message.message_id) {
        ids.add(message.message_id);
      }
      const interactionKey = resolveInteractionKey(message);
      if (interactionKey) {
        interactionMap.set(interactionKey, index);
      }
      ids.forEach((id) => {
        if (!id) return;
        map.set(id, index);
      });
    });
    byIdRef.current = map;
    interactionByRef.current = interactionMap;
    const record: Record<string, number> = {};
    map.forEach((value, key) => {
      record[key] = value;
    });
    setById(record);
  }, [messages]);

  const dedupeAndMergeMessages = useCallback((list: Message[]): Message[] => {
    const result: Message[] = [];
    const seen = new Map<string, number>();
    const seenInteractions = new Map<string, number>();
    list.forEach((message) => {
      if (!message) return;
      const normalized = normalizeMessageForState(message);
      const ids: string[] = [];
      if (typeof normalized.id === 'string' && normalized.id) {
        ids.push(normalized.id);
      }
      if (typeof normalized.client_message_id === 'string' && normalized.client_message_id) {
        ids.push(normalized.client_message_id);
      }
      if (typeof normalized.message_id === 'string' && normalized.message_id) {
        ids.push(normalized.message_id);
      }
      const interactionKey = resolveInteractionKey(normalized);
      let targetIndex: number | undefined;
      if (interactionKey) {
        const existing = seenInteractions.get(interactionKey);
        if (existing !== undefined) {
          targetIndex = existing;
        }
      }
      for (const id of ids) {
        const existing = seen.get(id);
        if (existing !== undefined) {
          targetIndex = existing;
          break;
        }
      }
      if (targetIndex === undefined) {
        targetIndex = result.length;
        ids.forEach((id) => {
          if (id) {
            seen.set(id, targetIndex as number);
          }
        });
        if (interactionKey) {
          seenInteractions.set(interactionKey, targetIndex as number);
        }
        result.push(normalized);
      } else {
        const merged = { ...result[targetIndex], ...normalized } as Message;
        result[targetIndex] = normalizeMessageForState(merged);
        if (interactionKey) {
          seenInteractions.set(interactionKey, targetIndex);
        }
      }
    });
    return result;
  }, []);

  const mergeMessages = useCallback(
    (
      existing: Message | undefined,
      incoming: Message,
      options: UpsertMessageOptions | undefined,
    ): { next: Message; changed: boolean } => {
      if (!existing) {
        return { next: normalizeMessageForState(incoming), changed: true };
      }

      const allowedKeys = options?.allowedKeys ? new Set(options.allowedKeys) : undefined;
      const result: Message = { ...existing };
      let changed = false;

      for (const [key, value] of Object.entries(incoming)) {
        if (key === 'id' || value === undefined) continue;

        if (
          key === 'content' &&
          typeof value === 'string' &&
          value.trim().toLowerCase() === 'ok' &&
          options?.allowContentUpdate !== true
        ) {
          console.warn('Dropped suspicious OK content patch', options?.patchSource);
          return { next: existing, changed: false };
        }

        if ((key === 'content' || key === 'text') && options?.allowContentUpdate !== true) {
          const currentValue = (existing as any)[key];
          if (typeof value === 'string' && value !== currentValue) {
            continue;
          }
        }

        if (allowedKeys && !allowedKeys.has(key)) {
          const currentValue = (existing as any)[key];
          if (currentValue !== value) {
            continue;
          }
        }

        if ((result as any)[key] !== value) {
          (result as any)[key] = value as any;
          changed = true;
        }
      }

      if (!changed) {
        return { next: existing, changed: false };
      }

      return { next: normalizeMessageForState(result), changed: true };
    },
    [],
  );

  const upsertMessage = useCallback(
    (message: Message, options?: UpsertMessageOptions) => {
      setMessagesState((prev) => {
        if (!message) return prev;
        const normalized = normalizeMessageForState(message);

        const ids: string[] = [];
        if (typeof normalized.id === 'string' && normalized.id) {
          ids.push(normalized.id);
        }
        if (typeof normalized.client_message_id === 'string' && normalized.client_message_id) {
          ids.push(normalized.client_message_id);
        }
        if (typeof normalized.message_id === 'string' && normalized.message_id) {
          ids.push(normalized.message_id);
        }

        const interactionKey = resolveInteractionKey(normalized);
        let targetIndex: number | undefined = undefined;

        if (interactionKey) {
          targetIndex = interactionByRef.current.get(interactionKey);
        }

        if (targetIndex === undefined) {
          for (const id of ids) {
            const existingIndex = byIdRef.current.get(id);
            if (existingIndex !== undefined) {
              targetIndex = existingIndex;
              break;
            }
          }
        }

        if (targetIndex === undefined) {
          return dedupeAndMergeMessages([...prev, normalized]);
        }

        const next = [...prev];
        const existing = next[targetIndex];
        const { next: merged, changed } = mergeMessages(existing, normalized, options);
        if (!changed) {
          return prev;
        }
        next[targetIndex] = merged;
        return dedupeAndMergeMessages(next);
      });
    },
    [dedupeAndMergeMessages, mergeMessages],
  );

  // 3) Responde a alterações vindas de outras abas / limpeza externa
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!userId) return;
      if (e.key !== keyFor(userId)) return;

      // Se o valor foi removido ou vazio → zera
      if (e.newValue == null) {
        setMessagesState([]);
        return;
      }
      try {
        setMessagesState(JSON.parse(e.newValue));
      } catch {
        setMessagesState([]);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [userId]);

  const addMessage = useCallback(
    (message: Message) => {
      upsertMessage(message, { allowContentUpdate: true, patchSource: 'ChatContext.addMessage' });
    },
    [upsertMessage],
  );

  const clearMessages = useCallback(() => {
    setMessagesState([]);
    try {
      if (userId) localStorage.removeItem(keyFor(userId));
    } catch {}
  }, [userId]);

  const updateMessage = useCallback((messageId: string, newText: string) => {
    setMessagesState((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, text: newText } : m))
    );
  }, []);

  const setMessagesWithDedupe = useCallback<Dispatch<SetStateAction<Message[]>>>((updater) => {
    setMessagesState((prev) => {
      const next = typeof updater === 'function' ? (updater as (value: Message[]) => Message[])(prev) : updater;
      if (!Array.isArray(next)) return prev;
      return dedupeAndMergeMessages(next);
    });
  }, [dedupeAndMergeMessages]);

  return (
    <ChatContext.Provider
      value={{
        messages,
        addMessage,
        upsertMessage,
        clearMessages,
        updateMessage,
        setMessages: setMessagesWithDedupe,
        byId,
      }}
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
