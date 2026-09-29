import { Link } from 'react-router-dom';
import ReinoLanding, { type LandingConfig } from '@/components/reino-landing/ReinoLanding';
import mixpanel from '@/lib/mixpanel';

/**
 * /eco-ia: a Casa da Eco. Só o que o app faz de verdade (conversa por voz ou
 * texto, memória, indicação de prática, leitura de sonhos). Sai "criptografadas",
 * "nunca vendidas" e "apaga quando quiser": não há fonte no código.
 */
const SONHO = (
  <section className="rl-secao rl-sonho" aria-labelledby="rl-sonho">
    <p className="reino-rotulo">DRM.03 · Lago dos Sonhos</p>
    <h2 id="rl-sonho" className="rl-titulo">
      O que o seu sonho está tentando dizer?
    </h2>
    <p className="rl-sobre">Conte um sonho e a Eco faz uma leitura inspirada em Freud e Jung.</p>
    <div className="rl-sonho__cartas">
      <div>
        <p className="reino-rotulo">O sonho</p>
        <p className="rl-sonho__texto">Eu estava sendo perseguido e minhas pernas não respondiam.</p>
      </div>
      <div>
        <p className="reino-rotulo">A leitura da Eco</p>
        <p className="rl-sonho__texto">
          A perseguição costuma falar de algo evitado na vida desperta. As pernas que travam são o corpo dizendo: parte
          de você quer parar de fugir e encarar o que vem atrás.
        </p>
      </div>
    </div>
    <Link
      to="/sonhos?from=eco_ia_dream"
      className="rl-link-forte"
      onClick={() => {
        try {
          mixpanel.track('Landing · Dream CTA clicado', { section: 'eco_ia_dream', from: 'eco_ia_dream' });
        } catch {
          // medir nunca quebra a página
        }
      }}
    >
      Interpretar um sonho
    </Link>
  </section>
);

const ECO_IA: LandingConfig = {
  pagina: 'eco_ia',
  from: 'eco_ia',
  plano: 'annual',
  mood: 'entardecer',
  imagem: { src: '/images/reino/casa.webp', foco: '15% 50%' },
  rotulo: 'ECO.01 · Casa da Eco',
  titulo: 'Desabafe a qualquer hora.',
  sobre:
    'A Eco escuta sem julgamento, ajuda você a organizar a cabeça e indica a prática certa para agora: ansiedade, sono ou um dia que pesou.',
  destaques: [
    'Fale ou escreva: a Eco entende os dois.',
    'Ela lembra do que vocês já conversaram.',
    'No meio da conversa, indica uma meditação ou prática.',
  ],
  dentro: {
    rotulo: 'Como a Eco ajuda',
    titulo: 'Não é só desabafar. É sair melhor.',
    itens: [
      {
        titulo: 'Organize os pensamentos',
        texto: 'Trabalho, casa, uma noite sem dormir: a Eco ajuda a colocar em palavras o que você sente e seguir com mais clareza.',
      },
      {
        titulo: 'Receba a prática certa',
        texto: 'Ela entende o momento e sugere uma meditação, uma respiração ou uma leitura para agora.',
      },
      {
        titulo: 'Retome de onde parou',
        texto: 'A Eco guarda os temas que importam. Você não precisa contar tudo de novo a cada conversa.',
      },
    ],
  },
  passos: {
    titulo: 'Como funciona',
    itens: [
      { titulo: 'Fale ou escreva', texto: 'Mande um áudio ou digite. A Eco responde na hora.' },
      { titulo: 'Receba o próximo passo', texto: 'Uma prática indicada para o seu momento, dentro do próprio app.' },
      {
        titulo: 'Acompanhe o que muda',
        texto: 'Memória, perfil e relatório emocional mostram os seus temas e padrões ao longo do tempo.',
      },
    ],
  },
  extra: SONHO,
  aviso: (
    <p>
      A Eco não substitui o atendimento humano, não oferece serviços clínicos de saúde mental e não é monitorada em tempo
      real por um profissional. Se precisa de apoio para a saúde mental, converse com um profissional habilitado. Em
      perigo imediato, ligue para o SAMU (192). Se tiver pensamentos suicidas ou de automutilação, ligue para o CVV no 188
      (gratuito, 24 horas) ou acesse{' '}
      <a href="https://www.cvv.org.br" target="_blank" rel="noreferrer">
        cvv.org.br
      </a>
      .
    </p>
  ),
  faq: [
    {
      p: 'O que é a Eco?',
      r: 'Uma companheira de IA para conversar sobre o que você sente, refletir e achar a prática certa para o momento.',
    },
    {
      p: 'A Eco substitui terapia?',
      r: 'Não. É um apoio para o dia a dia: desabafo, autoconhecimento e práticas guiadas. Não substitui acompanhamento psicológico ou médico.',
    },
    {
      p: 'Minhas conversas são privadas?',
      r: 'Suas conversas ficam na sua conta e não são compartilhadas com outras pessoas do app.',
    },
    {
      p: 'O que vem além da Eco?',
      r: 'O plano inclui as meditações guiadas, o Protocolo do Sono, o Diário Estoico, os 5 Anéis da Disciplina e a leitura de sonhos.',
    },
    {
      p: 'Vou ser cobrado antes dos 7 dias?',
      r: 'Não. O cartão é pedido no cadastro, mas a primeira cobrança só acontece depois dos 7 dias. Se cancelar antes, não paga nada.',
    },
  ],
  fechamento: {
    titulo: 'Tem algo pesando hoje? Comece por aí.',
    sobre: 'Sete dias para conversar com a Eco e conhecer tudo o que tem no Ecotopia.',
  },
};

export default function EcotopiaEcoIAPage() {
  return <ReinoLanding config={ECO_IA} />;
}
