import { Link } from "react-router-dom";
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
          <>Viva a experiência completa<br />da Ecotopia por <span style={{ color: "#1A8A4A" }}>R$ 0 hoje</span></>
        ) : (
          <>Viva a experiência completa<br />da Ecotopia por <span style={{ color: "#1A8A4A" }}>1 ano</span></>
        )}
      </h1>

      <TrialPlanPanel selectedPlan={selectedPlan} onSelectPlan={onSelectPlan} />

      <button
        type="button"
        onClick={onContinue}
        className="w-full rounded-full bg-[#1554F0] py-4 text-[17px] font-bold text-white transition-all hover:-translate-y-[1px] hover:bg-[#1148D6]"
        style={{ boxShadow: "0 6px 20px rgba(21,84,240,0.30)" }}
      >
        Comece seu teste gratuito
      </button>

      <p className="text-center text-[12px]" style={{ color: "#5A8AAD" }}>
        {isMonthly
          ? "7 dias grátis, depois R$ 15,90/mês. "
          : "7 dias grátis, depois R$ 142,80/ano. "}
        <Link
          to="/cancelar-assinatura"
          className="underline underline-offset-2 transition-colors hover:opacity-80"
          style={{ color: "#1554F0" }}
        >
          Cancele quando quiser.
        </Link>
      </p>
    </div>
  );
}
