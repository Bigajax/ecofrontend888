import { useEffect, useMemo, useRef, useState } from 'react';

import { trackFeedbackEvent } from '../analytics/track';
import { FEEDBACK_KEY } from '../constants/chat';
import type { Message } from '../contexts/ChatContext';
import { getSessionId, getUserIdFromStore } from '../utils/identity';

const SS_KEY = FEEDBACK_KEY;

type LastEcoInfo = { idx: number; msg: Message } | null;

export function useFeedbackPrompt(messages: Message[]) {
  const [showFeedback, setShowFeedback] = useState(false);
  const sessionIdRef = useRef<string | null | undefined>(undefined);
  const userIdRef = useRef<string | null | undefined>(undefined);

  const resolveSessionId = () => {
    if (sessionIdRef.current !== undefined) return sessionIdRef.current;
    sessionIdRef.current = getSessionId();
    return sessionIdRef.current;
  };

  const resolveUserId = () => {
    if (userIdRef.current !== undefined) return userIdRef.current;
    userIdRef.current = getUserIdFromStore();
    return userIdRef.current;
  };

  const aiMessages = useMemo(
    () => messages.filter((m) => m?.sender === 'eco'),
    [messages]
  );

  const lastEcoInfo = useMemo<LastEcoInfo>(() => {
    if (!aiMessages.length) return null;
    const lastMessage = aiMessages[aiMessages.length - 1];
    const idx = messages.lastIndexOf(lastMessage);
    if (idx < 0) return null;
    return { idx, msg: lastMessage };
  }, [messages, aiMessages]);

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
      const payload: Record<string, unknown> = {
        user_id: resolveUserId() ?? undefined,
        session_id: resolveSessionId() ?? undefined,
        source: 'prompt_auto',
      };
      if (lastEcoInfo.msg.id) {
        payload.message_id = lastEcoInfo.msg.id;
      }
      trackFeedbackEvent('FE: Feedback Prompt Shown', payload);
    }
  }, [aiMessages.length, lastEcoInfo]);

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
