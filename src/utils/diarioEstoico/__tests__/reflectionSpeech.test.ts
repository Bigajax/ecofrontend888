import { describe, it, expect } from 'vitest';
import { buildReflectionSpeech, buildReflectionSpeechFromMaxim } from '../reflectionSpeech';
import type { DailyMaxim } from '../getTodayMaxim';

const JULY_1: DailyMaxim = {
  date: '1 de julho',
  month: 'julho',
  dayNumber: 1,
  title: 'FAÇA O SEU TRABALHO',
  text: '"Seja o que for que alguém faça ou diga, de minha parte estou destinado ao bem."',
  author: 'Marco Aurélio',
  source: 'Meditações, 7.15',
  comment: 'Primeiro parágrafo do comentário.\n\nSegundo parágrafo do comentário.',
};

describe('buildReflectionSpeech', () => {
  const script = buildReflectionSpeechFromMaxim(JULY_1);

  it('remove a referência numérica da fonte (lê "em Meditações", não "7.15")', () => {
    expect(script).toContain('Marco Aurélio, em Meditações.');
    expect(script).not.toContain('7.15');
  });

  it('normaliza título em CAIXA-ALTA para caixa natural', () => {
    expect(script).toContain('Faça o seu trabalho.');
    expect(script).not.toContain('FAÇA O SEU TRABALHO');
  });

  it('remove as aspas que embrulham a citação', () => {
    // ignora as aspas das tags <break time="..."> — só a citação não pode vir embrulhada
    const semTags = script.replace(/<break[^>]*\/>/g, '');
    expect(semTags).not.toContain('"');
    expect(semTags).not.toMatch(/[“”]/);
    expect(script).toContain('Seja o que for que alguém faça ou diga');
  });

  it('insere pausas <break> nos limites de bloco', () => {
    expect(script).toMatch(/<break time="1\.0s" \/>/);
    expect(script).toMatch(/<break time="0\.5s" \/>/);
  });

  it('achata os parágrafos do comentário (sem \\n cru)', () => {
    expect(script).not.toContain('\n');
    expect(script).toContain('Primeiro parágrafo do comentário. Segundo parágrafo do comentário.');
  });

  it('converte "[...]" (omissão) em reticências e glosas em vírgulas', () => {
    const out = buildReflectionSpeech({
      text: 'Tenho a alma de uma criança, de um jovem [...] de um tirano.',
      comment: 'É praxeis koinonikas apodidonai [prestar trabalhos compartilhados] hoje.',
    });
    expect(out).toContain('de um jovem … de um tirano');
    expect(out).toContain('apodidonai, prestar trabalhos compartilhados, hoje');
    expect(out).not.toContain('[');
  });

  it('lida com partes vazias (prévia do guest só com citação)', () => {
    const out = buildReflectionSpeech({ text: 'Só a citação truncada' });
    expect(out).toBe('Só a citação truncada.');
  });
});
