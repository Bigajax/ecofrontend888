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
        "w-full max-w-2xl mx-auto -mt-1 mb-2 " + className
      }
      aria-label="Atalhos de início"
    >
      <div
        className="
          flex md:flex-wrap md:justify-center items-center gap-2
          overflow-x-auto md:overflow-visible pb-1
          snap-x snap-mandatory
          hide-scrollbar
        "
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {SUGGESTIONS.map((label) => (
          <button
            key={label}
            onClick={() => onPick(label)}
            className="
              snap-start
              rounded-full px-3.5 py-2 text-sm md:text-[0.95rem]
              bg-white/70 backdrop-blur
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

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
