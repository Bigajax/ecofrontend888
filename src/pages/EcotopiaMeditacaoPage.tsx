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
  rotulo: 'As Trilhas',
  titulo: 'Meditação simples, para qualquer dia.',
  sobre: 'Guiadas, curtas e em português. Dá para começar do zero.',
  dentro: {
    titulo: 'Comece do zero, uma sessão por vez',
    itens: [
      { meta: '5 min', titulo: 'Primeiros passos' },
      { meta: '4 min', titulo: 'Observando a respiração' },
      { meta: '4 min', titulo: 'Sentindo' },
      { meta: '8 min', titulo: 'Desacelerando e relaxando' },
      { meta: '9 min', titulo: 'Observando o corpo' },
    ],
  },
  passos: {
    titulo: 'Como praticar',
    itens: [{ titulo: 'Escolha a sessão' }, { titulo: 'Aperte o play' }, { titulo: 'Volte amanhã' }],
  },
  faq: [
    {
      p: 'Nunca meditei. Consigo?',
      r: 'Sim. As sessões são guiadas do começo ao fim.',
    },
    {
      p: 'Preciso de silêncio ou de alguma posição?',
      r: 'Não. Sentado, deitado ou caminhando.',
    },
    {
      p: 'O que mais vem no plano?',
      r: 'Tudo o que tem no Ecotopia: a Eco, sono, Diário Estoico, 5 Anéis e leitura de sonhos.',
    },
    {
      p: 'Vou ser cobrado nos 7 dias?',
      r: 'Não. A primeira cobrança só vem depois. Cancelou antes, não paga nada.',
    },
  ],
  fechamento: {
    titulo: 'A primeira sessão leva cinco minutos.',
  },
};

export default function EcotopiaMeditacaoPage() {
  return <ReinoLanding config={MEDITACAO} />;
}
