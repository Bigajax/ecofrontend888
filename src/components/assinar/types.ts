import { OFFER } from "@/constants/offerCopy";

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
    priceLine: OFFER.priceMonthly,
    subPriceLine: OFFER.trialCancel,
    timeline: [
      { label: "Hoje", description: "Desbloqueie o Protocolo do Sono completo + meditações, sons para dormir e Eco IA." },
      { label: "Em 5 dias", description: "Enviaremos um e-mail lembrando que seu teste gratuito está terminando em breve." },
      { label: "Em 7 dias", description: "Será cobrada a mensalidade de R$ 15,90 — cancele antes e não pague nada." },
    ],
  },
  annual: {
    badge: "Economize 25%",
    // O total (R$ 142,80) só aparece depois que o anual é selecionado —
    // na timeline e no microcopy do CTA. No card, a âncora é o per-mês.
    priceLine: OFFER.priceAnnualMonthly,
    subPriceLine: "R$ 11,90/mês · economize R$ 48",
    timeline: [
      { label: "Hoje", description: "Desbloqueie o Protocolo do Sono completo + meditações, sons para dormir e Eco IA." },
      { label: "Em 5 dias", description: "Enviaremos um e-mail lembrando que seu teste gratuito está terminando em breve." },
      { label: "Em 7 dias", description: "Será cobrado R$ 142,80 pelo primeiro ano — cancele antes para não pagar nada." },
    ],
  },
};
