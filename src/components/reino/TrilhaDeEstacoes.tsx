import type { ReactNode } from 'react';
import './reino.css';

export interface Estacao {
  id: string;
  titulo: string;
  sub?: string;
  meta: string;
  estado: 'feita' | 'agora' | 'fechada' | 'livre';
  /** o que vai dentro do selo: um ícone, ou nada (usa o número) */
  marca?: ReactNode;
  /** pintura no lugar do selo (ex.: a capa da sessão) */
  imagem?: string;
}

interface TrilhaDeEstacoesProps {
  estacoes: Estacao[];
  onEscolher: (id: string) => void;
  rotulo: string;
}

/**
 * A trilha (set/2026): as etapas de um programa como pedras de um caminho,
 * ligadas por uma linha pontilhada que vai sendo pintada até onde a pessoa
 * chegou. A de agora ganha o ocre e "você está aqui"; as feitas, o anil; as
 * fechadas ficam em espera. No celular a trilha desce na vertical.
 */
export default function TrilhaDeEstacoes({ estacoes, onEscolher, rotulo }: TrilhaDeEstacoesProps) {
  const feitas = estacoes.filter((e) => e.estado === 'feita').length;
  const agora = estacoes.findIndex((e) => e.estado === 'agora');
  // Até onde o caminho está pintado: o centro da última pedra feita, ou da de agora.
  const ate = agora >= 0 ? agora : Math.max(0, feitas - 1);
  const pintado = estacoes.length > 1 ? ate / (estacoes.length - 1) : 0;

  return (
    <ol
      className="reino-trilha"
      aria-label={rotulo}
      style={{ ['--trilha-n' as string]: estacoes.length, ['--trilha-pintado' as string]: pintado }}
    >
      {estacoes.map((e, i) => (
        <li key={e.id} className={`reino-trilha__estacao is-${e.estado}`}>
          <button
            type="button"
            className="reino-trilha__botao"
            onClick={() => onEscolher(e.id)}
            aria-current={e.estado === 'agora' ? 'step' : undefined}
          >
            <span className={`reino-trilha__selo${e.imagem ? ' tem-imagem' : ''}`} aria-hidden="true">
              {e.imagem ? <img src={e.imagem} alt="" loading="lazy" /> : (e.marca ?? String(i + 1).padStart(2, '0'))}
            </span>
            <span className="reino-trilha__texto">
              {e.estado === 'agora' && <span className="reino-trilha__aqui">você está aqui</span>}
              <span className="reino-trilha__titulo">{e.titulo}</span>
              {e.sub && <span className="reino-trilha__sub">{e.sub}</span>}
              <span className="reino-trilha__meta">{e.meta}</span>
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}
