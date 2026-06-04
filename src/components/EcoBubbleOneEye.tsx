import React from 'react';
import clsx from 'clsx';

type EcoState = 'idle' | 'listening' | 'speaking' | 'thinking' | 'focus';
type EcoVariant = 'icon' | 'avatar' | 'message' | 'voice';

export interface EcoBubbleOneEyeProps extends React.HTMLAttributes<HTMLDivElement> {
  state?: EcoState;
  variant?: EcoVariant;
  size?: number;
  color?: string;
  accentColor?: string;
}

const DEFAULT_SIZES: Record<EcoVariant, number> = {
  icon: 24,
  avatar: 40,
  message: 30,
  voice: 240,
};

// Símbolo oficial do Ecotopia (logo apenas símbolo). PNG com fundo transparente.
const MASCOTE_SRC = '/images/eco-mascote.png';

/**
 * Mascote da Eco — agora renderiza o símbolo oficial do Ecotopia.
 * Mantém a mesma API (state/variant/size/color/accentColor) para compatibilidade
 * com os pontos de uso; props de animação/cor são aceitas mas não se aplicam à imagem.
 */
const EcoBubbleOneEye: React.FC<EcoBubbleOneEyeProps> = ({
  state,
  variant = 'icon',
  size,
  color,
  accentColor,
  className,
  style,
  ...rest
}) => {
  // Props de animação/cor mantidas na API por compatibilidade, mas não se aplicam à imagem.
  void state;
  void color;
  void accentColor;

  const dimension = size ?? DEFAULT_SIZES[variant];

  return (
    <div
      className={clsx('relative inline-flex select-none items-center justify-center', className)}
      style={{ width: dimension, height: dimension, ...style }}
      role="img"
      aria-label="ECO AI"
      {...rest}
    >
      <img
        src={MASCOTE_SRC}
        alt="ECO"
        width={dimension}
        height={dimension}
        draggable={false}
        className="h-full w-full object-contain"
      />
    </div>
  );
};

export default EcoBubbleOneEye;
