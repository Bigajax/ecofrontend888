import { Link } from 'react-router-dom';
import { Languages, Sparkles, Gift } from 'lucide-react';
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
          Junte-se a quem escolheu
          <br />
          cuidar da mente todos os dias
        </h2>

        <p className="lp-join-sub scroll-reveal">
          Meditações guiadas, Eco IA, sono, Diário Estoico e práticas para uma
          vida mais equilibrada.
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
            <span className="lp-join-stat-icon">
              <Languages size={22} strokeWidth={2} />
            </span>
            <div className="lp-join-stat-big">Conteúdo em português</div>
          </div>
          <div className="lp-join-stat">
            <span className="lp-join-stat-icon">
              <Sparkles size={22} strokeWidth={2} />
            </span>
            <div className="lp-join-stat-big">Acesso completo</div>
          </div>
          <div className="lp-join-stat">
            <span className="lp-join-stat-icon">
              <Gift size={22} strokeWidth={2} />
            </span>
            <div className="lp-join-stat-big">7 dias grátis</div>
          </div>
        </div>
      </div>
    </section>
  );
}
