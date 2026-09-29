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
    <p className="reino-rotulo">Lago dos Sonhos</p>
    <h2 id="rl-sonho" className="rl-titulo">
      O que o seu sonho está tentando dizer?
    </h2>
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
  rotulo: 'Casa da Eco',
  titulo: 'Desabafe a qualquer hora.',
  sobre: 'A Eco escuta sem julgar e ajuda a organizar a cabeça.',
  dentro: {
    titulo: 'Não é só desabafar. É sair melhor.',
    itens: [
      { titulo: 'Fale ou escreva', texto: 'Por áudio ou texto, a qualquer hora.' },
      { titulo: 'Ela lembra', texto: 'Não precisa contar tudo de novo.' },
      { titulo: 'Indica uma prática', texto: 'Uma meditação ou respiração para agora.' },
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
      p: 'A Eco substitui terapia?',
      r: 'Não. É um apoio para o dia a dia, não um tratamento.',
    },
    {
      p: 'Minhas conversas são privadas?',
      r: 'Ficam na sua conta e ninguém do app vê.',
    },
    {
      p: 'O que mais vem no plano?',
      r: 'Tudo o que tem no Ecotopia: sono, meditações, Diário Estoico, 5 Anéis e leitura de sonhos.',
    },
    {
      p: 'Vou ser cobrado nos 7 dias?',
      r: 'Não. A primeira cobrança só vem depois. Cancelou antes, não paga nada.',
    },
  ],
  fechamento: {
    titulo: 'Tem algo pesando hoje? Comece por aí.',
  },
};

export default function EcotopiaEcoIAPage() {
  return <ReinoLanding config={ECO_IA} />;
}
