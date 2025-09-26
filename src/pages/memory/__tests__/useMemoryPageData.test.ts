import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { useMemoryPageData } from '../useMemoryPageData';
import type { Memoria } from '../../../api/memoriaApi';

vi.mock('../../../api/memoriaApi', async () => {
  const actual = await vi.importActual<typeof import('../../../api/memoriaApi')>(
    '../../../api/memoriaApi'
  );
  return {
    ...actual,
    buscarMemoriasPorUsuario: vi.fn(),
  };
});

vi.mock('../../../api/perfilApi', () => ({
  buscarPerfilEmocional: vi.fn(),
}));

vi.mock('../../../api/relatorioEmocionalApi', () => ({
  buscarRelatorioEmocional: vi.fn(),
}));

const { buscarMemoriasPorUsuario } = await import('../../../api/memoriaApi');
const { buscarPerfilEmocional } = await import('../../../api/perfilApi');
const { buscarRelatorioEmocional } = await import('../../../api/relatorioEmocionalApi');

describe('useMemoryPageData', () => {
  const memories: Memoria[] = [
    {
      id: '1',
      usuario_id: 'user',
      mensagem_id: null,
      resumo_eco: 'Resumo',
      created_at: '2024-05-15T00:00:00Z',
      emocao_principal: 'Alegria',
      intensidade: 7,
      analise_resumo: 'Feliz com o trabalho',
      tags: ['trabalho'],
      salvar_memoria: true,
    },
    {
      id: '2',
      usuario_id: 'user',
      mensagem_id: null,
      resumo_eco: 'Resumo',
      created_at: '2024-05-14T00:00:00Z',
      emocao_principal: 'Raiva',
      intensidade: 2,
      analise_resumo: 'Discussão com amigo',
      tags: ['amizade'],
      salvar_memoria: false,
    },
  ];

  const perfil = {
    emocoes_frequentes: { Alegria: 5, Tristeza: 2 },
    temas_recorrentes: { trabalho: 3 },
  };

  const relatorio = {
    mapa_emocional: [
      { emocao: 'Alegria', valencia: 0.6, excitacao: 0.2 },
      { emocao: 'Raiva', valencia: -0.4, excitacao: 0.7 },
    ],
    linha_do_tempo_intensidade: [
      { data: '2024-05-15', intensidade: 7 },
    ],
    total_memorias: 1,
  };

  beforeEach(() => {
    (buscarMemoriasPorUsuario as any).mockResolvedValue(memories);
    (buscarPerfilEmocional as any).mockResolvedValue(perfil);
    (buscarRelatorioEmocional as any).mockResolvedValue(relatorio);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('loads memories and derived data for a user', async () => {
    const { result } = renderHook(() => useMemoryPageData('user'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.filteredMemories).toHaveLength(1);
    expect(result.current.filteredMemories[0].id).toBe('1');
    expect(result.current.emotionChart[0]).toEqual({ name: 'Alegria', value: 5 });
    expect(result.current.themeChart[0]).toEqual({ name: 'trabalho', value: 3 });
    expect(result.current.mapaEmocional2D).toHaveLength(2);
  });

  it('resets filters and applies query filter', async () => {
    const { result } = renderHook(() => useMemoryPageData('user'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setMinIntensity(8);
      result.current.setQuery('trabalho');
    });

    expect(result.current.filteredMemories).toHaveLength(0);

    act(() => {
      result.current.resetFilters();
    });

    expect(result.current.filteredMemories).toHaveLength(1);
  });

  it('skips fetch when user is missing', async () => {
    const { result } = renderHook(() => useMemoryPageData(null));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(buscarMemoriasPorUsuario).not.toHaveBeenCalled();
    expect(result.current.filteredMemories).toHaveLength(0);
  });
});
