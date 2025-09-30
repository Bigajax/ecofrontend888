import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import mixpanel from './mixpanel';

export default function MixpanelRouteListener() {
  const location = useLocation();

  useEffect(() => {
    const { pathname, search } = location;

    mixpanel.register({ last_page: pathname });
    mixpanel.track('Front-end: Page View', {
      path: pathname,
      search
    });
  }, [location.pathname, location.search]);

  return null;
}
