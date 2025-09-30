import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import EcoBubbleLoading from '../EcoBubbleLoading';

beforeAll(() => {
  if (!window.matchMedia) {
    // framer-motion rely on matchMedia for reduced motion queries
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  }
});

describe('EcoBubbleLoading', () => {
  it('renders the global variant with concentric rings and accessible status label', () => {
    render(
      <EcoBubbleLoading
        text="Carregando dados globais"
        breathingSec={2}
        size={96}
      />
    );

    const status = screen.getByRole('status', { name: /Carregando dados globais/i });
    expect(status).toBeInTheDocument();

    const rings = screen.getAllByTestId('global-ring');
    expect(rings).toHaveLength(3);
    rings.forEach((ring) => {
      expect(ring).toHaveAttribute('data-duration');
    });

    expect(screen.getByTestId('loading-text')).toHaveTextContent('Carregando dados globais');
  });

  it('renders the memories variant with three animated eyes and accessible status', () => {
    render(
      <EcoBubbleLoading
        variant="memories"
        text="Carregando memórias..."
        size={48}
      />
    );

    const status = screen.getByRole('status', { name: /Carregando memórias/i });
    expect(status).toBeInTheDocument();

    const eyes = screen.getAllByTestId('memories-eye');
    expect(eyes).toHaveLength(3);
    eyes.forEach((eye) => {
      expect(eye.getAttribute('data-emotion')).toBeTruthy();
      expect(eye).toHaveAttribute('data-delay');
    });

    expect(screen.getByTestId('loading-text')).toHaveTextContent('Carregando memórias...');
  });
});
