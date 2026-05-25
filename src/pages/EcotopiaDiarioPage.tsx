import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import '@/ecotopia-landing.css';
import EcotopiaTopbar from '@/components/landing/EcotopiaTopbar';
import EcotopiaFooter from '@/components/landing/EcotopiaFooter';
import { useScrollReveal } from '@/components/landing/useScrollReveal';
import mixpanel from '@/lib/mixpanel';

// ─── Dados ───────────────────────────────────────────────────────────

const BENEFITS = [
  {
    icon: '🪨',
    title: 'Serenidade no que não controlo',
    body: 'A dicotomia do controle: separar o que depende de você do que não depende — e soltar o resto.',
  },
  {
    icon: '🔭',
    title: 'Clareza diante do caos',
    body: 'Ver as coisas como elas realmente são, sem o véu das opiniões e do julgamento apressado.',
  },
  {
    icon: '⚓',
    title: 'Resiliência que se constrói',
    body: 'Uma fortaleza interior, um dia de cada vez. O obstáculo deixa de ser inimigo e vira caminho.',
  },
  {
    icon: '🌅',
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
        style={{ backgroundImage: 'url("/images/diario-estoico-bg.png")' }}
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
              to="/register?plan=annual&from=diario_hero"
              className="lp-diario-cta scroll-reveal stagger-3"
            >
              Comece sua jornada
            </Link>
            <p className="lp-diario-hero-fine scroll-reveal stagger-4">
              Janeiro e fevereiro abertos · 7 dias grátis no plano completo
            </p>
          </div>

          <div className="lp-diario-hero-card scroll-reveal stagger-2">
            <span className="lp-diario-hero-card-label">Máxima de hoje</span>
            <blockquote>
              “Você tem poder sobre a sua mente — não sobre os eventos externos.
              Perceba isso, e encontrará força.”
            </blockquote>
            <cite>— Marco Aurélio</cite>
          </div>
        </div>
      </section>

      {/* ─── Benefícios ─── */}
      <section className="lp-diario-benefits">
        <div className="lp-diario-benefits-grid">
          {BENEFITS.map((b, i) => (
            <article key={b.title} className={`lp-diario-benefit scroll-reveal stagger-${i + 1}`}>
              <span className="lp-diario-benefit-icon" aria-hidden>{b.icon}</span>
              <h3>{b.title}</h3>
              <p>{b.body}</p>
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
          <h2 className="lp-diario-h2 scroll-reveal">Doze meses, doze temas para atravessar.</h2>

          <div className="lp-diario-months-grid">
            {MONTHS.map((m, i) => (
              <Link
                key={m.id}
                to="/register?plan=annual&from=diario_mes"
                className={`lp-diario-month-card scroll-reveal stagger-${(i % 4) + 1}`}
              >
                <span className="lp-diario-month-thumb">
                  <img src={m.image} alt="" loading="lazy" />
                  {m.free && <span className="lp-diario-month-free">Grátis</span>}
                </span>
                <span className="lp-diario-month-name">{m.name}</span>
                <span className="lp-diario-month-theme">{m.theme}</span>
              </Link>
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
          <p>
            Janeiro e fevereiro estão abertos para você experimentar. O ano inteiro
            espera no plano completo.
          </p>
          <div className="lp-diario-final-actions">
            <Link to="/register?plan=annual&from=diario_final" className="lp-diario-cta">
              Experimente grátis
            </Link>
            <Link to="/diario-estoico" className="lp-diario-cta-ghost">
              Ler a reflexão de hoje
            </Link>
          </div>
        </div>
      </section>

      <EcotopiaFooter />
    </div>
  );
}
