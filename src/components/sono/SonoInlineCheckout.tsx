import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Loader2, Lock, Moon, Sparkles, X } from 'lucide-react';
import { PROTOCOL_NIGHTS } from '@/data/protocolNights';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { OFFER, PRICE } from '@/constants/offerCopy';
import { trackSubscriptionPaid } from '@/lib/mixpanelConversionEvents';
import { trackAssinaturaPaga, registerFunilSono } from '@/lib/mixpanelAssinarFunnel';
import {
  trackSonoGuestOfferViewed,
  trackSonoGuestCheckoutClicked,
  trackSonoGuestOfferDismissed,
  trackSonoGuestAppInviteShown,
  trackSonoGuestAppInviteClicked,
} from '@/lib/mixpanelSonoGuestEvents';
import { trackWithCAPI } from '@/lib/fbpixel';
import {
  useSonoCheckoutState,
  pollSonoSubscriptionActive,
  type SonoCheckoutStep,
} from './useSonoCheckoutState';
import { SonoInlineSignup } from './SonoInlineSignup';
import { SonoInlineCard } from './SonoInlineCard';

/**
 * Orquestrador do checkout inline do funil do sono (modelo C). Substitui o
 * SonoGuestPostFlow: após a Noite 1, conduz reflexão calma → oferta suave →
 * cadastro → cartão → confirmação → desbloqueio, tudo no tema escuro da
 * experiência, sem pular pro /assinar. Roda em modo guest; o convidado só vira
 * conta no passo de cadastro.
 *
 * `onUnlocked` é chamado quando a assinatura é confirmada — o pai destrava as
 * noites 2–7 ali mesmo. `onDismiss` fecha o overlay ("agora não").
 */
interface SonoInlineCheckoutProps {
  /**
   * Passo de abertura solicitado pelo pai (`null` = não abrir). Só é honrado
   * quando o overlay está fechado; uma vez aberto, a navegação interna manda. A
   * restauração pós-remount NÃO depende disto — vem do `?checkout=` na URL.
   */
  openAt: SonoCheckoutStep | null;
  onUnlocked: () => void;
  onDismiss: () => void;
}

type ReflectionAnswer = 'yes' | 'little' | 'no';

const RETURN_TO = '/sono/experiencia?checkout=card';

const NIGHTS_2_7 = PROTOCOL_NIGHTS.slice(1);

const VALIDATION: Record<ReflectionAnswer, { lead: string; body: string }> = {
  yes: {
    lead: 'Que bom.',
    body: 'Seu corpo já respondeu ao primeiro estímulo. Com continuidade, ele aprende a desacelerar sozinho.',
  },
  little: {
    lead: 'Já é um começo.',
    body: 'Primeiro o corpo reduz a resistência. Com repetição, ele desliga com mais facilidade.',
  },
  no: {
    lead: 'Tudo bem.',
    body: 'Na primeira noite o corpo ainda está saindo do padrão antigo. É exatamente assim que começa.',
  },
};

const stepVariants = {
  enter: { opacity: 0, y: 24 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
};

function getGuestId(): string {
  return (
    sessionStorage.getItem('eco.sono.guest_id') ||
    localStorage.getItem('eco_guest_id') ||
    `anon_${Math.random().toString(36).slice(2)}`
  );
}

function getSource(): string {
  return sessionStorage.getItem('eco.sono.source') || 'direct';
}

/** Analytics fire-and-forget no mesmo registro por guest (sono_guest_flow_events). */
async function upsertEvent(patch: Record<string, unknown>) {
  try {
    await supabase
      .from('sono_guest_flow_events')
      .upsert(
        { guest_id: getGuestId(), source: getSource(), ...patch },
        { onConflict: 'guest_id' },
      );
  } catch {
    // analytics — silencia erros
  }
}

export function SonoInlineCheckout({ openAt, onUnlocked, onDismiss }: SonoInlineCheckoutProps) {
  const { user, refreshSubscription } = useAuth();
  const navigate = useNavigate();
  const { step, open, goTo, close } = useSonoCheckoutState();

  const [answer, setAnswer] = useState<ReflectionAnswer | null>(null);
  const [pending, setPending] = useState(false);
  const confirmStartedRef = useRef(false);
  const convertedTrackedRef = useRef(false);
  const funnelSourceRef = useRef(false);
  const appInviteShownRef = useRef(false);
  const offerViewedRef = useRef(false);

  // Ao abrir o checkout, registra funnel_source='sono_experiencia' (super
  // property): os eventos Cadastro/Cartão de mixpanelAssinarFunnel herdam a
  // atribuição do funil da experiência (no /assinar isso vem do registerFunilSono
  // de lá; aqui ele não roda).
  useEffect(() => {
    if (step === null || funnelSourceRef.current) return;
    funnelSourceRef.current = true;
    registerFunilSono('sono_experiencia');
  }, [step]);

  // "Oferta vista" — dispara quando o passo offer aparece, por qualquer caminho
  // (reflexão→oferta ou abertura direta via openAt='offer' vinda da landing).
  useEffect(() => {
    if (step !== 'offer' || offerViewedRef.current) return;
    offerViewedRef.current = true;
    trackSonoGuestOfferViewed();
  }, [step]);

  // "Convite app exibido" — ponte pro app quando o free autenticado desiste.
  useEffect(() => {
    if (step !== 'app_invite' || appInviteShownRef.current) return;
    appInviteShownRef.current = true;
    trackSonoGuestAppInviteShown();
  }, [step]);

  // Abre no passo solicitado pelo pai quando ainda não há estado restaurado da
  // URL/sessionStorage. Após aberto, a navegação interna assume.
  useEffect(() => {
    if (openAt && step === null) open(openAt);
  }, [openAt, step, open]);

  // Remount pós-cadastro: se a sessão chegou enquanto estávamos no signup, avança
  // pro cartão (o overlay é restaurado via ?checkout=, mas a corrida do SIGNED_IN
  // pode nos deixar em 'signup' com user já presente).
  useEffect(() => {
    if (user && step === 'signup') goTo('card');
  }, [user, step, goTo]);

  // Confirmação assíncrona do webhook ao entrar em 'confirming'.
  useEffect(() => {
    if (step !== 'confirming' || confirmStartedRef.current) return;
    confirmStartedRef.current = true;
    setPending(false);
    let cancelled = false;
    (async () => {
      const ok = await pollSonoSubscriptionActive(refreshSubscription);
      if (cancelled) return;
      if (ok) {
        void upsertEvent({ unlocked: true });
        goTo('unlocked');
      } else {
        setPending(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step, refreshSubscription, goTo]);

  // Conversão (uma vez) ao destravar — espelha o que o SubscriptionCallbackPage
  // dispara, para o funil fechar mesmo sem passar pela tela azul de callback.
  useEffect(() => {
    if (step !== 'unlocked' || convertedTrackedRef.current) return;
    convertedTrackedRef.current = true;
    trackSubscriptionPaid({
      plan_id: 'monthly',
      mp_status: 'active',
      transaction_amount: PRICE.monthly,
      provider: 'mercadopago',
      user_id: user?.id,
      source: 'sono_inline_checkout',
    });
    trackAssinaturaPaga({ plan_id: 'monthly', amount: PRICE.monthly });
    void trackWithCAPI('Subscribe', {
      value: PRICE.monthly,
      currency: PRICE.currency,
      contentName: 'ECO Premium',
      contentCategory: 'subscription',
      pixelExtra: { plan: 'monthly' },
    });
  }, [step, user?.id]);

  // Identidade ESTÁVEL: passado pro SonoInlineCard → handleToken (useCallback).
  // Sem isso, um arrow inline aqui muda a cada render, desestabiliza o handleToken
  // e o MpCardForm (React.memo) recria o brick do MP — Secure Fields falham e o
  // cartão renderiza em branco. Ver mp-brick-nao-tolera-rerender.
  const handleCardPaid = useCallback(() => goTo('confirming'), [goTo]);

  const selectAnswer = (a: ReflectionAnswer) => {
    setAnswer(a);
    void upsertEvent({ reflection_answer: a, max_step_reached: 'reflection' });
  };

  const goToOffer = () => {
    goTo('offer');
    void upsertEvent({ reached_offer: true, max_step_reached: 'offer' });
  };

  const startCheckout = () => {
    void upsertEvent({ cta_clicked: true });
    trackSonoGuestCheckoutClicked();
    goTo(user ? 'card' : 'signup');
  };

  const handleDismiss = () => {
    trackSonoGuestOfferDismissed();
    // Free autenticado (criou conta mas não pagou) → ponte leve pro app em vez de
    // só fechar. Guest sem conta → fecha (comportamento original).
    if (user) {
      goTo('app_invite');
      return;
    }
    close();
    onDismiss();
  };

  // "Ficar no sono" — fecha o overlay e mantém a /sono/experiencia (Noite 1).
  const handleStayInSono = () => {
    close();
    onDismiss();
  };

  // "Explorar o app" — leva o free pro app completo; a 2ª conversão acontece lá
  // pelos gates/UpgradeModal existentes.
  const handleExploreApp = () => {
    trackSonoGuestAppInviteClicked();
    navigate('/app');
  };

  const handleUnlocked = () => {
    close();
    onUnlocked();
  };

  // Overlay fechado — nada a renderizar.
  if (step === null) return null;

  // Fechar disponível só nos passos "frios" — não no meio da confirmação/sucesso.
  const canClose = step === 'reflection' || step === 'offer' || step === 'signup';
  const validation = answer ? VALIDATION[answer] : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-[9998] flex flex-col"
      style={{ background: 'linear-gradient(180deg, #04060F 0%, #080C1E 100%)' }}
    >
      {/* Glow violeta ambiente */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[12%] -translate-x-1/2"
        style={{
          width: '320px',
          height: '220px',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(124,58,237,0.18) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      {/* Top bar */}
      <div className="relative z-10 flex flex-shrink-0 items-center justify-end px-6 pt-10 pb-2">
        {canClose && (
          <button
            onClick={handleDismiss}
            className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}
            aria-label="Fechar"
          >
            <X className="h-3.5 w-3.5" style={{ color: 'rgba(255,255,255,0.40)' }} />
          </button>
        )}
      </div>

      {/* Conteúdo. `my-auto` (não justify-center no pai) centraliza quando cabe e
          permite rolar quando o passo transborda — sem isso o cartão trava o scroll. */}
      <div className="relative z-10 flex flex-1 flex-col items-center overflow-y-auto px-6 pb-12">
        <div className="my-auto flex w-full max-w-[340px] flex-col py-4">
          <AnimatePresence mode="wait">

            {/* ── reflection (pergunta + validação numa só batida) ── */}
            {step === 'reflection' && (
              <motion.div
                key="reflection"
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                className="flex flex-col items-center text-center"
              >
                <p
                  className="mb-7 text-[11px] font-bold uppercase tracking-[0.22em]"
                  style={{ color: 'rgba(196,181,253,0.5)' }}
                >
                  Noite 1 · concluída
                </p>

                {!validation ? (
                  <>
                    <h2
                      className="mb-9 font-display text-[25px] font-bold leading-snug text-white"
                      style={{ textShadow: '0 2px 20px rgba(0,0,0,0.6)' }}
                    >
                      Você sentiu
                      <br />
                      <em style={{ color: '#C4B5FD', fontStyle: 'italic' }}>alguma diferença?</em>
                    </h2>
                    <div className="flex w-full flex-col gap-3">
                      <button
                        onClick={() => selectAnswer('yes')}
                        className="w-full rounded-full py-3.5 text-[14px] font-bold text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.97]"
                        style={{
                          background: 'linear-gradient(135deg, #A78BFA 0%, #6D42C9 100%)',
                          boxShadow: '0 8px 28px rgba(107,79,187,0.4)',
                        }}
                      >
                        Sim, relaxei
                      </button>
                      <button
                        onClick={() => selectAnswer('little')}
                        className="w-full rounded-full py-3.5 text-[14px] font-semibold text-white/80 transition-all duration-200 hover:scale-[1.02] active:scale-[0.97]"
                        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)' }}
                      >
                        Um pouco
                      </button>
                      <button
                        onClick={() => selectAnswer('no')}
                        className="w-full py-3 text-[13px] text-white/45 transition-colors hover:text-white/65"
                      >
                        Ainda estou agitado
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.08, duration: 0.5 }}
                      className="mb-4 font-display text-[38px] font-bold leading-none text-white"
                      style={{ textShadow: '0 2px 24px rgba(0,0,0,0.7)' }}
                    >
                      {validation.lead}
                    </motion.p>
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.24, duration: 0.5 }}
                      className="mb-12 text-[16px] leading-relaxed text-white/55"
                    >
                      {validation.body}
                    </motion.p>
                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.44 }}
                      onClick={goToOffer}
                      className="w-full rounded-full py-3.5 text-[14px] font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.97]"
                      style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.16)' }}
                    >
                      Ver minhas próximas noites →
                    </motion.button>
                  </>
                )}
              </motion.div>
            )}

            {/* ── offer (suave, sem timer) ── */}
            {step === 'offer' && (
              <motion.div
                key="offer"
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                className="flex flex-col items-center text-center"
              >
                <h2
                  className="mb-2 font-display text-[24px] font-bold leading-snug text-white"
                  style={{ textShadow: '0 2px 18px rgba(0,0,0,0.6)' }}
                >
                  Tem mais 6 noites
                  <br />
                  <span style={{ color: '#C4B5FD' }}>te esperando.</span>
                </h2>
                <p className="mb-6 text-[14px] leading-snug text-white/45">
                  Cada uma solta uma camada diferente do sono.
                </p>

                {/* Preview calmo das próximas noites — com miniatura de cada noite.
                    A primeira (próxima a destravar) ganha um leve realce. */}
                <div className="mb-7 w-full space-y-2">
                  {NIGHTS_2_7.map((night, idx) => {
                    const isNext = idx === 0;
                    return (
                      <div
                        key={night.id}
                        className="flex items-center gap-3 overflow-hidden rounded-2xl pr-3"
                        style={{
                          background: isNext ? 'rgba(167,139,250,0.10)' : 'rgba(255,255,255,0.04)',
                          border: isNext
                            ? '1px solid rgba(167,139,250,0.24)'
                            : '1px solid rgba(255,255,255,0.07)',
                        }}
                      >
                        <div className="relative h-[46px] w-[46px] flex-shrink-0 overflow-hidden">
                          {night.imageUrl ? (
                            <img
                              src={night.imageUrl}
                              alt=""
                              className="h-full w-full object-cover"
                              loading="lazy"
                              style={{
                                filter: isNext
                                  ? 'brightness(0.62) saturate(0.85)'
                                  : 'brightness(0.42) saturate(0.6)',
                              }}
                            />
                          ) : (
                            <div className="h-full w-full" style={{ background: night.gradient }} />
                          )}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Lock
                              className="h-3 w-3"
                              style={{ color: isNext ? 'rgba(196,181,253,0.85)' : 'rgba(255,255,255,0.45)' }}
                            />
                          </div>
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col py-2 text-left">
                          <span
                            className="text-[9.5px] font-bold uppercase tracking-[0.14em]"
                            style={{ color: isNext ? 'rgba(196,181,253,0.7)' : 'rgba(196,181,253,0.45)' }}
                          >
                            Noite {night.night}
                          </span>
                          <span
                            className="truncate text-[12.5px] leading-tight"
                            style={{ color: isNext ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.6)' }}
                          >
                            {night.title}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Oferta — copy canônica, sem urgência */}
                <p className="font-display text-[19px] font-bold text-white">{OFFER.trial}</p>
                <p className="mb-3 text-[13px] text-white/40">
                  Depois {OFFER.priceMonthly} · {OFFER.cancelAnytime}
                </p>
                <div className="mb-7 flex items-center justify-center gap-2">
                  <span style={{ color: '#FBBF24', fontSize: '11px', letterSpacing: '1px' }}>★★★★★</span>
                  <span className="text-[11px] text-white/35">4,9 · 846 pessoas dormem melhor</span>
                </div>

                <button
                  onClick={startCheckout}
                  className="mb-3 w-full rounded-full py-4 text-[15px] font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg, #A78BFA 0%, #5A3DB0 100%)',
                    boxShadow: '0 10px 36px rgba(124,58,237,0.5)',
                  }}
                >
                  Continuar minhas noites
                </button>
                <button
                  onClick={handleDismiss}
                  className="text-[12px] transition-colors"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                >
                  Agora não
                </button>
              </motion.div>
            )}

            {/* ── signup (inline, tema escuro) ── */}
            {step === 'signup' && (
              <motion.div
                key="signup"
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                className="flex w-full flex-col"
              >
                <SonoInlineSignup onCreated={() => goTo('card')} returnTo={RETURN_TO} />
              </motion.div>
            )}

            {/* ── card (inline) ── */}
            {step === 'card' && (
              <motion.div
                key="card"
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                className="flex w-full flex-col"
              >
                <SonoInlineCard payerEmail={user?.email ?? ''} onPaid={handleCardPaid} />
              </motion.div>
            )}

            {/* ── confirming / pending ── */}
            {step === 'confirming' && (
              <motion.div
                key="confirming"
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                className="flex flex-col items-center text-center"
              >
                {!pending ? (
                  <>
                    <Loader2 className="mb-6 h-9 w-9 animate-spin" style={{ color: '#C4B5FD' }} />
                    <h2 className="font-display text-[22px] font-bold text-white">
                      Preparando suas noites…
                    </h2>
                    <p className="mt-2 text-[14px] leading-snug text-white/45">
                      Um instante enquanto confirmamos seu acesso.
                    </p>
                  </>
                ) : (
                  <>
                    <Moon className="mb-6 h-9 w-9" style={{ color: 'rgba(196,181,253,0.7)' }} />
                    <h2 className="font-display text-[22px] font-bold text-white">
                      Quase lá.
                    </h2>
                    <p className="mt-2 mb-7 text-[14px] leading-relaxed text-white/45">
                      Estamos confirmando seu pagamento — pode levar alguns minutos. Avisamos
                      por e-mail assim que liberar.
                    </p>
                    <button
                      onClick={handleUnlocked}
                      className="w-full rounded-full py-3.5 text-[14px] font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.97]"
                      style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.16)' }}
                    >
                      Continuar
                    </button>
                  </>
                )}
              </motion.div>
            )}

            {/* ── unlocked (sucesso sereno) ── */}
            {step === 'unlocked' && (
              <motion.div
                key="unlocked"
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                className="flex flex-col items-center text-center"
              >
                <motion.div
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 80, damping: 16 }}
                  className="mb-6"
                >
                  <Moon className="h-12 w-12" style={{ color: '#C4B5FD' }} />
                </motion.div>
                <h2
                  className="font-display text-[24px] font-bold leading-snug text-white"
                  style={{ textShadow: '0 2px 20px rgba(0,0,0,0.6)' }}
                >
                  Suas 7 noites estão
                  <br />
                  <span style={{ color: '#C4B5FD' }}>liberadas.</span>
                </h2>
                <p className="mb-9 mt-3 text-[15px] leading-relaxed text-white/50">
                  Descanse. Elas estarão aqui sempre que você precisar.
                </p>
                <button
                  onClick={handleUnlocked}
                  className="w-full rounded-full py-4 text-[15px] font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg, #A78BFA 0%, #5A3DB0 100%)',
                    boxShadow: '0 10px 36px rgba(124,58,237,0.5)',
                  }}
                >
                  Boa noite
                </button>
              </motion.div>
            )}

            {/* ── app_invite (ponte leve pro app — free que não pagou) ── */}
            {step === 'app_invite' && (
              <motion.div
                key="app_invite"
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                className="flex flex-col items-center text-center"
              >
                <motion.div
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 80, damping: 16 }}
                  className="mb-6"
                >
                  <Sparkles className="h-11 w-11" style={{ color: '#C4B5FD' }} />
                </motion.div>
                <h2
                  className="font-display text-[23px] font-bold leading-snug text-white"
                  style={{ textShadow: '0 2px 20px rgba(0,0,0,0.6)' }}
                >
                  Sua conta está pronta.
                  <br />
                  <span style={{ color: '#C4B5FD' }}>Tem muito mais te esperando.</span>
                </h2>
                <p className="mb-8 mt-3 text-[15px] leading-relaxed text-white/50">
                  Você começou pelo sono. No app tem programas, meditações, respirações
                  e a Eco — tudo num lugar só.
                </p>
                <button
                  onClick={handleExploreApp}
                  className="mb-3 flex w-full items-center justify-center gap-2 rounded-full py-4 text-[15px] font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg, #A78BFA 0%, #5A3DB0 100%)',
                    boxShadow: '0 10px 36px rgba(124,58,237,0.5)',
                  }}
                >
                  Explorar o app
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={handleStayInSono}
                  className="text-[12px] transition-colors"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                >
                  Ficar no sono
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

/** Re-export do tipo para conveniência dos consumidores. */
export type { SonoCheckoutStep };
