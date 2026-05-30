import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import '@/ecotopia-landing.css';
import EcotopiaTopbar from '@/components/landing/EcotopiaTopbar';
import EcoDreamSection from '@/components/landing/EcoDreamSection';
import EcotopiaFooter from '@/components/landing/EcotopiaFooter';
import { useScrollReveal } from '@/components/landing/useScrollReveal';
import mixpanel from '@/lib/mixpanel';

// ─── Dados das seções ────────────────────────────────────────────────

const HOW_CARDS: { icon: string; title: string; body: string; image?: string }[] = [
  {
    icon: '💬',
    image: '/images/eco-orb-card.webp',
    title: 'Organize seus pensamentos',
    body:
      'Estressado no trabalho? Problema em casa? Sem conseguir dormir? A Eco te ajuda a organizar o que você sente e seguir em frente com mais clareza.',
  },
  {
    icon: '🫧',
    image: '/images/eco-orb-card-2.webp',
    title: 'Receba recomendações personalizadas',
    body:
      'A Eco entende o que você está passando e sugere meditações e práticas especialmente pra você.',
  },
  {
    icon: '🧭',
    image: '/images/eco-orb-card-3.webp',
    title: 'Sempre à sua disposição',
    body:
      'De dia ou de madrugada, divida o que está na sua cabeça com a Eco sempre que precisar.',
  },
];

const STEPS = [
  {
    label: 'Fale ou escreva',
    title: 'Fale ou escreva',
    body:
      'Mande um áudio falando o que sente ou digite. A Eco entende dos dois jeitos e responde na hora.',
  },
  {
    label: 'Recebe o próximo passo',
    title: 'Recebe o próximo passo',
    body:
      'No meio da conversa, a Eco recomenda meditações e práticas certas pro seu momento — tudo dentro do app.',
  },
  {
    label: 'Lembra de você',
    title: 'Lembra de você',
    body:
      'A Eco lembra do que vocês conversaram. Você retoma de onde parou, sem repetir tudo de novo.',
  },
  {
    label: 'Segura por design',
    title: 'Segura por design',
    body:
      'Suas conversas são privadas. Em momentos de crise, a Eco reconhece os sinais e aponta ajuda profissional.',
  },
];

const SAFETY_CARDS = [
  {
    image: '/images/eco-safety-privacidade.webp',
    title: 'Suas conversas são suas',
    body:
      'Criptografadas, isoladas por usuário e nunca vendidas. Você apaga quando quiser.',
  },
  {
    image: '/images/eco-safety-cuidado.webp',
    title: 'Feita com cuidado',
    body:
      'Desenhada com princípios de psicologia e mindfulness, com limites claros sobre o que ela é — e o que não é.',
  },
  {
    image: '/images/eco-safety-apoio.webp',
    title: 'Quando é sério, te direciona',
    body:
      'Em crises, a Eco reconhece os sinais e aponta ajuda profissional. Ela apoia — não substitui o cuidado humano.',
  },
];

const FAQ = [
  {
    q: 'O que é a Eco?',
    a:
      'Sua companheira de IA pra conversar sobre o que sente, refletir e achar a prática certa pro momento. Disponível 24 horas.',
  },
  {
    q: 'A Eco substitui terapia?',
    a:
      'Não. A Eco é um apoio para o dia a dia — desabafo, autoconhecimento e práticas guiadas. Não substitui acompanhamento psicológico ou médico, e te direciona a ajuda profissional quando necessário.',
  },
  {
    q: 'Minhas conversas são privadas?',
    a:
      'Sim. Criptografadas e isoladas por usuário. Não vendemos seus dados e você pode apagar seu histórico quando quiser.',
  },
  {
    q: 'O que vem além da Eco?',
    a:
      'Os 7 dias gratuitos liberam tudo: meditações guiadas, Protocolo do Sono, Diário Estoico, Cinco Anéis, Jornadas Dispenza e a interpretação de sonhos do EcoDream.',
  },
  {
    q: 'Preciso pagar para começar?',
    a:
      'Você começa com 7 dias gratuitos e acesso completo. Cancele em 1 clique antes do fim, sem cobrança.',
  },
  {
    q: 'Em quais idiomas a Eco conversa?',
    a:
      'A Eco conversa em português de forma natural, entendendo gírias e o jeito brasileiro de falar sobre emoções.',
  },
];

// ─── Componente ──────────────────────────────────────────────────────

export default function EcotopiaEcoIAPage() {
  useScrollReveal('.ecotopia-lp');

  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    try {
      mixpanel.track('Eco IA Page Viewed', { page: 'eco_ia_root' });
    } catch {
      // noop
    }
  }, []);

  // Barra de input (reutilizada em algumas telas do mock)
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
      <img src="/images/eco-mascote.webp" alt="" className="lp-eco-phone-head-orb" />
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
        <img src="/images/eco-mascote.webp" alt="" className="lp-eco-phone-orb" />
        {phoneInput}
      </div>
    );
  };

  return (
    <div className="ecotopia-lp lp-eco">
      <EcotopiaTopbar />

      {/* ─── Hero ─── */}
      <section className="lp-eco-hero">
        <div className="lp-eco-hero-inner">
          <div className="lp-eco-hero-text">
            <h1 className="scroll-reveal">
              Desabafe a<br />qualquer hora.
            </h1>
            <p className="lp-eco-hero-lead scroll-reveal stagger-1">
              A Eco é sua companheira de IA: escuta sem julgamento, te ajuda a
              organizar a cabeça e aponta a prática certa pra agora — seja
              ansiedade, sono ou um dia que pesou.
            </p>
            <Link
              to="/assinar?step=plan&plan=annual&from=eco_ia_hero"
              className="lp-eco-cta scroll-reveal stagger-2"
            >
              Experimente grátis
            </Link>
            <p className="lp-eco-hero-fine scroll-reveal stagger-2" style={{ marginTop: '14px' }}>
              24h por dia · sem julgamento · privado de verdade
            </p>
          </div>

          <div className="lp-eco-hero-art scroll-reveal stagger-2" aria-hidden>
            <div className="lp-eco-hero-orb-glow" />
            <img
              src="/images/eco-mascote.webp"
              alt=""
              className="lp-eco-hero-orb"
              loading="eager"
            />
            <div className="lp-eco-hero-bubble lp-eco-hero-bubble--1">
              Não consigo desligar a cabeça hoje…
            </div>
            <div className="lp-eco-hero-bubble lp-eco-hero-bubble--2">
              Vamos respirar juntos por um minuto?
            </div>
          </div>
        </div>
      </section>

      {/* ─── Como funciona a Eco ─── */}
      <section className="lp-eco-how">
        <div className="lp-eco-how-inner">
          <h2 className="lp-eco-h2 lp-eco-h2--center scroll-reveal">Como funciona a Eco</h2>
          <p className="lp-eco-how-sub scroll-reveal stagger-1">Não é só desabafar. É sair melhor.</p>

          <div className="lp-eco-how-grid">
            {HOW_CARDS.map((card, i) => (
              <article
                key={card.title}
                className={`lp-eco-how-card ${card.image ? 'has-orb' : ''} scroll-reveal stagger-${i + 1}`}
              >
                {card.image ? (
                  <img src={card.image} alt="" className="lp-eco-how-orb" loading="lazy" />
                ) : (
                  <span className="lp-eco-how-icon" aria-hidden>{card.icon}</span>
                )}
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─── EcoDream · interpretação de sonhos ─── */}
      <EcoDreamSection />

      {/* ─── Escolha como você conversa ─── */}
      <section className="lp-eco-channels">
        <div className="lp-eco-channels-inner">
          <ul className="lp-eco-steps scroll-reveal" aria-label="Como a Eco funciona">
            {STEPS.map((step, i) => (
              <li key={step.label}>
                <button
                  type="button"
                  className={`lp-eco-step ${i === activeStep ? 'is-active' : ''}`}
                  aria-pressed={i === activeStep}
                  onClick={() => setActiveStep(i)}
                >
                  <span className="lp-eco-step-badge">{i + 1}</span>
                  <span className="lp-eco-step-label">{step.label}</span>
                </button>
              </li>
            ))}
          </ul>

          <div className="lp-eco-phone scroll-reveal stagger-1" aria-hidden>
            {renderPhoneScreen()}
          </div>

          <div className="lp-eco-channels-content scroll-reveal stagger-2">
            <h2 className="lp-eco-h2">{STEPS[activeStep].title}</h2>
            <p>{STEPS[activeStep].body}</p>
            <Link to="/assinar?step=plan&plan=annual&from=eco_ia_channels" className="lp-eco-cta">
              Falar com a Eco
            </Link>
          </div>

          <div className="lp-eco-channels-dots">
            {STEPS.map((step, i) => (
              <button
                key={step.label}
                type="button"
                className={`lp-eco-dot ${i === activeStep ? 'is-active' : ''}`}
                aria-label={`Ir para etapa ${i + 1}`}
                onClick={() => setActiveStep(i)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ─── Memória emocional · card ─── */}
      <section className="lp-eco-care">
        <div className="lp-eco-care-card">
          <div className="lp-eco-care-text scroll-reveal">
            <p className="lp-eco-care-kicker">Sua memória emocional</p>
            <h2 className="lp-eco-h2">Quanto mais você conversa, mais a Eco te entende.</h2>
          </div>

          <ul className="lp-eco-care-list scroll-reveal stagger-1">
            <li>
              <span className="lp-eco-care-thumb">
                <img src="/images/memoria-emocional-ilustracao.webp" alt="" loading="lazy" />
              </span>
              <div className="lp-eco-care-item-text">
                <h3>Memórias</h3>
                <p>
                  Guarda os momentos e temas que importam, criando uma linha
                  contínua entre as conversas.
                </p>
              </div>
            </li>
            <li>
              <span className="lp-eco-care-thumb">
                <img src="/images/perfil-emocional-ilustracao.webp" alt="" loading="lazy" />
              </span>
              <div className="lp-eco-care-item-text">
                <h3>Perfil emocional</h3>
                <p>
                  Um retrato das suas emoções e padrões ao longo do tempo.
                  Sempre sob o seu controle.
                </p>
              </div>
            </li>
            <li>
              <span className="lp-eco-care-thumb">
                <img src="/images/relatorio-emocional-ilustracao.webp" alt="" loading="lazy" />
              </span>
              <div className="lp-eco-care-item-text">
                <h3>Relatório</h3>
                <p>
                  Tendências do seu estado emocional reunidas pra você ver sua
                  evolução com clareza.
                </p>
              </div>
            </li>
          </ul>
        </div>
      </section>

      {/* ─── Segurança e privacidade ─── */}
      <section className="lp-eco-safety">
        <div className="lp-eco-safety-inner">
          <h2 className="lp-eco-h2 lp-eco-h2--center scroll-reveal">
            Privado de verdade. Cuidado de verdade.
          </h2>
          <div className="lp-eco-safety-grid">
            {SAFETY_CARDS.map((card, i) => (
              <article key={card.title} className={`lp-eco-safety-card has-orb scroll-reveal stagger-${i + 1}`}>
                <img src={card.image} alt="" className="lp-eco-safety-orb" loading="lazy" />
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </article>
            ))}
          </div>

          <p className="lp-eco-safety-note scroll-reveal">
            A Eco não substitui o atendimento humano, não oferece serviços clínicos
            de saúde mental e não é monitorada em tempo real por um profissional. As
            informações que você compartilha com a Eco não são repassadas a terceiros,
            a menos que você opte por compartilhá-las. Se você precisa de apoio para
            uma questão de saúde mental, converse com um profissional habilitado. Se
            estiver em perigo imediato, ligue para o SAMU (192) ou vá ao pronto-socorro
            mais próximo. Se estiver tendo pensamentos suicidas ou de automutilação,
            ligue para o CVV — 188, gratuito e sigiloso, 24 horas, ou acesse{' '}
            <a href="https://www.cvv.org.br" target="_blank" rel="noreferrer">cvv.org.br</a>
            {' '}para conversar a qualquer momento.
          </p>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="lp-eco-faq">
        <div className="lp-eco-faq-inner">
          <h2 className="lp-eco-faq-title scroll-reveal">Perguntas frequentes</h2>
          <div className="lp-eco-faq-list scroll-reveal stagger-1">
            {FAQ.map((item) => (
              <details key={item.q} className="lp-eco-faq-item">
                <summary>
                  <span>{item.q}</span>
                  <span className="lp-eco-faq-chev" aria-hidden>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
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
      <section className="lp-eco-final">
        <div className="lp-eco-final-inner scroll-reveal">
          <h2>Tem algo pesando hoje? Comece por aí.</h2>
          <Link to="/assinar?step=plan&plan=annual&from=eco_ia_final" className="lp-eco-cta lp-eco-cta--lg">
            Experimente grátis
          </Link>
        </div>
      </section>

      <EcotopiaFooter />
    </div>
  );
}
