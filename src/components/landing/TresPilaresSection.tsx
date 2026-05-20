import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';
import { useHeadlineVariant } from '@/hooks/useHeadlineVariant';
import { trackLandingCta } from './trackLandingCta';
import { PROTOCOL_NIGHTS } from '@/data/protocolNights';
import { RINGS_ARRAY } from '@/constants/rings';

// ──────────────────────────────────────────────────────────────────────
// Visuais inline — um SVG/composição por aba (lado esquerdo do card)
// ──────────────────────────────────────────────────────────────────────

const VisualEcoAI = () => {
  const [showRealText, setShowRealText] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setShowRealText(true), 2900);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="lp-feat-vis lp-feat-vis--chat">
      <div className="lp-feat-chat-bubble lp-feat-chat-bubble--user lp-feat-anim lp-feat-anim--b1">
        <span className="lp-feat-chat-name">
          <span className="dot dot--user" /> Você
        </span>
        <p>Tenho carregado um cansaço que nem sei nomear.</p>
      </div>

      <div
        className={`lp-feat-chat-bubble lp-feat-chat-bubble--eco lp-feat-anim lp-feat-anim--b2 ${
          showRealText ? 'is-real' : 'is-thinking'
        }`}
      >
        <span className="lp-feat-chat-name">
          <span className="dot dot--eco" /> Eco
        </span>
        <p>
          {!showRealText ? (
            <span className="lp-feat-thinking">
              Pensando
              <span className="lp-feat-pulse">.</span>
              <span className="lp-feat-pulse">.</span>
              <span className="lp-feat-pulse">.</span>
            </span>
          ) : (
            <span className="lp-feat-real">
              Esse cansaço fala mais do corpo ou da mente? Vamos sentar com ele.
            </span>
          )}
        </p>
      </div>

      <img
        src="/images/eco-mascote.png"
        alt=""
        aria-hidden="true"
        className="lp-feat-mascote"
        loading="lazy"
        decoding="async"
      />
    </div>
  );
};

const VisualMeditacoes = () => {
  const items = [
    { label: 'Manhã serena', color: '#FFD966' },
    { label: 'Foco profundo', color: '#5DD9A8' },
    { label: 'Pré-sono', color: '#F8B3D0' },
    { label: 'Ansiedade', color: '#FFA56A' },
    { label: 'Abundância', color: '#A99BF2' },
    { label: 'Gratidão', color: '#7FCBFF' },
  ];
  return (
    <div className="lp-feat-vis lp-feat-vis--phone">
      <div className="lp-feat-phone">
        <div className="lp-feat-phone-tabs">
          <span>Hoje</span><span>Mente</span><span>Sono</span><span>Foco</span>
        </div>
        <div className="lp-feat-phone-list">
          {items.map((it) => (
            <div key={it.label} className="lp-feat-phone-pill" style={{ background: it.color }}>
              {it.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const VisualSono = () => {
  const nights = PROTOCOL_NIGHTS.slice(0, 3);
  return (
    <div className="lp-feat-vis lp-feat-vis--sono">
      <div className="lp-feat-sono-search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
          <path d="m20 20-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span>Adormecer aos poucos</span>
      </div>
      <div className="lp-feat-sono-nights">
        {nights.map((n) => (
          <article
            key={n.id}
            className="lp-feat-sono-night"
            style={n.imageUrl ? { backgroundImage: `url("${n.imageUrl}")` } : { background: n.gradient }}
          >
            <div className="lp-feat-sono-night-meta">
              <small>Noite {n.night} · {n.duration}</small>
              <strong>{n.title}</strong>
            </div>
            <span className="lp-feat-sono-night-play" aria-hidden="true">
              <Play size={12} fill="#1A1A1A" strokeWidth={0} />
            </span>
          </article>
        ))}
      </div>
    </div>
  );
};

const VisualAneis = () => (
  <div className="lp-feat-vis lp-feat-vis--rings">
    <div className="lp-feat-rings-grid">
      {RINGS_ARRAY.map((r) => (
        <div
          key={r.id}
          className={`lp-feat-ring-tile lp-feat-ring-tile--${r.id}`}
          style={r.backgroundImage ? { backgroundImage: `url("${r.backgroundImage}")` } : undefined}
        >
          <div className="lp-feat-ring-meta">
            <strong>{r.titlePt}</strong>
            <small>{r.subtitlePt}</small>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const VisualEstoico = () => (
  <div className="lp-feat-vis lp-feat-vis--estoico">
    <div className="lp-feat-estoico-card">
      <div
        className="lp-feat-estoico-bg"
        style={{ backgroundImage: 'url("/images/diario-janeiro.webp")' }}
        aria-hidden="true"
      />
      <div className="lp-feat-estoico-content">
        <div className="lp-feat-estoico-meta">
          <span>JANEIRO · CLAREZA</span>
          <span>Dia 22</span>
        </div>
        <h4>Examine-se diariamente</h4>
        <p>
          “Manterei constante vigilância sobre mim mesmo e — muito proveitosamente —
          submeterei cada dia a uma revisão.”
        </p>
        <small>— Sêneca · Cartas Morais, 83.2</small>
      </div>
    </div>
    <div className="lp-feat-estoico-pager" aria-hidden="true">
      <span className="lp-feat-estoico-pager-prev">‹</span>
      <span className="lp-feat-estoico-pager-dots">
        <span className="is-active" />
        <span /><span /><span />
      </span>
      <span className="lp-feat-estoico-pager-next">›</span>
    </div>
  </div>
);

// ──────────────────────────────────────────────────────────────────────
// Configuração das abas (data-driven)
// ──────────────────────────────────────────────────────────────────────

type TabConfig = {
  key: string;
  label: string;
  eyebrow: string;
  title: string;
  paragraph: string;
  audio: { label: string; meta: string } | null;
  cta: string;
  ctaTo: string;
  from: string;
  bg: string;
  textColor: string;
  Visual: React.FC;
};

const TABS: TabConfig[] = [
  {
    key: 'eco-ai',
    label: 'Eco IA',
    eyebrow: 'DIÁLOGO',
    title: 'Suporte sempre disponível',
    paragraph:
      'Converse com a Eco — uma IA empática que faz as perguntas certas. Diálogo socrático em português, 24h por dia.',
    audio: null,
    cta: 'Conversar com a Eco',
    ctaTo: '/register?plan=annual&from=feature_ecoai',
    from: 'feature_ecoai',
    bg: '#FFCE00',
    textColor: '#1A1A1A',
    Visual: VisualEcoAI,
  },
  {
    key: 'meditacoes',
    label: 'Meditações guiadas',
    eyebrow: 'PRÁTICA',
    title: 'Biblioteca que transmite bem-estar',
    paragraph:
      'Mais de 60 meditações com Dr. Joe Dispenza e Código da Abundância. Sem anúncios, sempre disponíveis. Experimente.',
    audio: { label: 'Respire fundo para aliviar', meta: '0:00 / 3:42' },
    cta: 'Saber mais',
    ctaTo: '/register?plan=annual&from=feature_meditacoes',
    from: 'feature_meditacoes',
    bg: '#FFA1CC',
    textColor: '#1A1A1A',
    Visual: VisualMeditacoes,
  },
  {
    key: 'sono',
    label: 'Recursos para dormir',
    eyebrow: 'SONO',
    title: 'Adormeça em qualquer lugar',
    paragraph:
      'Sons, paisagens e meditações para um sono profundo. Acompanhe seu protocolo noite por noite, sem esforço.',
    audio: null,
    cta: 'Explorar recursos de sono',
    ctaTo: '/register?plan=annual&from=feature_sono',
    from: 'feature_sono',
    bg: '#3B197F',
    textColor: '#FFFFFF',
    Visual: VisualSono,
  },
  {
    key: 'aneis',
    label: 'Cinco Anéis',
    eyebrow: 'RITUAL',
    title: 'Exercícios para fazer em qualquer lugar',
    paragraph:
      'Cinco anéis sagrados que estruturam seu dia: respiração, gratidão, presença, intenção e descanso. Construa hábito.',
    audio: null,
    cta: 'Conhecer os anéis',
    ctaTo: '/register?plan=annual&from=feature_aneis',
    from: 'feature_aneis',
    bg: '#02873E',
    textColor: '#FFFFFF',
    Visual: VisualAneis,
  },
  {
    key: 'estoico',
    label: 'Diário Estoico',
    eyebrow: 'FILOSOFIA',
    title: '366 lições para a vida boa',
    paragraph:
      'Uma lição estoica por dia. Marco Aurélio, Sêneca, Epicteto — interpretados para o agora, com espaço para escrever.',
    audio: null,
    cta: 'Começar diário',
    ctaTo: '/register?plan=annual&from=feature_estoico',
    from: 'feature_estoico',
    bg: '#0061EF',
    textColor: '#FFFFFF',
    Visual: VisualEstoico,
  },
];

// ──────────────────────────────────────────────────────────────────────

export default function TresPilaresSection() {
  const { variant } = useHeadlineVariant();
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState({ cardWidth: 0, gap: 0, wrapWidth: 0 });
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef(0);
  const renderedXRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const prevIndexRef = useRef(0);

  // Mede wrap + define card/gap. Cards são levemente menores que o wrap pra
  // permitir peek igual nos dois lados quando o card ativo está centralizado.
  useEffect(() => {
    const wrap = wrapRef.current;
    const track = trackRef.current;
    if (!wrap || !track) return;

    const update = () => {
      const isMobile = window.innerWidth < 900;
      const SIDE_PEEK = isMobile ? 28 : 140;
      const GAP = isMobile ? 12 : 16;
      const wrapWidth = wrap.clientWidth;
      const cardWidth = Math.max(0, wrapWidth - 2 * SIDE_PEEK);
      track.style.setProperty('--feat-card-w', `${cardWidth}px`);
      track.style.setProperty('--feat-gap', `${GAP}px`);
      setMetrics({ cardWidth, gap: GAP, wrapWidth });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(wrap);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  // Target X em pixels (valor aplicado direto em translateX) — centraliza
  // o card ativo. Sem clamp pra dar respiro nos extremos como na referência.
  const targetX = (() => {
    const { cardWidth, gap, wrapWidth } = metrics;
    if (!cardWidth) return 0;
    return (wrapWidth - cardWidth) / 2 - activeIndex * (cardWidth + gap);
  })();

  // Animação Headspace-style: requestAnimationFrame + easeOutSine, ~300ms.
  // Aplica transform direto no DOM via ref pra evitar re-render por frame.
  useEffect(() => {
    const track = trackRef.current;
    if (!track || !metrics.cardWidth) return;

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const isIndexChange = prevIndexRef.current !== activeIndex;
    prevIndexRef.current = activeIndex;

    // Setup inicial OU resize → snap direto (sem animação)
    if (!isIndexChange) {
      track.style.transform = `translateX(${targetX}px)`;
      renderedXRef.current = targetX;
      return;
    }

    const fromX = renderedXRef.current;
    const toX = targetX;
    const duration = 300;
    const start = performance.now();
    const easeOutSine = (t: number) => Math.sin((t * Math.PI) / 2);

    const frame = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = easeOutSine(t);
      const x = fromX + (toX - fromX) * eased;
      track.style.transform = `translateX(${x}px)`;
      renderedXRef.current = x;
      if (t < 1) {
        rafRef.current = requestAnimationFrame(frame);
      } else {
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(frame);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [targetX, activeIndex, metrics.cardWidth]);

  const handleSelect = (index: number, from: string) => {
    const clamped = Math.max(0, Math.min(TABS.length - 1, index));
    setActiveIndex(clamped);
    trackLandingCta({
      section: 'features_carousel',
      plan: 'annual',
      from: `tab_${from}`,
      headline_variant: variant,
    });
  };

  // Swipe touch (mobile)
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  };
  const onTouchEnd = () => {
    if (touchStartX.current === null) return;
    const threshold = 50;
    if (Math.abs(touchDeltaX.current) > threshold) {
      const dir = touchDeltaX.current < 0 ? 1 : -1;
      const next = activeIndex + dir;
      if (next >= 0 && next < TABS.length) {
        handleSelect(next, TABS[next].from);
      }
    }
    touchStartX.current = null;
    touchDeltaX.current = 0;
  };

  // Setas do teclado (PC)
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = activeIndex + 1;
      if (next < TABS.length) handleSelect(next, TABS[next].from);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev = activeIndex - 1;
      if (prev >= 0) handleSelect(prev, TABS[prev].from);
    }
  };

  return (
    <section className="lp-features" aria-labelledby="features-heading">
      <h2 id="features-heading" className="lp-features-title scroll-reveal">
        O aplicativo de saúde mental
        <br />
        para todos os momentos.
      </h2>

      <div className="lp-features-tabs" role="tablist" aria-label="Módulos do ECO">
        {TABS.map((tab, i) => {
          const isActive = i === activeIndex;
          return (
            <button
              key={tab.key}
              role="tab"
              type="button"
              aria-selected={isActive}
              aria-controls={`feat-panel-${tab.key}`}
              id={`feat-tab-${tab.key}`}
              className={`lp-features-tab ${isActive ? 'is-active' : ''}`}
              onClick={() => handleSelect(i, tab.from)}
            >
              {isActive && <span className="lp-features-tab-dot" aria-hidden="true" />}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div
        className="lp-features-track-wrap"
        ref={wrapRef}
        tabIndex={0}
        role="region"
        aria-roledescription="carousel"
        aria-label="Módulos do ECO — use ← → para navegar"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onKeyDown={onKeyDown}
      >
        <div
          ref={trackRef}
          className="lp-features-track"
        >
          {TABS.map((tab, i) => {
            const isActive = i === activeIndex;
            const { Visual } = tab;
            return (
              <article
                key={tab.key}
                id={`feat-panel-${tab.key}`}
                role="tabpanel"
                aria-labelledby={`feat-tab-${tab.key}`}
                aria-hidden={!isActive}
                className={`lp-features-card ${isActive ? 'is-active' : ''}`}
                style={{
                  background: tab.bg,
                  color: tab.textColor,
                  ['--feat-card-text' as string]: tab.textColor,
                }}
              >
                <div className="lp-features-card-visual">
                  <Visual />
                </div>
                <div className="lp-features-card-body">
                  <p className="lp-features-eyebrow">{tab.eyebrow}</p>
                  <h3 className="lp-features-card-title">{tab.title}</h3>
                  <p className="lp-features-card-para">{tab.paragraph}</p>

                  {tab.audio && (
                    <div className="lp-features-audio">
                      <button
                        type="button"
                        className="lp-features-audio-btn"
                        aria-label={`Tocar ${tab.audio.label}`}
                      >
                        <Play size={18} fill="currentColor" strokeWidth={0} />
                      </button>
                      <div className="lp-features-audio-info">
                        <strong>{tab.audio.label}</strong>
                        <div className="lp-features-audio-bar">
                          <span />
                        </div>
                        <small>{tab.audio.meta}</small>
                      </div>
                    </div>
                  )}

                  <Link
                    to={tab.ctaTo}
                    className="lp-features-cta"
                    onClick={() =>
                      trackLandingCta({
                        section: 'features_carousel',
                        plan: 'annual',
                        from: tab.from,
                        headline_variant: variant,
                      })
                    }
                  >
                    {tab.cta}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="lp-features-dots" role="tablist" aria-label="Paginação">
        {TABS.map((tab, i) => (
          <button
            key={tab.key}
            type="button"
            className={`lp-features-dot ${i === activeIndex ? 'is-active' : ''}`}
            aria-label={`Ir para ${tab.label}`}
            aria-current={i === activeIndex ? 'true' : undefined}
            onClick={() => handleSelect(i, tab.from)}
          />
        ))}
      </div>
    </section>
  );
}
