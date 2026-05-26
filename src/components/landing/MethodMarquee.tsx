import { Fragment } from 'react';

const TERMS = ['Jung', 'Freud', 'Estoicismo', 'Mindfulness', 'Eco IA'] as const;

// Par de olhos. Cada `variant` (0–3) tem um movimento PRÓPRIO:
// 0 = olha pros lados · 1 = pisca um olho (wink) · 2 = pisca os dois · 3 = olha cima/baixo
function Eyes({ variant }: { variant: number }) {
  return (
    <span className={`lp-method-eyes lp-method-eyes--${variant}`} aria-hidden="true">
      <span className="lp-method-eye" />
      <span className="lp-method-eye" />
    </span>
  );
}

// Bloco interno renderizado 2x (original + cópia) para loop perfeito sem saltos
function MarqueeBlock({ ariaHidden = false }: { ariaHidden?: boolean }) {
  return (
    <div className="lp-method-marquee-item" aria-hidden={ariaHidden || undefined}>
      {TERMS.map((term, i) => (
        <Fragment key={`${term}-${i}`}>
          <span className="lp-method-term">{term}</span>
          <Eyes variant={i % 4} />
        </Fragment>
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
