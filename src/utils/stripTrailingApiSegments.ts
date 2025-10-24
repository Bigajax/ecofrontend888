const normalizeSlashes = (value: string) => value.replace(/\/+$/, "");

/**
 * Remove trailing `/api` segments from a path-like string while preserving the
 * original leading slash (when present).
 */
export function stripTrailingApiSegments(path: string): string {
  if (typeof path !== "string") {
    return "";
  }

  let normalized = path.trim();
  if (!normalized) {
    return "";
  }

  const hasLeadingSlash = normalized.startsWith("/");
  normalized = normalizeSlashes(normalized);

  while (normalized) {
    const lower = normalized.toLowerCase();
    if (!lower.endsWith("/api")) {
      break;
    }
    normalized = normalizeSlashes(normalized.slice(0, -4));
  }

  if (!normalized) {
    return "";
  }

  if (hasLeadingSlash && !normalized.startsWith("/")) {
    normalized = `/${normalized}`;
  }

  return normalized;
}
