import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockNotFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});
const mockGetAccountRequest = vi.fn();

vi.mock('next/navigation', () => ({ notFound: mockNotFound }));
vi.mock('@/lib/auth/server-auth-session', () => ({
  getServerAuthSession: () =>
    Promise.resolve({ userId: 'u-1', accessToken: 'token-1' }),
}));
vi.mock('@/server/api', () => ({ getAccountRequest: mockGetAccountRequest }));

const { default: RequestLayout } = await import('../layout');

const ID = '0b9f6f1e-3c1d-4a53-9d0e-1f0f2f6a7b01';

const renderLayout = (requestId: string) =>
  RequestLayout({
    children: 'child',
    params: Promise.resolve({ requestId }),
  });

describe('[requestId] layout', () => {
  beforeEach(() => {
    mockNotFound.mockClear();
    mockGetAccountRequest.mockReset();
  });

  it('renders children for a well-formed id without the legacy detail', async () => {
    await expect(renderLayout(ID)).resolves.toBe('child');
    expect(mockGetAccountRequest).not.toHaveBeenCalled();
  });

  it('returns not-found for malformed ids without calling the backend', async () => {
    await expect(renderLayout('nope')).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mockGetAccountRequest).not.toHaveBeenCalled();
  });
});
