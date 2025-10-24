const HOST_KEY = "eco.__last_hostname";
const ECO_NAMESPACE_PREFIXES = ["eco.", "eco_", "eco-", "eco:"];

const shouldClearKey = (key: string): boolean => {
  if (!key) return false;
  if (key === HOST_KEY) return false;
  const normalized = key.toLowerCase();
  if (!normalized.startsWith("eco")) return false;
  const delimiter = normalized.charAt(3);
  if (ECO_NAMESPACE_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
    return true;
  }
  return delimiter === "." || delimiter === "_" || delimiter === "-" || delimiter === ":";
};

export function syncEcoStorageDomain(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const storage = window.localStorage;
    if (!storage) return;

    const currentHost = window.location?.hostname ?? "";
    const previousHost = storage.getItem(HOST_KEY) ?? "";

    if (previousHost && currentHost && previousHost !== currentHost) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < storage.length; i += 1) {
        const key = storage.key(i);
        if (!key) continue;
        if (shouldClearKey(key)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => {
        try {
          storage.removeItem(key);
        } catch {
          /* noop */
        }
      });
    }

    if (currentHost) {
      storage.setItem(HOST_KEY, currentHost);
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("[eco-storage] failed to sync domain namespace", error);
    }
  }
}
