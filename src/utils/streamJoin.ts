export function smartJoin(prev: string, delta: string): string {
  const previous = prev ?? "";
  const nextDelta = delta ?? "";

  if (!previous) {
    return nextDelta;
  }

  if (!nextDelta) {
    return previous;
  }

  const normalizedDelta = nextDelta.replace(/\r\n/g, "\n");

  const prevLast = previous.slice(-1);
  const startsAlphaNum = /^[A-Za-zÀ-ÖØ-öø-ÿ0-9]/.test(normalizedDelta);
  const startsPunctOrSpace = /^[\s.,;:!?)]/.test(normalizedDelta);
  const prevEndsAlphaNumOrQuote = /[A-Za-zÀ-ÖØ-öø-ÿ0-9"”’]$/.test(prevLast);

  const needsSpace = prevEndsAlphaNumOrQuote && startsAlphaNum && !startsPunctOrSpace;

  return needsSpace ? `${previous} ${normalizedDelta}` : `${previous}${normalizedDelta}`;
}

export default smartJoin;
