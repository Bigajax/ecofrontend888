import { useRef, useState } from 'react';
import { useSectionInView } from './useSectionInView';

type Testimonio = {
  key: string;
  quote: string;
  caption: string;
};

const TESTIMONIOS: Testimonio[] = [
  {
    key: 'primeiro-dialogo',
    quote:
      'Entrei pelas meditações. Acabei ficando pelas conversas com a Eco.',
    caption: 'Membro · sobre o primeiro diálogo',
  },
  {
    key: 'ritual-diario',
    quote:
      'Os 5 minutos do Diário Estoico viraram a parte mais importante do meu dia.',
    caption: 'Membro · sobre o ritual diário',
  },
  {
    key: 'em-portugues',
    quote:
      'Pela primeira vez senti que estava conversando em português de verdade.',
    caption: 'Membro · sobre conversar com a Eco',
  },
  {
    key: 'sono',
    quote:
      'Eu não precisava de mais conteúdo. Precisava aprender a desligar a mente antes de dormir.',
    caption: 'Membro · sobre o sono',
  },
];

// ─── Orb decorativo (imagens PNG de orbs de vidro) ──────────────────────────
const Orb = ({ src }: { src: string }) => (
  <img
    src={src}
    alt=""
    aria-hidden="true"
    width={200}
    height={200}
    loading="lazy"
    decoding="async"
    className="lp-testimonios-orb-img"
  />
);

const Sparkle = ({ color, size = 22 }: { color: string; size?: number }) => (
  <svg viewBox="0 0 20 20" width={size} height={size} aria-hidden="true">
    <path d="M10 0 L12 8 L20 10 L12 12 L10 20 L8 12 L0 10 L8 8 Z" fill={color} />
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────

export default function TestimoniosSection() {
  const ref = useSectionInView('depoimentos');
  const [active, setActive] = useState(0);
  const count = TESTIMONIOS.length;
  const touchStartX = useRef<number | null>(null);

  const go = (dir: number) =>
    setActive((i) => Math.max(0, Math.min(count - 1, i + dir)));

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 50) go(delta < 0 ? 1 : -1);
    touchStartX.current = null;
  };

  return (
    <section ref={ref} id="depoimentos" className="lp-testimonios">
      <div className="lp-testimonios-hero">
        <span className="lp-testimonios-orb lp-testimonios-orb--blue" aria-hidden="true">
          <Orb src="/images/testimonio-orb-blue.png" />
        </span>
        <span className="lp-testimonios-orb lp-testimonios-orb--green" aria-hidden="true">
          <Orb src="/images/testimonio-orb-green.png" />
        </span>
        <span className="lp-testimonios-orb lp-testimonios-orb--orange" aria-hidden="true">
          <Orb src="/images/testimonio-orb-yellow.png" />
        </span>
        <span className="lp-testimonios-orb lp-testimonios-orb--pink" aria-hidden="true">
          <Orb src="/images/testimonio-orb-pink.png" />
        </span>

        <span className="lp-testimonios-sparkle lp-testimonios-sparkle--yellow" aria-hidden="true">
          <Sparkle color="#F4C645" size={64} />
        </span>
        <span className="lp-testimonios-sparkle lp-testimonios-sparkle--pink" aria-hidden="true">
          <Sparkle color="#F2A2B5" size={50} />
        </span>
        <span className="lp-testimonios-sparkle lp-testimonios-sparkle--mint" aria-hidden="true">
          <Sparkle color="#9BD4B9" size={40} />
        </span>

        <h2 className="lp-testimonios-title scroll-reveal">
          <span className="lp-testimonios-title-line lp-testimonios-title-line--lead">
            Como a Ecotopia entrou
          </span>
          <span className="lp-testimonios-title-line lp-testimonios-title-line--sub">
            na rotina das pessoas.
          </span>
        </h2>
      </div>

      <div className="lp-testimonios-carousel">
        <div
          className="lp-testimonios-viewport"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div
            className="lp-testimonios-track"
            style={{ ['--n' as string]: active }}
          >
            {TESTIMONIOS.map((t) => (
              <article key={t.key} className="lp-testimonios-card">
                <p className="lp-testimonios-quote">“{t.quote}”</p>
                <p className="lp-testimonios-caption">{t.caption}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="lp-testimonios-nav">
          <button
            type="button"
            className="lp-testimonios-arrow"
            aria-label="Depoimento anterior"
            onClick={() => go(-1)}
            disabled={active === 0}
          >
            <ArrowLeft />
          </button>
          <button
            type="button"
            className="lp-testimonios-arrow"
            aria-label="Próximo depoimento"
            onClick={() => go(1)}
            disabled={active === count - 1}
          >
            <ArrowRight />
          </button>
        </div>
      </div>
    </section>
  );
}

function ArrowLeft() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 6 15 12 9 18" />
    </svg>
  );
}
