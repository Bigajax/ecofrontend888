import ReinoLanding, { type LandingConfig } from '@/components/reino-landing/ReinoLanding';

/**
 * /meditacao: o que o app tem de meditação de verdade (programa Primeiros passos,
 * práticas curtas, coleção inspirada em Joe Dispenza). Sai o catálogo traduzido
 * do Headspace (cursos Básico/Avançado, crianças, instrutores, "comprovado
 * cientificamente") e o player de amostra que não tocava.
 */
const MEDITACAO: LandingConfig = {
  pagina: 'meditacao',
  from: 'meditacao',
  plano: 'annual',
  imagem: { src: '/images/reino/capa-primeiros-passos.webp', foco: 'center 70%' },
  rotulo: 'TRI.04 · As Trilhas · Meditação',
  titulo: 'Meditação simples, para qualquer dia.',
  sobre:
    'Meditações guiadas e curtas para começar do zero ou aprofundar a prática, no seu ritmo e em português.',
  destaques: [
    'Um programa de primeiros passos para quem nunca meditou.',
    'Práticas de 4 a 15 minutos para respirar, relaxar e dormir.',
    'Uma coleção inspirada no trabalho de Joe Dispenza.',
  ],
  dentro: {
    rotulo: 'Programa · Primeiros passos',
    titulo: 'Comece do zero, uma sessão por vez',
    sobre: 'Cinco sessões curtas que ensinam o básico: parar, respirar e sentir o corpo.',
    itens: [
      { meta: '5 min', titulo: 'Primeiros passos', texto: '5 minutos para entender o que acontece quando você para.' },
      { meta: '4 min', titulo: 'Observando a respiração', texto: 'Sua respiração sempre esteve lá. Agora você vai ouvi-la.' },
      { meta: '4 min', titulo: 'Sentindo', texto: 'O que o seu corpo sente quando a mente para de falar?' },
      { meta: '8 min', titulo: 'Desacelerando e relaxando', texto: 'Para o dia que não quer terminar. 8 minutos para soltar tudo.' },
      {
        meta: '9 min',
        titulo: 'Observando o corpo',
        texto: 'Uma viagem de cima a baixo. Você vai se surpreender com o que vai sentir.',
      },
    ],
  },
  passos: {
    titulo: 'Como praticar',
    itens: [
      { titulo: 'Escolha a sessão do dia', texto: 'O programa segue em ordem; as outras práticas você usa quando quiser.' },
      { titulo: 'Aperte o play', texto: 'A voz guia do começo ao fim. Não precisa saber nada antes.' },
      { titulo: 'Volte amanhã', texto: 'A constância importa mais que a duração. Poucos minutos por dia bastam para começar.' },
    ],
  },
  faq: [
    {
      p: 'Nunca meditei. Consigo?',
      r: 'Sim. O programa Primeiros passos começa do zero, com sessões de 4 a 9 minutos.',
    },
    {
      p: 'Preciso de silêncio total ou de alguma posição?',
      r: 'Não. Um lugar tranquilo ajuda, mas as sessões são guiadas e dá para praticar sentado, deitado ou até caminhando.',
    },
    {
      p: 'O que mais vem no plano?',
      r: 'A conversa com a Eco, o Protocolo do Sono, o Diário Estoico, os 5 Anéis da Disciplina e a leitura de sonhos.',
    },
    {
      p: 'Vou ser cobrado antes dos 7 dias?',
      r: 'Não. O cartão é pedido no cadastro, mas a primeira cobrança só acontece depois dos 7 dias. Se cancelar antes, não paga nada.',
    },
  ],
  fechamento: {
    titulo: 'A primeira sessão leva cinco minutos.',
    sobre: 'Sete dias para experimentar as meditações e tudo o que tem no Ecotopia.',
  },
};

export default function EcotopiaMeditacaoPage() {
  return <ReinoLanding config={MEDITACAO} />;
}
