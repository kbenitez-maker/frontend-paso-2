import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FormSession } from '@/shared/request/form-session';
import { es, render, screen } from '@/test/render';

const mocks = vi.hoisted(() => ({
  search: vi.fn<() => URLSearchParams>(),
  country: { value: 'NI' },
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/r1/bancanet',
  useSearchParams: mocks.search,
}));

vi.mock('@/server/api', () => ({
  accountRequestQuery: (id: string) => ({
    queryKey: ['request', id],
    queryFn: () =>
      Promise.resolve({
        request_id: id,
        bank_id: mocks.country.value === 'NI' ? 'BLNI' : 'BLCR',
        profile: { person_type: 'legal', country: mocks.country.value },
      }),
  }),
  sectionQuery: (id: string, key: string) => ({
    queryKey: ['section', id, key],
    queryFn: () =>
      Promise.resolve({ section_key: key, state: 'empty', data: {} }),
  }),
  relatedPersonsQuery: (id: string) => ({
    queryKey: ['related-persons', id],
    queryFn: () => Promise.resolve({ results: [] }),
  }),
  catalogQuery: (bankId: string, name: string) => ({
    queryKey: ['catalog', bankId, name],
    queryFn: () => Promise.resolve({ results: [], count: 0 }),
  }),
  sectionMutation: (_id: string, section: string, mode: string) => ({
    mutationFn: (body: unknown) =>
      Promise.resolve({ section_key: section, state: mode, data: body }),
  }),
}));

const { BancanetStep } = await import('..');

const labels = es.BancanetFields.labels;

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    <FormSession>{children}</FormSession>
  </QueryClientProvider>
);

const renderBlock = (country: 'NI' | 'CR', block: string) => {
  mocks.country.value = country;
  mocks.search.mockReturnValue(new URLSearchParams({ block }));
  render(<BancanetStep requestId='r1' />, { wrapper });
};

// Full-step renders with several async lookups; the default 5 s timed out under full-suite load.
describe('BancanetStep', () => {
  beforeEach(() => {
    mocks.search.mockReset();
  });

  it('adds a superuser through the item modal', async () => {
    renderBlock('NI', 'superusers');

    expect(
      await screen.findByText('Todavía no ha agregado ningún superusuario.'),
    ).toBeDefined();
    expect(screen.getByText('0 de máximo 2')).toBeDefined();
    expect(screen.queryByText(labels.assign_registered_signatory)).toBeNull();

    fireEvent.click(
      screen.getByRole('button', { name: 'Agregar superusuario' }),
    );

    expect(
      await screen.findByRole('heading', { name: 'Nuevo superusuario' }),
    ).toBeDefined();
    expect(
      screen.getAllByText(labels.assign_registered_signatory),
    ).toHaveLength(1);
  });

  it('offers the mark-all shortcut and the NI features', async () => {
    renderBlock('NI', 'features');

    expect(await screen.findByText(labels.mark_all_features)).toBeDefined();
    expect(screen.getByText(labels.manage_audits)).toBeDefined();
    expect(screen.queryByText(labels.pay_own_credit_card)).toBeNull();
  });

  it('offers the mark-all shortcut with the CR features (POC: NI and CR)', async () => {
    renderBlock('CR', 'features');

    expect(await screen.findByText(labels.pay_own_credit_card)).toBeDefined();
    expect(screen.getByText(labels.mark_all_features)).toBeDefined();
    expect(screen.queryByText(labels.manage_audits)).toBeNull();
  });

  it('turns every feature on when all are marked', async () => {
    renderBlock('NI', 'features');
    const [markAll] = await screen.findAllByRole('radio', {
      name: es.Form.yes,
    });

    fireEvent.click(markAll ?? document.body);

    await waitFor(() => {
      const yes = screen.getAllByRole('radio', { name: es.Form.yes });
      expect(yes.length).toBeGreaterThan(1);
      for (const radio of yes) expect(radio).toHaveProperty('checked', true);
    });
  });
});
