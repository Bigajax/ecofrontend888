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
  'text-[15px] font-medium leading-[1.4] tracking-[-0.01em] text-neutral-700 antialiased';

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
              'inline-flex h-11 shrink-0 items-center gap-2 rounded-2xl border border-[rgba(0,0,0,0.05)] bg-white px-4 text-left text-neutral-700 shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition-all duration-200',
              'hover:scale-[1.01] hover:shadow-[0_2px_6px_rgba(0,0,0,0.06)] focus-visible:outline-none focus-visible:ring-0',
              disabled ? 'cursor-not-allowed opacity-60' : 'active:translate-y-[0.5px]'
            )}
            style={{ scrollSnapAlign: 'start' }}
          >
            {suggestion.icon && (
              <span className="text-[16px] leading-none text-neutral-600/80" aria-hidden>
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
