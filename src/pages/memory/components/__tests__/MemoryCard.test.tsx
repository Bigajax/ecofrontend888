import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import MemoryCard from '../MemoryCard';
import type { Memoria } from '../../../../api/memoriaApi';

describe('MemoryCard', () => {
  const baseMemory: Memoria = {
    id: '1',
    usuario_id: 'user',
    mensagem_id: null,
    resumo_eco: 'Resumo',
    created_at: '2024-05-10T00:00:00Z',
    emocao_principal: 'Alegria',
    intensidade: 7,
    contexto: 'Contexto da memória',
    analise_resumo: 'Resumo analítico',
    tags: ['trabalho', 'família'],
  };

  it('renders collapsed card with emotion, preview and tags', () => {
    render(<MemoryCard mem={baseMemory} />);

    expect(screen.getByRole('heading', { name: /alegria/i })).toBeInTheDocument();
    expect(screen.getByText('Resumo analítico')).toBeInTheDocument();
    expect(screen.getByText(/trabalho/i)).toBeInTheDocument();
    expect(screen.getByText(/família/i)).toBeInTheDocument();
    expect(screen.getByText(/Ver mais/)).toBeInTheDocument();
  });

  it('expands to show details when toggled', () => {
    render(<MemoryCard mem={baseMemory} />);

    const toggle = screen.getByRole('button', { name: /ver mais/i });
    fireEvent.click(toggle);

    expect(screen.getAllByText('Resumo analítico')).toHaveLength(2);
    expect(screen.getByText('Contexto da memória')).toBeInTheDocument();
    expect(screen.getByText('Seu pensamento')).toBeInTheDocument();
    expect(screen.getByText('Reflexão da Eco')).toBeInTheDocument();
    expect(screen.getByText(/Fechar/)).toBeInTheDocument();
  });
});
