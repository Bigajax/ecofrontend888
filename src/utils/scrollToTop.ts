/**
 * Reseta o scroll para o topo de forma robusta.
 *
 * Por quê: no mobile (CSS `@media (max-width:768px)`) o scroller real é o
 * `#root`/`body` (`overflow-y:auto` + `height:100dvh`), e o `#root` é
 * persistente entre rotas (ponto de montagem do React). `window.scrollTo`
 * só mexe no document scrolling element, então não zera o `#root.scrollTop`
 * e a nova rota abre na mesma posição vertical da anterior ("começa no fim").
 *
 * Resetamos todos os candidatos a container de scroll para garantir o topo.
 * Mesmo padrão usado no scroll-to-top do logo (EcotopiaTopbar).
 */
export function scrollToTop(): void {
  const candidates: Array<HTMLElement | null> = [
    document.getElementById('root'),
    document.scrollingElement as HTMLElement | null,
    document.documentElement,
    document.body,
  ];

  candidates.forEach((el) => {
    if (el) el.scrollTop = 0;
  });

  // Cobre o caso em que o documento (window) é o scroller (desktop).
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
}
