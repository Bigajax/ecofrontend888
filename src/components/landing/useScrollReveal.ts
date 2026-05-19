import { useEffect } from 'react';

// Aciona .in-view nos elementos com .scroll-reveal quando entram no viewport.
// Estilo Protocolo-Sono-v2: stagger + transição soft de opacidade + translateY.
export function useScrollReveal(rootSelector?: string) {
  useEffect(() => {
    const root = rootSelector ? document.querySelector(rootSelector) : document;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).classList.add('in-view');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 },
    );

    root.querySelectorAll('.scroll-reveal').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [rootSelector]);
}
