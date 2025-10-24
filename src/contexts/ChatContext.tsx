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
  module_combo?: string[] | null;
  prompt_hash?: string | null;
  eco_score?: number | null;
  status?: 'pending' | 'sent' | 'streaming' | 'final' | 'error' | 'done';
  server_ids?: string[];
  createdAt?: number | string | null;
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

const resolveRole = (message: Message | null | undefined): Message['role'] | undefined => {
  if (!message) return undefined;
  if (message.role) return message.role;
  if (message.sender === 'eco') return 'assistant';
  if (message.sender === 'user') return 'user';
  return undefined;
};

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

  if (!normalized.role) {
    const inferredRole = resolveRole(normalized);
    if (inferredRole) {
      normalized.role = inferredRole;
    }
  }

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

const resolveInteractionSenderKey = (
  interactionKey: string,
  sender: string | undefined,
): string => {
  if (!interactionKey) return '';
  if (!sender) return interactionKey;
  return `${interactionKey}::${sender}`;
};

const resolveClientMessageId = (message: Message | null | undefined): string => {
  if (!message) return '';
  const direct =
    (typeof message.client_message_id === 'string' && message.client_message_id.trim()) ||
    '';
  if (direct) return direct;
  if (typeof message.id === 'string' && message.id.trim()) {
    return message.id.trim();
  }
  if (typeof message.message_id === 'string' && message.message_id.trim()) {
    return message.message_id.trim();
  }
  return '';
};

export const keyOf = (message: Message | null | undefined): string => {
  if (!message) return '';
  const role = resolveRole(message);
  if (!role) return '';
  const interaction = resolveInteractionKey(message);
  if (interaction) {
    return `${interaction}:${role}`;
  }
  const clientId = resolveClientMessageId(message);
  if (clientId) {
    return `${clientId}:${role}`;
  }
  return role;
};

export function ChatProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth();

  const [messages, setMessagesState] = useState<Message[]>([]);
  const [byId, setById] = useState<Record<string, number>>({});
  const byIdRef = useRef<Map<string, number>>(new Map());
  const keyIndexRef = useRef<Map<string, number>>(new Map());
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
    const keyMap = new Map<string, number>();
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
      const normalizedSender = resolveRole(message) ?? message?.sender ?? undefined;
      const interactionSenderKey = resolveInteractionSenderKey(interactionKey, normalizedSender);
      if (interactionSenderKey) {
        interactionMap.set(interactionSenderKey, index);
      }
      if (interactionKey && !interactionMap.has(interactionKey)) {
        interactionMap.set(interactionKey, index);
      }
      const messageKey = keyOf(message);
      if (messageKey) {
        keyMap.set(messageKey, index);
      }
      ids.forEach((id) => {
        if (!id) return;
        map.set(id, index);
      });
    });
    byIdRef.current = map;
    keyIndexRef.current = keyMap;
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
    const seenKeys = new Map<string, number>();
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
      const messageKey = keyOf(normalized);
      const normalizedSender = resolveRole(normalized) ?? normalized.sender ?? undefined;
      const interactionSenderKey = resolveInteractionSenderKey(interactionKey, normalizedSender);

      const findExistingIndexForId = (id: string): number | undefined => {
        if (!id) return undefined;
        if (normalizedSender) {
          const compositeKey = `${id}::${normalizedSender}`;
          const compositeExisting = seen.get(compositeKey);
          if (compositeExisting !== undefined) {
            return compositeExisting;
          }
        }

        const existing = seen.get(id);
        if (existing === undefined) {
          return undefined;
        }

        const existingMessage = result[existing];
        const existingSender =
          resolveRole(existingMessage) ?? existingMessage?.sender ?? undefined;

        if (!normalizedSender || !existingSender || existingSender === normalizedSender) {
          return existing;
        }

        return undefined;
      };

      let targetIndex: number | undefined;
      if (interactionSenderKey) {
        const existing = seenInteractions.get(interactionSenderKey);
        if (existing !== undefined) {
          targetIndex = existing;
        } else if (interactionKey) {
          const existingRaw = seenInteractions.get(interactionKey);
          if (existingRaw !== undefined) {
            targetIndex = existingRaw;
          }
        }
      } else if (interactionKey) {
        const existing = seenInteractions.get(interactionKey);
        if (existing !== undefined) {
          targetIndex = existing;
        }
      }
      if (targetIndex === undefined && messageKey) {
        const existing = seenKeys.get(messageKey);
        if (existing !== undefined) {
          targetIndex = existing;
        }
      }
      for (const id of ids) {
        const existing = findExistingIndexForId(id);
        if (existing !== undefined) {
          targetIndex = existing;
          break;
        }
      }
      if (targetIndex === undefined) {
        targetIndex = result.length;
        ids.forEach((id) => {
          if (id) {
            if (normalizedSender) {
              seen.set(`${id}::${normalizedSender}`, targetIndex as number);
            }
            if (!seen.has(id)) {
              seen.set(id, targetIndex as number);
            }
          }
        });
        if (interactionSenderKey) {
          seenInteractions.set(interactionSenderKey, targetIndex as number);
        }
        if (interactionKey && !seenInteractions.has(interactionKey)) {
          seenInteractions.set(interactionKey, targetIndex as number);
        }
        if (messageKey) {
          seenKeys.set(messageKey, targetIndex as number);
        }
        result.push(normalized);
      } else {
        const merged = { ...result[targetIndex], ...normalized } as Message;
        result[targetIndex] = normalizeMessageForState(merged);
        if (interactionSenderKey) {
          seenInteractions.set(interactionSenderKey, targetIndex);
        }
        if (interactionKey && !seenInteractions.has(interactionKey)) {
          seenInteractions.set(interactionKey, targetIndex);
        }
        if (messageKey) {
          seenKeys.set(messageKey, targetIndex);
        }
        ids.forEach((id) => {
          if (!id) return;
          if (normalizedSender) {
            seen.set(`${id}::${normalizedSender}`, targetIndex as number);
          }
          if (!seen.has(id)) {
            seen.set(id, targetIndex as number);
          }
        });
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
        const normalizedIncoming = normalizeMessageForState(incoming);
        try {
          console.debug(
            '[UPSERT]',
            keyOf(normalizedIncoming) || normalizedIncoming.id || 'new',
            options?.patchSource ?? 'unknown',
            Object.keys(normalizedIncoming),
          );
        } catch {
          /* noop */
        }
        return { next: normalizedIncoming, changed: true };
      }

      const allowContentUpdate = options?.allowContentUpdate === true;
      const allowedKeys = new Set<string>();
      const defaultAllowed = [
        'status',
        'streaming',
        'serverIds',
        'server_ids',
        'message_id',
        'createdAt',
        'updatedAt',
        'flags',
        'audioUrl',
        'timestamps',
        'interaction_id',
        'interactionId',
        'latencyMs',
        'metadata',
        'donePayload',
        'module_combo',
        'prompt_hash',
        'eco_score',
      ];
      defaultAllowed.forEach((key) => allowedKeys.add(key));
      if (options?.allowedKeys) {
        options.allowedKeys.forEach((key) => allowedKeys.add(key));
      }
      if (allowedKeys.has('timestamps')) {
        allowedKeys.add('createdAt');
        allowedKeys.add('updatedAt');
      }
      const result: Message = { ...existing };
      let changed = false;
      const appliedKeys: string[] = [];

      const existingRole = resolveRole(existing);

      const dropPatch = (reason: string) => {
        if (options?.patchSource) {
          console.warn(reason, options.patchSource);
        } else {
          console.warn(reason);
        }
        return { next: existing, changed: false } as const;
      };

      for (const [rawKey, value] of Object.entries(incoming)) {
        if (rawKey === 'id' || value === undefined) continue;

        const key = rawKey === 'serverIds' ? 'server_ids' : rawKey;

        if (
          key === 'content' &&
          typeof value === 'string' &&
          value.trim().toLowerCase() === 'ok' &&
          !allowContentUpdate
        ) {
          console.warn('Dropped suspicious OK content patch', options?.patchSource);
          continue;
        }

        const isContentKey = key === 'content' || key === 'text';

        if (isContentKey && existing) {
          const currentValue = ((existing as any)[key] as string | undefined) ?? '';
          const normalizedCurrent = currentValue.trim();
          const incomingValue =
            typeof value === 'string'
              ? value
              : value == null
              ? ''
              : String(value);
          const normalizedIncoming = incomingValue.trim();
          const normalizedIncomingLower = normalizedIncoming.toLowerCase();
          if (
            normalizedCurrent.length > 0 &&
            (normalizedIncoming.length === 0 || normalizedIncomingLower === 'ok')
          ) {
            console.warn('[ChatContext] Ignored empty content patch', {
              key,
              source: options?.patchSource,
            });
            continue;
          }
        }

        if (isContentKey && existingRole === 'user') {
          const currentValue = ((existing as any)[key] as string | undefined) ?? '';
          const normalizedCurrent = currentValue.trim();
          const incomingValue = typeof value === 'string' ? value : `${value ?? ''}`;
          if (!allowContentUpdate && incomingValue !== currentValue) {
            return dropPatch('Dropped user content mutation patch');
          }
          if (normalizedCurrent && incomingValue.trim().length === 0) {
            return dropPatch('Dropped user content removal patch');
          }
        }

        if (isContentKey && existingRole === 'assistant' && !allowContentUpdate) {
          const currentValue = ((existing as any)[key] as string | undefined) ?? '';
          if (currentValue.trim().length > 0 && typeof value === 'string' && value !== currentValue) {
            continue;
          }
        }

        if (
          !allowContentUpdate &&
          allowedKeys.size > 0 &&
          !allowedKeys.has(key) &&
          !allowedKeys.has(rawKey)
        ) {
          const currentValue = (existing as any)[key];
          if (currentValue !== value) {
            continue;
          }
        }

        if ((result as any)[key] !== value) {
          (result as any)[key] = value as any;
          changed = true;
          appliedKeys.push(key);
        }
      }

      if (!changed) {
        return { next: existing, changed: false };
      }

      const normalizedNext = normalizeMessageForState(result);
      if (appliedKeys.length > 0) {
        try {
          console.debug(
            '[UPSERT]',
            keyOf(normalizedNext) || normalizedNext.id || 'unknown',
            options?.patchSource ?? 'unknown',
            appliedKeys,
          );
        } catch {
          /* noop */
        }
      }

      return { next: normalizedNext, changed: true };
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
        const messageKey = keyOf(normalized);
        const normalizedSender = resolveRole(normalized) ?? normalized.sender ?? undefined;
        const interactionSenderKey = resolveInteractionSenderKey(interactionKey, normalizedSender);
        let targetIndex: number | undefined = undefined;

        if (messageKey) {
          targetIndex = keyIndexRef.current.get(messageKey);
        }

        if (targetIndex === undefined) {
          if (interactionSenderKey) {
            targetIndex = interactionByRef.current.get(interactionSenderKey);
            if (targetIndex === undefined && interactionKey) {
              targetIndex = interactionByRef.current.get(interactionKey);
            }
          } else if (interactionKey) {
            targetIndex = interactionByRef.current.get(interactionKey);
          }

          if (targetIndex === undefined && messageKey) {
            targetIndex = keyIndexRef.current.get(messageKey);
          }

          for (const id of ids) {
            const existingIndex = byIdRef.current.get(id);
            if (existingIndex !== undefined) {
              targetIndex = existingIndex;
              break;
            }
          }
        }

        if (targetIndex === undefined) {
          try {
            console.debug(
              '[UPSERT]',
              messageKey || normalized.id || 'new',
              options?.patchSource ?? 'unknown',
              Object.keys(normalized),
            );
          } catch {
            /* noop */
          }
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
