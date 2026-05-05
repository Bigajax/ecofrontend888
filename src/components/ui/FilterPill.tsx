import React from 'react';

interface FilterPillProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
}

export function FilterPill({ label, active, onClick }: FilterPillProps) {
  return (
    <button
      onClick={onClick}
      className="h-9 px-4 rounded-full text-[12px] font-semibold uppercase tracking-wider whitespace-nowrap transition-all duration-200 active:scale-95 flex-shrink-0"
      style={active ? {
        background: 'var(--accent)',
        color: 'var(--accent-dark)',
        border: 'none',
      } : {
        background: 'transparent',
        color: 'var(--text-secondary)',
        border: '1.5px solid var(--neutral-border)',
      }}
    >
      {label}
    </button>
  );
}
