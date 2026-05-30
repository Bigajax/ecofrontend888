// src/components/assinar/ValidationStep.tsx

import { VALIDATION_CARDS } from "./goalsData";

interface Props {
  onContinue: () => void;
  onBack?: () => void;
}

export function ValidationStep({ onContinue, onBack }: Props) {
  return (
    <div
      className="flex min-h-[calc(100vh-120px)] flex-col gap-6 bg-[#1554F0] px-5 py-8 text-white md:min-h-0 md:bg-transparent md:px-2 md:py-4"
    >
      <h1 className="text-center font-display text-[26px] font-bold leading-[1.15] text-white md:text-[32px]">
        Você está no lugar certo<br />para começar a se sentir<br />melhor
      </h1>
      <p className="text-center text-[15px] font-semibold leading-snug text-white md:text-[16px]">
        A Ecotopia aumenta a felicidade<br />e diminui o estresse em apenas 10 dias
      </p>

      <ul className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4" role="list">
        {VALIDATION_CARDS.map((card) => (
          <li
            key={card.id}
            className="relative flex items-center overflow-hidden rounded-3xl bg-[rgba(13,52,97,0.55)] py-4 pl-5 pr-[120px] md:py-5 md:pl-6 md:pr-[130px]"
          >
            <p className="text-[15px] font-medium leading-[1.35] text-white md:text-[15.5px]">
              {card.text}
            </p>
            <img
              src={card.icon}
              alt=""
              aria-hidden
              className="pointer-events-none absolute right-1 top-1/2 h-[140px] w-[140px] -translate-y-1/2 object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
              }}
            />
          </li>
        ))}
      </ul>

      <div className="mt-auto flex flex-col gap-3 pt-4 md:mx-auto md:mt-6 md:max-w-[460px] md:flex-row-reverse md:justify-center md:gap-4">
        <button
          type="button"
          onClick={onContinue}
          className="w-full rounded-full bg-black py-[18px] text-[16px] font-bold text-white transition-transform active:scale-[0.98] md:px-12 md:py-4"
        >
          Experimente por $0
        </button>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="w-full rounded-full bg-white py-4 text-[15px] font-semibold text-[#0D3461] transition-transform active:scale-[0.98] md:w-auto md:px-12"
          >
            Voltar
          </button>
        )}
      </div>
    </div>
  );
}
