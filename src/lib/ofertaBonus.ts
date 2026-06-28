/**
 * Kill-switch do bônus EcoDream na oferta do Protocolo do Sono (value-stack):
 * o card R$37 mostra o EcoDream (interpretação de sonhos) como bônus e o CTA vira
 * "Liberar as 7 noites + bônus". Rollout sequencial a 100% → default ON; a flag
 * existe só pra rollback rápido sem deploy.
 *
 * Precedência: override de teste no localStorage > env > default ON.
 * - localStorage `eco.oferta_bonus` = '0' (off) | '1' (on) — teste manual.
 * - `VITE_OFERTA_BONUS` = 'false' esconde o bônus em produção (rollback).
 */
export function isOfertaBonus(): boolean {
  try {
    const override = localStorage.getItem('eco.oferta_bonus');
    if (override === '0') return false;
    if (override === '1') return true;
  } catch {
    // localStorage indisponível — cai no env.
  }
  return import.meta.env.VITE_OFERTA_BONUS !== 'false';
}
