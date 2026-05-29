import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Reseta o scroll para o topo em toda mudança de rota.
 * Render dentro do <BrowserRouter>. Não renderiza nada visualmente.
 *
 * Por que: react-router-dom v6 não tem scroll restoration automática
 * (só no data router). Sem isso, ao navegar de /sono (scroll baixo)
 * para /assinar a página abre na mesma posição vertical, parecendo
 * "começar no final".
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  return null;
}
