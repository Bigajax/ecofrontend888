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

interface EnsureAssistantMessageParams {
  clientMessageId: string;
  event?: { interactionId?: string | null; messageId?: string | null; createdAt?: string | null };
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

  const mergePendingMeta = () => {
    const pending = pendingAssistantMetaRef.current[normalizedClientId] ?? {};
    const nextPending = { ...pending } as {
      interactionId?: string;
      messageId?: string;
      createdAt?: string;
    };

    const incomingInteractionId = normalizeString(event?.interactionId);
    const incomingMessageId = normalizeString(event?.messageId);
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
      pendingAssistantMetaRef.current[normalizedClientId] = nextPending;
    }

    return {
      interactionId: nextPending.interactionId,
      messageId: nextPending.messageId,
      createdAt: nextPending.createdAt,
    };
  };

  const existingAssistantId = assistantByClientRef.current[normalizedClientId];

  if (!allowCreate && !existingAssistantId) {
    const pendingMeta = mergePendingMeta();
    if (pendingMeta.interactionId) {
      updateCurrentInteractionId(pendingMeta.interactionId);
    }
    try {
      console.debug('[DIAG] eco:ensure-skip', {
        clientMessageId: normalizedClientId,
        reason: 'create_not_allowed',
        pendingInteraction: event?.interactionId ?? null,
        pendingMessageId: event?.messageId ?? null,
      });
    } catch {
      /* noop */
    }
    return null;
  }

  const mergedMeta = mergePendingMeta();

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

  if (existingAssistantId) {
    assistantByClientRef.current[normalizedClientId] = existingAssistantId;
    if (!clientByAssistantRef.current[existingAssistantId]) {
      clientByAssistantRef.current[existingAssistantId] = normalizedClientId;
    }
    ensureReplyEntry(existingAssistantId);

    try {
      console.debug('[DIAG] eco:ensure-existing', {
        clientMessageId: normalizedClientId,
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
  assistantByClientRef.current[normalizedClientId] = assistantId;
  clientByAssistantRef.current[assistantId] = normalizedClientId;
  ensureReplyEntry(assistantId);

  const createdAt = mergedMeta.createdAt ?? new Date().toISOString();
  const assistantMessage: ChatMessageType = {
    id: assistantId,
    client_message_id: normalizedClientId,
    clientMessageId: normalizedClientId,
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
    metadata: mergeReplyMetadata(undefined, normalizedClientId),
  };

  if (draftMessages && !upsertMessage) {
    draftMessages.push(assistantMessage);
  } else if (upsertMessage) {
    upsertMessage(assistantMessage, {
      allowContentUpdate: true,
      patchSource: "stream_init",
    });
  } else {
    setMessages((prevMessages) => [...prevMessages, assistantMessage]);
  }

  try {
    console.debug('[DIAG] eco:placeholder', {
      ecoMsgId: assistantId,
      clientMessageId: normalizedClientId,
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

  const clientMessageId = clientByAssistantRef.current[assistantMessageId];
  if (clientMessageId) {
    delete clientByAssistantRef.current[assistantMessageId];
    if (assistantByClientRef.current[clientMessageId] === assistantMessageId) {
      delete assistantByClientRef.current[clientMessageId];
    }
    if (pendingAssistantMetaRef.current[clientMessageId]) {
      delete pendingAssistantMetaRef.current[clientMessageId];
    }
    if (userTextByClientIdRef.current[clientMessageId]) {
      delete userTextByClientIdRef.current[clientMessageId];
    }
  }
};

