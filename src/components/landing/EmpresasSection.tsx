import { Link } from 'react-router-dom';
import { useHeadlineVariant } from '@/hooks/useHeadlineVariant';
import { useSectionInView } from './useSectionInView';
import { trackLandingCta } from './trackLandingCta';

export default function EmpresasSection() {
  const { variant } = useHeadlineVariant();
  const ref = useSectionInView('empresas', variant);

  return (
    <section ref={ref} id="empresas" className="lp-empresas">
      <div className="lp-empresas-card">
        <div className="lp-empresas-body">
          <h2 className="lp-empresas-title scroll-reveal">
            Para equipes que cuidam
            <br />
            das pessoas que cuidam
          </h2>
          <p className="lp-empresas-text scroll-reveal">
            Bem-estar emocional prático para o seu time. Em português, com método.
            Eco IA, Diário Estoico e biblioteca filosófica em um único acesso.
          </p>
          <div className="lp-empresas-actions">
            <Link
              to="/contato?from=empresas_demo"
              className="lp-empresas-cta lp-empresas-cta--primary"
              onClick={() =>
                trackLandingCta({
                  section: 'empresas',
                  plan: 'b2b',
                  from: 'empresas_demo',
                  headline_variant: variant,
                })
              }
            >
              Solicitar demonstração
            </Link>
            <Link
              to="/empresas?from=empresas_saber_mais"
              className="lp-empresas-cta lp-empresas-cta--ghost"
              onClick={() =>
                trackLandingCta({
                  section: 'empresas',
                  plan: 'b2b',
                  from: 'empresas_saber_mais',
                  headline_variant: variant,
                })
              }
            >
              Saber mais
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
