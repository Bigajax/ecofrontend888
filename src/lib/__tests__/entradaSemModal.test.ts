import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isEntradaSemModal } from '../entradaSemModal';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('isEntradaSemModal (kill-switch)', () => {
  it('default ON quando não há env nem override', () => {
    expect(isEntradaSemModal()).toBe(true);
  });

  it('OFF quando VITE_ENTRADA_SEM_MODAL = "false" (rollback)', () => {
    vi.stubEnv('VITE_ENTRADA_SEM_MODAL', 'false');
    expect(isEntradaSemModal()).toBe(false);
  });

  it('override localStorage "0" desliga mesmo com env ausente', () => {
    localStorage.setItem('eco.entrada_sem_modal', '0');
    expect(isEntradaSemModal()).toBe(false);
  });

  it('override localStorage "1" liga mesmo com env "false"', () => {
    vi.stubEnv('VITE_ENTRADA_SEM_MODAL', 'false');
    localStorage.setItem('eco.entrada_sem_modal', '1');
    expect(isEntradaSemModal()).toBe(true);
  });
});
