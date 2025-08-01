import { useEffect, useRef } from 'react';

type Opts = { container: HTMLElement | null; inputBar: HTMLElement | null; extra?: number };

/**
 * Ajusta padding-bottom do scroller para somar teclado + altura do input
 * e expõe uma função recompute() para forçar recálculo após novos renders.
 */
export function useKeyboardInsets({ container, inputBar, extra = 8 }: Opts) {
  const applyRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!container || !inputBar) return;

    const root = document.documentElement;

    const setVHVar = () => root.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
    setVHVar();

    const applyInset = () => {
      if (!container || !inputBar) return;

      const vv = (window as any).visualViewport;
      const inputH = inputBar.getBoundingClientRect().height || 0;
      let keyboard = 0;

      if (vv) keyboard = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);

      // margem mínima de segurança (quando teclado não está aberto)
      const baseMin = Math.max(inputH + extra, 56);

      const inset = Math.max(baseMin, keyboard + inputH + extra);

      container.style.paddingBottom = `${inset}px`;
      root.style.setProperty('--inset-bottom', `${inset}px`);

      // Garante rolar até o fim (usa microtask + timeout curto)
      Promise.resolve().then(() => {
        setTimeout(() => {
          container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        }, 10);
      });

      document.body.classList.toggle('keyboard-open', inset > inputH + 2);
    };

    applyRef.current = applyInset;

    const vv = (window as any).visualViewport;
    window.addEventListener('resize', setVHVar);
    if (vv) {
      vv.addEventListener('resize', applyInset);
      vv.addEventListener('scroll', applyInset);
    } else {
      window.addEventListener('resize', applyInset);
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

  // função para ser chamada pelo componente quando precisar
  const recompute = () => applyRef.current && applyRef.current();
  return recompute;
}
