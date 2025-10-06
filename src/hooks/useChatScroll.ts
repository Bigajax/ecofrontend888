import { DependencyList, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

export const useChatScroll = <T extends HTMLElement>(dependencies: DependencyList = []) => {
  const scrollerRef = useRef<T | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const nearBottom = useCallback((el: HTMLElement, pad = 16) => {
    return el.scrollTop + el.clientHeight >= el.scrollHeight - pad;
  }, []);

  const scrollToBottom = useCallback(
    (smooth = true) => {
      const el = scrollerRef.current;
      if (!el) return;
      const behavior: ScrollBehavior = smooth ? 'smooth' : 'auto';
      requestAnimationFrame(() => {
        el.scrollTo({ top: el.scrollHeight, behavior });
        const at = nearBottom(el, 8);
        setIsAtBottom(at);
        setShowScrollBtn(!at);
      });
    },
    [nearBottom]
  );

  useEffect(() => {
    scrollToBottom(false);
  }, [scrollToBottom]);

  const handleScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const at = nearBottom(el, 16);
    setIsAtBottom(at);
    setShowScrollBtn(!at);
  }, [nearBottom]);

  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    if (nearBottom(el, 120)) scrollToBottom(true);
  }, [nearBottom, scrollToBottom, ...dependencies]);

  useEffect(() => {
    const vv = (window as any).visualViewport as VisualViewport | undefined;
    const wasAtBottomRef = { current: true };

    const handleFocusIn = () => {
      document.body.classList.add('keyboard-open');
      const el = scrollerRef.current;
      wasAtBottomRef.current = !!el && nearBottom(el, 120);
    };
    const handleFocusOut = () => {
      document.body.classList.remove('keyboard-open');
    };
    window.addEventListener('focusin', handleFocusIn);
    window.addEventListener('focusout', handleFocusOut);

    if (!vv) {
      return () => {
        window.removeEventListener('focusin', handleFocusIn);
        window.removeEventListener('focusout', handleFocusOut);
      };
    }

    let raf = 0;
    let scheduled = false;
    const measure = () => {
      scheduled = false;
      if (wasAtBottomRef.current) scrollToBottom(false);
    };
    const scheduleMeasure = () => {
      if (!scheduled) {
        scheduled = true;
        raf = requestAnimationFrame(measure);
      }
    };

    vv.addEventListener('resize', scheduleMeasure);
    vv.addEventListener('scroll', scheduleMeasure);
    scheduleMeasure();

    return () => {
      window.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('focusout', handleFocusOut);
      vv.removeEventListener('resize', scheduleMeasure);
      vv.removeEventListener('scroll', scheduleMeasure);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [nearBottom, scrollToBottom]);

  return { scrollerRef, endRef, isAtBottom, showScrollBtn, scrollToBottom, handleScroll } as const;
};
