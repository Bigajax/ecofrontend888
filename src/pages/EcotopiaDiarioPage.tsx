import ReinoLanding, { type LandingConfig } from '@/components/reino-landing/ReinoLanding';

/** /estoicismo: o Diário Estoico. O Pórtico é o lugar dele no reino. */
const MESES = [
  ['Janeiro', 'Clareza'],
  ['Fevereiro', 'Paixões e emoções'],
  ['Março', 'Consciência'],
  ['Abril', 'Pensamento imparcial'],
  ['Maio', 'Ação correta'],
  ['Junho', 'Solução de problemas'],
  ['Julho', 'Dever'],
  ['Agosto', 'Pragmatismo'],
  ['Setembro', 'Força e resiliência'],
  ['Outubro', 'Virtude e bondade'],
  ['Novembro', 'Aceitação, amor fati'],
  ['Dezembro', 'Memento mori'],
];

const DIARIO: LandingConfig = {
  pagina: 'estoicismo',
  from: 'diario',
  plano: 'annual',
  mood: 'amanhecer',
  imagem: { src: '/images/reino/portico.webp', foco: '85% 50%' },
  rotulo: 'O Pórtico',
  titulo: 'Um ano de sabedoria estoica, um dia de cada vez.',
  sobre: 'Uma página por manhã, de Marco Aurélio, Sêneca e Epicteto.',
  dentro: {
    titulo: 'Três disciplinas, doze meses',
    itens: [
      {
        meta: 'I · janeiro a abril',
        titulo: 'A Disciplina da Percepção',
      },
      {
        meta: 'II · maio a agosto',
        titulo: 'A Disciplina da Ação',
      },
      {
        meta: 'III · setembro a dezembro',
        titulo: 'A Disciplina da Vontade',
      },
    ],
  },
  extra: (
    <section className="rl-secao" aria-labelledby="rl-meses">
      <h2 id="rl-meses" className="rl-titulo">
        Doze meses, doze temas
      </h2>
      <ol className="rl-dores rl-meses">
        {MESES.map(([mes, tema]) => (
          <li key={mes}>
            <span className="rl-meses__mes">{mes}</span>
            <span className="rl-dores__titulo">{tema}</span>
          </li>
        ))}
      </ol>
    </section>
  ),
  citacao: {
    texto: 'A alma se tinge da cor dos seus pensamentos.',
    autor: 'Marco Aurélio, Meditações, V.16',
  },
  faq: [
    {
      p: 'Preciso saber filosofia?',
      r: 'Não. Cada dia é uma citação curta e uma ideia simples.',
    },
    {
      p: 'Quanto tempo leva?',
      r: 'Poucos minutos: uma página por dia.',
    },
    {
      p: 'Vou ser cobrado nos 7 dias?',
      r: 'Não. A primeira cobrança só vem depois. Cancelou antes, não paga nada.',
    },
  ],
  fechamento: {
    titulo: 'O primeiro passo é uma página.',
  },
};

export default function EcotopiaDiarioPage() {
  return <ReinoLanding config={DIARIO} />;
}
