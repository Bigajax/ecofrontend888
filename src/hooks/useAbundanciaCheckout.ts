import { useState } from 'react';
import { apiFetchJson } from '@/lib/apiFetch';

const PRODUCT_KEY = 'protocolo_abundancia_7_dias';

export function useAbundanciaCheckout() {
  const [loading, setLoading] = useState(false);

  const openCheckout = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const result = await apiFetchJson<{ init_point: string; external_reference: string }>(
        '/api/mp/create-preference',
        {
          method: 'POST',
          body: JSON.stringify({ productKey: PRODUCT_KEY, origin: 'app' }),
        }
      );

      if (!result.ok) {
        const data = result.data as unknown as { message?: string };
        throw new Error(data?.message || `Erro ${result.status}`);
      }

      const { init_point } = result.data;
      if (!init_point) throw new Error('Link de pagamento não retornado');

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
