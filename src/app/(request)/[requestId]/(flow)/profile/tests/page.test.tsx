import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ redirect: vi.fn(), request: vi.fn() }));

vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
vi.mock('@/lib/auth/server-auth-session', () => ({
  getServerAuthSession: () => Promise.resolve({ accessToken: 'token' }),
}));
vi.mock('@/server/api', () => ({ getAccountRequest: mocks.request }));
vi.mock('@/features/profile', () => ({ ProfileStep: () => null }));

const { default: ProfilePage } = await import('../page');

const ID = '0b9f6f1e-3c1d-4a53-9d0e-1f0f2f6a7b01';

const open = () => ProfilePage({ params: Promise.resolve({ requestId: ID }) });

describe('profile page', () => {
  beforeEach(() => {
    mocks.redirect.mockReset();
  });

  it('sends a request out of the applicant hands to its submitted screen', async () => {
    mocks.request.mockResolvedValue({ data: { editable: false } });

    await open();

    expect(mocks.redirect).toHaveBeenCalledWith(`/${ID}/submitted`);
  });

  it('shows the profile of an editable request', async () => {
    mocks.request.mockResolvedValue({ data: { editable: true } });

    expect(await open()).not.toBeNull();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it('throws when the request cannot be read', async () => {
    mocks.request.mockResolvedValue({ error: new Error('down') });

    await expect(open()).rejects.toThrow('down');
  });
});
