import { useEffect } from 'react';
import { DEFAULT_SUGGESTIONS } from './QuickSuggestions';
import { getFirstName } from '@/components/reino/reinoMood';
import '@/components/reino/reino.css';

interface EcoAIModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEnter: () => void;
  userName: string;
  onStartSentimentos: () => void;
  onSugerirConteudo: () => void;
  onSuggestionClick: (text: string) => void;
  onMemoriaEmocional: () => void;
  onPerfilEmocional: () => void;
  onRelatorio: () => void;
}

/**
 * A porta da Casa da Eco: uma página de papel que se abre sobre a home, com a
 * pintura da casa no alto. Sem cards, sem emoji, nada se mexe sozinho.
 */
export default function EcoAIModal({
  isOpen,
  onClose,
  onEnter,
  userName,
  onStartSentimentos,
  onSugerirConteudo,
  onSuggestionClick,
  onMemoriaEmocional,
  onPerfilEmocional,
  onRelatorio,
}: EcoAIModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const nome = getFirstName(userName);

  return (
    <div className="reino-casa-porta" role="dialog" aria-modal="true" aria-labelledby="casa-porta-titulo" onClick={onClose}>
      <div className="reino-corpo reino-casa-porta__folha" onClick={(e) => e.stopPropagation()}>
        <div className="reino-casa-porta__pintura reino-rasgo-baixo">
          <img src="/images/reino/casa-800.webp" alt="" decoding="async" />
          <button type="button" className="reino-casa-porta__fechar" onClick={onClose}>
            Fechar
          </button>
        </div>

        <div className="reino-casa-porta__miolo">
          <header className="reino-casa-porta__cabeca">
            <p className="reino-rotulo">ECO.01 · Casa da Eco</p>
            <h2 id="casa-porta-titulo" className="reino-casa-porta__titulo">
              {nome ? `Oi, ${nome}. Entre.` : 'Entre, a casa é sua.'}
            </h2>
            <p className="reino-casa-porta__sobre">Sobre o que você quer conversar hoje?</p>
          </header>

          <section aria-labelledby="casa-porta-comecar">
            <p id="casa-porta-comecar" className="reino-rotulo">Começar uma conversa</p>
            <ul className="reino-casa-porta__lista">
              <Porta
                titulo="Falar sobre o que estou sentindo"
                sobre="Como foi o seu dia, o que pesa, o que alegrou."
                onClick={onStartSentimentos}
              />
              <Porta
                titulo="Pedir uma sugestão de conteúdo"
                sobre="Conte como você está e a Eco recomenda um conteúdo para agora."
                onClick={onSugerirConteudo}
              />
            </ul>
          </section>

          <section aria-labelledby="casa-porta-perguntas">
            <p id="casa-porta-perguntas" className="reino-rotulo">Ou comece por uma pergunta</p>
            <ul className="reino-casa-porta__lista is-perguntas">
              {DEFAULT_SUGGESTIONS.map((s) => (
                <li key={s.id}>
                  <button type="button" className="reino-casa-porta__pergunta" onClick={() => onSuggestionClick(s.label)}>
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className="reino-casa-porta__anteriores" onClick={onEnter}>
              Voltar às conversas anteriores
            </button>
          </section>

          <section aria-labelledby="casa-porta-evolucao">
            <p id="casa-porta-evolucao" className="reino-rotulo">O que a Eco guarda de você</p>
            <ul className="reino-casa-porta__lista">
              <Porta
                titulo="Memória emocional"
                sobre="Os momentos importantes que você registrou nas conversas."
                onClick={onMemoriaEmocional}
              />
              <Porta
                titulo="Perfil emocional"
                sobre="As emoções mais frequentes, os temas que voltam e os seus padrões."
                onClick={onPerfilEmocional}
              />
              <Porta
                titulo="Relatório emocional"
                sobre="O mapa das suas emoções, a linha do tempo e as que mais aparecem."
                onClick={onRelatorio}
              />
            </ul>
          </section>

          <div className="reino-nota">
            <p>
              Suas conversas são guardadas com cuidado. Nunca compartilhamos suas informações.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Porta({ titulo, sobre, onClick }: { titulo: string; sobre: string; onClick: () => void }) {
  return (
    <li>
      <button type="button" className="reino-casa-porta__porta" onClick={onClick}>
        <span className="reino-casa-porta__porta-titulo">{titulo}</span>
        <span className="reino-casa-porta__porta-sobre">{sobre}</span>
        <span className="reino-diario__abrir" aria-hidden="true">
          abrir
        </span>
      </button>
    </li>
  );
}
