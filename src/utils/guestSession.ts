import { ensureGuestId, ensureSessionId } from "@/lib/guestId";

/** Recupera (ou gera) um ID de convidado persistente. */
export function getGuestId(): string {
  return ensureGuestId();
}

/** Recupera (ou gera) um ID de sessão efêmera para a aba atual. */
export function getSessionId(): string {
  return ensureSessionId();
}
