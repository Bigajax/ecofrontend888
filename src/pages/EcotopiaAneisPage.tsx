import ReinoLanding, { type LandingConfig } from '@/components/reino-landing/ReinoLanding';
import { RINGS_ARRAY } from '@/constants/rings';

/** /disciplina: os 5 Anéis da Disciplina (os anéis vêm dos mesmos dados do app). */
const ANEIS: LandingConfig = {
  pagina: 'aneis',
  from: 'aneis',
  plano: 'annual',
  imagem: { src: '/images/reino/capa-cinco-aneis.webp', foco: 'center' },
  rotulo: 'TRI.04 · As Trilhas · 5 Anéis da Disciplina',
  titulo: 'Disciplina não nasce da força. Nasce de um caminho.',
  sobre:
    'Uma prática diária inspirada no Livro dos Cinco Anéis, de Miyamoto Musashi: cinco perguntas rápidas por dia, e a Eco ajuda você a enxergar os padrões.',
  destaques: [
    'Cinco perguntas rápidas por dia, uma para cada anel.',
    'A Eco devolve padrões, gráficos e reflexões.',
    'Você acompanha a evolução ao longo das semanas.',
  ],
  dentro: {
    rotulo: 'O caminho',
    titulo: 'Cinco anéis, uma só direção',
    sobre: 'Cada anel é uma camada da disciplina: da clareza inicial até ela virar um jeito de viver.',
    itens: RINGS_ARRAY.map((r) => ({ meta: r.subtitlePt, titulo: r.titlePt, texto: `${r.descriptionPt}.` })),
  },
  passos: {
    titulo: 'Como funciona o ritual',
    itens: [
      { titulo: 'Responda às perguntas do dia', texto: 'Uma pergunta honesta para cada anel. Leva poucos minutos.' },
      { titulo: 'A Eco reflete com você', texto: 'Ela devolve padrões, pequenos ajustes e o próximo passo.' },
      { titulo: 'Volte amanhã', texto: 'A constância faz o trabalho. A evolução aparece nos gráficos.' },
    ],
  },
  faq: [
    {
      p: 'O que é a disciplina dos cinco anéis?',
      r: 'Uma prática diária inspirada no Livro dos Cinco Anéis, de Miyamoto Musashi. Cada anel (Terra, Água, Fogo, Vento e Vazio) representa uma camada da disciplina.',
    },
    {
      p: 'Preciso saber alguma coisa sobre Musashi ou filosofia?',
      r: 'Não. As perguntas são simples e práticas. A profundidade está na constância, não na teoria.',
    },
    {
      p: 'Funciona junto com o Diário Estoico e as meditações?',
      r: 'Sim. Os cinco anéis são uma das práticas do Ecotopia e estão no mesmo plano do Diário, das meditações e da conversa com a Eco.',
    },
    {
      p: 'Vou ser cobrado antes dos 7 dias?',
      r: 'Não. O cartão é pedido no cadastro, mas a primeira cobrança só acontece depois dos 7 dias. Se cancelar antes, não paga nada.',
    },
  ],
  fechamento: {
    titulo: 'Comece hoje. O primeiro anel é uma pergunta.',
    sobre: 'Sete dias para experimentar o ritual e tudo o que tem no Ecotopia.',
  },
};

export default function EcotopiaAneisPage() {
  return <ReinoLanding config={ANEIS} />;
}
