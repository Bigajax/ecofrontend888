import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCasaDaMemoria } from './MemoryLayout';
import { nomeDoTema } from '@/api/emocional';

/**
 * Retrato: o texto que a IA escreve a partir das memórias (refeito no máximo
 * uma vez por dia) e o que mais aparece nelas, com as contagens do servidor.
 * Aberto para toda conta. Antes: gráficos calculados no aparelho, com rótulos
 * escondidos, e o retrato quase sempre vazio.
 */

function Barras({ titulo, freq }: { titulo: string; freq: Record<string, number> }) {
  const itens = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  if (!itens.length) return null;
  const max = itens[0][1];
  return (
    <section className="reino-retrato__bloco" aria-label={titulo}>
      <p className="reino-rotulo">{titulo}</p>
      <ul className="reino-retrato__barras">
        {itens.map(([nome, vezes]) => (
          <li key={nome}>
            <span className="reino-retrato__nome">{nomeDoTema(nome)}</span>
            <span className="reino-retrato__traco" style={{ '--v': `${(vezes / max) * 100}%` } as CSSProperties} />
            <span className="reino-retrato__vezes">{vezes === 1 ? '1 vez' : `${vezes} vezes`}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function ProfileSection() {
  const navigate = useNavigate();
  const { retrato, totalGuardadas } = useCasaDaMemoria();

  if (!retrato || !retrato.resumo_geral_ia) {
    return (
      <section className="reino-casa__vazio">
        <h2 className="reino-corpo__titulo">
          {totalGuardadas === 0 ? 'O retrato começa na primeira memória.' : 'O retrato está sendo escrito.'}
        </h2>
        <p>
          {totalGuardadas === 0
            ? 'Quando uma conversa marcar, a Eco guarda e escreve aqui, em poucas frases, o que ela vê em você.'
            : 'As suas memórias já estão guardadas. Volte daqui a pouco para ler o que a Eco escreveu.'}
        </p>
        {totalGuardadas === 0 && (
          <button type="button" className="reino-placa" onClick={() => navigate('/app/chat')}>
            Conversar com a Eco <span aria-hidden="true">→</span>
          </button>
        )}
      </section>
    );
  }

  const quando = retrato.updated_at
    ? new Date(retrato.updated_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })
    : null;

  return (
    <section aria-label="Retrato">
      <blockquote className="reino-retrato__texto">{retrato.resumo_geral_ia}</blockquote>
      <p className="reino-retrato__assinatura">
        Escrito pela Eco{quando ? ` em ${quando}` : ''}, a partir das conversas que marcaram.
      </p>

      <Barras titulo="Emoções que mais aparecem" freq={retrato.emocoes_frequentes} />
      <Barras titulo="Temas que mais aparecem" freq={retrato.temas_recorrentes} />
    </section>
  );
}
