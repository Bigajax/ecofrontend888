import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { captureLead, replayPendingLeads, PENDING_LEADS_KEY } from '../leadCapture';

const okResponse = () => ({ ok: true, status: 200, json: async () => ({ ok: true }) });

describe('leadCapture', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('faz POST para /api/leads/sono-gate com email, source e provider', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse());
    vi.stubGlobal('fetch', fetchMock);

    await captureLead({ email: 'a@b.com', source: 'sono_signup_gate', provider: 'email' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/api/leads/sono-gate');
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ email: 'a@b.com', source: 'sono_signup_gate', provider: 'email' });
  });

  it('nunca lança e enfileira no localStorage quando a rede falha', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      captureLead({ email: 'a@b.com', source: 'sono_signup_gate', provider: 'email' }),
    ).resolves.toBeUndefined();

    const queue = JSON.parse(localStorage.getItem(PENDING_LEADS_KEY) || '[]');
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({ email: 'a@b.com', provider: 'email' });
  });

  it('replayPendingLeads reenvia a fila e remove os que tiveram sucesso', async () => {
    localStorage.setItem(
      PENDING_LEADS_KEY,
      JSON.stringify([{ email: 'a@b.com', source: 'sono_signup_gate', provider: 'email' }]),
    );
    const fetchMock = vi.fn().mockResolvedValue(okResponse());
    vi.stubGlobal('fetch', fetchMock);

    await replayPendingLeads();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const queue = JSON.parse(localStorage.getItem(PENDING_LEADS_KEY) || '[]');
    expect(queue).toHaveLength(0);
  });

  it('replayPendingLeads mantém na fila o que continua falhando', async () => {
    localStorage.setItem(
      PENDING_LEADS_KEY,
      JSON.stringify([{ email: 'a@b.com', source: 'sono_signup_gate', provider: 'email' }]),
    );
    const fetchMock = vi.fn().mockRejectedValue(new Error('still down'));
    vi.stubGlobal('fetch', fetchMock);

    await replayPendingLeads();

    const queue = JSON.parse(localStorage.getItem(PENDING_LEADS_KEY) || '[]');
    expect(queue).toHaveLength(1);
  });

  it('replayPendingLeads não chama fetch quando a fila está vazia', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse());
    vi.stubGlobal('fetch', fetchMock);

    await replayPendingLeads();

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
