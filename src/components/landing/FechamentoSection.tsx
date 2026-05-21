import { Link } from 'react-router-dom';
import { useHeadlineVariant } from '@/hooks/useHeadlineVariant';
import { useSectionInView } from './useSectionInView';
import { trackLandingCta } from './trackLandingCta';

// ─── SVGs decorativos ───────────────────────────────────────────────────────

const Sparkle = ({ color = '#FFFFFF' }: { color?: string }) => (
  <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true">
    <path d="M12 0 L14 9 L24 12 L14 15 L12 24 L10 15 L0 12 L10 9 Z" fill={color} />
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────

export default function FechamentoSection() {
  const { variant } = useHeadlineVariant();
  const ref = useSectionInView('fechamento_final', variant);

  return (
    <section ref={ref} className="lp-fechamento" aria-labelledby="fechamento-cta">
      <div className="lp-fechamento-inner">
        <Link
          to="/register?plan=annual&from=fechamento_rainbow"
          id="fechamento-cta"
          className="lp-fechamento-cta"
          onClick={() =>
            trackLandingCta({
              section: 'fechamento_final',
              plan: 'annual',
              from: 'fechamento_rainbow',
              headline_variant: variant,
            })
          }
        >
          Prepare-se para o impacto
        </Link>

        <div className="lp-fechamento-scene" aria-hidden="true">
          <span className="lp-fechamento-sparkle lp-fechamento-sparkle--a">
            <Sparkle />
          </span>
          <span className="lp-fechamento-sparkle lp-fechamento-sparkle--b">
            <Sparkle />
          </span>
        </div>
      </div>
    </section>
  );
}
