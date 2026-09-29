import { useNavigate } from 'react-router-dom';
import HomeHeader from '@/components/home/HomeHeader';
import ReinoChegada from '@/components/reino/ReinoChegada';
import { getReinoMood } from '@/components/reino/reinoMood';
import '@/components/reino/reino.css';

/**
 * Memórias para quem ainda não tem conta (set/2026): o que é e o que precisa.
 * Visitante não guarda memória; com a conta grátis, as conversas que marcam
 * viram memória e retrato. Antes: gráficos de mentira com cadeado, emoji e a
 * promessa de recurso pago como "sempre gratuito".
 */
export default function MemoryPageGuestTeaser() {
  const navigate = useNavigate();
  return (
    <div className="reino-corpo page-with-nav" style={{ minHeight: '100dvh' }}>
      <HomeHeader />
      <main>
        <ReinoChegada
          mood={getReinoMood()}
          imagem="/images/reino/casa.webp"
          foco="20% 50%"
          lugar="ECO.01 · Casa da Eco"
          titulo="O que a Eco guarda"
          sobre="As conversas que marcam viram memória. Delas sai o seu retrato."
          voltar={{ rotulo: 'Voltar', onClick: () => navigate(-1) }}
        >
          <button
            type="button"
            className="reino-placa"
            onClick={() => navigate(`/register?returnTo=${encodeURIComponent('/app/memory')}`)}
          >
            Criar conta grátis <span aria-hidden="true">→</span>
          </button>
        </ReinoChegada>

        <div className="reino-pagina">
          <ol className="reino-sumario reino-sessoes">
            <li>
              <div className="reino-sessao reino-sessao--leitura">
                <span className="reino-sumario__n">01</span>
                <span className="reino-sessao__texto">
                  <span className="reino-sumario__t">Memórias</span>
                  <span className="reino-sessao__descricao">
                    Quando uma conversa pesa, a Eco guarda o essencial: a emoção, o tema e um resumo. Só você vê.
                  </span>
                </span>
                <span className="reino-sumario__m">conta grátis</span>
              </div>
            </li>
            <li>
              <div className="reino-sessao reino-sessao--leitura">
                <span className="reino-sumario__n">02</span>
                <span className="reino-sessao__texto">
                  <span className="reino-sumario__t">Retrato</span>
                  <span className="reino-sessao__descricao">
                    Em poucas frases, o que a Eco vê em você, e as emoções e temas que mais aparecem.
                  </span>
                </span>
                <span className="reino-sumario__m">conta grátis</span>
              </div>
            </li>
            <li>
              <div className="reino-sessao reino-sessao--leitura">
                <span className="reino-sumario__n">03</span>
                <span className="reino-sessao__texto">
                  <span className="reino-sumario__t">Relatório</span>
                  <span className="reino-sessao__descricao">
                    Como foram os seus dias: quais foram mais leves, quais pesaram, o que mais voltou.
                  </span>
                </span>
                <span className="reino-sumario__m">assinatura</span>
              </div>
            </li>
          </ol>
          <p className="reino-casa__carregando" style={{ marginTop: 20 }}>
            Sem conta, a conversa acontece, mas nada fica guardado.
          </p>
        </div>
      </main>
    </div>
  );
}
