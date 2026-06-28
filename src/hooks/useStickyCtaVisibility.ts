import { useEffect, useState, type RefObject } from 'react';

/**
 * Visibilidade do CTA sticky da landing /sono. Recebe os refs dos CTAs "âncora"
 * (herói e oferta/rodapé) e devolve `true` quando NENHUM deles está na viewport
 * — ou seja, o usuário passou do CTA do herói e ainda não chegou no da oferta,
 * exatamente a faixa de scroll onde o sticky precisa aparecer.
 *
 * Espelha o padrão de `useSonoSectionInView` (IntersectionObserver), mas observa
 * múltiplos elementos e reflete o estado contínuo (não dispara evento único).
 * Estado inicial `false`: no topo o herói está visível → sticky escondido.
 */
export function useStickyCtaVisibility(
  refs: RefObject<Element | null>[],
): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const elements = refs
      .map((ref) => ref.current)
      .filter((el): el is Element => el != null);

    if (elements.length === 0) return;

    // Mapa elemento → está na viewport? Recalcula `visible` a cada entrada.
    const inView = new Map<Element, boolean>(elements.map((el) => [el, false]));

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          inView.set(entry.target, entry.isIntersecting);
        });
        // Sticky aparece só quando nenhuma âncora está visível.
        const anyVisible = Array.from(inView.values()).some(Boolean);
        setVisible(!anyVisible);
      },
      { threshold: 0 },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // refs é um array novo a cada render; dependemos dos elementos atuais via
    // refs[i].current, então observamos a identidade dos próprios refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, refs);

  return visible;
}
