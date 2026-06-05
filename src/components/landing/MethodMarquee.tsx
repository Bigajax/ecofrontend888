import { Fragment } from 'react';

const DEFAULT_TERMS = ['Jung', 'Freud', 'Estoicismo', 'Mindfulness', 'Eco IA'];

// Par de olhos. Cada `variant` (0–3) tem um movimento PRÓPRIO:
// 0 = olha pros lados · 1 = pisca um olho (wink) · 2 = pisca os dois · 3 = olha cima/baixo
function Eyes({ variant }: { variant: number }) {
  return (
    <span className={`lp-method-eyes lp-method-eyes--${variant}`} aria-hidden="true">
      {/* gorro de dormir — visível só na variante céu estrelado (.lp-method-marquee--starry) */}
      <img className="lp-method-eyes-cap" src="/images/sono-gorro.webp" alt="" loading="lazy" />
      <span className="lp-method-eye" />
      <span className="lp-method-eye" />
    </span>
  );
}

// Bloco interno renderizado 2x (original + cópia) para loop perfeito sem saltos.
// `repeat` repete a lista de termos dentro do bloco para garantir que UM bloco
// seja sempre mais largo que a viewport (senão sobra um vão vazio no loop).
function MarqueeBlock({
  terms,
  repeat = 1,
  ariaHidden = false,
}: {
  terms: string[];
  repeat?: number;
  ariaHidden?: boolean;
}) {
  const items = Array.from({ length: repeat }, () => terms).flat();
  return (
    <div className="lp-method-marquee-item" aria-hidden={ariaHidden || undefined}>
      {items.map((term, i) => (
        <Fragment key={`${term}-${i}`}>
          <span className="lp-method-term">{term}</span>
          <Eyes variant={i % 4} />
        </Fragment>
      ))}
    </div>
  );
}

interface MethodMarqueeProps {
  /** Termos exibidos no marquee. Default = método ECO (usado na home). */
  terms?: string[];
  /** Rótulo acessível da seção. */
  ariaLabel?: string;
  /** Classe extra para variar o visual (ex.: "lp-method-marquee--starry"). */
  className?: string;
  /**
   * Quantas vezes a lista de termos é repetida dentro de cada bloco.
   * Use > 1 quando houver poucos termos curtos, para o bloco exceder a tela
   * e o loop não deixar vãos vazios.
   */
  repeat?: number;
}

export default function MethodMarquee({
  terms = DEFAULT_TERMS,
  ariaLabel = 'O método ECO em frases',
  className = '',
  repeat = 1,
}: MethodMarqueeProps = {}) {
  return (
    <section className={`lp-method-marquee ${className}`.trim()} aria-label={ariaLabel}>
      <div className="lp-method-marquee-track">
        <MarqueeBlock terms={terms} repeat={repeat} />
        <MarqueeBlock terms={terms} repeat={repeat} ariaHidden />
      </div>
    </section>
  );
}
