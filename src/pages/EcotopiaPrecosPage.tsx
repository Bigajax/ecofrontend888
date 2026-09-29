import { Link } from 'react-router-dom';
import ReinoLanding, { type LandingConfig } from '@/components/reino-landing/ReinoLanding';

/**
 * /precos: um preço, tudo incluído. Os dois planos dão acesso às mesmas coisas;
 * a diferença é só o jeito de pagar. Valores de offerCopy (fonte única).
 */
const PRECOS: LandingConfig = {
  pagina: 'precos',
  from: 'pricing_page',
  plano: 'annual',
  imagem: { src: '/images/reino/trilhas.webp', foco: '70% 50%' },
  rotulo: 'Ecotopia',
  titulo: 'Um preço. Tudo incluído.',
  sobre: '7 dias grátis. Sem fidelidade.',
  dentro: {
    titulo: 'O que está incluído, nos dois planos',
    itens: [
      { titulo: 'Conversa com a Eco' },
      { titulo: 'Protocolo do Sono' },
      { titulo: 'Meditações guiadas' },
      { titulo: 'Diário Estoico' },
      { titulo: '5 Anéis da Disciplina' },
      { titulo: 'Leitura de sonhos' },
    ],
  },
  faq: [
    {
      p: 'Vou ser cobrado antes dos 7 dias?',
      r: 'Não. A primeira cobrança só vem depois. Cancelou antes, não paga nada.',
    },
    {
      p: 'Qual a diferença entre o mensal e o anual?',
      r: 'Só o jeito de pagar. No anual, R$ 142,80 de uma vez, R$ 48 a menos.',
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
      r: 'Não. Em sofrimento intenso, procure um profissional ou o CVV (188).',
    },
  ],
  fechamento: {
    titulo: 'Comece grátis. Decida depois.',
  },
};

export default function EcotopiaPrecosPage() {
  return <ReinoLanding config={PRECOS} />;
}
