export type PlanId = "monthly" | "annual";

export interface TimelineItem {
  label: string;       // título do passo, em negrito — ex.: "Hoje", "Em 7 dias"
  description: string; // frase descritiva (estilo Headspace)
}

export const PLAN_COPY: Record<PlanId, {
  badge?: string;
  priceLine: string;       // shown in the plan selector
  priceNote?: string;      // small note next to the price (e.g. per-month)
  subPriceLine: string;
  timeline: TimelineItem[];
}> = {
  monthly: {
    priceLine: "R$ 15,90/mês",
    subPriceLine: "7 dias grátis · cancele quando quiser",
    timeline: [
      { label: "Hoje", description: "Desbloqueie a biblioteca completa da Ecotopia — Eco IA, meditações e sons para dormir." },
      { label: "Em 5 dias", description: "Enviaremos um e-mail lembrando que seu teste gratuito está terminando em breve." },
      { label: "Em 7 dias", description: "Será cobrada a mensalidade de R$ 15,90 — cancele antes para não pagar nada." },
    ],
  },
  annual: {
    badge: "Melhor valor",
    priceLine: "R$ 142,80/ano",
    priceNote: "(R$ 11,90/mês)",
    subPriceLine: "R$ 11,90/mês · economize R$ 48",
    timeline: [
      { label: "Hoje", description: "Desbloqueie a biblioteca completa da Ecotopia — Eco IA, meditações e sons para dormir." },
      { label: "Em 5 dias", description: "Enviaremos um e-mail lembrando que seu teste gratuito está terminando em breve." },
      { label: "Em 7 dias", description: "Será cobrado R$ 142,80 pelo primeiro ano — cancele antes para não pagar nada." },
    ],
  },
};
