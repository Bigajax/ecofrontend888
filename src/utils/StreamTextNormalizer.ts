/**
 * StreamTextNormalizer.ts
 *
 * Normalização robusta de chunks de streaming SSE para ECO Frontend
 *
 * Responsabilidades:
 * - normalizeChunk(): processa chunk incremental, mantém tail para próxima iteração
 * - finalizeMessage(): podar espaços, colapsar breaks, remover control chars
 * - Preserva markdown, códigos, acentuação, sem trim() global
 */

const CODE_BLOCK_RE = /```[\s\S]*?```/g;
const INLINE_CODE_RE = /`[^`]*`/g;
const MARKDOWN_LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g;

/**
 * Detecta blocos de código (markdown ou inline)
 * Retorna array de { start, end, content, type: 'block' | 'inline' }
 */
function extractCodeBlocks(text: string): Array<{ start: number; end: number; type: 'block' | 'inline' }> {
  const blocks: Array<{ start: number; end: number; type: 'block' | 'inline' }> = [];

  // Code blocks (```)
  let match;
  const blockRegex = /```[\s\S]*?```/g;
  while ((match = blockRegex.exec(text)) !== null) {
    blocks.push({ start: match.index, end: match.index + match[0].length, type: 'block' });
  }

  // Inline code (`)
  const inlineRegex = /`[^`]*`/g;
  while ((match = inlineRegex.exec(text)) !== null) {
    const isInBlock = blocks.some((b) => b.type === 'block' && match!.index >= b.start && match!.index < b.end);
    if (!isInBlock) {
      blocks.push({ start: match.index, end: match.index + match[0].length, type: 'inline' });
    }
  }

  return blocks.sort((a, b) => a.start - b.start);
}

/**
 * Verifica se uma posição está dentro de um bloco de código
 */
function isInCodeBlock(pos: number, codeBlocks: Array<{ start: number; end: number }>): boolean {
  return codeBlocks.some((b) => pos >= b.start && pos < b.end);
}

/**
 * Detecta se espaço é necessário entre prevTail e chunk start
 * Regra: se ambos são alphanumeric/unicode letter e não há espaço entre eles
 * AGRESSIVO: também detecta padrões como consonant-vowel em início de palavra
 */
function shouldInsertSpace(prevTail: string, chunkStart: string): boolean {
  if (!prevTail || !chunkStart) return false;

  const lastChar = prevTail[prevTail.length - 1];
  const firstChar = chunkStart[0];

  if (!lastChar || !firstChar) return false;

  // Se já há espaço, não adicionar
  if (lastChar === ' ' || lastChar === '\n' || lastChar === '\t' || firstChar === ' ' || firstChar === '\n') {
    return false;
  }

  // Padrão: letra/número + letra/número = adicionar espaço
  // Suporta: a-z, A-Z, 0-9, À-ÖØ-öø-ÿ, ç/Ç, outros acentos
  const isAlphaNumeric = /[A-Za-zÀ-ÖØ-öø-ÿ0-9]/;
  const isVowel = /[aeiouáéíóúâêôãõAEIOUÁÉÍÓÚÂÊÔÃÕ]/;
  const isConsonant = /[bcdfghjklmnpqrstvwxyzçBCDFGHJKLMNPQRSTVWXYZÇ]/;

  if (!isAlphaNumeric.test(lastChar) || !isAlphaNumeric.test(firstChar)) {
    return false;
  }

  // REGRA 1: Básica - letra + letra = espaço
  // Qualquer combinação de letras coladas = adicionar espaço
  if (isAlphaNumeric.test(lastChar) && isAlphaNumeric.test(firstChar)) {
    return true;
  }

  return false;
}

/**
 * Detecta e insere espaços em padrões de palavras coladas DENTRO do chunk
 * Usa APENAS heurísticas muito seguras para evitar quebrar palavras legítimas
 *
 * Exemplo: "esseCheck" → "esse Check"
 */
function insertSpacesInCollocatedWords(text: string): string {
  if (text.length < 2) return text;

  let result = '';

  for (let i = 0; i < text.length; i++) {
    result += text[i];

    if (i < text.length - 1) {
      const curr = text[i];
      const next = text[i + 1];

      // HEURÍSTICA ÚNICA SEGURA: lowercase + UPPERCASE = novo parágrafo/palavra
      // Exemplo: "essaCheck" → "essa Check"
      // Isso é muito raro em português legítimo (só em camelCase ou erros)
      const isPrevLower = /[a-záéíóúâêôãõç]/.test(curr);
      const isNextUpper = /[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(next);

      if (isPrevLower && isNextUpper) {
        result += ' ';
      }
    }
  }

  return result;
}

/**
 * Colapsa múltiplos espaços em 1, fora de blocos de código
 */
function collapseSpaces(text: string, codeBlocks: Array<{ start: number; end: number }>): string {
  let result = '';
  let i = 0;

  while (i < text.length) {
    // Se estamos em bloco de código, copiar como está
    if (codeBlocks.some((b) => i >= b.start && i < b.end)) {
      const block = codeBlocks.find((b) => i >= b.start && i < b.end);
      if (block) {
        result += text.substring(i, block.end);
        i = block.end;
        continue;
      }
    }

    // Fora de código: colapsar espaços
    if (/[ \t\f\v\u00A0]/.test(text[i])) {
      result += ' ';
      // Pular todos os espaços consecutivos
      while (i < text.length && /[ \t\f\v\u00A0]/.test(text[i])) {
        i++;
      }
    } else {
      result += text[i];
      i++;
    }
  }

  return result;
}

/**
 * Normaliza Unicode para NFKC (compatibilidade)
 */
function normalizeUnicode(text: string): string {
  try {
    return text.normalize('NFKC');
  } catch {
    // Fallback se normalize não suportado
    return text;
  }
}

/**
 * Converte \r\n ou \r para \n
 */
function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n?/g, '\n');
}

export interface NormalizeChunkResult {
  safe: string;
  tail: string;
}

/**
 * normalizeChunk(prevTail, chunk)
 *
 * Processa um chunk incremental de streaming:
 * - Normaliza Unicode (NFKC)
 * - Converte line endings (\r\n → \n)
 * - Insere espaço automático entre palavras (prevTail + chunk)
 * - Colapsa múltiplos espaços fora de código
 * - Preserva markdown, listas, títulos
 * - Retorna { safe: texto processado, tail: últimos 3 chars para próxima iteração }
 *
 * NÃO usa trim() global
 */
export function normalizeChunk(prevTail: string, chunk: string): NormalizeChunkResult {
  if (!chunk) {
    return { safe: '', tail: prevTail };
  }

  // Step 1: Normalizar Unicode
  let normalized = normalizeUnicode(chunk);

  // Step 2: Normalizar line endings
  normalized = normalizeLineEndings(normalized);

  // Step 3: Inserir espaços em palavras coladas DENTRO do chunk
  // Isso resolve o caso onde backend envia múltiplas palavras juntas
  normalized = insertSpacesInCollocatedWords(normalized);

  // Step 4: Combinar prevTail + chunk para verificar espaço
  const combined = prevTail + normalized;
  const codeBlocks = extractCodeBlocks(combined);

  // Step 5: Inserir espaço entre palavras se necessário
  let processed = normalized;
  if (shouldInsertSpace(prevTail, normalized)) {
    processed = ' ' + normalized;
  }

  // Step 6: Colapsar múltiplos espaços fora de código
  // Recalcular code blocks com o novo combined
  const newCombined = prevTail + processed;
  const newCodeBlocks = extractCodeBlocks(newCombined);
  processed = collapseSpaces(processed, newCodeBlocks);

  // Step 7: Extrair tail (últimos 3 caracteres para próxima iteração)
  const bufferForTail = prevTail + processed;
  const tail = bufferForTail.length > 3 ? bufferForTail.slice(-3) : bufferForTail;

  return {
    safe: processed,
    tail,
  };
}

/**
 * finalizeMessage(text)
 *
 * Finaliza a mensagem após streaming completo:
 * - Remove espaço antes de pontuação (., !, ?, etc.)
 * - Colapsa sequências de breaks > 2 para \n\n
 * - Remove apenas espaços finais (trailing), preserva breaks internos
 * - Remove control chars (opcional, configurável)
 * - Preserva markdown e estrutura
 *
 * NÃO transforma \n em <br>, isso é responsabilidade da renderização
 */
export function finalizeMessage(text: string, options?: { removeControlChars?: boolean }): string {
  if (!text) return '';

  const { removeControlChars = true } = options || {};

  let final = text;

  // Step 1: Remove espaço antes de pontuação
  final = final.replace(/\s+([!?.,;:\)\]\}])/g, '$1');

  // Step 2: Colapsa 3+ breaks para 2
  final = final.replace(/\n{3,}/g, '\n\n');

  // Step 3: Remove espaços finais (trailing) por linha, mas preserva breaks internos
  final = final
    .split('\n')
    .map((line) => {
      // Remover espaços no final de cada linha
      let trimmedEnd = line;
      let endIdx = line.length - 1;
      while (endIdx >= 0 && /[ \t\f\v\u00A0]/.test(line[endIdx])) {
        endIdx--;
      }
      trimmedEnd = line.slice(0, endIdx + 1);
      return trimmedEnd;
    })
    .join('\n');

  // Step 4: Remove control chars indesejados (opcional)
  if (removeControlChars) {
    final = final.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  }

  // Step 5: Garantir que não termina com espaços (mas pode terminar com \n)
  let lastNonSpace = final.length - 1;
  while (lastNonSpace >= 0 && final[lastNonSpace] !== '\n' && /[ \t\f\v\u00A0]/.test(final[lastNonSpace])) {
    lastNonSpace--;
  }
  final = final.slice(0, lastNonSpace + 1);

  return final;
}

/**
 * extractJsonBlocks(text)
 *
 * Extrai blocos JSON (para isolamento em painel colapsável)
 * Padrão: { "..." no final ou isolado
 */
export function extractJsonBlocks(text: string): {
  content: string;
  jsonBlocks: Array<{ json: string; index: number }>;
} {
  const jsonBlocks: Array<{ json: string; index: number }> = [];

  // Padrão: linha começando com { e contendo "
  const jsonLineRegex = /^(\s*\{[\s\S]*?"[\s\S]*?\})\s*$/m;

  let content = text;
  let match;
  let offset = 0;

  while ((match = jsonLineRegex.exec(content)) !== null) {
    const jsonStr = match[1];
    const jsonIndex = offset + match.index;

    try {
      JSON.parse(jsonStr);
      jsonBlocks.push({ json: jsonStr, index: jsonIndex });
      // Remover JSON do content
      content = content.slice(0, match.index) + content.slice(match.index + match[0].length);
    } catch {
      // Não é JSON válido, continuar
      offset += match.index + match[0].length;
      const nextContent = content.slice(match.index + match[0].length);
      content = content.slice(0, match.index) + nextContent;
    }
  }

  return { content: content.trim(), jsonBlocks };
}

/**
 * Configuração de telemetria (dev only)
 */
export interface StreamMetrics {
  chunkCount: number;
  insertedSpaces: number;
  totalCharsProcessed: number;
  finalLength: number;
}

let metrics: StreamMetrics = {
  chunkCount: 0,
  insertedSpaces: 0,
  totalCharsProcessed: 0,
  finalLength: 0,
};

/**
 * recordChunkMetric(chunkLen, spacesAdded)
 */
export function recordChunkMetric(chunkLen: number, spacesAdded: number = 0): void {
  metrics.chunkCount++;
  metrics.totalCharsProcessed += chunkLen;
  metrics.insertedSpaces += spacesAdded;

  if (process.env.NODE_ENV === 'development') {
    console.debug(`[StreamNorm] Chunk #${metrics.chunkCount}: +${chunkLen} chars, +${spacesAdded} spaces`);
  }
}

/**
 * recordFinalMetric(finalLen)
 */
export function recordFinalMetric(finalLen: number): void {
  metrics.finalLength = finalLen;

  if (process.env.NODE_ENV === 'development') {
    console.log('[StreamNorm] Final metrics:', {
      chunkCount: metrics.chunkCount,
      insertedSpaces: metrics.insertedSpaces,
      totalCharsProcessed: metrics.totalCharsProcessed,
      finalLength: finalLen,
      compressionRatio: (finalLen / (metrics.totalCharsProcessed || 1)).toFixed(2),
    });
  }
}

/**
 * resetMetrics()
 */
export function resetMetrics(): void {
  metrics = {
    chunkCount: 0,
    insertedSpaces: 0,
    totalCharsProcessed: 0,
    finalLength: 0,
  };
}

export default {
  normalizeChunk,
  finalizeMessage,
  extractJsonBlocks,
  recordChunkMetric,
  recordFinalMetric,
  resetMetrics,
};
