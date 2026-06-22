import { useEffect, useState } from 'react';
import { apiFetchJson } from '@/lib/apiFetch';
import { useAuth } from '@/contexts/AuthContext';
import { getSonoGuestId } from '@/lib/sonoGuestId';
import { hasSonoLifetimeLocal } from '@/components/sono/sonoLifetime';

const PRODUCT_KEY = 'protocolo_sono_7_noites';

interface SonoEntitlementState {
  hasAccess: boolean;
  loading: boolean;
}

/**
 * Acesso às 7 noites (vitalício via Pix). Fonte da verdade = servidor:
 * - autenticado → /check (por user_id);
 * - guest (pagou antes de criar conta) → /check-guest (por guest_id).
 * Inicializa com o cache local (eco.sono.lifetime.v1) pra não piscar bloqueado
 * logo após pagar, enquanto a confirmação do servidor não volta.
 */
export function useSonoEntitlement(): SonoEntitlementState {
  const { user } = useAuth();
  const [hasAccess, setHasAccess] = useState(() => hasSonoLifetimeLocal());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const path = user
      ? `/api/entitlements/check?product_key=${encodeURIComponent(PRODUCT_KEY)}`
      : `/api/entitlements/check-guest?product_key=${encodeURIComponent(PRODUCT_KEY)}&guest_id=${encodeURIComponent(getSonoGuestId())}`;

    apiFetchJson<{ hasAccess: boolean }>(path).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (result.ok) {
        // Servidor confirma; mas nunca rebaixa um acesso já garantido pelo cache
        // local (evita perder o acesso recém-pago por atraso de propagação).
        setHasAccess(result.data.hasAccess || hasSonoLifetimeLocal());
      }
    });

    return () => {
      cancelled = true;
    };
  }, [user]);

  return { hasAccess, loading };
}
