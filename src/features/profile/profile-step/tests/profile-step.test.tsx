import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StepGateProvider, useStepGate } from '@/shared/request/step-gate';
import { es, render, screen } from '@/test/render';

const mocks = vi.hoisted(() => ({
  toastError: vi.fn<(message: unknown) => void>(),
  update: vi.fn<(body: unknown) => unknown>(),
  preview: vi.fn<(body: unknown) => unknown>(),
  reclassify: vi.fn<(body: unknown) => unknown>(),
}));

vi.mock('@lafise/onyx-ui/status/toast', () => ({
  toast: { error: mocks.toastError },
}));

const rows: Record<string, { code: string; name: string }[]> = {
  'identification-types': [{ code: 'ruc', name: 'RUC' }],
  'legal-entity-types': [
    { code: 'corporation', name: 'Sociedad Anónima' },
    { code: 'trust', name: 'Fideicomisos' },
  ],
  branches: [{ code: 'branch-1', name: 'León' }],
  'related-party-roles': [],
};

const ID = '0b9f6f1e-3c1d-4a53-9d0e-1f0f2f6a7b01';

const detail = {
  request_id: ID,
  bank_id: 'BLNI',
  editable: true,
  profile: { person_type: 'legal', country: 'NI' },
  profiling: {
    identification_type_id: 'ruc',
    identification_number: 'J0310000000001',
    legal_name: 'Empresa S.A.',
    legal_entity_type_id: 'corporation',
    annual_sales_usd: 500000,
    branch_id: 'branch-1',
  },
};

const routeChange = {
  scenario: 'route_change',
  legal_entity_type_after: 'trust',
  removed_people: [{ name: 'María López', role_ids: ['shareholder'] }],
  people_losing_roles: [],
  broken_links: [{ kind: 'superuser', position: 1, name: 'María López' }],
  changed_fields: 12,
  requires_confirmation: true,
};

vi.mock('@/server/api', () => ({
  accountRequestQuery: (id: string) => ({
    queryKey: ['account-requests', id],
    queryFn: () => Promise.resolve(detail),
  }),
  relatedPersonsQuery: (id: string) => ({
    queryKey: ['related-persons', id],
    queryFn: () => Promise.resolve({ results: [] }),
  }),
  exchangeRateQuery: () => ({
    queryKey: ['exchange-rates'],
    queryFn: () =>
      Promise.resolve({
        base_currency: 'USD',
        rate_date: '2026-10-14',
        rates: [{ currency: 'USD', buying: 1, selling: 1, official: 1 }],
        conversion: {
          amount_usd: 1,
          rate_type: 'buying',
          rate: 1,
          local_amount: 1,
        },
      }),
  }),
  isExchangeRate: (value: unknown): boolean =>
    typeof value === 'object' && value !== null && 'base_currency' in value,
  catalogQuery: (_bank: string, name: string) => ({
    queryKey: ['catalog', name],
    queryFn: () =>
      // eslint-disable-next-line security/detect-object-injection -- test fixture keyed by catalog name
      Promise.resolve({ results: rows[name] ?? [], count: 1 }),
  }),
  updateProfilingMutation: () => ({
    mutationFn: (body: unknown) => Promise.resolve(mocks.update(body)),
  }),
  reclassificationPreviewMutation: () => ({
    mutationFn: (body: unknown) => Promise.resolve(mocks.preview(body)),
  }),
  reclassifyMutation: () => ({
    mutationFn: (body: unknown) => Promise.resolve(mocks.reclassify(body)),
  }),
}));

const { ProfileStep } = await import('..');

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    <StepGateProvider>{children}</StepGateProvider>
  </QueryClientProvider>
);

/** Stands in for the footer: whether "Continue" is open, and runs it. */
const FooterProbe = () => {
  const gate = useStepGate();
  return (
    <>
      <span data-testid='gate'>{gate.canContinue ? 'open' : 'closed'}</span>
      <button
        type='button'
        onClick={() => {
          void gate.run();
        }}
      >
        continue
      </button>
    </>
  );
};

const renderStep = () =>
  render(
    <>
      <ProfileStep requestId={ID} />
      <FooterProbe />
    </>,
    { wrapper },
  );

/** Select triggers in document order: identification type, legal entity type, branch. */
const triggers = () =>
  Array.from(
    document.querySelectorAll<HTMLElement>('button[data-slot=select-trigger]'),
  );

const chooseEntityType = async (name: string) => {
  await waitFor(() => {
    expect(triggers()).toHaveLength(3);
  });
  const trigger = triggers()[1];
  if (trigger === undefined) throw new Error('missing entity type select');
  // The catalog has loaded once the saved type shows its name.
  await waitFor(() => {
    expect(trigger.textContent).toContain('Sociedad Anónima');
  });
  fireEvent.keyDown(trigger, { key: 'Enter' });
  fireEvent.keyUp(trigger, { key: 'Enter' });
  fireEvent.click(await screen.findByRole('option', { name }));
};

describe('ProfileStep', () => {
  beforeEach(() => {
    mocks.toastError.mockReset();
    mocks.update.mockReset();
    mocks.preview.mockReset();
    mocks.reclassify.mockReset();
  });

  it('shows the verified profiling with the base data and the identification fixed', async () => {
    renderStep();

    expect(
      await screen.findByDisplayValue(detail.profiling.legal_name),
    ).toBeDefined();
    expect(triggers()[0]?.hasAttribute('disabled')).toBe(true);
    await waitFor(() => {
      expect(screen.getByTestId('gate').textContent).toBe('open');
    });
  });

  it('saves only the changed base data on continue', async () => {
    renderStep();
    const name = await screen.findByDisplayValue(detail.profiling.legal_name);
    fireEvent.change(name, { target: { value: 'Otra S.A.' } });
    await waitFor(() => {
      expect(screen.getByTestId('gate').textContent).toBe('open');
    });

    fireEvent.click(screen.getByRole('button', { name: 'continue' }));

    await waitFor(() => {
      expect(mocks.update).toHaveBeenCalledWith({ legal_name: 'Otra S.A.' });
    });
  });

  it('asks before a reclassification that removes people, and applies it on confirm', async () => {
    mocks.preview.mockReturnValue(routeChange);
    mocks.reclassify.mockReturnValue(routeChange);
    renderStep();

    await chooseEntityType('Fideicomisos');

    expect(
      await screen.findByText(es.Profile.reclassification.title),
    ).toBeDefined();
    expect(
      screen.getByText(/deja sin titular Superusuario 1 · María López/u),
    ).toBeDefined();
    expect(mocks.reclassify).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole('button', {
        name: es.Profile.reclassification.confirmAndRemove,
      }),
    );

    await waitFor(() => {
      expect(mocks.reclassify).toHaveBeenCalledWith({
        legal_entity_type_id: 'trust',
      });
    });
  });

  it('applies a reclassification without consequence at once', async () => {
    const harmless = {
      ...routeChange,
      removed_people: [],
      requires_confirmation: false,
    };
    mocks.preview.mockReturnValue(harmless);
    mocks.reclassify.mockReturnValue(harmless);
    renderStep();

    await chooseEntityType('Fideicomisos');

    await waitFor(() => {
      expect(mocks.reclassify).toHaveBeenCalledWith({
        legal_entity_type_id: 'trust',
      });
    });
    expect(screen.queryByText(es.Profile.reclassification.title)).toBeNull();
  });
});
