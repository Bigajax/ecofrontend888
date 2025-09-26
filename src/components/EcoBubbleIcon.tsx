import React from 'react';

type Props = {
  size?: number;        // px (default 24)
  className?: string;   // para escalas/responsivo
};

const EcoBubbleIcon: React.FC<Props> = ({ size = 24, className }) => {
  return (
    <div
      className={`relative rounded-full ${className || ''}`}
      style={{
        width: size,
        height: size,
        background:
          'radial-gradient(115% 115% at 30% 25%, rgba(255,255,255,0.95), rgba(228,237,255,0.45))',
        border: '1px solid rgba(168, 196, 255, 0.55)',
        boxShadow:
          '0 10px 26px rgba(43, 63, 122, 0.16), inset 0 0 12px rgba(255,255,255,0.35)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
      aria-hidden
    >
      <span
        className="absolute inset-0 rounded-full"
        style={{
          background:
            'radial-gradient(80% 80% at 70% 30%, rgba(134,173,255,0.28), transparent)',
          filter: 'blur(6px)',
          opacity: 0.9,
          pointerEvents: 'none',
        }}
        aria-hidden
      />
    </div>
  );
};

export default EcoBubbleIcon;
