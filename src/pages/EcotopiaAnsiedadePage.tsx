import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import '@/ecotopia-landing.css';
import EcotopiaTopbar from '@/components/landing/EcotopiaTopbar';
import EcotopiaFooter from '@/components/landing/EcotopiaFooter';
import { useScrollReveal } from '@/components/landing/useScrollReveal';
import mixpanel from '@/lib/mixpanel';

// ─── Dados ───────────────────────────────────────────────────────────

const PILARES = [
  {
    key: 'programas',
    tab: 'Programas para eco-ansiedade',
    title: 'Programas guiados para a eco-ansiedade',
    body: 'Reduza a ansiedade climática com um programa de reconexão com a natureza. Aprenda a transformar preocupação em ação consciente, no seu ritmo.',
  },
  {
    key: 'praticas',
    tab: 'Práticas guiadas',
    title: 'Mais de mil práticas guiadas',
    body: 'Explore um acervo de meditações, respirações e reflexões para viver de forma mais leve e sustentável — sempre disponíveis, sem anúncios.',
  },
  {
    key: 'eco-ia',
    tab: 'Orientação da Eco (IA)',
    title: 'Eco, sua companheira de IA empática',
    body: 'Converse com a Eco para entender seus hábitos e receber recomendações personalizadas para uma vida mais conectada e equilibrada.',
  },
  {
    key: 'descanso',
    tab: 'Recursos para descansar',
    title: 'Noites mais tranquilas',
    body: 'Durma melhor com sons da natureza, meditações e rituais inspirados em florestas e oceanos — para a mente desacelerar de verdade.',
  },
];

const BENEFITS: { label: string; orb: string; tone: string }[] = [
  { label: 'Gerenciar a eco-ansiedade', orb: '/images/anxiety-orb.png', tone: 'anxiety' },
  { label: 'Menos consumo, mais propósito', orb: '/images/thoughts-orb.png', tone: 'thoughts' },
  { label: 'Durma bem, viva leve', orb: '/images/sleep-orb.png', tone: 'sleep' },
  { label: 'Aliviar a ansiedade do dia a dia', orb: '/images/stress-orb.png', tone: 'stress' },
  { label: 'Praticar conexão com a natureza', orb: '/images/meditation-orb.png', tone: 'meditation' },
  { label: 'Repensar seus hábitos', orb: '/images/talk-orb.png', tone: 'talk' },
];

const RESULTADOS = [
  {
    img: '/images/ansiedade-result-5.png',
    unit: 'minutos por dia',
    body: 'Apenas 5 minutos por dia já ajudam a acalmar a mente e sair do piloto automático.',
  },
  {
    img: '/images/ansiedade-result-2.png',
    unit: 'semanas',
    body: 'Em duas semanas de prática, você começa a se sentir mais conectado e equilibrado.',
  },
  {
    img: '/images/ansiedade-result-10.png',
    unit: 'dias',
    body: 'Dez dias seguidos bastam para a prática virar um hábito que sustenta o dia a dia.',
  },
];

type LibCat = 'todos' | 'basics' | 'respiros' | 'sono' | 'foco';

const LIB_CATS: { key: LibCat; label: string; emoji: string }[] = [
  { key: 'todos', label: 'Tudo', emoji: '🌍' },
  { key: 'basics', label: 'Noções básicas', emoji: '🌿' },
  { key: 'respiros', label: 'Respiros rápidos', emoji: '🌬️' },
  { key: 'sono', label: 'Sono natural', emoji: '🌙' },
  { key: 'foco', label: 'Foco verde', emoji: '💎' },
];

const LIBRARY: {
  title: string;
  body: string;
  duration: string;
  cat: Exclude<LibCat, 'todos'>;
  image: string;
  to: string;
}[] = [
  {
    title: 'Primeiros passos',
    body: 'Cinco minutos para entender o que acontece quando você para.',
    duration: '5 min',
    cat: 'basics',
    image: '/images/meditacao-introducao.webp',
    to: '/meditacao-primeiros-passos',
  },
  {
    title: 'Sentindo',
    body: 'O que o seu corpo sente quando a mente para de falar?',
    duration: '4 min',
    cat: 'basics',
    image: '/images/sentindo.webp',
    to: '/meditacao-primeiros-passos',
  },
  {
    title: 'Observando a respiração',
    body: 'Sua respiração sempre esteve lá. Agora você vai ouvi-la.',
    duration: '4 min',
    cat: 'respiros',
    image: '/images/observando-respiracao.webp',
    to: '/meditacao-primeiros-passos',
  },
  {
    title: 'Meditação caminhando',
    body: 'Para quando sentar não for suficiente. Leve a prática ao movimento.',
    duration: '5 min',
    cat: 'respiros',
    image: '/images/meditacao-caminhando.webp',
    to: '/register?plan=annual&from=ansiedade_biblioteca',
  },
  {
    title: 'Chuva suave',
    body: 'Sons de chuva para a mente desacelerar e o corpo soltar.',
    duration: '60 min',
    cat: 'sono',
    image: '/images/sounds/chuva-suave.webp',
    to: '/register?plan=annual&from=ansiedade_biblioteca',
  },
  {
    title: 'Taças tibetanas',
    body: 'Vibrações suaves que acalmam a mente antes de dormir.',
    duration: '45 min',
    cat: 'sono',
    image: '/images/sounds/tibetan-bowl.webp',
    to: '/register?plan=annual&from=ansiedade_biblioteca',
  },
  {
    title: 'Sintonize novos potenciais',
    body: 'Acesse o campo de possibilidades além do seu passado.',
    duration: '5 min',
    cat: 'foco',
    image: '/images/meditacao-novos-potenciais.webp',
    to: '/dr-joe-dispenza',
  },
  {
    title: 'Recondicione corpo e mente',
    body: 'Interrompa o ciclo antigo e treine um novo padrão, dia após dia.',
    duration: '7 min',
    cat: 'foco',
    image: '/images/meditacao-recondicionar.webp',
    to: '/dr-joe-dispenza',
  },
];

const COMMUNITY_STATS = [
  { num: '4,9', label: 'avaliação na App Store' },
  { num: '+1 mi', label: 'minutos de prática' },
  { num: '+30', label: 'programas e trilhas' },
];

const FAQS = [
  {
    q: 'O aplicativo da Ecotopia ajuda com a eco-ansiedade?',
    a: 'Sim. A Ecotopia ajuda a criar uma prática consistente de atenção plena, guiando você por reflexões e ações que acalmam a mente e fortalecem a sua relação com o planeta. Com o tempo, você desenvolve recursos para lidar melhor com a ansiedade climática.',
  },
  {
    q: 'Quais são os benefícios da Ecotopia?',
    a: 'Práticas guiadas para acalmar a mente, melhorar o sono e reduzir o estresse, além da Eco — uma companheira de IA que te ajuda a repensar hábitos e a transformar preocupação em ação consciente, no seu ritmo.',
  },
  {
    q: 'Como sei se tenho eco-ansiedade?',
    a: 'A eco-ansiedade aparece como preocupação persistente com o clima, o consumo ou o futuro do planeta — às vezes com tensão, insônia ou sensação de impotência. Se isso pesa no seu dia a dia, as práticas da Ecotopia podem te dar mais clareza e equilíbrio.',
  },
  {
    q: 'Como posso acalmar a minha ansiedade climática?',
    a: 'Comece pequeno: uma respiração guiada, uma reflexão diária e um passo concreto por vez. A Ecotopia organiza esse caminho em sessões curtas, ajudando você a sair do ciclo de preocupação e a agir com propósito.',
  },
  {
    q: 'O que diferencia a Ecotopia de outros apps de bem-estar?',
    a: 'A Ecotopia une atenção plena e consciência ambiental num só lugar — meditação, sono, diário estoico, os cinco anéis e a Eco. Em vez de apenas relaxar, você cultiva uma forma mais leve e conectada de viver.',
  },
];

// ─── Componente ──────────────────────────────────────────────────────

export default function EcotopiaAnsiedadePage() {
  useScrollReveal('.ecotopia-lp');

  const [activeStep, setActiveStep] = useState(0);
  const [libCat, setLibCat] = useState<LibCat>('todos');

  const visibleLibrary = useMemo(
    () => (libCat === 'todos' ? LIBRARY : LIBRARY.filter((c) => c.cat === libCat)),
    [libCat],
  );

  useEffect(() => {
    try {
      mixpanel.track('Ansiedade Landing Viewed', { page: 'ansiedade_root' });
    } catch {
      // noop
    }
  }, []);

  // Mockup de celular · "Converse com a Eco" (reaproveitado do módulo Eco · IA)
  const phoneInput = (
    <div className="lp-eco-phone-input">
      <span className="lp-eco-phone-placeholder">Fale ou toque para escrever…</span>
      <button type="button" className="lp-eco-phone-mic" aria-label="Microfone">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="2" width="6" height="12" rx="3" />
          <path d="M5 10v1a7 7 0 0 0 14 0v-1M12 19v3" />
        </svg>
      </button>
      <button type="button" className="lp-eco-phone-stop">
        <span className="lp-eco-phone-stop-icon" aria-hidden />
        Parar
      </button>
    </div>
  );

  const phoneHead = (
    <div className="lp-eco-phone-head">
      <span className="lp-eco-phone-dots3" aria-hidden>•••</span>
      <img src="/images/eco-mascote.png" alt="" className="lp-eco-phone-head-orb" />
      <span className="lp-eco-phone-x" aria-hidden>×</span>
    </div>
  );

  const renderPhoneScreen = () => {
    if (activeStep === 1) {
      return (
        <div className="lp-eco-phone-screen lp-eco-screen--chat">
          {phoneHead}
          <div className="lp-eco-phone-body">
            <span className="lp-eco-msg lp-eco-msg--me">
              Tenho tentado dormir mais cedo, mas minha cabeça não desliga.
            </span>
            <span className="lp-eco-msg lp-eco-msg--eco">
              Que tal esta meditação de desaceleração? Acho que vai cair bem agora.
            </span>
            <div className="lp-eco-rec">
              <span className="lp-eco-rec-thumb" />
              <div className="lp-eco-rec-info">
                <strong>Descanso Profundo</strong>
                <span>Meditação · 5 min</span>
              </div>
              <span className="lp-eco-rec-play" aria-hidden>▶</span>
            </div>
          </div>
          {phoneInput}
        </div>
      );
    }

    if (activeStep === 2) {
      return (
        <div className="lp-eco-phone-screen lp-eco-screen--chat">
          {phoneHead}
          <div className="lp-eco-phone-body">
            <span className="lp-eco-msg lp-eco-msg--eco">
              Oi de novo. Da última vez você estava tentando dormir mais cedo — como tem sido?
            </span>
            <div className="lp-eco-msg-react" aria-hidden>👍 👎</div>
          </div>
          {phoneInput}
        </div>
      );
    }

    if (activeStep === 3) {
      return (
        <div className="lp-eco-phone-screen lp-eco-screen--safe">
          {phoneHead}
          <div className="lp-eco-phone-body">
            <div className="lp-eco-resource">
              <span className="lp-eco-resource-badge" aria-hidden>＋</span>
              <strong>Recursos de apoio</strong>
              <p>
                Se você está passando por um momento difícil, o CVV oferece apoio
                emocional gratuito e sigiloso, 24 horas por dia.
              </p>
              <div className="lp-eco-resource-actions">
                <span className="lp-eco-resource-btn is-primary">Ligar 188</span>
                <span className="lp-eco-resource-btn">Conversar</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // activeStep === 0 (voz / texto)
    return (
      <div className="lp-eco-phone-screen lp-eco-screen--voice">
        <img src="/images/eco-mascote.png" alt="" className="lp-eco-phone-orb" />
        {phoneInput}
      </div>
    );
  };

  return (
    <div className="ecotopia-lp lp-anx">
      <EcotopiaTopbar />

      {/* ─── Hero ─── */}
      <section
        className="lp-anx-hero"
        style={{ backgroundImage: 'url("/images/ansiedade-hero-bg.png")' }}
      >
        <span className="lp-anx-hero-veil" aria-hidden />
        <div className="lp-anx-hero-inner">
          <div className="lp-anx-hero-text">
            <h1 className="scroll-reveal stagger-1">
              Reduza o estresse e a ansiedade diários com a Ecotopia.
            </h1>
            <p className="lp-anx-hero-lead scroll-reveal stagger-2">
              Receba apoio diário e aprenda habilidades práticas para lidar com o
              estresse e a ansiedade.
            </p>
            <Link
              to="/register?plan=annual&from=ansiedade_hero"
              className="lp-anx-cta scroll-reveal stagger-3"
            >
              Experimente grátis
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Pilares + mockup interativo (reaproveitado do Eco · IA) ─── */}
      <section className="lp-eco-channels">
        <div className="lp-eco-channels-inner">
          <ul className="lp-eco-steps scroll-reveal" aria-label="Como a Ecotopia ajuda">
            {PILARES.map((p, i) => (
              <li key={p.key}>
                <button
                  type="button"
                  className={`lp-eco-step ${i === activeStep ? 'is-active' : ''}`}
                  aria-pressed={i === activeStep}
                  onClick={() => setActiveStep(i)}
                >
                  <span className="lp-eco-step-badge">{i + 1}</span>
                  <span className="lp-eco-step-label">{p.tab}</span>
                </button>
              </li>
            ))}
          </ul>

          <div className="lp-eco-phone scroll-reveal stagger-1" aria-hidden>
            {renderPhoneScreen()}
          </div>

          <div className="lp-eco-channels-content scroll-reveal stagger-2">
            <h2 className="lp-eco-h2">{PILARES[activeStep].title}</h2>
            <p>{PILARES[activeStep].body}</p>
            <Link to="/register?plan=annual&from=ansiedade_channels" className="lp-eco-cta">
              Experimente grátis
            </Link>
          </div>

          <div className="lp-eco-channels-dots">
            {PILARES.map((p, i) => (
              <button
                key={p.key}
                type="button"
                className={`lp-eco-dot ${i === activeStep ? 'is-active' : ''}`}
                aria-label={`Ir para etapa ${i + 1}`}
                onClick={() => setActiveStep(i)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ─── Benefícios ─── */}
      <section className="lp-anx-benefits">
        <div className="lp-anx-benefits-inner">
          <h2 className="lp-anx-h2 lp-anx-h2--center scroll-reveal">
            Como a Ecotopia ajuda na sua jornada
          </h2>
          <div className="lp-cat-grid scroll-reveal stagger-1">
            {BENEFITS.map((b) => (
              <Link
                key={b.label}
                to="/register?plan=annual&from=ansiedade_benefit"
                className="lp-cat"
              >
                <span className="lp-cat-label">{b.label}</span>
                <span className="lp-cat-end">
                  <span className="lp-cat-emoji" aria-hidden="true">
                    <img
                      src={b.orb}
                      alt=""
                      aria-hidden="true"
                      width={88}
                      height={88}
                      loading="lazy"
                      decoding="async"
                      className={`lp-cat-orb lp-cat-orb--${b.tone}`}
                    />
                  </span>
                  <ChevronRight size={24} strokeWidth={2} color="#4B4C4D" className="lp-cat-arrow" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Resultados ─── */}
      <section className="lp-anx-results">
        <div className="lp-anx-results-inner">
          <h2 className="lp-anx-h2 lp-anx-h2--center scroll-reveal">
            Pequenos passos, mudanças reais
          </h2>
          <div className="lp-anx-results-grid">
            {RESULTADOS.map((r, i) => (
              <article key={r.body} className={`lp-anx-result-card scroll-reveal stagger-${i + 1}`}>
                <span className="lp-anx-result-media">
                  <img src={r.img} alt="" loading="lazy" />
                </span>
                <div className="lp-anx-result-text">
                  <span className="lp-anx-result-unit">{r.unit}</span>
                  <p>{r.body}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Biblioteca ─── */}
      <section className="lp-anx-library">
        <div className="lp-anx-library-inner">
          <h2 className="lp-anx-h2 lp-anx-h2--center scroll-reveal">Explore nossa biblioteca</h2>

          <div className="lp-anx-pills scroll-reveal stagger-1" role="tablist" aria-label="Categorias">
            {LIB_CATS.map((c) => (
              <button
                key={c.key}
                type="button"
                className={`lp-anx-pill ${libCat === c.key ? 'is-active' : ''}`}
                aria-selected={libCat === c.key}
                onClick={() => setLibCat(c.key)}
              >
                <span aria-hidden>{c.emoji}</span> {c.label}
              </button>
            ))}
          </div>

          <div className="lp-anx-library-grid">
            {visibleLibrary.map((card) => (
              <Link
                key={card.title}
                to={card.to}
                className="lp-anx-lib-card"
                style={{
                  backgroundImage: `linear-gradient(180deg, rgba(14, 36, 25, 0) 32%, rgba(14, 36, 25, 0.86) 100%), url("${card.image}")`,
                }}
              >
                <span className="lp-anx-lib-dur">{card.duration}</span>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Comunidade (prova social) ─── */}
      <section className="lp-anx-community">
        <div
          className="lp-anx-community-card scroll-reveal"
          style={{ backgroundImage: 'url("/images/join-clouds-bg.png")' }}
        >
          <span className="lp-anx-community-veil" aria-hidden />
          <div className="lp-anx-community-content">
            <h2>Junte-se a quem vive de forma mais consciente todos os dias.</h2>
            <div className="lp-anx-community-stats">
              {COMMUNITY_STATS.map((s) => (
                <div key={s.label} className="lp-anx-community-stat">
                  <strong>{s.num}</strong>
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
            <Link to="/register?plan=annual&from=ansiedade_comunidade" className="lp-anx-cta lp-anx-cta--light">
              Experimente grátis
            </Link>
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="lp-anx-faq">
        <div className="lp-anx-faq-inner">
          <h2 className="lp-anx-h2 lp-anx-h2--center scroll-reveal">Perguntas frequentes</h2>
          <div className="lp-anx-faq-list scroll-reveal stagger-1">
            {FAQS.map((item) => (
              <details key={item.q} className="lp-anx-faq-item">
                <summary>
                  {item.q}
                  <span className="lp-anx-faq-icon" aria-hidden>
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

      {/* ─── Newsletter ─── */}
      <section className="lp-anx-newsletter">
        <div className="lp-anx-newsletter-card scroll-reveal">
          <div className="lp-anx-newsletter-text">
            <h2>Fique por dentro de tudo</h2>
            <p>Seja o primeiro a receber novidades, conteúdos e ofertas para uma vida mais leve.</p>
          </div>
          <form
            className="lp-anx-newsletter-form"
            onSubmit={(e) => e.preventDefault()}
          >
            <input type="email" placeholder="Seu melhor email" aria-label="Endereço de email" required />
            <button type="submit" className="lp-anx-cta">Inscrever-se</button>
          </form>
        </div>
      </section>

      {/* ─── CTA final ─── */}
      <section className="lp-anx-final">
        <div className="lp-anx-final-inner scroll-reveal">
          <h2>Dê um tempo para a sua mente — e para o planeta.</h2>
          <Link to="/register?plan=annual&from=ansiedade_final" className="lp-anx-cta">
            Experimente grátis
          </Link>
        </div>
      </section>

      <EcotopiaFooter />
    </div>
  );
}
