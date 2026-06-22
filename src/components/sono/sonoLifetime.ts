/**
 * Cache LOCAL do acesso vitalício às 7 noites (Pix). Fonte da verdade continua
 * sendo o entitlement por guest_id no servidor (/check-guest); esta flag só evita
 * que o guest sem conta perca o acesso ao recarregar a /sono/experiencia logo após
 * pagar (antes do /check refletir, ou offline).
 */
export const LIFETIME_LS_KEY = 'eco.sono.lifetime.v1';

export interface SonoLifetimeCache {
  unlocked: boolean;
  externalReference: string | null;
  paymentId: string | null;
}

export function readSonoLifetime(): SonoLifetimeCache | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LIFETIME_LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SonoLifetimeCache;
    return parsed?.unlocked ? parsed : null;
  } catch {
    return null;
  }
}

export function hasSonoLifetimeLocal(): boolean {
  return !!readSonoLifetime();
}
