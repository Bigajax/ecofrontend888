import React from "react";

type QuickSuggestionsProps = {
  visible: boolean;
  onPick: (text: string) => void;
  className?: string;
};

const SUGGESTIONS = [
  "🌌 Quero falar sobre como me sinto",
  "🌱 Quero refletir sobre meu dia",
  "🎯 Preciso de clareza sobre algo",
  "🔎 Quero explorar um pensamento",
];

export default function QuickSuggestions({
  visible,
  onPick,
  className = "",
}: QuickSuggestionsProps) {
  if (!visible) return null;

  return (
    <div
      className={
        // ocupa a largura toda no mobile (encosta nas bordas) e centraliza no md+
        "relative w-full max-w-2xl mx-auto -mt-0.5 mb-2 " + className
      }
      aria-label="Atalhos de início"
    >
      {/* trilho com scroll horizontal no mobile; quebra em linhas no md+ */}
      <div
        className="
          hide-scrollbar
          flex items-center gap-2
          overflow-x-auto md:overflow-visible
          md:flex-wrap md:justify-center
          pb-1 px-2 -mx-2   /* encosta nas bordas no mobile */
          snap-x snap-mandatory
        "
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {SUGGESTIONS.map((label) => (
          <button
            key={label}
            onClick={() => onPick(label)}
            className="
              snap-start
              inline-flex items-center
              rounded-full
              px-3 py-1.5 text-[13px] leading-tight md:text-sm md:px-3.5 md:py-2
              bg-white/75 backdrop-blur
              border border-gray-200 shadow-sm
              hover:bg-white hover:shadow
              focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/50
              active:translate-y-[1px]
              transition
              whitespace-nowrap
            "
            aria-label={`Sugerir: ${label}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* fades nas bordas (apenas quando tem scroll) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-white to-transparent md:hidden"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-white to-transparent md:hidden"
      />

      {/* util: esconder scrollbar em todos os browsers */}
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
