let activeCount = 0;
const listeners = new Set<() => void>();

export const setStreamActive = (on: boolean) => {
  const prev = activeCount;
  activeCount = Math.max(0, on ? activeCount + 1 : activeCount - 1);
  if ((prev === 0 && activeCount > 0) || (prev > 0 && activeCount === 0)) {
    listeners.forEach((listener) => {
      try {
        listener();
      } catch {
        /* noop */
      }
    });
  }
};

export const isStreamActive = () => activeCount > 0;

export const onStreamActivityChange = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
