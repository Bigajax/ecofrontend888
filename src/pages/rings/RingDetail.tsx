import { useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RINGS } from '@/constants/rings';
import {
  ORDEM_DOS_ANEIS,
  diasConcluidos,
  diasDoAnel,
  estadoDoAnel,
  lerInicioDoCiclo,
  pontoDaJornada,
} from '@/constants/ringsJornada';
import { useRings } from '@/contexts/RingsContext';
import { useAuth } from '@/contexts/AuthContext';
import RingIcon from '@/components/rings/RingIcon';
import SeloDoAnel from '@/components/rings/SeloDoAnel';
import HomeHeader from '@/components/home/HomeHeader';
import '@/components/reino/reino.css';
import type { RingType } from '@/types/rings';

/**
 * Um anel da jornada (set/2026): o que ele pede, em que dias ele vem e, se já
 * foi atravessado, o Selo com as palavras da pessoa. Antes: texto fixo e um
 * "Por que importa" genérico, igual para os cinco.
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

  return (
    <div className="reino-corpo page-with-nav" style={{ minHeight: '100dvh' }}>
      <HomeHeader />
      <div className="reino-pagina reino-anel">
        <button type="button" className="reino-chegada__voltar" onClick={() => navigate('/app/rings')}>
          <span aria-hidden="true">←</span> Os Cinco Anéis
        </button>

        <div className="reino-anel__topo">
          <RingIcon ringId={id} size={64} />
          <div>
            <p className="reino-rotulo">
              Dias {de} a {ate} ·{' '}
              {estado === 'feito' ? 'atravessado' : estado === 'agora' ? `você está aqui, dia ${ponto.diaNoAnel} de 6` : 'ainda fechado'}
            </p>
            <h1 className="reino-corpo__titulo">{ring.titlePt}</h1>
            <p className="reino-anel__sub">{ring.subtitlePt}</p>
          </div>
        </div>

        <p className="reino-anel__texto">{ring.descriptionPt}</p>
        <blockquote className="reino-ritual__abertura">
          <p>{ring.impactPhrase}</p>
        </blockquote>

        {estado === 'fechado' ? (
          <p className="reino-anel__texto">Este anel abre no dia {de} do caminho. As perguntas dele chegam uma por dia.</p>
        ) : (
          <SeloDoAnel anel={id} rituais={allRituals} />
        )}

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
    </div>
  );
}
