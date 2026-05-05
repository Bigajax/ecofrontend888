import React from 'react';
import { ChevronRight } from 'lucide-react';

interface CardListProps {
  image?: string;
  title: string;
  subtitle?: string;
  tag?: string;
  progress?: number;
  onClick?: () => void;
}

export function CardList({ image, title, subtitle, tag, progress, onClick }: CardListProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full py-3 px-1 text-left"
      style={{ borderBottom: '1px solid var(--neutral-border)' }}
    >
      {image && (
        <img src={image} alt={title}
          className="w-[72px] h-[72px] rounded-[12px] object-cover flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-medium leading-snug truncate"
          style={{ color: 'var(--text-primary)' }}>
          {title}
        </p>
        {subtitle && (
          <p className="text-[13px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
            {subtitle}
          </p>
        )}
        {progress !== undefined && (
          <div className="mt-2 h-[3px] rounded-full w-full" style={{ background: 'var(--neutral-border)' }}>
            <div className="h-full rounded-full" style={{ width: `${Math.min(progress * 100, 100)}%`, background: 'var(--accent)' }} />
          </div>
        )}
        {tag && (
          <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
            style={{ background: 'var(--neutral-hover)', color: 'var(--accent)' }}>
            {tag}
          </span>
        )}
      </div>
      <ChevronRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
    </button>
  );
}
