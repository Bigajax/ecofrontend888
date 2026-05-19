import { Link } from 'react-router-dom';
import { useHeadlineVariant } from '@/hooks/useHeadlineVariant';
import { useSectionInView } from './useSectionInView';
import { trackLandingCta } from './trackLandingCta';

export default function FechamentoSection() {
  const { variant } = useHeadlineVariant();
  const ref = useSectionInView('fechamento', variant);

  return (
    <section ref={ref} className="lp-cta-banner scroll-reveal">
      <div>
        <h2>
          Comece sua prática hoje.
          <br />
          Cancele amanhã se não fizer sentido.
        </h2>
        <p>
          7 dias gratuitos. Cartão pedido no cadastro, cobrança apenas no 8º dia. Cancele em 1
          clique.
        </p>
        <div className="lp-cta-actions">
          <Link
            to="/register?plan=annual&from=fechamento"
            className="cta-light"
            onClick={() =>
              trackLandingCta({
                section: 'fechamento',
                plan: 'annual',
                from: 'fechamento',
                headline_variant: variant,
              })
            }
          >
            Começar 7 dias gratuitos
          </Link>
          <Link to="/precos" className="cta-outline">
            Ver os planos
          </Link>
        </div>
      </div>
      <div
        style={{
          minHeight: '280px',
          borderRadius: '18px',
          background:
            'linear-gradient(135deg, #7FA9FF 0%, #3B6EF0 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
        aria-hidden
      >
        <img
          src="/images/5-aneis-hero.webp"
          alt=""
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            mixBlendMode: 'overlay',
            opacity: 0.55,
          }}
        />
      </div>
    </section>
  );
}
