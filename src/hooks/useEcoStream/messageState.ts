import { useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";

import type { Dispatch, MutableRefObject, SetStateAction } from "react";

import type { Message as ChatMessageType, UpsertMessageOptions } from "../../contexts/ChatContext";
import { mergeReplyMetadata } from "./chunkProcessor";
import { assignRef } from "./utils";

export interface EcoReplyState {
  [assistantMessageId: string]: { text: string; chunkIndexMax: number };
}

export interface MessageTrackingRefs {
  assistantByClientRef: MutableRefObject<Record<string, string>>;
  clientByAssistantRef: MutableRefObject<Record<string, string>>;
  pendingAssistantMetaRef: MutableRefObject<
    Record<string, { interactionId?: string; messageId?: string; createdAt?: string }>
  >;
  userTextByClientIdRef: MutableRefObject<Record<string, string>>;
}

export interface ReplyStateController {
  ecoReplyByAssistantId: EcoReplyState;
  setEcoReplyByAssistantId: Dispatch<SetStateAction<EcoReplyState>>;
  ecoReplyStateRef: MutableRefObject<EcoReplyState>;
}

export interface EnsureAssistantEventMeta {
  interactionId?: string | null;
  messageId?: string | null;
  message_id?: string | null;
  clientMessageId?: string | null;
  client_message_id?: string | null;
  createdAt?: string | null;
}

export const useMessageTracking = (): MessageTrackingRefs => {
  const assistantByClientRef = useRef<Record<string, string>>({});
  const clientByAssistantRef = useRef<Record<string, string>>({});
  const pendingAssistantMetaRef = useRef<
    Record<string, { interactionId?: string; messageId?: string; createdAt?: string }>
  >({});
  const userTextByClientIdRef = useRef<Record<string, string>>({});

  return useMemo(
    () => ({
      assistantByClientRef,
      clientByAssistantRef,
      pendingAssistantMetaRef,
      userTextByClientIdRef,
    }),
    [],
  );
};

export const useReplyState = (): ReplyStateController => {
  const [ecoReplyByAssistantId, setEcoReplyByAssistantId] = useState<EcoReplyState>({});
  const ecoReplyStateRef = useRef<EcoReplyState>({});

  useEffect(() => {
    assignRef(ecoReplyStateRef, ecoReplyByAssistantId);
  }, [ecoReplyByAssistantId]);

  return useMemo(
    () => ({ ecoReplyByAssistantId, setEcoReplyByAssistantId, ecoReplyStateRef }),
    [ecoReplyByAssistantId],
  );
};

const resolveTargetKey = (message: ChatMessageType | null | undefined): string => {
  if (!message) return "";
  const explicitTarget = typeof (message as any)?.targetId === "string" ? (message as any).targetId.trim() : "";
  if (explicitTarget) return explicitTarget;
  const directClient =
    (typeof message.clientMessageId === "string" && message.clientMessageId.trim()) ||
    (typeof message.client_message_id === "string" && message.client_message_id.trim()) ||
    "";
  if (directClient) return directClient;
  if (typeof message.id === "string" && message.id.trim()) {
    return message.id.trim();
  }
  return "";
};

interface EnsureSameTargetIdOptions {
  replaceIf?: (message: ChatMessageType) => boolean;
}

const ensureSameTargetId = (
  messages: ChatMessageType[],
  incoming: ChatMessageType,
  options: EnsureSameTargetIdOptions = {},
): ChatMessageType[] => {
  if (!incoming) return messages;
  const targetKey = resolveTargetKey(incoming);
  if (!targetKey) {
    return [...messages, incoming];
  }

  let replaced = false;
  const nextMessages = messages.map((message) => {
    const candidateKey = resolveTargetKey(message);
    if (!candidateKey || candidateKey !== targetKey) {
      return message;
    }
    if (options.replaceIf && !options.replaceIf(message)) {
      return message;
    }
    replaced = true;
    return { ...message, ...incoming };
  });

  if (replaced) {
    return nextMessages;
  }

  return [...messages, incoming];
};

interface EnsureAssistantMessageParams {
  clientMessageId: string;
  event?: EnsureAssistantEventMeta;
  options?: { allowCreate?: boolean; draftMessages?: ChatMessageType[] };
  tracking: MessageTrackingRefs;
  replyState: ReplyStateController;
  setMessages: Dispatch<SetStateAction<ChatMessageType[]>>;
  upsertMessage?: (message: ChatMessageType, options?: UpsertMessageOptions) => void;
  updateCurrentInteractionId: (next: string | null | undefined) => void;
}

const normalizeString = (value?: string | null): string => (typeof value === "string" ? value.trim() : "");

const normalizeTimestamp = (value?: string | null): string | undefined => {
  const trimmed = normalizeString(value);
  return trimmed || undefined;
};

const resolveClientKeys = (clientMessageId: string, event?: EnsureAssistantEventMeta): string[] => {
  const keys = new Set<string>();
  const base = normalizeString(clientMessageId);
  if (base) keys.add(base);
  if (event) {
    const candidates = [
      event.client_message_id,
      event.clientMessageId,
      event.message_id,
      event.messageId,
    ];
    for (const candidate of candidates) {
      const normalized = normalizeString(candidate);
      if (normalized) keys.add(normalized);
    }
  }
  return Array.from(keys);
};

export const ensureAssistantMessage = ({
  clientMessageId,
  event,
  options,
  tracking,
  replyState,
  setMessages,
  upsertMessage,
  updateCurrentInteractionId,
}: EnsureAssistantMessageParams): string | null | undefined => {
  if (!clientMessageId) return undefined;
  const normalizedClientId = clientMessageId.trim();
  if (!normalizedClientId) return undefined;

  const { allowCreate = true, draftMessages } = options ?? {};

  const { assistantByClientRef, clientByAssistantRef, pendingAssistantMetaRef } = tracking;
  const { ecoReplyStateRef, setEcoReplyByAssistantId } = replyState;

  const resolvedClientKeys = (() => {
    const keys = resolveClientKeys(clientMessageId, event);
    if (keys.length > 0) return keys;
    return [normalizedClientId];
  })();

  const mergePendingMeta = (clientKeys: string[]) => {
    const [firstKey] = clientKeys;
    const pendingSource = clientKeys
      .map((key) => pendingAssistantMetaRef.current[key])
      .find((entry) => Boolean(entry)) ??
      {};
    const nextPending = { ...pendingSource } as {
      interactionId?: string;
      messageId?: string;
      createdAt?: string;
    };

    const incomingInteractionId = normalizeString(event?.interactionId);
    const incomingMessageId = normalizeString(event?.messageId ?? event?.message_id);
    const incomingCreatedAt = normalizeTimestamp(event?.createdAt);

    if (incomingInteractionId) {
      nextPending.interactionId = incomingInteractionId;
    }
    if (incomingMessageId) {
      nextPending.messageId = incomingMessageId;
    }
    if (incomingCreatedAt) {
      nextPending.createdAt = incomingCreatedAt;
    }

    const hasPendingValues =
      Boolean(nextPending.interactionId) || Boolean(nextPending.messageId) || Boolean(nextPending.createdAt);

    if (hasPendingValues) {
      for (const key of clientKeys) {
        if (!key) continue;
        pendingAssistantMetaRef.current[key] = nextPending;
      }
    }

    return {
      interactionId: nextPending.interactionId,
      messageId: nextPending.messageId,
      createdAt: nextPending.createdAt,
      clientMessageId: firstKey ?? normalizedClientId,
      clientKeys,
    };
  };

  let existingAssistantId: string | undefined;
  for (const key of resolvedClientKeys) {
    const mapped = assistantByClientRef.current[key];
    if (mapped) {
      existingAssistantId = mapped;
      break;
    }
  }

  if (!allowCreate && !existingAssistantId) {
    const pendingMeta = mergePendingMeta(resolvedClientKeys);
    if (pendingMeta.interactionId) {
      updateCurrentInteractionId(pendingMeta.interactionId);
    }
    try {
      console.debug('[DIAG] eco:ensure-skip', {
        clientMessageId: pendingMeta.clientMessageId ?? normalizedClientId,
        reason: 'create_not_allowed',
        pendingInteraction: event?.interactionId ?? null,
        pendingMessageId: event?.messageId ?? null,
      });
    } catch {
      /* noop */
    }
    return null;
  }

  const mergedMeta = mergePendingMeta(resolvedClientKeys);
  const clientKeysForRegistration =
    mergedMeta.clientKeys.length > 0 ? mergedMeta.clientKeys : resolvedClientKeys;
  const primaryClientKey = mergedMeta.clientMessageId ?? normalizedClientId;

  if (mergedMeta.interactionId) {
    updateCurrentInteractionId(mergedMeta.interactionId);
  }

  const ensureReplyEntry = (assistantId: string) => {
    if (!assistantId) return;
    if (!ecoReplyStateRef.current[assistantId]) {
      setEcoReplyByAssistantId((prev) => {
        if (prev[assistantId]) return prev;
        const next: EcoReplyState = { ...prev, [assistantId]: { text: "", chunkIndexMax: -1 } };
        assignRef(ecoReplyStateRef, next);
        return next;
      });
    }
  };

  const registerClientKeys = (assistantId: string, clientKeys: string[]) => {
    if (!assistantId) return;
    const keys = clientKeys.length > 0 ? clientKeys : [normalizedClientId];
    for (const key of keys) {
      if (!key) continue;
      assistantByClientRef.current[key] = assistantId;
    }
    const firstKey = keys[0] ?? normalizedClientId;
    clientByAssistantRef.current[assistantId] = firstKey;
  };

  if (existingAssistantId) {
    registerClientKeys(existingAssistantId, clientKeysForRegistration);
    ensureReplyEntry(existingAssistantId);

    try {
      console.debug('[DIAG] eco:ensure-existing', {
        clientMessageId: primaryClientKey,
        assistantId: existingAssistantId,
        allowCreate,
      });
    } catch {
      /* noop */
    }

    if (mergedMeta.interactionId || mergedMeta.messageId || mergedMeta.createdAt) {
      setMessages((prev) =>
        prev.map((message) => {
          if (message.id !== existingAssistantId) return message;
          const nextMessage: ChatMessageType = { ...message };
          if (mergedMeta.interactionId) {
            nextMessage.interaction_id = mergedMeta.interactionId;
            nextMessage.interactionId = mergedMeta.interactionId;
          }
          if (mergedMeta.messageId) {
            nextMessage.message_id = mergedMeta.messageId;
          }
          if (mergedMeta.createdAt && !nextMessage.createdAt) {
            nextMessage.createdAt = mergedMeta.createdAt;
          }
          if (!nextMessage.client_message_id && primaryClientKey) {
            nextMessage.client_message_id = primaryClientKey;
            (nextMessage as { clientMessageId?: string }).clientMessageId = primaryClientKey;
          }
          return nextMessage;
        }),
      );
    }

    return existingAssistantId;
  }

  if (!allowCreate) {
    return existingAssistantId ?? null;
  }

  const assistantId = `eco-${uuidv4()}`;
  registerClientKeys(assistantId, clientKeysForRegistration);
  ensureReplyEntry(assistantId);

  const createdAt = mergedMeta.createdAt ?? new Date().toISOString();
  const assistantMessage: ChatMessageType = {
    id: assistantId,
    client_message_id: primaryClientKey,
    clientMessageId: primaryClientKey,
    sender: "eco",
    role: "assistant",
    content: "",
    text: "",
    streaming: true,
    status: "streaming",
    interaction_id: mergedMeta.interactionId ?? undefined,
    interactionId: mergedMeta.interactionId ?? undefined,
    message_id: mergedMeta.messageId ?? undefined,
    createdAt,
    updatedAt: createdAt,
    metadata: mergeReplyMetadata(undefined, primaryClientKey),
  };

  if (draftMessages && !upsertMessage) {
    const replaced = ensureSameTargetId(draftMessages, assistantMessage, {
      replaceIf: (message) => {
        const candidateRole = message.role ?? message.sender;
        return (candidateRole === "assistant" || candidateRole === "eco") && resolveTargetKey(message) === primaryClientKey;
      },
    });
    draftMessages.length = 0;
    draftMessages.push(...replaced);
  } else if (upsertMessage) {
    upsertMessage(assistantMessage, {
      allowContentUpdate: true,
      patchSource: "stream_init",
    });
  } else {
    setMessages((prevMessages) =>
      ensureSameTargetId(prevMessages, assistantMessage, {
        replaceIf: (message) => {
          const candidateRole = message.role ?? message.sender;
          return (
            (candidateRole === "assistant" || candidateRole === "eco") && resolveTargetKey(message) === primaryClientKey
          );
        },
      }),
    );
  }

  try {
    console.debug('[DIAG] eco:placeholder', {
      ecoMsgId: assistantId,
      clientMessageId: primaryClientKey,
      createdAt,
    });
  } catch {
    /* noop */
  }

  return assistantId;
};

interface RemoveEcoEntryParams {
  assistantMessageId?: string | null;
  tracking: MessageTrackingRefs;
  replyState: ReplyStateController;
}

export const removeEcoEntry = ({
  assistantMessageId,
  tracking,
  replyState,
}: RemoveEcoEntryParams) => {
  if (!assistantMessageId) return;
  const { clientByAssistantRef, assistantByClientRef, pendingAssistantMetaRef, userTextByClientIdRef } = tracking;
  const { setEcoReplyByAssistantId, ecoReplyStateRef } = replyState;

  try {
    console.debug('[DIAG] eco:remove-entry', {
      assistantMessageId,
      mappedClientId: clientByAssistantRef.current[assistantMessageId] ?? null,
    });
  } catch {
    /* noop */
  }

  setEcoReplyByAssistantId((prev) => {
    if (!(assistantMessageId in prev)) return prev;
    const next = { ...prev };
    delete next[assistantMessageId];
    assignRef(ecoReplyStateRef, next);
    return next;
  });

  const mappedClientId = clientByAssistantRef.current[assistantMessageId];
  if (mappedClientId) {
    delete clientByAssistantRef.current[assistantMessageId];
  }

  const keysToClear = new Set<string>();
  if (mappedClientId) keysToClear.add(mappedClientId);
  Object.entries(assistantByClientRef.current).forEach(([clientKey, mappedAssistant]) => {
    if (mappedAssistant === assistantMessageId) {
      keysToClear.add(clientKey);
    }
  });

  keysToClear.forEach((clientKey) => {
    delete assistantByClientRef.current[clientKey];
    if (pendingAssistantMetaRef.current[clientKey]) {
      delete pendingAssistantMetaRef.current[clientKey];
    }
    if (userTextByClientIdRef.current[clientKey]) {
      delete userTextByClientIdRef.current[clientKey];
    }
  });
};

