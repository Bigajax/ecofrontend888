import { describe, expect, it } from 'vitest';

import { extrairTagsRelevantes } from '../extrairTagsRelevantes';

describe('extrairTagsRelevantes', () => {
  it('returns empty array for non-string input', () => {
    // @ts-expect-error testing defensive branch
    expect(extrairTagsRelevantes(undefined)).toEqual([]);
    // @ts-expect-error testing defensive branch
    expect(extrairTagsRelevantes(null)).toEqual([]);
  });

  it('returns empty array for blank strings', () => {
    expect(extrairTagsRelevantes('   ')).toEqual([]);
  });

  it('detects matching tags case-insensitively', () => {
    expect(extrairTagsRelevantes('Estou muito FELIZ e sorrindo.')).toEqual(['alegria']);
  });
});
