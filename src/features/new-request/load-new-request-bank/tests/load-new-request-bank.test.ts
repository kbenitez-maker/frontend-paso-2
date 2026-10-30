import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getBanks: vi.fn(),
  redirectToExternal: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/auth/server-auth-session', () => ({
  getServerAuthSession: () => Promise.resolve({ accessToken: 'token-1' }),
}));
vi.mock('@/lib/external-redirect', () => ({
  redirectToExternal: mocks.redirectToExternal,
}));
vi.mock('@/server/api', () => ({ getBanks: mocks.getBanks }));

const { loadNewRequestBank } = await import('..');

const nicaragua = {
  bank_id: 'BLNI',
  country: 'NI',
  name: 'Nicaragua',
  legal_name: 'Banco LAFISE BANCENTRO, S.A.',
  enabled: true,
};
const panama = { ...nicaragua, bank_id: 'BLPA', country: 'PA', enabled: false };

describe('loadNewRequestBank', () => {
  beforeEach(() => {
    mocks.redirectToExternal.mockReset();
    mocks.getBanks.mockResolvedValue({
      data: { results: [nicaragua, panama], count: 2 },
      error: null,
    });
  });

  it('returns the enabled bank', async () => {
    await expect(loadNewRequestBank('BLNI')).resolves.toEqual(nicaragua);
    expect(mocks.getBanks).toHaveBeenCalledWith('token-1');
    expect(mocks.redirectToExternal).not.toHaveBeenCalled();
  });

  it.each([undefined, 'XX', 'BLPA'])(
    'redirects to the requests list for %s',
    async (param) => {
      await loadNewRequestBank(param);

      expect(mocks.redirectToExternal).toHaveBeenCalledWith(
        '/home/account-requests',
      );
    },
  );

  it('rethrows an API error', async () => {
    const failure = new Error('down');
    mocks.getBanks.mockResolvedValue({ data: null, error: failure });

    await expect(loadNewRequestBank('BLNI')).rejects.toBe(failure);
  });
});
