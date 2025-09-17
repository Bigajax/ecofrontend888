import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Suggestion } from "./QuickSuggestions";

type Props = {
  items: Suggestion[];
  onPick: (s: Suggestion) => void;
  /** tempo entre trocas */
  intervalMs?: number; // default 9000
  className?: string;
};

export default function RotatingPrompts({
  items,
  onPick,
  intervalMs = 9000,
  className = "",
}: Props) {
  const [idx, setIdx] = useState(0);
  const timerRef = useRef<number | null>(null);

  const start = () => {
    stop();
    timerRef.current = window.setInterval(() => {
      setIdx((i) => (i + 1) % items.length);
    }, intervalMs);
  };
  const stop = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    if (!items.length) return;
    start();
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, intervalMs]);

  if (!items.length) return null;
  const current = items[idx];

  return (
    <div
      className={
        "w-full flex justify-center select-none mt-2 " + (className || "")
      }
      onMouseEnter={stop}
      onMouseLeave={start}
    >
      <button
        onClick={() => onPick(current)}
        className="
          inline-flex items-center gap-2 rounded-full
          bg-white/70 backdrop-blur border border-gray-200
          shadow-sm hover:shadow transition px-3.5 py-2
          text-[13px] md:text-sm text-slate-700
          focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300
        "
        title="Sugerir um tema"
        aria-label={`Sugerir: ${current.label}`}
      >
        {current.icon && (
          <span className="text-base md:text-[17px]">{current.icon}</span>
        )}
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={current.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="font-medium"
          >
            {current.label}
          </motion.span>
        </AnimatePresence>
      </button>
    </div>
  );
}
