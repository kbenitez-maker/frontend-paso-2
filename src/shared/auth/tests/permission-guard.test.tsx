import type { UserMe } from '@/types/user';
import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ACCOUNT_REQUEST_MODULE_KEY } from '@/lib/auth/account-request-module-access';
import { render, screen, waitFor } from '@/test/render';

const mockUserMe = vi.fn<() => Promise<UserMe>>();

vi.mock('@/server/api', () => ({
  userMeQuery: () => ({ queryKey: ['users', 'me'], queryFn: mockUserMe }),
}));

vi.mock('@/shared/error/forbidden-page', () => ({
  ForbiddenPage: () => <p>forbidden</p>,
}));

vi.mock('@/shared/error/classified-error-page', () => ({
  ClassifiedErrorPage: () => <p>error</p>,
}));

const { PermissionGuard } = await import('../permission-guard');

const profile = (isActive: boolean): UserMe => ({
  user_full_name: 'Test User',
  user_short_name: 'Test',
  modules: { [ACCOUNT_REQUEST_MODULE_KEY]: { is_active: isActive } },
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

describe('PermissionGuard', () => {
  beforeEach(() => {
    mockUserMe.mockReset();
  });

  it('renders children when the account-request module is active', async () => {
    mockUserMe.mockResolvedValue(profile(true));
    render(<PermissionGuard>content</PermissionGuard>, { wrapper });

    expect(await screen.findByText('content')).toBeDefined();
  });

  it('renders the forbidden page when the module is inactive', async () => {
    mockUserMe.mockResolvedValue(profile(false));
    render(<PermissionGuard>content</PermissionGuard>, { wrapper });

    expect(await screen.findByText('forbidden')).toBeDefined();
  });

  it('renders the classified error page when the profile fails to load', async () => {
    mockUserMe.mockRejectedValue(new Error('boom'));
    render(<PermissionGuard>content</PermissionGuard>, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('error')).toBeDefined();
    });
  });
});
