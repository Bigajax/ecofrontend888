import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Loader2, ShieldCheck } from 'lucide-react';
import { MpCardForm } from '@/components/assinar/MpCardForm';
import { apiUrl } from '@/config/apiBase';
import { supabase } from '@/lib/supabaseClient';
import { PRICE } from '@/constants/offerCopy';
import {
  trackCartaoVisto,
  trackCartaoPronto,
  trackCartaoEnviado,
  trackCartaoRecusado,
  trackCartaoErro,
} from '@/lib/mixpanelAssinarFunnel';

/**
 * Passo do cartão inline do funil do sono. Envolve o brick do Mercado Pago numa
 * moldura escura/calma (o iframe dos Secure Fields mantém o visual próprio do MP,
 * por isso o cartão fica num cartão claro contido — constraint conhecida). Reusa
 * o mesmo endpoint e a instrumentação do /assinar; o plano é sempre `monthly`.
 *
 * `onPaid` dispara quando o backend aceita a criação da assinatura — o premium é
 * ativado depois, de forma assíncrona, pelo webhook (o orquestrador faz o polling
 * no passo `confirming`).
 */
interface SonoInlineCardProps {
  payerEmail: string;
  onPaid: () => void;
}

const PLAN = 'monthly' as const;

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
}

export function SonoInlineCard({ payerEmail, onPaid }: SonoInlineCardProps) {
  const [erro, setErro] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const shownAtRef = useRef<number | null>(null);

  // Monta o brick só depois da animação de entrada do overlay assentar (~400ms).
  // O brick do MP não tolera ser montado num container que está transformando
  // (translateY do motion.div) — Secure Fields falham. Placeholder no intervalo.
  const [brickReady, setBrickReady] = useState(false);

  useEffect(() => {
    shownAtRef.current = Date.now();
    trackCartaoVisto({ plan_id: PLAN, amount: PRICE.monthly });
    const t = setTimeout(() => setBrickReady(true), 480);
    return () => clearTimeout(t);
  }, []);

  // useCallback com identidade estável: o brick do MP (React.memo) não tolera ser
  // recriado a cada render (Secure Fields falham). Ver MpCardForm.
  const handleToken = useCallback(
    async (formData: Record<string, unknown>) => {
      setErro(null);
      setProcessing(true);
      trackCartaoEnviado({ plan_id: PLAN, amount: PRICE.monthly });
      try {
        const res = await fetch(apiUrl('/api/subscription/create-with-card'), {
          method: 'POST',
          headers: await authHeaders(),
          body: JSON.stringify({ ...formData, plan: PLAN }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.message || 'Não foi possível concluir a assinatura.');
        }
        // Premium é ativado pelo webhook do MP; o orquestrador confirma via polling.
        onPaid();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro inesperado.';
        trackCartaoRecusado({ plan_id: PLAN, error_message: message });
        setErro(message);
      } finally {
        setProcessing(false);
      }
    },
    [onPaid],
  );

  const handleBrickReady = useCallback(() => {
    const shownAt = shownAtRef.current;
    trackCartaoPronto({ plan_id: PLAN, elapsed_ms: shownAt ? Date.now() - shownAt : -1 });
  }, []);

  const handleBrickError = useCallback((message: string) => {
    setErro(message);
    trackCartaoErro({ plan_id: PLAN, error_message: message });
  }, []);

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="text-center">
        <h2
          className="font-display text-[24px] font-bold leading-snug text-white"
          style={{ textShadow: '0 2px 20px rgba(0,0,0,0.6)' }}
        >
          Confirme suas <span style={{ color: '#C4B5FD' }}>7 noites</span>
        </h2>
        <p className="mt-2 text-[14px] leading-snug text-white/45">
          R$ 0 hoje · primeira cobrança só em 7 dias.
        </p>
      </div>

      {/* Resumo do plano */}
      <div
        className="flex items-center justify-between rounded-2xl px-4 py-4"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}
      >
        <div>
          <p className="font-display text-[16px] font-bold text-white">Mensal</p>
          <p className="text-[13px] text-white/45">Depois R$ 15,90/mês</p>
        </div>
        <div className="text-right">
          <p className="font-display text-[19px] font-bold" style={{ color: '#86EFAC' }}>
            R$ 0,00
          </p>
          <p className="text-[12px] font-semibold" style={{ color: '#86EFAC' }}>
            por 7 dias
          </p>
        </div>
      </div>

      {/* O que entra — reforça o valor e a confiança no momento do cartão.
          Num vidro pra destacar do fundo e ficar legível. */}
      <ul
        className="flex flex-col gap-3 rounded-2xl px-4 py-4"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}
      >
        {[
          'As 7 noites do Protocolo do Sono, liberadas agora.',
          'Meditações, sons e respirações pra adormecer mais rápido.',
          'Lembrete por e-mail 2 dias antes de qualquer cobrança.',
        ].map((text, i) => (
          <li key={i} className="flex items-start gap-2.5 text-[13.5px] leading-snug text-white/90">
            <Check className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: '#86EFAC' }} />
            <span>{text}</span>
          </li>
        ))}
      </ul>

      {/* Brick do MP em tema escuro (appearance="dark"), num vidro que integra ao
          clima do sono em vez do bloco branco. */}
      <div
        className="min-h-[180px] rounded-2xl px-3 py-2"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.10)' }}
      >
        {brickReady ? (
          <MpCardForm
            amount={PRICE.monthly}
            maxInstallments={1}
            payerEmail={payerEmail}
            appearance="dark"
            onToken={handleToken}
            onReady={handleBrickReady}
            onError={handleBrickError}
          />
        ) : (
          <div className="flex min-h-[148px] items-center justify-center gap-2 text-[13px] text-white/45">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando pagamento seguro…
          </div>
        )}
      </div>

      {processing && (
        <p aria-live="polite" className="text-center text-[13px] text-white/55">
          Processando…
        </p>
      )}
      {erro && (
        <p role="alert" className="text-center text-[13px]" style={{ color: '#F8B4B4' }}>
          {erro}
        </p>
      )}

      <p className="flex items-center justify-center gap-1.5 text-center text-[11.5px] leading-relaxed text-white/35">
        <ShieldCheck className="h-3.5 w-3.5" style={{ color: 'rgba(196,181,253,0.6)' }} />
        Pagamento seguro · cancele quando quiser.
      </p>
    </div>
  );
}
