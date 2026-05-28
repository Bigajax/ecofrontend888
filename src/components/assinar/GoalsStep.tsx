// src/components/assinar/GoalsStep.tsx

import { useState } from "react";
import { OBJETIVOS, type GoalId } from "./goalsData";

interface Props {
  onContinue: (answers: GoalId[]) => void;
  onSkip: () => void;
}

export function GoalsStep({ onContinue, onSkip }: Props) {
  const [selected, setSelected] = useState<GoalId[]>([]);

  const toggle = (id: GoalId) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const canContinue = selected.length > 0;

  return (
    <div
      className="flex min-h-[calc(100vh-120px)] flex-col gap-6 px-5 py-8 sm:rounded-3xl sm:px-6"
      style={{ background: "#1554F0", color: "#FFFFFF" }}
    >
      <h1 className="text-center font-display text-[26px] font-bold leading-[1.15]" style={{ color: "#FFFFFF" }}>
        Quais são os objetivos<br />que devemos perseguir<br />juntos?
      </h1>

      <ul className="mt-2 flex flex-col gap-3" role="list">
        {OBJETIVOS.map(({ id, label }) => {
          const active = selected.includes(id);
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => toggle(id)}
                aria-pressed={active}
                className="flex w-full items-center justify-between rounded-full px-5 py-4 text-left text-[15px] font-semibold transition-transform active:scale-[0.99]"
                style={{
                  background: "#FFFFFF",
                  color: "#0D3461",
                  boxShadow: active
                    ? "0 0 0 2px rgba(255,255,255,0.85) inset"
                    : "none",
                }}
              >
                <span>{label}</span>
                <span
                  aria-hidden
                  className="ml-3 inline-flex h-[22px] w-[22px] items-center justify-center rounded-full"
                  style={{
                    background: active ? "#1554F0" : "rgba(21,84,240,0.10)",
                    border: active ? "none" : "1.5px solid rgba(21,84,240,0.30)",
                  }}
                >
                  {active && <span className="block h-2.5 w-2.5 rounded-full" style={{ background: "#FFFFFF" }} />}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto flex flex-col gap-3 pt-4">
        <button
          type="button"
          onClick={() => onContinue(selected)}
          disabled={!canContinue}
          className="w-full rounded-full py-[18px] text-[16px] font-bold transition-transform active:scale-[0.98] disabled:cursor-not-allowed"
          style={{
            background: canContinue ? "#000000" : "rgba(0,0,0,0.45)",
            color: "#FFFFFF",
          }}
        >
          Continuar
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="w-full rounded-full py-4 text-[15px] font-semibold transition-transform active:scale-[0.98]"
          style={{ background: "#FFFFFF", color: "#0D3461" }}
        >
          Pular
        </button>
      </div>
    </div>
  );
}
