import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Copy, Loader2, ShieldCheck } from 'lucide-react';
import { apiUrl } from '@/config/apiBase';
import {
  trackWithCAPI,
  ensurePurchaseEventId,
  getPurchaseEventId,
  getFbp,
  resolveFbc,
} from '@/lib/fbpixel';
import { LIFETIME_LS_KEY } from './sonoLifetime';

/**
 * Passo do Pix inline do funil do sono (substitui o cartão). Pagamento único,
 * acesso vitalício às 7 noites. TUDO acontece nesta tela: gera o Pix, mostra o
 * copia-e-cola (ação principal — mobile não escaneia a própria tela) + QR (desktop)
 * e faz polling do status. NUNCA abre aba nova / ticket_url.
 *
 * `onPaid` dispara quando o pagamento é aprovado — o orquestrador vai pro passo
 * `unlocked`. A fonte da verdade do desbloqueio é o webhook (entitlement por
 * guest_id); aqui também gravamos um cache local pra o guest sem conta.
 */
interface SonoInlinePixProps {
  price: number;
  /** Mesmo guest_id usado nos eventos do funil — fio mestre do desbloqueio. */
  guestId: string;
  onPaid: () => void;
}

interface PixData {
  id: string;
  qrCode: string;
  qrCodeBase64: string | null;
  externalReference: string;
}

type PixStatus = 'creating' | 'waiting' | 'approved' | 'expired' | 'error';

const POLL_INTERVAL_MS = 4000;

function priceLabel(price: number): string {
  return Number.isInteger(price) ? `R$${price}` : `R$${price.toFixed(2).replace('.', ',')}`;
}

export function SonoInlinePix({ price, guestId, onPaid }: SonoInlinePixProps) {
  const [pix, setPix] = useState<PixData | null>(null);
  const [status, setStatus] = useState<PixStatus>('creating');
  const [copied, setCopied] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const createStartedRef = useRef(false);
  const initiateCheckoutFiredRef = useRef(false);
  const approvedRef = useRef(false);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cria a cobrança Pix. Ref-guard contra o double-invoke do StrictMode.
  const createPix = useCallback(async () => {
    setErro(null);
    setStatus('creating');
    try {
      const res = await fetch(apiUrl('/api/payments/sono-pix'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest_id: guestId,
          purchaseEventId: ensurePurchaseEventId(),
          fbp: getFbp(),
          fbc: resolveFbc(),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || 'Não foi possível gerar o Pix.');
      }
      const data = await res.json();
      setPix({
        id: String(data.id),
        qrCode: data.qr_code,
        qrCodeBase64: data.qr_code_base64 ?? null,
        externalReference: data.external_reference,
      });
      setStatus('waiting');
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro inesperado.');
      setStatus('error');
    }
  }, [guestId]);

  useEffect(() => {
    if (createStartedRef.current) return;
    createStartedRef.current = true;
    // InitiateCheckout (Pixel + CAPI) 1×: a campanha otimiza por IC e o cartão que
    // disparava IC saiu — este é o novo ponto de IC do funil.
    if (!initiateCheckoutFiredRef.current) {
      initiateCheckoutFiredRef.current = true;
      void trackWithCAPI('InitiateCheckout', {
        value: price,
        currency: 'BRL',
        contentName: 'Protocolo do Sono',
        contentCategory: 'sono',
      });
    }
    void createPix();
  }, [createPix, price]);

  const markApproved = useCallback(() => {
    if (approvedRef.current) return;
    approvedRef.current = true;
    setStatus('approved');
    // Cache local: o guest sem conta mantém acesso ao recarregar. Fonte da verdade
    // continua sendo o entitlement por guest_id (webhook).
    try {
      localStorage.setItem(
        LIFETIME_LS_KEY,
        JSON.stringify({
          unlocked: true,
          externalReference: pix?.externalReference ?? null,
          paymentId: pix?.id ?? null,
        }),
      );
    } catch {
      /* storage indisponível — segue */
    }
    // Purchase no client (dedup com o webhook via mesmo event_id). O webhook é o
    // PRINCIPAL (resiliente a fechar a aba); este reforça quando o user volta.
    void trackWithCAPI(
      'Purchase',
      { value: price, currency: 'BRL', contentName: 'Protocolo do Sono', contentCategory: 'sono' },
      getPurchaseEventId(),
    );
    onPaid();
  }, [onPaid, pix, price]);

  // Polling do status. Reagenda enquanto 'waiting'; retoma no foco da aba
  // (visibilitychange) porque o usuário sai pro app do banco e volta.
  const checkStatus = useCallback(async () => {
    if (!pix || approvedRef.current) return;
    try {
      const res = await fetch(apiUrl(`/api/payments/status/${pix.id}`));
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'approved') {
          markApproved();
          return;
        }
        if (data.status === 'cancelled' || data.status === 'rejected') {
          setStatus('expired');
          return;
        }
      }
    } catch {
      /* rede instável — tenta de novo no próximo tick */
    }
  }, [pix, markApproved]);

  useEffect(() => {
    if (status !== 'waiting' || !pix) return;
    let cancelled = false;

    const tick = async () => {
      if (cancelled || approvedRef.current) return;
      await checkStatus();
      if (cancelled || approvedRef.current) return;
      pollTimerRef.current = setTimeout(tick, POLL_INTERVAL_MS);
    };
    pollTimerRef.current = setTimeout(tick, POLL_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible' && !approvedRef.current) void checkStatus();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [status, pix, checkStatus]);

  const handleCopy = useCallback(async () => {
    if (!pix?.qrCode) return;
    try {
      await navigator.clipboard.writeText(pix.qrCode);
    } catch {
      // Fallback pra navegadores sem clipboard API (webview antigo).
      const ta = document.createElement('textarea');
      ta.value = pix.qrCode;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch { /* ignore */ }
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }, [pix]);

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="text-center">
        <h2
          className="font-display text-[23px] font-bold leading-snug text-white"
          style={{ textShadow: '0 2px 20px rgba(0,0,0,0.6)' }}
        >
          Quase lá. <span style={{ color: '#C4B5FD' }}>Copie o código</span> e pague no seu banco.
        </h2>
        <p className="mt-2 text-[14px] leading-snug text-white/50">
          Copie o código Pix (ou escaneie o QR no desktop), abra o app do banco e pague{' '}
          {priceLabel(price)}. Assim que cair, suas 7 noites liberam AQUI MESMO — não feche esta tela.
        </p>
      </div>

      {status === 'creating' && (
        <div className="flex min-h-[180px] items-center justify-center gap-2 text-[13px] text-white/45">
          <Loader2 className="h-4 w-4 animate-spin" />
          Gerando seu Pix…
        </div>
      )}

      {status === 'error' && (
        <div className="flex flex-col items-center gap-4 py-4">
          <p role="alert" className="text-center text-[13px]" style={{ color: '#F8B4B4' }}>
            {erro || 'Não foi possível gerar o Pix.'}
          </p>
          <button
            onClick={() => createPix()}
            className="rounded-full px-6 py-3 text-[14px] font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.97]"
            style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.16)' }}
          >
            Tentar de novo
          </button>
        </div>
      )}

      {(status === 'waiting' || status === 'expired') && pix && (
        <>
          {/* Ação PRINCIPAL: copia-e-cola (mobile). */}
          <button
            onClick={handleCopy}
            className="flex w-full items-center justify-center gap-2 rounded-full py-4 text-[15px] font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #A78BFA 0%, #5A3DB0 100%)',
              boxShadow: '0 10px 36px rgba(124,58,237,0.5)',
            }}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Código copiado!' : 'Copiar código Pix'}
          </button>

          {/* QR — secundário, pra desktop. */}
          {pix.qrCodeBase64 && (
            <div className="flex flex-col items-center gap-2">
              <div className="rounded-2xl bg-white p-3">
                <img
                  src={`data:image/png;base64,${pix.qrCodeBase64}`}
                  alt="QR Code Pix"
                  width={180}
                  height={180}
                  className="h-[180px] w-[180px]"
                />
              </div>
              <p className="text-[11px] text-white/35">No computador? Escaneie o QR.</p>
            </div>
          )}

          <div className="flex items-center justify-center gap-2 text-[13px] text-white/55">
            {status === 'waiting' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" style={{ color: '#C4B5FD' }} />
                Esperando o pagamento…
              </>
            ) : (
              <span style={{ color: '#F8B4B4' }}>O código expirou.</span>
            )}
          </div>

          {status === 'waiting' ? (
            <button
              onClick={() => void checkStatus()}
              className="mx-auto text-[12.5px] text-white/55 underline decoration-dotted underline-offset-2 transition-colors hover:text-white/80"
            >
              Já paguei, verificar
            </button>
          ) : (
            <button
              onClick={() => createPix()}
              className="mx-auto text-[13px] font-semibold text-white/80 underline underline-offset-2"
            >
              Gerar novo código
            </button>
          )}

          <p className="flex items-center justify-center gap-1.5 text-center text-[11.5px] leading-relaxed text-white/35">
            <ShieldCheck className="h-3.5 w-3.5" style={{ color: 'rgba(196,181,253,0.6)' }} />
            Pagamento único · acesso vitalício · sem assinatura
          </p>
        </>
      )}
    </div>
  );
}
