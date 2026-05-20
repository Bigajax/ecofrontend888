const PHRASES = [
  'cinco minutos por dia',
  'menos ruído, mais método',
  'Jung · Freud · estoicismo',
  'em português, sempre',
] as const;

// Bloco interno renderizado 2x (original + cópia) para loop perfeito sem saltos
function MarqueeBlock({ ariaHidden = false }: { ariaHidden?: boolean }) {
  return (
    <div className="lp-method-marquee-item" aria-hidden={ariaHidden || undefined}>
      {PHRASES.map((phrase, i) => (
        <span key={`${phrase}-${i}`} className="lp-method-marquee-row">
          {phrase}
          <span className="lp-method-eyes" aria-hidden="true">
            <span className="lp-method-eye" />
            <span className="lp-method-eye" />
          </span>
        </span>
      ))}
    </div>
  );
}

export default function MethodMarquee() {
  return (
    <section className="lp-method-marquee" aria-label="O método ECO em frases">
      <div className="lp-method-marquee-track">
        <MarqueeBlock />
        <MarqueeBlock ariaHidden />
      </div>
    </section>
  );
}
