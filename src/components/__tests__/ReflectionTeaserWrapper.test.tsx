import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

const mockTrackDeepScroll = vi.fn();
const mockCheckTrigger = vi.fn();

vi.mock('../../contexts/GuestExperienceContext', () => ({
  useGuestExperience: () => ({
    trackDeepScroll: mockTrackDeepScroll,
  }),
}));

vi.mock('../../hooks/useGuestConversionTriggers', () => ({
  useGuestConversionTriggers: () => ({
    checkTrigger: mockCheckTrigger,
  }),
  ConversionSignals: {
    deepScroll: (depth: number, id: string) => ({ type: 'deep_scroll', depth, id }),
    reflectionViewed: (id: string) => ({ type: 'reflection_viewed', id }),
  },
}));

vi.mock('../../lib/mixpanel', () => ({
  default: { track: vi.fn() },
}));

const { default: ReflectionTeaserWrapper } = await import('../diario-estoico/ReflectionTeaserWrapper');

const SAMPLE_COMMENT = 'Este é um comentário filosófico sobre estoicismo que serve para testar o truncamento do teaser.';

describe('ReflectionTeaserWrapper', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockTrackDeepScroll.mockClear();
    mockCheckTrigger.mockClear();
  });

  it('renderiza children (quote card) sempre visíveis', () => {
    render(
      <ReflectionTeaserWrapper
        comment={SAMPLE_COMMENT}
        reflectionId="fevereiro-1"
      >
        <div data-testid="quote-card">Citação estoica aqui</div>
      </ReflectionTeaserWrapper>
    );
    expect(screen.getByTestId('quote-card')).toBeInTheDocument();
  });

  it('exibe a seção de comentário com o texto', () => {
    render(
      <ReflectionTeaserWrapper
        comment={SAMPLE_COMMENT}
        reflectionId="fevereiro-1"
      >
        <div>Quote</div>
      </ReflectionTeaserWrapper>
    );
    expect(screen.getByText(SAMPLE_COMMENT)).toBeInTheDocument();
  });

  it('botão "Continue esta reflexão →" existe', () => {
    render(
      <ReflectionTeaserWrapper
        comment={SAMPLE_COMMENT}
        reflectionId="fevereiro-1"
      >
        <div>Quote</div>
      </ReflectionTeaserWrapper>
    );
    expect(screen.getByText('Continue esta reflexão →')).toBeInTheDocument();
  });

  it('clique no CTA navega para /login?returnTo=/app/diario-estoico', () => {
    render(
      <ReflectionTeaserWrapper
        comment={SAMPLE_COMMENT}
        reflectionId="fevereiro-1"
      >
        <div>Quote</div>
      </ReflectionTeaserWrapper>
    );
    const ctaButton = screen.getByText('Continue esta reflexão →');
    fireEvent.click(ctaButton);
    expect(mockNavigate).toHaveBeenCalledWith('/login?returnTo=/app/diario-estoico');
  });

  it('subtitle "Crie sua conta em 30 segundos — sempre gratuito" está visível', () => {
    render(
      <ReflectionTeaserWrapper
        comment={SAMPLE_COMMENT}
        reflectionId="fevereiro-2"
      >
        <div>Quote</div>
      </ReflectionTeaserWrapper>
    );
    expect(
      screen.getByText('Crie sua conta em 30 segundos — sempre gratuito')
    ).toBeInTheDocument();
  });
});
