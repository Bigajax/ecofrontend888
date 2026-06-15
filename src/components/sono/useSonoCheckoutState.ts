import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { SubscriptionState } from '@/types/subscription';

/**
 * Sub-estados do checkout inline do funil do sono (modelo C). A oferta e o
 * cadastro/cartão acontecem dentro da própria /sono/experiencia, no tema escuro,
 * sem pular pro /assinar.
 *
 *   reflection → offer → signup → card → confirming → unlocked
 */
export type SonoCheckoutStep =
  | 'reflection'
  | 'offer'
  | 'signup'
  | 'card'
  | 'confirming'
  | 'unlocked';

/** `null` = overlay fechado. Qualquer step = overlay aberto naquele passo. */
export type SonoCheckoutState = SonoCheckoutStep | null;

const URL_PARAM = 'checkout';
const SS_KEY = 'eco.sono.checkout.step';

const STEPS: readonly SonoCheckoutStep[] = [
  'reflection',
  'offer',
  'signup',
  'card',
  'confirming',
  'unlocked',
];

function parseStep(value: string | null): SonoCheckoutState {
  return value && (STEPS as readonly string[]).includes(value)
    ? (value as SonoCheckoutStep)
    : null;
}

/**
 * Lê o passo inicial preferindo a URL (`?checkout=`) e caindo no sessionStorage
 * como backstop. O backstop é o que salva o overlay quando o RootProviders
 * remonta a árvore pós-cadastro (userId guest→real) e — em algum caminho — a
 * query é perdida antes do restore.
 */
function readInitialStep(params: URLSearchParams): SonoCheckoutState {
  const fromUrl = parseStep(params.get(URL_PARAM));
  if (fromUrl) return fromUrl;
  if (typeof window !== 'undefined') {
    return parseStep(window.sessionStorage.getItem(SS_KEY));
  }
  return null;
}

/**
 * Estado do checkout inline com persistência em URL + sessionStorage, para
 * sobreviver ao remount da árvore disparado pelo cadastro (userId muda →
 * RootProviders remonta AppRoutes, como já acontece no /assinar via `?step=`).
 */
export function useSonoCheckoutState() {
  const [params, setParams] = useSearchParams();
  const [step, setStep] = useState<SonoCheckoutState>(() => readInitialStep(params));

  // Sincroniza URL (?checkout=) + sessionStorage sempre que o passo muda.
  useEffect(() => {
    const current = params.get(URL_PARAM);
    const next = step ?? null;

    if (next) {
      window.sessionStorage.setItem(SS_KEY, next);
      if (current !== next) {
        const p = new URLSearchParams(params);
        p.set(URL_PARAM, next);
        setParams(p, { replace: true });
      }
    } else {
      window.sessionStorage.removeItem(SS_KEY);
      if (current !== null) {
        const p = new URLSearchParams(params);
        p.delete(URL_PARAM);
        setParams(p, { replace: true });
      }
    }
  }, [step, params, setParams]);

  const open = useCallback((at: SonoCheckoutStep = 'reflection') => setStep(at), []);
  const goTo = useCallback((to: SonoCheckoutStep) => setStep(to), []);
  const close = useCallback(() => setStep(null), []);

  return {
    /** Passo atual; `null` quando o overlay está fechado. */
    step,
    /** Conveniência para condicionar a renderização do overlay. */
    isOpen: step !== null,
    open,
    goTo,
    close,
  };
}

/**
 * Confirma a assinatura recém-criada fazendo polling do backend (o premium é
 * ativado de forma assíncrona pelo webhook do Mercado Pago). Mesma estratégia
 * do SubscriptionCallbackPage: usa o snapshot RETORNADO por refreshSubscription
 * (o `subscription` do contexto fica congelado no closure) e tolera atraso do
 * webhook com algumas tentativas.
 *
 * @returns `true` quando a assinatura está ativa (trial/premium); `false` se
 *          continuar pendente após todas as tentativas.
 */
export async function pollSonoSubscriptionActive(
  refreshSubscription: () => Promise<SubscriptionState | null>,
  opts: { tries?: number; intervalMs?: number } = {},
): Promise<boolean> {
  const tries = opts.tries ?? 5;
  const intervalMs = opts.intervalMs ?? 2000;

  for (let attempt = 0; attempt < tries; attempt++) {
    let current: SubscriptionState | null = null;
    try {
      current = await refreshSubscription();
    } catch {
      // Rede instável — segue tentando até esgotar.
    }

    const hasAccess =
      !!current?.accessUntil && new Date(current.accessUntil) > new Date();
    const isActive = current?.status === 'active';
    const notFree = !!current && current.plan !== 'free';

    if (current && hasAccess && isActive && notFree) return true;

    if (attempt < tries - 1) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  return false;
}
