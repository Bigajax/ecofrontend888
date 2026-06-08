import React, { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

import EcoBubbleOneEye from "./EcoBubbleOneEye";

type Props = {
  /** segundos decorridos; se omitido, o componente cronometra sozinho a partir do mount */
  elapsedTime?: number;
  /** compact = sem mascote (a bolha já tem o avatar ao lado) e sem container de frase em caixa */
  compact?: boolean;
  className?: string;
};

const srOnly =
  "sr-only absolute -m-px h-px w-px overflow-hidden p-0 whitespace-nowrap border-0";

// Frases ambiente — warm, não-clínico (fiel à IA emocional). Rotacionam suavemente.
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
 * EcoThinkingIndicator — indicador de "pensando" com identidade ECO.
 * Texto "Eco refletindo…" em serifa itálica com brilho (shimmer) varrendo em degradê
 * azul-bebê, mascote da Eco respirando (omitido em `compact`), frase ambiente rotativa
 * e cronômetro. Respeita prefers-reduced-motion e é acessível (aria-live).
 */
const EcoThinkingIndicator: React.FC<Props> = ({
  elapsedTime,
  compact = false,
  className = "",
}) => {
  const reduce = useReducedMotion();

  // Cronômetro interno — só usado quando elapsedTime não é fornecido pelo pai.
  const [internalElapsed, setInternalElapsed] = useState(0);
  const usesInternalTimer = typeof elapsedTime !== "number";

  useEffect(() => {
    if (!usesInternalTimer) return;
    const id = setInterval(() => {
      setInternalElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [usesInternalTimer]);

  // Rotação das frases ambiente (parada se prefers-reduced-motion).
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

  // Texto "Eco refletindo…" com shimmer (ou sólido, se reduced motion).
  const labelStyle: React.CSSProperties = reduce
    ? {
        fontFamily:
          "var(--font-subtitle, var(--font-serif, 'Lora', Georgia, serif))",
        fontStyle: "italic",
        color: "#6B8099",
      }
    : {
        fontFamily:
          "var(--font-subtitle, var(--font-serif, 'Lora', Georgia, serif))",
        fontStyle: "italic",
        backgroundImage:
          "linear-gradient(110deg, #6B8099 35%, #6EC8FF 50%, #6B8099 75%)",
        backgroundSize: "200% 100%",
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
      };

  return (
    <div
      className={`inline-flex flex-col gap-1.5 ${className}`}
      role="status"
      aria-live="polite"
    >
      <span className={srOnly}>Eco refletindo…</span>

      {/* Linha 1: mascote (respirando) + label shimmer + cronômetro */}
      <div className="flex items-center gap-2">
        {!compact && (
          <motion.div
            aria-hidden
            className="shrink-0"
            animate={reduce ? undefined : { scale: [1, 1.04, 1], opacity: [0.85, 1, 0.85] }}
            transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
          >
            <EcoBubbleOneEye variant="message" size={28} state="thinking" />
          </motion.div>
        )}

        <span
          aria-hidden
          className={`whitespace-nowrap text-[15px] leading-none ${
            reduce ? "" : "animate-eco-shimmer"
          }`}
          style={labelStyle}
        >
          Eco refletindo…
        </span>

        {showTimer && (
          <span className="text-xs font-light text-eco-muted/70 tabular-nums">
            {Math.round(elapsed)}s
          </span>
        )}
      </div>

      {/* Linha 2: frase ambiente rotativa */}
      <div className={compact ? "" : "self-start"}>
        <div
          className={
            compact
              ? "pl-0.5"
              : "rounded-card border border-eco-baby/15 bg-eco-babySoft/60 px-3 py-1.5"
          }
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={phrase}
              className="block text-[13px] italic leading-snug text-eco-muted"
              style={{
                fontFamily:
                  "var(--font-subtitle, var(--font-serif, 'Lora', Georgia, serif))",
              }}
              initial={reduce ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -4 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
            >
              {phrase}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default EcoThinkingIndicator;
