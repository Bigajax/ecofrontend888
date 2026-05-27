export type PlanId = "monthly" | "annual";

export interface TimelineItem {
  label: string;     // e.g. "Hoje"
  title: string;     // e.g. "R$ 0"
  description: string;
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
      { label: "Hoje", title: "R$ 0", description: "Acesso completo à Ecotopia — Eco IA, meditações e sono." },
      { label: "Em 5 dias", title: "Lembrete", description: "Avisamos por e-mail que seu teste gratuito está terminando." },
      { label: "Em 7 dias", title: "R$ 15,90/mês", description: "Primeira cobrança — cancele antes para não pagar nada. Renova mensalmente." },
    ],
  },
  annual: {
    badge: "Melhor valor",
    priceLine: "R$ 142,80/ano",
    priceNote: "(R$ 11,90/mês)",
    subPriceLine: "R$ 11,90/mês · economize R$ 48",
    timeline: [
      { label: "Hoje", title: "R$ 142,80", description: "1 ano de acesso completo — equivale a R$ 11,90/mês." },
      { label: "Imediato", title: "12 meses", description: "Acesso liberado na hora. Sem renovação surpresa." },
    ],
  },
};
