import { fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { withQueries } from '@/test/form';
import { es, render, screen } from '@/test/render';

import { CatalogSelect } from '../catalog-select';

const mocks = vi.hoisted(() => ({
  fetchRows: vi.fn<(params: Record<string, string>) => Promise<unknown>>(),
}));

vi.mock('@/server/api', () => ({
  relatedPersonsQuery: (id: string) => ({
    queryKey: ['related-persons', id],
    queryFn: () => Promise.resolve({ results: [] }),
  }),
  catalogQuery: (
    bankId: string,
    name: string,
    params: Record<string, string> = {},
  ) => ({
    queryKey: ['catalogs', bankId, name, params],
    queryFn: () => mocks.fetchRows(params),
  }),
}));

const catalog = {
  name: 'municipalities',
  parent: 'department_id',
  source: 'unknown',
} as const;

const props = {
  label: 'Municipality',
  value: undefined,
  onChange: vi.fn(),
  onBlur: vi.fn(),
  bankId: 'BLNI',
  catalog,
  isRequired: true,
  isDisabled: false,
  isInvalid: false,
} as const;

describe('CatalogSelect', () => {
  beforeEach(() => {
    mocks.fetchRows.mockReset();
    mocks.fetchRows.mockResolvedValue({
      results: [{ code: 'managua.managua', name: 'Managua' }],
      count: 1,
    });
  });

  it('waits for the parent: no request, disabled, says what is missing', () => {
    render(<CatalogSelect {...props} parentValue={undefined} />, {
      wrapper: withQueries,
    });

    expect(mocks.fetchRows).not.toHaveBeenCalled();
    expect(screen.getByText(es.Form.catalog.waitingParent)).toBeDefined();
    expect(screen.getByRole('button').hasAttribute('disabled')).toBe(true);
  });

  it('requests the options filtered by the parent value', async () => {
    render(<CatalogSelect {...props} parentValue='managua' />, {
      wrapper: withQueries,
    });

    expect(await screen.findByText(es.Form.placeholder.select)).toBeDefined();
    expect(mocks.fetchRows).toHaveBeenCalledWith({ parent_id: 'managua' });
  });

  it('reads the catalog for the country it follows (cache key included)', async () => {
    render(
      <CatalogSelect
        {...props}
        parentValue='cr-province-1'
        catalogCountry='CR'
      />,
      { wrapper: withQueries },
    );

    expect(await screen.findByText(es.Form.placeholder.select)).toBeDefined();
    expect(mocks.fetchRows).toHaveBeenCalledWith({
      country: 'CR',
      parent_id: 'cr-province-1',
    });
  });

  it('disables itself when the catalog is unavailable and retries on demand', async () => {
    mocks.fetchRows.mockRejectedValueOnce(new Error('503'));
    render(<CatalogSelect {...props} parentValue='managua' />, {
      wrapper: withQueries,
    });

    expect(await screen.findByText(es.Form.catalog.unavailable)).toBeDefined();
    fireEvent.click(
      screen.getByRole('button', { name: es.Form.catalog.retry }),
    );

    expect(await screen.findByText(es.Form.placeholder.select)).toBeDefined();
    expect(mocks.fetchRows).toHaveBeenCalledTimes(2);
  });
});
