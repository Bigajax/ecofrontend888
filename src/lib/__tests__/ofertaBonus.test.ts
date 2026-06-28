import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isOfertaBonus } from '../ofertaBonus';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('isOfertaBonus (kill-switch)', () => {
  it('default ON quando não há env nem override', () => {
    expect(isOfertaBonus()).toBe(true);
  });

  it('OFF quando VITE_OFERTA_BONUS = "false" (rollback)', () => {
    vi.stubEnv('VITE_OFERTA_BONUS', 'false');
    expect(isOfertaBonus()).toBe(false);
  });

  it('override localStorage "0" desliga mesmo com env ausente', () => {
    localStorage.setItem('eco.oferta_bonus', '0');
    expect(isOfertaBonus()).toBe(false);
  });

  it('override localStorage "1" liga mesmo com env "false"', () => {
    vi.stubEnv('VITE_OFERTA_BONUS', 'false');
    localStorage.setItem('eco.oferta_bonus', '1');
    expect(isOfertaBonus()).toBe(true);
  });
});
