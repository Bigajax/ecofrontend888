import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

/**
 * `lazy()` resiliente a chunk antigo após deploy.
 *
 * Problema: o rewrite SPA da Vercel (`/(.*) -> /index.html`) é aplicado depois
 * do filesystem. Quando sai um deploy novo, os chunks com hash antigo somem;
 * uma aba aberta (comum no iOS/tráfego pago) ainda referencia o hash velho. O
 * `import()` desse chunk não dá 404 — cai no rewrite e recebe `index.html`
 * (HTML) com 200. O browser tenta interpretar HTML como módulo JS e lança
 * "Failed to load module script…", que sobe pro RootErrorBoundary ("Algo deu
 * errado"). O `index.html` é `no-cache`, então um reload basta pra buscar o
 * HTML fresco com os hashes novos e o import passa.
 *
 * Aqui interceptamos a falha do import e recarregamos UMA vez (guardado por
 * sessionStorage pra não entrar em loop quando o reload não resolve — ex.: a
 * pessoa está mesmo offline).
 */

const RELOAD_FLAG_KEY = 'eco.chunkReload.ts';
const RELOAD_WINDOW_MS = 10_000;

/** Heurística ampla pros erros de import dinâmico nos vários browsers. */
export function isChunkLoadError(err: unknown): boolean {
  const e = err as { name?: string; message?: string } | null | undefined;
  if (!e) return false;
  if (e.name === 'ChunkLoadError') return true;
  const msg = (e.message || '').toLowerCase();
  return (
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('importing a module script failed') ||
    msg.includes('failed to load module script') ||
    msg.includes('expected a javascript module') ||
    (msg.includes('module script') && msg.includes('mime'))
  );
}

/**
 * Decide se recarrega: true na 1ª vez (e marca o instante), false se já
 * recarregamos dentro da janela — evita o loop de reload quando o problema
 * persiste. sessionStorage indisponível (modo privado) → não arrisca o loop.
 */
export function shouldReloadForChunkError(now: number = Date.now()): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_FLAG_KEY) || 0);
    if (Number.isFinite(last) && now - last < RELOAD_WINDOW_MS) return false;
    sessionStorage.setItem(RELOAD_FLAG_KEY, String(now));
    return true;
  } catch {
    return false;
  }
}

export function lazyWithReload<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(() =>
    factory().catch((err: unknown) => {
      if (isChunkLoadError(err) && shouldReloadForChunkError()) {
        window.location.reload();
        // Promise que nunca resolve: segura o render até o reload trocar a
        // página, sem piscar a tela de erro antes de recarregar.
        return new Promise<{ default: T }>(() => {});
      }
      throw err;
    }),
  );
}
