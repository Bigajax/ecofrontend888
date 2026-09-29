// Progresso do Caleidoscópio Mind Movie: a página do programa, os episódios e o
// useProgramProgress (home) leem a mesma chave, então ela mora num lugar só.

export type CaleidoscopioEpisodeId = 'manifestacao_saude' | 'manifestacao_dinheiro';

const completedKey = (uid: string) => `eco.caleidoscopio.completed.v1.${uid}`;
const lastActiveKey = (uid: string) => `eco.program.lastActive.caleidoscopio.${uid}`;

export function readCaleidoscopioCompleted(uid: string): Set<string> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(completedKey(uid)) || '[]');
    return new Set(Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

export function markCaleidoscopioEpisodeCompleted(uid: string, episodeId: CaleidoscopioEpisodeId): void {
  try {
    const done = readCaleidoscopioCompleted(uid);
    done.add(episodeId);
    localStorage.setItem(completedKey(uid), JSON.stringify([...done]));
    localStorage.setItem(lastActiveKey(uid), new Date().toISOString());
  } catch {
    // Storage bloqueado (aba privada): o episódio segue, só não fica marcado.
  }
}
