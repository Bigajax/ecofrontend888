import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import '@/ecotopia-landing.css';
import EcotopiaTopbar from '@/components/landing/EcotopiaTopbar';
import EcotopiaFooter from '@/components/landing/EcotopiaFooter';
import MethodMarquee from '@/components/landing/MethodMarquee';
import { useScrollReveal } from '@/components/landing/useScrollReveal';
import { PROTOCOL_NIGHTS } from '@/data/protocolNights';
import mixpanel from '@/lib/mixpanel';
import { fbq, trackWithCAPI } from '@/lib/fbpixel';
import { PRICE, planValue } from '@/constants/offerCopy';

// ─── Dados das seções ────────────────────────────────────────────────

const VALUE_COLUMNS = [
  {
    icon: '/images/sono-icon-meditacao.webp',
    title: 'Desacelere em minutos',
    body: 'Respirações guiadas e curtas que baixam o ritmo do corpo antes de você deitar.',
  },
  {
    icon: '/images/sono-icon-deite-mente.webp',
    // A/B: versão poética (atual) vs. direta → "Desligue a cabeça e durma."
    title: 'Acalme a mente antes de fechar os olhos.',
    body: 'Adormeça com meditações guiadas, sons e músicas feitas para o sono.',
  },
  {
    icon: '/images/sono-icon-estresse.webp',
    title: 'Menos estresse, noites mais leves',
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

const TESTIMONIALS: { id: string; quote: string; name: string; photo?: string }[] = [
  {
    id: 't1',
    quote: 'Eu demorava mais de uma hora para dormir. Depois de alguns dias usando o protocolo comecei a pegar no sono muito mais rápido.',
    name: 'Mariana',
    photo: '/images/testimonial-mariana.webp',
  },
  {
    id: 't2',
    quote: 'Minha mente ficava acelerada quando eu deitava. As práticas me ajudaram a encerrar o dia com mais tranquilidade.',
    name: 'Beatriz',
    photo: '/images/testimonial-beatriz.webp',
  },
  {
    id: 't3',
    quote: 'Passei a criar uma rotina noturna que realmente consigo seguir.',
    name: 'Camila',
    photo: '/images/testimonial-camila.webp',
  },
];

// Cores dos avatares de depoimento (paleta eco), rotacionadas por índice.
const AVATAR_COLORS = ['#1554F0', '#2F8F6B', '#C97B2B'];

// CTA único e idêntico em todos os pontos de conversão da página.
const CTA_LABEL = 'Começar meus 7 dias grátis';

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
    // Meta Pixel: visitante viu a landing do Protocolo do Sono.
    fbq('ViewContent', {
      content_name: 'Protocolo do Sono',
      content_category: 'sono',
    });
  }, []);

  // Meta Pixel + CAPI: clique em qualquer CTA "7 dias grátis" = intenção de
  // iniciar o trial. Dispara antes da navegação (SPA) do <Link> para /assinar,
  // então o fetch do CAPI não é cancelado por unload.
  const trackTrialCta = (plan: 'annual' | 'monthly', from: string) => {
    void trackWithCAPI('InitiateCheckout', {
      value: planValue(plan),
      currency: PRICE.currency,
      contentName: 'Protocolo do Sono',
      contentCategory: 'sono',
      pixelExtra: { plan, source: from },
    });
  };

  const [activeTab, setActiveTab] = useState<string>(TABS[0].id);
  const activeTabData = TABS.find((t) => t.id === activeTab) ?? TABS[0];

  const [selectedOfferPlan, setSelectedOfferPlan] = useState<'annual' | 'monthly'>('annual');

  return (
    <div className="ecotopia-lp lp-sono">
      <EcotopiaTopbar />

      {/* ─── Hero · promessa de sono (sem preço — só promessa + CTA) ─── */}
      <section className="lp-sono-hero lp-sono-hero--v2">
        <div className="lp-sono-hero-inner">
          <div className="lp-sono-hero-text">
            <h1 className="scroll-reveal">
              Sua mente não desliga<br className="lp-br-desktop" />{' '}
              quando você deita?
            </h1>

            <p className="lp-sono-hero-lead scroll-reveal stagger-1">
              O <span className="lp-sono-mark">Protocolo do Sono</span> reúne meditações
              guiadas, exercícios de respiração e práticas desenvolvidas para ajudar
              você a desacelerar antes de dormir.
            </p>

            <Link
              to="/assinar?step=plan&plan=annual&from=sono_hero"
              className="lp-sono-hero-cta-primary scroll-reveal stagger-2"
              onClick={() => trackTrialCta('annual', 'sono_hero')}
            >
              {CTA_LABEL}
            </Link>

            <p className="lp-sono-hero-microcopy scroll-reveal stagger-3">
              Sem cobrança hoje ·{' '}
              <Link to="/cancelar-assinatura" className="lp-sono-hero-microcopy-link">
                cancele quando quiser
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* ─── Faixa · céu estrelado com os dados de prova (só no /sono) ─── */}
      <MethodMarquee
        ariaLabel="Resultados da Ecotopia"
        className="lp-method-marquee--starry"
        repeat={4}
        terms={['32% menos estresse', '4,8★ na App Store', '+2 mil dormindo melhor']}
      />

      {/* Mockup do iPhone — no mobile aparece DEPOIS do marquee (entre faixa e hero) */}
      <div className="lp-sono-hero-mockup-wrap">
        <img
          src="/images/sono-hero-meditacao-mockup.webp"
          alt="ECO no celular — meditação acolhendo a respiração"
          className="lp-sono-hero-mockup"
          loading="lazy"
        />
      </div>

      {/* ─── Como funciona · Protocolo do Sono: 7 noites (carrossel) ─── */}
      <section className="lp-sono-grid-section lp-sono-protocol">
        <h2 className="lp-sono-h2 scroll-reveal lp-sono-protocol-h2">
          O <span className="lp-sono-mark">Protocolo do Sono</span>:<br className="lp-br-desktop" />{' '}
          7&nbsp;noites para desacelerar a mente.
        </h2>

        <p className="lp-sono-protocol-sub scroll-reveal stagger-1">
          Cada noite foi criada para ajudar você a reduzir o estado de alerta,
          interromper ciclos de pensamentos acelerados e preparar corpo e mente
          para um descanso mais profundo.
        </p>

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
                  onClick={() => trackTrialCta('annual', `sono_protocolo_${n.id}`)}
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

      {/* ─── Prova / resultado · 32% expandido + depoimentos com rosto ─── */}
      <section className="lp-sono-testimonials">
        <div className="lp-sono-testimonials-inner">
          <div className="lp-sono-deco-hero">
            {/* orbes/planetas (paleta fria, noturna) */}
            <span className="lp-sono-deco-orb lp-sono-deco-orb--blue" aria-hidden="true">
              <img src="/images/testimonio-orb-blue.webp" alt="" width={200} height={200} loading="lazy" decoding="async" />
            </span>
            <span className="lp-sono-deco-orb lp-sono-deco-orb--green" aria-hidden="true">
              <img src="/images/testimonio-orb-green.webp" alt="" width={200} height={200} loading="lazy" decoding="async" />
            </span>
            <span className="lp-sono-deco-orb lp-sono-deco-orb--pink" aria-hidden="true">
              <img src="/images/testimonio-orb-pink.webp" alt="" width={200} height={200} loading="lazy" decoding="async" />
            </span>

            {/* lua crescente — reforça o tema noite/dormir */}
            <span className="lp-sono-deco-moon" aria-hidden="true">
              <Moon />
            </span>

            {/* estrelas (tons prateado/azulado, como céu noturno) */}
            <span className="lp-sono-deco-star lp-sono-deco-star--a" aria-hidden="true"><Sparkle color="#FFFFFF" size={26} /></span>
            <span className="lp-sono-deco-star lp-sono-deco-star--b" aria-hidden="true"><Sparkle color="#AFCBFF" size={20} /></span>
            <span className="lp-sono-deco-star lp-sono-deco-star--c" aria-hidden="true"><Sparkle color="#C9C2F0" size={16} /></span>
            <span className="lp-sono-deco-star lp-sono-deco-star--d" aria-hidden="true"><Sparkle color="#DCE6F5" size={14} /></span>

            <h2 className="lp-sono-h2 lp-sono-h2--center scroll-reveal lp-sono-testimonials-h2">
              Histórias de quem já sente a diferença.
            </h2>
          </div>

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
                <div className="lp-sono-testimonial-author">
                  <span
                    className="lp-sono-testimonial-avatar"
                    style={t.photo ? undefined : { background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                    aria-hidden
                  >
                    {t.photo ? (
                      <img src={t.photo} alt="" loading="lazy" decoding="async" />
                    ) : (
                      t.name.charAt(0)
                    )}
                  </span>
                  <span className="lp-sono-testimonial-name">{t.name}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Benefícios · 3 cards de valor ─── */}
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

      {/* ─── Demonstração · Tabs Antes / Adormecer / Permanecer ─── */}
      <section className="lp-sono-tabs">
        <div className="lp-sono-tabs-head">
          <h2 className="lp-sono-h2 lp-sono-h2--center scroll-reveal lp-sono-tabs-h2">
            Nos 7&nbsp;dias grátis, as 7&nbsp;noites do{' '}
            <span className="lp-sono-mark">Protocolo do Sono</span> são suas.
          </h2>
          <p className="lp-sono-tabs-sub scroll-reveal stagger-1">
            Comece por qualquer fase da noite —<br className="lp-br-desktop" />{' '}
            do modo&nbsp;alerta ao descanso profundo.
          </p>
        </div>

        <div className="lp-sono-tabs-stage">
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
        </div>
      </section>

      {/* ─── CTA central repetido (label unificado) ─── */}
      <section className="lp-sono-cta-mid">
        <div className="scroll-reveal">
          <h2>
            Comece hoje suas 7&nbsp;noites<br className="lp-br-desktop" />{' '}
            de <em>transformação do sono.</em>
          </h2>
          <p className="lp-sono-cta-mid-sub">
            Menos tempo tentando dormir.<br className="lp-br-desktop" />{' '}
            Mais tempo realmente descansando.
          </p>
          <Link
            to="/assinar?step=plan&plan=annual&from=sono_cta_mid"
            className="cta-primary"
            onClick={() => trackTrialCta('annual', 'sono_cta_mid')}
          >
            {CTA_LABEL}
          </Link>
        </div>
      </section>

      {/* ─── 3 colunas de dicas (conteúdo guiado do app) ─── */}
      <section className="lp-sono-tips">
        <h2 className="lp-sono-h2 lp-sono-h2--center scroll-reveal">
          Um guia de sono completo, dentro do app.
        </h2>
        <p className="lp-sono-tips-sub scroll-reveal stagger-1">
          Programas e práticas guiadas para cada etapa da noite — tudo incluído na sua
          assinatura. Comece com 7 dias grátis.
        </p>

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
                    <Link
                      to={`/assinar?step=plan&plan=annual&from=sono_tip_${col.key}`}
                      onClick={() => trackTrialCta('annual', `sono_tip_${col.key}`)}
                    >
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
                  Adormeça mais rápido com práticas guiadas para desacelerar a mente.
                </span>
              </li>
              <li>
                <Check />
                <span>
                  Siga um protocolo estruturado de 7 noites criado para melhorar
                  sua rotina de sono.
                </span>
              </li>
              <li>
                <Check />
                <span>
                  Tenha acesso a meditações, sons relaxantes e exercícios para
                  reduzir o estresse antes de dormir.
                </span>
              </li>
            </ul>

            <div className="lp-sono-offer-reassure scroll-reveal stagger-2">
              <p className="lp-sono-offer-reassure-lead">
                Comece hoje.{' '}
                <span className="lp-sono-mark">Explore todo o aplicativo</span>{' '}
                por 7 dias gratuitamente.
              </p>
              <p className="lp-sono-offer-reassure-fine">
                Sem cobrança durante o período de teste. Cancele antes do término
                se não quiser continuar.
              </p>
            </div>

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
              onClick={() => trackTrialCta(selectedOfferPlan, 'sono_oferta_cta')}
            >
              {CTA_LABEL}
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

// Estrela de 4 pontas (mesmo desenho do depoimento da home).
function Sparkle({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} aria-hidden>
      <path d="M10 0 L12 8 L20 10 L12 12 L10 20 L8 12 L0 10 L8 8 Z" fill={color} />
    </svg>
  );
}

// Lua crescente — cue de noite/sono.
function Moon() {
  return (
    <svg width="46" height="46" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.6 6.6 0 0 0 9.8 9.8z"
        fill="#E6ECFA"
        stroke="#C2CFEA"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}
