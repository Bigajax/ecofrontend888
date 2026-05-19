import { Link } from 'react-router-dom';
import { useHeadlineVariant } from '@/hooks/useHeadlineVariant';
import { useSectionInView } from './useSectionInView';
import { trackLandingCta } from './trackLandingCta';

// 4 destaques alternados (cores diferentes) + título da biblioteca filosófica
export default function BibliotecaPraticasSection() {
  const { variant } = useHeadlineVariant();
  const ref = useSectionInView('biblioteca', variant);

  const cta = (from: string) =>
    trackLandingCta({
      section: 'biblioteca',
      plan: 'annual',
      from,
      headline_variant: variant,
    });

  return (
    <div ref={ref}>
      {/* 2 · Biblioteca filosófica (rosa) — blob esquerda */}
      <section className="lp-feature lp-feature-pink scroll-reveal">
        <div className="lp-blob lp-blob-moon" aria-hidden />
        <div>
          <h2>Biblioteca filosófica</h2>
          <p>
            Explore 366 lições estoicas de Marco Aurélio, Sêneca e Epicteto. Interpretação de
            sonhos com Jung e Freud. Sempre disponíveis, sempre em português.
          </p>
          <Link
            to="/register?plan=annual&from=feature_biblioteca"
            className="cta-dark"
            onClick={() => cta('feature_biblioteca')}
          >
            Abrir o Diário
          </Link>
        </div>
      </section>

      {/* 3 · Protocolo do Sono (lilás) — blob direita */}
      <section className="lp-feature lp-feature-lilac scroll-reveal">
        <div>
          <h2>Protocolo do Sono</h2>
          <p>
            7 noites de áudios guiados que reeducam seu sistema nervoso. Sem técnica pra
            decorar, sem app pra configurar — você aperta play e dorme.
          </p>
          <Link
            to="/register?plan=annual&from=feature_sono"
            className="cta-dark"
            onClick={() => cta('feature_sono')}
          >
            Explorar o protocolo
          </Link>
        </div>
        <div className="lp-blob lp-blob-cloud" aria-hidden />
      </section>

      {/* 4 · Cinco Anéis (azul claro) — blob esquerda */}
      <section className="lp-feature lp-feature-skyblue scroll-reveal">
        <div className="lp-blob lp-blob-leaf" aria-hidden />
        <div>
          <h2>Cinco Anéis da Disciplina</h2>
          <p>
            Cinco minutos por dia. Terra, Água, Fogo, Vento, Vazio. Um ritual de Musashi
            traduzido para o cotidiano. Sustenta o resto da semana.
          </p>
          <Link
            to="/register?plan=annual&from=feature_aneis"
            className="cta-dark"
            onClick={() => cta('feature_aneis')}
          >
            Começar o ritual
          </Link>
        </div>
      </section>

      {/* 5 · Jornadas Dispenza (amarelo) — blob direita */}
      <section className="lp-feature lp-feature-yellow scroll-reveal">
        <div>
          <h2>Jornadas Dispenza</h2>
          <p>
            Meditações guiadas no estilo do Dr. Joe Dispenza. Em português, sem espera por
            tradução. Para recondicionar corpo-mente e sintonizar novos potenciais.
          </p>
          <Link
            to="/register?plan=annual&from=feature_dispenza"
            className="cta-dark"
            onClick={() => cta('feature_dispenza')}
          >
            Acessar agora
          </Link>
        </div>
        <div className="lp-blob lp-blob-fire" aria-hidden />
      </section>
    </div>
  );
}
