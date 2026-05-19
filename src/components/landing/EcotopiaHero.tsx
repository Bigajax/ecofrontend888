import { Link } from 'react-router-dom';
import { useHeadlineVariant } from '@/hooks/useHeadlineVariant';
import { useSectionInView } from './useSectionInView';
import { trackLandingCta } from './trackLandingCta';

export default function EcotopiaHero() {
  const { variant } = useHeadlineVariant();
  const ref = useSectionInView('hero', variant);

  // Split do headline em 2 linhas
  const splitH1 = variant === '2'
    ? { line1: 'Pare de carregar', line2: 'tudo com Ecotopia' }
    : { line1: 'Conheça-se', line2: 'tudo com Ecotopia' };

  return (
    <section id="topo" ref={ref} className="lp-hero">
      <h1 className="reveal-soft">
        <span>{splitH1.line1}</span>
        <span>{splitH1.line2}</span>
      </h1>

      <div className="lp-hero-cards">
        <div className="lp-hero-card reveal-soft animation-delay-100">
          <h2>
            Aplicativo de autoconhecimento com<br />
            Eco AI, ritual diário e biblioteca filosófica
          </h2>
          <Link
            to="/register?plan=annual&from=hero_card1"
            className="cta-dark"
            onClick={() =>
              trackLandingCta({
                section: 'hero',
                plan: 'annual',
                from: 'hero_card1',
                headline_variant: variant,
              })
            }
          >
            Experimente por R$ 0
          </Link>
          <div
            className="lp-hero-placeholder"
            style={{
              backgroundImage: 'url(/images/5-aneis-hero.webp)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        </div>

        <div className="lp-hero-card reveal-soft animation-delay-200">
          <h2>
            Diário Estoico
            <br />
            366 lições filosóficas
          </h2>
          <Link
            to="/register?plan=annual&from=hero_card2"
            className="cta-dark"
            onClick={() =>
              trackLandingCta({
                section: 'hero',
                plan: 'annual',
                from: 'hero_card2',
                headline_variant: variant,
              })
            }
          >
            Começar hoje
          </Link>
          <div
            className="lp-hero-placeholder"
            style={{
              backgroundImage: 'url(/images/diario-estoico.webp)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        </div>
      </div>
    </section>
  );
}
