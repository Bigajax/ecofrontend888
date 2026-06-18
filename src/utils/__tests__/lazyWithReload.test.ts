import { describe, it, expect, beforeEach } from 'vitest';
import { isChunkLoadError, shouldReloadForChunkError } from '../lazyWithReload';

describe('isChunkLoadError', () => {
  it('reconhece ChunkLoadError por name', () => {
    const e = new Error('boom');
    e.name = 'ChunkLoadError';
    expect(isChunkLoadError(e)).toBe(true);
  });

  it('reconhece as variacoes de mensagem de import dinamico', () => {
    const msgs = [
      'Failed to fetch dynamically imported module: https://x/assets/a.js',
      'error loading dynamically imported module',
      'Importing a module script failed.',
      "Failed to load module script: Expected a JavaScript module script but the server responded with a MIME type of text/html.",
    ];
    for (const m of msgs) {
      expect(isChunkLoadError(new Error(m))).toBe(true);
    }
  });

  it('ignora erros comuns de runtime', () => {
    expect(isChunkLoadError(new Error('Cannot read properties of undefined'))).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
    expect(isChunkLoadError(undefined)).toBe(false);
  });
});

describe('shouldReloadForChunkError', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('recarrega na 1a vez e bloqueia dentro da janela', () => {
    const t0 = 1_000_000;
    expect(shouldReloadForChunkError(t0)).toBe(true);
    // 2s depois, ainda dentro da janela de 10s -> nao recarrega (evita loop)
    expect(shouldReloadForChunkError(t0 + 2_000)).toBe(false);
  });

  it('volta a permitir reload apos a janela', () => {
    const t0 = 2_000_000;
    expect(shouldReloadForChunkError(t0)).toBe(true);
    expect(shouldReloadForChunkError(t0 + 11_000)).toBe(true);
  });
});
