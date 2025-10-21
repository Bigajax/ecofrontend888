const EXCEPTIONS = new Set(['de', 'da', 'do', 'das', 'dos']);

const isAcronym = (word: string) => {
  if (!word) return false;
  if (word.length < 2) return false;
  const hasLetter = /[A-Za-zÀ-ÖØ-öø-ÿ]/.test(word);
  if (!hasLetter) return false;
  return word === word.toUpperCase();
};

const capitalizeSegment = (segment: string) => {
  if (!segment) return segment;
  return segment.charAt(0).toUpperCase() + segment.slice(1);
};

const formatWord = (word: string, index: number) => {
  if (!word) return '';
  if (isAcronym(word)) return word;

  const lower = word.toLowerCase();
  if (index > 0 && EXCEPTIONS.has(lower)) {
    return lower;
  }

  if (word.includes('-')) {
    return lower
      .split('-')
      .map((segment) => capitalizeSegment(segment))
      .join('-');
  }

  return capitalizeSegment(lower);
};

export const formatName = (fullName: string): string => {
  if (typeof fullName !== 'string') return '';
  const trimmed = fullName.trim();
  if (!trimmed) return '';
  const parts = trimmed.split(/\s+/);
  return parts.map((part, index) => formatWord(part, index)).join(' ');
};

export default formatName;
