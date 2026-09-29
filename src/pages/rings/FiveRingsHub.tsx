import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRings } from '@/contexts/RingsContext';
import { useAuth } from '@/contexts/AuthContext';
import { RINGS } from '@/constants/rings';
import {
  DIAS_DA_JORNADA,
  ORDEM_DOS_ANEIS,
  comecarNovoCiclo,
  diasConcluidos,
  diasDoAnel,
  estadoDoAnel,
  lerInicioDoCiclo,
  pontoDaJornada,
} from '@/constants/ringsJornada';
import HomeHeader from '@/components/home/HomeHeader';
import ReinoChegada, { ReinoSessoes, type ReinoSessao } from '@/components/reino/ReinoChegada';

/**
 * Os Cinco Anéis como caminho de 30 dias (set/2026): "Dia 8 de 30 · Anel da
 * Água" na chegada, os cinco anéis como etapas (atravessado, o de agora,
 * fechado) e o Selo de cada anel já atravessado. Antes: as mesmas 5 perguntas
 * todo dia, sem saber onde se estava nem para onde ia.
 */
export default function FiveRingsHub() {
  const navigate = useNavigate();
  const { currentRitual, allRituals } = useRings();
  const { user, isGuestMode, isVipUser } = useAuth();
  const uid = user?.id ?? null;
  const isGuest = isGuestMode && !user && !isVipUser;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const total = useMemo(() => diasConcluidos(allRituals).length, [allRituals]);
  const inicio = lerInicioDoCiclo(uid);
  const hojeFeito = currentRitual?.status === 'completed';
  const ponto = pontoDaJornada(total, inicio);
  const anelAgora = RINGS[ponto.anel];

  const legenda = ponto.completo
    ? `${DIAS_DA_JORNADA} de ${DIAS_DA_JORNADA} dias · os cinco anéis`
    : `Dia ${ponto.dia} de ${DIAS_DA_JORNADA} · ${anelAgora.titlePt}`;

  const etapas: ReinoSessao[] = ORDEM_DOS_ANEIS.map((id) => {
    const ring = RINGS[id];
    const [de, ate] = diasDoAnel(id);
    const estado = estadoDoAnel(id, ponto);
    return {
      id,
      titulo: ring.titlePt,
      descricao: ring.subtitlePt,
      meta:
        estado === 'feito'
          ? 'atravessado'
          : estado === 'agora'
            ? `agora · dia ${ponto.diaNoAnel} de 6`
            : `dias ${de} a ${ate}`,
      estado: estado === 'feito' ? 'feita' : estado === 'agora' ? 'proxima' : 'trancada',
      detalhe: <p>{ring.descriptionPt}</p>,
    };
  });

  const convidadoTravado = isGuest && total >= 1;

  return (
    <div className="reino-corpo page-with-nav" style={{ minHeight: '100dvh' }}>
      <HomeHeader />

      <ReinoChegada
        mood="amanhecer"
        imagem="/images/reino/capa-cinco-aneis.webp"
        foco="center 60%"
        lugar="As Trilhas · Miyamoto Musashi"
        titulo="Cinco Anéis da Disciplina"
        sobre="Trinta dias, um anel de cada vez. Duas perguntas por dia, poucos minutos."
        voltar={{ rotulo: 'Voltar para Hoje', onClick: () => navigate('/app') }}
        progresso={{ valor: ponto.feitos / DIAS_DA_JORNADA, legenda }}
      >
        {ponto.completo ? (
          <>
            <p className="reino-nota" style={{ marginTop: 18 }}>
              Você atravessou os cinco anéis.
            </p>
            <button
              type="button"
              className="reino-placa"
              onClick={() => {
                comecarNovoCiclo(uid, total);
                navigate(0);
              }}
            >
              Percorrer de novo <span aria-hidden="true">→</span>
            </button>
          </>
        ) : convidadoTravado ? (
          <button
            type="button"
            className="reino-placa"
            onClick={() => navigate('/assinar?step=signup&plan=monthly&from=aneis_hub')}
          >
            Criar conta e seguir para o dia 2 <span aria-hidden="true">→</span>
          </button>
        ) : hojeFeito ? (
          <p className="reino-nota" style={{ marginTop: 18 }}>
            Dia {ponto.feitos} feito. O dia {ponto.dia} abre amanhã.
          </p>
        ) : (
          <button type="button" className="reino-placa" onClick={() => navigate('/app/rings/ritual')}>
            Fazer o dia {ponto.dia} <span aria-hidden="true">→</span>
          </button>
        )}
      </ReinoChegada>

      <div className="reino-pagina">
        {isGuest && !convidadoTravado && (
          <div className="reino-nota">
            <p>Sem conta, você faz o primeiro dia inteiro. Os outros 29 ficam com a conta.</p>
          </div>
        )}

        <h2 className="reino-corpo__titulo" style={{ marginTop: 28 }}>
          O caminho
        </h2>
        <ReinoSessoes sessoes={etapas} onEscolher={(id) => navigate(`/app/rings/detail/${id}`)} />

        {total > 0 && (
          <ul className="reino-biblioteca" style={{ marginTop: 32 }}>
            <li>
              <button type="button" className="reino-livro" onClick={() => navigate('/app/rings/timeline')}>
                <span className="reino-livro__titulo">Tudo o que você escreveu</span>
                <span className="reino-livro__sobre">Cada dia do caminho, em ordem.</span>
                <span className="reino-livro__acao">Abrir →</span>
              </button>
            </li>
          </ul>
        )}
      </div>
    </div>
  );
}
