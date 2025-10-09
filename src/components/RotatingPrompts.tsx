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
};

const defaultLabelCls =
  "text-[15px] leading-[1.35] text-slate-900/95 font-normal tracking-[-0.005em] antialiased";

const RotatingPrompts = ({
  items,
  onPick,
  intervalMs = 4500,
  className = "",
  labelClassName = defaultLabelCls,
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
        onClick={() => onPick(s, { source: "rotating", index: idx })}
        onFocus={() => (pauseRef.current = true)}
        onBlur={() => (pauseRef.current = false)}
        className="
          group inline-flex items-center gap-2
          h-10 px-3.5 rounded-full
          bg-white/85 backdrop-blur-md
          border border-black/10
          shadow-[0_10px_28px_rgba(16,24,40,0.10)]
          hover:bg-white focus:outline-none
          focus-visible:ring-2 focus-visible:ring-black/10
          active:translate-y-[1px] transition
        "
        aria-label={s.label}
      >
        {s.icon && (
          <span className="text-[16px] leading-none" aria-hidden>
            {s.icon}
          </span>
        )}
        <span className={labelClassName}>{s.label}</span>

        {/* indicador sutil de “rotativo” */}
        <span
          className="
            ml-1 inline-block h-1.5 w-1.5 rounded-full bg-slate-400/70
            group-hover:bg-slate-500/80
            animate-[pulse_1.4s_ease-in-out_infinite]
          "
          aria-hidden
        />
      </button>
    </div>
  );
};

export default RotatingPrompts;
