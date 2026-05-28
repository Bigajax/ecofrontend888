// src/components/assinar/ValidationStep.tsx

import { VALIDATION_CARDS } from "./goalsData";

interface Props {
  onContinue: () => void;
  onBack?: () => void;
}

export function ValidationStep({ onContinue, onBack }: Props) {
  return (
    <div
      className="flex min-h-[calc(100vh-120px)] flex-col gap-6 px-5 py-8 sm:rounded-3xl sm:px-6"
      style={{ background: "#1554F0", color: "#FFFFFF" }}
    >
      <h1 className="text-center font-display text-[26px] font-bold leading-[1.15]" style={{ color: "#FFFFFF" }}>
        Você está no lugar certo<br />para começar a se sentir<br />melhor
      </h1>
      <p className="text-center text-[15px] font-semibold leading-snug" style={{ color: "#FFFFFF" }}>
        A Ecotopia aumenta a felicidade<br />e diminui o estresse em apenas 10 dias
      </p>

      <ul className="mt-2 flex flex-col gap-3" role="list">
        {VALIDATION_CARDS.map((card) => (
          <li
            key={card.id}
            className="flex items-center justify-between gap-3 rounded-2xl px-5 py-5"
            style={{ background: "#0A2754" }}
          >
            <p className="flex-1 text-[15px] font-medium leading-[1.35]" style={{ color: "#FFFFFF" }}>
              {card.text}
            </p>
            <img
              src={card.icon}
              alt=""
              aria-hidden
              className="h-20 w-20 flex-none object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
              }}
            />
          </li>
        ))}
      </ul>

      <div className="mt-auto flex flex-col gap-3 pt-4">
        <button
          type="button"
          onClick={onContinue}
          className="w-full rounded-full py-[18px] text-[16px] font-bold transition-transform active:scale-[0.98]"
          style={{ background: "#000000", color: "#FFFFFF" }}
        >
          Experimente por $0
        </button>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="w-full rounded-full py-4 text-[15px] font-semibold transition-transform active:scale-[0.98]"
            style={{ background: "#FFFFFF", color: "#0D3461" }}
          >
            Voltar
          </button>
        )}
      </div>
    </div>
  );
}
