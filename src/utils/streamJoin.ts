const isAlphaNumeric = (value: string): boolean => /[A-Za-zÀ-ÖØ-öø-ÿ0-9]/.test(value);

export function glue(prev: string, next: string): string {
  const previous = prev ?? "";
  const following = next ?? "";

  if (!previous) {
    return following;
  }

  if (!following) {
    return previous;
  }

  const prevLast = previous.slice(-1);
  const nextFirst = following.slice(0, 1);
  const needsSpace = isAlphaNumeric(prevLast) && isAlphaNumeric(nextFirst);

  return needsSpace ? `${previous} ${following}` : `${previous}${following}`;
}

export function smartJoin(prev: string, delta: string): string {
  const normalizedPrev = (prev ?? "").replace(/\r\n/g, "\n");
  const normalizedDelta = (delta ?? "").replace(/\r\n/g, "\n");
  return glue(normalizedPrev, normalizedDelta);
}

export default smartJoin;
