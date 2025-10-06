import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useState } from 'react';

import { FEEDBACK_KEY } from '../constants/chat';
import type { Message as ChatMessageType } from '../contexts/ChatContext';
import mixpanel from '../lib/mixpanel';

export const useFeedbackPrompt = (
  messages: ChatMessageType[],
  setMessages: Dispatch<SetStateAction<ChatMessageType[]>>
) => {
  const [showFeedback, setShowFeedback] = useState(false);

  const aiMessages = useMemo(
    () => (messages || []).filter((m): m is ChatMessageType => m.sender === 'eco'),
    [messages]
  );

  const lastEcoInfo = useMemo<{ index: number; message?: ChatMessageType }>(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const current = messages[i];
      if (current.sender === 'eco') {
        return { index: i, message: current };
      }
    }
    return { index: -1 };
  }, [messages]);

  useEffect(() => {
    const already = (() => {
      if (typeof window === 'undefined') return null;
      try {
        return window.sessionStorage.getItem(FEEDBACK_KEY);
      } catch {
        return null;
      }
    })();

    if (already || showFeedback) return;

    const lastEco = aiMessages[aiMessages.length - 1];
    if (!lastEco?.deepQuestion) return;

    if (aiMessages.length >= 3) {
      setShowFeedback(true);
      mixpanel.track('Feedback Shown', { aiCount: aiMessages.length });
    }
  }, [aiMessages, showFeedback]);

  const clearLastEcoDeepQuestion = useCallback(() => {
    setMessages((prev) => {
      for (let i = prev.length - 1; i >= 0; i -= 1) {
        const current = prev[i];
        if (current.sender === 'eco') {
          if (!current.deepQuestion) return prev;
          const updated = [...prev];
          updated[i] = { ...current, deepQuestion: false };
          return updated;
        }
      }
      return prev;
    });
  }, [setMessages]);

  const handleFeedbackSubmitted = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(FEEDBACK_KEY, '1');
      }
    } catch {}
    clearLastEcoDeepQuestion();
    setShowFeedback(false);
  }, [clearLastEcoDeepQuestion]);

  return { showFeedback, aiMessages, lastEcoInfo, handleFeedbackSubmitted } as const;
};
