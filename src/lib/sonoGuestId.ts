/**
 * Fonte ÚNICA do guest_id do funil do sono.
 *
 * O desbloqueio via Pix depende de o MESMO id atravessar tudo: eventos do funil
 * (sono_guest_flow_events) → metadata do pagamento → coluna guest_id do entitlement
 * → /check-guest. Se qualquer ponto usar um id diferente, o Pix aprova e nada
 * desbloqueia. Por isso todo mundo (SonoInlineCheckout, SonoInlinePix,
 * useSonoEntitlement) lê o guest_id daqui.
 *
 * Precedência mantida em sincronia com o que já gravava as linhas de
 * sono_guest_flow_events: sessionStorage('eco.sono.guest_id') → localStorage
 * ('eco_guest_id'). Se nenhum existir, gera um e persiste em AMBOS para nunca
 * divergir entre chamadas.
 */
const SS_KEY = 'eco.sono.guest_id';
const LS_KEY = 'eco_guest_id';

function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function getSonoGuestId(): string {
  if (typeof window === 'undefined') return `guest_${uuid()}`;
  const fromSession = window.sessionStorage.getItem(SS_KEY);
  const fromLocal = window.localStorage.getItem(LS_KEY);
  const existing = fromSession || fromLocal;
  if (existing) {
    // Garante que ambos os storages carreguem o mesmo valor.
    if (!fromSession) window.sessionStorage.setItem(SS_KEY, existing);
    if (!fromLocal) window.localStorage.setItem(LS_KEY, existing);
    return existing;
  }
  const id = `guest_${uuid()}`;
  window.localStorage.setItem(LS_KEY, id);
  window.sessionStorage.setItem(SS_KEY, id);
  return id;
}
