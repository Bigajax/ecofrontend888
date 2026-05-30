import { useHeadlineVariant } from '@/hooks/useHeadlineVariant';
import { useSectionInView } from './useSectionInView';

export default function EmpresasSection() {
  const { variant } = useHeadlineVariant();
  const ref = useSectionInView('empresas', variant);

  return (
    <section ref={ref} id="empresas" className="lp-empresas">
      <div className="lp-empresas-card">
        <div className="lp-empresas-body">
          <h2 className="lp-empresas-title scroll-reveal">
            Para equipes que cuidam de pessoas.
          </h2>
          <p className="lp-empresas-text scroll-reveal">
            Bem-estar emocional prático para o seu time. Eco IA, Diário Estoico,
            meditações e práticas guiadas em uma única plataforma.
          </p>
          <div className="lp-empresas-actions">
            <span
              className="lp-empresas-cta lp-empresas-cta--primary lp-empresas-cta--static"
              aria-hidden="true"
            >
              Solicitar demonstração
            </span>
            <span
              className="lp-empresas-cta lp-empresas-cta--ghost lp-empresas-cta--static"
              aria-hidden="true"
            >
              Saber mais
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
