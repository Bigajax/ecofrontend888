import ProximoCaminho from '@/components/reino/ProximoCaminho';
import { useNavigate } from 'react-router-dom';
import HomeHeader from '@/components/home/HomeHeader';
import { PincelProgresso, ReinoPintura } from '@/components/reino/ReinoScene';
import { PROTOCOL_NIGHTS, type ProtocolNight } from '@/data/protocolNights';
import mixpanel from '@/lib/mixpanel';
import '@/components/reino/reino.css';

/**
 * Ritual Boa Noite no app logado, no estilo do reino (Vale do Sono, SOM.02).
 * Só a apresentação mudou: estado, copy do ritual, eventos e ações vêm do
 * SleepMeditationExperience. O funil convidado (/sono/experiencia) não usa isto.
 */
interface SonoReinoAppProps {
  ritualCopy: { l1: string; l2: string; sub: string; cta: string };
  completedCount: number;
  nextNight: number;
  completedNights: Set<number>;
  isPaid: boolean;
  night1IsCompleted: boolean;
  checkoutLoading: boolean;
  onRitual: () => void;
  onNight: (night: ProtocolNight) => void;
  onCheckout: () => void;
}

function metaDaNoite(night: ProtocolNight, feita: boolean, proxima: boolean, isPaid: boolean): string {
  if (feita) return 'feita';
  if (!isPaid && !night.isFree) return 'assinantes';
  if (proxima) return `hoje · ${night.duration}`;
  return night.duration;
}

export default function SonoReinoApp({
  ritualCopy,
  completedCount,
  nextNight,
  completedNights,
  isPaid,
  night1IsCompleted,
  checkoutLoading,
  onRitual,
  onNight,
  onCheckout,
}: SonoReinoAppProps) {
  const navigate = useNavigate();

  const abrirSonhos = () => {
    try {
      mixpanel.track('Sono · EcoDream porta clicada', { surface: 'ritual_boa_noite' });
    } catch {
      // analytics nunca quebra a UI
    }
    navigate('/app/dream');
  };

  return (
    <div className="reino-corpo" style={{ minHeight: '100dvh' }}>
      <HomeHeader />

      <main className="page-with-nav">
        <section className="reino-hero" data-mood="noite" aria-labelledby="sono-titulo">
          <div className="reino-hero__grade">
            <div className="reino-hero__cena reino-rasgo-a">
              <ReinoPintura regiao="vale" foco="40% 50%" />
            </div>

            <div className="reino-hero__texto">
              <p className="reino-rotulo">Ritual Boa Noite · SOM.02</p>
              <h1 id="sono-titulo" className="reino-hero__ola">
                {ritualCopy.l1} {ritualCopy.l2}
              </h1>
              <p className="reino-hero__pergunta">{ritualCopy.sub}</p>
              <button type="button" className="reino-placa" onClick={onRitual} disabled={checkoutLoading}>
                {checkoutLoading ? 'Abrindo…' : ritualCopy.cta} <span aria-hidden="true">→</span>
              </button>

              <h2 className="reino-rotulo reino-hero__secao">As sete noites</h2>
              <PincelProgresso value={completedCount / 7} className="reino-sono__pincel" />
              <p className="reino-sono__contagem">
                {completedCount === 7 ? 'Todas as noites feitas.' : `${completedCount} de 7 noites feitas`}
              </p>
              {completedCount === 7 && <ProximoCaminho atual="sono" />}
              <ol className="reino-sumario">
                {PROTOCOL_NIGHTS.map((night) => {
                  const feita = completedNights.has(night.night);
                  const proxima = !feita && night.night === nextNight;
                  const trancada = !isPaid && !night.isFree;
                  return (
                    <li key={night.id}>
                      <button
                        type="button"
                        className={`reino-sumario__item${trancada ? ' reino-sono__trancada' : ''}`}
                        onClick={() => onNight(night)}
                      >
                        <span className="reino-sumario__n">{String(night.night).padStart(2, '0')}</span>
                        <span className="reino-sumario__t">{night.title}</span>
                        <span className="reino-sumario__m">{metaDaNoite(night, feita, proxima, isPaid)}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        </section>

        <div className="reino-corpo__coluna reino-sono__baixo">
          {!isPaid && night1IsCompleted && (
            <section className="reino-corpo__secao reino-convite" aria-labelledby="sono-convite">
              <p className="reino-rotulo">Protocolo completo · 7 noites</p>
              <h2 id="sono-convite" className="reino-corpo__titulo">7 dias gratuitos</h2>
              <p className="reino-corpo__sobre">
                Depois R$ 15,90/mês, cancele quando quiser. Inclui o Ecotopia completo: Eco IA, meditações e mais.
              </p>
              <button type="button" className="reino-placa" onClick={onCheckout} disabled={checkoutLoading}>
                {checkoutLoading ? 'Abrindo…' : 'Continuar o processo completo'} <span aria-hidden="true">→</span>
              </button>
              <p className="reino-corpo__sobre">Garantia de 7 dias. Não funcionou? Devolvemos. Email basta.</p>
            </section>
          )}

          {isPaid && (
            <section className="reino-corpo__secao" aria-labelledby="sono-sonhos">
              <p className="reino-rotulo">DRM.03 / profundidade desconhecida</p>
              <h2 id="sono-sonhos" className="reino-corpo__titulo">Sonhou esta noite?</h2>
              <p className="reino-corpo__sobre">
                O Lago dos Sonhos fica logo depois do vale. Conte o sonho e receba uma leitura.
              </p>
              <button type="button" className="reino-placa" onClick={abrirSonhos}>
                Contar um sonho <span aria-hidden="true">→</span>
              </button>
            </section>
          )}

          {!night1IsCompleted && !isPaid && (
            <p className="reino-corpo__sobre">A primeira noite é por nossa conta.</p>
          )}
        </div>
      </main>
    </div>
  );
}
