const isTruthyDeepFlag = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return ['true', 'sim', 'yes', '1', 'ativa', 'ativada'].includes(normalized);
  }
  if (typeof value === 'number') return value === 1;
  return false;
};

const detectDeepQuestionInObject = (payload: unknown): boolean => {
  if (!payload || typeof payload !== 'object') return false;
  if (Array.isArray(payload)) {
    return payload.some((item) => detectDeepQuestionInObject(item));
  }
  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    const normalizedKey = key.toLowerCase().replace(/[^a-z]/g, '');
    if (
      normalizedKey.includes('perguntaprofunda') ||
      normalizedKey.includes('deepquestion')
    ) {
      if (isTruthyDeepFlag(value)) return true;
    }
    if (typeof value === 'object' && value !== null) {
      if (detectDeepQuestionInObject(value)) return true;
    }
  }
  return false;
};

const detectDeepQuestionInText = (text?: string | null): boolean => {
  if (!text) return false;
  const normalized = text.toLowerCase();
  if (normalized.includes('#pergunta_profunda') || normalized.includes('#perguntaprofunda')) return true;
  if (normalized.includes('[pergunta_profunda]') || normalized.includes('[perguntaprofunda]')) return true;
  if (/pergunta[_\s-]?profunda\s*[:=]\s*(true|sim|yes|1|ativa|ativada)/.test(normalized)) return true;
  if (/deep[_\s-]?question\s*[:=]\s*(true|yes|1)/.test(normalized)) return true;
  if (/"pergunta_profunda"\s*:\s*(true|"true"|"sim"|1)/.test(normalized)) return true;
  if (/"deep_question"\s*:\s*(true|"true"|1)/.test(normalized)) return true;
  if (normalized.includes('flag:pergunta_profunda') || normalized.includes('flag:perguntaprofunda')) return true;
  return false;
};

export const extractDeepQuestionFlag = ({
  block,
  responseText,
  messageText,
}: {
  block?: unknown;
  responseText?: string | null;
  messageText?: string | null;
}): boolean => {
  if (detectDeepQuestionInObject(block)) return true;
  if (detectDeepQuestionInText(responseText)) return true;
  if (detectDeepQuestionInText(messageText)) return true;
  return false;
};
