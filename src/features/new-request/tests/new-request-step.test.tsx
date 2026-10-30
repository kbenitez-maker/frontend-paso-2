import { useState } from 'react';

import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HttpException } from '@lafise/lde-web-lib';

import { routes } from '@/lib/routes';
import { StepGateProvider, useStepGate } from '@/shared/request/step-gate';
import { es, render, screen } from '@/test/render';

const REQUEST_ID = '0b9f6f1e-3c1d-4a53-9d0e-1f0f2f6a7b01';

const mocks = vi.hoisted(() => ({
  push: vi.fn<(href: string) => void>(),
  toastError: vi.fn<(message: unknown) => void>(),
  lookup: vi.fn<(bankId: string, identification: string) => unknown>(),
  create: vi.fn<(body: unknown) => unknown>(),
  catalogParams: vi.fn<(name: string, params: unknown) => void>(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock('@lafise/onyx-ui/status/toast', () => ({
  toast: { error: mocks.toastError },
}));

const rows: Record<string, { code: string; name: string }[]> = {
  'identification-types': [
    { code: 'ruc', name: 'RUC' },
    { code: 'national-id', name: 'Cédula de identidad' },
  ],
  'legal-entity-types': [{ code: 'corporation', name: 'Sociedad Anónima' }],
  branches: [{ code: 'branch-1', name: 'León' }],
};

const settle = (result: unknown) =>
  result instanceof Error ? Promise.reject(result) : Promise.resolve(result);

interface ApiGuards {
  isCustomerLookup: (value: unknown) => boolean;
  isExchangeRate: (value: unknown) => boolean;
  isAccountOpeningRequestCreated: (value: unknown) => boolean;
}

vi.mock('@/server/api', async () => {
  const actual = await vi.importActual<ApiGuards>('@/server/api');

  return {
    relatedPersonsQuery: (id: string) => ({
      queryKey: ['related-persons', id],
      queryFn: () => Promise.resolve({ results: [] }),
    }),
    catalogQuery: (_bank: string, name: string, params: unknown) => {
      mocks.catalogParams(name, params);
      return {
        queryKey: ['catalog', name],
        queryFn: () =>
          // eslint-disable-next-line security/detect-object-injection -- test fixture keyed by catalog name
          Promise.resolve({ results: rows[name] ?? [], count: 1 }),
      };
    },
    customerLookupQuery: (bankId: string, identification: string) => ({
      queryKey: ['customer-lookup', bankId, identification],
      queryFn: () => settle(mocks.lookup(bankId, identification)),
    }),
    isCustomerLookup: actual.isCustomerLookup,
    exchangeRateQuery: (bankId: string, amount: number) => ({
      queryKey: ['exchange-rates', bankId, amount],
      queryFn: () =>
        Promise.resolve({
          base_currency: 'NIO',
          rate_date: '2026-10-14',
          rates: [
            {
              currency: 'USD',
              buying: 36.45,
              selling: 37.5,
              official: 36.6243,
            },
          ],
          conversion: {
            amount_usd: amount,
            rate_type: 'buying',
            rate: 36.45,
            local_amount: amount * 36.45,
          },
        }),
    }),
    isExchangeRate: actual.isExchangeRate,
    isAccountOpeningRequestCreated: actual.isAccountOpeningRequestCreated,
    createAccountOpeningRequestMutation: () => ({
      mutationFn: (body: unknown) => settle(mocks.create(body)),
    }),
  };
});

const { NewRequestStep } = await import('../new-request-step');

const bank = {
  bank_id: 'BLNI',
  country: 'NI',
  name: 'Nicaragua',
  legal_name: 'Banco LAFISE BANCENTRO, S.A.',
  enabled: true,
} as const;

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    <StepGateProvider>{children}</StepGateProvider>
  </QueryClientProvider>
);

/** Stands in for the footer: shows the label and whether "Continue" is open, and runs it. */
const FooterProbe = () => {
  const gate = useStepGate();
  const [ran, setRan] = useState(0);

  return (
    <>
      <span data-testid='gate'>{gate.canContinue ? 'open' : 'closed'}</span>
      <span data-testid='label'>{gate.nextLabel ?? 'default'}</span>
      <span data-testid='ran'>{ran}</span>
      <button
        type='button'
        onClick={() => {
          void gate.run().then(() => {
            setRan((count) => count + 1);
          });
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
      <NewRequestStep bank={bank} />
      <FooterProbe />
    </>,
    { wrapper },
  );

const gate = () => screen.getByTestId('gate').textContent;

/** Opens a select with the keyboard (what react-aria listens to) and picks an option. */
const choose = async (trigger: HTMLElement, option: string) => {
  fireEvent.keyDown(trigger, { key: 'Enter' });
  fireEvent.keyUp(trigger, { key: 'Enter' });
  fireEvent.click(await screen.findByRole('option', { name: option }));
};

/** Select triggers in document order: type, legal entity type, branch. */
const triggers = () =>
  Array.from(
    document.querySelectorAll<HTMLElement>('button[data-slot=select-trigger]'),
  );

const identify = async (number: string) => {
  await waitFor(() => {
    expect(triggers()).toHaveLength(1);
  });
  const type = triggers()[0];
  if (type === undefined) throw new Error('missing type select');
  await waitFor(() => {
    expect(type.hasAttribute('disabled')).toBe(false);
  });
  await choose(type, 'RUC');
  fireEvent.change(
    screen.getByPlaceholderText(es.NewRequest.identification.numberPlaceholder),
    { target: { value: number } },
  );
};

const verify = async () => {
  await waitFor(() => {
    expect(gate()).toBe('open');
  });
  fireEvent.click(screen.getByRole('button', { name: 'continue' }));
};

describe('NewRequestStep', () => {
  beforeEach(() => {
    mocks.push.mockReset();
    mocks.toastError.mockReset();
    mocks.lookup.mockReset();
    mocks.create.mockReset();
    mocks.catalogParams.mockReset();
  });

  it('shows the request country and bank on the identification card', () => {
    renderStep();

    expect(screen.getByText(es.Steps.rail.countries.NI)).toBeDefined();
    expect(screen.getByText('BLNI')).toBeDefined();
    expect(
      screen.getByRole('heading', { name: es.NewRequest.card.title }),
    ).toBeDefined();
  });

  it('starts with only the identification and a "verify" label that stays closed', async () => {
    renderStep();

    expect(
      screen.queryByText(es.NewRequest.baseData.legalName.label),
    ).toBeNull();
    expect(screen.getByTestId('label').textContent).toBe(
      es.NewRequest.footer.verify,
    );
    expect(gate()).toBe('closed');
    await waitFor(() => {
      expect(mocks.catalogParams).toHaveBeenCalledWith('identification-types', {
        person_type: 'legal',
      });
    });
  });

  it('opens the base data only after the lookup says the company is new', async () => {
    mocks.lookup.mockReturnValue({
      company_exists: false,
      has_active_onboarding_request: false,
      onboarding_lookup_available: true,
    });
    renderStep();

    await identify('J0310000000001');
    await verify();

    expect(
      await screen.findByText(es.NewRequest.baseData.legalName.label),
    ).toBeDefined();
    expect(mocks.lookup).toHaveBeenCalledWith('BLNI', 'J0310000000001');
    expect(screen.getByTestId('label').textContent).toBe('default');
    expect(gate()).toBe('closed');
  });

  it('ends the digital flow on a full screen for an existing client', async () => {
    mocks.lookup.mockReturnValue({
      company_exists: true,
      has_active_onboarding_request: false,
      onboarding_lookup_available: true,
    });
    renderStep();

    await identify('0000000000002');
    await verify();

    expect(
      await screen.findByText(es.NewRequest.outcomes.existingClient.title),
    ).toBeDefined();
    expect(
      screen
        .getByText(es.NewRequest.outcomes.existingClient.action)
        .closest('a')
        ?.getAttribute('href'),
    ).toContain('/account-requests');
  });

  it('keeps a request in progress as a notice in the card with the way to the list', async () => {
    mocks.lookup.mockReturnValue(
      HttpException.fromResponseData(400, {
        error: { code: 'FCJ008', message: 'in progress' },
      }),
    );
    renderStep();

    await identify('0000000000001');
    await verify();

    const link = await screen.findByRole('link', {
      name: es.NewRequest.outcomes.requestInProgress.link,
    });
    expect(link.getAttribute('href')).toContain('/account-requests');
    expect(mocks.toastError).not.toHaveBeenCalled();
    expect(
      screen.getByRole('heading', { name: es.NewRequest.card.title }),
    ).toBeDefined();
    expect(
      screen.queryByText(es.NewRequest.baseData.legalName.label),
    ).toBeNull();
  });

  it.each([
    [
      new HttpException(0, 'timeout', 'ECONNABORTED'),
      es.NewRequest.outcomes.timeout,
    ],
    [
      HttpException.fromResponseData(400, {
        error: { code: 'FCJ009', message: 'down' },
      }),
      es.NewRequest.outcomes.unavailable,
    ],
  ] as const)(
    'toasts a failed lookup and lets the applicant retry',
    async (error, copy) => {
      mocks.lookup.mockReturnValue(error);
      renderStep();

      await identify('0000000000004');
      await verify();

      await waitFor(() => {
        expect(mocks.toastError).toHaveBeenCalledWith({
          heading: copy.title,
          description: copy.message,
        });
      });
      expect(
        screen.queryByText(es.NewRequest.baseData.legalName.label),
      ).toBeNull();
      await waitFor(() => {
        expect(gate()).toBe('open');
      });
    },
  );

  it('shows the local equivalent of the annual sales', async () => {
    mocks.lookup.mockReturnValue({
      company_exists: false,
      has_active_onboarding_request: false,
      onboarding_lookup_available: true,
    });
    renderStep();
    await identify('J0310000000001');
    await verify();

    fireEvent.change(
      await screen.findByPlaceholderText(
        es.NewRequest.baseData.annualSales.placeholder,
      ),
      { target: { value: '1000' } },
    );

    // The query normalizes NBSP to a space and then compares it to the raw matcher.
    const amount = new Intl.NumberFormat('es', {
      style: 'currency',
      currency: 'NIO',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
      .format(36_450)
      .replaceAll('\u00a0', ' ');
    expect(
      await screen.findByText(
        es.NewRequest.baseData.annualSales.equivalent.replace(
          '{amount}',
          amount,
        ),
      ),
    ).toHaveAttribute('aria-live', 'polite');
    expect(
      screen.getByText(es.NewRequest.baseData.annualSales.hint),
    ).toBeVisible();
  });

  it('creates the request with the base data and goes to its base documents', async () => {
    mocks.lookup.mockReturnValue({
      company_exists: false,
      has_active_onboarding_request: false,
      onboarding_lookup_available: true,
    });
    mocks.create.mockReturnValue({
      request_id: REQUEST_ID,
      form_version_id: 3,
      operating_country_id: 1,
      bank_id: 'BLNI',
      legal_name: 'Empresa Demo S.A.',
      identification_number: 'J0310000000001',
      status_code: 'DRAFT',
      status: 'Draft',
      can_edit: true,
      entity_type_code: 'corporation',
      annual_sales_usd: 1250.5,
      branch_code: 'branch-1',
    });
    renderStep();
    await identify('J0310000000001');
    await verify();

    fireEvent.change(
      await screen.findByPlaceholderText(
        es.NewRequest.baseData.legalName.placeholder,
      ),
      { target: { value: 'Empresa Demo S.A.' } },
    );
    fireEvent.change(
      screen.getByPlaceholderText(
        es.NewRequest.baseData.annualSales.placeholder,
      ),
      { target: { value: '1250.5' } },
    );
    const [, entityType, branch] = triggers();
    if (entityType === undefined || branch === undefined) {
      throw new Error('missing base data selects');
    }
    await choose(entityType, 'Sociedad Anónima');
    await choose(branch, 'León');
    await waitFor(() => {
      expect(gate()).toBe('open');
    });
    fireEvent.click(screen.getByRole('button', { name: 'continue' }));

    await waitFor(() => {
      expect(mocks.push).toHaveBeenCalledWith(`/${REQUEST_ID}/base-documents`);
    });
    expect(mocks.create).toHaveBeenCalledWith({
      bank_id: 'BLNI',
      legal_name: 'Empresa Demo S.A.',
      identification_number: 'J0310000000001',
      identification_type_code: 'ruc',
      entity_type_code: 'corporation',
      annual_sales_usd: 1250.5,
      branch_code: 'branch-1',
    });
  });

  it('marks the identification type when the bank does not offer it', async () => {
    mocks.lookup.mockReturnValue({
      company_exists: false,
      has_active_onboarding_request: false,
      onboarding_lookup_available: true,
    });
    mocks.create.mockReturnValue(
      HttpException.fromResponseData(400, {
        error: { code: 'FCJ005', message: 'type' },
      }),
    );
    renderStep();
    await identify('J0310000000001');
    await verify();

    fireEvent.change(
      await screen.findByPlaceholderText(
        es.NewRequest.baseData.legalName.placeholder,
      ),
      { target: { value: 'Empresa Demo S.A.' } },
    );
    fireEvent.change(
      screen.getByPlaceholderText(
        es.NewRequest.baseData.annualSales.placeholder,
      ),
      { target: { value: '1250.5' } },
    );
    const [, entityType, branch] = triggers();
    if (entityType === undefined || branch === undefined) {
      throw new Error('missing base data selects');
    }
    await choose(entityType, 'Sociedad Anónima');
    await choose(branch, 'León');
    await waitFor(() => {
      expect(gate()).toBe('open');
    });
    fireEvent.click(screen.getByRole('button', { name: 'continue' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      es.Form.errors.invalid,
    );
    expect(
      screen.getByPlaceholderText(
        es.NewRequest.identification.numberPlaceholder,
      ),
    ).toBeInvalid();
    expect(mocks.toastError).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it('toasts when the created draft is not the published shape', async () => {
    mocks.lookup.mockReturnValue({
      company_exists: false,
      has_active_onboarding_request: false,
      onboarding_lookup_available: true,
    });
    mocks.create.mockReturnValue({ request_id: 9 });
    renderStep();
    await identify('J0310000000001');
    await verify();

    fireEvent.change(
      await screen.findByPlaceholderText(
        es.NewRequest.baseData.legalName.placeholder,
      ),
      { target: { value: 'Empresa Demo S.A.' } },
    );
    fireEvent.change(
      screen.getByPlaceholderText(
        es.NewRequest.baseData.annualSales.placeholder,
      ),
      { target: { value: '1250.5' } },
    );
    const [, entityType, branch] = triggers();
    if (entityType === undefined || branch === undefined) {
      throw new Error('missing base data selects');
    }
    await choose(entityType, 'Sociedad Anónima');
    await choose(branch, 'León');
    await waitFor(() => {
      expect(gate()).toBe('open');
    });
    const assign = vi.fn();
    vi.stubGlobal('location', { assign });
    const errorLog = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    fireEvent.click(screen.getByRole('button', { name: 'continue' }));

    await waitFor(() => {
      expect(assign).toHaveBeenCalledWith(routes.external.requests());
    });
    expect(mocks.toastError).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
    expect(errorLog).toHaveBeenCalledWith(
      'account opening response was not a draft',
      { bankId: 'BLNI' },
    );
    expect(gate()).toBe('closed');
    errorLog.mockRestore();
    vi.unstubAllGlobals();
  });

  it('clears a block notice and opens base data after a successful retry', async () => {
    mocks.lookup
      .mockReturnValueOnce(
        HttpException.fromResponseData(400, {
          error: { code: 'FCJ008', message: 'in progress' },
        }),
      )
      .mockReturnValueOnce({
        company_exists: false,
        has_active_onboarding_request: false,
        onboarding_lookup_available: true,
      });
    renderStep();

    await identify('0000000000001');
    await verify();

    await screen.findByRole('link', {
      name: es.NewRequest.outcomes.requestInProgress.link,
    });
    expect(
      screen.queryByText(es.NewRequest.baseData.legalName.label),
    ).toBeNull();

    await verify();

    await screen.findByText(es.NewRequest.baseData.legalName.label);
    expect(
      screen.queryByRole('link', {
        name: es.NewRequest.outcomes.requestInProgress.link,
      }),
    ).toBeNull();
  });

  it('exposes the country identification tooltip and the base-data tooltips', async () => {
    const user = userEvent.setup();
    mocks.lookup.mockReturnValue({
      company_exists: false,
      has_active_onboarding_request: false,
      onboarding_lookup_available: true,
    });
    renderStep();

    const idTrigger = screen.getByLabelText(
      es.Form.tooltipTrigger.replace(
        '{label}',
        es.NewRequest.identification.label,
      ),
    );
    await user.tab();
    expect(idTrigger).toHaveFocus();
    expect((await screen.findByRole('tooltip')).textContent).toBe(
      es.NewRequest.tooltips.identification.NI,
    );
    await user.keyboard('{Escape}');

    await identify('J0310000000001');
    await verify();

    await screen.findByText(es.NewRequest.baseData.legalName.label);
    expect(
      screen.getByLabelText(
        es.Form.tooltipTrigger.replace(
          '{label}',
          es.NewRequest.baseData.legalName.label,
        ),
      ),
    ).toBeDefined();
    expect(
      screen.getByLabelText(
        es.Form.tooltipTrigger.replace(
          '{label}',
          es.NewRequest.baseData.annualSales.label,
        ),
      ),
    ).toBeDefined();
    expect(
      screen.queryByLabelText(
        es.Form.tooltipTrigger.replace(
          '{label}',
          es.NewRequest.baseData.legalEntityType.label,
        ),
      ),
    ).toBeNull();
    expect(
      screen.queryByLabelText(
        es.Form.tooltipTrigger.replace(
          '{label}',
          es.NewRequest.baseData.branch.label,
        ),
      ),
    ).toBeNull();
  });
});
