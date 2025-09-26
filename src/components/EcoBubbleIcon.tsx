import React from 'react';

type Props = {
  size?: number;
  className?: string;
};

const EcoBubbleIcon: React.FC<Props> = ({ size = 24, className }) => {
  return (
    <span
      aria-hidden
      className={className}
      style={{
        display: 'inline-flex',
        width: size,
        height: size,
        borderRadius: '999px',
        background:
          'radial-gradient(120% 120% at 30% 20%, rgba(255,255,255,0.95), rgba(226,232,240,0.45)), linear-gradient(160deg, rgba(255,255,255,0.85), rgba(209,213,219,0.55))',
        border: '1px solid rgba(255,255,255,0.7)',
        boxShadow: '0 6px 18px rgba(15,23,42,0.12), inset 0 1px 0 rgba(255,255,255,0.65)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    />
  );
};

export default EcoBubbleIcon;
