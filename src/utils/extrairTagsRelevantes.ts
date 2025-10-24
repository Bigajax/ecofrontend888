export const extrairTagsRelevantes = (texto?: string | null): string[] => {
  if (typeof texto !== "string") {
    return [];
  }

  const normalized = texto.trim();
  if (!normalized) {
    return [];
  }

  const mapa: Record<string, string[]> = {
    alegria: ['feliz', 'alegre', 'contente', 'grato', 'sorrindo', 'leve'],
    tristeza: ['triste', 'chorar', 'abatido', 'desânimo'],
    medo: ['medo', 'receio', 'inseguro'],
    ansiedade: ['ansioso', 'tenso', 'afobado'],
    raiva: ['raiva', 'ódio', 'irritado'],
    culpa: ['culpa', 'remorso'],
    vazio: ['vazio', 'sem sentido'],
    confusao: ['confuso', 'perdido', 'incerto'],
    gratidão: ['gratidão', 'agradecido', 'obrigado'],
  };

  const low = normalized.toLowerCase();
  const tags = new Set<string>();

  Object.entries(mapa).forEach(([tag, palavras]) => {
    if (palavras.some((p) => low.includes(p))) tags.add(tag);
  });

  return [...tags];
};
