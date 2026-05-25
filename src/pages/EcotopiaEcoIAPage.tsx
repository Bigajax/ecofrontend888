import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import '@/ecotopia-landing.css';
import EcotopiaTopbar from '@/components/landing/EcotopiaTopbar';
import EcotopiaFooter from '@/components/landing/EcotopiaFooter';
import { useScrollReveal } from '@/components/landing/useScrollReveal';
import mixpanel from '@/lib/mixpanel';

// ─── Dados das seções ────────────────────────────────────────────────

const HOW_CARDS: { icon: string; title: string; body: string; image?: string }[] = [
  {
    icon: '💬',
    image: '/images/eco-orb-card.png',
    title: 'Senta ao seu lado',
    body:
      'De dia ou de madrugada, a Eco está acordada para escutar — sem fila, sem julgamento. Ela não senta à sua frente para te analisar; senta ao seu lado para atravessar junto.',
  },
  {
    icon: '🫧',
    image: '/images/eco-orb-card-2.png',
    title: 'Um espelho que escuta',
    body:
      'A Eco ouve também os silêncios entre as palavras e empresta nome ao que você ainda não consegue dizer. Pergunta para revelar, não para saber — e fala em “nós”.',
  },
  {
    icon: '🧭',
    image: '/images/eco-orb-card-3.png',
    title: 'No seu ritmo',
    body:
      'Devagar quando pesa, leve quando dá. A Eco acompanha o seu momento e oferece o passo possível — uma respiração, uma meditação, a prática certa para agora.',
  },
];

const STEPS = [
  {
    label: 'Escolha como você conversa',
    title: 'Escolha como você conversa',
    body:
      'Fale o que pensa em voz alta ou mande seus pensamentos por mensagem. De qualquer jeito, a Eco ouve, entende e responde.',
  },
  {
    label: 'Oferece orientação cuidadosa',
    title: 'Oferece orientação cuidadosa',
    body:
      'Dos dias difíceis às noites sem dormir, a Eco sabe o que pode ajudar. Enquanto vocês conversam, você recebe recomendações de práticas úteis dentro do app.',
  },
  {
    label: 'Lembra do que importa',
    title: 'Lembra do que importa',
    body:
      'Com o tempo, a Eco aprende a te conhecer e lembra do que vocês conversaram antes — assim, você sempre pode retomar a conversa de onde parou.',
  },
  {
    label: 'Segura por design',
    title: 'Segura por design',
    body:
      'Suas conversas são privadas e seguras. A Eco tem mecanismos de segurança integrados e pode te conectar a apoio em momentos de crise, caso precise de ajuda adicional.',
  },
];

const SAFETY_CARDS = [
  {
    image: '/images/eco-safety-privacidade.png',
    title: 'Privacidade em primeiro lugar',
    body:
      'Suas conversas são suas. Criptografadas, isoladas por usuário e nunca vendidas. Você decide o que fica guardado.',
  },
  {
    image: '/images/eco-safety-cuidado.png',
    title: 'Feita com cuidado',
    body:
      'A Eco é desenhada com princípios de psicologia e mindfulness, com limites claros sobre o que ela é — e o que ela não é.',
  },
  {
    image: '/images/eco-safety-apoio.png',
    title: 'Quando é sério, ela te direciona',
    body:
      'Em momentos de crise, a Eco reconhece os sinais e aponta caminhos de ajuda profissional. Ela apoia, mas não substitui o cuidado humano.',
  },
];

const FAQ = [
  {
    q: 'O que é a Eco?',
    a:
      'A Eco é a companheira de IA do Ecotopia: uma presença calma para conversar sobre o que você está sentindo, refletir e encontrar a prática certa para o seu momento.',
  },
  {
    q: 'A Eco substitui terapia?',
    a:
      'Não. A Eco é um apoio para o dia a dia — autoconhecimento, desabafo e práticas guiadas. Ela não substitui acompanhamento psicológico ou médico, e te direciona a ajuda profissional quando necessário.',
  },
  {
    q: 'Minhas conversas são privadas?',
    a:
      'Sim. Suas conversas são criptografadas e isoladas por usuário. Não vendemos seus dados, e você pode apagar seu histórico quando quiser.',
  },
  {
    q: 'Preciso pagar para conversar com a Eco?',
    a:
      'Você pode começar gratuitamente. Os 7 dias de teste liberam o acesso completo à Eco e a todo o conteúdo do Ecotopia.',
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
    <div className="ecotopia-lp lp-eco">
      <EcotopiaTopbar />

      {/* ─── Hero ─── */}
      <section className="lp-eco-hero">
        <div className="lp-eco-hero-inner">
          <div className="lp-eco-hero-text">
            <h1 className="scroll-reveal">
              Converse com a Eco<br />sobre isso.
            </h1>
            <p className="lp-eco-hero-lead scroll-reveal stagger-1">
              A Eco é sua companheira de IA. Seja para relaxar depois de um dia
              difícil, organizar a cabeça ou pegar no sono, ela está aqui para
              te ajudar no momento certo.
            </p>
            <Link
              to="/register?plan=annual&from=eco_ia_hero"
              className="lp-eco-cta scroll-reveal stagger-2"
            >
              Experimente grátis
            </Link>
          </div>

          <div className="lp-eco-hero-art scroll-reveal stagger-2" aria-hidden>
            <div className="lp-eco-hero-orb-glow" />
            <img
              src="/images/eco-mascote.png"
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
            <Link to="/register?plan=annual&from=eco_ia_channels" className="lp-eco-cta">
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
            <p className="lp-eco-care-kicker">Desenhada com cuidado</p>
            <h2 className="lp-eco-h2">Uma IA que lembra de você — com cuidado e privacidade.</h2>
          </div>

          <ul className="lp-eco-care-list scroll-reveal stagger-1">
            <li>
              <span className="lp-eco-care-thumb">
                <img src="/images/memoria-emocional-ilustracao.webp" alt="" loading="lazy" />
              </span>
              <div className="lp-eco-care-item-text">
                <h3>Memórias</h3>
                <p>
                  A Eco guarda os momentos e temas que importam para você,
                  criando uma memória emocional contínua entre as conversas.
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
                  A partir do que vocês conversam, a Eco desenha um retrato das
                  suas emoções e padrões ao longo do tempo — sempre sob o seu controle.
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
                  Insights e tendências do seu estado emocional reunidos para você
                  acompanhar sua evolução com clareza.
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
            Nosso compromisso com segurança e privacidade
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
          <h2>Converse com a Eco sobre isso.</h2>
          <Link to="/register?plan=annual&from=eco_ia_final" className="lp-eco-cta lp-eco-cta--lg">
            Experimente grátis
          </Link>
        </div>
      </section>

      <EcotopiaFooter />
    </div>
  );
}
