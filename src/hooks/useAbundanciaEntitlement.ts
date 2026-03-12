import { useEffect, useState } from 'react';
import { apiFetchJson } from '@/lib/apiFetch';
import { useAuth } from '@/contexts/AuthContext';

const PRODUCT_KEY = 'protocolo_abundancia_7_dias';

interface AbundanciaEntitlementState {
  hasAccess: boolean;
  loading: boolean;
}

export function useAbundanciaEntitlement(): AbundanciaEntitlementState {
  const { user } = useAuth();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setHasAccess(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    apiFetchJson<{ hasAccess: boolean }>(
      `/api/entitlements/check?product_key=${encodeURIComponent(PRODUCT_KEY)}`
    ).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (result.ok) {
        setHasAccess(result.data.hasAccess);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [user]);

  return { hasAccess, loading };
}
