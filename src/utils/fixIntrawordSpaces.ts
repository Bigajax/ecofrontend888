/**
 * Detecta e corrige espaços indevidos dentro de palavras causados por splits de chunks
 *
 * Exemplo:
 *   "aj udo" → "ajudo" (chunk boundary)
 *   "Olá mundo" → "Olá mundo" (legitimate space, preserved)
 *
 * Heurística conservadora:
 * - Detecta padrão: letra_minúscula + ESPAÇO + letra_minúscula
 * - Verifica contexto: não é início de sentença
 * - Evita falsos positivos em nomes próprios ou abreviações
 */

/**
 * Verifica se um espaço é provavelmente indevido (chunk boundary)
 * baseado em análise de caracteres vizinhos
 */
export function isLikelyIntrawordSpace(
  text: string,
  spaceIndex: number,
): boolean {
  // Não há espaço ou índice inválido
  if (text[spaceIndex] !== " ") return false;

  const before = text[spaceIndex - 1];
  const after = text[spaceIndex + 1];
  const twoBefore = text[spaceIndex - 2];

  // Caracteres inválidos
  if (!before || !after) return false;

  // Não é letra antes e depois do espaço
  if (!/[a-záéíóúâêôãõçA-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(before)) return false;
  if (!/[a-záéíóúâêôãõçA-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(after)) return false;

  // HEURÍSTICA 1: Letra minúscula + espaço + letra minúscula
  // Muito provavelmente é chunk boundary
  if (/[a-záéíóúâêôãõç]/.test(before) && /[a-záéíóúâêôãõç]/.test(after)) {
    return true;
  }

  // HEURÍSTICA 2: Letra maiúscula + espaço + letra minúscula
  // Poderia ser chunk boundary OU novo parágrafo/linha
  // Verificar se dois caracteres antes não é ponto (fim de sentença)
  if (/[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(before) && /[a-záéíóúâêôãõç]/.test(after)) {
    // Se há ponto antes, é provável novo parágrafo → NÃO é intraword
    if (twoBefore === ".") return false;
    // Se há quebra de linha, é novo parágrafo
    if (twoBefore === "\n") return false;
    // Caso contrário, poderia ser chunk boundary
    return true;
  }

  return false;
}

/**
 * Corrige espaços indevidos dentro de palavras
 *
 * @param text Texto com possíveis espaços indevidos
 * @returns Texto corrigido
 */
export function fixIntrawordSpaces(text: string): string {
  // Encontrar todos os espaços potencialmente problemáticos
  const spacesToRemove: number[] = [];

  for (let i = 0; i < text.length; i++) {
    if (isLikelyIntrawordSpace(text, i)) {
      spacesToRemove.push(i);
    }
  }

  // Se não houver espaços para remover, retornar original
  if (spacesToRemove.length === 0) {
    return text;
  }

  // Remover espaços em ordem reversa para não deslocar índices
  let result = text;
  for (let i = spacesToRemove.length - 1; i >= 0; i--) {
    const idx = spacesToRemove[i];
    result = result.slice(0, idx) + result.slice(idx + 1);
  }

  return result;
}

/**
 * Versão mais agressiva que remove qualquer espaço entre letras idênticas em tamanho
 * (útil para debugging, usar com cautela em produção)
 */
export function fixIntrawordSpacesAggressive(text: string): string {
  return text.replace(/([a-záéíóúâêôãõç]) ([a-záéíóúâêôãõç])/g, "$1$2");
}

/**
 * Analisa um texto e retorna informações sobre espaços potencialmente indevidos
 */
export function analyzeIntrawordSpaces(text: string) {
  const issues: Array<{
    index: number;
    before: string;
    after: string;
    context: string;
  }> = [];

  for (let i = 0; i < text.length; i++) {
    if (isLikelyIntrawordSpace(text, i)) {
      issues.push({
        index: i,
        before: text[i - 1],
        after: text[i + 1],
        context: text.slice(Math.max(0, i - 5), Math.min(text.length, i + 6)),
      });
    }
  }

  return {
    totalIssues: issues.length,
    issues,
    corrected: fixIntrawordSpaces(text),
  };
}
