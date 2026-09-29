/**
 * SonoNightsJourney
 *
 * As sete noites do Protocolo do Sono na tela de conclusão (fluxo sono
 * autenticado). No reino (set/2026): a mesma lista numerada das outras
 * trilhas, com a noite feita marcada, a próxima em destaque e uma placa para
 * ouvi-la. Antes: linha do tempo roxa com brilho pulsando e ícones de cadeado.
 *
 * Fonte única dos dados: PROTOCOL_NIGHTS.
 */

import { PROTOCOL_NIGHTS } from '@/data/protocolNights';

export interface SonoNightsJourneyProps {
  /** Noite recém-concluída (1..7). */
  currentNight: number;
  /** Noites já concluídas (números). */
  completedNights: number[];
  /** Acesso pago (libera noites 2–7). */
  isPaid: boolean;
  /** Toca a noite (ou roteia pra oferta se bloqueada) — gate centralizado no pai. */
  onPlayNight: (night: number) => void;
  /** Próximo passo quando o protocolo está concluído (ponte pro resto do app). */
  onExploreApp?: () => void;
}

export default function SonoNightsJourney({
  currentNight,
  completedNights,
  isPaid,
  onPlayNight,
  onExploreApp,
}: SonoNightsJourneyProps) {
  // Protocolo SEQUENCIAL: o progresso é a noite mais avançada alcançada (a
  // recém-concluída ou a maior já registrada). Tudo até ela conta como concluído,
  // e a próxima é a seguinte, não o primeiro "buraco".
  const inRange = (n: number) => n >= 1 && n <= 7;
  const maxReached = Math.max(
    inRange(currentNight) ? currentNight : 0,
    ...completedNights.filter(inRange),
    0,
  );
  const nextNight = maxReached < 7 ? maxReached + 1 : null;
  const remaining = Math.max(0, 7 - maxReached);
  const done = maxReached >= 7;
  const bloqueada = (n: number) => !isPaid && n > 1;
  const proxima = nextNight ? PROTOCOL_NIGHTS.find((n) => n.night === nextNight) : undefined;

  return (
    <section className="reino-conclusao__bloco" aria-labelledby="sono-noites-titulo">
      <p className="reino-rotulo">Noite {Math.max(1, maxReached)} de 7</p>
      <h2 id="sono-noites-titulo" className="reino-corpo__titulo" style={{ fontSize: 24 }}>
        {done
          ? 'As sete noites foram feitas.'
          : `Faltam ${remaining} ${remaining === 1 ? 'noite' : 'noites'} para o corpo dormir sozinho.`}
      </h2>

      {proxima && (
        <button type="button" className="reino-placa" style={{ marginTop: 16 }} onClick={() => onPlayNight(proxima.night)}>
          {bloqueada(proxima.night) ? `Abrir a Noite ${proxima.night}` : `Ouvir a Noite ${proxima.night}`}{' '}
          <span aria-hidden="true">→</span>
        </button>
      )}
      {done && onExploreApp && (
        <button type="button" className="reino-placa" style={{ marginTop: 16 }} onClick={onExploreApp}>
          Ver o resto do reino <span aria-hidden="true">→</span>
        </button>
      )}

      <ol className="reino-sumario reino-sessoes" style={{ marginTop: 20 }}>
        {PROTOCOL_NIGHTS.map((n) => {
          const feita = n.night <= maxReached;
          const eProxima = n.night === nextNight;
          const estado = feita ? 'is-feita' : eProxima ? 'is-proxima' : 'is-trancada';
          return (
            <li key={n.night} className={estado}>
              <button type="button" className="reino-sessao" onClick={() => onPlayNight(n.night)}>
                <span className="reino-sumario__n">{feita ? '✓' : String(n.night).padStart(2, '0')}</span>
                <span className="reino-sessao__texto">
                  <span className="reino-sumario__t">{n.title}</span>
                </span>
                <span className="reino-sumario__m">
                  {feita ? 'feita' : eProxima ? 'a próxima' : bloqueada(n.night) ? 'com a assinatura' : `noite ${n.night}`}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
