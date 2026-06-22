import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Lock, Moon, Sparkles, X } from 'lucide-react';
import { PROTOCOL_NIGHTS } from '@/data/protocolNights';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { apiUrl } from '@/config/apiBase';
import { registerFunilSono } from '@/lib/mixpanelAssinarFunnel';
import {
  trackSonoGuestOfferViewed,
  trackSonoGuestCheckoutClicked,
  trackSonoGuestOfferDismissed,
  trackSonoGuestAppInviteShown,
  trackSonoGuestAppInviteClicked,
  trackSonoGuestPostNight1Response,
} from '@/lib/mixpanelSonoGuestEvents';
import mixpanel from '@/lib/mixpanel';
import { trackWithCAPI } from '@/lib/fbpixel';
import { getSonoGuestId } from '@/lib/sonoGuestId';
import { useSonoCheckoutState, type SonoCheckoutStep } from './useSonoCheckoutState';
import { SonoInlineSignup } from './SonoInlineSignup';
import { SonoInlinePix } from './SonoInlinePix';
import { readSonoLifetime } from './sonoLifetime';

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

const RETURN_TO = '/sono/experiencia?checkout=save_account';

/** Preço de fallback (exibição) caso o /config do backend não responda. */
const FALLBACK_SONO_PRICE = 37;

function priceLabel(price: number): string {
  return Number.isInteger(price) ? `R$${price}` : `R$${price.toFixed(2).replace('.', ',')}`;
}

const NIGHTS_2_7 = PROTOCOL_NIGHTS.slice(1);

/** Mapa das chaves internas (estáveis, gravadas em sono_guest_flow_events) para o
 *  valor legível enviado ao Mixpanel na "Resposta pós-noite 1". */
const RESPONSE_KEY: Record<ReflectionAnswer, 'mais_leve' | 'um_pouco_mais_calmo' | 'ainda_acelerado'> = {
  yes: 'mais_leve',
  little: 'um_pouco_mais_calmo',
  no: 'ainda_acelerado',
};

const VALIDATION: Record<ReflectionAnswer, { lead: string; body: string }> = {
  yes: {
    lead: 'Ótimo.',
    body: 'Esse é o primeiro sinal de que seu corpo respondeu ao estímulo. Agora a sequência continua para tornar esse estado mais fácil de acessar na hora de dormir.',
  },
  little: {
    lead: 'Perfeito.',
    body: 'No começo, pequenas mudanças já importam. Seu corpo começou a sair do estado de alerta. As próximas noites repetem esse caminho em camadas.',
  },
  no: {
    lead: 'Tudo bem.',
    body: 'Quando a mente está muito ativa, o corpo não precisa de força. Precisa de repetição. As próximas noites foram criadas exatamente para conduzir esse desacelerar passo a passo.',
  },
};

const stepVariants = {
  enter: { opacity: 0, y: 24 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
};

function getGuestId(): string {
  // Fonte ÚNICA — o mesmo id atravessa eventos → pagamento → entitlement → /check.
  return getSonoGuestId();
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
  const { user } = useAuth();
  const navigate = useNavigate();
  const { step, open, goTo, close } = useSonoCheckoutState();

  const [answer, setAnswer] = useState<ReflectionAnswer | null>(null);
  const [price, setPrice] = useState<number>(FALLBACK_SONO_PRICE);
  const convertedTrackedRef = useRef(false);
  const funnelSourceRef = useRef(false);
  const appInviteShownRef = useRef(false);
  const offerViewedRef = useRef(false);

  // Preço do Pix vem do backend (env), pra mudar sem rebuild do front. Buscado uma
  // vez quando o overlay abre; cai no fallback se o /config falhar.
  useEffect(() => {
    if (step === null) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(apiUrl('/api/payments/sono-pix/config'));
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && typeof data?.price === 'number') setPrice(data.price);
      } catch {
        /* mantém fallback */
      }
    })();
    return () => { cancelled = true; };
  }, [step]);

  // Ao abrir o checkout, registra funnel_source='sono_experiencia' (super
  // property): os eventos Cadastro/Cartão de mixpanelAssinarFunnel herdam a
  // atribuição do funil da experiência (no /assinar isso vem do registerFunilSono
  // de lá; aqui ele não roda).
  useEffect(() => {
    if (step === null || funnelSourceRef.current) return;
    funnelSourceRef.current = true;
    registerFunilSono('sono_experiencia');
    // Versão das telas/copy como super properties: todos os eventos do funil
    // passam a carregar a versão, permitindo comparar variações sem tocar em cada
    // track. Bumpar estes valores ao iterar a copy.
    mixpanel.register({
      post_meditation_version: 'v2_continuidade',
      offer_version: 'v2_camadas',
      checkout_version: 'trial_r0_copy_v2',
    });
  }, [step]);

  // "Oferta vista" — dispara quando o passo offer aparece, por qualquer caminho
  // (reflexão→oferta ou abertura direta via openAt='offer' vinda da landing).
  useEffect(() => {
    if (step !== 'offer' || offerViewedRef.current) return;
    offerViewedRef.current = true;
    trackSonoGuestOfferViewed({ source: getSource(), guestId: getGuestId() });
    // Meta Pixel + CAPI: oferta das 7 noites exibida.
    void trackWithCAPI('ViewContent', {
      contentName: 'Oferta 7 Noites',
      contentCategory: 'sono',
    });
  }, [step]);

  // "Convite app exibido" — ponte pro app quando o free autenticado desiste.
  useEffect(() => {
    if (step !== 'app_invite' || appInviteShownRef.current) return;
    appInviteShownRef.current = true;
    trackSonoGuestAppInviteShown({ source: getSource(), guestId: getGuestId() });
  }, [step]);

  // Abre no passo solicitado pelo pai quando ainda não há estado restaurado da
  // URL/sessionStorage. Após aberto, a navegação interna assume.
  useEffect(() => {
    if (openAt && step === null) open(openAt);
  }, [openAt, step, open]);

  // Conversão (uma vez) ao destravar — fecha o funil no Mixpanel. Pagamento ÚNICO
  // (não-assinatura), por isso evento dedicado em vez dos helpers de subscription.
  // O Purchase do Meta sai no SonoInlinePix (client) + no webhook (server, principal).
  useEffect(() => {
    if (step !== 'unlocked' || convertedTrackedRef.current) return;
    convertedTrackedRef.current = true;
    mixpanel.track('Funil Sono · Pix aprovado', {
      product: 'protocolo_sono_7_noites',
      amount: price,
      provider: 'mercadopago',
      payment_type: 'pix_lifetime',
      user_id: user?.id,
      guest_id: getGuestId(),
      source: getSource(),
    });
  }, [step, user?.id, price]);

  // Pix aprovado: destrava as noites atrás do overlay (justSubscribed no pai) e vai
  // pra tela de sucesso. A fonte da verdade é o webhook (entitlement por guest_id);
  // o SonoInlinePix já gravou o cache local + disparou o Purchase do client.
  const handlePixPaid = useCallback(() => {
    onUnlocked();
    void upsertEvent({ unlocked: true });
    goTo('unlocked');
  }, [onUnlocked, goTo]);

  // Vincula o entitlement (criado por guest_id) à conta recém-salva, pra valer em
  // qualquer aparelho. Non-fatal.
  const claimLifetime = useCallback(async () => {
    try {
      const cache = readSonoLifetime();
      if (!cache?.externalReference) return;
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      await fetch(apiUrl('/api/entitlements/claim'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ external_reference: cache.externalReference }),
      });
    } catch {
      /* non-fatal — o acesso por guest_id + cache local já vale */
    }
  }, []);

  // Botão da tela de sucesso. Logado → reivindica e vai pro app. Sem conta → oferece
  // salvar o acesso (save_account).
  const handleAfterUnlock = useCallback(() => {
    if (user) {
      void claimLifetime().then(() => navigate('/app/meditacoes-sono'));
    } else {
      goTo('save_account');
    }
  }, [user, claimLifetime, navigate, goTo]);

  const handleAccountSaved = useCallback(() => {
    void claimLifetime().then(() => navigate('/app/meditacoes-sono'));
  }, [claimLifetime, navigate]);

  const selectAnswer = (a: ReflectionAnswer) => {
    setAnswer(a);
    // max_step_reached é INT (1-6) na tabela sono_guest_flow_events — mandar
    // string ('reflection') fazia o upsert inteiro falhar e a resposta não salvar.
    void upsertEvent({ reflection_answer: a, max_step_reached: 2 });
    trackSonoGuestPostNight1Response(RESPONSE_KEY[a], {
      source: getSource(),
      guestId: getGuestId(),
    });
  };

  const goToOffer = () => {
    goTo('offer');
    void upsertEvent({ reached_offer: true, max_step_reached: 6 });
  };

  const startCheckout = () => {
    void upsertEvent({ cta_clicked: true });
    trackSonoGuestCheckoutClicked({ source: getSource(), guestId: getGuestId() });
    // Pagamento PRIMEIRO (Pix), conta depois — sem cadastro antes de pagar.
    goTo('pix');
  };

  const handleDismiss = () => {
    trackSonoGuestOfferDismissed({ source: getSource(), guestId: getGuestId() });
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
    trackSonoGuestAppInviteClicked({ source: getSource(), guestId: getGuestId() });
    navigate('/app');
  };

  // Overlay fechado — nada a renderizar.
  if (step === null) return null;

  // Fechar disponível nos passos "frios" (inclui pix: o usuário pode desistir antes
  // de pagar) — exceto sucesso/salvar conta.
  const canClose = step === 'reflection' || step === 'offer' || step === 'pix';
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
                      Como seu corpo
                      <br />
                      <em style={{ color: '#C4B5FD', fontStyle: 'italic' }}>está agora?</em>
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
                        Mais leve
                      </button>
                      <button
                        onClick={() => selectAnswer('little')}
                        className="w-full rounded-full py-3.5 text-[14px] font-semibold text-white/80 transition-all duration-200 hover:scale-[1.02] active:scale-[0.97]"
                        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)' }}
                      >
                        Um pouco mais calmo
                      </button>
                      <button
                        onClick={() => selectAnswer('no')}
                        className="w-full py-3 text-[13px] text-white/45 transition-colors hover:text-white/65"
                      >
                        Ainda acelerado
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
                      Continuar para a Noite 2 →
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
                <p
                  className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em]"
                  style={{ color: 'rgba(196,181,253,0.5)' }}
                >
                  Protocolo do Sono · 7 noites
                </p>
                <h2
                  className="mb-2 font-display text-[24px] font-bold leading-snug text-white"
                  style={{ textShadow: '0 2px 18px rgba(0,0,0,0.6)' }}
                >
                  Você sentiu a Noite 1.
                  <br />
                  <span style={{ color: '#C4B5FD' }}>As outras seis fixam isso.</span>
                </h2>
                <p className="mb-6 text-[14px] leading-snug text-white/45">
                  Libere as 7 noites pra treinar seu corpo a desligar sozinho — uma vez, suas
                  pra sempre.
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

                {/* Oferta — pagamento único via Pix, vitalício. Preço do backend. */}
                <p className="font-display text-[19px] font-bold text-white">
                  {priceLabel(price)} no Pix · pagamento único
                </p>
                <p className="mb-3 text-[13px] leading-snug text-white/40">
                  Sem assinatura, sem cobrança mensal. Você paga uma vez e as 7 noites ficam
                  liberadas pra sempre — menos que uma caixa de melatonina, e não acaba.
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
                  Liberar minhas 7 noites · {priceLabel(price)} no Pix
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

            {/* ── pix (inline — substitui o cartão) ── */}
            {step === 'pix' && (
              <motion.div
                key="pix"
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                className="flex w-full flex-col"
              >
                <SonoInlinePix price={price} guestId={getGuestId()} onPaid={handlePixPaid} />
                <button
                  onClick={handleDismiss}
                  className="mx-auto mt-4 text-[12px] transition-colors"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                >
                  Agora não
                </button>
              </motion.div>
            )}

            {/* ── save_account (opcional, pós-pagamento) ── */}
            {step === 'save_account' && (
              <motion.div
                key="save_account"
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                className="flex w-full flex-col"
              >
                <SonoInlineSignup
                  onCreated={handleAccountSaved}
                  returnTo={RETURN_TO}
                  title={
                    <>
                      Suas 7 noites são suas <span style={{ color: '#C4B5FD' }}>pra sempre.</span>
                    </>
                  }
                  subtitle="Salve seu acesso pra entrar de qualquer aparelho."
                  submitLabel="Salvar meu acesso"
                />
                <button
                  onClick={handleStayInSono}
                  className="mx-auto mt-4 text-[12px] transition-colors"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                >
                  Pular
                </button>
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
                  onClick={handleAfterUnlock}
                  className="w-full rounded-full py-4 text-[15px] font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg, #A78BFA 0%, #5A3DB0 100%)',
                    boxShadow: '0 10px 36px rgba(124,58,237,0.5)',
                  }}
                >
                  {user ? 'Continuar' : 'Salvar e continuar'}
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
