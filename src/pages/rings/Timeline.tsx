import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRings } from '@/contexts/RingsContext';
import { RINGS } from '@/constants/rings';
import { ORDEM_DOS_ANEIS } from '@/constants/ringsJornada';
import { getTodayDate, parseLocalDate, diasEntre } from '@/utils/dataLocal';
import HomeHeader from '@/components/home/HomeHeader';
import ReinoChegada from '@/components/reino/ReinoChegada';
import '@/components/reino/reino.css';
import type { RingType } from '@/types/rings';

type Filtro = 'todos' | RingType;

const NOME_CURTO: Record<RingType, string> = {
  earth: 'Terra',
  water: 'Água',
  fire: 'Fogo',
  wind: 'Vento',
  void: 'Vazio',
};

function quando(data: string): string {
  const dias = diasEntre(getTodayDate(), data);
  if (dias === 0) return 'hoje';
  if (dias === 1) return 'ontem';
  return parseLocalDate(data).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
}

/**
 * Tudo o que a pessoa escreveu nos Cinco Anéis (set/2026), no molde das outras
 * páginas do reino: a pintura na chegada e a lista de dias, do mais recente
 * para o mais antigo. Cada linha traz o dia da jornada, a pergunta que valia
 * naquele dia, a resposta e o passo de amanhã. Antes: cartões de vidro com
 * "Foco: n/a" e a pergunta genérica do anel no lugar da do dia.
 */
export default function Timeline() {
  const navigate = useNavigate();
  const { allRituals } = useRings();
  const [filtro, setFiltro] = useState<Filtro>('todos');

  const linhas = useMemo(
    () =>
      allRituals
        .filter((r) => r.status === 'completed')
        .sort((a, b) => b.date.localeCompare(a.date))
        .flatMap((r) =>
          r.answers
            .filter((a) => a.answer?.trim() && (filtro === 'todos' || a.ringId === filtro))
            .map((a) => ({ data: r.date, resposta: a, chave: `${r.id}-${a.ringId}` }))
        ),
    [allRituals, filtro]
  );

  return (
    <div className="reino-corpo page-with-nav" style={{ minHeight: '100dvh' }}>
      <HomeHeader />
      <main>
        <ReinoChegada
          mood="amanhecer"
          imagem="/images/reino/capa-cinco-aneis.webp"
          foco="center 60%"
          lugar="As Trilhas · Cinco Anéis"
          titulo="Tudo o que você escreveu"
          sobre="Cada dia do caminho, com a pergunta daquele dia e a sua resposta."
          voltar={{ rotulo: 'Voltar aos Cinco Anéis', onClick: () => navigate('/app/rings') }}
        />

        <div className="reino-pagina">
          <div className="reino-filtros" role="group" aria-label="Filtrar por anel">
            {(['todos', ...ORDEM_DOS_ANEIS] as Filtro[]).map((f) => (
              <button
                key={f}
                type="button"
                className="reino-filtro"
                aria-pressed={filtro === f}
                onClick={() => setFiltro(f)}
              >
                {f === 'todos' ? 'Todos' : NOME_CURTO[f]}
              </button>
            ))}
          </div>

          {linhas.length === 0 ? (
            <div className="reino-nota">
              <p>{filtro === 'todos' ? 'Nada escrito ainda. O primeiro dia leva poucos minutos.' : 'Nada escrito neste anel ainda.'}</p>
              <button type="button" className="reino-placa" onClick={() => navigate('/app/rings/ritual')}>
                Escrever o dia de hoje <span aria-hidden="true">→</span>
              </button>
            </div>
          ) : (
            <>
              <p className="reino-rotulo">Os dias escritos</p>
              <ol className="reino-sumario reino-sessoes">
                {linhas.map(({ data, resposta: a, chave }) => {
                  const dia = typeof a.metadata?.dia === 'number' ? (a.metadata.dia as number) : null;
                  return (
                    <li key={chave}>
                      <div className="reino-sessao reino-sessao--leitura">
                        <span className="reino-sumario__n">{dia ? String(dia).padStart(2, '0') : ''}</span>
                        <span className="reino-sessao__texto">
                          <span className="reino-sumario__t">{a.metadata?.pergunta || RINGS[a.ringId]?.question}</span>
                          <span className="reino-sessao__resposta">{a.answer}</span>
                          {a.metadata?.fechamento && (
                            <span className="reino-sessao__descricao">Passo de amanhã: {a.metadata.fechamento}</span>
                          )}
                        </span>
                        <span className="reino-sumario__m">
                          {quando(data)} · {NOME_CURTO[a.ringId]}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
