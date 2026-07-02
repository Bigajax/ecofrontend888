import { useState } from 'react';

// Seção FAQ / Objeções — acordeão controlado (apenas 1 item aberto por vez) que
// derruba as últimas objeções antes do bloco de oferta/preço/CTA.
// Visual referência landing Protocolo-Sono-v2: card arredondado com cabeçalho
// bege (chip FAQ + título grande) e lista branca com setas circulares que
// giram 90° e preenchem ao abrir.

const FAQ = [
  {
    q: 'Vou ser cobrado nos 7 dias?',
    a: 'Não. A cobrança só começa no 8º dia, e só se você não cancelar antes.',
  },
  {
    q: 'E se eu não conseguir dormir já na primeira noite?',
    a: 'O objetivo da Noite 1 não é te fazer dormir. É fazer seu corpo perceber que pode baixar a guarda. O sono vem como consequência: às vezes na 1ª noite, às vezes na 3ª. Por isso são 7 noites — e você tem 7 dias gratuitos pra testar sem pagar nada.',
  },
  {
    q: 'Quanto tempo leva pra funcionar?',
    a: 'A maioria sente diferença na respiração e na tensão do peito ainda na primeira noite. O sono mais consistente costuma aparecer entre a 3ª e a 5ª noite.',
  },
  {
    q: 'Preciso saber meditar pra funcionar?',
    a: 'Não. O protocolo é áudio guiado. A voz conduz, o som ancora. Você só precisa estar deitado. Se a mente fugir, ela volta sozinha quando ouve a voz.',
  },
  {
    q: 'É sem remédio mesmo? E se eu já tomo algo pra dormir?',
    a: 'É um caminho sem remédio: a prática não usa nenhum fármaco, só trabalha o sistema nervoso pra sair do estado de alerta. Se você já toma medicação, não pare nada por conta própria. Converse com seu médico. Muita gente procura o protocolo justamente pra dormir sem depender de pílula.',
  },
  {
    q: 'Quanto tempo preciso por noite?',
    a: 'Cerca de 10 minutos, antes de deitar.',
  },
  {
    q: 'Já tentei de tudo. É diferente?',
    a: 'Não é um som de chuva aleatório. É uma sequência de 7 noites que trabalha o estado de alerta em camadas: do corpo tenso aos pensamentos que não param.',
  },
  {
    q: 'E se não funcionar pra mim?',
    a: 'Cancele em 1 toque, a qualquer momento, direto no app.',
  },
];

// Versão noturna (variante deite_se): acordeão. As 3 últimas são os
// mata-objeções adaptados ao modelo Pix único (sem trial/assinatura — a
// garantia é a mesma do checklist da oferta: 7 dias).
const FAQ_NIGHT: { q: string; a: string }[] = [
  {
    q: 'Preciso saber meditar para funcionar?',
    a: 'Não. O ritual foi feito para você apenas ouvir e acompanhar.',
  },
  {
    q: 'Quanto tempo preciso por noite?',
    a: 'Entre 5 e 10 minutos.',
  },
  {
    q: 'E se eu dormir antes da meditação acabar?',
    a: 'Tudo bem. A ideia é justamente ajudar seu corpo a relaxar.',
  },
  {
    q: 'É remédio ou tratamento?',
    a: 'Não. É uma prática guiada de relaxamento e desaceleração.',
  },
  {
    q: 'Posso usar deitado?',
    a: 'Sim. O ritual foi feito para ser usado na cama, com fones.',
  },
  {
    q: 'Quanto tempo leva pra funcionar?',
    a: 'A maioria sente o corpo mais solto já na primeira noite. O sono mais consistente costuma aparecer entre a 3ª e a 5ª noite — por isso o ritual são 7 noites em sequência.',
  },
  {
    q: 'Já tentei de tudo. É diferente?',
    a: 'Não é um som de chuva aleatório. É uma sequência que trabalha o estado de alerta em camadas: do corpo tenso aos pensamentos que não param. Cada noite prepara a próxima.',
  },
  {
    q: 'E se não funcionar pra mim?',
    a: 'A primeira noite é grátis — você sente antes de pagar qualquer coisa. E se liberar as 7 noites e não ajudar, devolvemos em até 7 dias.',
  },
];

interface SonoFaqSectionProps {
  /** Variante deite_se: FAQ noturno em cards com ícone. */
  conviteMode?: boolean;
}

export default function SonoFaqSection({ conviteMode = false }: SonoFaqSectionProps) {
  const [open, setOpen] = useState<number | null>(null);

  if (conviteMode) {
    return (
      <section className="lp-sono-faq2" aria-label="Perguntas frequentes">
        <div className="lp-sono-faq2-inner">
          <h2 className="lp-sono-faq2-title scroll-reveal">FAQ</h2>
          <p className="lp-sono-faq2-lead scroll-reveal stagger-1">
            As dúvidas mais comuns antes de começar.
          </p>
          <div className="lp-sono-faq2-list">
            {FAQ_NIGHT.map(({ q, a }, i) => {
              const isOpen = open === i;
              const panelId = `sono-faq2-panel-${i}`;
              const buttonId = `sono-faq2-button-${i}`;
              return (
                <div
                  className={`lp-sono-faq2-item ${isOpen ? 'is-open' : ''}`}
                  key={q}
                >
                  <button
                    type="button"
                    id={buttonId}
                    className="lp-sono-faq2-q"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpen(isOpen ? null : i)}
                  >
                    <span className="lp-sono-faq2-q-text">{q}</span>
                    {/* Chevron pra baixo (gira 180° via .is-open no CSS): a seta
                        "→" antiga sinalizava navegação, não acordeão. */}
                    <span className="lp-sono-faq2-arrow" aria-hidden>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </span>
                  </button>
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    className="lp-sono-faq2-a"
                    data-open={isOpen}
                  >
                    <div className="lp-sono-faq2-a-inner">
                      <p>{a}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="lp-sono-faq">
      <div className="lp-sono-faq-card scroll-reveal">
        <div className="lp-sono-faq-head">
          <span className="lp-sono-faq-chip">FAQ</span>
          <h2 className="lp-sono-faq-title">
            Antes de você fechar
            <br />
            essa página.
          </h2>
        </div>

        <div className="lp-sono-faq-list">
          {FAQ.map(({ q, a }, i) => {
            const isOpen = open === i;
            const panelId = `sono-faq-panel-${i}`;
            const buttonId = `sono-faq-button-${i}`;
            return (
              <div className={`lp-sono-faq-item ${isOpen ? 'is-open' : ''}`} key={q}>
                <button
                  type="button"
                  id={buttonId}
                  className="lp-sono-faq-q"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpen(isOpen ? null : i)}
                >
                  <span className="lp-sono-faq-q-text">{q}</span>
                  <span className="lp-sono-faq-arrow" aria-hidden>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14" />
                      <path d="M12 5l7 7-7 7" />
                    </svg>
                  </span>
                </button>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  className="lp-sono-faq-a"
                  data-open={isOpen}
                >
                  <div className="lp-sono-faq-a-inner">
                    <p>{a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
