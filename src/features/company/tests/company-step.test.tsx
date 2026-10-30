import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FormSession } from '@/shared/request/form-session';
import { useStepGate } from '@/shared/request/step-gate';
import {
  openingApi,
  resetOpeningApi,
  summaryOf,
} from '@/test/opening-sections';
import { es, render, screen } from '@/test/render';

const identificationSection = {
  step_code: 'company',
  section_code: 'identification',
  display_name: 'Información requerida de la empresa',
  display_order: 1,
  values: { legal_name: 'Empresa Nueva S.A.' },
  fields: [
    {
      code: 'legal_name',
      display_name: 'Razón social de la empresa',
      field_type: 'text',
      is_required: true,
      display_order: 1,
    },
    {
      code: 'had_constitution_reform',
      display_name:
        '¿Ha realizado alguna reforma en la constitución de su empresa?',
      field_type: 'yes_no',
      is_required: true,
      display_order: 2,
    },
    {
      code: 'incorporation_country_id',
      display_name: 'País de constitución',
      field_type: 'catalog',
      catalog_code: 'COUNTRY',
      is_required: true,
      display_order: 8,
    },
    {
      code: 'constitution_reform_type_id',
      display_name: 'Tipo de reforma',
      field_type: 'catalog',
      catalog_code: 'CONSTITUTION_REFORM_TYPE',
      display_order: 3,
      visibility_rule: { field: 'had_constitution_reform', equals: true },
    },
  ],
};

const contactSection = {
  step_code: 'company',
  section_code: 'contact',
  display_name: 'Datos de contacto de la empresa',
  display_order: 2,
  values: {},
  fields: [
    {
      code: 'company_email',
      display_name: 'Correo electrónico',
      field_type: 'email',
      is_required: true,
      display_order: 1,
    },
    {
      code: 'company_phone',
      display_name: 'Número de teléfono',
      field_type: 'phone',
      is_required: true,
      display_order: 2,
    },
  ],
};

const declarationsSection = {
  step_code: 'company',
  section_code: 'declarations',
  display_name: 'Declaraciones por país',
  display_order: 3,
  values: {},
  fields: [
    {
      code: 'cicac_consent',
      display_name: '¿Autoriza que su información se consulte en CICAC?',
      field_type: 'yes_no',
      is_required: true,
      display_order: 1,
    },
    {
      code: 'cicac_refusal_reason_id',
      display_name:
        'Seleccione el motivo por el cual no autoriza la consulta en CICAC:',
      field_type: 'catalog',
      catalog_code: 'CICAC_REFUSAL_REASON',
      display_order: 2,
      visibility_rule: { field: 'cicac_consent', equals: false },
    },
  ],
};

const mocks = vi.hoisted(() => ({
  search: vi.fn<() => URLSearchParams>(),
  country: { value: 'NI' },
  requestMissing: false,
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/r1/company',
  useSearchParams: mocks.search,
}));

vi.mock('@/server/api', async () => ({
  ...(await import('@/test/opening-sections')).openingQueries(),
  accountRequestQuery: (id: string) => ({
    queryKey: ['request', id],
    queryFn: () =>
      mocks.requestMissing ?
        Promise.reject(new Error('404'))
      : Promise.resolve({
          request_id: id,
          bank_id: mocks.country.value === 'NI' ? 'BLNI' : 'BLPA',
          profile: { person_type: 'legal', country: mocks.country.value },
        }),
  }),
  catalogQuery: (bankId: string, name: string) => ({
    queryKey: ['catalog', bankId, name],
    queryFn: () => Promise.resolve({ results: [], count: 0 }),
  }),
  relatedPersonsQuery: (id: string) => ({
    queryKey: ['related-persons', id],
    queryFn: () => Promise.resolve({ results: [] }),
  }),
}));

const { CompanyStep } = await import('../company-step');

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    <FormSession>{children}</FormSession>
  </QueryClientProvider>
);

const continued = vi.fn<(result: boolean) => void>();

const FooterProbe = () => {
  const gate = useStepGate();
  return (
    <button
      type='button'
      onClick={() => {
        void gate.run().then(continued);
      }}
    >
      {gate.canContinue ? 'probe-continue' : 'probe-closed'}
    </button>
  );
};

const renderStep = (query = '') => {
  mocks.search.mockReturnValue(new URLSearchParams(query));
  render(
    <>
      <CompanyStep requestId='r1' />
      <FooterProbe />
    </>,
    { wrapper },
  );
};

describe('CompanyStep', () => {
  beforeEach(() => {
    mocks.country.value = 'NI';
    mocks.requestMissing = false;
    resetOpeningApi();
    openingApi.details = [
      identificationSection,
      contactSection,
      declarationsSection,
    ];
    openingApi.sections = [
      summaryOf(identificationSection),
      summaryOf(contactSection),
    ];
    continued.mockReset();
  });

  it('opens the section when the request has no bank or country yet', async () => {
    mocks.requestMissing = true;
    renderStep();

    expect(
      await screen.findByRole('textbox', {
        name: (accessible) => accessible.includes('Razón social de la empresa'),
      }),
    ).toBeDefined();
    expect(screen.getByText('País de constitución')).toBeDefined();
    expect(screen.getByText(es.Form.catalog.unavailable)).toBeDefined();
    expect(screen.getByRole('button', { name: 'probe-closed' })).toBeDefined();
  });

  it('keeps continue closed while a required field is empty', async () => {
    renderStep('block=contact');
    await screen.findByText('Datos de contacto de la empresa');

    expect(screen.getByRole('button', { name: 'probe-closed' })).toBeDefined();
    expect(openingApi.put).not.toHaveBeenCalled();
  });

  it('saves the section into the step answer before moving on', async () => {
    openingApi.payload = {
      company_email: 'info@empresa.com',
      incorporation_country_id: 'NI',
    };
    renderStep();
    await screen.findByRole('textbox', {
      name: (accessible) => accessible.includes('Razón social de la empresa'),
    });
    fireEvent.click(screen.getByRole('radio', { name: es.Form.no }));

    fireEvent.click(screen.getByRole('button', { name: 'probe-continue' }));

    await vi.waitFor(() => {
      expect(continued).toHaveBeenCalledWith(true);
    });
    expect(openingApi.put).toHaveBeenCalledWith(
      {
        payload: {
          company_email: 'info@empresa.com',
          identification: {
            legal_name: 'Empresa Nueva S.A.',
            had_constitution_reform: false,
            incorporation_country_id: 'NI',
          },
        },
        completed_at: null,
      },
      expect.anything(),
    );
  });

  it('rehydrates the section from the saved step answer', async () => {
    openingApi.payload = { contact: { company_email: 'info@empresa.com' } };
    renderStep('block=contact');

    const email = await screen.findByRole('textbox', {
      name: (accessible) => accessible.includes('Correo electrónico'),
    });
    expect(email).toHaveProperty('value', 'info@empresa.com');
  });

  it('paints only the company section the rail selected', async () => {
    renderStep();

    const name = await screen.findByRole('textbox', {
      name: (accessible) => accessible.includes('Razón social de la empresa'),
    });
    expect(name).toHaveProperty('value', 'Empresa Nueva S.A.');
    expect(
      screen.getByText('Información requerida de la empresa'),
    ).toBeDefined();
    expect(screen.queryByText('Datos de contacto de la empresa')).toBeNull();
  });

  it('opens the contact section when the rail sends block=contact', async () => {
    renderStep('block=contact');

    expect(
      await screen.findByText('Datos de contacto de la empresa'),
    ).toBeDefined();
    expect(
      screen.getByRole('textbox', {
        name: (accessible) => accessible.includes('Correo electrónico'),
      }),
    ).toBeDefined();
    expect(
      screen.queryByText('Información requerida de la empresa'),
    ).toBeNull();
  });

  it('reveals the reform type after the applicant says the company was reformed', async () => {
    renderStep();
    fireEvent.click(await screen.findByRole('radio', { name: es.Form.yes }));

    expect(await screen.findByText('Tipo de reforma')).toBeDefined();
  });

  it('reveals the CICAC refusal catalog after the applicant declines consent', async () => {
    renderStep('block=declarations');
    const question = await screen.findByRole('radiogroup', {
      name: (accessible) =>
        accessible.includes(
          '¿Autoriza que su información se consulte en CICAC?',
        ),
    });
    fireEvent.click(within(question).getByRole('radio', { name: es.Form.no }));

    expect(
      await screen.findByText(
        'Seleccione el motivo por el cual no autoriza la consulta en CICAC:',
      ),
    ).toBeDefined();
  });
});
