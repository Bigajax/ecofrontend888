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
    icon: '/images/sono-icon-meditacao.webp',
    title: 'Meditação simplificada',
    body: 'Aprenda a estar mais presente em tudo o que você faz.',
  },
  {
    icon: '/images/sono-icon-deite-mente.webp',
    title: 'Deite a sua mente para dormir.',
    body: 'Adormeça com meditações para dormir, música para dormir e muito mais.',
  },
  {
    icon: '/images/sono-icon-estresse.webp',
    title: 'Reduza o estresse em minutos',
    body: '30 dias de uso da Ecotopia resultaram em uma redução de 32% no estresse.',
  },
];

const TABS = [
  {
    id: 'antes',
    label: 'Antes de dormir',
    body:
      'Acalme a mente, acalmando-a com meditações relaxantes e exercícios de respiração tranquilizantes para preparar o corpo para o descanso.',
    sample: {
      image: '/images/desligando-estado-alerta.webp',
      title: 'Desligando o estado de alerta',
      duration: '8 min',
      night: 1,
    },
  },
  {
    id: 'adormecer',
    label: 'Adormecer',
    body:
      'Sons da natureza, paisagens sonoras e histórias contadas em voz baixa para o seu cérebro desligar gradualmente, sem esforço.',
    sample: {
      image: '/images/esvaziando-pensamentos.webp',
      title: 'Desligamento profundo do corpo',
      duration: '6 min',
      night: 3,
    },
  },
  {
    id: 'permanecer',
    label: 'Permanecer dormindo',
    body:
      'Trilhas longas que sustentam o sono profundo durante a noite — para acordar revigorado, sem aquele despertar das 3 da manhã.',
    sample: {
      image: '/images/inducao-sono-profundo.webp',
      title: 'Quando o sono começa sozinho',
      duration: '5 min',
      night: 6,
    },
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

const TESTIMONIALS = [
  {
    id: 't1',
    quote: 'Sinto que tenho o controle da minha própria jornada em relação à saúde mental.',
    name: 'Mariana',
  },
  {
    id: 't2',
    quote: 'Tem sido revolucionário para mim, porque antes eu dormia de 2 a 3 horas por noite, e agora estou dormindo de 6 a 7 horas por noite.',
    name: 'Beatriz',
  },
  {
    id: 't3',
    quote: 'Consegui redescobrir quem sou e retomei essa sensação de identidade, propósito, calma e presença que a atenção plena proporciona.',
    name: 'Camila',
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

  const tipsTrackRef = useRef<HTMLDivElement>(null);
  const [tipsPage, setTipsPage] = useState(0);

  const goToTipsPage = (page: number) => {
    const track = tipsTrackRef.current;
    if (!track) return;
    const clamped = Math.max(0, Math.min(TIPS_COLUMNS.length - 1, page));
    track.scrollTo({ left: track.clientWidth * clamped, behavior: 'smooth' });
    setTipsPage(clamped);
  };

  const handleTipsScroll = () => {
    const track = tipsTrackRef.current;
    if (!track || track.clientWidth === 0) return;
    setTipsPage(Math.round(track.scrollLeft / track.clientWidth));
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
  const [selectedOfferPlan, setSelectedOfferPlan] = useState<'annual' | 'monthly'>('annual');

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
                <strong className="lp-sono-hero-plan-headline">7 dias gratuitos</strong>
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
                <strong className="lp-sono-hero-plan-headline">7 dias gratuitos</strong>
                <span className="lp-sono-hero-plan-price">R$ 15,90/mês</span>
                <span className="lp-sono-hero-plan-check" aria-hidden>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
              </button>
            </div>

            <Link
              to={`/assinar?step=plan&plan=${selectedHeroPlan}&from=sono_hero`}
              className="lp-sono-hero-cta-primary scroll-reveal stagger-3"
            >
              Experimente grátis
            </Link>

            <img
              src="/images/sono-hero-meditacao-mockup.webp"
              alt="ECO no celular — meditação acolhendo a respiração"
              className="lp-sono-hero-mockup scroll-reveal stagger-4"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* ─── 3 cards de valor (estilo Headspace) ─── */}
      <section className="lp-sono-value lp-sono-value--cards">
        <div className="lp-sono-value-grid">
          {VALUE_COLUMNS.map((col, i) => (
            <article
              key={col.title}
              className={`lp-sono-value-card scroll-reveal stagger-${i + 1}`}
            >
              <div className="lp-sono-value-card-icon">
                <img src={col.icon} alt="" loading="lazy" />
              </div>
              <h3 className="lp-sono-value-card-title">{col.title}</h3>
              <p className="lp-sono-value-card-body">{col.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ─── CTA central · "Experimente nosso áudio envolvente" ─── */}
      <section className="lp-sono-cta-mid">
        <div className="scroll-reveal">
          <h2>
            Experimente gratuitamente nosso áudio <em>envolvente.</em>
          </h2>
          <Link to="/assinar?step=plan&plan=monthly&from=sono_cta_mid" className="cta-primary">
            Descanse melhor hoje.
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
            className="lp-sono-mini-player scroll-reveal stagger-2"
            role="group"
            aria-label="Prévia da meditação"
          >
            <p className="lp-sono-mini-player-eyebrow">
              Noite {activeTabData.sample.night} de 7
            </p>

            <div className="lp-sono-mini-player-art">
              <img
                src={activeTabData.sample.image}
                alt=""
                loading="lazy"
              />
            </div>

            <div className="lp-sono-mini-player-meta">
              <p className="lp-sono-mini-player-title">{activeTabData.sample.title}</p>
              <p className="lp-sono-mini-player-duration">{activeTabData.sample.duration}</p>
            </div>

            <div className="lp-sono-mini-player-dots" aria-hidden>
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <span
                  key={n}
                  className={`lp-sono-mini-player-dot ${n === activeTabData.sample.night ? 'is-current' : ''}`}
                />
              ))}
            </div>

            <div className="lp-sono-mini-player-controls">
              <button
                type="button"
                className="lp-sono-mini-player-skip"
                aria-label="Retroceder 15 segundos"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <polyline points="11 17 6 12 11 7" />
                  <path d="M18 18a6 6 0 0 0-6-6H6" />
                </svg>
                <span>15</span>
              </button>

              <button
                type="button"
                className="lp-sono-mini-player-play"
                aria-label="Pré-escutar"
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M7 5.5v13a1 1 0 0 0 1.55.83l10-6.5a1 1 0 0 0 0-1.66l-10-6.5A1 1 0 0 0 7 5.5z" />
                </svg>
              </button>

              <button
                type="button"
                className="lp-sono-mini-player-skip"
                aria-label="Avançar 15 segundos"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <polyline points="13 17 18 12 13 7" />
                  <path d="M6 18a6 6 0 0 1 6-6h6" />
                </svg>
                <span>15</span>
              </button>
            </div>

            <div className="lp-sono-mini-player-progress" aria-hidden>
              <span className="lp-sono-mini-player-time">0:00</span>
              <div className="lp-sono-mini-player-bar">
                <span className="lp-sono-mini-player-fill" />
                <span className="lp-sono-mini-player-thumb" />
              </div>
              <span className="lp-sono-mini-player-time is-end">{activeTabData.sample.duration}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Depoimentos de membros ─── */}
      <section className="lp-sono-testimonials">
        <div className="lp-sono-testimonials-inner">
          <h2 className="lp-sono-h2 lp-sono-h2--center scroll-reveal lp-sono-testimonials-h2">
            Esses membros expressaram isso da melhor forma.
          </h2>

          <div className="lp-sono-testimonials-grid">
            {TESTIMONIALS.map((t, i) => (
              <article
                key={t.id}
                className={`lp-sono-testimonial scroll-reveal stagger-${i + 1}`}
              >
                <svg
                  className="lp-sono-testimonial-quote"
                  width="1em"
                  height="1em"
                  fill="none"
                  viewBox="0 0 24 24"
                  data-testid="story-quote"
                  aria-hidden
                >
                  <path
                    fill="currentColor"
                    fillRule="evenodd"
                    d="M4.49 7.529a5.3 5.3 0 011.174-.131c3.128 0 5.663 2.716 5.663 6.065 0 3.35-2.535 6.066-5.663 6.066S0 16.814 0 13.463c0-.098.002-.197.007-.295H0C0 8.113 3.84 4 8.56 4v2.036c-1.531 0-2.943.558-4.07 1.493zM17.164 7.529c.378-.086.77-.131 1.172-.131 3.128 0 5.664 2.716 5.664 6.065 0 3.35-2.536 6.066-5.664 6.066-3.128 0-5.663-2.715-5.663-6.066 0-.098.002-.197.007-.295H12.674C12.674 8.113 16.514 4 21.234 4v2.036c-1.531 0-2.943.558-4.07 1.493z"
                    clipRule="evenodd"
                  />
                </svg>
                <p className="lp-sono-testimonial-text">{t.quote}</p>
                <p className="lp-sono-testimonial-author">{t.name}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Protocolo do Sono · 7 noites (carrossel) ─── */}
      <section className="lp-sono-grid-section lp-sono-protocol">
        <h2 className="lp-sono-h2 scroll-reveal lp-sono-protocol-h2">
          O Protocolo do Sono: 7 noites para reprogramar seu descanso.
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
                  to={`/assinar?step=plan&plan=annual&from=sono_protocolo_${n.id}`}
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

        <div
          className="lp-sono-tips-track"
          ref={tipsTrackRef}
          onScroll={handleTipsScroll}
        >
          {TIPS_COLUMNS.map((col, i) => (
            <article key={col.key} className={`lp-sono-tips-col scroll-reveal stagger-${i + 1}`}>
              <h3>{col.title}</h3>
              <p>{col.body}</p>
              <ul>
                {col.links.map((label) => (
                  <li key={label}>
                    <Link to={`/assinar?step=plan&plan=annual&from=sono_tip_${col.key}`}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="lp-sono-tips-nav" role="group" aria-label="Navegar pelas dicas">
          <button
            type="button"
            className="lp-sono-tips-arrow"
            aria-label="Dica anterior"
            onClick={() => goToTipsPage(tipsPage - 1)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          {TIPS_COLUMNS.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`lp-sono-tips-dot ${tipsPage === i ? 'is-active' : ''}`}
              aria-label={`Dica ${i + 1}`}
              aria-current={tipsPage === i}
              onClick={() => goToTipsPage(i)}
            >
              {i + 1}
            </button>
          ))}

          <button
            type="button"
            className="lp-sono-tips-arrow"
            aria-label="Próxima dica"
            onClick={() => goToTipsPage(tipsPage + 1)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
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
              to={`/assinar?step=plan&plan=${selectedOfferPlan}&from=sono_oferta_cta`}
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
