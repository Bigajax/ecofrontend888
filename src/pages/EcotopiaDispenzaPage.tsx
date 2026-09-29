import ReinoLanding, { type LandingConfig } from '@/components/reino-landing/ReinoLanding';
import { DR_JOE_MEDITATIONS } from '@/data/drJoeMeditations';

/**
 * /dr-joe-dispenza: meditações inspiradas no trabalho dele (a coleção vem dos
 * mesmos dados do app). Sem credenciais nem promessas de efeito sem fonte.
 */
// As mesmas pinturas do reino que o app usa nessas sessões (as ilustrações antigas eram
// vetor de pessoa meditando, o que a direção do reino evita).
const CAPA: Record<string, string> = {
  blessing_1: '/images/reino/portico-800.webp',
  blessing_2: '/images/reino/vale-800.webp',
  blessing_3: '/images/reino/capa-desperte.webp',
  blessing_5: '/images/reino/trilhas-800.webp',
  blessing_6: '/images/reino/capa-mente-quieta.webp',
};

const DISPENZA: LandingConfig = {
  pagina: 'dispenza',
  from: 'dispenza',
  plano: 'annual',
  mood: 'amanhecer',
  imagem: { src: '/images/reino/capa-desperte.webp', foco: 'center' },
  rotulo: 'As Trilhas',
  titulo: 'Você não é o seu passado.',
  sobre: 'Meditações inspiradas em Joe Dispenza, para sair do piloto automático.',
  dentro: {
    titulo: 'Cinco meditações para um novo começo',
    itens: DR_JOE_MEDITATIONS.map((m) => ({
      imagem: CAPA[m.id],
      meta: m.duration,
      titulo: m.title,
    })),
  },
  passos: {
    titulo: 'Como a prática funciona',
    itens: [{ titulo: 'Saia do piloto automático' }, { titulo: 'Sinta o que quer cultivar' }, { titulo: 'Repita até virar hábito' }],
  },
  faq: [
    {
      p: 'Quem é Joe Dispenza?',
      r: 'Autor de livros sobre meditação e mudança de hábitos. As meditações são inspiradas no trabalho dele.',
    },
    {
      p: 'Preciso ter experiência?',
      r: 'Não. São guiadas e duram de 5 a 7 minutos.',
    },
    {
      p: 'Vou ser cobrado nos 7 dias?',
      r: 'Não. A primeira cobrança só vem depois. Cancelou antes, não paga nada.',
    },
  ],
  fechamento: {
    titulo: 'A primeira meditação leva sete minutos.',
  },
};

export default function EcotopiaDispenzaPage() {
  return <ReinoLanding config={DISPENZA} />;
}
