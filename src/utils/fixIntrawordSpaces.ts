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
 *
 * IMPORTANTE: Com normalizeChunk inserindo espaços, esta função deve ser
 * muito conservadora. Só remove espaços que REALMENTE parecem ser errors,
 * não espaços normais entre palavras.
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
  const threeBefore = text[spaceIndex - 3];

  // Caracteres inválidos
  if (!before || !after) return false;

  // Não é letra antes e depois do espaço
  if (!/[a-záéíóúâêôãõçA-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(before)) return false;
  if (!/[a-záéíóúâêôãõçA-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(after)) return false;

  // MUITO CONSERVADOR: Só remove se parece ser um erro específico
  // NÃO remover espaços normais entre palavras
  // Padrão de erro típico: palavra longa + espaço + 1-2 letras
  // Ex: "importante s" (chunk quebrado no meio), "palavra a" (fim de palavra cortado)

  // Verificar se há mais contexto antes do espaço (evita nomes/inícios de palavra)
  const lengthBefore = (() => {
    let count = 0;
    for (let i = spaceIndex - 1; i >= 0 && /[a-záéíóúâêôãõç]/.test(text[i]); i--) {
      count++;
    }
    return count;
  })();

  // Verificar se há mais contexto depois do espaço
  const lengthAfter = (() => {
    let count = 0;
    for (let i = spaceIndex + 1; i < text.length && /[a-záéíóúâêôãõç]/.test(text[i]); i++) {
      count++;
    }
    return count;
  })();

  // HEURÍSTICA: Somente remover se:
  // - há muitas letras antes (>= 4) e poucas depois (1-2)
  // - OU há poucas letras antes (1-2) e muitas depois (>= 4)
  // Isso evita remover espaços legítimos entre palavras normais
  const beforeIsLong = lengthBefore >= 4;
  const afterIsShort = lengthAfter <= 2;
  const beforeIsShort = lengthBefore <= 2;
  const afterIsLong = lengthAfter >= 4;

  if ((beforeIsLong && afterIsShort) || (beforeIsShort && afterIsLong)) {
    // Dupla verificação: não remover se há pontuação próxima (indica frase/parágrafo)
    if (twoBefore === "." || threeBefore === ".") return false;
    if (twoBefore === "\n") return false;
    return true;
  }

  return false;
}

/**
 * Corrige espaços indevidos dentro de palavras
 *
 * NOTA: Com normalizeChunk inserindo espaços automaticamente,
 * esta função é agora um fallback muito conservador.
 * A maioria dos espaços legítimos deve ser preservada.
 *
 * @param text Texto com possíveis espaços indevidos
 * @returns Texto corrigido
 */
export function fixIntrawordSpaces(text: string): string {
  // Com normalizeChunk ativo, esta função é praticamente um no-op
  // Ela só remove espaços em casos MUITO óbvios de chunk boundaries
  //
  // Para agora: apenas retorna o texto como está, deixando
  // normalizeChunk fazer o trabalho
  // Futuramente: se precisarmos de fallback, usar heurística com dictionary

  return text;
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
