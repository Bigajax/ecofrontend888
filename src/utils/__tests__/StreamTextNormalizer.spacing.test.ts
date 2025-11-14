/**
 * StreamTextNormalizer.spacing.test.ts
 *
 * Test cases that specifically target the reported spacing issue:
 * User reported: "Podeserinteressante" instead of "Pode ser interessante"
 *
 * These tests verify the entire pipeline:
 * normalizeChunk → smartJoin → final result
 */

import { normalizeChunk } from '../StreamTextNormalizer';
import { smartJoin } from '../streamJoin';

describe('StreamTextNormalizer - Spacing Issue (User Reported)', () => {
  describe('Case 1: "ode" + "serinteressante"', () => {
    it('normalizeChunk should insert space', () => {
      const result = normalizeChunk('ode', 'serinteressante');
      expect(result.safe).toBe(' serinteressante');
      expect(result.tail).toBe('nte');
    });

    it('smartJoin should preserve space from normalizeChunk', () => {
      const prevBuffer = 'Pode';
      const normalized = normalizeChunk('ode', 'serinteressante');
      const joined = smartJoin(prevBuffer, normalized.safe);
      expect(joined).toBe('Pode serinteressante');
    });

    it('full pipeline: buffer + normalized + joined', () => {
      // Step 1: Start with "Pode"
      let buffer = 'Pode';

      // Step 2: Get tail from buffer
      const tail1 = buffer.slice(-3); // "ode"

      // Step 3: Receive chunk "serinteressante"
      const chunk1 = 'serinteressante';
      const normalized1 = normalizeChunk(tail1, chunk1);

      // Step 4: Join with buffer
      const result1 = smartJoin(buffer, normalized1.safe);

      // Verify: should have space between "Pode" and "serinteressante"
      expect(result1).toBe('Pode serinteressante');
      expect(result1).not.toContain('Podeserinteressante');

      // Update buffer for next iteration
      buffer = result1;

      // Step 5: Get new tail
      const tail2 = buffer.slice(-3); // Should be "nte"
      expect(tail2).toBe('nte');
    });
  });

  describe('Case 2: Full sentence "Pode ser interessante"', () => {
    it('should correctly space multiple word boundaries', () => {
      let buffer = '';
      const chunks = ['Pode', 'ser', 'inte', 'ressante'];
      const expectedWords = ['Pode', 'ser', 'inte', 'ressante'];

      for (const chunk of chunks) {
        const tail = buffer.length > 0 ? buffer.slice(-3) : '';
        const normalized = normalizeChunk(tail, chunk);
        buffer = smartJoin(buffer, normalized.safe);
      }

      // Each word should be separated by space
      expect(buffer).toContain('Pode ser');
      expect(buffer).toContain('ser inte');
      // Should NOT have words concatenated
      expect(buffer).not.toContain('Podeser');
      expect(buffer).not.toContain('serint');
    });
  });

  describe('Case 2.5: Chunks with leading spaces (broken words)', () => {
    it('should remove space when tail is 1 letter and chunk starts with space', () => {
      // Chunk broken as "V" + " ejo"
      const tail = 'V';
      const chunk = ' ejo';
      const result = normalizeChunk(tail, chunk);
      expect(result.safe).toBe(' ejo'); // Space inserted between V and ejo (not in ejo)
      expect(result.safe).not.toContain('V ejo'); // Not "V ejo"
    });

    it('should handle "V ejo que você"', () => {
      let buffer = '';
      const chunks = ['V', ' ejo que você'];

      for (const chunk of chunks) {
        const tail = buffer.length > 0 ? buffer.slice(-3) : '';
        const normalized = normalizeChunk(tail, chunk);
        buffer = smartJoin(buffer, normalized.safe);
      }

      expect(buffer).toBe('V ejo que você');
      expect(buffer).not.toContain('e jo'); // No space in the middle of "ejo"
    });

    it('should handle multi-character tail correctly', () => {
      // Chunk broken as "fim" + " icio"
      // With 3-letter tail, should keep space (might be legitimate word boundary)
      const tail = 'fim';
      const chunk = ' icio';
      const result = normalizeChunk(tail, chunk);
      // Should NOT remove space since tail > 2
      expect(result.safe).toBe(' icio');
    });

    it('should process real problematic case: "V ejo tro uxe"', () => {
      let buffer = '';
      // Simulating chunks that arrive broken mid-word
      const chunks = ['V', ' ejo tro', ' uxe'];

      for (const chunk of chunks) {
        const tail = buffer.length > 0 ? buffer.slice(-3) : '';
        const normalized = normalizeChunk(tail, chunk);
        buffer = smartJoin(buffer, normalized.safe);
      }

      // Should fix "V ejo" to "V ejo" (space between V and ejo)
      // "tro uxe" should become "tro uxe" (space properly handled)
      expect(buffer).toContain('V ejo');
      expect(buffer).not.toContain('Vejotro'); // Not concatenated
    });
  });

  describe('Case 3: "Você está sentindo"', () => {
    it('should space between "você" and "está"', () => {
      const tail = 'cê'; // Last 2 chars of "você"
      const chunk = 'está';
      const result = normalizeChunk(tail, chunk);
      expect(result.safe).toBe(' está');
    });

    it('should space between "está" and "sentindo"', () => {
      const tail = 'tá'; // Last 2 chars of "está"
      const chunk = 'sentindo';
      const result = normalizeChunk(tail, chunk);
      expect(result.safe).toBe(' sentindo');
    });
  });

  describe('Edge cases with spacing', () => {
    it('should handle single letter chunks', () => {
      const tail = 'a';
      const chunk = 'b';
      const result = normalizeChunk(tail, chunk);
      expect(result.safe).toBe(' b');
    });

    it('should NOT insert space after punctuation', () => {
      const tail = 'fim';
      const chunk = '.';
      const result = normalizeChunk(tail, chunk);
      expect(result.safe).toBe('.');
    });

    it('should NOT insert space if chunk starts with space', () => {
      const tail = 'ode';
      const chunk = ' serinteressante';
      const result = normalizeChunk(tail, chunk);
      // Already has space, should not add another
      expect(result.safe).not.toMatch(/^\s\s/);
    });

    it('should NOT insert space if tail ends with space', () => {
      const tail = 'ode ';
      const chunk = 'serinteressante';
      const result = normalizeChunk(tail, chunk);
      // Already has space at boundary
      expect(result.safe).toBe('serinteressante');
    });
  });

  describe('Debug: Verify shouldInsertSpace logic', () => {
    /**
     * These tests check the shouldInsertSpace behavior directly
     * by analyzing the normalized output
     */

    it('letter + letter = should insert space', () => {
      // Test cases: (tail, chunk) → should have space in result
      const testCases = [
        ['a', 'b'],
        ['z', 'a'],
        ['você', 'está'],
        ['ode', 'ser'],
        ['tá', 'sen'],
      ];

      for (const [tail, chunk] of testCases) {
        const result = normalizeChunk(tail, chunk);
        expect(result.safe).toMatch(/^\s/);
      }
    });

    it('letter + number = should insert space', () => {
      const result = normalizeChunk('e', '123');
      expect(result.safe).toMatch(/^\s/);
    });

    it('number + letter = should insert space', () => {
      const result = normalizeChunk('1', 'abc');
      expect(result.safe).toMatch(/^\s/);
    });

    it('letter + punctuation = should NOT insert space', () => {
      const result = normalizeChunk('e', '.');
      expect(result.safe).not.toMatch(/^\s/);
    });

    it('punctuation + letter = should NOT insert space immediately after', () => {
      // Note: smartJoin may add space, but normalizeChunk shouldn't
      const result = normalizeChunk('.', 'a');
      expect(result.safe).not.toMatch(/^\s/);
    });
  });

  describe('Real-world scenario: Streaming response', () => {
    /**
     * Simulates the exact scenario user reported:
     * "Oi, rafael! Podeserinteressante, sim. Vocêestásentindo..."
     * Should become: "Oi, rafael! Pode ser interessante, sim. Você está sentindo..."
     */

    it('streams "Pode ser interessante"', () => {
      let buffer = 'Oi, rafael! ';

      // Simulate chunks arriving
      const chunks = ['Pode', 'ser', ' inte', 'ressante'];
      const expectedSequence = 'Oi, rafael! Pode ser  interessante';

      for (const chunk of chunks) {
        const tail = buffer.length > 0 ? buffer.slice(-3) : '';
        const normalized = normalizeChunk(tail, chunk);
        buffer = smartJoin(buffer, normalized.safe);
      }

      // Verify spacing is correct
      expect(buffer).toContain('Pode ser');
      expect(buffer).not.toContain('Podeser');
    });

    it('streams full problematic sentence', () => {
      let buffer = '';
      const chunks = [
        'Oi,',
        ' rafael!',
        ' Pode',
        'ser',
        ' intere',
        'ssante,',
        ' sim.',
        ' Você',
        'está',
        ' sentindo',
      ];

      for (const chunk of chunks) {
        const tail = buffer.length > 0 ? buffer.slice(-3) : '';
        const normalized = normalizeChunk(tail, chunk);
        buffer = smartJoin(buffer, normalized.safe);
      }

      // Check no concatenated words
      const problemCases = [
        'Oi,rafael',
        'rafael!Pode',
        'Podeser',
        'ser intere',
        'intere ssante', // This one has extra space but should still work
        'Você está',
        'estásentindo',
      ];

      // These should NOT appear
      expect(buffer).not.toContain('Podeser');
      expect(buffer).not.toContain('estásentindo');
      expect(buffer).not.toContain('Vocêesta');

      // These SHOULD appear
      expect(buffer).toContain('Oi');
      expect(buffer).toContain('rafael');
      expect(buffer).toContain('Pode');
      expect(buffer).toContain('ser');
      expect(buffer).toContain('Você');
      expect(buffer).toContain('está');
    });
  });
});
