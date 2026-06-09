import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import '@/ecotopia-landing.css';
import EcotopiaTopbar from '@/components/landing/EcotopiaTopbar';
import EcotopiaFooter from '@/components/landing/EcotopiaFooter';
import { useScrollReveal } from '@/components/landing/useScrollReveal';
import mixpanel from '@/lib/mixpanel';

// Sessões reais do programa "Inicie Sua Jornada"
// (src/pages/IntroducaoMeditacaoPage.tsx · INITIAL_MEDITATIONS).
// Sem overlay tonal — a foto aparece na cor real; o ::after escuro
// já presente em .lp-med-library-card garante a legibilidade do texto.
const PRIMEIRO_PASSO_MEDITATIONS = [
  {
    id: 'intro_1',
    title: 'Primeiros passos',
    description: '5 minutos para entender o que acontece quando você para.',
    duration: '5 min',
    image: 'url("/images/meditacao-introducao.webp")',
    imagePosition: 'center 32%',
  },
  {
    id: 'intro_2',
    title: 'Observando a respiração',
    description: 'Sua respiração sempre esteve lá. Agora você vai ouvi-la.',
    duration: '4 min',
    image: 'url("/images/observando-respiracao.webp")',
    imagePosition: 'center 32%',
  },
  {
    id: 'intro_3',
    title: 'Sentindo',
    description: 'O que o seu corpo sente quando a mente para de falar?',
    duration: '4 min',
    image: 'url("/images/sentindo.webp")',
    imagePosition: 'center 32%',
  },
  {
    id: 'intro_4',
    title: 'Desacelerando e relaxando',
    description: 'Para o dia que não quer terminar. 8 min para soltar tudo.',
    duration: '8 min',
    image: 'url("/images/meditacao-introducao.webp")',
    imagePosition: 'center 32%',
  },
];

const EXPLORE_COLUMNS = [
  {
    key: 'beneficios',
    title: 'Benefícios da meditação',
    body: 'A meditação como uma prática simples que ajuda a cuidar da mente e a melhorar a saúde mental. Descubra os benefícios da prática regular.',
    links: [
      { label: 'E se eu não notar os benefícios da meditação imediatamente?', from: 'beneficios_imediato' },
      { label: 'Meditação e o estresse', from: 'beneficios_estresse' },
      { label: 'Meditação para a tristeza', from: 'beneficios_tristeza' },
      { label: 'Meditação para autocompaixão', from: 'beneficios_autocompaixao' },
      { label: 'Meditação para autoestima', from: 'beneficios_autoestima' },
    ],
  },
  {
    key: 'como',
    title: 'Como meditar',
    body: 'Você não precisa estar em melhores mãos quando se trata de meditação. Veja as orientações e dicas mais recentes para começar sua prática.',
    links: [
      { label: 'Qual a diferença entre pensar e meditar?', from: 'como_pensar_vs_meditar' },
      { label: 'O que é a Técnica de Anotação? E como tirar proveito dela', from: 'como_tecnica_anotacao' },
    ],
  },
  {
    key: 'guiadas',
    title: 'Meditações guiadas',
    body: 'Por meio de cursos, exercícios individuais e sessões rápidas, os instrutores da Ecotopia oferecem meditações guiadas para te ajudar a lidar com qualquer desafio que a vida te apresentar.',
    links: [
      { label: 'Meditação de escaneamento corporal da gratidão', from: 'guiadas_gratidao' },
      { label: 'Meditação para o estresse', from: 'guiadas_estresse' },
      { label: 'Meditação durante a corrida', from: 'guiadas_corrida' },
    ],
  },
];

export default function EcotopiaMeditacaoPage() {
  useScrollReveal('.ecotopia-lp');

  const [selectedOfferPlan, setSelectedOfferPlan] = useState<'annual' | 'monthly'>('annual');

  useEffect(() => {
    try {
      mixpanel.track('Landing · Vista', { pagina: 'meditacao' });
    } catch {
      // noop
    }
  }, []);

  // Smooth scroll para âncoras (#guia, #beneficios) ao chegar via link do mega menu
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    const el = document.querySelector(hash);
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

  // Carrossel dos bites · controles prev/next + estado de borda
  const bitesRailRef = useRef<HTMLDivElement>(null);
  const [bitesCanPrev, setBitesCanPrev] = useState(false);
  const [bitesCanNext, setBitesCanNext] = useState(true);

  const scrollBites = (dir: 'prev' | 'next') => {
    if (!bitesRailRef.current) return;
    bitesRailRef.current.scrollBy({
      left: dir === 'next' ? 340 : -340,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    const el = bitesRailRef.current;
    if (!el) return;
    const update = () => {
      const maxScroll = el.scrollWidth - el.clientWidth;
      setBitesCanPrev(el.scrollLeft > 4);
      setBitesCanNext(el.scrollLeft < maxScroll - 4);
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, []);

  return (
    <div className="ecotopia-lp">
      <EcotopiaTopbar />

      {/* ─── Hero · Meditação simplificada ─── */}
      <section
        className="lp-med-hero"
        style={{
          backgroundImage: 'url("/images/meditacao-hero-sphere.webp")',
        }}
      >
        <span className="lp-med-hero-veil" aria-hidden />

        <div className="lp-med-hero-inner">
          <h1 className="scroll-reveal">Meditação simplificada</h1>

          <p className="lp-med-hero-lead scroll-reveal stagger-1">
            Trilhas guiadas para te ajudar a lidar com os momentos mais desafiadores
            da vida.
          </p>

          <p className="lp-med-hero-body scroll-reveal stagger-2">
            Meditar é uma habilidade para a vida. Ao usar as trilhas da Ecotopia, você
            aprende a estar mais presente em tudo o que faz. E com a prática, os
            benefícios da meditação são sentidos ao longo do tempo, à medida que você
            se sente mais lúcido, calmo, gentil consigo mesmo e mais perspicaz.
          </p>

          <div
            className="lp-med-hero-player scroll-reveal stagger-3"
            role="group"
            aria-label="Amostra de meditação"
          >
            <button
              type="button"
              className="lp-med-hero-play"
              aria-label="Pré-escutar amostra"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M7 5.5v13a1 1 0 0 0 1.55.83l10-6.5a1 1 0 0 0 0-1.66l-10-6.5A1 1 0 0 0 7 5.5z" />
              </svg>
            </button>
            <div className="lp-med-hero-player-body">
              <p className="lp-med-hero-player-title">
                Bênção dos Centros de Energia · 7 min
              </p>
              <div className="lp-med-hero-player-bar" aria-hidden>
                <span className="lp-med-hero-player-progress" />
                <span className="lp-med-hero-player-dot" />
              </div>
              <div className="lp-med-hero-player-time">
                <span>0:00</span>
                <span>7:00</span>
              </div>
            </div>
          </div>

          <Link
            to="/assinar?step=plan&from=meditacao_hero"
            className="cta-primary lp-med-hero-cta scroll-reveal stagger-4"
          >
            Experimente grátis
          </Link>
        </div>
      </section>

      {/* ─── Caminhos com mais profundidade (estilo Headspace) ─── */}
      <section className="lp-med-bites-section">
        <div className="lp-med-bites" ref={bitesRailRef}>
          <article className="lp-med-bite scroll-reveal">
            <div className="lp-med-bite-icon lp-med-bite-icon--doses">
              <img
                src="/images/meditacao-bite-doses.webp"
                alt=""
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
                loading="lazy"
              />
            </div>
            <h3 className="lp-med-bite-title">
              <Link to="/assinar?step=plan&plan=annual&from=meditacao_bite_doses">
                Meditações em pequenas doses
              </Link>
            </h3>
            <p className="lp-med-bite-desc">
              Às vezes, tudo o que precisamos é de uma pausa para recarregar as
              energias. Temos meditações rápidas para ajudar você a começar bem
              o dia, respirar fundo ou simplesmente relaxar.
            </p>
          </article>

          <article className="lp-med-bite scroll-reveal stagger-1">
            <div className="lp-med-bite-icon lp-med-bite-icon--iniciantes">
              <img
                src="/images/meditacao-bite-iniciantes.webp"
                alt=""
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
                loading="lazy"
              />
            </div>
            <h3 className="lp-med-bite-title">
              <Link to="/assinar?step=plan&plan=annual&from=meditacao_bite_iniciantes">
                Meditação para iniciantes: cursos e vídeos para começar sua jornada
              </Link>
            </h3>
            <p className="lp-med-bite-desc">
              Meditação para todas as idades e níveis. O curso Básico é para qualquer
              adulto que esteja começando ou renovando sua prática. O nível Avançado
              é para meditadores experientes. E a coleção "Meditação para Crianças"
              é para os pequenos, para ajudá-los com as emoções, relaxamento e na
              hora de dormir.
            </p>
          </article>

          <article className="lp-med-bite scroll-reveal stagger-2">
            <div className="lp-med-bite-icon lp-med-bite-icon--ciencia">
              <img
                src="/images/meditacao-bite-ciencia.webp"
                alt=""
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
                loading="lazy"
              />
            </div>
            <h3 className="lp-med-bite-title">
              <Link to="/assinar?step=plan&plan=annual&from=meditacao_bite_ciencia">
                Benefícios comprovados cientificamente
              </Link>
            </h3>
            <p className="lp-med-bite-desc">
              A eficácia das nossas trilhas guiadas é sustentada por estudos baseados
              em evidências. Uma prática regular reduz marcadores fisiológicos de
              estresse, melhora a qualidade do sono e amplia a capacidade de foco.
            </p>
          </article>

          <article className="lp-med-bite scroll-reveal stagger-3">
            <div className="lp-med-bite-icon lp-med-bite-icon--mindfulness">
              <img
                src="/images/meditacao-bite-mindfulness.webp"
                alt=""
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
                loading="lazy"
              />
            </div>
            <h3 className="lp-med-bite-title">
              <Link to="/assinar?step=plan&plan=annual&from=meditacao_bite_mindfulness">
                Pratique meditação mindfulness
              </Link>
            </h3>
            <p className="lp-med-bite-desc">
              Mindfulness é a prática de notar o presente sem julgar. A Ecotopia
              oferece trilhas guiadas que te ajudam a desenvolver essa atenção plena —
              começando por exercícios curtos de respiração, escaneamento corporal
              e observação dos pensamentos.
            </p>
          </article>

          <article className="lp-med-bite scroll-reveal stagger-4">
            <div className="lp-med-bite-icon lp-med-bite-icon--tecnicas">
              <img
                src="/images/meditacao-bite-tecnicas.webp"
                alt=""
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
                loading="lazy"
              />
            </div>
            <h3 className="lp-med-bite-title">
              <Link to="/assinar?step=plan&plan=annual&from=meditacao_bite_tecnicas">
                Técnicas de meditação
              </Link>
            </h3>
            <p className="lp-med-bite-desc">
              Cada pessoa se conecta de um jeito. Guiada ou em silêncio? Escaneamento
              corporal ou visualização? Respiração lenta ou repetição de mantra? A
              Ecotopia reúne as principais técnicas para que você descubra qual
              ressoa com o seu momento.
            </p>
          </article>

          <article className="lp-med-bite scroll-reveal">
            <div className="lp-med-bite-icon lp-med-bite-icon--passo">
              <img
                src="/images/meditacao-bite-passo.webp"
                alt=""
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
                loading="lazy"
              />
            </div>
            <h3 className="lp-med-bite-title">
              <Link to="/assinar?step=plan&plan=annual&from=meditacao_bite_passo">
                O que é meditação: passo a passo
              </Link>
            </h3>
            <p className="lp-med-bite-desc">
              Nunca meditou antes? Sem preocupação. A Ecotopia te conduz por cada
              componente da prática — postura, respiração, foco — até que meditar
              se torne parte natural do seu dia.
            </p>
          </article>
        </div>

        <div className="lp-med-bites-controls">
          <button
            type="button"
            className="lp-med-bites-arrow"
            onClick={() => scrollBites('prev')}
            disabled={!bitesCanPrev}
            aria-label="Anterior"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            type="button"
            className="lp-med-bites-arrow"
            onClick={() => scrollBites('next')}
            disabled={!bitesCanNext}
            aria-label="Próximo"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        <div className="lp-med-bites-cta-wrap">
          <Link
            to="/assinar?step=plan&from=meditacao_bites_cta"
            className="cta-primary lp-med-bites-cta"
          >
            Experimente grátis
          </Link>
        </div>
      </section>

      {/* ─── Explore (3 colunas estilo Headspace) ─── */}
      <section id="beneficios" className="lp-med-explore-section">
        <h2 className="lp-med-explore-title scroll-reveal">
          Meditações para qualquer mente, qualquer estado de espírito, qualquer objetivo.
        </h2>

        <div className="lp-med-explore-grid">
          {EXPLORE_COLUMNS.map((col, i) => (
            <div
              key={col.key}
              className={`lp-med-explore-col scroll-reveal stagger-${i + 1}`}
            >
              <h3 className="lp-med-explore-heading">
                <Link to={`/assinar?step=plan&plan=annual&from=meditacao_explore_${col.key}`}>
                  {col.title}
                </Link>
              </h3>
              <p className="lp-med-explore-body">{col.body}</p>
              <ul className="lp-med-explore-links">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link to={`/assinar?step=plan&plan=annual&from=meditacao_explore_${link.from}`}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Conteúdo de meditação ─── */}
      <section className="lp-med-library-section">
        <div className="lp-med-library-head scroll-reveal">
          <h2>Conteúdo de meditação</h2>
          <p>Meditações para ajudar nos momentos mais desafiadores da vida.</p>
        </div>

        <div className="lp-med-library-grid">
          {PRIMEIRO_PASSO_MEDITATIONS.map((m, i) => (
            <div
              key={m.id}
              className={`lp-med-library-card scroll-reveal stagger-${(i % 4) + 1}`}
              style={{
                backgroundImage: m.image,
                backgroundPosition: m.imagePosition,
                backgroundSize: 'cover',
                cursor: 'default',
              }}
            >
              <div className="lp-med-library-body">
                <span className="lp-med-library-duration">{m.duration}</span>
                <h3>{m.title}</h3>
                <p>{m.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="lp-med-library-foot scroll-reveal">
          <Link
            to="/assinar?step=plan&plan=annual&from=meditacao_library_all"
            className="lp-med-library-all"
          >
            Ver biblioteca completa →
          </Link>
        </div>
      </section>

      {/* ─── Oferta · estilo navy (copiado do /sono) ─── */}
      <section className="lp-sono-offer">
        <div className="lp-sono-offer-bg" aria-hidden />

        <div className="lp-sono-offer-inner">
          <div className="lp-sono-offer-content">
            <h2 className="scroll-reveal">Cuide da sua mente todos os dias.</h2>

            <ul className="lp-sono-offer-bullets scroll-reveal stagger-1">
              <li>
                <OfferCheck />
                <span>
                  Acesse o método completo: Eco AI ilimitada, Cinco Anéis, Diário
                  Estoico com 366 lições e as Jornadas Dispenza em português.
                </span>
              </li>
              <li>
                <OfferCheck />
                <span>
                  Prepare sua mente para dormir com o Protocolo do Sono de 7 noites
                  e o Eco Dream — interpretação de sonhos por IA.
                </span>
              </li>
              <li>
                <OfferCheck />
                <span>
                  Incorpore a atenção plena à sua rotina com o ritual diário de 5
                  minutos, sessões curtas de respiração e práticas de mindfulness.
                </span>
              </li>
            </ul>

            <div
              className="lp-sono-offer-plans scroll-reveal stagger-2"
              role="radiogroup"
              aria-label="Escolha seu plano"
            >
              <button
                type="button"
                role="radio"
                aria-checked={selectedOfferPlan === 'annual'}
                onClick={() => setSelectedOfferPlan('annual')}
                className={`lp-sono-offer-plan ${selectedOfferPlan === 'annual' ? 'is-featured' : ''}`}
              >
                <span className="lp-sono-offer-plan-badge">Melhor custo-benefício</span>
                <span className="lp-sono-offer-plan-meta">
                  Anual · cobrado a R$ 142,80/ano
                </span>
                <strong className="lp-sono-offer-plan-headline">7 dias gratuitos</strong>
                <span className="lp-sono-offer-plan-price">R$ 11,90 por mês</span>
                <span
                  className={`lp-sono-offer-plan-radio ${selectedOfferPlan === 'annual' ? '' : 'is-empty'}`}
                  aria-hidden
                >
                  {selectedOfferPlan === 'annual' && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </span>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={selectedOfferPlan === 'monthly'}
                onClick={() => setSelectedOfferPlan('monthly')}
                className={`lp-sono-offer-plan ${selectedOfferPlan === 'monthly' ? 'is-featured' : ''}`}
              >
                <span className="lp-sono-offer-plan-meta">Plano Mensal</span>
                <strong className="lp-sono-offer-plan-headline">R$ 15,90/mês</strong>
                <span className="lp-sono-offer-plan-price">Cobrado mensalmente</span>
                <span
                  className={`lp-sono-offer-plan-radio ${selectedOfferPlan === 'monthly' ? '' : 'is-empty'}`}
                  aria-hidden
                >
                  {selectedOfferPlan === 'monthly' && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </span>
              </button>
            </div>

            <div className="lp-sono-offer-fine scroll-reveal stagger-3">
              <Link to="/termos">Termos e Condições</Link>
              <span aria-hidden>·</span>
              <Link to="/cancelar-assinatura">Cancele a qualquer momento</Link>
            </div>

            <Link
              to={`/assinar?step=plan&plan=${selectedOfferPlan}&from=meditacao_oferta_cta`}
              className="lp-sono-offer-cta scroll-reveal stagger-4"
            >
              Comece seu teste gratuito
            </Link>
          </div>
        </div>
      </section>

      <EcotopiaFooter />
    </div>
  );
}

function OfferCheck() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
