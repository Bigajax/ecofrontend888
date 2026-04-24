import { useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

export default function DrJoeAdCreativePage() {
  const navigate = useNavigate();

  return (
    <div
      className="relative flex flex-col overflow-hidden"
      style={{
        width: '100%',
        maxWidth: 420,
        height: '100dvh',
        maxHeight: 900,
        margin: '0 auto',
        background: '#07090F',
        fontFamily: "'Georgia', serif",
      }}
    >
      {/* ── Background com Ken Burns ── */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'url("/images/capa-dr-joe-dispenza.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center 30%',
          animation: 'drjoe-kenburns 14s ease-in-out infinite alternate',
          filter: 'saturate(1.1) brightness(0.55)',
        }}
      />
      {/* Gradient overlay — clareia no topo, escurece forte no fundo */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.25) 30%, rgba(0,0,0,0.72) 62%, rgba(7,9,15,0.96) 100%)',
        }}
      />
      {/* Lavender ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 50% 60%, rgba(148,136,196,0.18) 0%, transparent 70%)',
        }}
      />

      {/* ── Top bar ── */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-6">
        <div className="flex items-center gap-2.5">
          {/* Avatar / logo placeholder */}
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full text-[10px] font-bold tracking-widest uppercase"
            style={{
              background: 'rgba(148,136,196,0.22)',
              border: '1.5px solid rgba(148,136,196,0.55)',
              color: 'rgba(192,180,224,0.95)',
            }}
          >
            eco
          </div>
          <div>
            <p className="text-[11px] font-semibold text-white leading-none">Ecotopia</p>
            <p className="mt-0.5 text-[10px] text-white/45 leading-none">Meditação com IA</p>
          </div>
        </div>
        {/* Badge edition */}
        <span
          className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest"
          style={{
            background: '#9488C4',
            color: '#fff',
          }}
        >
          Dr. Joe Dispenza
        </span>
      </div>

      {/* ── Spacer push content to bottom ── */}
      <div className="flex-1" />

      {/* ── Main content ── */}
      <div className="relative z-10 px-5 pb-5">
        {/* Small meta pill */}
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm" style={{ filter: 'grayscale(0)' }}>🧠</span>
          <span
            className="text-[11px] font-medium"
            style={{ color: 'rgba(255,255,255,0.60)' }}
          >
            5 meditações guiadas · Disponível agora
          </span>
        </div>

        {/* Headline — editorial mix bold + italic */}
        <h1
          style={{
            fontSize: 'clamp(1.70rem, 7.5vw, 2.15rem)',
            lineHeight: 1.10,
            fontWeight: 700,
            color: '#FFFFFF',
            letterSpacing: '-0.02em',
            textShadow: '0 4px 24px rgba(0,0,0,0.55)',
            margin: 0,
          }}
        >
          Sua mente pode{' '}
          <em
            style={{
              fontStyle: 'italic',
              fontWeight: 400,
              color: 'rgba(192,180,224,0.95)',
            }}
          >
            criar uma nova realidade.
          </em>
          <br />
          <span style={{ fontWeight: 700 }}>Você só precisa praticar.</span>
        </h1>

        {/* Sub-copy */}
        <p
          className="mt-4 text-sm leading-relaxed"
          style={{ color: 'rgba(255,255,255,0.72)', maxWidth: 340 }}
        >
          O método do Dr. Joe Dispenza aplicado ao seu dia. Neurociência real.
          Resultados em <strong style={{ color: 'rgba(255,255,255,0.92)' }}>5 dias de prática guiada.</strong>
        </p>

        {/* Pills row */}
        <div className="mt-5 flex flex-wrap gap-2">
          {[
            '5 a 7 min por sessão',
            'Perfeito para iniciantes',
            'Resultado comprovado',
          ].map((label, i) => (
            <span
              key={label}
              className="rounded-full px-3.5 py-1.5 text-[11px] font-medium"
              style={{
                background: i === 1 ? 'rgba(148,136,196,0.22)' : 'rgba(255,255,255,0.08)',
                border:
                  i === 1
                    ? '1px solid rgba(148,136,196,0.50)'
                    : '1px solid rgba(255,255,255,0.16)',
                color: i === 1 ? 'rgba(192,180,224,0.95)' : 'rgba(255,255,255,0.80)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
              }}
            >
              {label}
            </span>
          ))}
        </div>

        {/* CTA button */}
        <button
          onClick={() => navigate('/app/dr-joe-dispenza')}
          className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-full py-4 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98]"
          style={{
            background: 'rgba(10,10,20,0.72)',
            border: '1px solid rgba(255,255,255,0.22)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            boxShadow: '0 12px 36px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.10)',
            fontSize: '1rem',
            letterSpacing: '0.01em',
          }}
        >
          <ArrowUpRight className="h-5 w-5" style={{ color: 'rgba(192,180,224,0.85)' }} />
          Começar minha transformação
        </button>

        {/* Social proof */}
        <p
          className="mt-3.5 text-center text-[11px]"
          style={{ color: 'rgba(255,255,255,0.38)' }}
        >
          Já praticado por milhares de pessoas no app
        </p>
      </div>

      {/* ── Ken Burns keyframes ── */}
      <style>{`
        @keyframes drjoe-kenburns {
          from { transform: scale(1.00) translate(0px, 0px); }
          to   { transform: scale(1.08) translate(-12px, -8px); }
        }
      `}</style>
    </div>
  );
}
