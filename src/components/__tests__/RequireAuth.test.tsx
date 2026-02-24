import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('react-router-dom', () => ({
  Navigate: ({ to }: { to: string }) => <div data-testid="navigate" data-to={to} />,
}));

// Mutable mock state for auth
let mockAuthState = {
  user: null as object | null,
  loading: false,
  isGuestMode: false,
  loginAsGuest: vi.fn(),
};

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));

vi.mock('../../constants/guestExperience', () => ({
  GUEST_EXPERIENCE_FEATURES: {
    AUTO_GUEST_MODE: false,
  },
}));

// Import AFTER mocks are set up
const { default: RequireAuth } = await import('../RequireAuth');

describe('RequireAuth', () => {
  beforeEach(() => {
    mockAuthState = {
      user: null,
      loading: false,
      isGuestMode: false,
      loginAsGuest: vi.fn(),
    };
  });

  it('exibe loading skeleton enquanto auth verifica', async () => {
    mockAuthState.loading = true;
    render(
      <RequireAuth>
        <div>protegido</div>
      </RequireAuth>
    );
    expect(screen.getByText('Validando sessão…')).toBeInTheDocument();
    expect(screen.queryByText('protegido')).not.toBeInTheDocument();
  });

  it('usuário autenticado renderiza children', async () => {
    mockAuthState.user = { id: 'user-123' };
    render(
      <RequireAuth>
        <div>conteúdo protegido</div>
      </RequireAuth>
    );
    await waitFor(() => {
      expect(screen.getByText('conteúdo protegido')).toBeInTheDocument();
    });
  });

  it('isGuestMode=true renderiza children sem redirect', async () => {
    mockAuthState.isGuestMode = true;
    render(
      <RequireAuth>
        <div>área do convidado</div>
      </RequireAuth>
    );
    await waitFor(() => {
      expect(screen.getByText('área do convidado')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('navigate')).not.toBeInTheDocument();
  });

  it('sem user, sem guest, AUTO_GUEST_MODE=false → redirect /login', async () => {
    render(
      <RequireAuth>
        <div>não deve aparecer</div>
      </RequireAuth>
    );
    await waitFor(() => {
      const nav = screen.getByTestId('navigate');
      expect(nav).toHaveAttribute('data-to', '/login');
    });
    expect(screen.queryByText('não deve aparecer')).not.toBeInTheDocument();
  });

  it('não chama loginAsGuest quando AUTO_GUEST_MODE=false', async () => {
    const loginAsGuest = vi.fn();
    mockAuthState.loginAsGuest = loginAsGuest;
    render(
      <RequireAuth>
        <div>conteúdo</div>
      </RequireAuth>
    );
    await waitFor(() => {
      expect(screen.getByTestId('navigate')).toBeInTheDocument();
    });
    expect(loginAsGuest).not.toHaveBeenCalled();
  });
});
