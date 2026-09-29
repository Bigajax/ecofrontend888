import { useMemo, useState } from 'react';
import type { ProgramProgressData } from '@/hooks/useProgramProgress';
import { PincelProgresso } from '@/components/reino/ReinoScene';
import { OFFER } from '@/constants/offerCopy';
import '@/components/reino/reino.css';

export interface Jornada {
  id: string;
  title: string;
  description: string;
  duration: string;
  image: string; // no formato url("...") herdado da home antiga
  imagePosition?: string;
  isPremium: boolean;
  category: string;
  progress?: number;
}

export interface Leitura {
  id: string;
  title: string;
  description: string;
  /** ex.: "leitura de 2 min" */
  leitura?: string;
}

interface HomeReinoCorpoProps {
  emAndamento: ProgramProgressData[];
  onContinuar: (programId: ProgramProgressData['programId']) => void;
  jornadas: Jornada[];
  onJornada: (id: string) => void;
  percursoProgress: Record<
    string,
    { progress: number; completedSessions?: number; totalSessions?: number; status?: ProgramProgressData['status'] }
  >;
  onPercurso: (id: string) => void;
  leituras: Leitura[];
  onLeitura: (id: string) => void;
  /** null esconde o convite (quem já assina) */
  onAssinar: (() => void) | null;
}

const TITULO_PROGRAMA: Record<ProgramProgressData['programId'], string> = {
  intro: 'Introdução à Meditação',
  caleidoscopio: 'Caleidoscópio Mind Movie',
  riqueza: 'Quem Pensa Enriquece',
  sono_protocol: 'Ritual Boa Noite',
  drjoe: 'Desperte seu potencial interior',
};

// Os programas de vários dias. Não é uma sequência (sem numeração), e o Diário Estoico
// não entra aqui: ele já é a Reflexão do dia no topo e no índice.
const PERCURSOS = [
  {
    id: 'prog_rings',
    titulo: '5 Anéis da Disciplina',
    sobre: '5 perguntas rápidas por dia para treinar a disciplina.',
    imagem: '/images/reino/capa-cinco-aneis.webp',
  },
  {
    id: 'prog_riqueza',
    titulo: 'Quem Pensa Enriquece',
    sobre: '6 passos para mudar sua relação com o dinheiro.',
    imagem: '/images/reino/capa-quem-pensa.webp',
  },
];

const urlDe = (css: string) => css.replace(/^url\("?/, '').replace(/"?\)$/, '');

export default function HomeReinoCorpo({
  emAndamento,
  onContinuar,
  jornadas,
  onJornada,
  percursoProgress,
  onPercurso,
  leituras,
  onLeitura,
  onAssinar,
}: HomeReinoCorpoProps) {
  const [categoria, setCategoria] = useState('Todas');
  const categorias = useMemo(
    () => ['Todas', ...Array.from(new Set(jornadas.map((j) => j.category)))],
    [jornadas],
  );
  const visiveis = categoria === 'Todas' ? jornadas : jornadas.filter((j) => j.category === categoria);

  return (
    <div className="reino-corpo">
      <div className="reino-corpo__coluna">
        {emAndamento.length > 0 && (
          <section className="reino-corpo__secao" aria-labelledby="reino-andamento">
            <p className="reino-rotulo">Deixados no meio do caminho</p>
            <h2 id="reino-andamento" className="reino-corpo__titulo">Em andamento</h2>
            <ul className="reino-andamento">
              {emAndamento.map((p) => (
                <li key={p.programId}>
                  <button type="button" className="reino-etiqueta" onClick={() => onContinuar(p.programId)}>
                    <span className="reino-etiqueta__nome">{TITULO_PROGRAMA[p.programId]}</span>
                    <span className="reino-etiqueta__meta">
                      {p.completedSessions} de {p.totalSessions} {p.isInactive ? '· parado há alguns dias' : ''}
                    </span>
                    <PincelProgresso value={p.progress / 100} className="reino-etiqueta__pincel" />
                    <span className="reino-etiqueta__acao">Continuar →</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="reino-corpo__secao" aria-labelledby="reino-trilhas">
          <p className="reino-rotulo">TRI.04 / jornadas</p>
          <h2 id="reino-trilhas" className="reino-corpo__titulo">As Trilhas</h2>
          <p className="reino-corpo__sobre">De onde você está para onde quer chegar.</p>

          <div className="reino-filtros" role="group" aria-label="Filtrar jornadas">
            {categorias.map((c) => (
              <button
                key={c}
                type="button"
                className="reino-filtro"
                aria-pressed={categoria === c}
                onClick={() => setCategoria(c)}
              >
                {c}
              </button>
            ))}
          </div>

          <ul className="reino-estante">
            {visiveis.map((j, i) => (
              <li key={j.id}>
                <button type="button" className="reino-capa" onClick={() => onJornada(j.id)}>
                  <img
                    src={urlDe(j.image)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className={i % 2 ? 'reino-rasgo-b' : 'reino-rasgo-a'}
                    style={{ objectPosition: j.imagePosition || 'center' }}
                  />
                  <span className="reino-capa__meta">
                    {j.category} · {j.duration}
                    {j.isPremium ? ' · assinantes' : ''}
                  </span>
                  <span className="reino-capa__titulo">{j.title}</span>
                  {!!j.progress && j.progress > 0 && (
                    <PincelProgresso value={j.progress / 100} className="reino-capa__pincel" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="reino-corpo__secao" aria-labelledby="reino-percursos">
          <p className="reino-rotulo">Percursos longos</p>
          <h2 id="reino-percursos" className="reino-corpo__titulo">Programas</h2>
          <p className="reino-corpo__sobre">Feitos para mudar algo real em você.</p>
          <ul className="reino-programas">
            {PERCURSOS.map((p, i) => {
              const info = percursoProgress[p.id];
              const progresso = info?.progress ?? 0;
              const feitos = info?.completedSessions ?? 0;
              const total = info?.totalSessions;
              // Estado só com o que o app sabe de verdade; sem dado, só "entrar".
              const estado =
                info?.status === 'completed'
                  ? 'concluído'
                  : progresso > 0 && total
                  ? `${feitos} de ${total} feitos`
                  : undefined;
              const acao = info?.status === 'completed' ? 'rever' : progresso > 0 ? 'continuar' : info ? 'começar' : 'entrar';
              return (
                <li key={p.id}>
                  <button type="button" className="reino-programa" onClick={() => onPercurso(p.id)}>
                    <img src={p.imagem} alt="" loading="lazy" className={i % 2 ? 'reino-rasgo-a' : 'reino-rasgo-b'} />
                    <span className="reino-programa__texto">
                      <span className="reino-programa__titulo">{p.titulo}</span>
                      <span className="reino-programa__sobre">{p.sobre}</span>
                      {progresso > 0 && <PincelProgresso value={progresso / 100} className="reino-programa__pincel" />}
                      <span className="reino-programa__pe">
                        {estado && <span className="reino-programa__estado">{estado}</span>}
                        <span className="reino-indice__entrar">{acao}</span>
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {leituras.length > 0 && (
          <section className="reino-corpo__secao" aria-labelledby="reino-biblioteca">
            <p className="reino-rotulo">Para quem quer entender, não só sentir</p>
            <h2 id="reino-biblioteca" className="reino-corpo__titulo">Biblioteca</h2>
            <p className="reino-corpo__sobre">Leituras curtas sobre o sono.</p>
            <ul className="reino-biblioteca">
              {leituras.map((l) => (
                <li key={l.id}>
                  <button type="button" className="reino-livro" onClick={() => onLeitura(l.id)}>
                    <span className="reino-livro__titulo">{l.title}</span>
                    <span className="reino-livro__sobre">{l.description}</span>
                    <span className="reino-livro__pe">
                      {l.leitura && <span className="reino-programa__estado">{l.leitura}</span>}
                      <span className="reino-indice__entrar">ler</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {onAssinar && (
          <section className="reino-corpo__secao reino-convite" aria-labelledby="reino-convite">
            <h2 id="reino-convite" className="reino-corpo__titulo">Você começou uma jornada. Não pare agora.</h2>
            {/* A oferta que existe de verdade no /assinar (fonte única: offerCopy). */}
            <p className="reino-corpo__sobre">
              {OFFER.trial}, depois {OFFER.priceMonthly}. Cancele quando quiser.
            </p>
            <button type="button" className="reino-placa" onClick={onAssinar}>
              Quero continuar <span aria-hidden="true">→</span>
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
