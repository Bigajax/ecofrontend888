import React from "react";
import { motion, useReducedMotion } from "framer-motion";

import EcoBubbleOneEye from "./EcoBubbleOneEye";

type Props = {
  size?: number;       // px (default 120) — diâmetro do anel externo
  className?: string;  // classes extras
  text?: string;       // texto opcional abaixo do loader
  breathingSec?: number; // duração de um ciclo de respiração (default 3.4s)
};

/**
 * EcoBubbleLoading — loader na identidade do ECO.
 * Anel grande e sutil + olho ECO (pequeno) no centro + texto em serifa itálica degradê.
 * Respeita prefers-reduced-motion.
 */
const EcoBubbleLoading: React.FC<Props> = ({
  size = 120,
  className,
  text = "carregando...",
  breathingSec = 3.4,
}) => {
  const reduce = useReducedMotion();
  const halo = size * 1.3;
  const eye = Math.max(16, Math.round(size * 0.32));

  return (
    <div className={`flex flex-col items-center justify-center ${className || ""}`}>
      <div
        className="relative flex items-center justify-center"
        style={{ width: halo, height: halo }}
      >
        {/* halo atmosférico (luz vindo do topo-esquerda) */}
        <div
          aria-hidden
          className="absolute rounded-full blur-3xl"
          style={{
            width: halo,
            height: halo,
            background:
              "radial-gradient(60% 60% at 38% 35%, rgba(110,200,255,0.22) 0%, rgba(26,79,181,0) 70%)",
          }}
        />

        {/* anel externo fino, respirando suavemente */}
        <motion.div
          aria-hidden
          className="absolute rounded-full"
          style={{
            width: size,
            height: size,
            border: "1px solid rgba(110,200,255,0.45)",
            boxShadow: "inset 0 0 24px rgba(110,200,255,0.10)",
          }}
          animate={reduce ? undefined : { scale: [1, 1.04, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: breathingSec, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* olho ECO no centro */}
        <EcoBubbleOneEye state="thinking" size={eye} />
      </div>

      {text && (
        <span
          className="mt-5 italic select-none"
          style={{
            fontFamily:
              "var(--font-subtitle, var(--font-serif, 'Lora', Georgia, serif))",
            fontSize: "15px",
            backgroundImage: "linear-gradient(90deg, #4F7FC4 0%, #9B8BD6 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
          role="status"
          aria-live="polite"
        >
          {text}
        </span>
      )}
    </div>
  );
};

export default EcoBubbleLoading;
