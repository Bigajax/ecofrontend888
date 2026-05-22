import { Link } from 'react-router-dom';
import { useHeadlineVariant } from '@/hooks/useHeadlineVariant';
import { useSectionInView } from './useSectionInView';
import { trackLandingCta } from './trackLandingCta';

export default function JoinSection() {
  const { variant } = useHeadlineVariant();
  const ref = useSectionInView('join', variant);

  return (
    <section ref={ref} className="lp-join">
      <div className="lp-join-inner">
        <h2 className="lp-join-title scroll-reveal">
          Comece sua jornada
          <br />
          com o Ecotopia hoje
        </h2>

        <p className="lp-join-sub scroll-reveal">
          Um espaço para conversar, refletir e voltar pra si — no seu tempo,
          no seu ritmo.
        </p>

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
            <div className="lp-join-stat-big">Português</div>
            <div className="lp-join-stat-label">Conteúdo 100% no seu idioma</div>
          </div>
          <div className="lp-join-stat">
            <div className="lp-join-stat-big">Método</div>
            <div className="lp-join-stat-label">
              Baseado em estoicismo, psicologia existencial e diálogo socrático
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
