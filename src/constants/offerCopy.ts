/**
 * Fonte única da copy da oferta comercial (trial + recorrência).
 *
 * Texto canônico derivado da PrecoSection da landing
 * (src/components/landing/PrecoSection.tsx). Qualquer copy de oferta no app
 * — gates, modais, funis, checkout — deve usar estes tokens para manter
 * "7 dias gratuitos · depois R$ 15,90/mês · cancele quando quiser" idêntico
 * em todo ponto de conversão.
 *
 * Regras: usar "·" (U+00B7) como separador, nunca "•". O miolo é sempre
 * "7 dias gratuitos" (não "7 dias grátis").
 */
export const OFFER = {
  /** Rótulo do trial. */
  trial: '7 dias gratuitos',
  /** Trial + cancelamento genérico. */
  trialCancel: '7 dias gratuitos · cancele quando quiser',
  /** Trial + cancelamento em 1 clique (bullet curto). */
  trialCancel1Click: '7 dias gratuitos · cancele em 1 clique',
  /** Trial + preço de recorrência. */
  trialAfterPrice: '7 dias gratuitos · depois R$ 15,90/mês',
  /** CTA padrão de início do trial. */
  ctaStartTrial: 'Começar 7 dias gratuitos',

  /** Preço mensal. */
  priceMonthly: 'R$ 15,90/mês',
  /** Preço anual exibido como equivalente mensal. */
  priceAnnualMonthly: 'R$ 11,90/mês',
  /** Preço anual total. */
  priceAnnualTotal: 'R$ 142,80 cobrado anualmente · economize R$ 48',

  /** Nota de recorrência mensal (sob o preço). */
  renewNote: 'Renovação mensal · cancele quando quiser',
  /** Cancelamento genérico (fragmento). */
  cancelAnytime: 'cancele quando quiser',
} as const;

/**
 * Valores numéricos (BRL) da oferta — fonte única para eventos de conversão
 * (Meta Pixel, Mixpanel) e qualquer cálculo de checkout. Mantém os números
 * alinhados com a copy acima.
 */
export const PRICE = {
  /** Recorrência mensal. */
  monthly: 15.9,
  /** Total cobrado no plano anual. */
  annualTotal: 142.8,
  /** Equivalente mensal do plano anual. */
  annualMonthly: 11.9,
  currency: 'BRL',
} as const;

/**
 * Valor numérico de um plano para eventos de conversão. Plano anual usa o
 * total cobrado; o padrão (plano ausente/desconhecido) também é o anual,
 * que é o CTA primário das landings.
 */
export function planValue(plan?: string | null): number {
  return plan === 'monthly' ? PRICE.monthly : PRICE.annualTotal;
}
