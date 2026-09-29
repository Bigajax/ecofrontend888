import { useNavigate } from 'react-router-dom';
import mixpanel from '@/lib/mixpanel';
import { Astro } from '@/components/reino/ReinoScene';
import { getReinoMood } from '@/components/reino/reinoMood';
import '@/components/reino/reino.css';

interface RitualGuestGateProps {
  open: boolean;
  currentDay: number; // dia da jornada que o visitante tentou abrir (1-30)
  completedRings: number; // mantido pelos eventos do Mixpanel
  onBack?: () => void;
}

/**
 * O convite do visitante nos Cinco Anéis (set/2026): ele faz o dia 1 inteiro;
 * o dia 2 em diante é com a conta. Antes o bloqueio caía no meio do dia 1,
 * no 3º anel, e o texto prometia "sempre gratuito".
 */
export default function RitualGuestGate({ open, currentDay, completedRings, onBack }: RitualGuestGateProps) {
  const navigate = useNavigate();
  if (!open) return null;

  const seguir = () => {
    mixpanel.track('Convidado · Gate anéis continuar', {
      current_day: currentDay,
      completed_rings: completedRings,
      blocked_at: 'dia_2',
    });
    // Conta grátis (sem cartão): o Anel da Terra inteiro segue sem pagar.
    navigate('/register?returnTo=' + encodeURIComponent('/app/rings'));
  };

  const voltar = () => {
    mixpanel.track('Convidado · Gate anéis voltar', { current_day: currentDay, completed_rings: completedRings });
    onBack?.();
  };

  return (
    <div className="reino-gate" role="dialog" aria-modal="true" aria-labelledby="aneis-gate-titulo">
      <div className="reino-gate__folha reino-corpo">
        <Astro className="reino-gate__astro" mood={getReinoMood()} />
        <h2 id="aneis-gate-titulo" className="reino-gate__titulo">
          O primeiro dia foi seu.
        </h2>
        <p className="reino-gate__texto">
          Crie a sua conta grátis para abrir o dia {currentDay} e seguir o Anel da Terra inteiro, seis dias, guardando o que
          você já escreveu.
        </p>
        <p className="reino-gate__nota">Conta grátis, sem cartão.</p>
        <div className="reino-gate__acoes">
          <button type="button" className="reino-placa" onClick={seguir}>
            Criar conta grátis <span aria-hidden="true">→</span>
          </button>
          <button type="button" className="reino-gate__depois" onClick={voltar}>
            Agora não
          </button>
        </div>
      </div>
    </div>
  );
}
