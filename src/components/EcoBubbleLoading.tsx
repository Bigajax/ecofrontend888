import React from "react";

import ReinoCarregando from "./reino/ReinoCarregando";

type Props = {
  size?: number;       // mantido por compatibilidade; o desenho do reino tem tamanho próprio
  className?: string;  // classes extras
  text?: string;       // texto abaixo do desenho
  breathingSec?: number; // mantido por compatibilidade
};

/**
 * EcoBubbleLoading — carregamento dentro das páginas do app, no desenho do reino
 * (o astro se desenhando e o horizonte pintado). Respeita prefers-reduced-motion.
 */
const EcoBubbleLoading: React.FC<Props> = ({ className, text }) => {
  return (
    <div className={className}>
      {/* "Carregando…" genérico cede lugar à frase do lugar (ex.: a lamparina da Casa) */}
      <ReinoCarregando inline texto={text && !/carregando/i.test(text) ? text : undefined} />
    </div>
  );
};

export default EcoBubbleLoading;
