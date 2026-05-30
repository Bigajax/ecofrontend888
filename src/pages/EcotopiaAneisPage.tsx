import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import '@/ecotopia-landing.css';
import EcotopiaTopbar from '@/components/landing/EcotopiaTopbar';
import EcotopiaFooter from '@/components/landing/EcotopiaFooter';
import { useScrollReveal } from '@/components/landing/useScrollReveal';
import { RINGS_ARRAY } from '@/constants/rings';
import mixpanel from '@/lib/mixpanel';

// ─── Dados ───────────────────────────────────────────────────────────

// Acento elemental por anel (sobrepõe via --ring-accent no card).
const RING_ACCENT: Record<string, string> = {
  earth: '#C0871F',
  water: '#2E6FD0',
  fire: '#D14A2C',
  wind: '#3F9DBE',
  void: '#7C5CC4',
};

// Imagens de capa específicas da landing (não alteram os visuais do app /app/rings).
const RING_IMAGE: Record<string, string> = {
  earth: '/images/aneis-card-earth.webp',
  water: '/images/aneis-card-water.webp',
  fire: '/images/aneis-card-fire.webp',
  wind: '/images/aneis-card-wind.webp',
  void: '/images/aneis-card-void.webp',
};

const STEPS = [
  {
    num: '01',
    title: 'Escolha o anel do dia',
    body: 'Terra, Água, Fogo, Vento ou Vazio. Cada um cultiva uma dimensão diferente da disciplina.',
  },
  {
    num: '02',
    title: 'Responda à pergunta-guia',
    body: 'Uma única pergunta honesta por dia. Sem metas grandiosas — só presença e verdade.',
  },
  {
    num: '03',
    title: 'A Eco reflete com você',
    body: 'A IA companheira devolve um espelho calmo: padrões, pequenos ajustes e o próximo passo.',
  },
];

const BENEFITS = [
  {
    image: '/images/aneis-benefit-foco.webp',
    title: 'Foco sem força',
    body: 'Você para de lutar contra a distração e começa a enxergar de onde ela vem.',
  },
  {
    image: '/images/aneis-benefit-constancia.webp',
    title: 'Constância real',
    body: 'Cinco minutos por dia constroem mais do que maratonas de motivação que não duram.',
  },
  {
    image: '/images/aneis-benefit-identidade.webp',
    title: 'Identidade que firma',
    body: 'A disciplina deixa de ser algo que você faz e vira alguém que você é.',
  },
];

const FAQS = [
  {
    q: 'O que é a disciplina dos cinco anéis?',
    a: 'É uma prática diária inspirada no Livro dos Cinco Anéis, de Miyamoto Musashi. Cada anel — Terra, Água, Fogo, Vento e Vazio — representa uma camada da disciplina, da clareza inicial até torná-la um estilo de vida.',
  },
  {
    q: 'Preciso saber alguma coisa sobre Musashi ou filosofia?',
    a: 'Não. A Eco traduz tudo em perguntas simples e práticas para o seu dia. A profundidade está na constância, não na teoria.',
  },
  {
    q: 'Quanto tempo leva por dia?',
    a: 'Cerca de cinco minutos. Um anel, uma pergunta, uma reflexão curta com a Eco. O suficiente para ancorar o dia.',
  },
  {
    q: 'Funciona junto com o Diário Estoico e as meditações?',
    a: 'Sim. Os cinco anéis são uma das práticas do Ecotopia e conversam com o diário, as meditações e a Eco — tudo no mesmo plano.',
  },
];

// ─── Componente ──────────────────────────────────────────────────────

export default function EcotopiaAneisPage() {
  useScrollReveal('.ecotopia-lp');

  useEffect(() => {
    try {
      mixpanel.track('Cinco Aneis Landing Viewed', { page: 'disciplina_root' });
    } catch {
      // noop
    }
  }, []);

  return (
    <div className="ecotopia-lp lp-aneis">
      <EcotopiaTopbar />

      {/* ─── Hero ─── */}
      <section className="lp-aneis-hero">
        <div className="lp-aneis-hero-inner">
          <div className="lp-aneis-hero-text">
            <span className="lp-aneis-eyebrow scroll-reveal">A disciplina dos cinco anéis</span>
            <h1 className="scroll-reveal stagger-1">
              Disciplina não nasce da força.<br />Nasce de um caminho.
            </h1>
            <p className="lp-aneis-hero-lead scroll-reveal stagger-2">
              Inspirada no Livro dos Cinco Anéis de Miyamoto Musashi, a prática diária
              da Eco transforma disciplina em identidade — um anel de cada vez.
            </p>
            <div className="lp-aneis-hero-actions scroll-reveal stagger-3">
              <Link
                to="/assinar?step=plan&plan=annual&from=aneis_hero"
                className="lp-aneis-cta"
              >
                Comece sua prática
              </Link>
              <a href="#os-aneis" className="lp-aneis-cta-ghost">
                Conheça os cinco anéis
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Os cinco anéis ─── */}
      <section className="lp-aneis-rings" id="os-aneis">
        <div className="lp-aneis-rings-inner">
          <div className="lp-aneis-section-head scroll-reveal">
            <span className="lp-aneis-kicker">O caminho</span>
            <h2 className="lp-aneis-h2">Cinco anéis, uma só direção.</h2>
            <p className="lp-aneis-section-lead">
              Cada anel é uma estação da disciplina. Você atravessa do ver ao tornar-se,
              sem pular etapas — porque é o caminho que firma, não a pressa.
            </p>
          </div>

          <div className="lp-aneis-rings-grid">
            {RINGS_ARRAY.map((ring, i) => (
              <article
                key={ring.id}
                className={`lp-aneis-ring-card scroll-reveal stagger-${i + 1}`}
                style={{ ['--ring-accent' as string]: RING_ACCENT[ring.id] ?? '#0E1A33' }}
              >
                <span className="lp-aneis-ring-thumb">
                  <img src={RING_IMAGE[ring.id] ?? ring.backgroundImage} alt="" loading="lazy" />
                  <span className="lp-aneis-ring-order">{ring.order}</span>
                </span>
                <div className="lp-aneis-ring-body">
                  <h3>{ring.titlePt}</h3>
                  <span className="lp-aneis-ring-subtitle">{ring.subtitlePt}</span>
                  <p className="lp-aneis-ring-desc">{ring.descriptionPt}</p>
                  <p className="lp-aneis-ring-phrase">"{ring.impactPhrase}"</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Como funciona ─── */}
      <section className="lp-aneis-how">
        <div className="lp-aneis-how-inner">
          <div className="lp-aneis-section-head scroll-reveal">
            <span className="lp-aneis-kicker">O ritual diário</span>
            <h2 className="lp-aneis-h2">Cinco minutos. Uma pergunta de cada vez.</h2>
          </div>

          <div className="lp-aneis-steps">
            {STEPS.map((step, i) => (
              <article key={step.num} className={`lp-aneis-step scroll-reveal stagger-${i + 1}`}>
                <span className="lp-aneis-step-num">{step.num}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Frase de impacto ─── */}
      <section className="lp-aneis-quote">
        <div className="lp-aneis-quote-card scroll-reveal">
          <blockquote>"A disciplina é um estilo de vida, não um destino."</blockquote>
          <cite>— Anel do Vazio</cite>
        </div>
      </section>

      {/* ─── Benefícios ─── */}
      <section className="lp-aneis-benefits">
        <div className="lp-aneis-benefits-inner">
          <div className="lp-aneis-section-head scroll-reveal">
            <span className="lp-aneis-kicker">Por que praticar</span>
            <h2 className="lp-aneis-h2">O que muda quando a disciplina vira caminho.</h2>
          </div>

          <div className="lp-aneis-benefits-grid">
            {BENEFITS.map((b, i) => (
              <article key={b.title} className={`lp-aneis-benefit scroll-reveal stagger-${i + 1}`}>
                <span className="lp-aneis-benefit-orb" aria-hidden>
                  <img src={b.image} alt="" loading="lazy" />
                </span>
                <div className="lp-aneis-benefit-card">
                  <h3>{b.title}</h3>
                  <p>{b.body}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="lp-aneis-faq">
        <div className="lp-aneis-faq-inner">
          <h2 className="lp-aneis-h2 lp-aneis-h2--center scroll-reveal">Perguntas frequentes</h2>
          <div className="lp-aneis-faq-list scroll-reveal stagger-1">
            {FAQS.map((item) => (
              <details key={item.q} className="lp-aneis-faq-item">
                <summary>
                  {item.q}
                  <span className="lp-aneis-faq-icon" aria-hidden>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </span>
                </summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA final ─── */}
      <section className="lp-aneis-final">
        <div className="lp-aneis-final-card scroll-reveal">
          <h2>Comece hoje. O primeiro anel é uma pergunta.</h2>
          <Link
            to="/assinar?step=plan&plan=annual&from=aneis_final"
            className="lp-aneis-cta"
          >
            Comece sua prática
          </Link>
        </div>
      </section>

      <EcotopiaFooter />
    </div>
  );
}
