import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FormSession } from '@/shared/request/form-session';
import { es, render, screen } from '@/test/render';

const mocks = vi.hoisted(() => ({
  search: vi.fn<() => URLSearchParams>(),
  country: { value: 'NI' },
  saved: new Map<string>(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/r1/references-accounts',
  useSearchParams: mocks.search,
}));

vi.mock('@/server/api', () => ({
  accountRequestQuery: (id: string) => ({
    queryKey: ['request', id],
    queryFn: () =>
      Promise.resolve({
        request_id: id,
        bank_id: mocks.country.value === 'NI' ? 'BLNI' : 'BLHN',
        profile: { person_type: 'legal', country: mocks.country.value },
      }),
  }),
  sectionQuery: (id: string, key: string) => ({
    queryKey: ['section', id, key],
    queryFn: () =>
      Promise.resolve({
        section_key: key,
        state: 'empty',
        data: mocks.saved.get(key) ?? {},
      }),
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

const { ReferencesAccountsStep } = await import('../references-accounts-step');

const labels = es.ReferencesAccountsFields.labels;

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    <FormSession>{children}</FormSession>
  </QueryClientProvider>
);

const renderBlock = (country: 'NI' | 'HN', block: string) => {
  mocks.country.value = country;
  mocks.search.mockReturnValue(new URLSearchParams({ block }));
  render(<ReferencesAccountsStep requestId='r1' />, { wrapper });
};

describe('ReferencesAccountsStep', () => {
  beforeEach(() => {
    mocks.country.value = 'NI';
    mocks.saved.clear();
  });

  it('lists the references and edits a new one in a modal', async () => {
    renderBlock('NI', 'references');

    expect(
      await screen.findByText('Todavía no ha agregado ninguna referencia.'),
    ).toBeDefined();
    expect(screen.getByText('0 de mínimo 2')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Agregar referencia' }));

    expect(
      await screen.findByRole('heading', { name: 'Nueva referencia' }),
    ).toBeDefined();
    expect(screen.getByText(labels.reference_type_id)).toBeDefined();
    expect(screen.getByText(labels.reference_phone)).toBeDefined();
    // The bank details of a reference only exist in HN.
    expect(screen.queryByText(labels.reference_account_age)).toBeNull();
  });

  it('keeps an incomplete reference as a draft with its error (POC)', async () => {
    renderBlock('NI', 'references');
    fireEvent.click(
      await screen.findByRole('button', { name: 'Agregar referencia' }),
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'Guardar referencia' }),
    );

    expect(await screen.findByText('1 de mínimo 2')).toBeDefined();
    expect(
      screen.queryByRole('heading', { name: 'Nueva referencia' }),
    ).toBeNull();
  });

  it('asks the typed data unless the reference reuses a registered counterparty', async () => {
    mocks.saved.set('references', {
      references: [
        { reference_type_id: 'bank', reference_legal_name: 'Banco Uno' },
        {
          reference_type_id: 'commercial',
          use_registered_counterparties: true,
        },
      ],
    });
    renderBlock('HN', 'references');

    expect(await screen.findByText('2 de mínimo 2')).toBeDefined();
    fireEvent.click(
      screen.getByRole('button', { name: 'Editar referencia 2' }),
    );
    // POC referencias.ts: a reused customer or supplier replaces the typed data.
    expect(
      await screen.findByText(labels.registered_counterparty_id),
    ).toBeDefined();
    expect(screen.queryByText(labels.reference_address)).toBeNull();
    expect(screen.queryByText(labels.reference_account_age)).toBeNull();
  });

  it('removes a reference at once (POC)', async () => {
    mocks.saved.set('references', {
      references: [{ reference_type_id: 'bank' }],
    });
    renderBlock('NI', 'references');

    fireEvent.click(
      await screen.findByRole('button', { name: 'Eliminar referencia 1' }),
    );

    expect(
      await screen.findByText('Todavía no ha agregado ninguna referencia.'),
    ).toBeDefined();
  });

  it('renders the accounts with the country questions', async () => {
    renderBlock('NI', 'accounts');

    fireEvent.click(
      await screen.findByRole('button', { name: 'Agregar cuenta' }),
    );
    expect(await screen.findByText(labels.account_type_id)).toBeDefined();
    expect(screen.getByText(labels.initial_deposit_amount)).toBeDefined();
    expect(screen.queryByText(labels.initial_deposit_origin_id)).toBeNull();
  });

  it('opens the transfer groups of an account only after answering yes', async () => {
    renderBlock('HN', 'accounts');
    // POC parity: the transfers belong to each account, so they live in its modal.
    fireEvent.click(
      await screen.findByRole('button', { name: 'Agregar cuenta' }),
    );
    fireEvent.click(
      await screen.findByRole('tab', {
        name: es.Form.collections.accounts.tabs.transfers,
      }),
    );
    const question = await screen.findByRole('radiogroup', {
      name: labels.will_make_international_transfers,
    });

    expect(screen.queryByText('Transferencias a enviar')).toBeNull();
    fireEvent.click(within(question).getByRole('radio', { name: es.Form.yes }));

    // One list per group: sent and received.
    expect(await screen.findByText('Transferencias a enviar')).toBeDefined();
    expect(screen.getByText('Transferencias a recibir')).toBeDefined();
  });
});
