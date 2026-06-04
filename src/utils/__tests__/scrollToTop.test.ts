import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { scrollToTop } from '../scrollToTop';

describe('scrollToTop', () => {
  let rootEl: HTMLDivElement;
  let rootSetter: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    rootEl = document.createElement('div');
    rootEl.id = 'root';
    document.body.appendChild(rootEl);

    // jsdom não faz layout (scrollTop é sempre 0 no getter), então espionamos
    // o setter para provar que o util tenta zerar o #root — o container real no mobile.
    rootSetter = vi.fn();
    Object.defineProperty(rootEl, 'scrollTop', {
      get: () => 0,
      set: rootSetter,
      configurable: true,
    });

    // window.scrollTo não é implementado no jsdom.
    window.scrollTo = vi.fn();
  });

  afterEach(() => {
    rootEl.remove();
    vi.restoreAllMocks();
  });

  it('zera o scrollTop do #root (container real no mobile)', () => {
    scrollToTop();
    expect(rootSetter).toHaveBeenCalledWith(0);
  });

  it('também chama window.scrollTo para o caso desktop (document scroller)', () => {
    scrollToTop();
    expect(window.scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({ top: 0, left: 0 })
    );
  });
});
