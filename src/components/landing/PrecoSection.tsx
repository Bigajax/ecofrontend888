import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useHeadlineVariant } from '@/hooks/useHeadlineVariant';
import { useSectionInView } from './useSectionInView';
import { trackLandingCta } from './trackLandingCta';

const FEATURES_FULL = [
  'Eco AI ilimitada · diálogo socrático',
  'Cinco Anéis · ritual diário de 5 min',
  'Diário Estoico · 366 lições',
  'Protocolo do Sono · 7 noites',
  'Jornadas Dispenza em português',
  'Eco Dream · interpretação de sonhos',
  '7 dias gratuitos · cancele em 1 clique',
];

const FEATURES_MONTHLY = [
  'Acesso completo ao método',
  'Sem fidelidade',
  '7 dias gratuitos',
];

interface Props {
  sectionId?: 'pricing' | 'pricing_page';
  from?: string;
  withHeader?: boolean;
}

export default function PrecoSection({
  sectionId = 'pricing',
  from = 'pricing',
  withHeader = true,
}: Props) {
  const { variant } = useHeadlineVariant();
  const ref = useSectionInView(sectionId, variant);

  const cta = (plan: 'monthly' | 'annual') =>
    trackLandingCta({ section: sectionId, plan, from, headline_variant: variant });

  return (
    <section ref={ref} id="preco" className="lp-pricing">
      {withHeader && (
        <>
          <h2 className="scroll-reveal">Um preço. Tudo incluído.</h2>
          <p className="lp-pricing-sub scroll-reveal">
            7 dias gratuitos. Cancele em 1 clique. Sem fidelidade.
          </p>
        </>
      )}

      <div className="lp-pricing-grid">
        <article className="lp-pricing-card scroll-reveal stagger-1">
          <h3>Plano Mensal</h3>
          <div className="lp-pricing-value">
            R$ 27<sub>/mês</sub>
          </div>
          <p className="lp-pricing-note">Renovação mensal · cancele quando quiser</p>
          <ul>
            {FEATURES_MONTHLY.map((f) => (
              <li key={f}>
                <Check size={14} strokeWidth={2.25} color="var(--lp-accent-strong)" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <Link
            to="/register?plan=monthly&from=pricing"
            className="cta-dark"
            onClick={() => cta('monthly')}
            style={{ width: '100%' }}
          >
            Começar
          </Link>
        </article>

        <article className="lp-pricing-card is-featured scroll-reveal stagger-2">
          <span className="lp-pricing-badge">Mais escolhido</span>
          <h3>Plano Anual</h3>
          <div className="lp-pricing-value">
            R$ 16,40<sub>/mês</sub>
          </div>
          <p className="lp-pricing-note">
            R$ 197 cobrado anualmente · economize R$ 127
          </p>
          <ul>
            {FEATURES_FULL.map((f) => (
              <li key={f}>
                <Check size={14} strokeWidth={2.25} color="var(--eco-baby)" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <Link
            to="/register?plan=annual&from=pricing"
            className="cta-primary"
            onClick={() => cta('annual')}
            style={{ width: '100%' }}
          >
            Começar 7 dias gratuitos
          </Link>
        </article>
      </div>
    </section>
  );
}
