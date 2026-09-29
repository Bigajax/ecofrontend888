import { Link } from 'react-router-dom';
import ReinoLanding, { type LandingConfig } from '@/components/reino-landing/ReinoLanding';
import { OFFER } from '@/constants/offerCopy';

/**
 * /precos: um preço, tudo incluído. Os dois planos dão acesso às mesmas coisas;
 * a diferença é só o jeito de pagar. Valores de offerCopy (fonte única).
 */
const PRECOS: LandingConfig = {
  pagina: 'precos',
  from: 'pricing_page',
  plano: 'annual',
  imagem: { src: '/images/reino/trilhas.webp', foco: '70% 50%' },
  rotulo: 'Ecotopia · preço',
  titulo: 'Um preço. Tudo incluído.',
  sobre: '7 dias gratuitos para experimentar tudo. Sem fidelidade: cancele quando quiser.',
  destaques: [
    `Mensal: ${OFFER.priceMonthly}.`,
    `Anual: ${OFFER.priceAnnualMonthly} (R$ 142,80 por ano).`,
    'Os dois planos dão acesso a tudo.',
  ],
  dentro: {
    rotulo: 'O que está incluído',
    titulo: 'Tudo o que tem no Ecotopia, nos dois planos',
    itens: [
      { titulo: 'Conversa com a Eco', texto: 'Para organizar pensamentos e emoções, a qualquer hora.' },
      { titulo: 'Protocolo do Sono', texto: 'Sete noites guiadas, meditações e sons para dormir.' },
      { titulo: 'Meditações guiadas', texto: 'Incluindo a coleção inspirada no trabalho de Joe Dispenza.' },
      { titulo: 'Diário Estoico', texto: 'Uma lição curta para cada dia do ano.' },
      { titulo: '5 Anéis da Disciplina', texto: 'Um ritual diário de perguntas rápidas.' },
      { titulo: 'Leitura de sonhos', texto: 'Conte um sonho e receba uma leitura inspirada em Freud e Jung.' },
    ],
  },
  faq: [
    {
      p: 'Vou ser cobrado antes dos 7 dias?',
      r: 'Não. O cartão é pedido no cadastro, mas a primeira cobrança só acontece depois dos 7 dias. Se cancelar antes, não paga nada.',
    },
    {
      p: 'Qual a diferença entre o mensal e o anual?',
      r: 'Só o jeito de pagar. O acesso é o mesmo. No anual você paga R$ 142,80 de uma vez, R$ 48 a menos que doze meses do mensal.',
    },
    {
      p: 'Tem fidelidade?',
      r: 'Não. O mensal renova todo mês e o anual, todo ano. Você cancela quando quiser.',
    },
    {
      p: 'Como cancelo?',
      r: (
        <p>
          Pela <Link to="/cancelar-assinatura">página de cancelamento</Link>, a qualquer momento.
        </p>
      ),
    },
    {
      p: 'A Eco substitui terapia?',
      r: 'Não. A Eco é uma ferramenta de reflexão, não de tratamento clínico. Em sofrimento intenso ou risco, procure um profissional ou o CVV (188).',
    },
  ],
  fechamento: {
    titulo: 'Comece pelos 7 dias gratuitos. Decida depois.',
    sobre: 'Nada é cobrado antes do oitavo dia.',
  },
};

export default function EcotopiaPrecosPage() {
  return <ReinoLanding config={PRECOS} />;
}
