import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import mixpanel from '@/lib/mixpanel';

// ─── Constants ────────────────────────────────────────────────────────────────

const CYAN = '#00D9FF';
const CYAN_HOVER = '#00B8E6';
const BG = '#001F2B';

const FEATURES = [
  'Condicionamento diário guiado',
  'Neurociência aplicada na prática',
  'Protocolos progressivos de 7 min',
  'IA emocional personalizada',
  'Diário Estoico diário',
  'Acesso offline às meditações',
  'Progresso rastreado automaticamente',
  'Sem mensalidade para começar',
];

const STEPS = [
  {
    num: 'Passo 01',
    title: 'Identifique seu estado atual',
    desc: 'Antes de mudar, você precisa perceber. A ECO te guia para reconhecer o padrão emocional que está rodando automaticamente.',
  },
  {
    num: 'Passo 02',
    title: 'Pratique 7 minutos por dia',
    desc: 'Meditações guiadas ensinam seu corpo a sentir um novo estado — antes que ele aconteça. Não é sobre imaginar. É sobre condicionar.',
  },
  {
    num: 'Passo 03',
    title: 'Repita até virar identidade',
    desc: 'Em dias, não meses, seu sistema nervoso começa a responder diferente. O novo padrão se torna automático.',
  },
];

const SESSIONS = [
  {
    label: 'Dr. Joe Dispenza · 7 min',
    title: 'Sintonize Novos Potenciais',
    duration: '7 min',
    desc: '"O seu corpo precisa aprender emocionalmente o que sua mente já entendeu intelectualmente."',
    img: '/images/meditacao-novos-potenciais.webp',
  },
  {
    label: 'Dr. Joe Dispenza · 7 min',
    title: 'Recondicione Seu Corpo e Mente',
    duration: '7 min',
    desc: '"Liberte seu corpo do passado e ensine um novo estado interno — um que ressoa com quem você está se tornando."',
    img: '/images/meditacao-recondicionar.webp',
  },
  {
    label: 'Dr. Joe Dispenza · 10 min',
    title: 'Bênção dos Centros de Energia',
    duration: '10 min',
    desc: '"Direcione sua atenção para dentro. Cada centro de energia é um portal para um estado mais elevado."',
    img: '/images/meditacao-bencao-energia.webp',
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function PrimaryButton({
  children,
  onClick,
  fullWidth = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  fullWidth?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`group inline-flex min-h-[44px] items-center justify-center rounded-full text-[1.125rem] font-semibold transition-all duration-300 focus-visible:outline-[2px] focus-visible:outline-offset-2 ${
        fullWidth ? 'w-full px-8 py-4' : 'px-10 py-4'
      }`}
      style={{
        background: `linear-gradient(135deg, ${CYAN}, ${CYAN_HOVER})`,
        color: BG,
        boxShadow: '0 10px 30px rgba(0, 217, 255, 0.3)',
        outlineColor: CYAN,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLButtonElement).style.boxShadow =
          '0 15px 40px rgba(0, 217, 255, 0.4)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = '';
        (e.currentTarget as HTMLButtonElement).style.boxShadow =
          '0 10px 30px rgba(0, 217, 255, 0.3)';
      }}
    >
      {children}
    </button>
  );
}

function SectionWrapper({
  children,
  id,
  className = '',
}: {
  children: React.ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={`mx-auto w-full max-w-[1200px] px-6 md:px-8 ${className}`}
    >
      {children}
    </section>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="mb-4 text-[0.875rem] font-semibold uppercase tracking-[2px]"
      style={{ color: CYAN }}
    >
      {children}
    </p>
  );
}

function SectionH2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-[1.75rem] font-bold leading-[1.3] text-white sm:text-[2.5rem]">
      {children}
    </h2>
  );
}

function BodyText({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      className={`text-[1rem] leading-[1.7] sm:text-[1.125rem] ${className}`}
      style={{ color: 'rgba(255,255,255,0.8)' }}
    >
      {children}
    </p>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PublicLandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Authenticated users go straight to /app
  useEffect(() => {
    if (user) navigate('/app', { replace: true });
  }, [user, navigate]);

  function handleCTA(source: string) {
    mixpanel.track('Landing CTA Clicked', { source, timestamp: new Date().toISOString() });
    navigate('/app/guest/intro-potencial');
  }

  return (
    <div className="min-h-screen font-primary text-white" style={{ background: BG }}>

      {/* ── Sticky Nav ────────────────────────────────────────────────────────── */}
      <nav
        className="sticky top-0 z-50 border-b"
        style={{
          background: 'rgba(0,31,43,0.9)',
          backdropFilter: 'blur(12px)',
          borderColor: `rgba(0,217,255,0.1)`,
        }}
      >
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6 md:px-8">
          <img
            src="/images/ECOTOPIA.webp"
            alt="ECO"
            className="h-8 w-auto"
          />
          <button
            onClick={() => handleCTA('nav')}
            className="min-h-[44px] rounded-full px-6 py-2 text-sm font-semibold transition-all duration-300 focus-visible:outline-[2px] focus-visible:outline-offset-2"
            style={{
              background: `linear-gradient(135deg, ${CYAN}, ${CYAN_HOVER})`,
              color: BG,
              boxShadow: '0 6px 20px rgba(0,217,255,0.25)',
              outlineColor: CYAN,
            }}
          >
            Experimentar grátis
          </button>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <SectionWrapper className="pt-20 pb-10 text-center md:pt-28 md:pb-14">
        {/* Eyebrow */}
        <p
          className="mb-6 inline-block text-[0.875rem] font-semibold uppercase tracking-[2px]"
          style={{ color: CYAN }}
        >
          Transformação real começa aqui
        </p>

        {/* H1 */}
        <h1
          className="mx-auto max-w-[640px] font-display text-[2rem] font-bold leading-[1.2] sm:text-[3.5rem]"
        >
          <span style={{ color: CYAN }}>Pensando igual.<br className="hidden sm:block" /></span>
          <span style={{ color: CYAN }}>Sentindo igual.<br className="hidden sm:block" /></span>
          <span style={{ color: CYAN }}>Agindo igual.</span>
          <br />
          <span className="text-white">Nada muda.</span>
        </h1>

        {/* Subtitle */}
        <p
          className="mx-auto mt-8 max-w-[560px] text-[1rem] leading-[1.7] sm:text-[1.25rem]"
          style={{ color: 'rgba(255,255,255,0.8)' }}
        >
          A ECO usa neurociência e meditação guiada para interromper o padrão
          automático — e ensinar seu corpo a sentir um estado novo antes que ele
          aconteça.
        </p>

        {/* CTA */}
        <div className="mt-10 flex flex-col items-center gap-3">
          <PrimaryButton onClick={() => handleCTA('hero')}>
            Começar agora — é grátis
          </PrimaryButton>
          <p className="text-[0.875rem]" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Sem cadastro · menos de 3 minutos para a primeira prática
          </p>
        </div>
      </SectionWrapper>

      {/* ── App Preview ───────────────────────────────────────────────────────── */}
      <SectionWrapper className="flex justify-center pb-20 md:pb-28">
        <img
          src="/images/dr-joe-hero.webp"
          alt="ECO — meditação guiada"
          className="w-[90vw] rounded-xl object-cover sm:w-[700px]"
          style={{
            borderRadius: '12px',
            boxShadow: '0 20px 60px rgba(0, 217, 255, 0.15)',
          }}
        />
      </SectionWrapper>

      {/* ── Features / Badges ─────────────────────────────────────────────────── */}
      <SectionWrapper className="py-16 md:py-24">
        <div className="mb-12 text-center">
          <Eyebrow>O que você encontra aqui</Eyebrow>
          <SectionH2>
            Tudo que você precisa para
            <br />
            <span style={{ color: CYAN }}>sair do piloto automático</span>
          </SectionH2>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4">
          {FEATURES.map((feat) => (
            <div
              key={feat}
              className="rounded-lg p-5 text-center sm:p-6"
              style={{
                background: 'rgba(0,217,255,0.07)',
                border: '1px solid rgba(0,217,255,0.18)',
                borderRadius: '8px',
              }}
            >
              <p
                className="mb-2 text-[1.5rem]"
                style={{ color: CYAN }}
              >
                ✓
              </p>
              <p
                className="text-[0.9375rem] leading-[1.4] text-white/85"
              >
                {feat}
              </p>
            </div>
          ))}
        </div>
      </SectionWrapper>

      {/* ── Como Funciona ─────────────────────────────────────────────────────── */}
      <SectionWrapper className="py-16 md:py-24">
        <div className="mb-12 text-center">
          <Eyebrow>Como funciona</Eyebrow>
          <SectionH2>
            Três passos.
            <br />
            <span style={{ color: CYAN }}>Uma nova identidade.</span>
          </SectionH2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {STEPS.map((step) => (
            <div
              key={step.num}
              className="rounded-lg p-8"
              style={{
                background:
                  'linear-gradient(135deg, rgba(0,217,255,0.05), rgba(0,184,230,0.05))',
                borderLeft: `3px solid ${CYAN}`,
                borderRadius: '8px',
              }}
            >
              <p
                className="mb-3 text-[0.875rem] font-semibold uppercase tracking-[1px]"
                style={{ color: CYAN }}
              >
                {step.num}
              </p>
              <h3
                className="mb-4 font-display text-[1.25rem] font-semibold leading-snug text-white sm:text-[1.5rem]"
              >
                {step.title}
              </h3>
              <p
                className="text-[1rem] leading-[1.6]"
                style={{ color: 'rgba(255,255,255,0.7)' }}
              >
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </SectionWrapper>

      {/* ── Session Cards ─────────────────────────────────────────────────────── */}
      <SectionWrapper className="py-16 md:py-24">
        <div className="mb-14 text-center">
          <Eyebrow>As práticas</Eyebrow>
          <SectionH2>
            Meditações que
            <br />
            <span style={{ color: CYAN }}>condicionam o seu corpo</span>
          </SectionH2>
        </div>

        <div className="space-y-20 md:space-y-24">
          {SESSIONS.map((session, idx) => {
            const isReversed = idx % 2 !== 0;
            return (
              <div
                key={session.title}
                className={`flex flex-col items-center gap-8 md:gap-16 ${
                  isReversed ? 'md:flex-row-reverse' : 'md:flex-row'
                }`}
              >
                {/* Image */}
                <div className="flex-shrink-0">
                  <img
                    src={session.img}
                    alt={session.title}
                    className="w-[280px] rounded-[24px] object-cover sm:w-[320px]"
                    style={{
                      boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                      aspectRatio: '4/3',
                    }}
                  />
                </div>

                {/* Text */}
                <div className="flex-1" style={{ maxWidth: 500 }}>
                  <p
                    className="mb-2 flex items-center gap-2 text-[0.875rem] font-semibold uppercase tracking-[1px]"
                    style={{ color: CYAN }}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                    </svg>
                    {session.label}
                  </p>

                  <h3
                    className="mb-2 font-display text-[1.5rem] font-bold leading-snug text-white sm:text-[2rem]"
                  >
                    {session.title}
                  </h3>

                  <p
                    className="mb-4 inline-flex items-center gap-2 text-[0.875rem] font-semibold"
                    style={{ color: CYAN }}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {session.duration}
                  </p>

                  <p
                    className="text-[1rem] italic leading-[1.6]"
                    style={{ color: 'rgba(255,255,255,0.7)' }}
                  >
                    {session.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </SectionWrapper>

      {/* ── Quote ─────────────────────────────────────────────────────────────── */}
      <SectionWrapper className="py-8 md:py-16">
        <div
          className="rounded-lg px-8 py-8 md:px-10"
          style={{
            background: `linear-gradient(135deg, rgba(0,217,255,0.05), transparent)`,
            borderLeft: `4px solid ${CYAN}`,
            borderRadius: '8px',
            margin: '0 auto',
            maxWidth: 760,
          }}
        >
          <p
            className="text-[1.125rem] italic leading-[1.6] sm:text-[1.25rem]"
            style={{ color: 'rgba(255,255,255,0.9)' }}
          >
            "A maioria das pessoas tenta mudar sua vida de fora para dentro.
            O trabalho real começa por dentro — no nível da identidade, da emoção
            e do sistema nervoso."
          </p>
          <p
            className="mt-4 text-sm font-semibold"
            style={{ color: CYAN }}
          >
            — Dr. Joe Dispenza
          </p>
        </div>
      </SectionWrapper>

      {/* ── Bullet benefits ───────────────────────────────────────────────────── */}
      <SectionWrapper className="py-16 md:py-24">
        <div
          className="mx-auto grid max-w-3xl gap-y-4 md:grid-cols-2 md:gap-x-12 md:gap-y-5"
        >
          {[
            'Reprograme seu estado emocional diariamente',
            'Crie coerência entre intenção e emoção',
            'Treine seu corpo a sentir o futuro antes dele acontecer',
            'Saia do padrão automático que mantém sua vida igual',
            'Pratique onde e quando quiser, em 7 minutos',
            'Acompanhe sua evolução ao longo do tempo',
          ].map((item) => (
            <div key={item} className="flex items-start gap-4">
              <span
                className="flex-shrink-0 text-[1.5rem] leading-none"
                style={{ color: CYAN }}
              >
                •
              </span>
              <span
                className="text-[1rem] leading-[1.6] sm:text-[1.125rem]"
                style={{ color: 'rgba(255,255,255,0.85)' }}
              >
                {item}
              </span>
            </div>
          ))}
        </div>
      </SectionWrapper>

      {/* ── Final CTA ─────────────────────────────────────────────────────────── */}
      <SectionWrapper className="py-20 text-center md:py-28">
        <Eyebrow>Comece hoje</Eyebrow>
        <SectionH2>
          Sua primeira prática
          <br />
          <span style={{ color: CYAN }}>começa em 3 minutos</span>
        </SectionH2>
        <BodyText className="mx-auto mt-6 max-w-[480px]">
          Sem cadastro. Sem cartão. Apenas você e a experiência — para sentir
          antes de decidir qualquer coisa.
        </BodyText>

        <div className="mt-10 flex flex-col items-center gap-3 sm:mx-auto sm:max-w-xs">
          <PrimaryButton onClick={() => handleCTA('final_cta')} fullWidth>
            Experimentar grátis
          </PrimaryButton>
          <p className="text-[0.875rem]" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Acesso imediato · sem comprometimento
          </p>
        </div>
      </SectionWrapper>

      {/* ── Footer ────────────────────────────────────────────────────────────── */}
      <footer
        className="border-t"
        style={{
          background: 'rgba(0,31,43,0.8)',
          borderColor: `rgba(0,217,255,0.1)`,
          padding: '3rem 2rem',
        }}
      >
        <div
          className="mx-auto text-center"
          style={{ maxWidth: 600 }}
        >
          <img
            src="/images/ECOTOPIA.webp"
            alt="ECO"
            className="mx-auto mb-8 h-8 w-auto"
          />
          <p
            className="mx-auto max-w-[600px] text-[0.875rem] leading-[1.6]"
            style={{ color: 'rgba(255,255,255,0.6)' }}
          >
            ECO é uma plataforma de bem-estar emocional que usa meditação guiada,
            neurociência e inteligência artificial para ajudar pessoas a saírem do
            piloto automático e viverem com mais intenção.
          </p>
          <div
            className="mt-6 flex flex-wrap items-center justify-center gap-6"
          >
            {[
              { label: 'Entrar', href: '/login' },
              { label: 'Criar conta', href: '/register' },
              { label: 'Diário Estoico', href: '/diario-estoico' },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm transition-colors duration-200 hover:opacity-80"
                style={{ color: CYAN, textDecoration: 'none' }}
              >
                {link.label}
              </a>
            ))}
          </div>
          <p
            className="mt-8 text-[0.8125rem]"
            style={{ color: 'rgba(255,255,255,0.35)' }}
          >
            © {new Date().getFullYear()} ECO · Todos os direitos reservados
          </p>
        </div>
      </footer>

    </div>
  );
}
