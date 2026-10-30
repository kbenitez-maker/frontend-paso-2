import { Component } from 'react';

import type { OpeningCurrentSection } from '@/server/api';
import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HttpException } from '@lafise/lde-web-lib';

import { FormSession } from '@/shared/request/form-session';
import { openingApi, resetOpeningApi } from '@/test/opening-sections';
import { es, render, screen } from '@/test/render';

const mocks = vi.hoisted(() => ({
  search: vi.fn<() => URLSearchParams>(),
  requestPending: false,
  requestError: false,
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/r1/company',
  useSearchParams: mocks.search,
}));

vi.mock('@/server/api', async () => ({
  ...(await import('@/test/opening-sections')).openingQueries(),
  accountRequestQuery: (id: string) => ({
    queryKey: ['request', id],
    queryFn: () => {
      if (mocks.requestPending) return new Promise<never>(() => undefined);
      if (mocks.requestError) return Promise.reject(new Error('request down'));
      return Promise.resolve({
        request_id: id,
        bank_id: 'BLPA',
        profile: { person_type: 'legal', country: 'PA' },
      });
    },
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

const { OpeningSectionForm } = await import('..');

let caughtPayloadError = false;

class PayloadBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  override componentDidCatch(): void {
    caughtPayloadError = true;
  }

  override render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}

const identification: OpeningCurrentSection = {
  step_code: 'company',
  section_code: 'identification',
  display_name: 'Información requerida de la empresa',
  display_order: 1,
  values: { legal_name: 'Empresa Nueva S.A.' },
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

const contact: OpeningCurrentSection = {
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
      display_order: 1,
    },
  ],
};

const declarations: OpeningCurrentSection = {
  step_code: 'company',
  section_code: 'declarations',
  display_name: 'Declaraciones por país',
  display_order: 3,
  values: {},
  fields: [
    {
      code: 'cicac_consent',
      display_name: '¿Autoriza la consulta en CICAC?',
      field_type: 'yes_no',
      display_order: 1,
    },
    {
      code: 'cicac_refusal_reason_id',
      display_name: 'Número de registro CICAC',
      field_type: 'text',
      display_order: 2,
      validation_rules: {
        requiredWhen: { field: 'cicac_consent', equals: true },
      },
    },
  ],
};

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    <FormSession>{children}</FormSession>
  </QueryClientProvider>
);

const renderForm = (query = '') => {
  mocks.search.mockReturnValue(new URLSearchParams(query));
  return render(<OpeningSectionForm requestId='r1' />, { wrapper });
};

/** The requirement marker lives in the card header, apart from field labels. */
const sectionHeader = (title: string) => {
  const header = screen
    .getByRole('heading', { level: 2, name: title })
    .closest('[data-slot="card-header"]');
  if (!(header instanceof HTMLElement)) throw new Error('No card header');
  return within(header);
};

const textbox = (label: string) =>
  screen.findByRole('textbox', {
    name: (accessible) => accessible.includes(label),
  });

describe('OpeningSectionForm', () => {
  beforeEach(() => {
    resetOpeningApi();
    mocks.requestPending = false;
    mocks.requestError = false;
    openingApi.details = [identification, contact, declarations];
  });

  it('renders nothing while the request is loading', async () => {
    mocks.requestPending = true;
    const { container } = renderForm();

    await vi.waitFor(() => {
      expect(openingApi.answer).toHaveBeenCalled();
    });
    expect(container.textContent).toBe('');
  });

  it('opens when the request fails', async () => {
    mocks.requestError = true;
    renderForm();

    expect(await textbox('Razón social')).toHaveProperty(
      'value',
      'Empresa Nueva S.A.',
    );
  });

  it('renders nothing while the section is loading', async () => {
    openingApi.sectionsPending = true;
    const { container } = renderForm();

    await Promise.resolve();
    expect(container.textContent).toBe('');
  });

  it('offers a retry when the section fails with a server error', async () => {
    const user = userEvent.setup();
    openingApi.sectionsError = HttpException.fromResponseData(500, {
      error: { code: 'HTTP_500', message: 'sections down' },
    });
    renderForm();

    expect(await screen.findByText(es.Form.loadError.message)).toBeDefined();
    expect(
      screen.queryByRole('heading', { name: identification.display_name }),
    ).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();

    openingApi.sectionsError = undefined;
    await user.click(
      screen.getByRole('button', { name: es.Form.loadError.retry }),
    );

    expect(await textbox('Razón social')).toHaveProperty(
      'value',
      'Empresa Nueva S.A.',
    );
  });

  it('opens the section when the saved payload is not an object', async () => {
    caughtPayloadError = false;
    openingApi.answer.mockImplementation(() =>
      Promise.resolve({ payload: [], completed_at: null }),
    );
    mocks.search.mockReturnValue(new URLSearchParams());
    render(
      <QueryClientProvider
        client={
          new QueryClient({ defaultOptions: { queries: { retry: false } } })
        }
      >
        <FormSession>
          <PayloadBoundary>
            <OpeningSectionForm requestId='r1' />
          </PayloadBoundary>
        </FormSession>
      </QueryClientProvider>,
    );

    expect(await textbox('Razón social')).toHaveProperty(
      'value',
      'Empresa Nueva S.A.',
    );
    expect(caughtPayloadError).toBe(false);
  });

  it('opens from the section values when the saved answer cannot load', async () => {
    openingApi.answer.mockRejectedValue(new Error('answer down'));
    renderForm();

    expect(await textbox('Razón social')).toHaveProperty(
      'value',
      'Empresa Nueva S.A.',
    );
  });

  it('paints the fields in display order and skips a type it cannot render', async () => {
    renderForm();
    const legalName = await textbox('Razón social');
    const tradeName = await textbox('Nombre comercial');

    expect(screen.getAllByRole('textbox')).toEqual([legalName, tradeName]);
    expect(screen.queryByText('Firma digital')).toBeNull();
    expect(screen.getByText(es.Steps.required)).toBeDefined();
  });

  it('marks a requiredWhen section required only once its condition matches', async () => {
    const user = userEvent.setup();
    renderForm('block=declarations');
    await screen.findByText('Declaraciones por país');

    const header = sectionHeader(declarations.display_name);
    expect(header.getByText(es.Steps.optional)).toBeDefined();
    await user.click(screen.getByRole('radio', { name: es.Form.yes }));

    expect(await header.findByText(es.Steps.required)).toBeDefined();
    expect(header.queryByText(es.Steps.optional)).toBeNull();
  });

  it('starts a fresh form when the rail switches sections', async () => {
    const user = userEvent.setup();
    const { rerender } = renderForm();
    await user.type(await textbox('Nombre comercial'), 'Borrador');

    mocks.search.mockReturnValue(new URLSearchParams('block=contact'));
    rerender(<OpeningSectionForm requestId='r1' />);

    expect(await textbox('Correo electrónico')).toHaveProperty('value', '');
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
    expect(
      screen.queryByText('Información requerida de la empresa'),
    ).toBeNull();
  });
});
