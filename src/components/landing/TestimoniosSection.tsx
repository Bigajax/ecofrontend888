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
      'Eu achei que ia ser mais um app de meditação. Mas a Eco me fez uma pergunta que meu terapeuta nunca tinha feito.',
    caption: 'Membro · sobre o primeiro diálogo',
  },
  {
    key: 'ritual-diario',
    quote:
      'Os 5 minutos do Diário Estoico viraram a parte mais importante do meu dia. Não é motivacional, é prático.',
    caption: 'Membro · sobre o ritual diário',
  },
  {
    key: 'em-portugues',
    quote:
      'Pela primeira vez tenho uma IA que conversa comigo em português de verdade, e que entende o jeito brasileiro de sentir.',
    caption: 'Membro · sobre conversar com a Eco',
  },
];

// ─── Orb decorativo (imagens PNG de orbs de vidro) ──────────────────────────
const Orb = ({ src }: { src: string }) => (
  <img
    src={src}
    alt=""
    aria-hidden="true"
    width={160}
    height={160}
    loading="lazy"
    decoding="async"
    className="lp-testimonios-orb-img"
  />
);

const Sparkle = ({ color }: { color: string }) => (
  <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
    <path d="M10 0 L12 8 L20 10 L12 12 L10 20 L8 12 L0 10 L8 8 Z" fill={color} />
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────

export default function TestimoniosSection() {
  const ref = useSectionInView('depoimentos');

  return (
    <section ref={ref} id="depoimentos" className="lp-testimonios">
      <div className="lp-testimonios-hero">
        <span className="lp-testimonios-orb lp-testimonios-orb--blue"><Orb src="/images/testimonio-orb-blue.png" /></span>
        <span className="lp-testimonios-orb lp-testimonios-orb--green"><Orb src="/images/testimonio-orb-green.png" /></span>
        <span className="lp-testimonios-orb lp-testimonios-orb--orange"><Orb src="/images/testimonio-orb-yellow.png" /></span>
        <span className="lp-testimonios-orb lp-testimonios-orb--pink"><Orb src="/images/testimonio-orb-pink.png" /></span>

        <span className="lp-testimonios-sparkle lp-testimonios-sparkle--yellow"><Sparkle color="#F2C94C" /></span>
        <span className="lp-testimonios-sparkle lp-testimonios-sparkle--pink"><Sparkle color="#F091A8" /></span>

        <h2 className="lp-testimonios-title scroll-reveal">
          Membros vivendo dias
          <br />
          mais leves e equilibrados
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
