import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mixpanel mockado: inspecionamos track/register. vi.hoisted garante que as
// fns existam antes do factory hoisteado do vi.mock.
const { track, register } = vi.hoisted(() => ({ track: vi.fn(), register: vi.fn() }));
vi.mock('../mixpanel', () => ({ default: { track, register } }));

// Kill-switches controláveis por teste.
let paywallFoco = true;
let entradaSemModal = true;
let ofertaBonus = true;
vi.mock('../paywallFoco', () => ({ isPaywallFoco: () => paywallFoco }));
vi.mock('../entradaSemModal', () => ({ isEntradaSemModal: () => entradaSemModal }));
vi.mock('../ofertaBonus', () => ({ isOfertaBonus: () => ofertaBonus }));

import {
  trackSonoGuestOfferViewed,
  trackSonoGuestCheckoutClicked,
  trackSonoGuestPixGerado,
  trackSonoGuestLockedNightClicked,
  registerPaywallFoco,
  registerEntradaSemModal,
  registerOfertaBonus,
} from '../mixpanelSonoGuestEvents';

beforeEach(() => {
  vi.clearAllMocks();
  paywallFoco = true;
  entradaSemModal = true;
  ofertaBonus = true;
  sessionStorage.clear();
  localStorage.clear();
});

describe('mixpanelSonoGuestEvents · origem (KISS #4)', () => {
  it('Oferta vista carrega origem lida do sessionStorage', () => {
    sessionStorage.setItem('eco.sono.offer_origem', 'noite_bloqueada');
    trackSonoGuestOfferViewed({ guestId: 'g1' });
    expect(track).toHaveBeenCalledWith(
      'Funil Protocolo · Oferta vista',
      expect.objectContaining({ origem: 'noite_bloqueada', guest_id: 'g1' }),
    );
  });

  it('Checkout clicado e Pix gerado herdam a mesma origem (continuar_n2)', () => {
    sessionStorage.setItem('eco.sono.offer_origem', 'continuar_n2');
    trackSonoGuestCheckoutClicked({ guestId: 'g1' });
    trackSonoGuestPixGerado({ guestId: 'g1' });
    expect(track).toHaveBeenNthCalledWith(
      1,
      'Funil Protocolo · Checkout clicado',
      expect.objectContaining({ origem: 'continuar_n2' }),
    );
    expect(track).toHaveBeenNthCalledWith(
      2,
      'Funil Protocolo · Pix gerado',
      expect.objectContaining({ origem: 'continuar_n2' }),
    );
  });

  it('origem explícita por prop sobrepõe o sessionStorage', () => {
    sessionStorage.setItem('eco.sono.offer_origem', 'banner');
    trackSonoGuestOfferViewed({ guestId: 'g1', origem: 'noite_bloqueada' });
    expect(track).toHaveBeenCalledWith(
      'Funil Protocolo · Oferta vista',
      expect.objectContaining({ origem: 'noite_bloqueada' }),
    );
  });

  it('sem origem no sessionStorage, a property é omitida', () => {
    trackSonoGuestOfferViewed({ guestId: 'g1' });
    const props = track.mock.calls[0][1] as Record<string, unknown>;
    expect(props).not.toHaveProperty('origem');
  });

  it('Noite bloqueada clicada dispara com noite + origem', () => {
    trackSonoGuestLockedNightClicked({ noite: 5 });
    expect(track).toHaveBeenCalledWith(
      'Funil Protocolo · Noite bloqueada clicada',
      expect.objectContaining({ noite: 5, origem: 'noite_bloqueada' }),
    );
  });
});

describe('mixpanelSonoGuestEvents · paywall_foco super property', () => {
  it('registra paywall_foco=true quando o kill-switch está ON', () => {
    paywallFoco = true;
    registerPaywallFoco();
    expect(register).toHaveBeenCalledWith({ paywall_foco: true });
  });

  it('registra paywall_foco=false quando o kill-switch está OFF', () => {
    paywallFoco = false;
    registerPaywallFoco();
    expect(register).toHaveBeenCalledWith({ paywall_foco: false });
  });
});

describe('mixpanelSonoGuestEvents · entrada_sem_modal super property', () => {
  it('registra entrada_sem_modal=true quando o kill-switch está ON', () => {
    entradaSemModal = true;
    registerEntradaSemModal();
    expect(register).toHaveBeenCalledWith({ entrada_sem_modal: true });
  });

  it('registra entrada_sem_modal=false quando o kill-switch está OFF', () => {
    entradaSemModal = false;
    registerEntradaSemModal();
    expect(register).toHaveBeenCalledWith({ entrada_sem_modal: false });
  });
});

describe('mixpanelSonoGuestEvents · oferta_bonus_ecodream super property', () => {
  it('registra oferta_bonus_ecodream=true quando o kill-switch está ON', () => {
    ofertaBonus = true;
    registerOfertaBonus();
    expect(register).toHaveBeenCalledWith({ oferta_bonus_ecodream: true });
  });

  it('registra oferta_bonus_ecodream=false quando o kill-switch está OFF', () => {
    ofertaBonus = false;
    registerOfertaBonus();
    expect(register).toHaveBeenCalledWith({ oferta_bonus_ecodream: false });
  });
});
