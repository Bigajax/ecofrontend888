import React from 'react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: { label: string; onClick: () => void };
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-3">
      <div>
        <h2 className="text-[20px] font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h2>
        {subtitle && (
          <p className="eco-subtitle text-[13px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
        )}
      </div>
      {action && (
        <button onClick={action.onClick} className="text-[13px] font-medium mt-1 flex-shrink-0"
          style={{ color: 'var(--accent)' }}>
          {action.label}
        </button>
      )}
    </div>
  );
}
