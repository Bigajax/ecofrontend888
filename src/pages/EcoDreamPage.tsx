import { useRef, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';
import { useEcoDream } from '@/hooks/useEcoDream';
import type { DreamRow } from '@/api/dreamApi';
import HomeHeader from '@/components/home/HomeHeader';
import BottomNav from '@/components/BottomNav';
import ReinoChegada from '@/components/reino/ReinoChegada';
import '@/components/reino/reino.css';

/**
 * Eco Dream no reino: a chegada no Lago dos Sonhos (DRM.03). O sonho se escreve
 * numa caderneta; a leitura da Eco chega como uma página arrancada do livro.
 */

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function registroDeAgora(): string {
  const agora = new Date();
  const data = agora.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'America/Sao_Paulo' });
  const hora = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
  return `Registro · ${data.replace('.', '')} · ${hora}`;
}

function DreamHistoryItem({ dream }: { dream: DreamRow }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <li className="reino-sonho__entrada">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="reino-sonho__entrada-botao"
        aria-expanded={expanded}
      >
        <span className="reino-sonho__data">{formatDate(dream.created_at)}</span>
        <span className="reino-sonho__resumo">{dream.dream_text}</span>
        {dream.interpretation && (
          <span className="reino-sonho__abrir">{expanded ? 'Fechar a leitura' : 'Abrir a leitura'}</span>
        )}
      </button>
      {expanded && dream.interpretation && (
        <div className="reino-sonho__pagina reino-rasgo-b">
          <div className="reino-sonho__prosa">
            <ReactMarkdown>{dream.interpretation}</ReactMarkdown>
          </div>
        </div>
      )}
    </li>
  );
}

export default function EcoDreamPage() {
  const navigate = useNavigate();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const interpretationRef = useRef<HTMLDivElement>(null);
  const [registro] = useState(registroDeAgora);

  const { dreamText, setDreamText, interpretation, status, errorMsg, interpretar, resetar, history } = useEcoDream();

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [dreamText]);

  // Scroll to result when streaming starts
  useEffect(() => {
    if (status === 'loading' && interpretationRef.current) {
      interpretationRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [status]);

  const isStreaming = status === 'loading';
  const isDone = status === 'done';
  const isError = status === 'error';
  const hasInterpretation = interpretation.trim().length > 0;
  const canInterpret = dreamText.trim().length >= 10;
  const escrevendo = !hasInterpretation && !isStreaming;

  return (
    <div className="reino-corpo reino-sonho" style={{ minHeight: '100dvh' }}>
      <HomeHeader />

      <main className="page-with-nav">
        <ReinoChegada
          mood="noite"
          imagem="/images/reino/capa-mente-quieta.webp"
          foco="center 45%"
          lugar="DRM.03 · Lago dos Sonhos · profundidade desconhecida"
          titulo="O que você sonhou?"
          sobre="Descreva com detalhes. A Eco lê o sonho pelo olhar de Freud e Jung."
          voltar={{ rotulo: 'Voltar para o Mapa', onClick: () => navigate('/app/mapa') }}
        />

        <div className="reino-pagina reino-sonho__corpo">
          {escrevendo && (
            <section aria-label="Escrever o sonho">
              <div className="reino-sonho__caderneta">
                <p className="reino-sonho__registro">{registro}</p>
                <label htmlFor="sonho-texto" className="sr-only">
                  Descreva seu sonho
                </label>
                <textarea
                  id="sonho-texto"
                  ref={textareaRef}
                  className="reino-sonho__texto"
                  value={dreamText}
                  onChange={(e) => setDreamText(e.target.value)}
                  placeholder="Eu estava numa casa que não era a minha..."
                  maxLength={2000}
                  disabled={isStreaming}
                />
                <p className="reino-sonho__contador">{dreamText.length} de 2000</p>
              </div>
              <button type="button" className="reino-placa" onClick={interpretar} disabled={!canInterpret}>
                Interpretar o sonho <span aria-hidden="true">→</span>
              </button>
              {!canInterpret && dreamText.length > 0 && (
                <p className="reino-sonho__dica">Conte um pouco mais. A leitura começa com pelo menos 10 letras.</p>
              )}
            </section>
          )}

          {(hasInterpretation || isStreaming) && (
            <section ref={interpretationRef} aria-live="polite" aria-label="Leitura do sonho">
              <div className="reino-nota">
                <p>
                  Seu sonho
                  <br />
                  <span className="reino-sonho__eco">"{dreamText}"</span>
                </p>
              </div>

              {isStreaming && !hasInterpretation && (
                <p className="reino-sonho__lendo">A Eco está lendo o sonho no fundo do lago…</p>
              )}

              {hasInterpretation && (
                <div className="reino-sonho__pagina reino-rasgo-a">
                  <p className="reino-rotulo">A leitura</p>
                  <div className="reino-sonho__prosa">
                    <ReactMarkdown>{interpretation}</ReactMarkdown>
                    {isStreaming && <span className="reino-sonho__cursor" aria-hidden="true" />}
                  </div>
                </div>
              )}

              {isError && errorMsg && (
                <div className="reino-nota reino-sonho__erro" role="alert">
                  <p>{errorMsg}</p>
                </div>
              )}

              {(isDone || isError) && (
                <button type="button" className="reino-placa" onClick={resetar}>
                  Contar outro sonho <span aria-hidden="true">→</span>
                </button>
              )}
            </section>
          )}

          {history.length > 0 && escrevendo && (
            <section className="reino-sonho__historico" aria-labelledby="sonhos-anteriores">
              <p className="reino-rotulo">Diário do lago</p>
              <h2 id="sonhos-anteriores" className="reino-corpo__titulo">
                Sonhos anteriores
              </h2>
              <ul className="reino-sonho__lista">
                {history.map((dream) => (
                  <DreamHistoryItem key={dream.id} dream={dream} />
                ))}
              </ul>
            </section>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
