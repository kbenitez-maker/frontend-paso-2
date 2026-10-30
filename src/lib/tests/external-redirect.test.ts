import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  redirect: vi.fn<(url: string) => never>(),
  headers: vi.fn<() => Promise<Headers>>(),
}));

vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
vi.mock('next/headers', () => ({ headers: mocks.headers }));

const { redirectToExternal } = await import('../external-redirect');

describe('redirectToExternal', () => {
  beforeEach(() => {
    mocks.redirect.mockReset();
  });

  it('passes absolute URLs through untouched', async () => {
    await redirectToExternal('http://localhost:3002/home/account-requests');

    expect(mocks.redirect).toHaveBeenCalledWith(
      'http://localhost:3002/home/account-requests',
    );
  });

  it('makes host paths absolute so the basePath is not prepended', async () => {
    mocks.headers.mockResolvedValue(
      new Headers({
        'x-forwarded-host': 'portal.example.com',
        'x-forwarded-proto': 'https',
      }),
    );

    await redirectToExternal('/home/account-requests');

    expect(mocks.redirect).toHaveBeenCalledWith(
      'https://portal.example.com/home/account-requests',
    );
  });

  it('falls back to the host header over http', async () => {
    mocks.headers.mockResolvedValue(new Headers({ host: 'localhost:3000' }));

    await redirectToExternal('/home/account-requests');

    expect(mocks.redirect).toHaveBeenCalledWith(
      'http://localhost:3000/home/account-requests',
    );
  });
});
