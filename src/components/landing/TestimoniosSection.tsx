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

      <div className="lp-testimonios-grid">
        {TESTIMONIOS.map((t, i) => (
          <article
            key={t.key}
            className={`lp-testimonios-card scroll-reveal stagger-${(i % 3) + 1}`}
          >
            <p className="lp-testimonios-quote">“{t.quote}”</p>
            <p className="lp-testimonios-caption">{t.caption}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
