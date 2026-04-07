import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetchJson } from '@/lib/apiFetch';
import { trackWithCAPI } from '@/lib/fbpixel';
import mixpanel from '@/lib/mixpanel';

// ─── Constantes ──────────────────────────────────────────────────────────────

const SINTONIZE_MEDITATION = {
  id: 'blessing_2',
  title: 'Sintonize Novos Potenciais',
  duration: '7 min',
  audioUrl: '/audio/sintonizar-novos-potenciais.mp3',
  imageUrl: '/images/meditacao-novos-potenciais.webp',
  backgroundMusic: 'Cristais',
  gradient:
    'linear-gradient(to bottom, #4A7FCC 0%, #3D6BB8 20%, #3358A3 40%, #2A478E 60%, #213779 80%, #182864 100%)',
  category: 'dr_joe_dispenza',
} as const;

const CLAIM_MAX_RETRIES = 4;
const CLAIM_RETRY_DELAY_MS = 3000;

type PageState = 'loading' | 'approved' | 'pending' | 'error' | 'claimed';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (d = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const, delay: d },
  }),
};

// ─── Componente ──────────────────────────────────────────────────────────────

export default function DrJoeObrigadoPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, register } = useAuth();

  const externalRef =
    searchParams.get('external_reference') ||
    sessionStorage.getItem('eco.drjoe.external_reference') ||
    '';
  const paymentId =
    searchParams.get('payment_id') ||
    sessionStorage.getItem('eco.drjoe.payment_id') ||
    '';
  const mpStatus =
    searchParams.get('status') ||
    sessionStorage.getItem('eco.drjoe.status') ||
    '';
  const emailFromUrl = searchParams.get('email') || '';

  const [pageState, setPageState] = useState<PageState>(
    mpStatus === 'approved'
      ? 'approved'
      : mpStatus === 'pending'
      ? 'pending'
      : 'loading',
  );

  // Signup form
  const [email, setEmail] = useState(emailFromUrl);
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  // Claim state
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState('');
  const [claimRetry, setClaimRetry] = useState(0);

  // Loading timeout safety
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // Prevent double-claim
  const claimStartedRef = useRef(false);

  // ── Persistir params no sessionStorage ──────────────────────────────────
  useEffect(() => {
    if (externalRef) sessionStorage.setItem('eco.drjoe.external_reference', externalRef);
    if (paymentId) sessionStorage.setItem('eco.drjoe.payment_id', paymentId);
    if (mpStatus) sessionStorage.setItem('eco.drjoe.status', mpStatus);
  }, [externalRef, paymentId, mpStatus]);

  // ── Tracking + Pixel (uma vez por pedido) ────────────────────────────────
  useEffect(() => {
    if (pageState !== 'approved') return;

    const ref = externalRef || paymentId;
    if (!ref) return;

    const dedupeKey = `capi.purchase.drjoe:${ref}`;
    if (sessionStorage.getItem(dedupeKey)) return;
    sessionStorage.setItem(dedupeKey, '1');

    trackWithCAPI('Purchase', {
      value: 37,
      currency: 'BRL',
      contentIds: ['dr_joe_dispenza_colecao'],
    }).catch(() => {});

    mixpanel.track('Purchase Completed', {
      produto: 'dr_joe_colecao',
      valor: 37,
      external_reference: ref,
      timestamp: new Date().toISOString(),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Safety timeout ────────────────────────────────────────────────────────
  useEffect(() => {
    if (pageState !== 'loading') return;
    const t = setTimeout(() => setLoadingTimeout(true), 6000);
    return () => clearTimeout(t);
  }, [pageState]);

  // ── Claim de acesso ───────────────────────────────────────────────────────
  const doClaim = async (attempt = 0) => {
    const storedRef =
      externalRef || sessionStorage.getItem('eco.drjoe.external_reference') || '';
    const storedPaymentId =
      paymentId || sessionStorage.getItem('eco.drjoe.payment_id') || '';

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
        produto: 'dr_joe_colecao',
      }),
    });

    if (result.ok) {
      setClaiming(false);
      setPageState('claimed');
      sessionStorage.removeItem('eco.drjoe.external_reference');
      sessionStorage.removeItem('eco.drjoe.payment_id');
      sessionStorage.removeItem('eco.drjoe.status');
      return;
    }

    if (result.status === 404 && attempt < CLAIM_MAX_RETRIES) {
      setTimeout(() => doClaim(attempt + 1), CLAIM_RETRY_DELAY_MS);
      return;
    }

    setClaiming(false);
    const data = result.data as { message?: string } | null;
    if (result.status === 409) {
      setClaimError(
        'Este pedido já está associado a outra conta. Fale com ecotopia.app777@gmail.com.',
      );
    } else if (result.status === 404) {
      setClaimError('Pagamento ainda sendo confirmado. Aguarde um momento e tente novamente.');
    } else {
      setClaimError(data?.message || 'Erro ao liberar acesso. Tente novamente.');
    }
  };

  // Auto-claim quando usuário já está logado e pagamento aprovado
  useEffect(() => {
    if (!user || pageState !== 'approved' || claimStartedRef.current) return;
    claimStartedRef.current = true;
    doClaim(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, pageState]);

  // Auto-navegar para meditação após claim
  useEffect(() => {
    if (pageState !== 'claimed') return;
    const t = setTimeout(
      () =>
        navigate('/app/meditation-player', {
          state: { meditation: { ...SINTONIZE_MEDITATION } },
        }),
      1800,
    );
    return () => clearTimeout(t);
  }, [pageState, navigate]);

  // ── Signup inline pós-pagamento ───────────────────────────────────────────
  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');

    if (password.length < 6) {
      setFormError('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }

    setIsSubmitting(true);
    mixpanel.track('Post Purchase Signup Started', {
      produto: 'dr_joe_colecao',
      email,
      timestamp: new Date().toISOString(),
    });

    try {
      const nome = email.split('@')[0];
      const result = await register(email, password, nome, '');

      mixpanel.track('Post Purchase Signup Completed', {
        produto: 'dr_joe_colecao',
        needs_confirmation: result.needsConfirmation,
        timestamp: new Date().toISOString(),
      });

      if (result.needsConfirmation) {
        setNeedsConfirmation(true);
      }
      // Após signup bem-sucedido, o useEffect de claim vai disparar via 'user' atualizado
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Erro ao criar conta. Tente novamente.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (pageState === 'loading') {
    if (loadingTimeout) {
      return (
        <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#070A12] px-6 text-center">
          <p className="text-base text-white/70 font-medium mb-2">
            Não foi possível verificar o pagamento.
          </p>
          <p className="mt-2 text-sm text-white/40 leading-relaxed mb-6">
            Se você acabou de pagar, verifique seu e-mail — enviamos as instruções de acesso.
          </p>
          <a
            href="mailto:ecotopia.app777@gmail.com"
            className="text-sm text-eco-baby underline underline-offset-2"
          >
            Precisa de ajuda? Fale com a gente
          </a>
        </div>
      );
    }
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#070A12]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-eco-baby" />
          <p className="text-sm text-white/40">Verificando pagamento…</p>
        </div>
      </div>
    );
  }

  // ─── Pending ──────────────────────────────────────────────────────────────

  if (pageState === 'pending') {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#070A12] px-6 text-center">
        <div className="max-w-sm w-full">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-amber-400/25 bg-amber-400/10">
            <svg className="h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-bold text-white mb-3">
            Pagamento em análise
          </h1>
          <p className="text-sm text-white/50 leading-relaxed mb-6">
            Seu pagamento está sendo processado. Você receberá o acesso assim que for confirmado.
          </p>
          <p className="text-xs text-white/25 font-mono">{externalRef || '—'}</p>
          <p className="mt-3 text-xs text-white/30">
            Dúvidas?{' '}
            <a href="mailto:ecotopia.app777@gmail.com" className="underline text-eco-baby/70">
              ecotopia.app777@gmail.com
            </a>
          </p>
        </div>
      </div>
    );
  }

  // ─── Claimed ─────────────────────────────────────────────────────────────

  if (pageState === 'claimed') {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#070A12] px-6 text-center">
        <div className="max-w-sm w-full">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-eco-baby/30 bg-eco-baby/10"
            style={{ boxShadow: '0 0 0 12px rgba(110,200,255,0.05), 0 0 0 28px rgba(59,130,246,0.03)' }}
          >
            <svg className="h-7 w-7 text-eco-baby" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="font-display text-2xl font-bold text-white mb-3"
          >
            Acesso liberado!
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-sm text-white/50 leading-relaxed mb-6"
          >
            As meditações Dr. Joe Dispenza estão prontas para você.
          </motion.p>
          <div className="flex items-center justify-center gap-2 text-sm text-white/30">
            <Loader2 className="h-4 w-4 animate-spin text-eco-baby/60" />
            Abrindo sua meditação…
          </div>
        </div>
      </div>
    );
  }

  // ─── Approved — aguardando claim / signup ────────────────────────────────

  return (
    <div className="relative min-h-[100dvh] bg-[#070A12] font-primary">

      {/* Background glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: [
            'radial-gradient(ellipse 700px 460px at 55% -5%, rgba(110,200,255,0.10) 0%, transparent 65%)',
            'radial-gradient(ellipse 400px 300px at 10% 90%, rgba(59,130,246,0.06) 0%, transparent 60%)',
            'linear-gradient(175deg, #070A12 0%, #0B1220 55%, #080C18 100%)',
          ].join(', '),
        }}
      />

      <main className="relative z-10 mx-auto flex min-h-[100dvh] max-w-[480px] flex-col justify-center px-6 py-14">

        {/* Ícone de sucesso */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-full border border-eco-baby/25 bg-eco-baby/10"
          style={{ boxShadow: '0 0 0 12px rgba(110,200,255,0.05), 0 0 0 28px rgba(59,130,246,0.03)' }}
        >
          <svg className="h-7 w-7 text-eco-baby" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </motion.div>

        <motion.h1
          variants={fadeUp} initial="hidden" animate="visible" custom={0.1}
          className="font-display text-center text-[1.75rem] font-bold leading-[1.25] text-white sm:text-[2.1rem]"
        >
          Pagamento confirmado!
        </motion.h1>

        <motion.p
          variants={fadeUp} initial="hidden" animate="visible" custom={0.2}
          className="mt-4 text-center text-[0.9375rem] leading-[1.7] text-white/50"
        >
          As meditações Dr. Joe Dispenza estão desbloqueadas para você.
        </motion.p>

        {/* Claim progress (usuário logado) */}
        {user && claiming && (
          <motion.div
            variants={fadeUp} initial="hidden" animate="visible" custom={0.3}
            className="mt-8 flex items-center justify-center gap-2.5"
          >
            <Loader2 className="h-4 w-4 animate-spin text-eco-baby/70" />
            <span className="text-sm text-white/40">
              {claimRetry > 0
                ? `Confirmando pagamento… (tentativa ${claimRetry + 1})`
                : 'Liberando acesso…'}
            </span>
          </motion.div>
        )}

        {claimError && (
          <motion.div
            variants={fadeUp} initial="hidden" animate="visible" custom={0.3}
            className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4"
          >
            <p className="text-sm text-red-400/90 text-center">{claimError}</p>
            {user && (
              <button
                onClick={() => doClaim(0)}
                disabled={claiming}
                className="mt-3 w-full rounded-full border border-white/10 py-2.5 text-sm font-semibold text-white/60 hover:text-white/80 transition-colors disabled:opacity-50"
              >
                Tentar novamente
              </button>
            )}
          </motion.div>
        )}

        {/* Usuário NÃO logado → quick signup */}
        {!user && (
          <motion.div
            variants={fadeUp} initial="hidden" animate="visible" custom={0.3}
            className="mt-8"
          >
            {needsConfirmation ? (
              /* Confirmação de e-mail */
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-eco-baby/25 bg-eco-baby/10">
                  <svg className="h-5 w-5 text-eco-baby" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-base font-semibold text-white/90">Confirme seu e-mail</p>
                <p className="mt-2 text-sm text-white/45">
                  Enviamos um link para{' '}
                  <span className="text-white/70">{email}</span>.
                  Clique nele para ativar sua conta e acessar as meditações.
                </p>
              </div>
            ) : (
              <>
                {/* Card de contexto */}
                <div className="mb-5 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-5 py-4">
                  <p className="text-[0.875rem] leading-[1.6] text-white/65 italic">
                    "Crie sua senha para acessar as meditações — leva menos de 30 segundos."
                  </p>
                </div>

                <form onSubmit={handleSignup} noValidate className="space-y-3">
                  <input
                    type="email"
                    required
                    placeholder="Seu e-mail"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setFormError(''); }}
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3.5 text-sm text-white/90 placeholder:text-white/30 focus:border-eco-baby/40 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-eco-baby/15"
                  />
                  <input
                    type="password"
                    required
                    placeholder="Crie uma senha (mín. 6 caracteres)"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setFormError(''); }}
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3.5 text-sm text-white/90 placeholder:text-white/30 focus:border-eco-baby/40 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-eco-baby/15"
                  />

                  {formError && (
                    <p className="text-xs text-red-400/80">{formError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting || !email || !password}
                    className="w-full rounded-full py-[15px] text-[0.9375rem] font-bold text-white transition-all duration-200 hover:brightness-110 hover:scale-[1.015] active:scale-[0.98] disabled:opacity-50"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(110,200,255,0.96) 0%, rgba(59,130,246,0.96) 52%, rgba(30,58,138,0.96) 100%)',
                      boxShadow: '0 14px 40px rgba(110,200,255,0.16)',
                    }}
                  >
                    {isSubmitting ? 'Criando conta…' : 'Acessar minhas meditações'}
                  </button>
                </form>

                <p className="mt-4 text-center text-xs text-white/25">
                  Já tem conta?{' '}
                  <button
                    onClick={() =>
                      navigate(
                        `/login?returnTo=${encodeURIComponent('/dr-joe/obrigado?' + new URLSearchParams({ status: mpStatus, external_reference: externalRef, payment_id: paymentId }).toString())}`,
                      )
                    }
                    className="underline underline-offset-2 hover:text-white/45 transition-colors"
                  >
                    Entrar
                  </button>
                </p>
              </>
            )}
          </motion.div>
        )}

        {/* Referência do pedido */}
        {externalRef && (
          <motion.p
            variants={fadeUp} initial="hidden" animate="visible" custom={0.5}
            className="mt-10 text-center text-[11px] text-white/20 font-mono"
          >
            Pedido: {externalRef}
          </motion.p>
        )}

      </main>
    </div>
  );
}
