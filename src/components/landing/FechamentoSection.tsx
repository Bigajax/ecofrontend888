import { Link } from 'react-router-dom';
import { useHeadlineVariant } from '@/hooks/useHeadlineVariant';
import { useSectionInView } from './useSectionInView';
import { trackLandingCta } from './trackLandingCta';

// ─── SVGs decorativos ───────────────────────────────────────────────────────

const Rainbow = () => (
  <svg viewBox="0 0 600 320" width="100%" height="100%" aria-hidden="true">
    <path d="M 60 320 A 240 240 0 0 1 540 320 Z" fill="#FFA1CC" />
    <path d="M 110 320 A 190 190 0 0 1 490 320 Z" fill="#5EC8FF" />
    <path d="M 160 320 A 140 140 0 0 1 440 320 Z" fill="#2E8C4E" />
    <path d="M 210 320 A 90 90 0 0 1 390 320 Z" fill="#F58A2E" />
    <path d="M 250 320 A 50 50 0 0 1 350 320 Z" fill="#E64242" />
  </svg>
);

const Cloud = ({ color = '#FFFFFF' }: { color?: string }) => (
  <svg viewBox="0 0 100 60" width="100%" height="100%" aria-hidden="true">
    <ellipse cx="30" cy="40" rx="22" ry="16" fill={color} />
    <ellipse cx="55" cy="34" rx="26" ry="20" fill={color} />
    <ellipse cx="78" cy="42" rx="18" ry="14" fill={color} />
  </svg>
);

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
          <span className="lp-fechamento-cloud lp-fechamento-cloud--left">
            <Cloud />
          </span>
          <span className="lp-fechamento-cloud lp-fechamento-cloud--right">
            <Cloud />
          </span>
          <span className="lp-fechamento-sparkle lp-fechamento-sparkle--a">
            <Sparkle />
          </span>
          <span className="lp-fechamento-sparkle lp-fechamento-sparkle--b">
            <Sparkle />
          </span>
          <div className="lp-fechamento-rainbow">
            <Rainbow />
          </div>
        </div>
      </div>
    </section>
  );
}
