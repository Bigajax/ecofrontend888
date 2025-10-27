export const GUEST_AUTO_ENTRY_FLAG = 'eco.guest.autoEntry.v1';

export const isGuestAutoEntryEnabled = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(GUEST_AUTO_ENTRY_FLAG) === '1';
  } catch {
    return false;
  }
};

export const enableGuestAutoEntry = (): void => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(GUEST_AUTO_ENTRY_FLAG, '1');
  } catch {
    /* noop */
  }
};

export const disableGuestAutoEntry = (): void => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(GUEST_AUTO_ENTRY_FLAG);
  } catch {
    /* noop */
  }
};
