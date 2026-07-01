/**
 * Diário Estoico — texto → fala (TTS/ElevenLabs)
 *
 * Fonte única para transformar uma reflexão (título + citação + autor/fonte +
 * comentário) num roteiro limpo que o ElevenLabs lê com cadência natural.
 *
 * Por que existe: o texto editorial é ótimo para LER, mas péssimo para OUVIR —
 * a fonte "Meditações, 7.15" vira "vírgula sete ponto quinze", os títulos em
 * CAIXA-ALTA são soletrados/super-enfatizados, e marcas de edição ([...], glosas,
 * bullets, aspas aninhadas) poluem a fala. Aqui normalizamos tudo isso e inserimos
 * pausas deliberadas com tags <break> nos limites de bloco.
 *
 * Sobre as tags <break>: o conteúdo é PT-BR, então o backend fala com um modelo
 * multilingual do ElevenLabs — todos suportam <break time="...">. As tags precisam
 * chegar ao ElevenLabs sem escape (o backend deve repassar o `text` verbatim). Se um
 * dia quiser desligar as tags, ponha USE_BREAK_TAGS = false: o roteiro continua legível
 * porque cada bloco termina com pontuação final (o ElevenLabs pausa na pontuação).
 */

import type { DailyMaxim } from './getTodayMaxim';

// Liga/desliga as tags <break>. Com false, as pausas ficam por conta da pontuação.
const USE_BREAK_TAGS = true;

// Durações das pausas por tipo de limite. Ajuste fino de cadência mora aqui.
const BREAK_SECTION = '1.0s'; // título→citação, atribuição→comentário
const BREAK_QUOTE = '0.5s'; // citação→atribuição (respiro mais curto)

const breakTag = (time: string) => (USE_BREAK_TAGS ? ` <break time="${time}" /> ` : ' ');

export interface ReflectionSpeechParts {
  title?: string;
  text?: string; // a citação
  author?: string;
  source?: string;
  comment?: string;
}

/** Fonte falável: remove a referência numérica ("Meditações, 7.15" → "Meditações"). */
const speakableWork = (source?: string): string =>
  String(source ?? '')
    .replace(/[\s,;:—–-]*\d.*$/u, '') // corta a partir do 1º dígito e separadores antes dele
    .trim();

/** "Marco Aurélio, em Meditações" (ou só o autor, se a obra não tiver nome legível). */
const buildAttribution = (author?: string, source?: string): string => {
  const who = String(author ?? '').trim();
  if (!who) return '';
  const work = speakableWork(source);
  return work ? `${who}, em ${work}` : who;
};

/**
 * Se o texto for majoritariamente MAIÚSCULO (títulos dos meses recentes), converte
 * para caixa normal — senão o ElevenLabs tende a soletrar ou super-enfatizar.
 */
const humanizeHeading = (s: string): string => {
  const letters = s.replace(/[^\p{L}]/gu, '');
  const uppers = s.replace(/[^\p{Lu}]/gu, '');
  if (letters.length === 0 || uppers.length / letters.length < 0.7) return s;
  const lower = s.toLocaleLowerCase('pt-BR');
  return lower.charAt(0).toLocaleUpperCase('pt-BR') + lower.slice(1);
};

/** Limpa um trecho de prosa (citação ou comentário) para leitura em voz alta. */
const cleanProse = (s: string): string =>
  String(s ?? '')
    // "[...]" / "[…]" (omissão editorial) → reticências naturais
    .replace(/\[\s*(?:\.{2,}|…)\s*\]/gu, '…')
    // glosas/traduções entre colchetes → vírgulas (mantém o conteúdo legível)
    .replace(/\s*\[([^\]]+)\]\s*/gu, ', $1, ')
    // bullets viram fim de frase
    .replace(/\s*[•·]\s*/gu, '. ')
    // aspas (retas e tipográficas) não agregam à fala — o ElevenLabs não as lê
    .replace(/["“”]/gu, '')
    // parágrafos e quebras viram espaço (cada parágrafo já termina em pontuação → pausa)
    .replace(/\s*\n+\s*/gu, ' ')
    // higiene: remove espaço antes de pontuação (menos "…", que serve de omissão)
    .replace(/\s+([,.;:!?])/gu, '$1')
    .replace(/\s{2,}/gu, ' ')
    .trim();

/** Garante que um bloco termine com pontuação final (para a pausa cair certo). */
const endSentence = (s: string): string => {
  const t = s.trim();
  if (!t) return '';
  return /[.!?…]$/u.test(t) ? t : `${t}.`;
};

/**
 * Monta o roteiro falado de uma reflexão. Aceita partes soltas para reaproveitar
 * na prévia do guest (citação/comentário truncados).
 */
export function buildReflectionSpeech(parts: ReflectionSpeechParts): string {
  const title = parts.title ? humanizeHeading(cleanProse(parts.title)) : '';
  const quote = parts.text ? cleanProse(parts.text) : '';
  const attribution = cleanProse(buildAttribution(parts.author, parts.source));
  const comment = parts.comment ? cleanProse(parts.comment) : '';

  // Cada bloco carrega a pausa que vem DEPOIS dele; a pausa só é inserida ENTRE
  // blocos — o último nunca ganha um <break> solto no fim.
  const blocks: Array<{ text: string; breakAfter: string }> = [];
  if (title) blocks.push({ text: endSentence(title), breakAfter: BREAK_SECTION });
  if (quote) blocks.push({ text: endSentence(quote), breakAfter: attribution ? BREAK_QUOTE : BREAK_SECTION });
  if (attribution) blocks.push({ text: endSentence(attribution), breakAfter: BREAK_SECTION });
  if (comment) blocks.push({ text: comment, breakAfter: BREAK_SECTION });

  const out: string[] = [];
  blocks.forEach((block, i) => {
    out.push(block.text);
    if (i < blocks.length - 1) out.push(breakTag(block.breakAfter));
  });

  return out
    .join(' ')
    .replace(/\s{2,}/gu, ' ')
    .trim();
}

/** Atalho para o caso comum: a reflexão inteira. */
export const buildReflectionSpeechFromMaxim = (maxim: DailyMaxim): string =>
  buildReflectionSpeech({
    title: maxim.title,
    text: maxim.text,
    author: maxim.author,
    source: maxim.source,
    comment: maxim.comment,
  });
