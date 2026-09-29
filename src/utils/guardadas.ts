/**
 * Meditações guardadas (set/2026): o "Guardar" do player grava aqui, e a aba
 * Guardadas de Sua conta lê daqui. Antes, o botão só mudava de cor e mandava
 * um evento; a lista de Favoritos era fixa, igual para todo mundo.
 *
 * Fica no aparelho, por pessoa (chave com o id). Guarda o que o player precisa
 * para tocar de novo, sem depender de catálogo.
 */

export interface Guardada {
  id: string;
  title: string;
  duration: string;
  audioUrl: string;
  imageUrl: string;
  category?: string;
  gradient?: string;
  /** quando foi guardada (ISO) */
  em: string;
}

const chave = (uid?: string | null) => `eco.guardadas.v1.${uid || 'guest'}`;

export function lerGuardadas(uid?: string | null): Guardada[] {
  try {
    const bruto = JSON.parse(localStorage.getItem(chave(uid)) || '[]');
    return Array.isArray(bruto) ? bruto.filter((g) => g && typeof g.id === 'string' && typeof g.audioUrl === 'string') : [];
  } catch {
    return [];
  }
}

function gravar(uid: string | null | undefined, lista: Guardada[]) {
  try {
    localStorage.setItem(chave(uid), JSON.stringify(lista));
  } catch {
    // sem storage: guardar não persiste neste aparelho, nada quebra
  }
}

export function estaGuardada(uid: string | null | undefined, id: string | undefined): boolean {
  if (!id) return false;
  return lerGuardadas(uid).some((g) => g.id === id);
}

export function guardar(uid: string | null | undefined, item: Omit<Guardada, 'em'>): void {
  const lista = lerGuardadas(uid).filter((g) => g.id !== item.id);
  gravar(uid, [{ ...item, em: new Date().toISOString() }, ...lista]);
}

export function tirarDasGuardadas(uid: string | null | undefined, id: string): void {
  gravar(
    uid,
    lerGuardadas(uid).filter((g) => g.id !== id)
  );
}
