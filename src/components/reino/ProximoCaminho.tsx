import { useNavigate } from 'react-router-dom';
import mixpanel from '@/lib/mixpanel';
import './reino.css';

/**
 * A ordem dos programas (set/2026): quem termina um recebe o convite para o
 * seguinte. É a parte da progressão que diz "para evoluir, o próximo passo é
 * este", em vez de cada programa acabar num beco.
 */
export const SEQUENCIA_DE_PROGRAMAS = [
  { id: 'intro', nome: 'Primeiros passos', rota: '/app/introducao-meditacao', sobre: 'Cinco sessões para aprender a parar.' },
  { id: 'sono', nome: 'Protocolo do Sono', rota: '/app/meditacoes-sono', sobre: 'Sete noites para a mente desligar.' },
  { id: 'drjoe', nome: 'Desperte seu potencial', rota: '/app/dr-joe-dispenza', sobre: 'Cinco meditações para sair do piloto automático.' },
  { id: 'aneis', nome: 'Cinco Anéis da Disciplina', rota: '/app/rings', sobre: 'Trinta dias, um anel de cada vez.' },
  { id: 'riqueza', nome: 'Riqueza Mental', rota: '/app/riqueza-mental', sobre: 'Seis passos escritos, no seu ritmo.' },
] as const;

export type ProgramaDaSequencia = (typeof SEQUENCIA_DE_PROGRAMAS)[number]['id'];

export default function ProximoCaminho({ atual }: { atual: ProgramaDaSequencia }) {
  const navigate = useNavigate();
  const i = SEQUENCIA_DE_PROGRAMAS.findIndex((p) => p.id === atual);
  const proximo = SEQUENCIA_DE_PROGRAMAS[i + 1];

  return (
    <div className="reino-proximo">
      <p className="reino-rotulo">O próximo caminho</p>
      {proximo ? (
        <>
          <p className="reino-proximo__nome">{proximo.nome}</p>
          <p className="reino-proximo__sobre">{proximo.sobre}</p>
          <button
            type="button"
            className="reino-placa"
            onClick={() => {
              try {
                mixpanel.track('Caminho · Próximo programa aberto', { de: atual, para: proximo.id });
              } catch {
                // medir nunca quebra a tela
              }
              navigate(proximo.rota);
            }}
          >
            Seguir para {proximo.nome} <span aria-hidden="true">→</span>
          </button>
        </>
      ) : (
        <>
          <p className="reino-proximo__nome">Você percorreu todos os caminhos.</p>
          <p className="reino-proximo__sobre">Qualquer um pode ser percorrido de novo. O mapa mostra tudo o que tem no reino.</p>
          <button type="button" className="reino-placa" onClick={() => navigate('/app/mapa')}>
            Abrir o mapa <span aria-hidden="true">→</span>
          </button>
        </>
      )}
    </div>
  );
}
