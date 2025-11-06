/**
 * useStreamTextNormalizer.ts
 *
 * Hook para gerenciar normalização de chunks SSE usando StreamTextNormalizer
 * Integra-se ao pipeline de streaming sem quebrar o código existente
 *
 * Feature flags:
 * - ECO_FIX_SPACING_FRONTEND: ativa normalização (default: true)
 * - ECO_DEBUG_NORMALIZER: ativa telemetria em dev
 */

import { useRef, useEffect } from 'react';
import {
  normalizeChunk,
  finalizeMessage,
  extractJsonBlocks,
  recordChunkMetric,
  recordFinalMetric,
  resetMetrics,
} from '../utils/StreamTextNormalizer';

interface StreamNormalizerState {
  renderBuffer: string;
  prevTail: string;
  spacesInserted: number;
  enabled: boolean;
}

/**
 * Hook para normalização de streaming
 */
export function useStreamTextNormalizer() {
  const stateRef = useRef<StreamNormalizerState>({
    renderBuffer: '',
    prevTail: '',
    spacesInserted: 0,
    enabled: localStorage.getItem('ECO_FIX_SPACING_FRONTEND') !== 'false',
  });

  const debugEnabled = process.env.NODE_ENV === 'development' && localStorage.getItem('ECO_DEBUG_NORMALIZER') === 'true';

  /**
   * processChunk(chunk: string): { safe: string; tail: string }
   *
   * Processa um chunk incrementalmente:
   * - Normaliza Unicode e line endings
   * - Insere espaços automáticos entre palavras
   * - Colapsa espaços fora de código
   * - Retorna texto seguro para renderização
   */
  const processChunk = (chunk: string): { safe: string; tail: string } => {
    const state = stateRef.current;

    if (!state.enabled) {
      // Se desabilitado, retornar chunk como está
      return { safe: chunk, tail: chunk.length > 3 ? chunk.slice(-3) : chunk };
    }

    const result = normalizeChunk(state.prevTail, chunk);

    // Registrar métrica
    const spacesAdded = result.safe.startsWith(' ') ? 1 : 0;
    if (spacesAdded > 0) {
      state.spacesInserted++;
    }
    recordChunkMetric(chunk.length, spacesAdded);

    // Atualizar estado
    state.prevTail = result.tail;
    state.renderBuffer += result.safe;

    if (debugEnabled) {
      console.debug('[StreamNorm] Processed chunk', {
        input: chunk.slice(0, 50),
        output: result.safe.slice(0, 50),
        tail: result.tail,
        bufferLen: state.renderBuffer.length,
      });
    }

    return result;
  };

  /**
   * finalize(): string
   *
   * Finaliza a mensagem após streaming completo:
   * - Podar espaços antes de pontuação
   * - Colapsar breaks > 2
   * - Remover control chars
   * - Opcionalmente extrair blocos JSON
   */
  const finalize = (includeJsonExtraction: boolean = false) => {
    const state = stateRef.current;

    if (!state.enabled) {
      return state.renderBuffer;
    }

    const finalized = finalizeMessage(state.renderBuffer, { removeControlChars: true });
    recordFinalMetric(finalized.length);

    if (debugEnabled) {
      console.log('[StreamNorm] Finalized message', {
        inputLen: state.renderBuffer.length,
        outputLen: finalized.length,
        spacesInserted: state.spacesInserted,
        chunks: (state.renderBuffer.match(/\n/g) || []).length + 1,
      });
    }

    // Extrair JSON se solicitado
    if (includeJsonExtraction) {
      const { content, jsonBlocks } = extractJsonBlocks(finalized);
      return { text: content, metadata: jsonBlocks };
    }

    return finalized;
  };

  /**
   * reset()
   *
   * Reseta estado para nova mensagem
   */
  const reset = () => {
    const state = stateRef.current;
    state.renderBuffer = '';
    state.prevTail = '';
    state.spacesInserted = 0;
    resetMetrics();

    if (debugEnabled) {
      console.debug('[StreamNorm] Reset state');
    }
  };

  /**
   * setEnabled(enabled: boolean)
   *
   * Ativa/desativa normalização em tempo de execução
   */
  const setEnabled = (enabled: boolean) => {
    stateRef.current.enabled = enabled;
    localStorage.setItem('ECO_FIX_SPACING_FRONTEND', enabled ? 'true' : 'false');

    if (debugEnabled) {
      console.debug('[StreamNorm] Enabled:', enabled);
    }
  };

  /**
   * Cleanup: se componente desmontar durante streaming
   */
  useEffect(() => {
    return () => {
      // Cleanup se necessário
    };
  }, []);

  return {
    processChunk,
    finalize,
    reset,
    setEnabled,
    isEnabled: () => stateRef.current.enabled,
    getMetrics: () => ({
      bufferLen: stateRef.current.renderBuffer.length,
      spacesInserted: stateRef.current.spacesInserted,
      tail: stateRef.current.prevTail,
    }),
  };
}

export default useStreamTextNormalizer;
