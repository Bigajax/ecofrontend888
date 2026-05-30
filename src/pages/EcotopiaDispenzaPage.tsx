import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import '@/ecotopia-landing.css';
import EcotopiaTopbar from '@/components/landing/EcotopiaTopbar';
import EcotopiaFooter from '@/components/landing/EcotopiaFooter';
import { useScrollReveal } from '@/components/landing/useScrollReveal';
import { DR_JOE_MEDITATIONS } from '@/data/drJoeMeditations';
import mixpanel from '@/lib/mixpanel';

// ─── Dados ───────────────────────────────────────────────────────────

const METODO = [
  {
    num: '01',
    title: 'Saia do piloto automático',
    body: 'A maior parte do dia roda em padrões antigos. A prática começa interrompendo esse ciclo familiar.',
    img: '/images/dispenza-metodo-01.webp',
  },
  {
    num: '02',
    title: 'Da emoção ao estado',
    body: 'Quando pensamento e emoção entram em coerência, o corpo começa a aprender um novo estado de ser.',
    img: '/images/dispenza-metodo-02.webp',
  },
  {
    num: '03',
    title: 'Repetir até se tornar',
    body: 'Não é sobre entender com a cabeça. É sobre repetir, dia após dia, até virar quem você é.',
    img: '/images/dispenza-metodo-03.webp',
  },
];

const FAQS = [
  {
    q: 'Quem é Dr. Joe Dispenza?',
    a: 'Pesquisador e autor reconhecido por unir neurociência, epigenética e meditação. Seu trabalho mostra como pensamento e emoção, repetidos com coerência, podem condicionar o corpo a um novo estado de ser.',
  },
  {
    q: 'Preciso ter experiência com meditação?',
    a: 'Não. As sessões são guiadas do início ao fim, de 5 a 7 minutos, pensadas para quem está começando — e também para quem já pratica e quer profundidade.',
  },
  {
    q: 'Como as meditações funcionam?',
    a: 'Cada sessão guia você a ativar os centros de energia, soltar o estado antigo e sintonizar um novo. A chave está na repetição: é ela que transforma a experiência em padrão.',
  },
  {
    q: 'Está incluído no plano do Ecotopia?',
    a: 'Sim. A coleção de meditações guiadas faz parte da experiência Ecotopia, ao lado da Eco, do Diário Estoico e dos Cinco Anéis.',
  },
];

// ─── Componente ──────────────────────────────────────────────────────

export default function EcotopiaDispenzaPage() {
  useScrollReveal('.ecotopia-lp');

  useEffect(() => {
    try {
      mixpanel.track('Dr Joe Dispenza Landing Viewed', { page: 'dispenza_root' });
    } catch {
      // noop
    }
  }, []);

  return (
    <div className="ecotopia-lp lp-djd">
      <EcotopiaTopbar />

      {/* ─── Hero ─── */}
      <section className="lp-djd-hero">
        <div className="lp-djd-hero-inner">
          <div className="lp-djd-hero-text">
            <span className="lp-djd-eyebrow scroll-reveal">Meditação · Dr. Joe Dispenza</span>
            <h1 className="scroll-reveal stagger-1">
              Você não é o seu passado.<br />Pode treinar um novo estado.
            </h1>
            <p className="lp-djd-hero-lead scroll-reveal stagger-2">
              Meditações guiadas inspiradas no trabalho de Dr. Joe Dispenza — para sair
              do piloto automático, ativar seus centros de energia e condicionar corpo
              e mente a um novo padrão.
            </p>
            <div className="lp-djd-hero-actions scroll-reveal stagger-3">
              <Link to="/assinar?step=plan&plan=annual&from=dispenza_hero" className="lp-djd-cta">
                Começar a praticar
              </Link>
              <a href="#meditacoes" className="lp-djd-cta-ghost">
                Conhecer as meditações
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ─── O método ─── */}
      <section className="lp-djd-metodo">
        <div className="lp-djd-metodo-inner">
          <div className="lp-djd-section-head scroll-reveal">
            <span className="lp-djd-kicker">Como funciona</span>
            <h2 className="lp-djd-h2">Pensamento, emoção e um novo estado.</h2>
            <p className="lp-djd-section-lead">
              A transformação não vem do esforço, e sim da coerência repetida.
              É assim que o corpo deixa de viver no passado.
            </p>
          </div>

          <div className="lp-djd-metodo-grid">
            {METODO.map((m, i) => (
              <article key={m.num} className={`lp-djd-metodo-card scroll-reveal stagger-${i + 1}`}>
                <span className="lp-djd-metodo-orb" aria-hidden>
                  <img src={m.img} alt="" loading="lazy" />
                </span>
                <span className="lp-djd-metodo-num">{m.num}</span>
                <h3>{m.title}</h3>
                <p>{m.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─── As meditações guiadas ─── */}
      <section className="lp-djd-meds" id="meditacoes">
        <div className="lp-djd-meds-inner">
          <div className="lp-djd-section-head scroll-reveal">
            <span className="lp-djd-kicker">A coleção</span>
            <h2 className="lp-djd-h2">Meditações guiadas para um novo eu.</h2>
          </div>

          <div className="lp-djd-meds-grid">
            {DR_JOE_MEDITATIONS.map((med, i) => (
              <article
                key={med.id}
                className={`lp-djd-med-card scroll-reveal stagger-${(i % 5) + 1}`}
              >
                <span
                  className="lp-djd-med-thumb"
                  style={{ backgroundImage: `${med.image}, ${med.gradient}`, backgroundPosition: med.imagePosition }}
                >
                  {med.isPremium && <span className="lp-djd-med-badge">Premium</span>}
                  <span className="lp-djd-med-dur">{med.duration}</span>
                </span>
                <h3>{med.title}</h3>
                <p>{med.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Frase de impacto ─── */}
      <section className="lp-djd-impact">
        <div className="lp-djd-impact-card scroll-reveal">
          <blockquote>
            "O que você sentiu não é imaginação. É o começo de uma nova forma de funcionar."
          </blockquote>
          <cite>— A repetição é o caminho</cite>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="lp-djd-faq">
        <div className="lp-djd-faq-inner">
          <h2 className="lp-djd-h2 lp-djd-h2--center scroll-reveal">Perguntas frequentes</h2>
          <div className="lp-djd-faq-list scroll-reveal stagger-1">
            {FAQS.map((item) => (
              <details key={item.q} className="lp-djd-faq-item">
                <summary>
                  {item.q}
                  <span className="lp-djd-faq-icon" aria-hidden>
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
      <section className="lp-djd-final">
        <div className="lp-djd-final-card scroll-reveal">
          <h2>Comece hoje. Seu corpo aprende pela repetição.</h2>
          <Link to="/assinar?step=plan&plan=annual&from=dispenza_final" className="lp-djd-cta">
            Começar a praticar
          </Link>
        </div>
      </section>

      <EcotopiaFooter />
    </div>
  );
}
