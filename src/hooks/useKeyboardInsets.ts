import { MutableRefObject, useEffect, useLayoutEffect, useMemo, useState } from 'react';

type UseKeyboardInsetsOptions = {
  /**
   * Ref for the composer wrapper so we can measure height changes when the
   * textarea grows/shrinks.
   */
  inputRef?: MutableRefObject<HTMLElement | null>;
};

type KeyboardInsets = {
  isKeyboardOpen: boolean;
  safeAreaBottom: number;
  keyboardHeight: number;
  inputHeight: number;
  /** Total bottom padding to apply to the scroll area. */
  contentInset: number;
};

const SAFARI_KEYBOARD_THRESHOLD = 60;

const readSafeAreaBottom = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return 0;
  }

  const raw = getComputedStyle(document.documentElement).getPropertyValue('--safe-bottom');
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function useKeyboardInsets(options: UseKeyboardInsetsOptions = {}): KeyboardInsets {
  const { inputRef } = options;
  const [safeAreaBottom, setSafeAreaBottom] = useState<number>(() => readSafeAreaBottom());
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [inputHeight, setInputHeight] = useState(0);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useLayoutEffect(() => {
    if (!inputRef?.current) return;
    const el = inputRef.current;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      const nextHeight = Math.round(rect.height);
      setInputHeight((prev) => (prev === nextHeight ? prev : nextHeight));
    };

    measure();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [inputRef]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setSafeAreaBottom(readSafeAreaBottom());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const vv = window.visualViewport;
    if (!vv) {
      setKeyboardHeight(0);
      setIsKeyboardOpen(false);
      return;
    }

    let raf = 0;

    const measure = () => {
      raf = 0;
      const viewportHeight = vv.height + vv.offsetTop;
      const rawInset = Math.max(0, window.innerHeight - viewportHeight);
      const adjustedInset = Math.max(0, rawInset - safeAreaBottom);
      setKeyboardHeight(adjustedInset);
      setIsKeyboardOpen(adjustedInset > SAFARI_KEYBOARD_THRESHOLD);
    };

    const schedule = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };

    vv.addEventListener('resize', schedule);
    vv.addEventListener('scroll', schedule);
    schedule();

    return () => {
      vv.removeEventListener('resize', schedule);
      vv.removeEventListener('scroll', schedule);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [safeAreaBottom]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.classList.toggle('keyboard-open', isKeyboardOpen);

    // Scroll para o input quando teclado abre (melhoria mobile)
    if (isKeyboardOpen && inputRef?.current) {
      requestAnimationFrame(() => {
        const element = inputRef.current;
        if (!element) return;

        // Scroll suave para garantir que o input está visível
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'nearest'
        });
      });
    }

    return () => {
      document.body.classList.remove('keyboard-open');
    };
  }, [isKeyboardOpen, inputRef]);

  const contentInset = useMemo(() => {
    return inputHeight + keyboardHeight;
  }, [inputHeight, keyboardHeight]);

  return {
    isKeyboardOpen,
    safeAreaBottom,
    keyboardHeight,
    inputHeight,
    contentInset,
  };
}

export default useKeyboardInsets;
