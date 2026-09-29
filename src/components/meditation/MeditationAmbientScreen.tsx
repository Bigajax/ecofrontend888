import '@/components/reino/reino.css';

interface MeditationAmbientScreenProps {
  visible: boolean;
  elapsedSeconds: number;
  meditationTitle: string;
  category: string;
  /** pintura da meditação; sem ela (ou se for um degradê CSS), o Vale */
  imagem?: string;
  onDismiss: () => void;
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Descanso de tela enquanto a meditação toca: a pintura da sessão em tela
 * cheia, um véu de noite, o tempo e o título. Toque em qualquer lugar volta.
 *
 * Sem AnimatePresence: a animação de saída travava e a camada (z 9990) ficava
 * na página, invisível ou não, por cima da conclusão, roubando os cliques.
 * Agora, quando não deve aparecer, simplesmente não existe.
 */
export default function MeditationAmbientScreen({
  visible,
  elapsedSeconds,
  meditationTitle,
  imagem,
  onDismiss,
}: MeditationAmbientScreenProps) {
  if (!visible) return null;

  const pintura = imagem && !/^(url\(|linear-gradient|radial-gradient)/.test(imagem) ? imagem : '/images/reino/vale.webp';

  return (
    <div
      className="reino-descanso"
      role="button"
      tabIndex={0}
      aria-label="Voltar para o player"
      onClick={onDismiss}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') onDismiss();
      }}
    >
      <img className="reino-descanso__pintura" src={pintura} alt="" decoding="async" />
      <div className="reino-descanso__miolo">
        <p className="reino-descanso__tempo">{formatElapsed(elapsedSeconds)}</p>
        <p className="reino-descanso__titulo">{meditationTitle}</p>
      </div>
      <p className="reino-descanso__voltar">toque para voltar</p>
    </div>
  );
}
