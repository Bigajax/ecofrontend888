import { describe, expect, it } from 'vitest';

import { resolveChunkIdentifier, resolveChunkIndex } from '../chat/chunkSignals';

describe('chunkSignals helpers', () => {
  it('resolves identifier from nested payloads', () => {
    const identifier = resolveChunkIdentifier({
      payload: {
        delta: {
          chunk_index: 4,
        },
      },
    });

    expect(identifier).toBe('index:4');
  });

  it('prefers numeric identifiers over strings when available', () => {
    const identifier = resolveChunkIdentifier({
      payload: {
        delta: {
          id: 'abc',
          chunk_index: 2,
        },
      },
    });

    expect(identifier).toBe('index:2');
  });

  it('falls back to string identifiers', () => {
    const identifier = resolveChunkIdentifier({
      payload: {
        delta: {
          id: 'chunk-xyz',
        },
      },
    });

    expect(identifier).toBe('index:chunk-xyz');
  });

  it('returns null when no candidates are present', () => {
    expect(resolveChunkIdentifier({})).toBeNull();
  });

  it('extracts chunk index from camelCase keys', () => {
    const index = resolveChunkIndex({
      payload: {
        delta: {
          chunkIndex: '3',
        },
      },
    });

    expect(index).toBe(3);
  });

  it('extracts chunk index from top level payload', () => {
    const index = resolveChunkIndex({
      chunk_index: 7,
    });

    expect(index).toBe(7);
  });

  it('returns null when numeric value cannot be parsed', () => {
    expect(resolveChunkIndex({ payload: { delta: { chunk_index: 'abc' } } })).toBeNull();
  });
});
