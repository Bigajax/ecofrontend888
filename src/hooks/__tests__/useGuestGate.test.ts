import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useGuestGate, clearGuestStorage } from '../useGuestGate';

// Provide minimal guestIdentity mock (no actual network calls)
vi.mock('../../api/guestIdentity', () => ({
  getOrCreateGuestId: () => 'guest-id-test',
  clearGuestId: vi.fn(),
}));

describe('useGuestGate', () => {
  beforeEach(() => {
    localStorage.clear();
    // clearGuestStorage resets localStorage keys
    clearGuestStorage();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('contador começa em 0', () => {
    const { result } = renderHook(() => useGuestGate(false, true));
    expect(result.current.count).toBe(0);
  });

  it('registerUserInteraction() incrementa o contador', () => {
    const { result } = renderHook(() => useGuestGate(false, true));
    act(() => {
      result.current.registerUserInteraction();
    });
    expect(result.current.count).toBe(1);
  });

  it('shouldShowSoftPrompt=true após 6 interações', () => {
    const { result } = renderHook(() => useGuestGate(false, true));
    act(() => {
      for (let i = 0; i < 6; i++) {
        result.current.registerUserInteraction();
      }
    });
    expect(result.current.shouldShowSoftPrompt).toBe(true);
    expect(result.current.reachedLimit).toBe(false);
  });

  it('reachedLimit=true após 10 interações', () => {
    const { result } = renderHook(() => useGuestGate(false, true));
    act(() => {
      for (let i = 0; i < 10; i++) {
        result.current.registerUserInteraction();
      }
    });
    expect(result.current.reachedLimit).toBe(true);
  });

  it('inputDisabled=true após atingir limite', () => {
    const { result } = renderHook(() => useGuestGate(false, true));
    act(() => {
      for (let i = 0; i < 10; i++) {
        result.current.registerUserInteraction();
      }
    });
    expect(result.current.inputDisabled).toBe(true);
  });

  it('contador reseta quando isLogged=true (limpeza ao fazer login)', () => {
    const { result, rerender } = renderHook(
      ({ isLogged }: { isLogged: boolean }) => useGuestGate(isLogged, !isLogged),
      { initialProps: { isLogged: false } }
    );

    act(() => {
      result.current.registerUserInteraction();
      result.current.registerUserInteraction();
    });
    expect(result.current.count).toBe(2);

    rerender({ isLogged: true });

    expect(result.current.count).toBe(0);
    expect(result.current.inputDisabled).toBe(false);
  });

  it('persiste contador em localStorage (COUNT key)', () => {
    const { result } = renderHook(() => useGuestGate(false, true));
    act(() => {
      result.current.registerUserInteraction();
      result.current.registerUserInteraction();
      result.current.registerUserInteraction();
    });
    const stored = localStorage.getItem('eco.guest.interactionCount.v2');
    expect(stored).toBe('3');
  });

  it('limite correto é 10 turnos', () => {
    const { result } = renderHook(() => useGuestGate(false, true));
    expect(result.current.limit).toBe(10);
  });
});
