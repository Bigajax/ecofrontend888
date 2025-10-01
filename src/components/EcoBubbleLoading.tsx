import React from "react";
import { motion } from "framer-motion";

import EcoBubbleOneEye from "./EcoBubbleOneEye";

type Props = {
  size?: number;       // px (default 64)
  className?: string;  // classes extras
  text?: string;       // texto opcional abaixo da bolha
  breathingSec?: number; // duração de um ciclo (default 2s)
};

const EcoBubbleLoading: React.FC<Props> = ({
  size = 64,
  className,
  text = "Carregando...",
  breathingSec = 2,
}) => {
  const haloSize = size * 1.35;

  return (
    <div className={`flex flex-col items-center justify-center ${className || ""}`}>
      <div
        className="relative flex items-center justify-center"
        style={{ width: haloSize, height: haloSize }}
      >
        <motion.div
          aria-hidden
          className="absolute rounded-full blur-xl"
          style={{
            width: haloSize,
            height: haloSize,
            background:
              "radial-gradient(65% 65% at 50% 50%, rgba(171, 197, 255, 0.32), rgba(92, 132, 227, 0.08))",
            boxShadow: "0 24px 42px rgba(40, 60, 120, 0.18)",
          }}
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: breathingSec, repeat: Infinity, ease: "easeInOut" }}
        />

        <motion.div
          aria-hidden
          className="absolute inset-0 rounded-full"
          style={{
            border: "1px solid rgba(200, 220, 255, 0.25)",
            background:
              "radial-gradient(55% 55% at 30% 30%, rgba(255,255,255,0.48), rgba(216,228,255,0.15))",
          }}
          animate={{ opacity: [0.65, 0.9, 0.65] }}
          transition={{ duration: breathingSec * 1.1, repeat: Infinity, ease: "easeInOut" }}
        />

        <EcoBubbleOneEye state="thinking" size={size} />
      </div>

      {text && (
        <span className="mt-4 text-sm text-gray-500 select-none">{text}</span>
      )}
    </div>
  );
};

export default EcoBubbleLoading;
