import { useSectionInView } from './useSectionInView';

const MARQUEE_PHRASES = [
  'encontre seu silêncio',
  'cinco minutos por dia',
  'menos ruído, mais método',
  'Jung · Freud · estoicismo',
  'em português, sempre',
  'autoconhecimento prático',
];

function Glyph() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M5 0 L10 5 L5 10 L0 5 Z" />
    </svg>
  );
}

export default function AutoridadeSection() {
  const ref = useSectionInView('autoridade');

  const loopItems = [...MARQUEE_PHRASES, ...MARQUEE_PHRASES];

  return (
    <div ref={ref}>
      <h2 className="lp-section-title scroll-reveal">
        Quem pratica vive mais leve e mais lúcido
      </h2>

      <div className="lp-marquee" aria-hidden="true">
        <div className="lp-marquee-track">
          {loopItems.map((phrase, i) => (
            <span key={`${phrase}-${i}`} className="lp-marquee-item">
              {phrase}
              <Glyph />
            </span>
          ))}
        </div>
      </div>

      <section className="lp-stats">
        <div className="scroll-reveal stagger-1">
          <div className="lp-stat-value">4,9</div>
          <div className="lp-stat-label">Avaliação dos praticantes</div>
        </div>
        <div className="scroll-reveal stagger-2">
          <div className="lp-stat-value">366</div>
          <div className="lp-stat-label">Lições filosóficas no Diário</div>
        </div>
        <div className="scroll-reveal stagger-3">
          <div className="lp-stat-value">8</div>
          <div className="lp-stat-label">Práticas na biblioteca</div>
        </div>
      </section>
    </div>
  );
}
