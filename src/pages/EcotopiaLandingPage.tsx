import { Link } from 'react-router-dom';
import ReinoLanding, { type LandingConfig } from '@/components/reino-landing/ReinoLanding';

/**
 * Landing principal ("/"). O reino na hora de quem chega: de manhã o Pórtico,
 * à tarde a Casa, à noite o Vale. Sem depoimento, selo ou número sem fonte.
 */
const PRINCIPAL: LandingConfig = {
  pagina: 'principal',
  from: 'principal',
  plano: 'monthly',
  rotulo: 'Ecotopia',
  titulo: 'Um lugar para voltar para si, todo dia.',
  sobre: 'Conversar, dormir, meditar. Um pouco por dia.',
  regioes: true,
  passos: {
    titulo: 'Como funciona',
    itens: [{ titulo: 'Comece os 7 dias grátis' }, { titulo: 'Escolha um lugar' }, { titulo: 'Volte um pouco todo dia' }],
  },
  citacao: {
    texto:
      'Manterei constante vigilância sobre mim mesmo e, muito proveitosamente, submeterei cada dia a uma revisão.',
    autor: 'Sêneca, Cartas Morais, 83.2',
  },
  aviso: (
    <p>
      A Eco não substitui terapia. Em sofrimento intenso, ligue para o CVV no 188.
    </p>
  ),
  faq: [
    {
      p: 'Vou ser cobrado nos 7 dias?',
      r: 'Não. A primeira cobrança só vem depois. Cancelou antes, não paga nada.',
    },
    {
      p: 'A Eco substitui terapia?',
      r: 'Não. É uma ferramenta de reflexão. Em sofrimento intenso ou risco, procure um profissional ou o CVV (188).',
    },
    {
      p: 'Em que o Ecotopia se baseia?',
      r: 'Jung e Freud nos sonhos, o estoicismo de Marco Aurélio e Sêneca, os Cinco Anéis de Musashi e meditações inspiradas em Joe Dispenza.',
    },
    {
      p: 'Como cancelo?',
      r: (
        <p>
          Quando quiser, pela <Link to="/cancelar-assinatura">página de cancelamento</Link>.
        </p>
      ),
    },
  ],
  fechamento: {
    titulo: 'O primeiro passo é pequeno.',
  },
};

export default function EcotopiaLandingPage() {
  return <ReinoLanding config={PRINCIPAL} />;
}
