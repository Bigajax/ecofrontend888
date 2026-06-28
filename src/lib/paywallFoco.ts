/**
 * Kill-switch do teste "paywall focado" (KISS #4): tocar conteúdo bloqueado
 * (Noite 2–7 / "Continuar Noite 2") abre a oferta R$37 como overlay focado, com
 * o card no topo. Rollout sequencial a 100% → default ON; a flag existe só pra
 * rollback rápido sem deploy.
 *
 * Precedência: override de teste no localStorage > env > default ON.
 * - localStorage `eco.paywall_foco` = '0' (off) | '1' (on) — teste manual.
 * - `VITE_PAYWALL_FOCO` = 'false' desliga em produção (rollback). Ausente = ON.
 */
export function isPaywallFoco(): boolean {
  try {
    const override = localStorage.getItem('eco.paywall_foco');
    if (override === '0') return false;
    if (override === '1') return true;
  } catch {
    // localStorage indisponível (SSR/privacidade) — cai no env.
  }
  return import.meta.env.VITE_PAYWALL_FOCO !== 'false';
}
