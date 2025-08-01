import { useEffect, useRef } from 'react';

type Opts = { container: HTMLElement | null; inputBar: HTMLElement | null; extra?: number };

/**
 * Ajusta o padding-bottom do scroller somando teclado + altura do input.
 * Quando o teclado está FECHADO, usa apenas um baseMin (baixo) para evitar vãos.
 * Inclui throttle e corrige 100vh no iOS via --vh.
 */
export function useKeyboardInsets({ container, inputBar, extra = 8 }: Opts) {
  const applyRef = useRef<() => void>(() => {});
  const rafRef = useRef<number | null>(null);
  const lastRunRef = useRef(0);

  useEffect(() => {
    if (!container || !inputBar) return;

    const root = document.documentElement;

    const setVHVar = () => {
      root.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
    };
    setVHVar();

    const applyInset = () => {
      if (!container || !inputBar) return;

      const vv = (window as any).visualViewport;
      const inputH = inputBar.getBoundingClientRect().height || 0;

      let keyboard = 0;
      if (vv) {
        keyboard = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      }

      // Quando teclado fechado, mantenha compacto (sem “vão”)
      const baseMin = inputH + Math.max(extra, 8);

      const inset = keyboard > 4
        ? keyboard + inputH + extra
        : baseMin;

      container.style.paddingBottom = `${inset}px`;
      root.style.setProperty('--inset-bottom', `${inset}px`);

      // rola pro fim de forma suave
      Promise.resolve().then(() => {
        setTimeout(() => {
          container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        }, 10);
      });

      document.body.classList.toggle('keyboard-open', keyboard > 4);
    };

    // throttle leve p/ eventos barulhentos do iOS
    const throttled = () => {
      const now = performance.now();
      if (now - lastRunRef.current < 50) {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(applyInset);
        return;
      }
      lastRunRef.current = now;
      applyInset();
    };

    applyRef.current = applyInset;

    const vv = (window as any).visualViewport;
    window.addEventListener('resize', setVHVar);
    window.addEventListener('orientationchange', setVHVar);
    if (vv) {
      vv.addEventListener('resize', throttled);
      vv.addEventListener('scroll', throttled);
    } else {
      window.addEventListener('resize', throttled);
    }

    applyInset();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', setVHVar);
      window.removeEventListener('orientationchange', setVHVar);
      if (vv) {
        vv.removeEventListener('resize', throttled);
        vv.removeEventListener('scroll', throttled);
      } else {
        window.removeEventListener('resize', throttled);
      }
      document.body.classList.remove('keyboard-open');
    };
  }, [container, inputBar, extra]);

  // função para forçar recálculo (pós-render/envio/foco)
  const recompute = () => applyRef.current && applyRef.current();
  return recompute;
}
