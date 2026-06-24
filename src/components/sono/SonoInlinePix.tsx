import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Clock, Copy, Loader2, Lock, ShieldCheck } from 'lucide-react';
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

export function SonoInlinePix({ price, guestId, onPaid }: SonoInlinePixProps) {
  const [pix, setPix] = useState<PixData | null>(null);
  const [status, setStatus] = useState<PixStatus>('creating');
  const [copied, setCopied] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // Timer de 15 min (só UI). Reseta a cada Pix novo; ao zerar, gera outro.
  const [secondsLeft, setSecondsLeft] = useState(15 * 60);

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

  // Countdown de 15 min: reinicia a cada Pix novo e decrementa enquanto espera.
  useEffect(() => {
    if (status !== 'waiting' || !pix) return;
    setSecondsLeft(15 * 60);
    const id = setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [status, pix]);

  // Ao zerar, gera um novo Pix (o efeito acima reinicia o contador no novo código).
  useEffect(() => {
    if (status === 'waiting' && secondsLeft === 0 && !approvedRef.current) {
      void createPix();
    }
  }, [secondsLeft, status, createPix]);

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

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');
  const priceFull = `R$${price.toFixed(2).replace('.', ',')}`;

  return (
    <div className="flex w-full flex-col items-center gap-5">
      {/* Cadeado de vidro */}
      <span
        className="flex h-12 w-12 items-center justify-center rounded-full"
        style={{
          background: 'rgba(167,139,250,0.12)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1.5px solid rgba(167,139,250,0.7)',
          boxShadow: '0 0 18px rgba(167,139,250,0.45), inset 0 0 10px rgba(167,139,250,0.2)',
        }}
      >
        <Lock className="h-5 w-5" style={{ color: '#C4B5FD' }} />
      </span>

      {/* Header */}
      <div className="text-center">
        <h2
          className="font-display text-[26px] font-bold leading-tight text-white"
          style={{ textShadow: '0 2px 20px rgba(0,0,0,0.6)' }}
        >
          Quase lá.
        </h2>
        <p className="mt-1.5 text-[15px] font-medium" style={{ color: '#C4B5FD' }}>
          Copie o código Pix e pague no seu banco.
        </p>
        <p className="mt-2 text-[12.5px] leading-relaxed" style={{ color: 'rgba(214,203,250,0.55)' }}>
          Depois do pagamento, suas 7 noites são liberadas automaticamente. Não feche esta tela.
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
          {/* Pill — pagamento via Pix */}
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em]"
            style={{ background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.3)', color: '#C4B5FD', backdropFilter: 'blur(8px)' }}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Pagamento via Pix
          </span>

          {/* QR em destaque */}
          {pix.qrCodeBase64 && (
            <div className="flex flex-col items-center gap-2.5">
              <div className="rounded-2xl bg-white p-3.5" style={{ boxShadow: '0 12px 40px rgba(124,58,237,0.30)' }}>
                <img
                  src={`data:image/png;base64,${pix.qrCodeBase64}`}
                  alt="QR Code Pix"
                  width={196}
                  height={196}
                  className="h-[196px] w-[196px]"
                />
              </div>
              <p className="text-center text-[12px]" style={{ color: 'rgba(214,203,250,0.5)' }}>
                Escaneie com o app do seu banco ou copie o código Pix
              </p>
            </div>
          )}

          {/* Copiar código (ação principal no mobile) */}
          <button
            onClick={handleCopy}
            className="flex w-full items-center justify-center gap-2 rounded-full py-4 text-[15px] font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #A78BFA 0%, #5A3DB0 100%)',
              boxShadow: '0 10px 36px rgba(124,58,237,0.5), inset 0 1px 0 rgba(255,255,255,0.22)',
            }}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Código copiado!' : 'Copiar código Pix'}
          </button>

          {/* Card de preço + bullets */}
          <div
            className="w-full rounded-2xl p-4"
            style={{
              background: 'rgba(255,255,255,0.06)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.16)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
            }}
          >
            <div className="flex items-center gap-4">
              <div className="flex flex-shrink-0 flex-col">
                <span className="font-display text-[22px] font-bold leading-none text-white">{priceFull}</span>
                <span className="mt-1 text-[11px]" style={{ color: 'rgba(214,203,250,0.55)' }}>pagamento único</span>
              </div>
              <div className="grid flex-1 grid-cols-2 gap-x-2 gap-y-1.5">
                {['Pagamento único', 'Ambiente seguro', 'Acesso às 7 noites', 'Sem assinatura'].map((b) => (
                  <div key={b} className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 flex-shrink-0" strokeWidth={3} style={{ color: '#A78BFA' }} />
                    <span className="text-[10.5px] leading-tight" style={{ color: 'rgba(232,226,255,0.8)' }}>{b}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Timer (15 min) ou expirado */}
          {status === 'waiting' ? (
            <div className="flex flex-col items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-semibold"
                style={{ background: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.28)', color: '#FBBF24' }}
              >
                <Clock className="h-3.5 w-3.5" />
                Este Pix expira em <span className="font-mono font-bold">{mm}:{ss}</span> minutos
              </span>
              <p className="text-center text-[11px] leading-relaxed" style={{ color: 'rgba(214,203,250,0.4)' }}>
                Se o pagamento não for identificado em até 15 minutos, um novo será gerado.
              </p>
            </div>
          ) : (
            <button
              onClick={() => createPix()}
              className="mx-auto text-[13px] font-semibold text-white/80 underline underline-offset-2"
            >
              Gerar novo código
            </button>
          )}

          {/* Esperando o pagamento / verificar */}
          {status === 'waiting' && (
            <div className="flex flex-col items-center gap-2">
              <span className="flex items-center gap-2 text-[12.5px]" style={{ color: 'rgba(214,203,250,0.55)' }}>
                <Loader2 className="h-4 w-4 animate-spin" style={{ color: '#C4B5FD' }} />
                Esperando o pagamento…
              </span>
              <button
                onClick={() => void checkStatus()}
                className="text-[12.5px] underline decoration-dotted underline-offset-2 transition-colors hover:text-white/80"
                style={{ color: 'rgba(255,255,255,0.5)' }}
              >
                Já paguei, verificar
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
