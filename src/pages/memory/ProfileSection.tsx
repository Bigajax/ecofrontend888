import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlifoEco } from '@/components/reino/ReinoGlifos';
import { useCasaDaMemoria } from './casaDaMemoria';
import { nomeDoTema } from '@/api/emocional';

/**
 * Perfil emocional, "o espelho": o retrato que a IA escreve a partir das
 * memórias chega como uma carta da Eco, assinada, com a data em que foi
 * escrita (refeita no máximo uma vez por dia). Embaixo, o que mais aparece,
 * com as contagens do servidor. Aberto para toda conta.
 */

function Pinceladas({ titulo, freq }: { titulo: string; freq: Record<string, number> }) {
  const itens = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  if (!itens.length) return null;
  const max = itens[0][1];
  return (
    <section className="reino-espelho__bloco" aria-label={titulo}>
      <h2 className="reino-casa__mes-nome">{titulo}</h2>
      <ul className="reino-espelho__pinceladas">
        {itens.map(([nome, vezes]) => (
          <li key={nome}>
            <span className="reino-espelho__nome">{nomeDoTema(nome)}</span>
            <span className="reino-espelho__traco" style={{ '--v': `${(vezes / max) * 100}%` } as CSSProperties} />
            <span className="reino-espelho__vezes">{vezes === 1 ? '1 vez' : `${vezes} vezes`}</span>
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
        <p className="reino-casa__vazio-titulo">
          {totalGuardadas === 0 ? 'O espelho ainda está embaçado.' : 'A Eco está escrevendo.'}
        </p>
        <p>
          {totalGuardadas === 0
            ? 'Quando uma conversa marcar, a Eco guarda e, com o tempo, escreve aqui uma carta curta sobre o que vê em você.'
            : 'As suas memórias já estão guardadas. Volte daqui a pouco para ler a carta.'}
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
    <section aria-label="Perfil emocional">
      <article className="reino-carta reino-rasgo-b">
        <p className="reino-carta__cabeca">Uma carta da Eco{quando ? `, ${quando}` : ''}</p>
        <p className="reino-carta__texto">{retrato.resumo_geral_ia}</p>
        <p className="reino-carta__assinatura">
          <GlifoEco ativo className="reino-carta__glifo" />
          Eco
        </p>
      </article>
      <p className="reino-espelho__nota">Escrita a partir das conversas que marcaram. Muda conforme você conta mais.</p>

      <div className="reino-espelho__colunas">
        <Pinceladas titulo="O que você mais sente" freq={retrato.emocoes_frequentes} />
        <Pinceladas titulo="Onde isso acontece" freq={retrato.temas_recorrentes} />
      </div>
    </section>
  );
}
