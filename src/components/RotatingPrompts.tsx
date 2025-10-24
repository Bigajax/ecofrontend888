// src/components/RotatingPrompts.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import type { Suggestion, SuggestionPickMeta } from "./QuickSuggestions";

type Props = {
  items: Suggestion[];
  onPick: (s: Suggestion, meta?: SuggestionPickMeta) => void;
  /** intervalo de troca em ms (default 4500) */
  intervalMs?: number;
  className?: string;
  /** para manter a mesma tipografia do Drawer */
  labelClassName?: string;
  disabled?: boolean;
};

const defaultLabelCls =
  "text-[15px] font-medium leading-[1.4] tracking-[-0.01em] text-neutral-700 antialiased";

const RotatingPrompts = ({
  items,
  onPick,
  intervalMs = 4500,
  className = "",
  labelClassName = defaultLabelCls,
  disabled = false,
}: Props) => {
  const safeItems = useMemo(() => (Array.isArray(items) ? items.filter(Boolean) : []), [items]);

  // começa em um índice válido e aleatório, se houver itens
  const [idx, setIdx] = useState(() =>
    safeItems.length ? Math.floor(Math.random() * safeItems.length) : 0
  );

  const pauseRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  // se a lista mudar de tamanho, garante que o idx continue válido
  useEffect(() => {
    if (!safeItems.length) {
      setIdx(0);
      return;
    }
    if (idx >= safeItems.length) setIdx(0);
  }, [safeItems.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // troca automática (apenas se houver 2+ itens)
  useEffect(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (safeItems.length < 2) return;

    const id = window.setInterval(() => {
      if (pauseRef.current) return;
      setIdx((i) => (i + 1) % safeItems.length);
    }, Math.max(1500, intervalMs));

    timerRef.current = id;

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [safeItems.length, intervalMs]);

  if (!safeItems.length) return null;
  const s = safeItems[Math.min(idx, safeItems.length - 1)];

  return (
    <div
      className={`flex justify-center ${className}`}
      onMouseEnter={() => (pauseRef.current = true)}
      onMouseLeave={() => (pauseRef.current = false)}
    >
      <button
        type="button"
        onClick={() => {
          if (disabled) return;
          onPick(s, { source: "rotating", index: idx });
        }}
        onFocus={() => (pauseRef.current = true)}
        onBlur={() => (pauseRef.current = false)}
        className="group inline-flex h-11 items-center gap-2 rounded-full border border-[rgba(0,0,0,0.05)] bg-white/85 px-4 py-2 text-neutral-700 shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition-all duration-200 hover:scale-[1.01] hover:shadow-[0_2px_6px_rgba(0,0,0,0.06)] focus:outline-none focus:ring-0"
        aria-label={s.label}
        disabled={disabled}
      >
        {s.icon && (
          <span className="text-[16px] leading-none text-neutral-600/80" aria-hidden>
            {s.icon}
          </span>
        )}
        <span className={labelClassName}>{s.label}</span>

        {/* indicador sutil de “rotativo” */}
        <span
          className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-neutral-400/70 group-hover:bg-neutral-500/80 animate-[pulse_1.4s_ease-in-out_infinite]"
          aria-hidden
        />
      </button>
    </div>
  );
};

export default RotatingPrompts;
