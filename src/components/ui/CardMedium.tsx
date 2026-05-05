import React from 'react';

interface CardMediumProps {
  image: string;
  title: string;
  tag?: string;
  duration?: string;
  locked?: boolean;
  onClick?: () => void;
}

export function CardMedium({ image, title, tag, duration, locked, onClick }: CardMediumProps) {
  return (
    <button
      onClick={onClick}
      className="relative overflow-hidden rounded-[16px] w-full text-left"
      style={{ aspectRatio: '4/5', boxShadow: 'var(--shadow-card)' }}
    >
      <img src={image} alt={title} className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(to top, rgba(10,15,30,0.88) 0%, transparent 55%)'
      }} />
      {locked && (
        <div className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs"
          style={{ background: 'rgba(10,15,30,0.60)', backdropFilter: 'blur(6px)' }}>
          🔒
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        {duration && (
          <p className="text-white/70 text-xs mb-1">{duration}</p>
        )}
        <p className="text-white text-sm font-medium leading-tight">{title}</p>
        {tag && (
          <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
            style={{ background: 'rgba(110,200,255,0.25)', color: '#6EC8FF' }}>
            {tag}
          </span>
        )}
      </div>
    </button>
  );
}
