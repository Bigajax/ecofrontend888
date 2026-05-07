import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

vi.stubEnv('VITE_SUPABASE_URL', 'https://supabase.test');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key-test');

if (!('ResizeObserver' in globalThis)) {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  vi.stubGlobal('ResizeObserver', ResizeObserverMock);
}

if (!('IntersectionObserver' in globalThis)) {
  class IntersectionObserverMock {
    constructor(public callback: IntersectionObserverCallback) {}
    observe() {
      // Call callback with all elements in view for tests
      this.callback([] as any, this as any);
    }
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }

  vi.stubGlobal('IntersectionObserver', IntersectionObserverMock);
}

if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}
