import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SleepProtocolOfferCard } from '../SleepProtocolOfferCard';

describe('SleepProtocolOfferCard', () => {
  it('renders headline and price', () => {
    render(
      <SleepProtocolOfferCard
        onStart={vi.fn()}
        onCheckout={vi.fn()}
      />
    );
    expect(screen.getByText(/A Noite 1 abre a porta/i)).toBeInTheDocument();
    expect(screen.getByText(/R\$ 15,90/)).toBeInTheDocument();
  });

  it('calls onStart when primary CTA is clicked', () => {
    const onStart = vi.fn();
    render(
      <SleepProtocolOfferCard
        onStart={onStart}
        onCheckout={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText(/Ouvir a Noite 1/i));
    expect(onStart).toHaveBeenCalledOnce();
  });

  it('calls onCheckout when secondary CTA is clicked', () => {
    const onCheckout = vi.fn();
    render(
      <SleepProtocolOfferCard
        onStart={vi.fn()}
        onCheckout={onCheckout}
      />
    );
    fireEvent.click(screen.getByText(/Começar 7 dias gratuitos/i));
    expect(onCheckout).toHaveBeenCalledOnce();
  });

  it('disables checkout button and shows loading state', () => {
    render(
      <SleepProtocolOfferCard
        onStart={vi.fn()}
        onCheckout={vi.fn()}
        checkoutLoading={true}
      />
    );
    expect(screen.getByText(/Abrindo/i)).toBeInTheDocument();
    const btn = screen.getByRole('button', { name: /Abrindo/i });
    expect(btn).toBeDisabled();
  });
});
