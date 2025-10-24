import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { trackFeedbackEvent } from '../analytics/track';
import { FEEDBACK_KEY } from '../constants/chat';
import type { Message } from '../contexts/ChatContext';
import { getSessionId, getUserIdFromStore } from '../utils/identity';
import { extractMessageFeedbackContext } from './useMessageFeedbackContext';
import { isEcoMessage } from '../utils/chat/messages';

const SS_KEY = FEEDBACK_KEY;

type LastEcoInfo = { idx: number; msg: Message } | null;

type FeedbackOpenEventDetail = {
  source?: string;
};

declare global {
  interface WindowEventMap {
    'eco-feedback-open': CustomEvent<FeedbackOpenEventDetail>;
  }
}

export function useFeedbackPrompt(messages: Message[]) {
  const [showFeedback, setShowFeedback] = useState(false);
  const sessionIdRef = useRef<string | null | undefined>(undefined);
  const userIdRef = useRef<string | null | undefined>(undefined);

  const resolveSessionId = useCallback(() => {
    if (sessionIdRef.current !== undefined) return sessionIdRef.current;
    sessionIdRef.current = getSessionId();
    return sessionIdRef.current;
  }, []);

  const resolveUserId = useCallback(() => {
    if (userIdRef.current !== undefined) return userIdRef.current;
    userIdRef.current = getUserIdFromStore();
    return userIdRef.current;
  }, []);

  const aiMessages = useMemo(
    () => messages.filter((m) => isEcoMessage(m)),
    [messages]
  );

  const lastEcoInfo = useMemo<LastEcoInfo>(() => {
    if (!aiMessages.length) return null;
    const lastMessage = aiMessages[aiMessages.length - 1];
    const idx = messages.lastIndexOf(lastMessage);
    if (idx < 0) return null;
    return { idx, msg: lastMessage };
  }, [messages, aiMessages]);

  const trackPromptShown = useCallback(
    (source: string) => {
      if (!lastEcoInfo?.msg) return;

      const payload: Record<string, unknown> = {
        user_id: resolveUserId() ?? undefined,
        session_id: resolveSessionId() ?? undefined,
        source,
      };

      const context = extractMessageFeedbackContext(lastEcoInfo.msg);
      payload.interaction_id = context.interactionId;
      if (context.messageId) {
        payload.message_id = context.messageId;
      }
      if (context.moduleCombo && context.moduleCombo.length > 0) {
        payload.module_combo = context.moduleCombo;
      }
      if (context.promptHash) {
        payload.prompt_hash = context.promptHash;
      }
      if (typeof context.latencyMs === 'number') {
        payload.latency_ms = context.latencyMs;
      }

      trackFeedbackEvent('FE: Feedback Prompt Shown', payload);
    },
    [lastEcoInfo, resolveSessionId, resolveUserId],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!lastEcoInfo?.msg) return;
    try {
      if (window.sessionStorage.getItem(SS_KEY)) return;
    } catch {
      return;
    }

    const deep = Boolean(lastEcoInfo.msg?.deepQuestion);
    if (aiMessages.length >= 3 && deep) {
      setShowFeedback(true);
      trackPromptShown('prompt_auto');
    }
  }, [aiMessages.length, lastEcoInfo, trackPromptShown]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOpen = (event: CustomEvent<FeedbackOpenEventDetail>) => {
      if (!lastEcoInfo?.msg) {
        return;
      }
      setShowFeedback(true);
      trackPromptShown(event.detail?.source ?? 'prompt_manual');
    };

    window.addEventListener('eco-feedback-open', handleOpen as EventListener);
    return () =>
      window.removeEventListener('eco-feedback-open', handleOpen as EventListener);
  }, [lastEcoInfo, trackPromptShown]);

  function handleFeedbackSubmitted() {
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.setItem(SS_KEY, '1');
      } catch {}
    }
    try {
      if (lastEcoInfo?.msg) {
        lastEcoInfo.msg.deepQuestion = false;
      }
    } catch {}
    setShowFeedback(false);
  }

  return { showFeedback, lastEcoInfo, handleFeedbackSubmitted } as const;
}
