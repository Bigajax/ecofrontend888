import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { SubscriptionState } from '@/types/subscription';
import {
  useSonoCheckoutState,
  pollSonoSubscriptionActive,
} from '../useSonoCheckoutState';

const SS_KEY = 'eco.sono.checkout.step';

function wrapperFor(initialUrl: string) {
  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[initialUrl]}>{children}</MemoryRouter>
  );
}

beforeEach(() => {
  sessionStorage.clear();
});

describe('useSonoCheckoutState', () => {
  it('sem ?checkout= e sem storage → fechado', () => {
    const { result } = renderHook(() => useSonoCheckoutState(), {
      wrapper: wrapperFor('/sono/experiencia'),
    });
    expect(result.current.step).toBeNull();
    expect(result.current.isOpen).toBe(false);
  });

  it('open() abre o passo e persiste no sessionStorage', () => {
    const { result } = renderHook(() => useSonoCheckoutState(), {
      wrapper: wrapperFor('/sono/experiencia'),
    });
    act(() => result.current.open('reflection'));
    expect(result.current.step).toBe('reflection');
    expect(result.current.isOpen).toBe(true);
    expect(sessionStorage.getItem(SS_KEY)).toBe('reflection');
  });

  it('restaura de ?checkout=card na URL (remount pós-cadastro)', () => {
    const { result } = renderHook(() => useSonoCheckoutState(), {
      wrapper: wrapperFor('/sono/experiencia?checkout=card'),
    });
    expect(result.current.step).toBe('card');
    expect(result.current.isOpen).toBe(true);
  });

  it('cai no sessionStorage quando a URL perde o param', () => {
    sessionStorage.setItem(SS_KEY, 'card');
    const { result } = renderHook(() => useSonoCheckoutState(), {
      wrapper: wrapperFor('/sono/experiencia'),
    });
    expect(result.current.step).toBe('card');
  });

  it('valor inválido no param → fechado', () => {
    const { result } = renderHook(() => useSonoCheckoutState(), {
      wrapper: wrapperFor('/sono/experiencia?checkout=xpto'),
    });
    expect(result.current.step).toBeNull();
  });

  it('goTo() avança e close() limpa o storage', () => {
    const { result } = renderHook(() => useSonoCheckoutState(), {
      wrapper: wrapperFor('/sono/experiencia?checkout=signup'),
    });
    act(() => result.current.goTo('card'));
    expect(result.current.step).toBe('card');
    expect(sessionStorage.getItem(SS_KEY)).toBe('card');

    act(() => result.current.close());
    expect(result.current.step).toBeNull();
    expect(sessionStorage.getItem(SS_KEY)).toBeNull();
  });
});

function makeSub(partial: Partial<SubscriptionState>): SubscriptionState {
  return {
    plan: 'free',
    status: 'pending',
    trialStartDate: null,
    trialEndDate: null,
    subscriptionId: null,
    provider: 'mercadopago',
    providerPreapprovalId: null,
    providerPaymentId: null,
    planType: null,
    currentPeriodEnd: null,
    accessUntil: null,
    nextBillingDate: null,
    ...partial,
  };
}

describe('pollSonoSubscriptionActive', () => {
  it('resolve true assim que a assinatura está ativa', async () => {
    const active = makeSub({
      plan: 'trial',
      status: 'active',
      accessUntil: new Date(Date.now() + 7 * 86400000).toISOString(),
    });
    const refresh = vi.fn().mockResolvedValue(active);

    const ok = await pollSonoSubscriptionActive(refresh, { tries: 3, intervalMs: 0 });
    expect(ok).toBe(true);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('resolve false e esgota as tentativas quando segue pendente', async () => {
    const free = makeSub({ plan: 'free', status: 'pending', accessUntil: null });
    const refresh = vi.fn().mockResolvedValue(free);

    const ok = await pollSonoSubscriptionActive(refresh, { tries: 3, intervalMs: 0 });
    expect(ok).toBe(false);
    expect(refresh).toHaveBeenCalledTimes(3);
  });

  it('tolera erro de rede e continua tentando', async () => {
    const active = makeSub({
      plan: 'trial',
      status: 'active',
      accessUntil: new Date(Date.now() + 7 * 86400000).toISOString(),
    });
    const refresh = vi
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValue(active);

    const ok = await pollSonoSubscriptionActive(refresh, { tries: 3, intervalMs: 0 });
    expect(ok).toBe(true);
    expect(refresh).toHaveBeenCalledTimes(2);
  });
});
