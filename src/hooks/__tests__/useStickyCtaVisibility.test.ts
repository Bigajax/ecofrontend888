import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStickyCtaVisibility } from '../useStickyCtaVisibility';

// IntersectionObserver controlável: guarda a callback e os elementos observados
// e deixa o teste emitir entradas de visibilidade manualmente.
class IOMock {
  static instances: IOMock[] = [];
  callback: IntersectionObserverCallback;
  elements = new Set<Element>();

  constructor(cb: IntersectionObserverCallback) {
    this.callback = cb;
    IOMock.instances.push(this);
  }
  observe(el: Element) {
    this.elements.add(el);
  }
  unobserve(el: Element) {
    this.elements.delete(el);
  }
  disconnect() {
    this.elements.clear();
  }
  takeRecords() {
    return [];
  }
  // helper de teste: simula entradas isIntersecting
  emit(entries: Array<{ target: Element; isIntersecting: boolean }>) {
    this.callback(entries as IntersectionObserverEntry[], this as unknown as IntersectionObserver);
  }
}

function makeRef(el: Element) {
  return { current: el } as React.RefObject<Element>;
}

describe('useStickyCtaVisibility', () => {
  beforeEach(() => {
    IOMock.instances = [];
    vi.stubGlobal('IntersectionObserver', IOMock as unknown as typeof IntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('começa escondido (estado inicial false)', () => {
    const hero = document.createElement('a');
    const offer = document.createElement('a');
    const { result } = renderHook(() =>
      useStickyCtaVisibility([makeRef(hero), makeRef(offer)]),
    );
    expect(result.current).toBe(false);
  });

  it('fica visível quando nenhuma âncora está na viewport', () => {
    const hero = document.createElement('a');
    const offer = document.createElement('a');
    const { result } = renderHook(() =>
      useStickyCtaVisibility([makeRef(hero), makeRef(offer)]),
    );

    act(() => {
      IOMock.instances[0].emit([
        { target: hero, isIntersecting: false },
        { target: offer, isIntersecting: false },
      ]);
    });

    expect(result.current).toBe(true);
  });

  it('some quando o CTA do herói está visível', () => {
    const hero = document.createElement('a');
    const offer = document.createElement('a');
    const { result } = renderHook(() =>
      useStickyCtaVisibility([makeRef(hero), makeRef(offer)]),
    );

    // herói sai → sticky aparece
    act(() => {
      IOMock.instances[0].emit([
        { target: hero, isIntersecting: false },
        { target: offer, isIntersecting: false },
      ]);
    });
    expect(result.current).toBe(true);

    // herói volta → sticky some
    act(() => {
      IOMock.instances[0].emit([{ target: hero, isIntersecting: true }]);
    });
    expect(result.current).toBe(false);
  });

  it('some quando o CTA da oferta (rodapé) está visível', () => {
    const hero = document.createElement('a');
    const offer = document.createElement('a');
    const { result } = renderHook(() =>
      useStickyCtaVisibility([makeRef(hero), makeRef(offer)]),
    );

    act(() => {
      IOMock.instances[0].emit([
        { target: hero, isIntersecting: false },
        { target: offer, isIntersecting: false },
      ]);
    });
    expect(result.current).toBe(true);

    act(() => {
      IOMock.instances[0].emit([{ target: offer, isIntersecting: true }]);
    });
    expect(result.current).toBe(false);
  });
});
