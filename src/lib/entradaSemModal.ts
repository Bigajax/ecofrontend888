/**
 * Kill-switch do teste "entrada sem modal" (/sono/experiencia): "Ouvir a Noite 1"
 * vai direto ao player, sem o modal "Esta é a Noite 1 de 7". Rollout sequencial a
 * 100% → default ON; a flag existe só pra rollback rápido sem deploy.
 *
 * Precedência: override de teste no localStorage > env > default ON.
 * - localStorage `eco.entrada_sem_modal` = '0' (off) | '1' (on) — teste manual.
 * - `VITE_ENTRADA_SEM_MODAL` = 'false' religa o modal em produção (rollback).
 */
export function isEntradaSemModal(): boolean {
  try {
    const override = localStorage.getItem('eco.entrada_sem_modal');
    if (override === '0') return false;
    if (override === '1') return true;
  } catch {
    // localStorage indisponível — cai no env.
  }
  return import.meta.env.VITE_ENTRADA_SEM_MODAL !== 'false';
}
