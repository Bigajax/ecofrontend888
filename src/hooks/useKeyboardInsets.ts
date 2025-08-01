import { useEffect } from 'react';

type Opts = { container: HTMLElement | null; inputBar: HTMLElement | null; extra?: number };

export function useKeyboardInsets({ container, inputBar, extra = 8 }: Opts) {
  useEffect(() => {
    if (!container || !inputBar) return;

    const root = document.documentElement;

    // corrige 100vh no iOS (var(--vh))
    const setVHVar = () => root.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
    setVHVar();

    const applyInset = () => {
      const vv = (window as any).visualViewport;
      const inputH = inputBar.getBoundingClientRect().height;
      let keyboard = 0;

      if (vv) {
        keyboard = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      }

      const inset = keyboard + inputH + extra;
      container.style.paddingBottom = `${inset}px`;
      root.style.setProperty('--inset-bottom', `${inset}px`);

      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      document.body.classList.toggle('keyboard-open', inset > inputH + 2);
    };

    const vv = (window as any).visualViewport;
    window.addEventListener('resize', setVHVar);
    if (vv) {
      vv.addEventListener('resize', applyInset);
      vv.addEventListener('scroll', applyInset);
    } else {
      window.addEventListener('resize', applyInset); // fallback Android antigo
    }

    applyInset();

    return () => {
      window.removeEventListener('resize', setVHVar);
      if (vv) {
        vv.removeEventListener('resize', applyInset);
        vv.removeEventListener('scroll', applyInset);
      } else {
        window.removeEventListener('resize', applyInset);
      }
      document.body.classList.remove('keyboard-open');
    };
  }, [container, inputBar, extra]);
}
