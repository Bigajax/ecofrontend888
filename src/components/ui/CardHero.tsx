import React from 'react';

interface CardHeroProps {
  image: string;
  title: string;
  subtitle?: string;
  duration?: string;
  tag?: string;
  onClick?: () => void;
  locked?: boolean;
}

export function CardHero({ image, title, subtitle, duration, tag, onClick, locked }: CardHeroProps) {
  return (
    <button
      onClick={onClick}
      className="relative w-full overflow-hidden rounded-[20px] min-h-[200px] text-left"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <img
        src={image}
        alt={title}
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(to top, rgba(10,15,30,0.92) 0%, rgba(10,15,30,0.3) 50%, transparent 100%)'
      }} />
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
        {duration && (
          <span className="px-2 py-1 rounded-full text-[11px] font-medium text-white"
            style={{ background: 'rgba(10,15,30,0.55)', backdropFilter: 'blur(8px)' }}>
            {duration}
          </span>
        )}
        {locked && (
          <span className="w-6 h-6 rounded-full flex items-center justify-center ml-auto text-xs"
            style={{ background: 'rgba(10,15,30,0.55)', backdropFilter: 'blur(8px)' }}>
            🔒
          </span>
        )}
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-4">
        {tag && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider mb-2"
            style={{ background: 'rgba(110,200,255,0.25)', color: '#6EC8FF' }}>
            {tag}
          </span>
        )}
        <p className="text-white font-serif text-lg leading-tight">{title}</p>
        {subtitle && <p className="text-white/70 text-sm mt-1">{subtitle}</p>}
      </div>
    </button>
  );
}
