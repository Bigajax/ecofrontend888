/**
 * Kill-switch do "presente da Noite 1" (1 interpretação de sonho grátis na tela
 * de continuidade do funil do sono). Chama a IA do backend para GUESTS — este
 * switch é o freio de custo sem precisar de deploy.
 *
 * Precedência: override de teste no localStorage > env > default ON.
 * - localStorage `eco.presente_sonho` = '0' (off) | '1' (on) — teste manual.
 * - `VITE_PRESENTE_SONHO` = 'false' desliga em produção (rollback/custo).
 */
export function isPresenteSonho(): boolean {
  try {
    const override = localStorage.getItem('eco.presente_sonho');
    if (override === '0') return false;
    if (override === '1') return true;
  } catch {
    // localStorage indisponível — cai no env.
  }
  return import.meta.env.VITE_PRESENTE_SONHO !== 'false';
}
