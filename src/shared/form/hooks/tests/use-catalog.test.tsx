import { act, createElement } from 'react';

import type { ReactNode } from 'react';
import type { UseCatalogOptions } from '../use-catalog';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NextIntlClientTestWrapper } from '@/test/next-intl';

import { LocalCatalogsContext } from '../local-catalogs';
import { RequestScopeContext } from '../request-scope';
import { useCatalog } from '../use-catalog';

const ROWS = { results: [{ code: 'PA', name: 'Panamá' }], count: 1 };

const { catalogQueryMock, relatedPersonsQueryMock, fetchRows } = vi.hoisted(
  () => ({
    fetchRows: vi.fn<(params: Record<string, string>) => Promise<unknown>>(),
    catalogQueryMock: vi.fn(
      (bankId: string, name: string, params: Record<string, unknown> = {}) => ({
        queryKey: ['catalogs', bankId, name, params],
        queryFn: () => fetchRows(params as Record<string, string>),
      }),
    ),
    relatedPersonsQueryMock: vi.fn((_requestId: string) => ({
      queryKey: ['related-persons', _requestId],
      queryFn: () =>
        Promise.resolve({
          results: [
            { id: 'p-1', name: 'MARIA LOPEZ' },
            { id: 'p-2', name: "SEAN O'BRIEN" },
          ],
          count: 2,
        }),
    })),
  }),
);

vi.mock('@/server/api', () => ({
  catalogQuery: (
    bankId: string,
    name: string,
    params?: Record<string, unknown>,
  ) => catalogQueryMock(bankId, name, params),
  relatedPersonsQuery: relatedPersonsQueryMock,
}));

const base: UseCatalogOptions = {
  bankId: 'BLPA',
  catalog: { name: 'countries', source: 'api' },
  parentValue: undefined,
};

const hookWrapper = ({ children }: { children: ReactNode }) => (
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

const renderCatalog = (
  options: UseCatalogOptions,
  wrapper: (props: { children: ReactNode }) => ReactNode = hookWrapper,
) =>
  renderHook((props: UseCatalogOptions) => useCatalog(props), {
    initialProps: options,
    wrapper,
  });

beforeEach(() => {
  fetchRows.mockReset();
  fetchRows.mockResolvedValue(ROWS);
  catalogQueryMock.mockClear();
  relatedPersonsQueryMock.mockClear();
});

describe('useCatalog', () => {
  it('loads the bank catalog rows', async () => {
    const { result } = renderCatalog(base);

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });
    expect(result.current.options).toEqual(ROWS.results);
    expect(result.current.isUnavailable).toBe(false);
  });

  it('does not request a catalog without a bank and reports it unavailable', async () => {
    const { result } = renderCatalog({ ...base, bankId: undefined });

    result.current.retry();
    await Promise.resolve();

    expect(fetchRows).not.toHaveBeenCalled();
    expect(result.current.isUnavailable).toBe(true);
    expect(result.current.options).toEqual([]);
  });

  it('does not request a catalog name the portal does not list', async () => {
    const { result } = renderCatalog({
      ...base,
      catalog: { name: 'not-a-catalog', source: 'api' },
    });

    result.current.retry();
    await Promise.resolve();

    expect(fetchRows).not.toHaveBeenCalled();
    expect(result.current.isUnavailable).toBe(true);
  });

  it('waits for the parent and then requests with parent_id', async () => {
    const dependent: UseCatalogOptions = {
      ...base,
      catalog: { name: 'provinces', source: 'api', parent: 'country_id' },
    };
    const { result, rerender } = renderCatalog(dependent);

    expect(result.current.isWaitingParent).toBe(true);
    expect(fetchRows).not.toHaveBeenCalled();

    rerender({ ...dependent, parentValue: 'PA' });

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });
    expect(result.current.isWaitingParent).toBe(false);
    expect(fetchRows).toHaveBeenCalledWith({ parent_id: 'PA' });
  });

  it('keeps undefined filters off the request params', async () => {
    renderCatalog(base);
    await waitFor(() => {
      expect(fetchRows).toHaveBeenCalledWith({});
    });

    renderCatalog({
      ...base,
      catalog: { name: 'identification-types', source: 'api' },
      country: 'CR',
      personType: 'legal',
    });
    await waitFor(() => {
      expect(fetchRows).toHaveBeenCalledWith({
        country: 'CR',
        person_type: 'legal',
      });
    });
  });

  it('answers from a local catalog without requesting the bank one', () => {
    const local = [{ code: 'company-1', name: 'Holding S.A.' }];
    const wrapper = ({ children }: { children: ReactNode }) =>
      hookWrapper({
        children: createElement(
          LocalCatalogsContext,
          { value: () => local },
          children,
        ),
      });

    const { result } = renderCatalog(base, wrapper);

    expect(result.current.options).toEqual(local);
    expect(result.current.isLoaded).toBe(true);
    expect(result.current.isUnavailable).toBe(false);
    expect(fetchRows).not.toHaveBeenCalled();
  });

  it('refetches a failed catalog on retry', async () => {
    fetchRows.mockRejectedValueOnce(new Error('catalog down'));
    const { result } = renderCatalog(base);

    await waitFor(() => {
      expect(result.current.isUnavailable).toBe(true);
    });

    act(() => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.options).toEqual(ROWS.results);
    });
    expect(result.current.isUnavailable).toBe(false);
    expect(fetchRows).toHaveBeenCalledTimes(2);
  });

  it('title-cases API catalog rows from the query select', async () => {
    fetchRows.mockResolvedValueOnce({
      results: [{ code: 'chiquiri', name: 'SUCURSAL CHIQUIRI' }],
      count: 1,
    });

    const { result } = renderHook(
      () =>
        useCatalog({
          bankId: 'BLNI',
          catalog: { name: 'branches', source: 'unknown' },
          parentValue: undefined,
        }),
      { wrapper: hookWrapper },
    );

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    expect(result.current.options[0]?.name).toBe('Sucursal Chiquiri');
  });

  it('title-cases local catalog overrides', async () => {
    const localCatalogs = (name: string) =>
      name === 'branches' ?
        [{ code: 'chiquiri', name: 'SUCURSAL CHIQUIRI' }]
      : undefined;

    const { result } = renderHook(
      () =>
        useCatalog({
          bankId: 'BLNI',
          catalog: { name: 'branches', source: 'unknown' },
          parentValue: undefined,
        }),
      {
        wrapper: ({ children }: { children: ReactNode }) => (
          <NextIntlClientTestWrapper>
            <QueryClientProvider
              client={
                new QueryClient({
                  defaultOptions: { queries: { retry: false } },
                })
              }
            >
              <LocalCatalogsContext value={localCatalogs}>
                {children}
              </LocalCatalogsContext>
            </QueryClientProvider>
          </NextIntlClientTestWrapper>
        ),
      },
    );

    await waitFor(() => {
      expect(result.current.options[0]?.name).toBe('Sucursal Chiquiri');
    });
  });

  it('keeps related person names as returned by the API', async () => {
    const { result } = renderHook(
      () =>
        useCatalog({
          bankId: 'BLNI',
          catalog: { name: 'signatories', source: 'request' },
          parentValue: undefined,
        }),
      {
        wrapper: ({ children }: { children: ReactNode }) => (
          <NextIntlClientTestWrapper>
            <QueryClientProvider
              client={
                new QueryClient({
                  defaultOptions: { queries: { retry: false } },
                })
              }
            >
              <RequestScopeContext value='req-1'>
                {children}
              </RequestScopeContext>
            </QueryClientProvider>
          </NextIntlClientTestWrapper>
        ),
      },
    );

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    expect(result.current.options.map(({ name }) => name)).toEqual([
      'MARIA LOPEZ',
      "SEAN O'BRIEN",
    ]);
  });

  it('sends person_type only for identification-types', async () => {
    renderHook(
      () =>
        useCatalog({
          bankId: 'BLNI',
          catalog: { name: 'identification-types', source: 'unknown' },
          parentValue: undefined,
          personType: 'legal',
        }),
      { wrapper: hookWrapper },
    );

    await waitFor(() => {
      expect(catalogQueryMock).toHaveBeenCalledWith(
        'BLNI',
        'identification-types',
        {
          person_type: 'legal',
        },
      );
    });

    catalogQueryMock.mockClear();

    renderHook(
      () =>
        useCatalog({
          bankId: 'BLNI',
          catalog: { name: 'branches', source: 'unknown' },
          parentValue: undefined,
          personType: 'legal',
        }),
      { wrapper: hookWrapper },
    );

    await waitFor(() => {
      expect(catalogQueryMock).toHaveBeenCalledWith('BLNI', 'branches', {});
    });
  });
});
