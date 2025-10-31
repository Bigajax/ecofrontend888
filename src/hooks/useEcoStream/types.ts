import type { Dispatch, MutableRefObject, SetStateAction } from "react";

import type {
  Message as ChatMessageType,
  UpsertMessageOptions,
} from "@/contexts/ChatContext";
import type {
  EnsureAssistantEventMeta,
  MessageTrackingRefs,
  ReplyStateController,
} from "./messageState";

export type InteractionMapAction = {
  type: "updateInteractionMap";
  clientId: string;
  interaction_id: string;
};

export type EnsureAssistantMessageFn = (
  clientMessageId: string,
  event?: EnsureAssistantEventMeta,
  options?: { allowCreate?: boolean; draftMessages?: ChatMessageType[] },
) => string | null | undefined;

export type RemoveEcoEntryFn = (assistantMessageId?: string | null) => void;

export interface StreamRunStats {
  aggregatedLength: number;
  gotAnyChunk: boolean;
  lastMeta?: Record<string, unknown>;
  finishReasonFromMeta?: string;
  status?: "no_content";
  timing?: { startedAt?: number; firstChunkAt?: number; totalMs?: number };
  responseHeaders?: Record<string, string>;
  noContentReason?: string;
  clientFinishReason?: string;
  streamId?: string;
  guardTimeoutMs?: number;
  guardFallbackTriggered?: boolean;
  jsonFallbackAttempts?: number;
  jsonFallbackSucceeded?: boolean;
}

export interface StreamSharedContext {
  clientMessageId: string;
  normalizedClientId: string;
  controller: AbortController;
  ensureAssistantMessage: EnsureAssistantMessageFn;
  setMessages: Dispatch<SetStateAction<ChatMessageType[]>>;
  upsertMessage?: (message: ChatMessageType, options?: UpsertMessageOptions) => void;
  activeAssistantIdRef: MutableRefObject<string | null>;
  activeStreamClientIdRef: MutableRefObject<string | null>;
  activeClientIdRef: MutableRefObject<string | null>;
  hasFirstChunkRef: MutableRefObject<boolean>;
  readyStateRef: MutableRefObject<boolean>;
  setDigitando: Dispatch<SetStateAction<boolean>>;
  updateCurrentInteractionId: (next: string | null | undefined) => void;
  streamTimersRef: MutableRefObject<Record<string, { startedAt: number; firstChunkAt?: number }>>;
  logSse: (
    phase: "open" | "start" | "first-chunk" | "delta" | "done" | "abort",
    payload: Record<string, unknown>,
  ) => void;
  replyState: ReplyStateController;
  tracking: MessageTrackingRefs;
  interactionCacheDispatch?: (action: InteractionMapAction) => void;
  streamStats: StreamRunStats;
}
