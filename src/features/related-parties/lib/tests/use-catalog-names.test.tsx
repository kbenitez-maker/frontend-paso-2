import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { NextIntlClientTestWrapper } from '@/test/next-intl';

import { useCatalogNames } from '../use-catalog-names';

const catalogQueryMock = vi.hoisted(() =>
  vi.fn(
    (_bankId: string, _name: string, _params?: Record<string, unknown>) => ({
      queryKey: ['catalogs', _bankId, _name, _params ?? {}],
      queryFn: () =>
        Promise.resolve({
          results: [{ code: 'chiquiri', name: 'SUCURSAL CHIQUIRI' }],
          count: 1,
        }),
    }),
  ),
);

vi.mock('@/server/api', () => ({
  catalogQuery: catalogQueryMock,
}));

const wrapper = ({ children }: { children: ReactNode }) => (
  <NextIntlClientTestWrapper>
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      {children}
    </QueryClientProvider>
  </NextIntlClientTestWrapper>
);

describe('useCatalogNames', () => {
  it('title-cases catalog names from the query select', async () => {
    const { result } = renderHook(() => useCatalogNames('BLNI', ['branches']), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current('chiquiri')).toBe('Sucursal Chiquiri');
    });
  });
});
