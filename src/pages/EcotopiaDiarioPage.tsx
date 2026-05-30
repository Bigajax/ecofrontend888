import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import '@/ecotopia-landing.css';
import EcotopiaTopbar from '@/components/landing/EcotopiaTopbar';
import EcotopiaFooter from '@/components/landing/EcotopiaFooter';
import { useScrollReveal } from '@/components/landing/useScrollReveal';
import mixpanel from '@/lib/mixpanel';

// ─── Dados ───────────────────────────────────────────────────────────

const BENEFITS = [
  {
    image: '/images/diario-benefit-serenidade.webp',
    title: 'Serenidade no que não controlo',
    body: 'A dicotomia do controle: separar o que depende de você do que não depende — e soltar o resto.',
  },
  {
    image: '/images/diario-benefit-clareza.webp',
    title: 'Clareza diante do caos',
    body: 'Ver as coisas como elas realmente são, sem o véu das opiniões e do julgamento apressado.',
  },
  {
    image: '/images/diario-benefit-resiliencia.webp',
    title: 'Resiliência que se constrói',
    body: 'Uma fortaleza interior, um dia de cada vez. O obstáculo deixa de ser inimigo e vira caminho.',
  },
  {
    image: '/images/diario-benefit-proposito.webp',
    title: 'Propósito todos os dias',
    body: 'Um ritual matinal que ancora você no que importa antes que o mundo peça a sua atenção.',
  },
];

const DISCIPLINES = [
  {
    number: 'I',
    title: 'A Disciplina da Percepção',
    body: 'Janeiro a abril. Ver o mundo sem distorções: clareza mental, domínio das emoções, consciência e pensamento imparcial.',
  },
  {
    number: 'II',
    title: 'A Disciplina da Ação',
    body: 'Maio a agosto. Agir com virtude e propósito: a ação correta, a solução de problemas, o dever e o pragmatismo.',
  },
  {
    number: 'III',
    title: 'A Disciplina da Vontade',
    body: 'Setembro a dezembro. Aceitar o que não se pode mudar: força, virtude, amor fati e a meditação sobre a mortalidade.',
  },
];

const MONTHS = [
  { id: 'janeiro', name: 'Janeiro', theme: 'Clareza', image: '/images/diario-janeiro.webp', free: true },
  { id: 'fevereiro', name: 'Fevereiro', theme: 'Paixões e emoções', image: '/images/diario-fevereiro.webp', free: true },
  { id: 'marco', name: 'Março', theme: 'Consciência', image: '/images/diario-marco.webp' },
  { id: 'abril', name: 'Abril', theme: 'Pensamento imparcial', image: '/images/diario-abril.webp' },
  { id: 'maio', name: 'Maio', theme: 'Ação correta', image: '/images/diario-maio.webp' },
  { id: 'junho', name: 'Junho', theme: 'Solução de problemas', image: '/images/diario-junho.webp' },
  { id: 'julho', name: 'Julho', theme: 'Dever', image: '/images/diario-julho.webp' },
  { id: 'agosto', name: 'Agosto', theme: 'Pragmatismo', image: '/images/diario-agosto.webp' },
  { id: 'setembro', name: 'Setembro', theme: 'Força e resiliência', image: '/images/diario-setembro.webp' },
  { id: 'outubro', name: 'Outubro', theme: 'Virtude e bondade', image: '/images/diario-outubro.webp' },
  { id: 'novembro', name: 'Novembro', theme: 'Aceitação · Amor Fati', image: '/images/diario-novembro.webp' },
  { id: 'dezembro', name: 'Dezembro', theme: 'Memento Mori', image: '/images/diario-dezembro.webp' },
];

// ─── Componente ──────────────────────────────────────────────────────

export default function EcotopiaDiarioPage() {
  useScrollReveal('.ecotopia-lp');

  const monthsTrackRef = useRef<HTMLDivElement>(null);

  const scrollMonths = (dir: 1 | -1) => {
    const track = monthsTrackRef.current;
    if (!track) return;
    const card = track.querySelector<HTMLElement>('.lp-diario-month-card');
    const step = card ? (card.offsetWidth + 22) * 2 : track.clientWidth * 0.8;
    track.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  useEffect(() => {
    try {
      mixpanel.track('Diario Estoico Landing Viewed', { page: 'estoicismo_root' });
    } catch {
      // noop
    }
  }, []);

  return (
    <div className="ecotopia-lp lp-diario">
      <EcotopiaTopbar />

      {/* ─── Hero ─── */}
      <section
        className="lp-diario-hero"
        style={{ backgroundImage: 'url("/images/diario-estoico-bg.webp")' }}
      >
        <span className="lp-diario-hero-veil" aria-hidden />

        <div className="lp-diario-hero-inner">
          <div className="lp-diario-hero-text">
            <span className="lp-diario-eyebrow scroll-reveal">Diário Estoico</span>
            <h1 className="scroll-reveal stagger-1">
              Um ano de sabedoria estoica,<br />um dia de cada vez.
            </h1>
            <p className="lp-diario-hero-lead scroll-reveal stagger-2">
              Uma reflexão por dia inspirada em Marco Aurélio, Sêneca e Epicteto —
              para começar a manhã com clareza e atravessar o dia com serenidade.
            </p>
            <Link
              to="/assinar?step=plan&plan=annual&from=diario_hero"
              className="lp-diario-cta scroll-reveal stagger-3"
            >
              Comece sua jornada
            </Link>
            <p className="lp-diario-hero-fine scroll-reveal stagger-4">
              Janeiro e fevereiro abertos · 7 dias grátis no plano completo
            </p>
          </div>
        </div>
      </section>

      {/* ─── Benefícios ─── */}
      <section className="lp-diario-benefits">
        <div className="lp-diario-benefits-grid">
          {BENEFITS.map((b, i) => (
            <article key={b.title} className={`lp-diario-benefit scroll-reveal stagger-${i + 1}`}>
              <span className="lp-diario-benefit-icon" aria-hidden>
                <img src={b.image} alt="" loading="lazy" />
              </span>
              <div className="lp-diario-benefit-card">
                <h3>{b.title}</h3>
                <p>{b.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ─── As três disciplinas ─── */}
      <section className="lp-diario-disciplines">
        <div className="lp-diario-disciplines-inner">
          <h2 className="lp-diario-h2 lp-diario-h2--center scroll-reveal">
            Três disciplinas, doze meses, uma vida mais firme.
          </h2>
          <p className="lp-diario-disciplines-lead scroll-reveal stagger-1">
            O diário segue a estrutura da filosofia estoica: cada estação do ano
            cultiva uma disciplina diferente do caráter.
          </p>

          <div className="lp-diario-disciplines-grid">
            {DISCIPLINES.map((d, i) => (
              <article key={d.number} className={`lp-diario-discipline scroll-reveal stagger-${i + 1}`}>
                <span className="lp-diario-discipline-num">{d.number}</span>
                <h3>{d.title}</h3>
                <p>{d.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Doze meses temáticos ─── */}
      <section className="lp-diario-months">
        <div className="lp-diario-months-inner">
          <div className="lp-diario-months-head scroll-reveal">
            <h2 className="lp-diario-h2">Doze meses, doze temas para atravessar.</h2>
            <div className="lp-diario-months-nav">
              <button
                type="button"
                className="lp-diario-months-arrow"
                onClick={() => scrollMonths(-1)}
                aria-label="Ver meses anteriores"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                type="button"
                className="lp-diario-months-arrow"
                onClick={() => scrollMonths(1)}
                aria-label="Ver próximos meses"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>

          <div className="lp-diario-months-track" ref={monthsTrackRef}>
            {MONTHS.map((m) => (
              <div
                key={m.id}
                className="lp-diario-month-card"
                style={{ cursor: 'default' }}
              >
                <span className="lp-diario-month-thumb">
                  <img src={m.image} alt="" loading="lazy" />
                  {m.free && <span className="lp-diario-month-free">Grátis</span>}
                </span>
                <span className="lp-diario-month-name">{m.name}</span>
                <span className="lp-diario-month-theme">{m.theme}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Citação ─── */}
      <section className="lp-diario-quote">
        <div className="lp-diario-quote-inner scroll-reveal">
          <blockquote>
            “A felicidade da sua vida depende da qualidade dos seus pensamentos.”
          </blockquote>
          <cite>— Marco Aurélio, Meditações</cite>
        </div>
      </section>

      {/* ─── CTA final ─── */}
      <section className="lp-diario-final">
        <div className="lp-diario-final-inner scroll-reveal">
          <h2>Comece hoje. O primeiro passo é uma página.</h2>
          <Link
            to="/assinar?step=plan&plan=annual&from=diario_final"
            className="lp-diario-cta"
          >
            Experimente grátis
          </Link>
        </div>
      </section>

      <EcotopiaFooter />
    </div>
  );
}
