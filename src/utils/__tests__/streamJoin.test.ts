import { describe, expect, it } from 'vitest';

import { smartJoin } from '../streamJoin';

describe('smartJoin', () => {
  it('adds a space between alphabetic tokens when needed', () => {
    expect(smartJoin('Hello', 'world')).toBe('Hello world');
  });

  it('treats comma as spacer punctuation before alphabetic tokens', () => {
    expect(smartJoin('Hello,', 'world')).toBe('Hello, world');
  });

  it('treats period as spacer punctuation before alphabetic tokens', () => {
    expect(smartJoin('Finished.', 'Next')).toBe('Finished. Next');
  });

  it('does not create duplicate spaces during streaming punctuation joins', () => {
    const tokens = ['Hello', ',', 'world'];
    const result = tokens.reduce((acc, chunk) => smartJoin(acc, chunk));

    expect(result).toBe('Hello, world');
  });
});
