import mixpanel from '@/lib/mixpanel';

/**
 * Tracking das landings genéricas — taxonomia "Landing · *".
 *
 * Regra das duas taxonomias (decisão jun/2026):
 * - "Landing · *"    → landings genéricas (/, /precos, /meditacao, /eco-ia,
 *   /estoicismo, /disciplina, /dr-joe-dispenza, /ansiedade).
 * - "Funil Sono · *" → EXCLUSIVO do funil /sono + /assinar
 *   (src/lib/mixpanelAssinarFunnel.ts). Não misturar as duas numa mesma página.
 *
 * Todo evento "Landing · *" leva a prop `pagina` (mesmo slug usado no
 * "Landing · Vista" de cada página) pra segmentar as análises por landing.
 */

const PAGINA_BY_PATH: Record<string, string> = {
  '/': 'principal',
  '/precos': 'precos',
  '/meditacao': 'meditacao',
  '/eco-ia': 'eco_ia',
  '/estoicismo': 'estoicismo',
  '/disciplina': 'aneis',
  '/dr-joe-dispenza': 'dispenza',
  '/ansiedade': 'ansiedade',
  '/sono': 'sono',
};

/** Slug da landing atual (mesmos valores da prop `pagina` do "Landing · Vista"). */
export function paginaFromPath(pathname: string = window.location.pathname): string {
  const clean = pathname.replace(/\/+$/, '') || '/';
  return PAGINA_BY_PATH[clean] ?? clean;
}

type CtaPayload = {
  section: 'hero' | 'pricing' | 'pricing_page' | 'fechamento' | 'objections' | 'biblioteca';
  plan?: 'monthly' | 'annual';
  from: string;
  headline_variant?: '1' | '2';
};

export function trackLandingCta(payload: CtaPayload) {
  try {
    mixpanel.track('Landing · CTA clicado', { pagina: paginaFromPath(), ...payload });
  } catch {
    // tracking nunca pode quebrar UX
  }
}

export function trackLandingSectionViewed(section: string, headline_variant?: '1' | '2') {
  try {
    mixpanel.track('Landing · Seção vista', { pagina: paginaFromPath(), section, headline_variant });
  } catch {
    // noop
  }
}
