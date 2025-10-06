import { useCallback, useEffect, useState } from 'react';

import type { Message as ChatMessageType } from '../contexts/ChatContext';

export const useQuickSuggestionsVisibility = (messages: ChatMessageType[]) => {
  const [showQuick, setShowQuick] = useState(true);

  useEffect(() => {
    if ((messages?.length ?? 0) > 0) setShowQuick(false);
  }, [messages]);

  useEffect(() => {
    const onUserTypes = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const isTyping =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.getAttribute('contenteditable') === 'true';
      if (isTyping) setShowQuick(false);
    };

    window.addEventListener('input', onUserTypes, { passive: true });
    window.addEventListener('paste', onUserTypes, { passive: true });
    return () => {
      window.removeEventListener('input', onUserTypes);
      window.removeEventListener('paste', onUserTypes);
    };
  }, []);

  const hideQuickSuggestions = useCallback(() => setShowQuick(false), []);

  const handleTextChange = useCallback((text: string) => {
    setShowQuick(text.trim().length === 0);
  }, []);

  return { showQuick, hideQuickSuggestions, handleTextChange, setShowQuick } as const;
};
