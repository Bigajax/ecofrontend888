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
  rotulo: 'Ecotopia',
  titulo: 'Menos estresse e ansiedade no dia a dia.',
  sobre: 'Práticas curtas e uma conversa para quando a cabeça acelera.',
  dores: {
    titulo: 'Para quando',
    itens: [
      { titulo: 'Os pensamentos não param' },
      { titulo: 'O corpo guarda a tensão do dia' },
      { titulo: 'O sono não vem' },
      { titulo: 'Você não sabe o que sente' },
    ],
  },
  dentro: {
    titulo: 'Para respirar, soltar e descansar',
    itens: [
      {
        imagem: '/images/reino/capa-respire.webp',
        meta: 'Respiração · 7 min',
        titulo: 'Pause. Respire. Recomece.',
      },
      {
        imagem: '/images/reino/capa-solte.webp',
        meta: 'Relaxamento · 5 min',
        titulo: 'Solte o que o dia deixou',
      },
      {
        imagem: '/images/reino/capa-adormeca.webp',
        meta: 'Sono · 9 min',
        titulo: 'Adormeça sem carregar o dia',
      },
      {
        imagem: '/images/reino/capa-mente-quieta.webp',
        meta: 'Sono · 15 min',
        titulo: 'Mente quieta. Noite tranquila.',
      },
    ],
  },
  passos: {
    titulo: 'Um jeito de começar',
    itens: [{ titulo: 'Pare por um minuto' }, { titulo: 'Entenda o que sente' }, { titulo: 'Cuide da noite' }],
  },
  aviso: (
    <p>
      O Ecotopia não substitui tratamento. Em sofrimento intenso, ligue para o CVV no 188 (gratuito, 24 horas).
    </p>
  ),
  faq: [
    {
      p: 'O Ecotopia trata ansiedade?',
      r: 'Não. É um apoio para o dia a dia. Se a ansiedade atrapalha a vida, procure um profissional.',
    },
    {
      p: 'Quanto tempo por dia?',
      r: 'De 5 a 15 minutos, só quando precisar.',
    },
    {
      p: 'Vou ser cobrado nos 7 dias?',
      r: 'Não. A primeira cobrança só vem depois. Cancelou antes, não paga nada.',
    },
  ],
  fechamento: {
    titulo: 'Dê um tempo para a sua mente.',
  },
};

export default function EcotopiaAnsiedadePage() {
  return <ReinoLanding config={ANSIEDADE} />;
}
