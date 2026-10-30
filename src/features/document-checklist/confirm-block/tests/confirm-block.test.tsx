import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StepGateProvider, useStepGate } from '@/shared/request/step-gate';
import { es, render, screen } from '@/test/render';

const mocks = vi.hoisted(() => ({
  push: vi.fn<(href: string) => void>(),
  save: vi.fn<(body: unknown) => void>(),
  confirmation: { value: {} },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock('@/server/api', () => ({
  confirmationQuery: (requestId: string) => ({
    queryKey: ['account-requests', requestId, 'confirmation'],
    queryFn: () => Promise.resolve(structuredClone(mocks.confirmation.value)),
  }),
  saveConfirmationMutation: () => ({
    mutationFn: (body: object) => {
      mocks.save(body);
      return Promise.resolve({ ...mocks.confirmation.value, ...body });
    },
  }),
}));

const { ConfirmBlock } = await import('..');

const ID = 'req-1';

const confirmation = (overrides: Record<string, unknown> = {}) => ({
  fields: [
    { key: 'legal_entity_type', value: 'Corporation', source: 'profile' },
    {
      key: 'incorporation_country',
      value: 'Nicaragua',
      source: { step: 'company', block: 'identification' },
    },
    {
      key: 'fintech',
      value: true,
      source: { step: 'economic-activity', block: 'activity' },
    },
    {
      key: 'economic_sector',
      value: null,
      source: { step: 'economic-activity', block: 'activity' },
    },
  ],
  signer_options: [
    { id: 'rep-1', name: 'Ana López' },
    { id: 'rep-2', name: 'Carlos Mendoza' },
  ],
  signer_id: null,
  accepted_statements: [],
  ...overrides,
});

/** Stands in for the footer: shows whether "Continue" is open. */
const GateProbe = () => {
  const gate = useStepGate();
  return <span data-testid='gate'>{gate.canContinue ? 'open' : 'closed'}</span>;
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    <StepGateProvider>
      {children}
      <GateProbe />
    </StepGateProvider>
  </QueryClientProvider>
);

const renderBlock = (overrides?: Record<string, unknown>) => {
  mocks.confirmation.value = confirmation(overrides);
  return render(<ConfirmBlock requestId={ID} />, { wrapper });
};

describe('ConfirmBlock', () => {
  beforeEach(() => {
    mocks.push.mockClear();
    mocks.save.mockClear();
  });

  it('lists the answers read-only: booleans as yes/no, missing ones as unanswered', async () => {
    renderBlock();

    expect(
      await screen.findByText(
        es.DocumentChecklist.confirm.fields.legal_entity_type,
      ),
    ).toBeDefined();
    expect(screen.getByText('Corporation')).toBeDefined();
    expect(screen.getByText(es.DocumentChecklist.confirm.yes)).toBeDefined();
    expect(
      screen.getByText(es.DocumentChecklist.confirm.unanswered),
    ).toBeDefined();
    expect(screen.getByText(es.DocumentChecklist.confirm.notice)).toBeDefined();
  });

  it('sends each row to the profile or to the block where it was captured', async () => {
    renderBlock();
    const { fields } = es.DocumentChecklist.confirm;
    const edit = async (label: string) => {
      const row = (await screen.findByText(label)).closest(
        '[data-slot="list-box-item"]',
      );
      if (!(row instanceof HTMLElement)) throw new Error('Row not found');
      fireEvent.click(within(row).getByRole('button'));
    };

    await edit(fields.legal_entity_type);
    await edit(fields.incorporation_country);

    await waitFor(() => {
      expect(mocks.push).toHaveBeenCalledWith(`/${ID}/profile`);
    });
    expect(mocks.push).toHaveBeenCalledWith(
      `/${ID}/company?block=identification`,
    );
  });

  it('keeps continue closed until a signer is designated', async () => {
    renderBlock();

    expect(
      await screen.findByText(es.DocumentChecklist.signer.pending),
    ).toBeDefined();
    expect(screen.getByTestId('gate').textContent).toBe('closed');
  });

  it('opens continue once there is a signer', async () => {
    renderBlock({ signer_id: 'rep-2' });

    await waitFor(() => {
      expect(screen.getByTestId('gate').textContent).toBe('open');
    });
    expect(screen.queryByText(es.DocumentChecklist.signer.pending)).toBeNull();
  });

  it('saves the signer picked from the list together with the accepted statements', async () => {
    renderBlock({ accepted_statements: ['declaration'] });
    const trigger = await screen.findByRole('button', {
      name: (name) => name.includes(es.DocumentChecklist.signer.placeholder),
    });

    fireEvent.keyDown(trigger, { key: 'Enter' });
    fireEvent.click(
      await screen.findByRole('option', { name: 'Carlos Mendoza' }),
    );

    await waitFor(() => {
      expect(mocks.save).toHaveBeenCalledWith({
        signer_id: 'rep-2',
        accepted_statements: ['declaration'],
      });
    });
  });

  it('disables the select when no legal representative was registered', async () => {
    renderBlock({ signer_options: [] });

    const trigger = await screen.findByRole('button', {
      name: (name) => name.includes(es.DocumentChecklist.signer.none),
    });

    expect(trigger.hasAttribute('disabled')).toBe(true);
  });
});
