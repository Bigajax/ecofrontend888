/**
 * useScrolledToBottom Hook
 *
 * Detects when user has scrolled to the bottom of a container.
 * Uses IntersectionObserver for efficient detection.
 */

import { useEffect, useRef, useState } from 'react';

interface UseScrolledToBottomOptions {
  threshold?: number; // Percentage of element that must be visible (0-1)
  enabled?: boolean;
}

export function useScrolledToBottom(
  options: UseScrolledToBottomOptions = {}
) {
  const { threshold = 0.8, enabled = true } = options;
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled || !bottomRef.current) return;

    if (!('IntersectionObserver' in window)) {
      setHasScrolledToBottom(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasScrolledToBottom) {
            setHasScrolledToBottom(true);
          }
        });
      },
      {
        threshold,
        rootMargin: '0px',
      }
    );

    observer.observe(bottomRef.current);

    return () => {
      observer.disconnect();
    };
  }, [enabled, threshold, hasScrolledToBottom]);

  return { bottomRef, hasScrolledToBottom };
}
