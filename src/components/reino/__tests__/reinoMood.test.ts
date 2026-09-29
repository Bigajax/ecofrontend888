import { describe, it, expect } from 'vitest';
import { getReinoMood, formatHojeLabel, getFirstName } from '../reinoMood';

// Brasília é UTC-3 (sem horário de verão desde 2019).
const brt = (iso: string) => new Date(`${iso}-03:00`);

describe('getReinoMood', () => {
  it('amanhecer das 5h às 11h59', () => {
    expect(getReinoMood(brt('2026-09-28T05:00:00'))).toBe('amanhecer');
    expect(getReinoMood(brt('2026-09-28T11:59:00'))).toBe('amanhecer');
  });

  it('entardecer das 12h às 19h59', () => {
    expect(getReinoMood(brt('2026-09-28T12:00:00'))).toBe('entardecer');
    expect(getReinoMood(brt('2026-09-28T19:59:00'))).toBe('entardecer');
  });

  it('noite das 20h às 4h59, atravessando a meia-noite', () => {
    expect(getReinoMood(brt('2026-09-28T20:00:00'))).toBe('noite');
    expect(getReinoMood(brt('2026-09-28T23:59:00'))).toBe('noite');
    expect(getReinoMood(brt('2026-09-29T00:00:00'))).toBe('noite');
    expect(getReinoMood(brt('2026-09-29T04:59:00'))).toBe('noite');
  });

  it('usa a hora de Brasília, não a do aparelho', () => {
    // 23h UTC = 20h em Brasília
    expect(getReinoMood(new Date('2026-09-28T23:00:00Z'))).toBe('noite');
    // 14h UTC = 11h em Brasília
    expect(getReinoMood(new Date('2026-09-28T14:00:00Z'))).toBe('amanhecer');
  });
});

describe('formatHojeLabel', () => {
  it('formata dia e mês abreviado em pt-BR', () => {
    expect(formatHojeLabel(brt('2026-09-28T22:47:00'))).toBe('Hoje · 28 set');
  });

  it('vira o dia pela meia-noite de Brasília', () => {
    // 01h UTC do dia 1 = 22h do dia 30/09 em Brasília
    expect(formatHojeLabel(new Date('2026-10-01T01:00:00Z'))).toBe('Hoje · 30 set');
  });
});

describe('getFirstName', () => {
  it('pega o primeiro nome e capitaliza', () => {
    expect(getFirstName('RAFAEL razeira')).toBe('Rafael');
    expect(getFirstName('  ana   maria ')).toBe('Ana');
  });

  it('retorna null sem nome, para nunca mostrar "Convidado(a)"', () => {
    expect(getFirstName(undefined)).toBeNull();
    expect(getFirstName('')).toBeNull();
    expect(getFirstName('   ')).toBeNull();
  });
});
