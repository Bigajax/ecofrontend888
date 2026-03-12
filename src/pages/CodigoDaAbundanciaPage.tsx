import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Play, Check, Lock, ArrowLeft, Gift,
  Loader2, Brain, Sparkles, TrendingUp,
} from 'lucide-react';
import HomeHeader from '@/components/home/HomeHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useAbundanciaEntitlement } from '@/hooks/useAbundanciaEntitlement';
import { useAbundanciaCheckout } from '@/hooks/useAbundanciaCheckout';
import { PROTOCOL_SESSIONS, type ProtocolSession } from '@/data/protocolAbundancia';

// Gold palette
const GOLD = '#FFB932';
const GOLD_DARK = '#C49A00';
const GOLD_SOFT = 'rgba(255,185,50,0.10)';
const GOLD_BORDER = 'rgba(255,185,50,0.30)';

function isSessionAccessible(
  session: number,
  completed: Set<number>,
  isPaid: boolean,
  isVip: boolean,
  isFree: boolean,
): boolean {
  if (isVip) return true;
  if (isFree) return true;
  if (!isPaid) return false;
  if (session === 3) return completed.has(2);
  return completed.has(session - 1);
}

// Simple geometric mandala SVG element for the hero
function MandalaSvg() {
  return (
    <svg
      viewBox="0 0 200 200"
      className="w-40 h-40 sm:w-52 sm:h-52 opacity-70"
      style={{ filter: 'drop-shadow(0 0 24px rgba(255,185,50,0.5))' }}
      aria-hidden="true"
    >
      {/* Outer ring */}
      <circle cx="100" cy="100" r="96" fill="none" stroke={GOLD} strokeWidth="0.8" strokeOpacity="0.5" />
      {/* Mid ring */}
      <circle cx="100" cy="100" r="72" fill="none" stroke={GOLD} strokeWidth="0.8" strokeOpacity="0.6" />
      {/* Inner ring */}
      <circle cx="100" cy="100" r="48" fill="none" stroke={GOLD} strokeWidth="1" strokeOpacity="0.7" />
      {/* Core circle */}
      <circle cx="100" cy="100" r="20" fill="none" stroke={GOLD} strokeWidth="1.5" strokeOpacity="0.9" />
      {/* 8 spokes */}
      {Array.from({ length: 8 }, (_, i) => {
        const angle = (i * Math.PI) / 4;
        const x1 = 100 + 22 * Math.cos(angle);
        const y1 = 100 + 22 * Math.sin(angle);
        const x2 = 100 + 94 * Math.cos(angle);
        const y2 = 100 + 94 * Math.sin(angle);
        return (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={GOLD} strokeWidth="0.7" strokeOpacity="0.45" />
        );
      })}
      {/* 8 outer petals */}
      {Array.from({ length: 8 }, (_, i) => {
        const angle = (i * Math.PI) / 4;
        const cx = 100 + 72 * Math.cos(angle);
        const cy = 100 + 72 * Math.sin(angle);
        return <circle key={i} cx={cx} cy={cy} r="6" fill="none" stroke={GOLD} strokeWidth="1" strokeOpacity="0.6" />;
      })}
      {/* 8 mid petals */}
      {Array.from({ length: 8 }, (_, i) => {
        const angle = (i * Math.PI) / 4 + Math.PI / 8;
        const cx = 100 + 50 * Math.cos(angle);
        const cy = 100 + 50 * Math.sin(angle);
        return <circle key={i} cx={cx} cy={cy} r="4" fill={GOLD} fillOpacity="0.2" stroke={GOLD} strokeWidth="0.8" strokeOpacity="0.7" />;
      })}
      {/* Center dot */}
      <circle cx="100" cy="100" r="4" fill={GOLD} fillOpacity="0.8" />
    </svg>
  );
}

export default function CodigoDaAbundanciaPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isVipUser } = useAuth();
  const { hasAccess: hasAbundanciaEntitlement } = useAbundanciaEntitlement();
  const { loading: checkoutLoading, openCheckout } = useAbundanciaCheckout();
  const isPaid = isVipUser || hasAbundanciaEntitlement;
  const uid = user?.id || 'guest';

  const [completedSessions, setCompletedSessions] = useState<Set<number>>(() => {
    const raw = localStorage.getItem(`eco.abundancia.protocol.v1.${uid}`);
    if (raw) {
      try {
        return new Set<number>(JSON.parse(raw).completedSessions || []);
      } catch {
        return new Set<number>();
      }
    }
    return new Set<number>();
  });

  const [showCompletion, setShowCompletion] = useState(false);

  useEffect(() => {
    localStorage.setItem(`eco.abundancia.protocol.v1.${uid}`, JSON.stringify({
      completedSessions: [...completedSessions],
      lastActive: new Date().toISOString(),
    }));
  }, [completedSessions, uid]);

  useEffect(() => {
    if (location.state?.returnFromMeditation) {
      const lastPlayed = sessionStorage.getItem('eco.abundancia.lastPlayedSession');
      if (lastPlayed) {
        const sessionNum = parseInt(lastPlayed);
        const markerKey = `eco.meditation.completed80pct.abundancia_${sessionNum}`;
        if (localStorage.getItem(markerKey) === 'true') {
          setCompletedSessions(prev => {
            const next = new Set([...prev, sessionNum]);
            if (next.size === 7) setShowCompletion(true);
            return next;
          });
        }
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const completedCount = completedSessions.size;
  const pct = Math.round((completedCount / 7) * 100);
  const nextSession = Math.min(completedCount + 1, 7);

  const heroButtonLabel =
    !isPaid && completedCount >= 2
      ? 'Iniciar meu Código da Abundância — R$ 67'
      : completedCount === 0
      ? 'Iniciar Dia 1 — Grátis'
      : completedCount === 7
      ? 'Protocolo Concluído 🎉'
      : !isPaid && nextSession > 2
      ? 'Iniciar meu Código da Abundância — R$ 67'
      : `Continuar Dia ${nextSession}`;

  const handleSessionClick = (session: ProtocolSession) => {
    const accessible = isSessionAccessible(session.session, completedSessions, isPaid, isVipUser, session.isFree);

    if (!accessible) {
      openCheckout();
      return;
    }
    if (!session.hasAudio || !session.audioUrl) return;

    sessionStorage.setItem('eco.abundancia.lastPlayedSession', String(session.session));

    navigate('/app/meditation-player', {
      state: {
        meditation: {
          id: session.id,
          title: `Dia ${session.session} – ${session.title}`,
          duration: session.duration,
          audioUrl: session.audioUrl,
          imageUrl: session.imageUrl ?? '/images/abundancia-hero.webp',
          backgroundMusic: 'Abundância',
          gradient: session.gradient,
          category: 'abundancia',
          isPremium: !session.isFree,
        },
        returnTo: '/app/codigo-da-abundancia',
      },
    });
  };

  const handleHeroButtonClick = () => {
    if (!isPaid && nextSession > 2) {
      openCheckout();
      return;
    }
    if (completedCount === 7) {
      setShowCompletion(true);
      return;
    }
    const targetSession = PROTOCOL_SESSIONS[nextSession - 1];
    if (targetSession) handleSessionClick(targetSession);
  };

  // ── Tela de Conclusão ────────────────────────────────────────────────────
  if (showCompletion) {
    return (
      <div className="min-h-screen font-primary flex flex-col items-center justify-center px-6 text-center" style={{ background: '#09090F' }}>
        <div className="max-w-sm w-full">
          <div className="text-6xl mb-6">✨</div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl mb-4 leading-tight" style={{ color: GOLD }}>
            Código Ativado
          </h1>
          <p className="text-sm sm:text-base leading-relaxed mb-8" style={{ color: 'rgba(255,185,50,0.7)' }}>
            Em 7 dias, você reprogramou os padrões que afastavam a prosperidade.<br />
            A abundância não é um destino — agora é parte de quem você é.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate('/app')}
              className="w-full rounded-full px-6 py-3 text-sm font-semibold transition-all active:scale-95"
              style={{ background: GOLD, color: '#09090F' }}
            >
              Explorar outros programas
            </button>
            <button
              onClick={() => setShowCompletion(false)}
              className="mt-4 text-xs underline underline-offset-2"
              style={{ color: 'rgba(255,185,50,0.5)' }}
            >
              Ver protocolo novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Página Principal ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen font-primary" style={{ background: '#FFFFFF' }}>
      {user && <HomeHeader />}

      <main className="pb-20">
        {/* Hero Section */}
        <section
          className="relative flex min-h-[640px] flex-col overflow-hidden sm:min-h-[720px]"
          style={{ background: '#09090F' }}
        >
          {/* Navigation */}
          <div className="absolute left-4 top-4 right-4 z-20 flex items-center justify-between sm:left-6 sm:top-6">
            <button
              onClick={() => navigate('/app')}
              className="flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-sm transition-all hover:shadow-lg"
              style={{ background: 'rgba(255,185,50,0.15)', border: '1px solid rgba(255,185,50,0.3)' }}
            >
              <ArrowLeft className="h-5 w-5" style={{ color: GOLD }} />
            </button>
            {!user && (
              <button
                onClick={() => navigate('/register')}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-full hover:shadow-lg transition-all duration-200"
                style={{ background: GOLD, color: '#09090F' }}
              >
                Criar conta grátis
              </button>
            )}
          </div>

          {/* Ambient glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse 60% 50% at 50% 30%, rgba(255,185,50,0.12) 0%, transparent 70%)',
            }}
          />

          {/* Content */}
          <div className="relative z-10 mx-auto flex w-full max-w-sm flex-col items-center px-6 pt-20 pb-16 text-center sm:max-w-md sm:px-8 sm:pt-24 sm:pb-20">

            {/* Mandala */}
            <div className="mb-6">
              <MandalaSvg />
            </div>

            {/* Eyebrow */}
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] sm:text-xs" style={{ color: 'rgba(255,185,50,0.55)' }}>
              7 Dias · Protocolo Progressivo
            </p>

            {/* Headline */}
            <h1
              className="mt-4 font-display text-[1.9rem] font-bold sm:text-[2.6rem] leading-[1.12]"
              style={{ color: '#FFFFFF', textShadow: '0 2px 20px rgba(255,185,50,0.25), 0 1px 4px rgba(0,0,0,0.5)' }}
            >
              Você não tem problema de dinheiro.<br />
              <span style={{ color: GOLD }}>Você tem uma crença que o afasta.</span>
            </h1>

            {/* Subtitle */}
            <p
              className="mt-3 text-sm font-light leading-relaxed sm:text-[0.95rem]"
              style={{ color: 'rgba(255,255,255,0.55)' }}
            >
              Em 7 sessões, este protocolo usa neurociência e meditação guiada para reprogramar os padrões mentais que fazem o dinheiro escorregar — mesmo quando você trabalha duro.
            </p>

            {/* Benefit pills */}
            <div className="mt-10 flex w-full flex-col gap-2.5 sm:mt-11">
              {[
                'Identificar e dissolver crenças limitantes sobre dinheiro',
                'Criar um novo estado emocional de merecimento e abertura',
                'Alinhar sua mente inconsciente com seus objetivos financeiros',
              ].map((label) => (
                <span
                  key={label}
                  className="flex w-full items-center gap-3 rounded-full px-5 py-2.5 text-sm font-medium text-left"
                  style={{
                    background: 'rgba(255,185,50,0.10)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    border: '1px solid rgba(255,185,50,0.25)',
                    boxShadow: 'inset 0 1px 0 rgba(255,185,50,0.15), 0 2px 14px rgba(0,0,0,0.3)',
                    color: 'rgba(255,255,255,0.85)',
                  }}
                >
                  <Check className="h-4 w-4 flex-shrink-0" style={{ color: GOLD }} strokeWidth={2.5} />
                  {label}
                </span>
              ))}
            </div>

            {/* CTA */}
            <button
              onClick={handleHeroButtonClick}
              disabled={checkoutLoading}
              className="mt-8 flex w-full items-center justify-center gap-2.5 rounded-full py-3.5 text-sm font-semibold transition-all duration-300 hover:scale-105 active:scale-95 sm:mt-9 sm:py-4 sm:text-base disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{
                background: GOLD,
                color: '#09090F',
                boxShadow: `0 4px 24px rgba(255,185,50,0.35)`,
              }}
            >
              {checkoutLoading
                ? <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                : isPaid && completedCount < 7
                ? <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="currentColor" />
                : null}
              {checkoutLoading ? 'Abrindo pagamento…' : heroButtonLabel}
            </button>
          </div>
        </section>

        {/* Empathy Card */}
        <section className="mx-auto max-w-4xl px-4 pt-8 pb-2 sm:px-8">
          <div
            className="rounded-2xl px-5 py-4 sm:px-6 sm:py-5"
            style={{ background: GOLD_SOFT, border: `1px solid ${GOLD_BORDER}` }}
          >
            <p className="text-sm text-[var(--eco-text)] sm:text-base leading-relaxed">
              Você não tem problema de dinheiro porque é fraco. Você tem porque seu cérebro foi condicionado a manter um nível fixo de prosperidade — e inconscientemente sabota tudo que ultrapassa esse nível.{' '}
              <span className="font-semibold" style={{ color: GOLD_DARK }}>É isso que vamos mudar.</span>
            </p>
          </div>
        </section>

        {/* Progress Bar */}
        <section className="mx-auto max-w-4xl px-4 pt-6 pb-2 sm:px-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[var(--eco-text)]">
              {completedCount === 7
                ? 'Código ativado!'
                : `Você está no Dia ${nextSession} de 7`}
            </span>
            <span className="text-sm font-semibold" style={{ color: GOLD_DARK }}>{pct}%</span>
          </div>
          <div className="h-2 w-full rounded-full" style={{ background: GOLD_SOFT }}>
            <div
              className="h-2 rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: GOLD }}
            />
          </div>
          <p className="mt-1.5 text-xs text-[var(--eco-muted)]">
            {completedCount} de 7 dias concluídos
          </p>
        </section>

        {/* Session Cards */}
        <section className="mx-auto max-w-4xl px-4 py-4 sm:px-8">
          {!isPaid && (
            <div
              className="mb-4 rounded-2xl px-4 py-5 sm:px-5 text-center"
              style={{ background: GOLD_SOFT, border: `1px solid ${GOLD_BORDER}` }}
            >
              <p className="text-sm font-medium text-[var(--eco-text)] sm:text-base leading-snug">
                Acesso completo às 7 sessões. Pagamento único. Sem mensalidade.
              </p>
              <button
                onClick={openCheckout}
                disabled={checkoutLoading}
                className="mt-4 inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold shadow-md hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{ background: GOLD, color: '#09090F', boxShadow: `0 4px 16px rgba(255,185,50,0.3)` }}
              >
                {checkoutLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {checkoutLoading ? 'Abrindo pagamento…' : 'Desbloquear agora — R$ 67'}
              </button>
            </div>
          )}

          <div className="space-y-3">
            {PROTOCOL_SESSIONS.map((session) => {
              const accessible = isSessionAccessible(session.session, completedSessions, isPaid, isVipUser, session.isFree);
              const completed = completedSessions.has(session.session);
              const paidLocked = !session.isFree && !isPaid;
              const sequentialLocked = !paidLocked && !accessible;
              const comingSoon = accessible && !session.hasAudio;

              return (
                <div
                  key={session.id}
                  onClick={() => handleSessionClick(session)}
                  className={`flex items-center gap-3 rounded-2xl border p-3 sm:p-4 transition-all duration-200 ${
                    sequentialLocked
                      ? 'opacity-50 cursor-not-allowed'
                      : paidLocked || comingSoon
                      ? 'cursor-pointer'
                      : completed
                      ? 'cursor-pointer'
                      : 'cursor-pointer'
                  }`}
                  style={{
                    background: completed ? 'rgba(255,185,50,0.06)' : '#FFFFFF',
                    borderColor: completed
                      ? 'rgba(255,185,50,0.40)'
                      : paidLocked
                      ? 'rgba(255,185,50,0.25)'
                      : sequentialLocked
                      ? 'var(--eco-line)'
                      : 'var(--eco-line)',
                    boxShadow: completed
                      ? '0 2px 8px rgba(255,185,50,0.12)'
                      : '0 2px 8px rgba(0,0,0,0.04)',
                  }}
                >
                  {/* Status Icon */}
                  <div className="flex-shrink-0">
                    {completed ? (
                      <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full" style={{ background: GOLD }}>
                        <Check className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: '#09090F' }} strokeWidth={3} />
                      </div>
                    ) : sequentialLocked ? (
                      <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-gray-100">
                        <Lock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400" />
                      </div>
                    ) : (
                      <div
                        className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full border-2"
                        style={{ borderColor: GOLD }}
                      >
                        <span className="text-xs font-bold" style={{ color: GOLD_DARK }}>{session.session}</span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex flex-1 items-center justify-between gap-2 min-w-0">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-[var(--eco-text)] sm:text-base">
                        Dia {session.session} – {session.title}
                      </h3>
                      <p className="mt-0.5 text-xs text-[var(--eco-muted)] sm:text-sm">
                        {session.description}
                      </p>
                    </div>

                    <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
                      <span className="text-xs text-[var(--eco-muted)] sm:text-sm whitespace-nowrap">
                        {session.duration}
                      </span>

                      {paidLocked ? (
                        <span
                          className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-full whitespace-nowrap"
                          style={{ color: GOLD_DARK, background: GOLD_SOFT, border: `1px solid ${GOLD_BORDER}` }}
                        >
                          {checkoutLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                          {checkoutLoading ? 'Abrindo…' : 'Desbloquear'}
                        </span>
                      ) : session.isFree && !completed ? (
                        <span
                          className="text-xs font-semibold px-2.5 py-1.5 rounded-full whitespace-nowrap"
                          style={{ color: GOLD_DARK, background: GOLD_SOFT, border: `1px solid ${GOLD_BORDER}` }}
                        >
                          Grátis
                        </span>
                      ) : comingSoon ? (
                        <span
                          className="text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap"
                          style={{ color: GOLD_DARK, background: GOLD_SOFT }}
                        >
                          Em breve
                        </span>
                      ) : (
                        <div
                          className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full"
                          style={{
                            background: sequentialLocked ? '#F3F4F6' : GOLD_SOFT,
                          }}
                        >
                          <Play
                            className="h-4 w-4 sm:h-5 sm:w-5"
                            style={{ color: sequentialLocked ? '#D1D5DB' : GOLD_DARK }}
                            fill="currentColor"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Why it works */}
        <section className="mx-auto max-w-4xl px-4 pt-6 pb-8 sm:px-8">
          <h3 className="text-base font-semibold text-[var(--eco-text)] sm:text-lg mb-2">
            Por que este protocolo funciona?
          </h3>
          <p className="text-sm text-[var(--eco-muted)] sm:text-base mb-4">
            Baseado em princípios de:
          </p>
          <ul className="space-y-3">
            {[
              {
                Icon: Brain,
                title: 'Neuroplasticidade aplicada',
                text: 'Seu cérebro foi condicionado a um nível fixo de prosperidade. Cada sessão cria novos caminhos neurais substituindo os padrões antigos.',
              },
              {
                Icon: Sparkles,
                title: 'Lei da Atração com base no estado emocional',
                text: 'Não é sobre pensar positivo. É sobre gerar o estado interno correto para que decisões e ações se alinhem com a abundância.',
              },
              {
                Icon: TrendingUp,
                title: 'Progressão deliberada',
                text: 'Cada sessão se aprofunda onde a anterior terminou. No 7º dia, a reprogramação opera no nível da identidade.',
              },
            ].map(({ Icon, title, text }) => (
              <li key={title} className="flex items-start gap-3 text-sm text-[var(--eco-muted)] sm:text-base">
                <div
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl mt-0.5"
                  style={{ background: GOLD_SOFT }}
                >
                  <Icon className="h-4 w-4" style={{ color: GOLD_DARK }} />
                </div>
                <div>
                  <span className="font-semibold text-[var(--eco-text)]">{title}</span>
                  {' — '}
                  {text}
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Unlock Banner */}
        {!isPaid && (
          <section className="mx-auto max-w-4xl px-4 pb-4 sm:px-8">
            <div
              className="rounded-2xl px-5 py-6 sm:px-6 sm:py-7 text-center"
              style={{ background: '#09090F' }}
            >
              <p className="text-sm sm:text-base font-medium mb-4" style={{ color: 'rgba(255,255,255,0.75)' }}>
                Acesso completo às 7 sessões. Pagamento único. Sem mensalidade.
              </p>
              <button
                onClick={openCheckout}
                disabled={checkoutLoading}
                className="inline-flex items-center gap-2 rounded-full px-8 py-3 text-sm font-semibold transition-all hover:scale-105 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{ background: GOLD, color: '#09090F', boxShadow: `0 4px 24px rgba(255,185,50,0.35)` }}
              >
                {checkoutLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {checkoutLoading ? 'Abrindo pagamento…' : 'Desbloquear agora — R$ 67'}
              </button>
            </div>
          </section>
        )}

        {/* Bottom CTA */}
        <section className="mx-auto max-w-4xl px-4 pt-4 pb-6 sm:px-8">
          <div
            className="rounded-2xl px-5 py-6 sm:px-6 sm:py-7"
            style={{ background: GOLD_SOFT, border: `1px solid ${GOLD_BORDER}` }}
          >
            <h3 className="text-base font-semibold text-[var(--eco-text)] sm:text-lg mb-4">
              Você começou uma jornada. Não pare agora.
            </h3>
            <ul className="space-y-2 mb-6">
              {[
                'Pagamento único — sem renovação automática',
                'Acesso imediato e vitalício a todas as 7 sessões',
                'Inclui áudio SOS: Ansiedade Financeira Aguda',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-[var(--eco-text)] sm:text-base">
                  <Check className="h-4 w-4 flex-shrink-0" style={{ color: GOLD_DARK }} strokeWidth={2.5} />
                  {item}
                </li>
              ))}
            </ul>
            {!isPaid && (
              <button
                onClick={openCheckout}
                disabled={checkoutLoading}
                className="w-full rounded-full py-3.5 text-sm font-semibold transition-all hover:scale-105 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100 sm:text-base"
                style={{ background: GOLD, color: '#09090F', boxShadow: `0 4px 20px rgba(255,185,50,0.3)` }}
              >
                {checkoutLoading ? 'Abrindo pagamento…' : 'Retomar minha jornada — R$ 67'}
              </button>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
