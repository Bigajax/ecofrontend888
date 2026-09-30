import { useNavigate } from 'react-router-dom';
import CasaDaEco from '@/components/reino/CasaDaEco';

/**
 * Memórias para quem ainda não tem conta (set/2026), na mesma Casa da Eco.
 * Visitante conversa, mas nada fica guardado; com a conta grátis, o que pesa
 * vira memória e carta. Antes: gráficos de mentira com cadeado, emoji e a
 * promessa de recurso pago como "sempre gratuito".
 */
export default function MemoryPageGuestTeaser() {
  const navigate = useNavigate();
  return (
    <CasaDaEco
      comodo="o que ficou"
      titulo="Memórias"
      sobre="Das conversas que pesaram, a Eco guarda o essencial. Só você lê."
      foco="30% 55%"
      isGuest
    >
      <section className="reino-casa__vazio">
        <p className="reino-casa__vazio-titulo">Sem conta, a conversa acontece, mas nada fica guardado.</p>
        <p>
          Com a conta grátis, cada conversa que pesa vira um bilhete no caderno, e com o tempo a Eco escreve uma carta
          sobre o que vê em você. O céu dos seus dias, dia a dia, vem com a assinatura.
        </p>
        <button
          type="button"
          className="reino-placa"
          onClick={() => navigate(`/register?returnTo=${encodeURIComponent('/app/memory')}`)}
        >
          Criar conta grátis <span aria-hidden="true">→</span>
        </button>
      </section>
    </CasaDaEco>
  );
}
