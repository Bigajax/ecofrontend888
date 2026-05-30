const FAQ = [
  {
    q: 'O que é o Ecotopia?',
    a: 'Um aplicativo de autoconhecimento prático em português, com Eco AI, Diário Estoico, Cinco Anéis da Disciplina, Protocolo do Sono e biblioteca filosófica. Construído sobre Jung, Freud, estoicismo e neurociência contemporânea.',
  },
  {
    q: 'A Eco AI substitui terapia?',
    a: 'Não. A Eco AI é uma ferramenta de reflexão, não de tratamento clínico. Se você está em sofrimento intenso ou em risco, ela vai te direcionar para o CVV (188) ou recomendar buscar um profissional.',
  },
  {
    q: 'Vou ser cobrado antes dos 7 dias?',
    a: 'O cartão é pedido no cadastro, mas você só é cobrado no 8º dia. Cancele em 1 clique a qualquer momento dentro dos 7 dias: sem cobrança, sem pergunta, sem ligação de retenção.',
  },
  {
    q: 'Quanto custa?',
    a: 'R$ 15,90 por mês no plano mensal, ou R$ 11,90/mês no plano anual (R$ 142,80 cobrado anualmente — economia de R$ 48).',
  },
  {
    q: 'É baseado em quê?',
    a: 'Carl Jung (sombra, individuação), Sigmund Freud (sonhos, inconsciente), estoicismo romano (Marco Aurélio, Sêneca, Epicteto), Miyamoto Musashi (Cinco Anéis), Joe Dispenza (meditação ativa) e neurociência contemporânea (Andrew Huberman, Lisa Feldman Barrett).',
  },
  {
    q: 'Para quem não é?',
    a: 'Para quem busca motivação rápida ou fórmula de enriquecimento. Para quem está em crise clínica aguda (procure profissional ou CVV 188). Para quem espera resultados em 7 dias sem usar.',
  },
  {
    q: 'Como cancelo?',
    a: 'Em 1 clique direto no app, na seção "Minha Conta". Sem formulário, sem ligação, sem retenção.',
  },
];

interface Props {
  compact?: boolean;
}

export default function FaqSection({ compact = false }: Props) {
  const items = compact ? FAQ.slice(0, 4) : FAQ;

  return (
    <section id="faq" className="lp-faq-section lp-faq">
      <h2 className="scroll-reveal">Perguntas frequentes</h2>
      <div className="scroll-reveal">
        {items.map(({ q, a }) => (
          <details key={q}>
            <summary>{q}</summary>
            <p className="lp-faq-body">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
