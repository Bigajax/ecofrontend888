import { RINGS_ARRAY } from '@/constants/rings';
import '@/components/reino/reino.css';

interface OnboardingModalProps {
  onComplete: () => void;
  onDismiss: () => void;
}

/** Boas-vindas aos Cinco Anéis: uma página aberta sobre a noite, no estilo do reino. */
export default function OnboardingModal({ onComplete, onDismiss }: OnboardingModalProps) {
  return (
    <div className="reino-drjoe__ciclo" role="dialog" aria-modal="true" aria-labelledby="aneis-boas-vindas" onClick={onDismiss}>
      <div className="reino-drjoe__ciclo-caixa reino-aneis__boas-vindas" onClick={(e) => e.stopPropagation()}>
        <p className="reino-rotulo" style={{ color: '#5b6080' }}>
          TRI.04 · As Trilhas
        </p>
        <h2 id="aneis-boas-vindas" className="reino-corpo__titulo" style={{ color: '#1c2350' }}>
          Cinco Anéis da Disciplina
        </h2>
        <p className="reino-corpo__sobre" style={{ color: '#4b5070' }}>
          Um ritual diário inspirado em Miyamoto Musashi para fortalecer sua disciplina com clareza, pequenos ajustes e
          identidade.
        </p>
        <ol className="reino-sumario reino-aneis__lista">
          {RINGS_ARRAY.map((ring, i) => (
            <li key={ring.id}>
              <div className="reino-sessao" style={{ cursor: 'default' }}>
                <span className="reino-sumario__n">{String(i + 1).padStart(2, '0')}</span>
                <span className="reino-sessao__texto">
                  <span className="reino-sumario__t">{ring.titlePt}</span>
                  <span className="reino-sessao__descricao">{ring.descriptionPt}</span>
                </span>
                <span />
              </div>
            </li>
          ))}
        </ol>
        <p className="reino-sono__contagem" style={{ color: '#5b6080' }}>
          5 perguntas rápidas por dia. A Eco cuida do resto: padrões, gráficos e reflexões.
        </p>
        <div className="reino-player-aviso__acoes" style={{ padding: 0, background: 'transparent' }}>
          <button type="button" className="reino-placa" onClick={onComplete}>
            Começar <span aria-hidden="true">→</span>
          </button>
          <button type="button" className="reino-chegada__voltar" onClick={onDismiss}>
            Ver depois
          </button>
        </div>
      </div>
    </div>
  );
}
