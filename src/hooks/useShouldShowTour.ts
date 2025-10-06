// src/hooks/useShouldShowTour.ts
import { useEffect, useMemo, useState } from 'react';

const SEEN_KEY = 'eco.tour.seen.v1';

function getQuery() {
  if (typeof window === 'undefined') return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

export type TourReason =
  | 'first_visit'
  | 'forced_query'
  | 'ad_click'
  | 'deeplink'
  | 'none';

export function useShouldShowTour() {
  const [shouldShow, setShouldShow] = useState(false);
  const [reason, setReason] = useState<TourReason>('none');

  const qp = useMemo(getQuery, []);

  useEffect(() => {
    const forced = qp.get('tour') === '1';               // ?tour=1 para forçar
    const fromAd = !!(qp.get('utm_source') || qp.get('fbclid')); // tráfego pago
    const seen = localStorage.getItem(SEEN_KEY);

    if (forced) {
      setShouldShow(true);
      setReason('forced_query');
      return;
    }

    // 1ª visita de ads: mostra uma vez
    if (!seen && fromAd) {
      setShouldShow(true);
      setReason('ad_click');
      return;
    }

    // fallback: primeira visita absoluta
    if (!seen) {
      setShouldShow(true);
      setReason('first_visit');
    }
  }, [qp]);

  const markSeen = () => localStorage.setItem(SEEN_KEY, '1');
  const resetSeen = () => localStorage.removeItem(SEEN_KEY);

  return { shouldShow, reason, markSeen, resetSeen };
}
