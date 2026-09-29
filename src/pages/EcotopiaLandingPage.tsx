import { Link } from 'react-router-dom';
import ReinoLanding, { type LandingConfig } from '@/components/reino-landing/ReinoLanding';
import { OFFER } from '@/constants/offerCopy';

/**
 * Landing principal ("/"). O reino na hora de quem chega: de manhã o Pórtico,
 * à tarde a Casa, à noite o Vale. Sem depoimento, selo ou número sem fonte.
 */
const PRINCIPAL: LandingConfig = {
  pagina: 'principal',
  from: 'principal',
  plano: 'monthly',
  rotulo: 'Ecotopia · autoconhecimento em português',
  titulo: 'Um lugar para voltar para si, todo dia.',
  sobre:
    'Converse com a Eco, durma melhor, medite e leia uma lição estoica por dia. Tudo em português, num só lugar.',
  destaques: [
    'A Eco, disponível 24 horas por dia.',
    'Meditações, sono, estoicismo e práticas guiadas.',
    '7 dias gratuitos para experimentar tudo.',
  ],
  dores: {
    titulo: 'O que você precisa hoje?',
    itens: [
      { titulo: 'Menos estresse', texto: 'Pequenos momentos de pausa para desacelerar a mente e recuperar energia.' },
      { titulo: 'Dormir bem', texto: 'Práticas, sons e meditações para ajudar o corpo a desligar.' },
      { titulo: 'Lidar com a ansiedade', texto: 'Aprender a lidar com pensamentos acelerados com mais clareza e gentileza.' },
      { titulo: 'Organizar a cabeça', texto: 'Colocar pensamentos, emoções e prioridades em ordem, com calma.' },
      { titulo: 'Meditar', texto: 'Voltar para o momento presente com uma prática curta por dia.' },
      { titulo: 'Conversar', texto: 'Um espaço para refletir e entender o que você sente, sem julgamento.' },
    ],
  },
  regioes: true,
  passos: {
    titulo: 'Como funciona',
    itens: [
      {
        titulo: 'Comece os 7 dias gratuitos',
        texto: 'Crie a conta e escolha o plano. Nada é cobrado nos primeiros 7 dias.',
      },
      {
        titulo: 'Escolha por onde entrar',
        texto: 'Uma conversa com a Eco, uma noite do Protocolo do Sono ou a reflexão do dia.',
      },
      {
        titulo: 'Volte um pouco todo dia',
        texto: 'A tela inicial sugere o que faz sentido para a hora: manhã, fim de tarde ou noite.',
      },
    ],
  },
  citacao: {
    texto:
      'Manterei constante vigilância sobre mim mesmo e, muito proveitosamente, submeterei cada dia a uma revisão.',
    autor: 'Sêneca, Cartas Morais, 83.2',
  },
  aviso: (
    <p>
      A Eco é uma ferramenta de reflexão e não substitui terapia. Em sofrimento intenso ou risco, ligue para o CVV no
      188.
    </p>
  ),
  faq: [
    {
      p: 'O que é o Ecotopia?',
      r: 'Um app de autoconhecimento em português: conversa com a Eco, Protocolo do Sono, meditações guiadas, Diário Estoico, 5 Anéis da Disciplina e leitura de sonhos.',
    },
    {
      p: 'A Eco substitui terapia?',
      r: 'Não. A Eco é uma ferramenta de reflexão, não de tratamento clínico. Se você está em sofrimento intenso ou em risco, ela indica o CVV (188) ou a busca por um profissional.',
    },
    {
      p: 'Vou ser cobrado antes dos 7 dias?',
      r: 'Não. O cartão é pedido no cadastro, mas a primeira cobrança só acontece depois dos 7 dias. Se cancelar antes, não paga nada.',
    },
    {
      p: 'Quanto custa?',
      r: `${OFFER.priceMonthly} no plano mensal, ou ${OFFER.priceAnnualMonthly} no anual (R$ 142,80 por ano, R$ 48 a menos que doze meses do mensal).`,
    },
    {
      p: 'Em que o Ecotopia se baseia?',
      r: 'Nas ideias de Carl Jung e Sigmund Freud sobre sonhos e inconsciente, no estoicismo de Marco Aurélio, Sêneca e Epicteto, nos Cinco Anéis de Miyamoto Musashi e em meditações inspiradas no trabalho de Joe Dispenza.',
    },
    {
      p: 'Para quem não é?',
      r: 'Para quem busca motivação rápida ou fórmula mágica. Para quem está em crise aguda: nesse caso, procure um profissional ou o CVV (188).',
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
    titulo: 'Comece hoje. O primeiro passo é pequeno.',
    sobre: 'Sete dias para conhecer tudo, sem pagar nada.',
  },
};

export default function EcotopiaLandingPage() {
  return <ReinoLanding config={PRINCIPAL} />;
}
