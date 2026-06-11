import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import mixpanel from './mixpanel';

// Dedupe em escopo de módulo: quando o userId muda (login/signup), os providers
// com key por usuário no RootProviders remontam o subtree inteiro e este effect
// re-roda com a MESMA URL — sem o guard, o page view duplica e a jornada parece
// um reload no meio do fluxo (ex.: cadastro do /assinar). Módulo, e não useRef,
// porque o ref morre junto no remount; navegação real sempre muda a chave.
let lastTracked: string | null = null;

export default function MixpanelRouteListener() {
  const location = useLocation();

  useEffect(() => {
    const { pathname, search } = location;
    const key = `${pathname}?${search}`;
    if (key === lastTracked) return;
    lastTracked = key;

    mixpanel.register({ last_page: pathname });
    mixpanel.track('App · Page view', {
      path: pathname,
      search
    });
  }, [location.pathname, location.search]);

  return null;
}
