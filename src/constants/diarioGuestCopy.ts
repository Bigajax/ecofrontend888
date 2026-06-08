/**
 * Copy única do funil guest do Diário Estoico.
 *
 * Centraliza os CTAs/copys de conversão usados nos pontos guest do diário
 * (banner, hero, teasers mobile/desktop) para manter a mensagem idêntica e
 * com hierarquia consistente: criar conta = ação primária, entrar = secundária.
 *
 * Separador: "·" (U+00B7), nunca "•" — mesmo padrão de offerCopy.ts.
 */
export const DIARIO_GUEST = {
  /** CTA primário dominante (criar conta). */
  primaryCta: 'Criar conta grátis →',
  /** Linha de benefício sob o CTA. */
  benefit: 'Desbloqueie as 366 reflexões e salve seu progresso',
  /** Link secundário discreto (login). */
  loginLink: 'Já tenho conta · Entrar',
  /** Destino pós-cadastro/login. */
  returnTo: '/app/diario-estoico',
} as const;
