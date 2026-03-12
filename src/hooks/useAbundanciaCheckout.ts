import { useState } from 'react';
import { apiFetchJson } from '@/lib/apiFetch';

const PRODUCT_KEY = 'protocolo_abundancia_7_dias';

function loadMpSdk(): Promise<void> {
  if ((window as any).MercadoPago) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://sdk.mercadopago.com/js/v2';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Falha ao carregar SDK do Mercado Pago'));
    document.head.appendChild(script);
  });
}

export function useAbundanciaCheckout() {
  const [loading, setLoading] = useState(false);

  const openCheckout = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const result = await apiFetchJson<{ init_point: string; preference_id?: string; external_reference: string }>(
        '/api/mp/create-preference',
        {
          method: 'POST',
          body: JSON.stringify({ productKey: PRODUCT_KEY, origin: 'app', siteUrl: window.location.origin }),
        }
      );

      if (!result.ok) {
        const data = result.data as unknown as { message?: string };
        throw new Error(data?.message || `Erro ${result.status}`);
      }

      const { init_point, preference_id } = result.data;
      if (!init_point) throw new Error('Link de pagamento não retornado');

      const publicKey = import.meta.env.VITE_MP_PUBLIC_KEY;
      const preferenceId = preference_id ?? new URL(init_point).searchParams.get('pref_id');

      if (preferenceId && publicKey) {
        await loadMpSdk();
        const mp = new (window as any).MercadoPago(publicKey, { locale: 'pt-BR' });
        mp.checkout({ preference: { id: preferenceId }, autoOpen: true });
      } else {
        window.location.href = init_point;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao abrir o pagamento';
      alert(`Não foi possível abrir o pagamento. ${message}\n\nTente novamente ou entre em contato.`);
    } finally {
      setLoading(false);
    }
  };

  return { loading, openCheckout };
}
