import { v4 as uuidv4 } from 'uuid';

import { SESSION_STORAGE_KEY } from '../../constants/chat';

export const ensureSessionId = () => {
  const generated = `sess_${uuidv4()}`;
  if (typeof window === 'undefined') return generated;
  try {
    const stored = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (stored) return stored;
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, generated);
    return generated;
  } catch {
    return generated;
  }
};
