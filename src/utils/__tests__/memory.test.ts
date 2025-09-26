import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import {
  bucketLabelForDate,
  clamp,
  filtersAreActive,
  generateConsistentPastelColor,
  getEmotionColor,
  groupMemories,
  humanDate,
  normalize,
  normalizeTextFields,
} from '../memory';
import type { Memoria } from '../../api/memoriaApi';

const mockNow = new Date('2024-05-15T12:00:00Z');

describe('memory utils', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(mockNow);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('normalizes text and removes diacritics', () => {
    expect(normalize('Ânimo')).toBe('animo');
    expect(normalizeTextFields('Olá', null, 'Mundo')).toBe('ola mundo');
  });

  it('generates consistent colors for unknown emotions', () => {
    const pastel = generateConsistentPastelColor('empolgado');
    expect(pastel.startsWith('hsl(')).toBe(true);
    expect(getEmotionColor('empolgado')).toBe(pastel);
    expect(getEmotionColor('Alegria')).toBe('#3B82F6');
  });

  it('formats human readable dates', () => {
    expect(humanDate('2024-05-15T03:00:00Z')).toBe('Hoje');
    expect(humanDate('2024-05-14T03:00:00Z')).toBe('Ontem');
    expect(humanDate('2024-05-10T03:00:00Z')).toBe('5 dias atrás');
  });

  it('labels buckets for recency', () => {
    expect(bucketLabelForDate('2024-05-15T01:00:00Z')).toBe('Hoje');
    expect(bucketLabelForDate('2024-05-14T10:00:00Z')).toBe('Ontem');
    expect(bucketLabelForDate('2024-05-13T03:00:00Z')).toBe('Esta semana');
    expect(bucketLabelForDate('2024-05-02T03:00:00Z')).toBe('Este mês');
    expect(bucketLabelForDate('2024-04-02T03:00:00Z')).toBe('Antigas');
  });

  it('groups memories by bucket', () => {
    const memories: Memoria[] = [
      { id: '1', usuario_id: '1', mensagem_id: null, resumo_eco: '', created_at: '2024-05-15T00:00:00Z' },
      { id: '2', usuario_id: '1', mensagem_id: null, resumo_eco: '', created_at: '2024-05-14T00:00:00Z' },
      { id: '3', usuario_id: '1', mensagem_id: null, resumo_eco: '', created_at: '2024-04-10T00:00:00Z' },
    ];
    const grouped = groupMemories(memories);
    expect(Object.keys(grouped)).toContain('Hoje');
    expect(grouped['Hoje']).toHaveLength(1);
    expect(grouped['Ontem']).toHaveLength(1);
    expect(grouped['Antigas']).toHaveLength(1);
  });

  it('checks filter activeness', () => {
    expect(filtersAreActive('all', '', 0)).toBe(false);
    expect(filtersAreActive('raiva', '', 0)).toBe(true);
    expect(filtersAreActive('all', 'busca', 0)).toBe(true);
    expect(filtersAreActive('all', '', 3)).toBe(true);
  });

  it('clamps values between min and max', () => {
    expect(clamp(2)).toBe(1);
    expect(clamp(-2)).toBe(-1);
    expect(clamp(0.5)).toBe(0.5);
  });
});
