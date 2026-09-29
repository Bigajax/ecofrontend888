import ReinoLanding, { type LandingConfig } from '@/components/reino-landing/ReinoLanding';

/**
 * /ansiedade: estresse e ansiedade do dia a dia (a página antiga falava de
 * ansiedade climática, que o produto não tem). As práticas listadas são as do app.
 * Sem "4,9 na App Store", "+1 mi minutos" ou "mais de mil práticas": sem fonte.
 */
const ANSIEDADE: LandingConfig = {
  pagina: 'ansiedade',
  from: 'ansiedade',
  plano: 'annual',
  imagem: { src: '/images/reino/capa-respire.webp', foco: 'center' },
  rotulo: 'Ecotopia · para quando a cabeça acelera',
  titulo: 'Menos estresse e ansiedade no dia a dia.',
  sobre:
    'Práticas curtas e uma conversa sem julgamento para quando a cabeça acelera: respirar, entender o que você sente e dormir melhor.',
  destaques: [
    'Práticas de 5 a 15 minutos.',
    'A Eco para conversar a qualquer hora.',
    '7 dias gratuitos para experimentar tudo.',
  ],
  dores: {
    titulo: 'Para os momentos em que',
    itens: [
      { titulo: 'Os pensamentos não param', texto: 'Uma respiração guiada devolve você ao presente em poucos minutos.' },
      { titulo: 'O dia deixou tensão no corpo', texto: 'Uma prática curta de relaxamento para soltar o que ficou.' },
      { titulo: 'O sono não vem', texto: 'Meditações e o Protocolo do Sono ajudam a mente a desacelerar.' },
      { titulo: 'Você não sabe o que está sentindo', texto: 'A Eco ajuda a colocar em palavras e indica o próximo passo.' },
    ],
  },
  dentro: {
    rotulo: 'Algumas práticas do app',
    titulo: 'Para respirar, soltar e descansar',
    itens: [
      {
        imagem: '/images/reino/capa-respire.webp',
        meta: 'Respiração · 7 min',
        titulo: 'Pause. Respire. Recomece.',
        texto: 'Sete minutos para voltar para dentro de você.',
      },
      {
        imagem: '/images/reino/capa-solte.webp',
        meta: 'Relaxamento · 5 min',
        titulo: 'Solte o que o dia deixou',
        texto: 'Cinco minutos para ficar mais leve agora.',
      },
      {
        imagem: '/images/reino/capa-adormeca.webp',
        meta: 'Sono · 9 min',
        titulo: 'Adormeça sem carregar o dia',
        texto: 'Nove minutos para deixar o dia do lado de fora.',
      },
      {
        imagem: '/images/reino/capa-mente-quieta.webp',
        meta: 'Sono · 15 min',
        titulo: 'Mente quieta. Noite tranquila.',
        texto: 'Quinze minutos para silenciar o barulho interno.',
      },
    ],
  },
  passos: {
    titulo: 'Um jeito de começar',
    itens: [
      { titulo: 'Pare por um minuto', texto: 'Uma respiração guiada ou uma conversa com a Eco quando apertar.' },
      { titulo: 'Entenda o que sente', texto: 'A Eco ajuda a nomear o que está acontecendo e sugere a prática certa.' },
      { titulo: 'Cuide da noite', texto: 'Uma meditação para dormir fecha o dia com menos peso.' },
    ],
  },
  aviso: (
    <p>
      O Ecotopia é um apoio para o dia a dia e não substitui tratamento. Se a ansiedade atrapalha a sua vida, procure um
      profissional. Em sofrimento intenso ou risco, ligue para o CVV no 188 (gratuito, 24 horas).
    </p>
  ),
  faq: [
    {
      p: 'O Ecotopia trata ansiedade?',
      r: 'Não. É um apoio para o dia a dia, com práticas guiadas e reflexão. Ansiedade que atrapalha a vida merece acompanhamento profissional.',
    },
    {
      p: 'Quanto tempo por dia?',
      r: 'As práticas têm de 5 a 15 minutos. Dá para usar só quando precisar ou criar um hábito diário.',
    },
    {
      p: 'O que mais vem no plano?',
      r: 'A conversa com a Eco, o Protocolo do Sono, as meditações guiadas, o Diário Estoico, os 5 Anéis da Disciplina e a leitura de sonhos.',
    },
    {
      p: 'Vou ser cobrado antes dos 7 dias?',
      r: 'Não. O cartão é pedido no cadastro, mas a primeira cobrança só acontece depois dos 7 dias. Se cancelar antes, não paga nada.',
    },
  ],
  fechamento: {
    titulo: 'Dê um tempo para a sua mente.',
    sobre: 'Sete dias para experimentar as práticas e a Eco, sem pagar nada.',
  },
};

export default function EcotopiaAnsiedadePage() {
  return <ReinoLanding config={ANSIEDADE} />;
}
