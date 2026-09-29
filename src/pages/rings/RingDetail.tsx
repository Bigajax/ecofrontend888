import { useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RINGS } from '@/constants/rings';
import {
  DIAS_POR_ANEL,
  ORDEM_DOS_ANEIS,
  PERGUNTAS,
  diasConcluidos,
  diasDoAnel,
  estadoDoAnel,
  lerInicioDoCiclo,
  pontoDaJornada,
} from '@/constants/ringsJornada';
import { useRings } from '@/contexts/RingsContext';
import { useAuth } from '@/contexts/AuthContext';
import ReinoChegada from '@/components/reino/ReinoChegada';
import HomeHeader from '@/components/home/HomeHeader';
import '@/components/reino/reino.css';
import type { RingType } from '@/types/rings';

/**
 * Um anel da jornada (set/2026), no molde das outras páginas do reino: a
 * pintura na chegada e os seis dias do anel como lista, cada um com a pergunta
 * daquele dia e, se já foi feito, a resposta da pessoa. O dia de hoje leva ao
 * ritual. Antes: um ícone solto, texto fixo e o Selo à parte.
 */
export default function RingDetail() {
  const { ringId } = useParams<{ ringId: string }>();
  const navigate = useNavigate();
  const { allRituals } = useRings();
  const { user } = useAuth();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [ringId]);

  const id = (ORDEM_DOS_ANEIS as string[]).includes(ringId ?? '') ? (ringId as RingType) : null;
  const ponto = useMemo(
    () => pontoDaJornada(diasConcluidos(allRituals).length, lerInicioDoCiclo(user?.id)),
    [allRituals, user?.id]
  );

  if (!id) {
    return (
      <div className="reino-corpo page-with-nav" style={{ minHeight: '100dvh' }}>
        <HomeHeader />
        <div className="reino-pagina">
          <p>Este anel não existe.</p>
          <button type="button" className="reino-placa" onClick={() => navigate('/app/rings')}>
            Voltar aos Cinco Anéis <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    );
  }

  const ring = RINGS[id];
  const [de, ate] = diasDoAnel(id);
  const estado = estadoDoAnel(id, ponto);
  const i = ORDEM_DOS_ANEIS.indexOf(id);
  const anterior = ORDEM_DOS_ANEIS[i - 1];
  const proximo = ORDEM_DOS_ANEIS[i + 1];

  const respostaDoDia = (dia: number) =>
    allRituals
      .filter((r) => r.status === 'completed')
      .flatMap((r) => r.answers)
      .find((a) => a.ringId === id && a.metadata?.dia === dia);

  const legenda =
    estado === 'feito'
      ? 'Anel atravessado. Seis de seis dias.'
      : estado === 'agora'
        ? `Dia ${ponto.diaNoAnel} de 6 neste anel.`
        : `Abre no dia ${de} do caminho.`;

  return (
    <div className="reino-corpo page-with-nav" style={{ minHeight: '100dvh' }}>
      <HomeHeader />
      <main>
        <ReinoChegada
          mood="amanhecer"
          imagem="/images/reino/capa-cinco-aneis.webp"
          foco="center 60%"
          lugar={`Cinco Anéis · Dias ${de} a ${ate}`}
          titulo={ring.titlePt}
          sobre={ring.descriptionPt}
          voltar={{ rotulo: 'Voltar aos Cinco Anéis', onClick: () => navigate('/app/rings') }}
          progresso={{
            valor: estado === 'feito' ? 1 : estado === 'agora' ? (ponto.diaNoAnel - 1) / DIAS_POR_ANEL : 0,
            legenda,
          }}
        >
          {estado === 'agora' && (
            <button type="button" className="reino-placa" onClick={() => navigate('/app/rings/ritual')}>
              Escrever o dia de hoje <span aria-hidden="true">→</span>
            </button>
          )}
        </ReinoChegada>

        <div className="reino-pagina">
          <blockquote className="reino-anel__citacao">{ring.impactPhrase}</blockquote>

          <p className="reino-rotulo">Os seis dias</p>
          <ol className="reino-sumario reino-sessoes">
            {PERGUNTAS[id].map((pergunta, k) => {
              const dia = de + k;
              const resposta = respostaDoDia(dia);
              const hoje = estado === 'agora' && dia === ponto.dia && !resposta;
              const conteudo = (
                <>
                  <span className="reino-sumario__n">{resposta ? '✓' : String(dia).padStart(2, '0')}</span>
                  <span className="reino-sessao__texto">
                    <span className="reino-sumario__t">{pergunta}</span>
                    {resposta && <span className="reino-sessao__resposta">{resposta.answer}</span>}
                    {resposta?.metadata?.fechamento && (
                      <span className="reino-sessao__descricao">Passo de amanhã: {resposta.metadata.fechamento}</span>
                    )}
                  </span>
                  <span className="reino-sumario__m">{resposta ? 'feito' : hoje ? 'hoje' : `dia ${dia}`}</span>
                </>
              );
              return (
                <li key={dia} className={resposta ? 'is-feita' : hoje ? 'is-proxima' : 'is-trancada'}>
                  {hoje ? (
                    <button type="button" className="reino-sessao" onClick={() => navigate('/app/rings/ritual')}>
                      {conteudo}
                    </button>
                  ) : (
                    <div className="reino-sessao reino-sessao--leitura">{conteudo}</div>
                  )}
                </li>
              );
            })}
          </ol>

          <nav className="reino-anel__nav" aria-label="Outros anéis">
            {anterior ? (
              <button type="button" className="reino-ritual__link" onClick={() => navigate(`/app/rings/detail/${anterior}`)}>
                ← {RINGS[anterior].titlePt}
              </button>
            ) : (
              <span />
            )}
            {proximo && (
              <button type="button" className="reino-ritual__link" onClick={() => navigate(`/app/rings/detail/${proximo}`)}>
                {RINGS[proximo].titlePt} →
              </button>
            )}
          </nav>
        </div>
      </main>
    </div>
  );
}
