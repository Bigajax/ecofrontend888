import React from 'react';

type Props = {
  size?: number;        // px (default 24)
  className?: string;   // para escalas/responsivo
};

const EcoBubbleIcon: React.FC<Props> = ({ size = 24, className }) => {
  return (
    <div
      className={`rounded-full shadow-md ring-1 ring-[rgba(200,220,255,0.45)] ${className || ''}`}
      style={{
        width: size,
        height: size,
        background:
          'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.88), rgba(240,240,255,0.45))',
        border: '1px solid rgba(200, 220, 255, 0.45)',
        boxShadow: '0 6px 18px rgba(0, 0, 0, 0.10)', // presença um pouco maior
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      aria-hidden
    />
  );
};

export default EcoBubbleIcon;
