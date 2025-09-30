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

      {text && (
        <span className="mt-4 text-sm text-gray-500 select-none">{text}</span>
      )}
    </div>
  );
};

export default EcoBubbleLoading;
