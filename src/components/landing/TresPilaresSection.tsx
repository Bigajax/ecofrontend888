import { Link } from 'react-router-dom';
import { useHeadlineVariant } from '@/hooks/useHeadlineVariant';
import { trackLandingCta } from './trackLandingCta';

// Título de seção + primeiro destaque (Eco AI amarelo)
export default function TresPilaresSection() {
  const { variant } = useHeadlineVariant();

  return (
    <>
      <h2 className="lp-section-title scroll-reveal">
        O método para cada momento
      </h2>

      <section className="lp-feature lp-feature-yellow scroll-reveal">
        <div>
          <h2>Diálogo com Eco AI</h2>
          <p>
            Uma IA treinada para fazer as perguntas certas — não para te dar respostas
            prontas. Diálogo socrático em português, 24 horas por dia. Construído sobre Jung,
            Freud, estoicismo e neurociência.
          </p>
          <Link
            to="/register?plan=annual&from=feature_ecoai"
            className="cta-light"
            onClick={() =>
              trackLandingCta({
                section: 'biblioteca',
                plan: 'annual',
                from: 'feature_ecoai',
                headline_variant: variant,
              })
            }
          >
            Conversar com a Eco
          </Link>
        </div>
        <div className="lp-blob lp-blob-sun" aria-hidden />
      </section>
    </>
  );
}
