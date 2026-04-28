import { useState } from 'react';
import { apiFetchJson } from '@/lib/apiFetch';
import mixpanel from '@/lib/mixpanel';

const PRODUCT_KEY = 'protocolo_sono_7_noites';

interface CheckoutOptions {
  origin?: string;
}

export function useSonoCheckout() {
  const [loading, setLoading] = useState(false);

  const openCheckout = async (opts: CheckoutOptions = {}) => {
    if (loading) return;
    setLoading(true);

    try {
      const result = await apiFetchJson<{ init_point: string; external_reference: string }>(
        '/api/mp/create-preference',
        {
          method: 'POST',
          body: JSON.stringify({
            productKey: PRODUCT_KEY,
            origin: opts.origin || 'app',
            siteUrl: window.location.origin,
          }),
        }
      );

      if (!result.ok) {
        const data = result.data as any;
        throw new Error(data?.message || `Erro ${result.status}`);
      }

      const { init_point, external_reference } = result.data;
      if (!init_point) throw new Error('Link de pagamento não retornado');

      if (external_reference) {
        sessionStorage.setItem('eco.sono.external_reference', external_reference);
      }

      mixpanel.track('Checkout Started', {
        origin: opts.origin || 'app',
        product: PRODUCT_KEY,
      });

      window.location.href = init_point;
      // Não resetar loading — browser vai navegar
    } catch (err) {
      setLoading(false);
      const message = err instanceof Error ? err.message : 'Erro ao abrir o pagamento';
      alert(`Não foi possível abrir o pagamento. ${message}\n\nTente novamente ou entre em contato.`);
    }
  };

  return { loading, openCheckout };
}
