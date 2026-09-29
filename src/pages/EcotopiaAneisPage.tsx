import ReinoLanding, { type LandingConfig } from '@/components/reino-landing/ReinoLanding';
import { RINGS_ARRAY } from '@/constants/rings';

/** /disciplina: os 5 Anéis da Disciplina (os anéis vêm dos mesmos dados do app). */
const ANEIS: LandingConfig = {
  pagina: 'aneis',
  from: 'aneis',
  plano: 'annual',
  imagem: { src: '/images/reino/capa-cinco-aneis.webp', foco: 'center' },
  rotulo: 'As Trilhas',
  titulo: 'Disciplina não nasce da força. Nasce de um caminho.',
  sobre: 'Cinco perguntas por dia, inspiradas em Miyamoto Musashi.',
  dentro: {
    titulo: 'Cinco anéis, uma só direção',
    itens: RINGS_ARRAY.map((r) => ({ meta: r.subtitlePt, titulo: r.titlePt })),
  },
  passos: {
    titulo: 'Como funciona',
    itens: [{ titulo: 'Responda às perguntas do dia' }, { titulo: 'A Eco mostra os padrões' }, { titulo: 'Volte amanhã' }],
  },
  faq: [
    {
      p: 'Preciso saber algo sobre Musashi?',
      r: 'Não. As perguntas são simples e práticas.',
    },
    {
      p: 'Quanto tempo leva?',
      r: 'Poucos minutos por dia.',
    },
    {
      p: 'Vou ser cobrado nos 7 dias?',
      r: 'Não. A primeira cobrança só vem depois. Cancelou antes, não paga nada.',
    },
  ],
  fechamento: {
    titulo: 'O primeiro anel é uma pergunta.',
  },
};

export default function EcotopiaAneisPage() {
  return <ReinoLanding config={ANEIS} />;
}
