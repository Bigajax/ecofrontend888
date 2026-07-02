import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import '@/ecotopia-landing.css';
import EcotopiaTopbar from '@/components/landing/EcotopiaTopbar';
import EcotopiaFooter from '@/components/landing/EcotopiaFooter';
import MethodMarquee from '@/components/landing/MethodMarquee';
import SonoDorSection from '@/components/landing/SonoDorSection';
import SonoFaqSection from '@/components/landing/SonoFaqSection';
import { useScrollReveal } from '@/components/landing/useScrollReveal';
import SonoStickyCta from '@/components/sono/SonoStickyCta';
import { useSonoHeroVariant } from '@/hooks/useSonoHeroVariant';
import { useSonoSectionInView } from '@/hooks/useSonoSectionInView';
import { useStickyCtaVisibility } from '@/hooks/useStickyCtaVisibility';
import { PROTOCOL_NIGHTS } from '@/data/protocolNights';
import { trackLandingVista, trackCtaClicado } from '@/lib/mixpanelAssinarFunnel';
import { fbq } from '@/lib/fbpixel';
import { OFFER, SONO_PIX_PRICE_LABEL } from '@/constants/offerCopy';

// ─── Dados das seções ────────────────────────────────────────────────

// Seção de diferencial: posiciona o produto como caminho guiado (não biblioteca
// de áudios). Reusa os ícones ilustrados da landing (mesmos .webp das antigas
// colunas de valor).
const DIFERENCIAL_CARDS: {
  icon: string;
  // deite_se: cena ao fundo do card (no lugar do ícone).
  bg: string;
  title: string;
  // deite_se: título em 2 linhas (branca + lilás), espelhando a referência.
  titleMain: string;
  titleAccent: string;
  body: string;
}[] = [
  {
    icon: '/images/sono-icon-deite-mente.webp',
    bg: '/images/sono-diff2-play-bg.webp',
    title: 'Você não escolhe o que fazer',
    titleMain: 'Você não escolhe',
    titleAccent: 'o que fazer',
    body: 'A prática da noite já está pronta. É deitar, apertar play e seguir a voz.',
  },
  {
    icon: '/images/sono-icon-meditacao.webp',
    bg: '/images/sono-diff2-stones-bg.webp',
    title: 'Cada noite prepara a próxima',
    titleMain: 'Cada noite',
    titleAccent: 'prepara a próxima',
    body: 'A sequência começa tirando o corpo do modo alerta e avança para pensamentos, tensão e sono profundo.',
  },
  {
    icon: '/images/sono-icon-estresse.webp',
    bg: '/images/sono-diff2-heart-bg.webp',
    title: 'Não depende de força de vontade',
    titleMain: 'Não depende de',
    titleAccent: 'força de vontade',
    body: 'O ritual foi criado pro momento em que você está cansado demais pra pensar em técnica.',
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
      'Trilhas longas que sustentam o sono profundo durante a noite, para acordar revigorado, sem aquele despertar das 3 da manhã.',
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
      'Comece suas manhãs da maneira certa: aprenda a acordar se sentindo alerta, revigorado e pronto para o dia.',
    links: [
      'Por que eu acordo cansado?',
      'Como acordar mais facilmente',
      'Como parar de adiar o alarme',
      'Como me tornar uma pessoa matutina',
    ],
  },
];

// Ordem espelha os 3 marcadores da seção de dor:
// mente não desliga · acordar no meio da noite · demorar pra dormir/descansar.
const TESTIMONIALS: { id: string; quote: string; name: string; photo?: string }[] = [
  {
    id: 't2',
    quote: 'Minha mente ficava acelerada quando eu deitava. As práticas me ajudaram a encerrar o dia com mais tranquilidade.',
    name: 'Beatriz',
  },
  {
    id: 't3',
    quote: 'Eu acordava às 3h e ficava horas olhando o teto. Agora, quando acordo, consigo voltar a dormir.',
    name: 'Camila',
  },
  {
    id: 't1',
    quote: 'Eu demorava mais de uma hora para dormir. Depois de alguns dias usando o protocolo comecei a pegar no sono muito mais rápido.',
    name: 'Mariana',
  },
];

// Depoimentos da variante deite_se (tema noturno): nome · idade · cidade,
// avatar por inicial (projeto não usa fotos em depoimentos).
const TESTIMONIALS_NIGHT: { id: string; quote: string; name: string; age: string; city: string }[] = [
  {
    id: 'n1',
    quote: 'Minha mente ficava acelerada quando eu deitava. As práticas me ajudaram a encerrar o dia com mais tranquilidade e o sono vem de forma muito mais natural.',
    name: 'Juliana R.',
    age: '41 anos',
    city: 'São Paulo, SP',
  },
  {
    id: 'n2',
    quote: 'Eu não conseguia parar de pensar nas coisas do dia. Com o Ritual Boa Noite, meu corpo relaxa antes da mente e isso fez toda a diferença.',
    name: 'Marcos T.',
    age: '34 anos',
    city: 'Curitiba, PR',
  },
  {
    id: 'n3',
    quote: 'Simples, direto e muito eficaz. Era como se alguém segurasse minha mão e me tirasse do estado de alerta. Virou parte da minha rotina.',
    name: 'Camila A.',
    age: '29 anos',
    city: 'Belo Horizonte, MG',
  },
];

// CTA da oferta navy — orientado ao desejo (o sinal de "grátis/R$ 0" fica nos
// bullets e na linha de garantia logo acima do botão).
const CTA_LABEL = 'Quero dormir sem remédio';

// Noite 1 em destaque + demais noites (layout editorial da landing
// Protocolo-Sono-v2: featured card + lista/grade com cadeado).
const NIGHT_ONE = PROTOCOL_NIGHTS[0];
const REST_NIGHTS = PROTOCOL_NIGHTS.slice(1);

// ─── Componente ──────────────────────────────────────────────────────

export default function EcotopiaSonoPage() {
  useScrollReveal('.ecotopia-lp');

  // Hero por variante (utm_term dos anúncios); default = promessa atual.
  const hero = useSonoHeroVariant();
  // Dispara "Funil Sono · Seção vista {secao: diferencial}" ao rolar até a seção.
  const diferencialRef = useSonoSectionInView<HTMLElement>('diferencial');

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

  // Carrossel "Seu Ritual Boa Noite" (3 cards) — bolinhas só no mobile.
  const ritualTrackRef = useRef<HTMLDivElement>(null);
  const [ritualPage, setRitualPage] = useState(0);

  const goToRitualPage = (page: number) => {
    const track = ritualTrackRef.current;
    if (!track) return;
    const clamped = Math.max(0, Math.min(2, page));
    track.scrollTo({ left: track.clientWidth * clamped, behavior: 'smooth' });
    setRitualPage(clamped);
  };

  const handleRitualScroll = () => {
    const track = ritualTrackRef.current;
    if (!track || track.clientWidth === 0) return;
    setRitualPage(Math.round(track.scrollLeft / track.clientWidth));
  };

  // Carrossel de depoimentos (3 cards) — bolinhas só no mobile.
  const storiesTrackRef = useRef<HTMLDivElement>(null);
  const [storiesPage, setStoriesPage] = useState(0);

  const goToStoriesPage = (page: number) => {
    const track = storiesTrackRef.current;
    if (!track) return;
    const clamped = Math.max(0, Math.min(2, page));
    track.scrollTo({ left: track.clientWidth * clamped, behavior: 'smooth' });
    setStoriesPage(clamped);
  };

  const handleStoriesScroll = () => {
    const track = storiesTrackRef.current;
    if (!track || track.clientWidth === 0) return;
    setStoriesPage(Math.round(track.scrollLeft / track.clientWidth));
  };

  // Guarda contra o double-mount do StrictMode: "Landing vista" e o
  // ViewContent do Pixel devem disparar uma vez por pageview.
  const landingTracked = useRef(false);
  useEffect(() => {
    if (landingTracked.current) return;
    landingTracked.current = true;
    try {
      trackLandingVista();
    } catch {
      // noop
    }
    // Meta Pixel: visitante viu a landing do Protocolo do Sono.
    fbq('ViewContent', {
      content_name: 'Protocolo do Sono',
      content_category: 'sono',
    });
  }, []);

  const [activeTab, setActiveTab] = useState<string>(TABS[0].id);
  const activeTabData = TABS.find((t) => t.id === activeTab) ?? TABS[0];

  const [selectedOfferPlan, setSelectedOfferPlan] = useState<'annual' | 'monthly'>('monthly');

  // iPhone do hero rotaciona pelas 7 noites (mesma config do AppIcon da
  // landing Protocolo-Sono-v2): troca a cada 2,8s com crossfade de 700ms
  // na arte e flip do rótulo/título.
  const [heroNightIndex, setHeroNightIndex] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setHeroNightIndex((prev) => (prev + 1) % PROTOCOL_NIGHTS.length);
    }, 2800);
    return () => clearInterval(interval);
  }, []);
  const heroNight = PROTOCOL_NIGHTS[heroNightIndex];

  // `isConviteHero` segue controlando o VISUAL/copy da landing por variante de
  // herói (não mexemos no criativo). Mas o ROTEAMENTO do pagamento agora é único:
  // TODO CTA (qualquer variante) leva pra experiência guest (Noite 1 grátis → Pix),
  // desligando o caminho de cartão/assinatura (/assinar) pro tráfego pago.
  const isConviteHero = hero.variant === 'deite_se';
  const sonoCtaTo = (from: string) => `/sono/experiencia?source=${from}`;
  const sonoCtaClick =
    (
      from: string,
      plan: 'monthly' | 'annual' = 'monthly',
      posicao?: 'heroi' | 'sticky' | 'rodape',
    ) =>
    () =>
      trackCtaClicado({ plan, placement: `${from}_experiencia`, posicao });

  // Refs nas âncoras (CTA do herói e da oferta) que controlam o sticky: ele
  // aparece quando nenhuma das duas está visível.
  const heroCtaRef = useRef<HTMLAnchorElement>(null);
  const offerCtaRef = useRef<HTMLAnchorElement>(null);
  const stickyVisible = useStickyCtaVisibility([heroCtaRef, offerCtaRef]);

  return (
    <div className="ecotopia-lp lp-sono">
      <EcotopiaTopbar
        ctaHref={sonoCtaTo('sono_topbar')}
        onCtaClick={sonoCtaClick('sono_topbar')}
        // deite_se: copy curta no CTA do nav (cabe no mobile sem quebrar);
        // demais variantes mantêm "Experimente grátis".
        ctaLabel={isConviteHero ? 'Ouça grátis' : undefined}
        // Só na variante "convite" (deite_se) o "Começar agora" do drawer mobile
        // segue pra experiência; nas outras mantém o default (/assinar).
        drawerPrimaryHref={isConviteHero ? sonoCtaTo('sono_mobile_drawer') : undefined}
        onDrawerPrimaryClick={isConviteHero ? sonoCtaClick('sono_mobile_drawer') : undefined}
        // Na deite-se o banner do topo vira "céu estrelado" e convida pra
        // experiência (em vez da faixa azul de trial pro /assinar).
        bannerStarry={isConviteHero}
        bannerLabel={isConviteHero ? 'Sua primeira noite é grátis · ouça agora' : undefined}
        bannerHref={isConviteHero ? sonoCtaTo('sono_top_banner') : undefined}
        onBannerClick={isConviteHero ? sonoCtaClick('sono_top_banner') : undefined}
        brandScrollsToTop
        night={isConviteHero}
      />

      {/* ─── Hero · promessa de sono (sem preço — só promessa + CTA) ─── */}
      <section className={`lp-sono-hero lp-sono-hero--v2${isConviteHero ? ' lp-sono-hero--deite' : ''}`}>
        <div className="lp-sono-hero-inner">
          <div className="lp-sono-hero-text">
            {isConviteHero && (
              <span className="lp-sono-hero-ritual scroll-reveal">
                Ritual · Boa noite Ecotopia
              </span>
            )}
            <h1 className="scroll-reveal">
              {isConviteHero ? (
                <>
                  Deite-se.
                  <br />
                  Coloque os fones.
                  <br />
                  <span className="lp-sono-conduz">A gente conduz.</span>
                </>
              ) : (
                <>
                  {hero.h1Line1 && (
                    <>
                      {hero.h1Line1}
                      <br />
                    </>
                  )}
                  {hero.h1Pre}
                  <span className="lp-sono-mark-starry">{hero.h1Mark}</span>
                  {hero.h1Pos}
                </>
              )}
            </h1>

            <p className="lp-sono-hero-lead scroll-reveal stagger-1">
              {hero.lead}
            </p>

            <Link
              ref={heroCtaRef}
              to={sonoCtaTo('sono_hero')}
              className="lp-sono-hero-cta-primary scroll-reveal stagger-2"
              onClick={sonoCtaClick('sono_hero', 'monthly', 'heroi')}
            >
              {isConviteHero && (
                <svg className="lp-sono-cta-play" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
              {hero.cta}
            </Link>

            {!isConviteHero && (
              <p className="lp-sono-hero-microcopy scroll-reveal stagger-3">
                <svg
                  className="lp-sono-hero-microcopy-shield"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M12 3l7 3v5c0 4.6-3 8.2-7 10-4-1.8-7-5.4-7-10V6l7-3z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
                {hero.microcopyPrefix}
                <Link to="/cancelar-assinatura" className="lp-sono-hero-microcopy-link">
                  cancele quando quiser
                </Link>
              </p>
            )}

            {/* Convite (deite_se → /sono/experiencia): planta a oferta paga ANTES
                do clique. Texto puro (sem link), cor clara p/ o hero escuro. */}
            {isConviteHero && (
              <p className="lp-sono-hero-microcopy lp-sono-hero-microcopy--convite scroll-reveal stagger-3">
                <svg
                  className="lp-sono-hero-microcopy-shield"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M12 3l7 3v5c0 4.6-3 8.2-7 10-4-1.8-7-5.4-7-10V6l7-3z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
                Noite 1 gratuita. Depois, continue o protocolo completo por{' '}
                {SONO_PIX_PRICE_LABEL} no Pix. Pagamento único, sem assinatura.
              </p>
            )}

            {/* Linha de atributos (só deite_se) — espelha a referência, mas fala
                "meditações", não "áudios". */}
            {isConviteHero && (
              <ul className="lp-sono-hero-feats scroll-reveal stagger-3" aria-label="O que é a experiência">
                <li className="lp-sono-hero-feat">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M4 13v-1a8 8 0 0 1 16 0v1" />
                    <path d="M4 14a2 2 0 0 1 2-2h1v6H6a2 2 0 0 1-2-2v-2z" />
                    <path d="M20 14a2 2 0 0 0-2-2h-1v6h1a2 2 0 0 0 2-2v-2z" />
                  </svg>
                  Meditações de<br />5 a 10 min
                </li>
                <li className="lp-sono-hero-feat">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z" />
                    <path d="M2 21c0-3 1.85-5.36 5.08-6" />
                  </svg>
                  Sem remédio<br />e sem técnica
                </li>
                <li className="lp-sono-hero-feat">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" />
                  </svg>
                  Feito para<br />usar dormindo
                </li>
              </ul>
            )}
          </div>

          {/* Mock visual estático do player (md+) — reaproveita o widget da demo
              dentro de um frame de iPhone em CSS puro; coluna direita do hero. */}
          <div className="lp-sono-hero-mock scroll-reveal stagger-2" aria-hidden>
            <div className="lp-sono-iphone-scene">
              <img
                className="lp-sono-scene-moon"
                src="/images/sono-deco-lua-roxa.webp"
                alt=""
                loading="lazy"
                decoding="async"
              />
              <img
                className="lp-sono-scene-cloud lp-sono-scene-cloud--left"
                src="/images/sono-deco-nuvem-branca.webp"
                alt=""
                loading="lazy"
                decoding="async"
              />
              <img
                className="lp-sono-scene-flower"
                src="/images/sono-deco-flor.webp"
                alt=""
                loading="lazy"
                decoding="async"
              />
              <img
                className="lp-sono-scene-cloud lp-sono-scene-cloud--right"
                src="/images/sono-deco-nuvem-branca.webp"
                alt=""
                loading="lazy"
                decoding="async"
              />
            <div className="lp-sono-iphone">
              <span className="lp-sono-iphone-btn lp-sono-iphone-btn--silent" />
              <span className="lp-sono-iphone-btn lp-sono-iphone-btn--volup" />
              <span className="lp-sono-iphone-btn lp-sono-iphone-btn--voldown" />
              <span className="lp-sono-iphone-btn lp-sono-iphone-btn--power" />

              <div className="lp-sono-iphone-screen">
                <div className="lp-sono-iphone-statusbar">
                  <span className="lp-sono-iphone-time">23:47</span>
                  <span className="lp-sono-iphone-island" />
                  <span className="lp-sono-iphone-status-icons">
                    <svg width="16" height="11" viewBox="0 0 16 11" fill="currentColor">
                      <rect x="0" y="7" width="3" height="4" rx="0.8" />
                      <rect x="4.3" y="5" width="3" height="6" rx="0.8" />
                      <rect x="8.6" y="2.5" width="3" height="8.5" rx="0.8" />
                      <rect x="12.9" y="0" width="3" height="11" rx="0.8" />
                    </svg>
                    <svg width="15" height="11" viewBox="0 0 15 11" fill="currentColor">
                      <path d="M7.5 9.2a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8zM4.6 7.4l1.5 1.5a2 2 0 0 1 2.8 0l1.5-1.5a4.2 4.2 0 0 0-5.8 0zM2 4.8l1.5 1.5a6 6 0 0 1 8 0L13 4.8a8.2 8.2 0 0 0-11 0z" transform="translate(0,-1.2)" />
                    </svg>
                    <svg width="25" height="12" viewBox="0 0 25 12" fill="none">
                      <rect x="0.5" y="0.5" width="21" height="11" rx="3" stroke="currentColor" strokeOpacity="0.45" />
                      <rect x="2" y="2" width="13" height="8" rx="1.6" fill="currentColor" />
                      <path d="M23.5 4v4a2.2 2.2 0 0 0 0-4z" fill="currentColor" fillOpacity="0.45" />
                    </svg>
                  </span>
                </div>

                <div className="lp-sono-mini-player">
              <p
                key={`eyebrow-${heroNightIndex}`}
                className="lp-sono-mini-player-eyebrow lp-sono-label-flip"
              >
                Noite {heroNight.night} de 7
              </p>

              <div className="lp-sono-mini-player-art">
                {PROTOCOL_NIGHTS.map((night, i) => (
                  <img
                    key={night.id}
                    src={night.imageUrl}
                    alt=""
                    loading={i === 0 ? 'eager' : 'lazy'}
                    decoding="async"
                    style={{ opacity: i === heroNightIndex ? 1 : 0 }}
                  />
                ))}
              </div>

              <div className="lp-sono-mini-player-meta">
                <p
                  key={`title-${heroNightIndex}`}
                  className="lp-sono-mini-player-title lp-sono-label-flip"
                >
                  {heroNight.title}
                </p>
                <p
                  key={`duration-${heroNightIndex}`}
                  className="lp-sono-mini-player-duration lp-sono-label-flip"
                >
                  {heroNight.duration}
                </p>
              </div>

              <div className="lp-sono-mini-player-dots">
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <span
                    key={n}
                    className={`lp-sono-mini-player-dot ${n === heroNight.night ? 'is-current' : ''}`}
                  />
                ))}
              </div>

              <div className="lp-sono-mini-player-controls">
                <span className="lp-sono-mini-player-skip">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="11 17 6 12 11 7" />
                    <path d="M18 18a6 6 0 0 0-6-6H6" />
                  </svg>
                  <span>15</span>
                </span>

                <span className="lp-sono-mini-player-play">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7 5.5v13a1 1 0 0 0 1.55.83l10-6.5a1 1 0 0 0 0-1.66l-10-6.5A1 1 0 0 0 7 5.5z" />
                  </svg>
                </span>

                <span className="lp-sono-mini-player-skip">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="13 17 18 12 13 7" />
                    <path d="M6 18a6 6 0 0 1 6-6h6" />
                  </svg>
                  <span>15</span>
                </span>
              </div>

              <div className="lp-sono-mini-player-progress">
                <span className="lp-sono-mini-player-time">0:00</span>
                <div className="lp-sono-mini-player-bar">
                  <span className="lp-sono-mini-player-fill" />
                  <span className="lp-sono-mini-player-thumb" />
                </div>
                  <span key={`end-${heroNightIndex}`} className="lp-sono-mini-player-time is-end lp-sono-label-flip">{heroNight.duration}</span>
                  </div>
                </div>

                <span className="lp-sono-iphone-homebar" />
              </div>
            </div>
            </div>
          </div>
        </div>

        {/* Barra de atributos integrada no rodapé do hero (só deite_se) */}
        {isConviteHero && (
          <ul className="lp-sono-trust-bar" aria-label="O que você recebe">
            <li className="lp-sono-trust-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M17.5 19a4.5 4.5 0 1 0 0-9 6 6 0 0 0-11.6-1.6A4 4 0 1 0 5 19h12.5z" />
              </svg>
              Primeira noite<br />grátis
            </li>
            <li className="lp-sono-trust-item">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 2.6l2.6 5.7 6.2.7-4.6 4.2 1.3 6.1L12 16.9 6.5 19.3l1.3-6.1L3.2 9l6.2-.7L12 2.6z" />
              </svg>
              Sequência de<br />7 noites
            </li>
            <li className="lp-sono-trust-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M4 12h2M9 6v12M14 3v18M19 9v6M22 12h-1M2 12h0" />
              </svg>
              Para desacelerar<br />mente e corpo
            </li>
            <li className="lp-sono-trust-item">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
              Mais sono de qualidade,<br />mais dias melhores
            </li>
          </ul>
        )}
      </section>

      {/* ─── Faixa de prova (marquee) — só nas variantes de venda; a deite_se
          usa a barra de atributos integrada no rodapé do hero (acima). ─── */}
      {!isConviteHero && (
        <MethodMarquee
          ariaLabel="Resultados da Ecotopia"
          className="lp-method-marquee--starry"
          repeat={4}
          terms={['4,9★ na App Store', '846 pessoas dormem com o protocolo', 'Sessões de 5 a 10 min', 'Feito para desacelerar a mente']}
        />
      )}

      {/* ─── Como usar hoje à noite · 4 passos (só deite_se) ─── */}
      {isConviteHero && (
        <section className="lp-sono-steps" aria-label="Como usar hoje à noite">
          {/* Costura: o navy do herói escorre pra dentro do creme (fim do corte seco) */}
          <div className="lp-sono-seam lp-sono-seam--from-hero" aria-hidden />
          <div className="lp-sono-steps-inner">
            <p className="lp-sono-steps-eyebrow scroll-reveal">Ritual · Boa noite Ecotopia</p>
            <h2 className="lp-sono-steps-title scroll-reveal">
              Como usar <span className="lp-sono-steps-accent">hoje à noite</span>
            </h2>
            <p className="lp-sono-steps-lead scroll-reveal stagger-1">
              Um ritual simples, profundo e transformador.
              <br />
              Siga estes passos e entregue-se à experiência.
            </p>

            <div className="lp-sono-steps-grid">
              {/* 1 · Apague a luz */}
              <div className="lp-sono-step-card scroll-reveal stagger-1">
                <span className="lp-sono-step-num">1</span>
                <div className="lp-sono-step-visual">
                  <img src="/images/sono-apagar-luz-noite.webp" alt="" loading="lazy" decoding="async" style={{ objectPosition: 'center' }} />
                </div>
                <h3 className="lp-sono-step-title">Apague a luz</h3>
                <p className="lp-sono-step-desc">Deite-se como já faria normalmente.</p>
              </div>

              {/* 2 · Coloque os fones */}
              <div className="lp-sono-step-card scroll-reveal stagger-2">
                <span className="lp-sono-step-num">2</span>
                <div className="lp-sono-step-visual">
                  <img src="/images/sono-fones-noite.webp" alt="" loading="lazy" decoding="async" />
                </div>
                <h3 className="lp-sono-step-title">Coloque os fones</h3>
                <p className="lp-sono-step-desc">A voz guia o corpo para sair do modo alerta.</p>
              </div>

              {/* 3 · Dê play na Noite 1 */}
              <div className="lp-sono-step-card scroll-reveal stagger-3">
                <span className="lp-sono-step-num">3</span>
                <div className="lp-sono-step-visual">
                  <img src="/images/sono-iphone-noite1.webp" alt="" loading="lazy" decoding="async" />
                </div>
                <h3 className="lp-sono-step-title">Dê play na Noite 1</h3>
                <p className="lp-sono-step-desc">Você só precisa ouvir. O resto a gente conduz.</p>
              </div>

              {/* 4 · Repita por 7 noites */}
              <div className="lp-sono-step-card scroll-reveal stagger-4">
                <span className="lp-sono-step-num">4</span>
                <div className="lp-sono-step-visual">
                  <img src="/images/sono-calendario-noite.webp" alt="" loading="lazy" decoding="async" />
                </div>
                <h3 className="lp-sono-step-title">Repita por 7 noites</h3>
                <p className="lp-sono-step-desc">Cada noite prepara a próxima.</p>
              </div>
            </div>

            <p className="lp-sono-steps-foot scroll-reveal">
              Menos esforço, mais presença. Você não aperta nada: seu corpo e sua mente encontram o caminho de volta ao descanso profundo.
            </p>
          </div>
        </section>
      )}

      {/* ─── Dor · espelha a cena noturna (reconhecimento) ─── */}
      <SonoDorSection conviteMode={isConviteHero} />

      {/* ─── Seu Ritual Boa Noite · resumo em 3 passos (só deite_se) ─── */}
      {isConviteHero && (
        <section className="lp-sono-ritual" aria-label="Seu Ritual Boa Noite">
          <div className="lp-sono-seam lp-sono-seam--from-dor" aria-hidden />
          <div className="lp-sono-ritual-inner">
            <p className="lp-sono-ritual-eyebrow scroll-reveal">Seu caminho para noites leves</p>
            <h2 className="lp-sono-ritual-title scroll-reveal">
              Seu Ritual <span className="lp-sono-ritual-accent">Boa Noite</span>
            </h2>
            <p className="lp-sono-ritual-lead scroll-reveal stagger-1">
              Uma sequência simples para repetir
              <br />
              quando a mente não desliga.
            </p>

            <div
              className="lp-sono-ritual-cards"
              ref={ritualTrackRef}
              onScroll={handleRitualScroll}
            >
              <div className="lp-sono-ritual-card scroll-reveal stagger-1">
                <img
                  className="lp-sono-ritual-img"
                  src="/images/sono-ritual-play-01.webp"
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
                <h3 className="lp-sono-ritual-card-title">
                  Noite 1 <span className="lp-sono-ritual-accent">grátis</span>
                </h3>
                <span className="lp-sono-ritual-divider" aria-hidden />
                <p className="lp-sono-ritual-card-desc">
                  Comece com uma meditação guiada curta para tirar o corpo do modo alerta.
                </p>
              </div>

              <div className="lp-sono-ritual-card scroll-reveal stagger-2">
                <img
                  className="lp-sono-ritual-img"
                  src="/images/sono-ritual-calendar-02.webp"
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
                <h3 className="lp-sono-ritual-card-title">7 noites em sequência</h3>
                <span className="lp-sono-ritual-divider" aria-hidden />
                <p className="lp-sono-ritual-card-desc">
                  Cada noite prepara a próxima: respiração, relaxamento, pensamentos
                  repetitivos e segurança interna.
                </p>
              </div>

              <div className="lp-sono-ritual-card scroll-reveal stagger-3">
                <img
                  className="lp-sono-ritual-img"
                  src="/images/sono-ritual-headphones-03.webp"
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
                <h3 className="lp-sono-ritual-card-title">
                  Feito para usar <span className="lp-sono-ritual-accent">deitado</span>
                </h3>
                <span className="lp-sono-ritual-divider" aria-hidden />
                <p className="lp-sono-ritual-card-desc">
                  Nada de técnica complicada. Você só coloca os fones, dá play e acompanha.
                </p>
              </div>
            </div>

            {/* bolinhas indicadoras do carrossel (só aparecem no mobile via CSS) */}
            <div className="lp-sono-ritual-dots" role="tablist" aria-label="Navegar pelos passos">
              {[0, 1, 2].map((i) => (
                <button
                  key={i}
                  type="button"
                  className={`lp-sono-ritual-dot${ritualPage === i ? ' is-active' : ''}`}
                  aria-label={`Passo ${i + 1}`}
                  aria-selected={ritualPage === i}
                  onClick={() => goToRitualPage(i)}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Como funciona · Protocolo do Sono: 7 noites em sequência ───
          deite_se: grade noturna "As 7 noites" (igual à referência).
          Demais variantes: layout editorial (Noite 1 destaque + lista/grade). */}
      {isConviteHero ? (
        <section className="lp-sono-n7" aria-label="As 7 noites">
          <div className="lp-sono-seam lp-sono-seam--from-creme" aria-hidden />
          <div className="lp-sono-n7-inner">
            <p className="lp-sono-n7-eyebrow scroll-reveal">Ritual completo</p>
            <h2 className="lp-sono-n7-title scroll-reveal">As <span className="lp-sono-n7-accent">7 noites</span></h2>
            <p className="lp-sono-n7-lead scroll-reveal stagger-1">
              Uma sequência de meditações guiadas para desacelerar a mente,
              relaxar o corpo e preparar o sono profundo.
            </p>

            <div className="lp-sono-n7-grid">
              {PROTOCOL_NIGHTS.map((n, i) => (
                <div
                  className={`lp-sono-n7-card${n.night === 1 ? ' lp-sono-n7-card--free' : ''} scroll-reveal stagger-${(i % 4) + 1}`}
                  key={n.id}
                >
                  <span className="lp-sono-n7-num">{n.night}</span>
                  {/* Porta de entrada gratuita visível na vitrine — amarra a seção ao CTA */}
                  {n.night === 1 && <span className="lp-sono-n7-free">Grátis</span>}
                  <span className="lp-sono-n7-thumb">
                    <img src={n.imageUrl} alt="" loading="lazy" decoding="async" />
                  </span>
                  <span className="lp-sono-n7-kicker">Noite {n.night}</span>
                  <span className="lp-sono-n7-divider" aria-hidden />
                  <h3 className="lp-sono-n7-card-title">{n.title}</h3>
                  <p className="lp-sono-n7-card-desc">{n.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section className="lp-sono-grid-section lp-sono-protocol">
        <div className="lp-sono-section-inner lp-sono-nights-inner">
          <h2 className="lp-sono-h2 scroll-reveal lp-sono-nights-h2">
            Sete noites.
            <br />
            <span className="lp-sono-nights-h2-soft">Uma sequência para ensinar seu corpo a desligar.</span>
          </h2>

          <p className="lp-sono-nights-lead scroll-reveal stagger-1">
            Cada noite trabalha uma parte do estado de alerta: respiração,
            controle mental, tensão corporal, pensamentos repetitivos e segurança interna.
          </p>

          <Link
            to={sonoCtaTo(`sono_protocolo_${NIGHT_ONE.id}`)}
            className="lp-sono-nights-featured scroll-reveal"
            onClick={sonoCtaClick(`sono_protocolo_${NIGHT_ONE.id}`)}
          >
            <span className="lp-sono-nights-featured-media">
              <img src={NIGHT_ONE.imageUrl} alt="" loading="lazy" decoding="async" />
              <span className="lp-sono-nights-badge">A primeira · grátis</span>
            </span>
            <span className="lp-sono-nights-featured-body">
              <span className="lp-sono-nights-kicker">
                Noite {NIGHT_ONE.night} · {NIGHT_ONE.duration}
              </span>
              <span className="lp-sono-nights-featured-title">{NIGHT_ONE.title}</span>
              <span className="lp-sono-nights-featured-desc">{NIGHT_ONE.description}</span>
            </span>
          </Link>

          {/* demais noites — lista compacta (mobile) */}
          <div className="lp-sono-nights-list">
            {REST_NIGHTS.map((n, i) => (
              <Link
                key={n.id}
                to={sonoCtaTo(`sono_protocolo_${n.id}`)}
                className={`lp-sono-nights-row scroll-reveal stagger-${(i % 5) + 1}`}
                onClick={sonoCtaClick(`sono_protocolo_${n.id}`)}
              >
                <span className="lp-sono-nights-row-thumb">
                  <img src={n.imageUrl} alt="" loading="lazy" decoding="async" />
                </span>
                <span className="lp-sono-nights-row-body">
                  <span className="lp-sono-nights-kicker">
                    Noite {n.night} · {n.duration}
                  </span>
                  <span className="lp-sono-nights-row-title">{n.title}</span>
                </span>
                <span className="lp-sono-nights-play" aria-hidden>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7 5.5v13a1 1 0 0 0 1.55.83l10-6.5a1 1 0 0 0 0-1.66l-10-6.5A1 1 0 0 0 7 5.5z" />
                  </svg>
                </span>
              </Link>
            ))}
          </div>

          {/* demais noites — grade (md+) */}
          <div className="lp-sono-nights-grid">
            {REST_NIGHTS.map((n, i) => (
              <Link
                key={n.id}
                to={sonoCtaTo(`sono_protocolo_${n.id}`)}
                className={`lp-sono-nights-card scroll-reveal stagger-${(i % 5) + 1}`}
                onClick={sonoCtaClick(`sono_protocolo_${n.id}`)}
              >
                <span className="lp-sono-nights-card-media">
                  <img src={n.imageUrl} alt="" loading="lazy" decoding="async" />
                  <span className="lp-sono-nights-lock lp-sono-nights-lock--overlay" aria-hidden>
                    <LockGlyph />
                  </span>
                </span>
                <span className="lp-sono-nights-card-body">
                  <span className="lp-sono-nights-kicker">
                    Noite {n.night} · {n.duration}
                  </span>
                  <span className="lp-sono-nights-card-title">{n.title}</span>
                </span>
              </Link>
            ))}
          </div>

          <p className="lp-sono-nights-highlight scroll-reveal">
            Na primeira noite, você já começa com um áudio guiado de 8 minutos
            pra sair do modo alerta antes de dormir.
          </p>
        </div>
      </section>
      )}

      {/* ─── Depoimentos ───
          deite_se: versão noturna (igual à referência). Demais: versão atual. */}
      {isConviteHero ? (
        <section className="lp-sono-stories" aria-label="Depoimentos">
          <div className="lp-sono-seam lp-sono-seam--from-n7" aria-hidden />
          <div className="lp-sono-stories-inner">
            <p className="lp-sono-stories-eyebrow scroll-reveal">Quem já usa, sente</p>
            <h2 className="lp-sono-stories-title scroll-reveal">
              Quem já aprendeu
              <br />
              <span className="lp-sono-stories-accent">a desligar</span>
            </h2>
            <p className="lp-sono-stories-lead scroll-reveal stagger-1">
              Histórias reais de noites que mudaram.
            </p>

            <div
              className="lp-sono-stories-grid"
              ref={storiesTrackRef}
              onScroll={handleStoriesScroll}
            >
              {TESTIMONIALS_NIGHT.map((t, i) => (
                <article className={`lp-sono-story scroll-reveal stagger-${i + 1}`} key={t.id}>
                  <svg className="lp-sono-story-quote" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path
                      fillRule="evenodd"
                      d="M4.49 7.529a5.3 5.3 0 011.174-.131c3.128 0 5.663 2.716 5.663 6.065 0 3.35-2.535 6.066-5.663 6.066S0 16.814 0 13.463c0-.098.002-.197.007-.295H0C0 8.113 3.84 4 8.56 4v2.036c-1.531 0-2.943.558-4.07 1.493zM17.164 7.529c.378-.086.77-.131 1.172-.131 3.128 0 5.664 2.716 5.664 6.065 0 3.35-2.536 6.066-5.664 6.066-3.128 0-5.663-2.715-5.663-6.066 0-.098.002-.197.007-.295H12.674C12.674 8.113 16.514 4 21.234 4v2.036c-1.531 0-2.943.558-4.07 1.493z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="lp-sono-story-text">{t.quote}</p>
                  <span className="lp-sono-story-divider" aria-hidden>✦</span>
                  <div className="lp-sono-story-author">
                    <span className="lp-sono-story-avatar" aria-hidden>{t.name.charAt(0)}</span>
                    <span className="lp-sono-story-meta">
                      <span className="lp-sono-story-name">{t.name}</span>
                      <span className="lp-sono-story-sub">{t.age} · {t.city}</span>
                    </span>
                  </div>
                </article>
              ))}
            </div>

            {/* bolinhas do carrossel (só no mobile via CSS) */}
            <div className="lp-sono-ritual-dots" role="tablist" aria-label="Navegar pelos depoimentos">
              {[0, 1, 2].map((i) => (
                <button
                  key={i}
                  type="button"
                  className={`lp-sono-ritual-dot${storiesPage === i ? ' is-active' : ''}`}
                  aria-label={`Depoimento ${i + 1}`}
                  aria-selected={storiesPage === i}
                  onClick={() => goToStoriesPage(i)}
                />
              ))}
            </div>

            <p className="lp-sono-stories-foot scroll-reveal">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Junte-se a quem já dorme melhor com o ritual.
            </p>
          </div>
        </section>
      ) : (
      <section className="lp-sono-testimonials">
        <div className="lp-sono-testimonials-inner">
          <div className="lp-sono-deco-hero">
            {/* lua crescente — reforça o tema noite/dormir */}
            <span className="lp-sono-deco-moon" aria-hidden="true">
              <Moon />
            </span>

            {/* estrelas — mesma cor do céu estrelado (navy), espalhadas pelos cantos */}
            <span className="lp-sono-deco-star lp-sono-deco-star--a" aria-hidden="true"><Sparkle color="#0E1730" size={26} /></span>
            <span className="lp-sono-deco-star lp-sono-deco-star--b" aria-hidden="true"><Sparkle color="#0E1730" size={20} /></span>
            <span className="lp-sono-deco-star lp-sono-deco-star--c" aria-hidden="true"><Sparkle color="#0E1730" size={16} /></span>
            <span className="lp-sono-deco-star lp-sono-deco-star--d" aria-hidden="true"><Sparkle color="#0E1730" size={14} /></span>
            <span className="lp-sono-deco-star lp-sono-deco-star--e" aria-hidden="true"><Sparkle color="#0E1730" size={22} /></span>
            <span className="lp-sono-deco-star lp-sono-deco-star--f" aria-hidden="true"><Sparkle color="#0E1730" size={13} /></span>
            <span className="lp-sono-deco-star lp-sono-deco-star--g" aria-hidden="true"><Sparkle color="#0E1730" size={18} /></span>
            <span className="lp-sono-deco-star lp-sono-deco-star--h" aria-hidden="true"><Sparkle color="#0E1730" size={12} /></span>

            <h2 className="lp-sono-h2 lp-sono-h2--center scroll-reveal lp-sono-testimonials-h2">
              Quem já aprendeu a desligar.
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
                  <span className="lp-sono-testimonial-name">{t.name}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* ─── Diferencial · caminho guiado (não biblioteca de áudios) ───
          deite_se: versão noturna (cards numerados). Demais: versão atual. */}
      {isConviteHero ? (
        <section ref={diferencialRef} className="lp-sono-diff2" aria-label="Não é uma biblioteca de meditações">
          <div className="lp-sono-seam lp-sono-seam--from-creme" aria-hidden />
          <div className="lp-sono-diff2-inner">
            <p className="lp-sono-diff2-eyebrow scroll-reveal">Feito para noites reais</p>
            <h2 className="lp-sono-diff2-title scroll-reveal">
              Não é uma
              <br />
              <span className="lp-sono-diff2-accent">biblioteca de meditações.</span>
            </h2>
            <p className="lp-sono-diff2-subtitle scroll-reveal stagger-1">
              É um caminho de <span className="lp-sono-diff2-accent">7 noites</span>.
            </p>
            <p className="lp-sono-diff2-lead scroll-reveal stagger-2">
              Quando você está exausto, a última coisa que precisa é escolher entre
              centenas de áudios.{' '}
              <span className="lp-sono-diff2-accent">Aqui, a noite de hoje já está pronta.</span>
            </p>
            <div className="lp-sono-diff2-cards">
              {DIFERENCIAL_CARDS.map((col, i) => (
                <article
                  className={`lp-sono-diff2-card lp-sono-diff2-card--bg scroll-reveal stagger-${i + 1}`}
                  key={col.title}
                  style={{ ['--diff2-bg' as string]: `url('${col.bg}')` }}
                >
                  <span className="lp-sono-diff2-badge">{`0${i + 1}`}</span>
                  <h3 className="lp-sono-diff2-card-title">
                    {col.titleMain}
                    <br />
                    <span className="lp-sono-diff2-card-accent">{col.titleAccent}</span>
                  </h3>
                  <span className="lp-sono-diff2-divider" aria-hidden />
                  <p className="lp-sono-diff2-card-desc">{col.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : (
      <section
        ref={diferencialRef}
        className="lp-sono-value lp-sono-diferencial"
      >
        <h2 className="lp-sono-h2 lp-sono-h2--center scroll-reveal lp-sono-diferencial-h2">
          Não é uma biblioteca de meditações.
          <br />
          <span className="lp-sono-diferencial-h2-soft">É um caminho de 7 noites.</span>
        </h2>
        <p className="lp-sono-diferencial-sub scroll-reveal stagger-1">
          Quando você está exausto, a última coisa que precisa é escolher entre
          centenas de áudios. Aqui, a noite de hoje já está pronta.
        </p>
        <div className="lp-sono-value-grid">
          {DIFERENCIAL_CARDS.map((col, i) => (
            <article
              key={col.title}
              className={`lp-sono-value-card scroll-reveal stagger-${i + 1}`}
            >
              <div className="lp-sono-value-card-icon lp-sono-diferencial-icon">
                <img src={col.icon} alt="" loading="lazy" decoding="async" />
              </div>
              <h3 className="lp-sono-value-card-title">{col.title}</h3>
              <p className="lp-sono-value-card-body">{col.body}</p>
            </article>
          ))}
        </div>
        <p className="lp-sono-diferencial-stat scroll-reveal stagger-2">
          Em 30 dias de uso, usuários relataram 32% menos estresse.
        </p>
      </section>
      )}

      {/* Demonstração + CTA-mid: ocultos na variante deite_se (a pedido). */}
      {!isConviteHero && (
        <>
      {/* ─── Demonstração · Tabs Antes / Adormecer / Permanecer ─── */}
      <section className="lp-sono-tabs">
        <div className="lp-sono-section-inner">
        <div className="lp-sono-tabs-head">
          <h2 className="lp-sono-h2 lp-sono-h2--center scroll-reveal lp-sono-tabs-h2">
            Nos 7&nbsp;dias grátis, as 7&nbsp;noites do{' '}
            Protocolo do Sono são suas.
          </h2>
          <p className="lp-sono-tabs-sub scroll-reveal stagger-1">
            Comece por qualquer fase da noite,<br className="lp-br-desktop" />{' '}
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
        </div>
      </section>

      {/* ─── CTA central repetido (label unificado) ─── */}
      <section className="lp-sono-cta-mid">
        <div className="lp-sono-section-inner scroll-reveal">
          <h2>Sua primeira noite pode começar agora.</h2>
          <p className="lp-sono-cta-mid-sub">
            Um áudio guiado de 8 minutos pra desacelerar o corpo<br className="lp-br-desktop" />{' '}
            e tirar a mente do modo alerta antes de dormir.
          </p>
          <Link
            to={sonoCtaTo('sono_cta_mid')}
            className="cta-primary"
            onClick={sonoCtaClick('sono_cta_mid')}
          >
            Iniciar a noite 1 · grátis
          </Link>
          <p className="lp-sono-cta-mid-micro">
            Sem cobrança hoje. Cancele antes dos 7 dias se não fizer sentido.
          </p>
        </div>
      </section>
        </>
      )}

      {/* ─── FAQ · derruba objeções antes da oferta ─── */}
      <SonoFaqSection conviteMode={isConviteHero} />

      {/* ─── Oferta · navy ─── */}
      <section className={`lp-sono-offer${isConviteHero ? ' lp-sono-offer--deite' : ''}`}>
        <div className="lp-sono-offer-bg" aria-hidden />

        <div className="lp-sono-offer-inner">
          <div className="lp-sono-offer-content">
            {isConviteHero ? (
              <>
                <h2 className="scroll-reveal">
                  Continue o <span className="lp-sono-offer-accent">Ritual Boa Noite</span>
                </h2>
                <p className="lp-sono-offer-sub scroll-reveal stagger-1">
                  Comece pela primeira noite. Depois, siga a sequência completa de
                  7 noites para preparar seu corpo para descansar com mais facilidade.
                </p>
                <ul className="lp-sono-offer-bullets scroll-reveal stagger-1">
                  <li><Check /><span>As 7 noites em sequência</span></li>
                  <li><Check /><span>Meditações guiadas de 5 a 10 minutos</span></li>
                  <li><Check /><span>Práticas para desacelerar mente e corpo</span></li>
                  <li><Check /><span>Feito para usar deitado</span></li>
                  <li><Check /><span>Sem remédio</span></li>
                  <li><Check /><span>Sem precisar escolher meditações</span></li>
                </ul>
              </>
            ) : (
              <>
                <h2 className="scroll-reveal">Em 7 noites, dormir deixa de ser esforço.</h2>

                <p className="lp-sono-offer-sub scroll-reveal stagger-1">
                  Comece hoje sem pagar nada. As 7 noites do Protocolo do Sono,
                  meditações, sons e a Eco IA. Cancele antes da cobrança se não
                  fizer sentido.
                </p>

                <ul className="lp-sono-offer-bullets scroll-reveal stagger-1">
                  <li>
                    <Check />
                    <span>As 7 noites do Protocolo do Sono, em sequência</span>
                  </li>
                  <li>
                    <Check />
                    <span>Meditações e sons pra adormecer e permanecer dormindo</span>
                  </li>
                  <li>
                    <Check />
                    <span>Eco IA pra as noites difíceis</span>
                  </li>
                  <li>
                    <Check />
                    <span>Acesso imediato à Noite 1, com seu progresso salvo</span>
                  </li>
                  <li>
                    <Check />
                    <span>R$ 0 hoje · aviso antes da cobrança · cancele quando quiser</span>
                  </li>
                </ul>
              </>
            )}

            {!isConviteHero && (
            <>
            <div className="lp-sono-offer-reassure scroll-reveal stagger-2">
              {/* Âncora: R$ 11,90/mês (anual) ÷ 30 ≈ R$ 0,40/noite. Se o preço
                  mudar em offerCopy.ts, atualizar este valor. */}
              <p className="lp-sono-offer-reassure-fine">
                Cerca de R$ 0,40 por noite no plano anual. Menos que a melatonina
                que resolve só uma.
              </p>
              <p className="lp-sono-offer-reassure-fine">
                Faça as 7 noites. Se não sentir diferença, cancele antes da
                cobrança e não paga nada.
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
                <span className="lp-sono-offer-plan-badge">Economize 25%</span>
                <span className="lp-sono-offer-plan-meta">Anual</span>
                <strong className="lp-sono-offer-plan-headline">{OFFER.priceAnnualMonthly}</strong>
                <span className="lp-sono-offer-plan-price">{OFFER.priceAnnualTotal}</span>
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
                <span className="lp-sono-offer-plan-meta">Mensal</span>
                <strong className="lp-sono-offer-plan-headline">{OFFER.priceMonthly}</strong>
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
            </>
            )}

            {!isConviteHero && (
              <div className="lp-sono-offer-fine scroll-reveal stagger-3">
                <Link to="/termos">Termos e Condições</Link>
                <span aria-hidden>·</span>
                <Link to="/cancelar-assinatura">Cancele a qualquer momento</Link>
              </div>
            )}

            {!isConviteHero && (
              <p className="lp-sono-offer-reassure-fine scroll-reveal stagger-3">
                4,9★ · 846 pessoas dormem com o protocolo
              </p>
            )}

            {/* Convite (deite_se): vai pra experiência guest (ouvir a Noite 1),
                como o resto da landing. Nas variantes de venda, segue pro /assinar
                (trial) — sonoCtaTo/sonoCtaClick resolvem o destino e o tracking. */}
            <Link
              ref={offerCtaRef}
              to={sonoCtaTo('sono_oferta_cta')}
              className="lp-sono-offer-cta scroll-reveal stagger-4"
              onClick={sonoCtaClick('sono_oferta_cta', selectedOfferPlan, 'rodape')}
            >
              {isConviteHero ? 'Começar meu ritual' : CTA_LABEL}
            </Link>
          </div>
        </div>
      </section>

      {/* ─── 3 colunas de dicas (conteúdo guiado do app) ───
          Rebaixada pra depois da oferta: tem valor de conteúdo (links), mas não
          deve ficar no caminho da conversão. Oculta na variante deite_se. */}
      {!isConviteHero && (
      <section className="lp-sono-tips">
        <div className="lp-sono-section-inner">
        <h2 className="lp-sono-h2 lp-sono-h2--center scroll-reveal">
          Além das 7 noites, apoio pra dormir melhor.
        </h2>
        <p className="lp-sono-tips-sub scroll-reveal stagger-1">
          Programas e práticas guiadas para cada etapa da noite. Tudo incluído na sua
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
                      to={sonoCtaTo(`sono_tip_${col.key}`)}
                      onClick={sonoCtaClick(`sono_tip_${col.key}`)}
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
        </div>
      </section>
      )}

      <EcotopiaFooter night={isConviteHero} />

      {/* CTA fixo no scroll: mesmo destino/label do herói, surge entre o herói
          e a oferta. posicao='sticky' no tracking. */}
      <SonoStickyCta
        to={sonoCtaTo('sono_sticky')}
        label={hero.cta}
        onClick={sonoCtaClick('sono_sticky', 'monthly', 'sticky')}
        visible={stickyVisible}
        night={isConviteHero}
      />
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

// Cadeado das noites bloqueadas (seção do protocolo).
function LockGlyph() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
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
        fill="#0E1730"
        stroke="#0A0F1E"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}
