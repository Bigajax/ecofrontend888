import { PLAN_COPY, type PlanId } from "./types";

interface TrialPlanPanelProps {
  selectedPlan: PlanId;
  onSelectPlan: (plan: PlanId) => void;
}

const PLANS: PlanId[] = ["annual", "monthly"];

/**
 * Timeline do trial + seletor de planos (2 colunas), estilo Headspace
 * adaptado à Ecotopia. Usado dentro do PlanStep.
 */
export function TrialPlanPanel({ selectedPlan, onSelectPlan }: TrialPlanPanelProps) {
  const copy = PLAN_COPY[selectedPlan];

  return (
    <div className="flex flex-col gap-6">
      {/* Timeline */}
      <ol className="relative flex flex-col gap-[18px] pl-8">
        <span
          aria-hidden
          className="absolute left-[9px] top-2 bottom-2 w-[2px]"
          style={{ background: "linear-gradient(to bottom, #1A4FB5, #B8C6FF)" }}
        />
        {copy.timeline.map((item, i) => (
          <li key={i} className="relative">
            <span
              aria-hidden
              className="absolute -left-8 top-0.5 h-5 w-5 rounded-full border-[3px] bg-white"
              style={{ borderColor: i === 0 ? "#1A4FB5" : i === 1 ? "#5C7BFF" : "#B8C6FF" }}
            />
            <span className="block text-[12px] font-bold uppercase tracking-wide" style={{ color: "#3A6FA5" }}>{item.label}</span>
            <span className="block font-display text-[16px] font-bold" style={{ color: "#0D3461" }}>{item.title}</span>
            <span className="eco-subtitle block text-[13.5px] leading-snug" style={{ color: "#5A8AAD" }}>{item.description}</span>
          </li>
        ))}
      </ol>

      {/* Plan selector — 2 colunas */}
      <div className="flex gap-2.5 rounded-2xl border p-3" style={{ borderColor: "rgba(13,52,97,0.12)" }} role="group" aria-label="Escolha o plano">
        {PLANS.map((plan) => {
          const c = PLAN_COPY[plan];
          const active = plan === selectedPlan;
          return (
            <button
              key={plan}
              type="button"
              aria-pressed={active}
              onClick={() => onSelectPlan(plan)}
              className="relative flex-1 rounded-xl px-3 py-4 text-left transition-all"
              style={{
                background: active ? "#0D3461" : "#EEF4FA",
                color: active ? "#FFFFFF" : "#0D3461",
              }}
            >
              {c.badge && (
                <span
                  className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded px-2.5 py-[3px] text-[11px] font-bold text-white"
                  style={{ background: "#1A4FB5" }}
                >
                  {c.badge}
                </span>
              )}
              <span className="block text-[13px]" style={{ color: active ? "rgba(255,255,255,0.8)" : "#5A8AAD" }}>
                {plan === "annual" ? "Anual" : "Mensal"}
              </span>
              <span className="mt-1 block font-display text-[16px] font-bold leading-tight">{c.priceLine}</span>
              <span
                className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full text-[12px] font-bold"
                style={{
                  background: active ? "#FFFFFF" : "#FFFFFF",
                  color: "#0D3461",
                  border: active ? "none" : "1px solid #CBD6E2",
                }}
              >
                {active ? "✓" : ""}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
