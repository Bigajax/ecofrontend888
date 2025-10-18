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

  it('renders collapsed card with meta info and tags', () => {
    render(<MemoryCard mem={baseMemory} />);

    expect(screen.getByRole('img', { name: /emoção: alegria/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /alegria/i })).toBeInTheDocument();
    expect(screen.getByText('7/10')).toBeInTheDocument();
    expect(screen.getByText('Trabalho')).toBeInTheDocument();
    expect(screen.getByText('Família')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /expandir detalhes da memória/i })).toBeInTheDocument();
  });

  it('expands to show details when toggled', () => {
    render(<MemoryCard mem={baseMemory} />);

    const toggle = screen.getByRole('button', { name: /expandir detalhes da memória/i });
    fireEvent.click(toggle);

    expect(screen.getByText('Resumo analítico')).toBeInTheDocument();
    expect(screen.getByText('Contexto da memória')).toBeInTheDocument();
    expect(screen.getByText('Resumo da Eco')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /recolher detalhes da memória/i })
    ).toBeInTheDocument();
  });
});
