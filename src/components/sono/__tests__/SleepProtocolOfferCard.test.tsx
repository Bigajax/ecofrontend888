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
    expect(screen.getByText(/Experimente a primeira noite/i)).toBeInTheDocument();
    expect(screen.getByText(/R\$ 147/)).toBeInTheDocument();
  });

  it('calls onStart when primary CTA is clicked', () => {
    const onStart = vi.fn();
    render(
      <SleepProtocolOfferCard
        onStart={onStart}
        onCheckout={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText(/Começar experiência gratuita/i));
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
    fireEvent.click(screen.getByText(/Liberar protocolo completo/i));
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
