import { Link } from 'react-router-dom';
import { useHeadlineVariant } from '@/hooks/useHeadlineVariant';
import { useSectionInView } from './useSectionInView';
import { trackLandingCta } from './trackLandingCta';

export default function JoinSection() {
  const { variant } = useHeadlineVariant();
  const ref = useSectionInView('join', variant);

  return (
    <section ref={ref} className="lp-join">
      {/* Avatares decorativos espalhados */}
      <span className="lp-join-avatar lp-join-avatar--a1" aria-hidden="true">R</span>
      <span className="lp-join-avatar lp-join-avatar--a2" aria-hidden="true">M</span>
      <span className="lp-join-avatar lp-join-avatar--a3" aria-hidden="true">A</span>
      <span className="lp-join-avatar lp-join-avatar--a4" aria-hidden="true">J</span>

      <div className="lp-join-inner">
        <div className="lp-join-meditating" aria-label="Pessoas meditando agora">
          <span className="lp-join-dots">
            <span /><span /><span />
          </span>
          <b>12.4k</b>&nbsp;<em>meditando agora</em>
        </div>

        <h2 className="lp-join-title scroll-reveal">
          Junte-se a milhares
          <br />
          que usam o ECO todos os dias
        </h2>

        <Link
          to="/register?plan=annual&from=join_section"
          className="lp-join-cta scroll-reveal"
          onClick={() =>
            trackLandingCta({
              section: 'join',
              plan: 'annual',
              from: 'join_section',
              headline_variant: variant,
            })
          }
        >
          Experimentar grátis
        </Link>

        <div className="lp-join-stats scroll-reveal">
          <div className="lp-join-stat">
            <div className="lp-join-stars" aria-label="4.9 de 5 estrelas">★★★★★</div>
            <div className="lp-join-stat-label">Avaliação 4.9 na App Store</div>
          </div>
          <div className="lp-join-stat">
            <div className="lp-join-stat-big">PT-BR</div>
            <div className="lp-join-stat-label">Conteúdo 100% em português brasileiro</div>
          </div>
          <div className="lp-join-stat">
            <div className="lp-join-stat-big" aria-hidden="true">Método</div>
            <div className="lp-join-stat-label">
              Baseado em estoicismo, psicologia existencial e diálogo socrático
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
