import { PLAN_COPY, type PlanId } from "./types";

interface TrialPlanPanelProps {
  selectedPlan: PlanId;
  onSelectPlan: (plan: PlanId) => void;
}

const PLANS: PlanId[] = ["annual", "monthly"];

export function TrialPlanPanel({ selectedPlan, onSelectPlan }: TrialPlanPanelProps) {
  const copy = PLAN_COPY[selectedPlan];

  return (
    <div
      className="flex h-full flex-col gap-8 p-8 md:p-12"
      style={{ background: "linear-gradient(160deg, #EBF6FF 0%, #DCEEFF 55%, #CFE6FF 100%)" }}
    >
      <div>
        <p className="eco-subtitle text-[15px]" style={{ color: "#3A6FA5" }}>Ecotopia</p>
        <h1 className="font-display text-[28px] md:text-[34px] font-bold leading-tight" style={{ color: "#0D3461" }}>
          {selectedPlan === "monthly"
            ? "Tenha a Ecotopia completa por R$ 0 hoje"
            : "1 ano de Ecotopia completa"}
        </h1>
      </div>

      {/* Plan selector */}
      <div className="flex flex-col gap-3" role="group" aria-label="Escolha o plano">
        {PLANS.map((plan) => {
          const c = PLAN_COPY[plan];
          const active = plan === selectedPlan;
          return (
            <button
              key={plan}
              type="button"
              aria-pressed={active}
              onClick={() => onSelectPlan(plan)}
              className="flex items-center justify-between rounded-2xl border px-5 py-4 text-left transition-all"
              style={{
                borderColor: active ? "#1A4FB5" : "rgba(13,52,97,0.15)",
                background: active ? "rgba(26,79,181,0.06)" : "rgba(255,255,255,0.6)",
                boxShadow: active ? "0 4px 16px rgba(13,52,97,0.12)" : "none",
              }}
            >
              <span>
                <span className="block font-display text-[16px] font-bold" style={{ color: "#0D3461" }}>
                  {plan === "annual" ? "Anual" : "Mensal"}
                </span>
                <span className="eco-subtitle block text-[13px]" style={{ color: "#5A8AAD" }}>{c.subPriceLine}</span>
              </span>
              <span className="flex flex-col items-end gap-1">
                {c.badge && (
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white" style={{ background: "#1A4FB5" }}>
                    {c.badge}
                  </span>
                )}
                <span className="font-display text-[15px] font-bold" style={{ color: "#0D3461" }}>{c.priceLine}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Timeline */}
      <ol className="flex flex-col gap-5">
        {copy.timeline.map((item, i) => (
          <li key={i} className="flex gap-4">
            <span className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: "#1A4FB5" }} aria-hidden />
            <span>
              <span className="block text-[12px] font-bold uppercase tracking-wide" style={{ color: "#3A6FA5" }}>{item.label}</span>
              <span className="block font-display text-[18px] font-bold" style={{ color: "#0D3461" }}>{item.title}</span>
              <span className="eco-subtitle block text-[13.5px] leading-snug" style={{ color: "#5A8AAD" }}>{item.description}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
