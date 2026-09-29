import { useNavigate } from 'react-router-dom';
import { useRings } from '@/contexts/RingsContext';
import { useAuth } from '@/contexts/AuthContext';
import { RINGS } from '@/constants/rings';
import {
  DIAS_DA_JORNADA,
  DIAS_POR_ANEL,
  anelDoDia,
  comecarNovoCiclo,
  diasConcluidos,
  lerInicioDoCiclo,
  pontoDaJornada,
} from '@/constants/ringsJornada';
import { Astro, PincelProgresso } from '@/components/reino/ReinoScene';
import { getReinoMood } from '@/components/reino/reinoMood';
import SeloDoAnel from './SeloDoAnel';
import '@/components/reino/reino.css';

interface RitualCompletionProps {
  onBackHome: () => void;
}

/**
 * A chegada do dia (set/2026): diz qual dia foi fechado, onde a pessoa está
 * nos 30 dias e o que abre amanhã. No fim de cada anel, o Selo; no dia 30, a
 * travessia completa. Antes era "Ritual Concluído ✅" e um botão de voltar.
 */
export default function RitualCompletion({ onBackHome }: RitualCompletionProps) {
  const navigate = useNavigate();
  const { allRituals } = useRings();
  const { user, isGuestMode } = useAuth();
  const uid = user?.id ?? null;
  const isGuest = isGuestMode && !user;

  const total = diasConcluidos(allRituals).length;
  const inicio = lerInicioDoCiclo(uid);
  const proximo = pontoDaJornada(total, inicio);
  const diaFeito = proximo.feitos;
  const anelFeito = anelDoDia(Math.max(1, diaFeito));
  const fechouAnel = diaFeito > 0 && diaFeito % DIAS_POR_ANEL === 0;
  const travessia = proximo.completo;

  const titulo = travessia
    ? 'Você atravessou os cinco anéis.'
    : fechouAnel
      ? `Você fechou o ${RINGS[anelFeito].titlePt}.`
      : `Dia ${diaFeito} feito.`;

  const amanha = travessia
    ? 'Trinta dias de prática. O caminho pode ser percorrido de novo, com o que você é agora.'
    : isGuest
      ? `Amanhã é o dia ${proximo.dia}, no ${RINGS[proximo.anel].titlePt}. Para seguir os 30 dias, crie a sua conta.`
      : `Amanhã abre o dia ${proximo.dia}${fechouAnel ? `, e com ele o ${RINGS[proximo.anel].titlePt}` : `, no ${RINGS[proximo.anel].titlePt}`}.`;

  return (
    <div className="reino-corpo reino-ritual">
      <div className="reino-ritual__miolo">
        <Astro className="reino-ritual__astro" mood={getReinoMood()} />
        <h1 className="reino-ritual__chegada">{titulo}</h1>
        <p className="reino-ritual__amanha">{amanha}</p>

        <div className="reino-ritual__trilha">
          <PincelProgresso value={diaFeito / DIAS_DA_JORNADA} />
          <span className="reino-rotulo">
            {diaFeito} de {DIAS_DA_JORNADA} dias
          </span>
        </div>

        {(fechouAnel || travessia) && <SeloDoAnel anel={anelFeito} rituais={allRituals} />}

        <div className="reino-ritual__acoes">
          {isGuest ? (
            <button
              type="button"
              className="reino-placa"
              onClick={() => navigate('/assinar?step=signup&plan=monthly&from=aneis_dia1')}
            >
              Criar conta e seguir <span aria-hidden="true">→</span>
            </button>
          ) : travessia ? (
            <button
              type="button"
              className="reino-placa"
              onClick={() => {
                comecarNovoCiclo(uid, total);
                onBackHome();
              }}
            >
              Percorrer de novo <span aria-hidden="true">→</span>
            </button>
          ) : null}
          <button type="button" className="reino-ritual__link" onClick={onBackHome}>
            Voltar aos Cinco Anéis
          </button>
        </div>
      </div>
    </div>
  );
}
