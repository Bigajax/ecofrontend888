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
  return (
    <div className={`flex flex-col items-center justify-center ${className || ""}`}>
      <div
        className="relative flex items-center justify-center rounded-full shadow-md ring-1 ring-[rgba(200,220,255,0.45)]"
        style={{
          width: size,
          height: size,
          background:
            "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.88), rgba(240,240,255,0.45))",
          border: "1px solid rgba(200, 220, 255, 0.45)",
          boxShadow: "0 6px 18px rgba(0, 0, 0, 0.10)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
        aria-hidden
      >
        <motion.div
          className="flex h-full w-full items-center justify-center"
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: breathingSec, repeat: Infinity, ease: "easeInOut" }}
        >
          <EcoBubbleOneEye variant="avatar" size={size * 0.72} state="thinking" />
        </motion.div>
      </div>
      {text && (
        <span className="mt-4 text-sm text-gray-500 select-none">{text}</span>
      )}
    </div>
  );
};

export default EcoBubbleLoading;
