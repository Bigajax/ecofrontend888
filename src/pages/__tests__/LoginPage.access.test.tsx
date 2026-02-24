import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing the component
const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/login', search: '', hash: '', state: null }),
  useMatch: () => null,
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    signIn: vi.fn(),
    signInWithGoogle: vi.fn(),
    signInWithGoogleIdToken: vi.fn(),
    user: null,
  }),
}));

vi.mock('../../lib/mixpanel', () => ({
  default: { track: vi.fn() },
}));

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}));

vi.mock('../../components/PhoneFrame', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../components/HomePageTour', () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="home-page-tour">
      <button onClick={onClose}>Fechar tour</button>
    </div>
  ),
}));

vi.mock('../../hooks/useGoogleOneTap', () => ({
  useGoogleOneTap: vi.fn(),
}));

const { default: LoginPage } = await import('../LoginPage');

describe('LoginPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    localStorage.clear();
  });

  it('renderiza campos email e senha', () => {
    render(<LoginPage />);
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Senha')).toBeInTheDocument();
  });

  it('botão "Experimentar gratuitamente →" existe e ativa tour', async () => {
    render(<LoginPage />);
    const tourBtn = screen.getByText('Experimentar gratuitamente →');
    expect(tourBtn).toBeInTheDocument();

    fireEvent.click(tourBtn);
    await waitFor(() => {
      expect(screen.getByTestId('home-page-tour')).toBeInTheDocument();
    });
  });

  it('botão Google OAuth existe e está habilitado', () => {
    render(<LoginPage />);
    const googleBtn = screen.getByText('Entrar com Google');
    expect(googleBtn).toBeInTheDocument();
    expect(googleBtn).not.toBeDisabled();
  });

  it('link "Criar uma nova conta" navega para /register', () => {
    render(<LoginPage />);
    const createBtn = screen.getByText('Criar uma nova conta');
    fireEvent.click(createBtn);
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.stringContaining('/register')
    );
  });

  it('não lê senha do localStorage na inicialização', () => {
    localStorage.setItem('eco.lastPassword', 'senha123');
    render(<LoginPage />);
    const passwordField = screen.getByPlaceholderText('Senha') as HTMLInputElement;
    expect(passwordField.value).toBe('');
  });

  it('carrega email salvo do localStorage', () => {
    localStorage.setItem('eco.lastEmail', 'usuario@eco.com');
    render(<LoginPage />);
    const emailField = screen.getByPlaceholderText('Email') as HTMLInputElement;
    expect(emailField.value).toBe('usuario@eco.com');
  });
});
