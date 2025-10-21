import {
  DependencyList,
  MutableRefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

export interface UseAutoScrollOptions<T extends HTMLElement = HTMLElement> {
  /**
   * Dependency list that should trigger the auto-scroll effect when the user is
   * anchored near the bottom.
   */
  items?: DependencyList;
  /**
   * Distance in pixels considered "near" the bottom of the scroll area.
   */
  bottomThreshold?: number;
  /**
   * Optional external ref that should be used instead of creating an internal one.
   * Enables consumers to run custom effects on the same DOM node.
   */
  externalRef?: MutableRefObject<T | null> | null;
}

export const useAutoScroll = <T extends HTMLElement>(
  options: UseAutoScrollOptions<T> = {},
) => {
  const { items = [], bottomThreshold = 80, externalRef = null } = options;
  const fallbackRef = useRef<T | null>(null);
  const scrollerRef = externalRef ?? fallbackRef;
  const endRef = useRef<HTMLDivElement | null>(null);

  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const getDistanceFromBottom = useCallback((el: HTMLElement) => {
    return el.scrollHeight - (el.scrollTop + el.clientHeight);
  }, []);

  const checkPosition = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const distance = getDistanceFromBottom(el);
    const nearBottom = distance <= bottomThreshold;
    setIsAtBottom(nearBottom);
    setShowScrollBtn(!nearBottom && el.scrollHeight > el.clientHeight + 32);
  }, [bottomThreshold, getDistanceFromBottom]);

  const scrollToBottom = useCallback(
    (smooth = true) => {
      const el = scrollerRef.current;
      if (!el) return;
      const behavior = smooth ? 'smooth' : 'auto';
      const anchor = endRef.current;
      if (anchor) {
        try {
          anchor.scrollIntoView({ behavior, block: 'end' });
        } catch {
          const top = el.scrollHeight;
          try {
            el.scrollTo({ top, behavior });
          } catch {
            el.scrollTop = top;
          }
        }
      } else {
        const top = el.scrollHeight;
        try {
          el.scrollTo({ top, behavior });
        } catch {
          el.scrollTop = top;
        }
      }
      requestAnimationFrame(checkPosition);
    },
    [checkPosition],
  );

  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const handleScroll = () => {
      requestAnimationFrame(checkPosition);
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    requestAnimationFrame(checkPosition);

    return () => {
      el.removeEventListener('scroll', handleScroll);
    };
  }, [checkPosition]);

  useLayoutEffect(() => {
    if (!Array.isArray(items) || items.length === 0) {
      return;
    }
    const shouldScroll = isAtBottom;
    if (!shouldScroll) return;
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    scrollToBottom(!prefersReducedMotion);
  }, [isAtBottom, scrollToBottom, ...items]);

  useEffect(() => {
    scrollToBottom(false);
  }, [scrollToBottom]);

  return {
    scrollerRef,
    endRef,
    isAtBottom,
    showScrollBtn,
    scrollToBottom,
  } as const;
};

export default useAutoScroll;
