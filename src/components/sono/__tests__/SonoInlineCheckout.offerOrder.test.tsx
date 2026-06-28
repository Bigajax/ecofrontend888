import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Kill-switches controláveis.
let paywallFoco = true;
let ofertaBonus = true;
vi.mock('@/lib/paywallFoco', () => ({ isPaywallFoco: () => paywallFoco }));
vi.mock('@/lib/ofertaBonus', () => ({ isOfertaBonus: () => ofertaBonus }));

// Dependências externas neutralizadas.
vi.mock('@/config/apiBase', () => ({ apiUrl: (p: string) => p }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('@/lib/sonoGuestId', () => ({ getSonoGuestId: () => 'guest_test' }));
vi.mock('@/lib/fbpixel', () => ({
  trackWithCAPI: vi.fn(),
  ensurePurchaseEventId: vi.fn(() => 'evt_1'),
  getPurchaseEventId: vi.fn(() => 'evt_1'),
  getFbp: vi.fn(() => 'fbp.1'),
  resolveFbc: vi.fn(() => 'fbc.1'),
}));
vi.mock('@/lib/mixpanel', () => ({ default: { track: vi.fn(), register: vi.fn() } }));
vi.mock('@/lib/supabaseClient', () => ({
  supabase: { auth: { getSession: vi.fn(() => Promise.resolve({ data: { session: null } })) }, from: () => ({ upsert: vi.fn() }) },
}));

import { SonoInlineCheckout } from '../SonoInlineCheckout';

// Sobe pelo style.order (flex) o primeiro ancestral que define `order`.
function orderOf(el: HTMLElement | null): string {
  let node: HTMLElement | null = el;
  while (node && !node.style.order) node = node.parentElement;
  return node?.style.order ?? '';
}

function renderOfferAt(origem: string) {
  sessionStorage.setItem('eco.sono.offer_origem', origem);
  return render(
    <MemoryRouter initialEntries={['/sono/experiencia?checkout=offer']}>
      <SonoInlineCheckout openAt="offer" onUnlocked={vi.fn()} onDismiss={vi.fn()} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  paywallFoco = true;
  ofertaBonus = true;
  sessionStorage.clear();
  localStorage.clear();
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ price: 37 }) })));
});

describe('SonoInlineCheckout · proeminência da oferta (KISS #4)', () => {
  it('paywall focado (noite_bloqueada): card R$37 acima da lista das 7 noites', async () => {
    renderOfferAt('noite_bloqueada');
    const cta = await screen.findByText(/Liberar.*7 noites/);
    const nightsLabel = await screen.findByText('Noite 7');
    await waitFor(() => expect(orderOf(cta)).toBe('1'));
    expect(orderOf(nightsLabel)).toBe('2');
  });

  it('continuar_n2: também price-first', async () => {
    renderOfferAt('continuar_n2');
    const cta = await screen.findByText(/Liberar.*7 noites/);
    const nightsLabel = await screen.findByText('Noite 7');
    await waitFor(() => expect(orderOf(cta)).toBe('1'));
    expect(orderOf(nightsLabel)).toBe('2');
  });

  it('banner (baseline): lista das 7 noites primeiro, card depois', async () => {
    renderOfferAt('banner');
    const cta = await screen.findByText(/Liberar.*7 noites/);
    const nightsLabel = await screen.findByText('Noite 7');
    await waitFor(() => expect(orderOf(nightsLabel)).toBe('1'));
    expect(orderOf(cta)).toBe('2');
  });

  it('kill-switch OFF: mantém baseline mesmo vindo de noite_bloqueada', async () => {
    paywallFoco = false;
    renderOfferAt('noite_bloqueada');
    const cta = await screen.findByText(/Liberar.*7 noites/);
    const nightsLabel = await screen.findByText('Noite 7');
    await waitFor(() => expect(orderOf(nightsLabel)).toBe('1'));
    expect(orderOf(cta)).toBe('2');
  });
});

describe('SonoInlineCheckout · bônus EcoDream (oferta_bonus)', () => {
  it('flag ON: mostra o bônus EcoDream e o CTA "+ bônus"', async () => {
    ofertaBonus = true;
    renderOfferAt('continuar_n2');
    expect(await screen.findByText('Bônus · EcoDream')).toBeTruthy();
    expect(await screen.findByText('Interprete seus sonhos com a Eco')).toBeTruthy();
    expect(await screen.findByText('Liberar as 7 noites + bônus')).toBeTruthy();
  });

  it('flag OFF: sem bônus e CTA original', async () => {
    ofertaBonus = false;
    renderOfferAt('continuar_n2');
    expect(await screen.findByText('Liberar Noite 2 e as 7 noites')).toBeTruthy();
    expect(screen.queryByText('Bônus · EcoDream')).toBeNull();
  });
});
