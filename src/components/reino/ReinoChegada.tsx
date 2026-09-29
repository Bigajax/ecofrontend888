import type { ReactNode } from 'react';
import { PincelProgresso } from './ReinoScene';
import type { ReinoMood } from './reinoMood';
import './reino.css';

/**
 * A chegada numa página interna: a pintura do lugar com borda rasgada, o código
 * do lugar, o título e a ação principal. Toda página de conteúdo abre assim,
 * para parecer continuação do reino e não uma tela solta.
 */
interface ReinoChegadaProps {
  mood: ReinoMood;
  imagem: string;
  /** object-position da pintura */
  foco?: string;
  /** ex.: "TRI.04 · As Trilhas" */
  lugar: string;
  titulo: string;
  sobre?: ReactNode;
  /** texto do link de volta (ex.: "Voltar para Hoje") */
  voltar?: { rotulo: string; onClick: () => void };
  /** a placa de caminho e o que mais vier logo abaixo do título */
  children?: ReactNode;
  /** progresso de 0 a 1, com legenda em mono */
  progresso?: { valor: number; legenda: string };
  /** algo no canto de cima, como "Criar conta grátis" para convidado */
  extra?: ReactNode;
}

export default function ReinoChegada({
  mood,
  imagem,
  foco = 'center',
  lugar,
  titulo,
  sobre,
  voltar,
  children,
  progresso,
  extra,
}: ReinoChegadaProps) {
  return (
    <section className="reino-hero reino-chegada" data-mood={mood} aria-labelledby="reino-chegada-titulo">
      <div className="reino-hero__grade">
        <div className="reino-hero__cena reino-rasgo-a">
          <img src={imagem} alt="" decoding="async" {...{ fetchpriority: 'high' }} style={{ objectFit: 'cover', objectPosition: foco }} />
        </div>

        <div className="reino-hero__texto">
          <div className="reino-chegada__topo">
            {voltar && (
              <button type="button" className="reino-chegada__voltar" onClick={voltar.onClick}>
                <span aria-hidden="true">←</span> {voltar.rotulo}
              </button>
            )}
            {extra}
          </div>
          <p className="reino-rotulo">{lugar}</p>
          <h1 id="reino-chegada-titulo" className="reino-hero__ola">
            {titulo}
          </h1>
          {sobre && <p className="reino-hero__pergunta">{sobre}</p>}
          {children}
          {progresso && (
            <div className="reino-chegada__progresso">
              <PincelProgresso value={progresso.valor} className="reino-sono__pincel" />
              <p className="reino-sono__contagem">{progresso.legenda}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export interface ReinoSessao {
  id: string;
  titulo: string;
  descricao?: string;
  meta: string;
  estado?: 'feita' | 'proxima' | 'trancada' | 'livre';
}

/** A lista de sessões de um programa, como sumário de livro. */
export function ReinoSessoes({
  sessoes,
  onEscolher,
  depoisDe,
}: {
  sessoes: ReinoSessao[];
  onEscolher: (id: string) => void;
  /** conteúdo intercalado depois de um índice (ex.: convite após a 1ª sessão) */
  depoisDe?: { indice: number; conteudo: ReactNode };
}) {
  return (
    <ol className="reino-sumario reino-sessoes">
      {sessoes.map((s, i) => (
        <li key={s.id} className={s.estado ? `is-${s.estado}` : undefined}>
          <button type="button" className="reino-sessao" onClick={() => onEscolher(s.id)}>
            <span className="reino-sumario__n">{s.estado === 'feita' ? '✓' : String(i + 1).padStart(2, '0')}</span>
            <span className="reino-sessao__texto">
              <span className="reino-sumario__t">{s.titulo}</span>
              {s.descricao && <span className="reino-sessao__descricao">{s.descricao}</span>}
            </span>
            <span className="reino-sumario__m">{s.meta}</span>
          </button>
          {depoisDe && depoisDe.indice === i && <div className="reino-sessoes__entre">{depoisDe.conteudo}</div>}
        </li>
      ))}
    </ol>
  );
}
