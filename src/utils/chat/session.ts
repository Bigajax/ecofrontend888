import { ensureSessionId as ensurePersistentSessionId } from '../../lib/guestId';

export const ensureSessionId = () => ensurePersistentSessionId();
