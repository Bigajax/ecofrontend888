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
      className={"w-full max-w-2xl mx-auto mb-2 " + className}
      aria-label="Atalhos de início"
    >
      {/* mobile: coluna (uma por linha) | md+: pílulas com wrap centralizado */}
      <div className="flex flex-col md:flex-row md:flex-wrap md:justify-center gap-2">
        {SUGGESTIONS.map((label) => (
          <button
            key={label}
            onClick={() => onPick(label)}
            className="rounded-full w-full md:w-auto text-[13px] md:text-sm px-3.5 py-2 text-left md:text-center bg-white border border-gray-200 shadow-sm hover:shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/50 active:translate-y-[1px] transition"
            aria-label={`Sugerir: ${label}`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
