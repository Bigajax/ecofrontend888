import React, { useMemo } from 'react';
import clsx from 'clsx';

import type { Suggestion } from './QuickSuggestions';
import { DEFAULT_SUGGESTIONS } from './QuickSuggestions';

type SuggestionChipsProps = {
  visible: boolean;
  suggestions?: Suggestion[];
  onPick?: (suggestion: Suggestion, index: number) => void;
  disabled?: boolean;
  className?: string;
};

const labelClass =
  'text-[15px] leading-[1.35] tracking-[-0.005em] text-slate-800 antialiased';

const SuggestionChips: React.FC<SuggestionChipsProps> = ({
  visible,
  suggestions,
  onPick,
  disabled = false,
  className,
}) => {
  const items = useMemo(
    () => suggestions && suggestions.length > 0 ? suggestions : DEFAULT_SUGGESTIONS,
    [suggestions],
  );

  if (!visible || !items.length) {
    return null;
  }

  return (
    <div
      className={clsx(
        'relative w-full',
        className,
      )}
      role="list"
      aria-label="Sugestões rápidas"
    >
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-[color:var(--color-bg-base)] via-[color:var(--color-bg-base)]/85 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[color:var(--color-bg-base)] via-[color:var(--color-bg-base)]/85 to-transparent"
        aria-hidden
      />
      <div
        className="suggestion-scroll no-scrollbar flex items-center gap-2 overflow-x-auto px-3 py-1"
        style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
      >
        {items.map((suggestion, index) => (
          <button
            key={suggestion.id}
            type="button"
            role="listitem"
            onClick={() => {
              if (disabled) return;
              onPick?.(suggestion, index);
            }}
            disabled={disabled}
            data-suggestion-id={suggestion.id}
            className={clsx(
              'inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-white px-4 text-left shadow-[0_8px_24px_rgba(15,23,42,0.08)] transition-all duration-200',
              'hover:bg-white hover:shadow-[0_10px_30px_rgba(15,23,42,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(15,23,42,0.12)]',
              disabled ? 'cursor-not-allowed opacity-60' : 'active:translate-y-[1px]'
            )}
            style={{ scrollSnapAlign: 'start' }}
          >
            {suggestion.icon && (
              <span className="text-[16px] leading-none" aria-hidden>
                {suggestion.icon}
              </span>
            )}
            <span className={labelClass}>{suggestion.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SuggestionChips;
