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
  rotulo: 'TRI.04 · As Trilhas · Desperte seu potencial interior',
  titulo: 'Você não é o seu passado.',
  sobre:
    'Meditações guiadas inspiradas no trabalho de Joe Dispenza, para sair do piloto automático e praticar um novo jeito de pensar e sentir.',
  destaques: [
    `${DR_JOE_MEDITATIONS.length} meditações guiadas, de 5 a 7 minutos.`,
    'Pensadas para quem está começando e para quem já pratica.',
    'Incluídas no plano, com todo o resto do Ecotopia.',
  ],
  dentro: {
    rotulo: 'A coleção',
    titulo: 'Cinco meditações para um novo começo',
    itens: DR_JOE_MEDITATIONS.map((m) => ({
      imagem: CAPA[m.id],
      meta: m.duration,
      titulo: m.title,
      texto: m.description,
    })),
  },
  passos: {
    titulo: 'Como a prática funciona',
    itens: [
      {
        titulo: 'Saia do piloto automático',
        texto: 'Boa parte do dia roda em padrões antigos. A prática começa interrompendo esse ciclo.',
      },
      {
        titulo: 'Pensamento e emoção juntos',
        texto: 'A meditação guia você a sentir, no presente, o estado que quer cultivar.',
      },
      {
        titulo: 'Repita até virar hábito',
        texto: 'Não é sobre entender com a cabeça. É sobre voltar à prática, dia após dia.',
      },
    ],
  },
  faq: [
    {
      p: 'Quem é Joe Dispenza?',
      r: 'Autor de livros sobre meditação e mudança de hábitos. As meditações do Ecotopia são inspiradas no trabalho dele.',
    },
    {
      p: 'Preciso ter experiência com meditação?',
      r: 'Não. As sessões são guiadas do início ao fim e duram de 5 a 7 minutos.',
    },
    {
      p: 'Está incluído no plano do Ecotopia?',
      r: 'Sim. A coleção faz parte do plano, ao lado da conversa com a Eco, do Diário Estoico, do Protocolo do Sono e dos 5 Anéis.',
    },
    {
      p: 'Vou ser cobrado antes dos 7 dias?',
      r: 'Não. O cartão é pedido no cadastro, mas a primeira cobrança só acontece depois dos 7 dias. Se cancelar antes, não paga nada.',
    },
  ],
  fechamento: {
    titulo: 'Comece hoje. A primeira meditação leva sete minutos.',
    sobre: 'Sete dias para experimentar a coleção e tudo o que tem no Ecotopia.',
  },
};

export default function EcotopiaDispenzaPage() {
  return <ReinoLanding config={DISPENZA} />;
}
