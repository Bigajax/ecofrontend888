import { useEffect, useRef } from 'react';
import { trackSecaoVista } from '@/lib/mixpanelAssinarFunnel';

/**
 * Dispara `Funil Sono · Seção vista` { secao } uma vez quando a seção entra na
 * viewport. Espelha `useSectionInView` (landings genéricas), mas na taxonomia
 * do funil /sono e com threshold 0.5 (metade visível). Retorna a ref pra anexar
 * ao elemento da seção.
 */
export function useSonoSectionInView<T extends HTMLElement = HTMLElement>(secao: string) {
  const ref = useRef<T | null>(null);
  const fired = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || fired.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && !fired.current) {
          fired.current = true;
          try {
            trackSecaoVista({ secao });
          } catch {
            // tracking nunca pode quebrar a página
          }
          observer.disconnect();
        }
      },
      { threshold: 0.5 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [secao]);

  return ref;
}
