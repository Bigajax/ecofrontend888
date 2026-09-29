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
  rotulo: 'STO.05 · O Pórtico · Diário Estoico',
  titulo: 'Um ano de sabedoria estoica, um dia de cada vez.',
  sobre:
    'Uma reflexão curta por dia, inspirada em Marco Aurélio, Sêneca e Epicteto, para começar a manhã com clareza e atravessar o dia com serenidade.',
  destaques: [
    'Uma lição por dia, do primeiro ao último dia do ano.',
    'Cada dia traz uma citação e uma ideia para levar ao dia.',
    'Dá para ouvir, marcar como lida e compartilhar.',
  ],
  dores: {
    titulo: 'Para quem quer atravessar o dia com mais firmeza',
    itens: [
      {
        titulo: 'Serenidade no que não depende de você',
        texto: 'Separar o que está no seu controle do que não está, e soltar o resto.',
      },
      {
        titulo: 'Clareza diante do caos',
        texto: 'Ver as coisas como elas são, sem o véu da opinião e do julgamento apressado.',
      },
      {
        titulo: 'Resiliência que se constrói',
        texto: 'Uma fortaleza interior, um dia de cada vez. O obstáculo deixa de ser inimigo e vira caminho.',
      },
      {
        titulo: 'Propósito todos os dias',
        texto: 'Um ritual de manhã que ancora você no que importa antes que o mundo peça a sua atenção.',
      },
    ],
  },
  dentro: {
    rotulo: 'Como o ano é dividido',
    titulo: 'Três disciplinas, doze meses',
    sobre: 'Cada parte do ano cultiva uma disciplina diferente do caráter.',
    itens: [
      {
        meta: 'I · janeiro a abril',
        titulo: 'A Disciplina da Percepção',
        texto: 'Ver o mundo sem distorções: clareza mental, domínio das emoções, consciência e pensamento imparcial.',
      },
      {
        meta: 'II · maio a agosto',
        titulo: 'A Disciplina da Ação',
        texto: 'Agir com virtude e propósito: a ação correta, a solução de problemas, o dever e o pragmatismo.',
      },
      {
        meta: 'III · setembro a dezembro',
        titulo: 'A Disciplina da Vontade',
        texto: 'Aceitar o que não se pode mudar: força, virtude, amor fati e a meditação sobre a mortalidade.',
      },
    ],
  },
  extra: (
    <section className="rl-secao" aria-labelledby="rl-meses">
      <p className="reino-rotulo">O índice do ano</p>
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
      r: 'Não. Cada dia traz uma citação curta e uma ideia simples para levar ao dia.',
    },
    {
      p: 'Quanto tempo leva por dia?',
      r: 'Poucos minutos: é uma página por dia.',
    },
    {
      p: 'O Diário está incluído no plano?',
      r: 'Sim. Está no mesmo plano da conversa com a Eco, do Protocolo do Sono, das meditações e dos 5 Anéis.',
    },
    {
      p: 'Vou ser cobrado antes dos 7 dias?',
      r: 'Não. O cartão é pedido no cadastro, mas a primeira cobrança só acontece depois dos 7 dias. Se cancelar antes, não paga nada.',
    },
  ],
  fechamento: {
    titulo: 'Comece hoje. O primeiro passo é uma página.',
    sobre: 'Sete dias para experimentar o Diário e tudo o que tem no Ecotopia.',
  },
};

export default function EcotopiaDiarioPage() {
  return <ReinoLanding config={DIARIO} />;
}
