import { HeroIllustration } from "./HeroIllustration";
import { TrialPlanPanel } from "./TrialPlanPanel";
import type { PlanId } from "./types";

interface PlanStepProps {
  selectedPlan: PlanId;
  onSelectPlan: (plan: PlanId) => void;
  onContinue: () => void;
}

export function PlanStep({ selectedPlan, onSelectPlan, onContinue }: PlanStepProps) {
  const isMonthly = selectedPlan === "monthly";

  return (
    <div className="flex flex-col gap-5">
      <HeroIllustration />

      <h1 className="text-center font-display text-[24px] font-bold leading-tight" style={{ color: "#0D3461" }}>
        {isMonthly ? (
          <>Tenha a Ecotopia completa<br />por <span style={{ color: "#1A8A4A" }}>R$ 0 hoje</span></>
        ) : (
          <>1 ano de Ecotopia completa</>
        )}
      </h1>

      <TrialPlanPanel selectedPlan={selectedPlan} onSelectPlan={onSelectPlan} />

      <button
        type="button"
        onClick={onContinue}
        className="w-full rounded-full py-4 text-[17px] font-bold text-white transition-all hover:-translate-y-[1px]"
        style={{ background: "linear-gradient(135deg, #1A4FB5 0%, #0D3461 100%)", boxShadow: "0 6px 20px rgba(13,52,97,0.28)" }}
      >
        {isMonthly ? "Começar 7 dias grátis" : "Assinar anual"}
      </button>

      <p className="text-center text-[12px]" style={{ color: "#5A8AAD" }}>
        {isMonthly
          ? "7 dias grátis, depois R$ 15,90/mês. Cancele quando quiser."
          : "R$ 142,80/ano. Cancele quando quiser."}
      </p>
    </div>
  );
}
