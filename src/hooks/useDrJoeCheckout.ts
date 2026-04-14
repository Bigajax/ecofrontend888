import { useState } from 'react';
import { apiFetchJson } from '@/lib/apiFetch';

const PRODUCT_KEY = 'dr_joe_colecao';

export function useDrJoeCheckout() {
  const [loading, setLoading] = useState(false);

  const openCheckout = async (origin: string = 'app_dr_joe') => {
    if (loading) return;
    setLoading(true);

    try {
      const result = await apiFetchJson<{ init_point: string; external_reference: string }>(
        '/api/mp/create-preference',
        {
          method: 'POST',
          body: JSON.stringify({
            productKey: PRODUCT_KEY,
            origin,
            siteUrl: window.location.origin,
          }),
        }
      );

      if (!result.ok) {
        const data = result.data as unknown as { message?: string };
        throw new Error(data?.message || `Erro ${result.status}`);
      }

      const { init_point, external_reference } = result.data;
      if (!init_point) throw new Error('Link de pagamento não retornado');

      if (external_reference) {
        sessionStorage.setItem('eco.drjoe.external_reference', external_reference);
      }

      window.location.href = init_point;
    } catch (err) {
      setLoading(false);
      const message = err instanceof Error ? err.message : 'Erro ao abrir o pagamento';
      alert(`Não foi possível abrir o pagamento. ${message}\n\nTente novamente ou entre em contato.`);
    }
  };

  return { loading, openCheckout };
}

