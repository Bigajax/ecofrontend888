// src/components/assinar/ValidationStep.tsx

import { VALIDATION_CARDS } from "./goalsData";

interface Props {
  onContinue: () => void;
}

export function ValidationStep({ onContinue }: Props) {
  return (
    <div
      className="flex min-h-[calc(100vh-120px)] flex-col gap-6 rounded-2xl px-6 py-8"
      style={{ background: "#1554F0", color: "#FFFFFF" }}
    >
      <h1 className="text-center font-display text-[24px] font-bold leading-tight">
        Você está no lugar certo<br />para começar a<br />se sentir melhor.
      </h1>
      <p className="eco-subtitle text-center text-[15px] leading-snug" style={{ color: "rgba(255,255,255,0.92)" }}>
        Está comprovado que a Ecotopia aumenta a felicidade<br />e diminui o estresse em apenas 10 dias.
      </p>

      <ul className="mt-2 flex flex-col gap-3" role="list">
        {VALIDATION_CARDS.map((card) => (
          <li
            key={card.id}
            className="flex items-center gap-4 rounded-2xl px-4 py-4"
            style={{ background: "rgba(13,52,97,0.55)" }}
          >
            <img src={card.icon} alt="" aria-hidden className="h-12 w-12 flex-none" />
            <p className="text-[14px] leading-snug">{card.text}</p>
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-4">
        <button
          type="button"
          onClick={onContinue}
          className="w-full rounded-full py-4 text-[16px] font-bold"
          style={{ background: "#0D3461", color: "#FFFFFF" }}
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
