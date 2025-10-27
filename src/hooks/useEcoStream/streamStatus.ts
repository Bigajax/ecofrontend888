type IdleCallback = () => void;

let activeCount = 0;
let lastActivatedAt: number | null = null;
const idleQueue: IdleCallback[] = [];

const flushIdleQueue = () => {
  if (activeCount > 0) return;
  if (idleQueue.length === 0) return;
  const callbacks = idleQueue.splice(0, idleQueue.length);
  callbacks.forEach((callback) => {
    try {
      callback();
    } catch (error) {
      console.error("[EcoStreamStatus] idle callback error", error);
    }
  });
};

export const markStreamActive = () => {
  activeCount = Math.max(activeCount + 1, 1);
  lastActivatedAt = Date.now();
};

export const markStreamIdle = () => {
  if (activeCount > 0) {
    activeCount -= 1;
  }
  if (activeCount <= 0) {
    activeCount = 0;
    flushIdleQueue();
  }
};

export const isEcoStreamActive = () => activeCount > 0;

export const getLastStreamActivatedAt = () => lastActivatedAt;

export const runWhenStreamIdle = (callback: IdleCallback) => {
  if (!isEcoStreamActive()) {
    callback();
    return;
  }
  idleQueue.push(callback);
};
