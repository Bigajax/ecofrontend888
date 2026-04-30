import { type ReactNode, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetchJson } from '@/lib/apiFetch';
import { trackWithCAPI } from '@/lib/fbpixel';

type PageState = 'loading' | 'approved' | 'pending' | 'claimed';

const CLAIM_MAX_RETRIES = 4;
const CLAIM_RETRY_DELAY_MS = 3000;

function PageShell({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-screen font-primary flex flex-col items-center justify-center px-6 relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #06091A 0%, #0C1226 40%, #0F1A38 100%)' }}
    >
      <div className="pointer-events-none absolute inset-0">
        <div
          style={{
            position: 'absolute',
            top: '10%', left: '50%', transform: 'translateX(-50%)',
            width: '560px', height: '440px', borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(124,58,237,0.16) 0%, transparent 68%)',
            filter: 'blur(70px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '5%', right: '-80px',
            width: '280px', height: '280px', borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(196,181,253,0.06) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
      </div>
      <div className="relative z-10 w-full max-w-sm text-center">
        {children}
      </div>
    </div>
  );
}

function IconRing({ children, glow = false }: { children: ReactNode; glow?: boolean }) {
  return (
    <div
      className="w-20 h-20 mx-auto mb-7 flex items-center justify-center rounded-full"
      style={{
        background: 'linear-gradient(135deg, rgba(167,139,250,0.16) 0%, rgba(124,58,237,0.22) 100%)',
        border: '1px solid rgba(196,181,253,0.30)',
        boxShadow: glow ? '0 0 60px rgba(124,58,237,0.40), 0 0 120px rgba(124,58,237,0.18)' : '0 0 40px rgba(124,58,237,0.22)',
      }}
    >
      {children}
    </div>
  );
}

export default function SonoObrigadoPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const externalRef =
    searchParams.get('external_reference') ||
    sessionStorage.getItem('eco.sono.external_reference') || '';
  const paymentId =
    searchParams.get('payment_id') ||
    sessionStorage.getItem('eco.sono.payment_id') || '';
  const mpStatus =
    searchParams.get('status') ||
    sessionStorage.getItem('eco.sono.status') || '';

  const [pageState, setPageState] = useState<PageState>(
    mpStatus === 'approved' ? 'approved' : mpStatus === 'pending' ? 'pending' : 'loading'
  );
  const [claimError, setClaimError] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [claimRetry, setClaimRetry] = useState(0);
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // Purchase: Pixel + CAPI — fires once per order
  useEffect(() => {
    if (pageState !== 'approved') return;
    const ref = externalRef || paymentId;
    if (!ref) return;
    const dedupeKey = `capi.purchase.sono:${ref}`;
    if (sessionStorage.getItem(dedupeKey)) return;
    sessionStorage.setItem(dedupeKey, '1');
    trackWithCAPI('Purchase', {
      value: 37,
      currency: 'BRL',
      contentIds: ['protocolo_sono_profundo'],
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Loading timeout: if no status after 6s, something went wrong
  useEffect(() => {
    if (pageState !== 'loading') return;
    const t = setTimeout(() => setLoadingTimeout(true), 6000);
    return () => clearTimeout(t);
  }, [pageState]);

  // Persist Mercado Pago params across login redirect
  useEffect(() => {
    if (externalRef) sessionStorage.setItem('eco.sono.external_reference', externalRef);
    if (paymentId) sessionStorage.setItem('eco.sono.payment_id', paymentId);
    if (mpStatus) sessionStorage.setItem('eco.sono.status', mpStatus);
  }, [externalRef, paymentId, mpStatus]);

  const doClaim = async (attempt = 0) => {
    const storedRef = externalRef || sessionStorage.getItem('eco.sono.external_reference') || '';
    const storedPaymentId = paymentId || sessionStorage.getItem('eco.sono.payment_id') || '';
    if (!storedRef && !storedPaymentId) return;

    setClaiming(true);
    setClaimError('');
    setClaimRetry(attempt);

    const result = await apiFetchJson('/api/entitlements/claim', {
      method: 'POST',
      body: JSON.stringify({
        external_reference: storedRef || undefined,
        payment_id: storedPaymentId || undefined,
        email: user?.email,
      }),
    });

    if (result.ok) {
      setClaiming(false);
      setPageState('claimed');
      sessionStorage.removeItem('eco.sono.external_reference');
      sessionStorage.removeItem('eco.sono.payment_id');
      sessionStorage.removeItem('eco.sono.status');
      return;
    }

    // 404 = webhook still processing; retry automatically
    if (result.status === 404 && attempt < CLAIM_MAX_RETRIES) {
      setTimeout(() => doClaim(attempt + 1), CLAIM_RETRY_DELAY_MS);
      return;
    }

    setClaiming(false);
    const data = result.data as { message?: string };
    if (result.status === 409) {
      setClaimError(
        'Este pedido já está associado a outra conta. Entre em contato com ecotopia.app777@gmail.com informando o número do pedido.'
      );
    } else if (result.status === 404) {
      setClaimError('Pagamento ainda sendo confirmado. Aguarde um momento e tente novamente.');
    } else {
      setClaimError(data?.message || 'Erro ao liberar acesso. Tente novamente.');
    }
  };

  // Auto-claim when user is already logged in
  useEffect(() => {
    if (!user || pageState !== 'approved') return;
    doClaim(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, pageState]);

  // Auto-navigate after successful claim
  useEffect(() => {
    if (pageState !== 'claimed') return;
    const t = setTimeout(() => navigate('/app/meditacoes-sono'), 2400);
    return () => clearTimeout(t);
  }, [pageState, navigate]);

  const buildReturnUrl = () => {
    const p = new URLSearchParams();
    const ref = externalRef || sessionStorage.getItem('eco.sono.external_reference') || '';
    const pid = paymentId || sessionStorage.getItem('eco.sono.payment_id') || '';
    const status = mpStatus || sessionStorage.getItem('eco.sono.status') || '';
    if (ref) p.set('external_reference', ref);
    if (pid) p.set('payment_id', pid);
    if (status) p.set('status', status);
    const qs = p.toString();
    const target = `/sono/obrigado${qs ? `?${qs}` : ''}`;
    return `returnTo=${encodeURIComponent(target)}`;
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (pageState === 'loading') {
    if (loadingTimeout) {
      return (
        <PageShell>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
            <IconRing>
              <span style={{ fontSize: '28px' }}>🌙</span>
            </IconRing>
            <h1 className="font-display text-[24px] font-bold text-white mb-3 leading-tight">
              Não conseguimos verificar o pagamento.
            </h1>
            <p className="text-[14px] leading-relaxed mb-6" style={{ color: 'rgba(255,255,255,0.48)' }}>
              Se você acabou de pagar, verifique seu e-mail — enviamos as instruções para você.
            </p>
            <a
              href="mailto:ecotopia.app777@gmail.com"
              className="text-[13px] underline underline-offset-2"
              style={{ color: 'rgba(196,181,253,0.65)' }}
            >
              Precisa de ajuda? Fale com a gente
            </a>
          </motion.div>
        </PageShell>
      );
    }
    return (
      <PageShell>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
          <IconRing>
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#A78BFA' }} />
          </IconRing>
          <p className="text-[15px] font-medium" style={{ color: 'rgba(255,255,255,0.50)' }}>
            Verificando pagamento…
          </p>
        </motion.div>
      </PageShell>
    );
  }

  // ── Pending ──────────────────────────────────────────────────────────────
  if (pageState === 'pending') {
    return (
      <PageShell>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <div
            className="w-20 h-20 mx-auto mb-7 flex items-center justify-center rounded-full"
            style={{
              background: 'rgba(251,191,36,0.10)',
              border: '1px solid rgba(251,191,36,0.24)',
              boxShadow: '0 0 40px rgba(251,191,36,0.14)',
            }}
          >
            <span style={{ fontSize: '32px' }}>⏱</span>
          </div>
          <h1 className="font-display text-[26px] font-bold text-white mb-3 leading-tight">
            Pagamento em análise
          </h1>
          <p className="text-[14px] leading-relaxed mb-7" style={{ color: 'rgba(255,255,255,0.48)' }}>
            Seu pagamento está sendo processado. Você receberá o acesso assim que for confirmado.
          </p>
          <div
            className="rounded-2xl px-4 py-4 text-left"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <p className="text-[11px] break-all" style={{ color: 'rgba(255,255,255,0.32)' }}>
              <span style={{ color: 'rgba(255,255,255,0.42)' }}>Pedido: </span>
              <span className="font-mono">{externalRef || '—'}</span>
            </p>
            <p className="text-[11px] mt-1.5" style={{ color: 'rgba(255,255,255,0.32)' }}>
              Dúvidas?{' '}
              <a
                href="mailto:suporte@ecotopia.com"
                className="underline"
                style={{ color: 'rgba(196,181,253,0.55)' }}
              >
                suporte@ecotopia.com
              </a>
            </p>
          </div>
        </motion.div>
      </PageShell>
    );
  }

  // ── Claimed ───────────────────────────────────────────────────────────────
  if (pageState === 'claimed') {
    return (
      <PageShell>
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 60, damping: 18 }}
        >
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 80, damping: 12, delay: 0.08 }}
          >
            <IconRing glow>
              <span style={{ fontSize: '36px' }}>🌙</span>
            </IconRing>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.18 }}
            className="font-display text-[30px] font-bold text-white mb-3 leading-tight"
          >
            Acesso liberado.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.45, delay: 0.28 }}
            className="text-[15px] leading-relaxed mb-8"
            style={{ color: 'rgba(255,255,255,0.48)' }}
          >
            Seu Protocolo Sono Profundo está pronto.<br />
            Boa primeira noite.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.42 }}
            className="flex items-center justify-center gap-2 text-[13px]"
            style={{ color: 'rgba(196,181,253,0.52)' }}
          >
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Abrindo o protocolo…
          </motion.div>
        </motion.div>
      </PageShell>
    );
  }

  // ── Approved — main conversion state ─────────────────────────────────────
  return (
    <PageShell>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 70, damping: 16, delay: 0.08 }}
        >
          <IconRing>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <path
                d="M6 16L13 23L26 9"
                stroke="#C4B5FD"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </IconRing>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.14 }}
          className="font-display text-[28px] font-bold text-white mb-3 leading-tight"
        >
          Pagamento confirmado.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.22 }}
          className="text-[15px] leading-relaxed mb-8"
          style={{ color: 'rgba(255,255,255,0.48)' }}
        >
          As 7 noites do Protocolo Sono Profundo já estão reservadas para você.
        </motion.p>

        {/* Claiming spinner */}
        {claiming && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center gap-2 mb-6 text-[13px]"
            style={{ color: 'rgba(196,181,253,0.58)' }}
          >
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {claimRetry > 0
              ? `Confirmando pagamento… (tentativa ${claimRetry + 1})`
              : 'Liberando acesso…'}
          </motion.div>
        )}

        {claimError && (
          <p className="text-[13px] text-red-400 mb-4 px-2 leading-snug text-left">
            {claimError}
          </p>
        )}

        {/* Not logged in — show register / login buttons */}
        {!user && !claiming && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.30 }}
            className="space-y-3"
          >
            <p className="text-[13px] font-semibold mb-4" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Crie sua conta gratuita para acessar o protocolo:
            </p>
            <button
              onClick={() => navigate(`/register?${buildReturnUrl()}`)}
              className="w-full rounded-full py-4 text-[15px] font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.97]"
              style={{
                background: 'linear-gradient(135deg, #A78BFA 0%, #5A3DB0 100%)',
                boxShadow: '0 10px 36px rgba(124,58,237,0.50)',
              }}
            >
              Criar conta e acessar
            </button>
            <button
              onClick={() => navigate(`/login?${buildReturnUrl()}`)}
              className="w-full rounded-full py-3.5 text-[14px] font-semibold transition-all hover:border-white/30 active:scale-[0.97]"
              style={{
                border: '1px solid rgba(196,181,253,0.22)',
                background: 'rgba(255,255,255,0.04)',
                color: 'rgba(255,255,255,0.60)',
              }}
            >
              Já tenho conta — Entrar
            </button>
          </motion.div>
        )}

        {/* Logged in + claim error */}
        {user && claimError && !claiming && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => doClaim(0)}
            className="w-full rounded-full py-3.5 text-[14px] font-semibold text-white transition-all hover:scale-[1.01] active:scale-[0.97]"
            style={{
              border: '1px solid rgba(196,181,253,0.25)',
              background: 'rgba(167,139,250,0.10)',
            }}
          >
            Tentar novamente
          </motion.button>
        )}

        {/* Order ref + support fallback */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.45 }}
          className="mt-8 rounded-2xl px-4 py-4 text-left"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.30)' }}>
            <span style={{ color: 'rgba(255,255,255,0.40)' }}>Número do pedido:</span>{' '}
            <span className="font-mono break-all">{externalRef || '—'}</span>
          </p>
          <p className="text-[11px] mt-1.5" style={{ color: 'rgba(255,255,255,0.30)' }}>
            Não consegue acessar? Envie para{' '}
            <a
              href="mailto:suporte@ecotopia.com"
              className="underline"
              style={{ color: 'rgba(196,181,253,0.52)' }}
            >
              suporte@ecotopia.com
            </a>
          </p>
        </motion.div>
      </motion.div>
    </PageShell>
  );
}
