import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';
import { useHeadlineVariant } from '@/hooks/useHeadlineVariant';
import { trackLandingCta } from './trackLandingCta';

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

const VisualSono = () => (
  <div className="lp-feat-vis lp-feat-vis--sono">
    <div className="lp-feat-sono-search">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
        <path d="m20 20-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span>Adormecer aos poucos</span>
    </div>
    <div className="lp-feat-sono-scene">
      <div className="lp-feat-sono-mountain" />
      <div className="lp-feat-sono-mountain lp-feat-sono-mountain--right" />
      <div className="lp-feat-sono-moon" />
      <div className="lp-feat-sono-star lp-feat-sono-star--a" />
      <div className="lp-feat-sono-star lp-feat-sono-star--b" />
      <div className="lp-feat-sono-star lp-feat-sono-star--c" />
    </div>
    <p className="lp-feat-sono-caption">Protocolo do Sono · Vale da calma</p>
  </div>
);

const VisualAneis = () => (
  <div className="lp-feat-vis lp-feat-vis--rings">
    <svg viewBox="0 0 200 200" width="200" height="200" aria-hidden="true">
      <circle cx="100" cy="100" r="84" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="6" />
      <circle cx="100" cy="100" r="68" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="6" />
      <circle cx="100" cy="100" r="52" fill="none" stroke="rgba(255,255,255,0.48)" strokeWidth="6" />
      <circle cx="100" cy="100" r="36" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="6" />
      <circle cx="100" cy="100" r="20" fill="#F4F1EC" />
      {/* arcos de progresso */}
      <circle cx="100" cy="100" r="84" fill="none" stroke="#FFE08A" strokeWidth="6"
        strokeDasharray="320 280" strokeDashoffset="80" strokeLinecap="round"
        transform="rotate(-90 100 100)" />
      <circle cx="100" cy="100" r="68" fill="none" stroke="#FFB066" strokeWidth="6"
        strokeDasharray="260 200" strokeDashoffset="-30" strokeLinecap="round"
        transform="rotate(-90 100 100)" />
      <circle cx="100" cy="100" r="52" fill="none" stroke="#7FCBFF" strokeWidth="6"
        strokeDasharray="220 160" strokeDashoffset="40" strokeLinecap="round"
        transform="rotate(-90 100 100)" />
    </svg>
    <div className="lp-feat-rings-labels">
      <span>Respiração</span>
      <span>Gratidão</span>
      <span>Presença</span>
    </div>
  </div>
);

const VisualEstoico = () => (
  <div className="lp-feat-vis lp-feat-vis--book">
    <div className="lp-feat-book">
      <div className="lp-feat-book-page lp-feat-book-page--left">
        <p className="lp-feat-book-date">DIA 142</p>
        <p className="lp-feat-book-quote">
          “A obstáculo no caminho torna-se o caminho.”
        </p>
        <p className="lp-feat-book-author">— Marco Aurélio</p>
      </div>
      <div className="lp-feat-book-page lp-feat-book-page--right">
        <div className="lp-feat-book-line lp-feat-book-line--full" />
        <div className="lp-feat-book-line lp-feat-book-line--full" />
        <div className="lp-feat-book-line lp-feat-book-line--short" />
        <div className="lp-feat-book-line lp-feat-book-line--full" />
        <div className="lp-feat-book-line lp-feat-book-line--mid" />
      </div>
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
    bg: 'linear-gradient(155deg, #FFE060 0%, #FFC83A 100%)',
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
    bg: 'linear-gradient(160deg, #FFB6D5 0%, #F26AA5 100%)',
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
    bg: 'linear-gradient(160deg, #3A2178 0%, #1E124A 100%)',
    textColor: '#F4F1EC',
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
    bg: 'linear-gradient(160deg, #2F5A3A 0%, #1B3A26 100%)',
    textColor: '#F4F1EC',
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
    bg: 'linear-gradient(160deg, #1F3A5E 0%, #0D1F36 100%)',
    textColor: '#F4F1EC',
    Visual: VisualEstoico,
  },
];

// ──────────────────────────────────────────────────────────────────────

export default function TresPilaresSection() {
  const { variant } = useHeadlineVariant();
  const [activeIndex, setActiveIndex] = useState(0);

  const handleSelect = (index: number, from: string) => {
    setActiveIndex(index);
    trackLandingCta({
      section: 'features_carousel',
      plan: 'annual',
      from: `tab_${from}`,
      headline_variant: variant,
    });
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

      <div className="lp-features-track-wrap">
        <div
          className="lp-features-track"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
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
                style={{ background: tab.bg, color: tab.textColor }}
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
