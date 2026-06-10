import { PLAN_COPY, type PlanId } from "./types";

interface TrialPlanPanelProps {
  selectedPlan: PlanId;
  onSelectPlan: (plan: PlanId) => void;
}

const PLANS: PlanId[] = ["monthly", "annual"];

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
          style={{ background: "linear-gradient(to bottom, #1554F0, #BCCBFF)" }}
        />
        {copy.timeline.map((item, i) => {
          const fill = i === 0 ? "#1554F0" : i === 1 ? "#6B8DFF" : "#BCCBFF";
          return (
            <li key={i} className="relative">
              <span
                aria-hidden
                className="absolute -left-8 top-0.5 flex h-5 w-5 items-center justify-center rounded-full"
                style={{
                  background: i === 0 ? "rgba(21, 84, 240, 0.22)" : fill,
                }}
              >
                {i === 0 && (
                  <span
                    className="block h-2.5 w-2.5 rounded-full"
                    style={{ background: fill }}
                  />
                )}
              </span>
              <span className="block font-display text-[16px] font-bold leading-tight" style={{ color: "#0D3461" }}>{item.label}</span>
              <span className="eco-subtitle mt-1 block text-[13.5px] leading-snug" style={{ color: "#5A8AAD" }}>{item.description}</span>
            </li>
          );
        })}
      </ol>

      <p className="eco-subtitle text-center text-[13px] leading-snug" style={{ color: "#5A8AAD" }}>
        Junte-se a quem já aprendeu a desligar a mente antes de dormir.
      </p>

      {/* Plan selector — 2 colunas (estilo Headspace) */}
      <div className="flex gap-2.5 rounded-2xl border p-3" style={{ borderColor: "rgba(0,0,0,0.08)" }} role="group" aria-label="Escolha o plano">
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
                background: active ? "#2B2B2B" : "#FFFFFF",
                color: active ? "#FFFFFF" : "#1A1A1A",
                border: active ? "none" : "1px solid rgba(0,0,0,0.08)",
              }}
            >
              {c.badge && (
                <span
                  className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded px-2.5 py-[3px] text-[11px] font-bold text-white"
                  style={{ background: "#1EA455" }}
                >
                  {c.badge}
                </span>
              )}
              <span className="block pr-6 text-[13px]" style={{ color: active ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.55)" }}>
                {plan === "annual" ? "Anual" : "Mensal"}
              </span>
              <span className="mt-1 block font-display text-[16px] font-bold leading-tight" style={{ color: active ? "#FFFFFF" : "#1A1A1A" }}>
                {c.priceLine}
                {c.priceNote && (
                  <span className="ml-1 text-[12px] font-normal" style={{ color: active ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.5)" }}>
                    {c.priceNote}
                  </span>
                )}
              </span>
              <span
                className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full text-[12px] font-bold"
                style={{
                  background: "#FFFFFF",
                  color: "#2B2B2B",
                  border: active ? "none" : "1px solid #CFC4B6",
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
