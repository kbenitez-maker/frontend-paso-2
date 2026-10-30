import type { OpeningCurrentSection } from '@/server/api';
import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OPENING_COMPANY_STEP } from '@/lib/opening';
import { StepGateProvider, useStepGate } from '@/shared/request/step-gate';
import { openingApi, resetOpeningApi } from '@/test/opening-sections';
import { es, render, screen } from '@/test/render';

import { OpeningSectionFields } from '..';

vi.mock('@/server/api', async () =>
  (await import('@/test/opening-sections')).openingQueries(),
);

const section: OpeningCurrentSection = {
  step_code: 'company',
  section_code: 'identification',
  display_name: 'Información requerida de la empresa',
  display_order: 1,
  values: {},
  fields: [
    {
      code: 'trade_name',
      display_name: 'Nombre comercial',
      field_type: 'text',
      display_order: 2,
    },
    {
      code: 'company_signature',
      display_name: 'Firma digital',
      field_type: 'signature',
      is_required: true,
      display_order: 3,
    },
    {
      code: 'legal_name',
      display_name: 'Razón social',
      field_type: 'text',
      is_required: true,
      display_order: 1,
    },
  ],
};

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>
    <StepGateProvider>{children}</StepGateProvider>
  </QueryClientProvider>
);

const GateProbe = () => {
  const gate = useStepGate();
  return (
    <button
      type='button'
      disabled={!gate.canContinue}
      onClick={() => {
        void gate.run();
      }}
    >
      {gate.isPending ? 'saving' : 'continue'}
    </button>
  );
};

describe('OpeningSectionFields', () => {
  beforeEach(() => {
    resetOpeningApi();
    openingApi.answer.mockResolvedValue({ payload: {}, completed_at: null });
  });

  it('paints the visible fields in display order and skips a type it cannot render', () => {
    render(
      <OpeningSectionFields
        requestId='0b9f6f1e-3c1d-4a53-9d0e-1f0f2f6a7b01'
        stepCode={OPENING_COMPANY_STEP}
        section={section}
        block='identification'
        savedValues={{}}
        bankId='BLPA'
        country='PA'
      />,
      { wrapper },
    );

    const names = screen
      .getAllByText(/Razón social|Nombre comercial|Firma digital/)
      .map((node) => node.textContent);
    expect(names).toEqual(['Razón social', 'Nombre comercial']);
    expect(screen.getByText(es.Steps.required)).toBeDefined();
  });

  it('holds Continue while the save is pending', async () => {
    const user = userEvent.setup();
    openingApi.put.mockImplementation(() => new Promise(() => undefined));
    render(
      <>
        <OpeningSectionFields
          requestId='0b9f6f1e-3c1d-4a53-9d0e-1f0f2f6a7b01'
          stepCode={OPENING_COMPANY_STEP}
          section={section}
          block='identification'
          savedValues={{ legal_name: 'Empresa S.A.' }}
          bankId='BLPA'
          country='PA'
        />
        <GateProbe />
      </>,
      { wrapper },
    );

    const next = await screen.findByRole('button', { name: 'continue' });
    await waitFor(() => {
      expect(next.hasAttribute('disabled')).toBe(false);
    });
    await user.click(next);

    expect(
      await screen.findByRole('button', { name: 'saving' }),
    ).toHaveProperty('disabled', true);
    expect(openingApi.put).toHaveBeenCalledTimes(1);
  });
});
