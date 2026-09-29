import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HomeReinoHero from '../HomeReinoHero';

const navigate = vi.fn();
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));

const authState: { user: { id: string } | null } = { user: { id: 'u1' } };
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => authState }));

vi.mock('@/hooks/useRitualProgress', () => ({
  useRitualProgress: () => ({ completedCount: 2, nextNight: 3, completedToday: false, status: 'in_progress' }),
}));

const trackViewed = vi.fn();
const trackClicked = vi.fn();
vi.mock('@/lib/mixpanelRitualEvents', () => ({
  trackRitualCardViewed: (p: unknown) => trackViewed(p),
  trackRitualCardClicked: (p: unknown) => trackClicked(p),
}));

vi.mock('@/utils/diarioEstoico/getTodayMaxim', () => ({
  getTodayMaxim: () => ({ title: 'Aonde quer que vá, lá está sua escolha' }),
}));

const handlers = () => ({
  onStartChat: vi.fn(),
  onDailyRecommendation: vi.fn(),
  onBlessing: vi.fn(),
});

beforeEach(() => {
  navigate.mockReset();
  trackViewed.mockReset();
  trackClicked.mockReset();
  authState.user = { id: 'u1' };
  sessionStorage.clear();
});

describe('HomeReinoHero', () => {
  it('à noite: cumprimenta pelo primeiro nome e mostra o Ritual com a próxima noite', () => {
    render(<HomeReinoHero userName="rafael razeira" mood="noite" {...handlers()} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Boa noite, Rafael.');
    expect(screen.getByText('O que ainda está fazendo barulho aí dentro?')).toBeInTheDocument();
    expect(screen.getByText('Ritual Boa Noite')).toBeInTheDocument();
    expect(screen.getByText('noite 3 de 7')).toBeInTheDocument();
  });

  it('convidado sem nome nunca vê "Convidado(a)"', () => {
    authState.user = null;
    render(<HomeReinoHero userName={undefined} mood="noite" {...handlers()} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Boa noite.');
    expect(screen.queryByText(/Convidado/)).not.toBeInTheDocument();
  });

  it('à noite: registra "Card visto" uma vez e o clique no Ritual leva ao sono com o evento', () => {
    render(<HomeReinoHero userName="Rafael" mood="noite" {...handlers()} />);
    expect(trackViewed).toHaveBeenCalledTimes(1);
    expect(trackViewed).toHaveBeenCalledWith(expect.objectContaining({ source: 'home_reino', currentNight: 3 }));

    fireEvent.click(screen.getByRole('button', { name: /Ritual Boa Noite/ }));
    expect(trackClicked).toHaveBeenCalledWith(expect.objectContaining({ source: 'home_reino', progressStatus: 'in_progress' }));
    expect(navigate).toHaveBeenCalledWith('/app/meditacoes-sono');
  });

  it('de manhã: a pergunta é a reflexão do dia e a placa abre o Diário Estoico', () => {
    render(<HomeReinoHero userName="Rafael" mood="amanhecer" {...handlers()} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Bom dia, Rafael.');
    expect(screen.getByText('Aonde quer que vá, lá está sua escolha.')).toBeInTheDocument();
    expect(trackViewed).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Ler a reflexão de hoje/ }));
    expect(sessionStorage.getItem('diario_entry_source')).toBe('home_reino');
    expect(navigate).toHaveBeenCalledWith('/app/diario-estoico');
  });

  it('ao entardecer: a placa abre a conversa com a Eco e a jornada do Dr. Joe usa o handler existente', () => {
    const h = handlers();
    render(<HomeReinoHero userName="Rafael" mood="entardecer" {...h} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('O dia está baixando.');

    fireEvent.click(screen.getByRole('button', { name: /Entrar na Casa da Eco/ }));
    expect(h.onStartChat).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Desperte seu potencial interior/ }));
    expect(h.onBlessing).toHaveBeenCalledWith('drjoe_collection');
  });

  it('os lugares por perto levam às regiões', () => {
    render(<HomeReinoHero userName="Rafael" mood="noite" {...handlers()} />);
    fireEvent.click(screen.getByRole('button', { name: /Lago dos Sonhos/ }));
    expect(navigate).toHaveBeenCalledWith('/app/dream');
  });
});
