import React, { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

import { GlifoEco } from "./reino/ReinoGlifos";

type Props = {
  /** segundos decorridos; se omitido, o componente cronometra sozinho a partir do mount */
  elapsedTime?: number;
  /** compact = sem a casa (a mensagem já tem o glifo ao lado) */
  compact?: boolean;
  className?: string;
};

const srOnly =
  "sr-only absolute -m-px h-px w-px overflow-hidden p-0 whitespace-nowrap border-0";

// Frases ambiente: acolhedoras, não clínicas. Trocam a cada tanto, sem animação.
const AMBIENT_PHRASES = [
  "ouvindo você…",
  "sentindo o que você trouxe…",
  "acolhendo isso…",
  "buscando o que ressoa…",
  "organizando os pensamentos…",
  "respirando com você…",
] as const;

const PHRASE_INTERVAL_MS = 2600;

/**
 * EcoThinkingIndicator: a Eco está pensando. No reino é a janela da casa acesa,
 * "Eco refletindo…" em serifa, o tempo em mono e uma frase curta embaixo.
 * Nada pisca nem brilha; o que mostra que ela está viva é o relógio andando.
 */
const EcoThinkingIndicator: React.FC<Props> = ({
  elapsedTime,
  compact = false,
  className = "",
}) => {
  const reduce = useReducedMotion();

  // Cronômetro interno, só quando elapsedTime não vem do pai.
  const [internalElapsed, setInternalElapsed] = useState(0);
  const usesInternalTimer = typeof elapsedTime !== "number";

  useEffect(() => {
    if (!usesInternalTimer) return;
    const id = setInterval(() => {
      setInternalElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [usesInternalTimer]);

  // Rotação das frases (parada se prefers-reduced-motion).
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % AMBIENT_PHRASES.length);
    }, PHRASE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [reduce]);

  const elapsed = usesInternalTimer ? internalElapsed : (elapsedTime as number);
  const showTimer = elapsed > 0 && elapsed < 60;
  const phrase = AMBIENT_PHRASES[phraseIndex];

  return (
    <div className={`reino-pensando ${className}`} role="status" aria-live="polite">
      <span className={srOnly}>Eco refletindo…</span>

      <div className="reino-pensando__linha">
        {!compact && <GlifoEco ativo className="reino-pensando__casa" />}
        <span aria-hidden className="reino-pensando__rotulo">
          Eco refletindo…
        </span>
        {showTimer && <span className="reino-pensando__tempo">{Math.round(elapsed)}s</span>}
      </div>

      <span className="reino-pensando__frase">{phrase}</span>
    </div>
  );
};

export default EcoThinkingIndicator;
