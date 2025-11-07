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
  /**
   * Enable keyboard detection for mobile (iOS/Android)
   */
  detectKeyboard?: boolean;
}

export const useAutoScroll = <T extends HTMLElement>(
  options: UseAutoScrollOptions<T> = {},
) => {
  const { items = [], bottomThreshold = 80, externalRef = null, detectKeyboard = true } = options;
  const fallbackRef = useRef<T | null>(null);
  const scrollerRef = externalRef ?? fallbackRef;
  const endRef = useRef<HTMLDivElement | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

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

  // Keyboard detection for iOS/Android (visualViewport API)
  // NOTE: Desabilitado por padrão devido a loops infinitos com textarea resize
  // Pode ser ativado se necessário com detectKeyboard={true}
  useEffect(() => {
    if (!detectKeyboard || typeof window === 'undefined') return;

    const viewport = window.visualViewport;
    if (!viewport) return;

    let lastVhOffset = 0;
    const handleResize = () => {
      // Debounce keyboard detection
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        const vhOffset = window.innerHeight - viewport.height;

        // Only update if significant change (avoid loops from textarea resize)
        if (Math.abs(vhOffset - lastVhOffset) > 30) {
          lastVhOffset = vhOffset;
          setKeyboardHeight(Math.max(0, vhOffset));

          // If user is at bottom and keyboard opened, re-scroll to bottom
          if (isAtBottom) {
            requestAnimationFrame(() => {
              const el = scrollerRef.current;
              if (el) {
                const distance = el.scrollHeight - (el.scrollTop + el.clientHeight);
                if (distance > bottomThreshold + 50) {
                  // Keyboard opened, scroll down
                  setTimeout(() => {
                    el.scrollTop = el.scrollHeight;
                  }, 0);
                }
              }
            });
          }
        }
      }, 100);  // Increased debounce from 50ms to 100ms
    };

    viewport.addEventListener('resize', handleResize, { passive: true });

    return () => {
      viewport.removeEventListener('resize', handleResize);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [isAtBottom, bottomThreshold, detectKeyboard]);

  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const handleScroll = () => {
      requestAnimationFrame(checkPosition);
    };

    // Use overflow-anchor to prevent scroll jank
    el.style.overflowAnchor = 'auto';

    el.addEventListener('scroll', handleScroll, { passive: true });
    requestAnimationFrame(checkPosition);

    // ResizeObserver to handle image load and content changes
    // Only update if user is at bottom (avoid spam during typing)
    let lastScrolledTime = 0;
    const resizeObserver = new ResizeObserver(() => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        checkPosition();
        // Only auto-scroll if recently was at bottom and enough time passed
        if (isAtBottom && Date.now() - lastScrolledTime > 500) {
          lastScrolledTime = Date.now();
          scrollToBottom(false);
        }
      }, 200);  // Increased debounce from 100ms to 200ms
    });

    resizeObserver.observe(el);

    return () => {
      el.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [checkPosition, isAtBottom, scrollToBottom]);

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
    keyboardHeight,
  } as const;
};

export default useAutoScroll;
