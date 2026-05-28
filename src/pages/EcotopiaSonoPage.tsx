import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import '@/ecotopia-landing.css';
import EcotopiaTopbar from '@/components/landing/EcotopiaTopbar';
import EcotopiaFooter from '@/components/landing/EcotopiaFooter';
import { useScrollReveal } from '@/components/landing/useScrollReveal';
import { PROTOCOL_NIGHTS } from '@/data/protocolNights';
import mixpanel from '@/lib/mixpanel';

// ─── Dados das seções ────────────────────────────────────────────────

const VALUE_COLUMNS = [
  {
    icon: '/images/sono-icon-solucoes.png',
    title: 'Adormeça em minutos',
    body:
      'Música relaxante, paisagens sonoras, respirações e sessões guiadas — escolha o que sua noite pede e desligue a mente sem esforço.',
  },
  {
    icon: '/images/sono-icon-ciencia.png',
    title: 'Sono com base científica',
    body:
      'O Protocolo do Sono da Ecotopia é desenhado a partir da neurociência do sono. Sete noites para reprogramar seu descanso de forma natural.',
  },
  {
    icon: '/images/sono-icon-dia-noite.png',
    title: 'Do dia para a noite',
    body:
      'Centenas de práticas para reduzir o estresse, respirar fundo e desacelerar a mente — do amanhecer até a hora de dormir.',
  },
];

// Artigos reais publicados no app (src/pages/articles/*).
const ARTICLES = [
  {
    id: 'ciencia-sono',
    image: '/images/sleep-stages-intro.webp',
    title: 'A ciência do sono: pressão, estágios e por que importa',
    to: '/articles/sleep',
  },
  {
    id: 'boa-noite',
    image: '/images/good-night-sleep.webp',
    title: 'Como ter uma boa noite de sono',
    to: '/articles/good-night-sleep',
  },
];

const TABS = [
  {
    id: 'antes',
    label: 'Antes de dormir',
    body:
      'Acalme a mente, acalmando-a com meditações relaxantes e exercícios de respiração tranquilizantes para preparar o corpo para o descanso.',
    sample: '"Boa noite" Relaxar · 6 min',
  },
  {
    id: 'adormecer',
    label: 'Adormecer',
    body:
      'Sons da natureza, paisagens sonoras e histórias contadas em voz baixa para o seu cérebro desligar gradualmente, sem esforço.',
    sample: 'Campos de Lavanda · 7 min',
  },
  {
    id: 'permanecer',
    label: 'Permanecer dormindo',
    body:
      'Trilhas longas que sustentam o sono profundo durante a noite — para acordar revigorado, sem aquele despertar das 3 da manhã.',
    sample: 'Noite Inteira · 8 horas',
  },
];

const TIPS_COLUMNS = [
  {
    key: 'higiene',
    title: 'Higiene do sono',
    body:
      'Aprenda a melhor forma de dormir: como organizar seu quarto, o que evitar antes de dormir e quais hábitos saudáveis adotar.',
    links: [
      'Dicas de higiene do sono',
      'Os melhores e piores alimentos para comer antes de dormir',
      'Não cometa estes erros ao ler antes de dormir',
      'Como assistir TV e também dormir bem',
    ],
  },
  {
    key: 'dificuldade',
    title: 'Dificuldade para dormir',
    body:
      'A Ecotopia está aqui para te ajudar a dormir melhor, seja qual for a dificuldade: pegar no sono ou manter o sono.',
    links: [
      'Como voltar a dormir',
      'Dificuldade para adormecer',
      'Sono agitado',
      'Como ajudar as crianças a dormir melhor',
    ],
  },
  {
    key: 'acordando',
    title: 'Acordando',
    body:
      'Comece suas manhãs da maneira certa — aprenda a acordar se sentindo alerta, revigorado e pronto para o dia.',
    links: [
      'Por que eu acordo cansado?',
      'Como acordar mais facilmente',
      'Como parar de adiar o alarme',
      'Como me tornar uma pessoa matutina',
    ],
  },
];

// 7 noites do protocolo divididas em páginas de 4 (4 + 3) para o carrossel.
const PROTOCOL_PAGES = [PROTOCOL_NIGHTS.slice(0, 4), PROTOCOL_NIGHTS.slice(4)];

// ─── Componente ──────────────────────────────────────────────────────

export default function EcotopiaSonoPage() {
  useScrollReveal('.ecotopia-lp');

  const protocolTrackRef = useRef<HTMLDivElement>(null);
  const [protocolPage, setProtocolPage] = useState(0);

  const goToProtocolPage = (page: number) => {
    const track = protocolTrackRef.current;
    if (!track) return;
    const clamped = Math.max(0, Math.min(PROTOCOL_PAGES.length - 1, page));
    track.scrollTo({ left: track.clientWidth * clamped, behavior: 'smooth' });
    setProtocolPage(clamped);
  };

  const handleProtocolScroll = () => {
    const track = protocolTrackRef.current;
    if (!track || track.clientWidth === 0) return;
    setProtocolPage(Math.round(track.scrollLeft / track.clientWidth));
  };

  useEffect(() => {
    try {
      mixpanel.track('Sono Page Viewed', { page: 'sono_root' });
    } catch {
      // noop
    }
  }, []);

  const [activeTab, setActiveTab] = useState<string>(TABS[0].id);
  const activeTabData = TABS.find((t) => t.id === activeTab) ?? TABS[0];

  const [selectedHeroPlan, setSelectedHeroPlan] = useState<'annual' | 'monthly'>('annual');

  return (
    <div className="ecotopia-lp lp-sono">
      <EcotopiaTopbar />

      {/* ─── Hero · oferta primeiro (layout Headspace, fundo creme) ─── */}
      <section className="lp-sono-hero lp-sono-hero--v2">
        <div className="lp-sono-hero-inner">
          <div className="lp-sono-hero-text">
            <h1 className="scroll-reveal">Seja gentil com sua mente.</h1>

            <p className="lp-sono-hero-lead scroll-reveal stagger-1">
              Com a Ecotopia, você se estressa menos,<br />se concentra mais e se sente mais feliz.
            </p>

            <div
              className="lp-sono-hero-plans scroll-reveal stagger-2"
              role="radiogroup"
              aria-label="Escolha seu plano"
            >
              <button
                type="button"
                role="radio"
                aria-checked={selectedHeroPlan === 'annual'}
                className={`lp-sono-hero-plan ${selectedHeroPlan === 'annual' ? 'is-active' : ''}`}
                onClick={() => setSelectedHeroPlan('annual')}
              >
                <span className="lp-sono-hero-plan-badge">Melhor custo-benefício</span>
                <span className="lp-sono-hero-plan-meta">
                  Anual — cobrado a R$ 142,80/ano
                </span>
                <strong className="lp-sono-hero-plan-headline">7 dias grátis</strong>
                <span className="lp-sono-hero-plan-price">R$ 11,90 por mês</span>
                <span className="lp-sono-hero-plan-check" aria-hidden>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={selectedHeroPlan === 'monthly'}
                className={`lp-sono-hero-plan ${selectedHeroPlan === 'monthly' ? 'is-active' : ''}`}
                onClick={() => setSelectedHeroPlan('monthly')}
              >
                <span className="lp-sono-hero-plan-meta">Mensal</span>
                <strong className="lp-sono-hero-plan-headline">7 dias grátis</strong>
                <span className="lp-sono-hero-plan-price">R$ 15,90/mês</span>
                <span className="lp-sono-hero-plan-check" aria-hidden>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
              </button>
            </div>

            <Link
              to={`/register?plan=${selectedHeroPlan}&from=sono_hero`}
              className="lp-sono-hero-cta-primary scroll-reveal stagger-3"
            >
              Experimente grátis
            </Link>

            <img
              src="/images/sono-hero-meditacao-mockup.png"
              alt="ECO no celular — meditação acolhendo a respiração"
              className="lp-sono-hero-mockup scroll-reveal stagger-4"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* ─── 3 colunas de valor ─── */}
      <section className="lp-sono-value">
        <div className="lp-sono-value-grid">
          {VALUE_COLUMNS.map((col, i) => (
            <div key={col.title} className={`lp-sono-value-col scroll-reveal stagger-${i + 1}`}>
              <div className="lp-sono-value-head">
                <div className="lp-sono-value-icon">
                  <img src={col.icon} alt="" loading="lazy" />
                </div>
                <h3>{col.title}</h3>
              </div>
              <p>{col.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Artigos recentes sobre sono ─── */}
      <section className="lp-sono-articles">
        <div className="lp-sono-articles-inner">
          <h2 className="lp-sono-h2 scroll-reveal">Artigos recentes sobre sono</h2>

          <div className="lp-sono-articles-grid">
          {ARTICLES.map((a, i) => (
            <Link
              key={a.id}
              to={a.to}
              className={`lp-sono-article scroll-reveal stagger-${i + 1}`}
            >
              <span className="lp-sono-article-thumb">
                <img src={a.image} alt="" loading="lazy" />
              </span>
              <p className="lp-sono-article-title">{a.title}</p>
            </Link>
          ))}
          </div>
        </div>
      </section>

      {/* ─── CTA central · "Experimente nosso áudio envolvente" ─── */}
      <section className="lp-sono-cta-mid">
        <div className="scroll-reveal">
          <h2>
            Ouça uma amostra <em>grátis.</em>
          </h2>
          <Link to="/register?plan=monthly&from=sono_cta_mid" className="cta-primary">
            Começar 7 dias grátis
          </Link>
        </div>
      </section>

      {/* ─── Tabs · Antes / Adormecer / Permanecer ─── */}
      <section className="lp-sono-tabs">
        <div className="lp-sono-tabs-bg" aria-hidden />

        <div className="lp-sono-tabs-inner">
          <div className="lp-sono-tabs-pills scroll-reveal">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`lp-sono-tab-pill ${activeTab === tab.id ? 'is-active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <p className="lp-sono-tabs-body scroll-reveal stagger-1">
            {activeTabData.body}
          </p>

          <div
            className="lp-sono-tabs-player scroll-reveal stagger-2"
            role="group"
            aria-label="Amostra"
          >
            <button
              type="button"
              className="lp-sono-tabs-play"
              aria-label="Pré-escutar amostra"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M7 5.5v13a1 1 0 0 0 1.55.83l10-6.5a1 1 0 0 0 0-1.66l-10-6.5A1 1 0 0 0 7 5.5z" />
              </svg>
            </button>
            <div className="lp-sono-tabs-player-body">
              <p className="lp-sono-tabs-player-title">{activeTabData.sample}</p>
              <div className="lp-sono-tabs-player-bar" aria-hidden>
                <span className="lp-sono-tabs-player-progress" />
                <span className="lp-sono-tabs-player-dot" />
              </div>
              <div className="lp-sono-tabs-player-time">
                <span>0:00</span>
                <span>0:00</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Protocolo do Sono · 7 noites (carrossel) ─── */}
      <section className="lp-sono-grid-section lp-sono-protocol">
        <h2 className="lp-sono-h2 scroll-reveal">
          O Protocolo do Sono — 7 noites para reprogramar seu descanso.
        </h2>

        <div
          className="lp-sono-protocol-track"
          ref={protocolTrackRef}
          onScroll={handleProtocolScroll}
        >
          {PROTOCOL_PAGES.map((page, pi) => (
            <div className="lp-sono-protocol-page" key={pi}>
              {page.map((n) => (
                <Link
                  key={n.id}
                  to={`/register?plan=annual&from=sono_protocolo_${n.id}`}
                  className="lp-sono-protocol-card"
                >
                  <span className="lp-sono-protocol-thumb" style={{ background: n.gradient }}>
                    {n.imageUrl && <img src={n.imageUrl} alt="" loading="lazy" />}
                    <span className="lp-sono-protocol-night">Noite {n.night}</span>
                  </span>
                  <p className="lp-sono-protocol-title">{n.title}</p>
                </Link>
              ))}
            </div>
          ))}
        </div>

        <div className="lp-sono-protocol-nav" role="group" aria-label="Navegar pelas noites">
          <button
            type="button"
            className="lp-sono-protocol-arrow"
            aria-label="Página anterior"
            onClick={() => goToProtocolPage(protocolPage - 1)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          {PROTOCOL_PAGES.map((_, pi) => (
            <button
              key={pi}
              type="button"
              className={`lp-sono-protocol-dot ${protocolPage === pi ? 'is-active' : ''}`}
              aria-label={`Página ${pi + 1}`}
              aria-current={protocolPage === pi}
              onClick={() => goToProtocolPage(pi)}
            >
              {pi + 1}
            </button>
          ))}

          <button
            type="button"
            className="lp-sono-protocol-arrow"
            aria-label="Próxima página"
            onClick={() => goToProtocolPage(protocolPage + 1)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </section>

      {/* ─── 3 colunas de dicas ─── */}
      <section className="lp-sono-tips">
        <h2 className="lp-sono-h2 lp-sono-h2--center scroll-reveal">
          Explore dicas, ferramentas e informações sobre sono.
        </h2>

        <div className="lp-sono-tips-grid">
          {TIPS_COLUMNS.map((col, i) => (
            <article key={col.key} className={`lp-sono-tips-col scroll-reveal stagger-${i + 1}`}>
              <h3>{col.title}</h3>
              <p>{col.body}</p>
              <ul>
                {col.links.map((label) => (
                  <li key={label}>
                    <Link to={`/register?plan=annual&from=sono_tip_${col.key}`}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {/* ─── Oferta · navy ─── */}
      <section className="lp-sono-offer">
        <div className="lp-sono-offer-bg" aria-hidden />

        <div className="lp-sono-offer-inner">
          <div className="lp-sono-offer-content">
            <h2 className="scroll-reveal">Dormir ficou mais fácil.</h2>

            <ul className="lp-sono-offer-bullets scroll-reveal stagger-1">
              <li>
                <Check />
                <span>
                  Encontre a rotina perfeita para a hora de dormir com horas de
                  música relaxante, sons e histórias de sua escolha.
                </span>
              </li>
              <li>
                <Check />
                <span>
                  Durma melhor com o Protocolo do Sono: 7 noites guiadas e exercícios
                  desenvolvidos com a ciência do sono.
                </span>
              </li>
              <li>
                <Check />
                <span>
                  Sinta-se bem ao amanhecer com acesso a centenas de meditações
                  para aliviar o estresse, mindfulness e mais.
                </span>
              </li>
            </ul>

            <div className="lp-sono-offer-plans scroll-reveal stagger-2">
              <Link
                to="/register?plan=annual&from=sono_oferta_anual"
                className="lp-sono-offer-plan is-featured"
              >
                <span className="lp-sono-offer-plan-badge">Melhor custo-benefício</span>
                <span className="lp-sono-offer-plan-meta">
                  Anual · cobrado a R$ 142,80/ano
                </span>
                <strong className="lp-sono-offer-plan-headline">7 dias grátis</strong>
                <span className="lp-sono-offer-plan-price">R$ 11,90 por mês</span>
                <span className="lp-sono-offer-plan-radio" aria-hidden>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
              </Link>

              <Link
                to="/register?plan=monthly&from=sono_oferta_mensal"
                className="lp-sono-offer-plan"
              >
                <span className="lp-sono-offer-plan-meta">Plano Mensal</span>
                <strong className="lp-sono-offer-plan-headline">R$ 15,90/mês</strong>
                <span className="lp-sono-offer-plan-price">Cobrado mensalmente</span>
                <span className="lp-sono-offer-plan-radio is-empty" aria-hidden />
              </Link>
            </div>

            <div className="lp-sono-offer-fine scroll-reveal stagger-3">
              <Link to="/termos">Termos e Condições</Link>
              <span aria-hidden>·</span>
              <span>Cancele a qualquer momento</span>
            </div>

            <Link
              to="/register?plan=annual&from=sono_oferta_cta"
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

function Check() {
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
