import { render, screen, fireEvent, waitForElementToBeRemoved } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Brick do MP não roda em jsdom — stub leve.
vi.mock('@/components/assinar/MpCardForm', () => ({
  MpCardForm: () => <div data-testid="mp-card-form" />,
}));
vi.mock('@/lib/supabaseClient', () => ({
  supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) } },
}));
vi.mock('@/lib/mixpanel', () => ({ default: { track: vi.fn() } }));
vi.mock('@/lib/mixpanelAssinarFunnel', () => ({
  trackCartaoVisto: vi.fn(),
  trackCartaoPronto: vi.fn(),
  trackCartaoEnviado: vi.fn(),
  trackCartaoRecusado: vi.fn(),
  trackCartaoErro: vi.fn(),
}));
vi.mock('@/lib/fbpixel', () => ({
  trackWithCAPI: vi.fn(),
  ensureStartTrialEventId: vi.fn(() => 'evt'),
  getFbp: vi.fn(() => ''),
  resolveFbc: vi.fn(() => ''),
}));

import { SonoInlineCard } from './SonoInlineCard';

describe('SonoInlineCard — modal "cancele quando quiser"', () => {
  beforeEach(() => vi.clearAllMocks());

  it('abre o modal ao clicar em "cancele quando quiser"', () => {
    render(<SonoInlineCard payerEmail="a@b.com" onPaid={vi.fn()} />);

    // Modal fechado: conteúdo não está no DOM.
    expect(screen.queryByText(/Garantia tranquila de 7 dias/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /cancele quando quiser/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Garantia tranquila de 7 dias/i)).toBeInTheDocument();
    expect(screen.getByText(/Configurações → Assinatura/i)).toBeInTheDocument();
  });

  it('fecha o modal pelo botão "Entendi"', async () => {
    render(<SonoInlineCard payerEmail="a@b.com" onPaid={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /cancele quando quiser/i }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(screen.getByRole('button', { name: /Entendi/i }));
    await waitForElementToBeRemoved(dialog);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
