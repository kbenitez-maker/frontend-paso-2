import { Component } from 'react';

import type {
  AccountRequest,
  RequestProgress,
} from '@/server/api/account-requests';
import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { flagUrlOf } from '@/lib/constants/countries';
import { STEPS } from '@/lib/constants/steps';
import { openingApi, resetOpeningApi } from '@/test/opening-sections';
import { MATRICES } from '@/test/related-party-matrix';
import { es, render, screen } from '@/test/render';

const mockPathname = vi.fn<() => string>();
const mockSearch = vi.fn<() => URLSearchParams>();
vi.mock('next/navigation', () => ({
  usePathname: mockPathname,
  useSearchParams: mockSearch,
}));

const ID = '0b9f6f1e-3c1d-4a53-9d0e-1f0f2f6a7b01';

const request = {
  bank_id: 'BLNI',
  profile: { person_type: 'legal', country: 'NI' },
} as AccountRequest;

const checklist = { waiting: false };

const progress: RequestProgress = {
  percent: 42,
  steps: STEPS.map((step) => ({
    slug: step.slug,
    state: step.slug === 'company' ? 'in_progress' : 'not_started',
    blocks: step.blocks.map((key) =>
      key === 'confirm' || key === 'legal-documents' ?
        {
          key,
          completed_fields: key === 'confirm' ? 1 : 2,
          total_fields: key === 'confirm' ? 1 : 2,
          unit: key === 'confirm' ? 'steps' : 'documents',
        }
      : step.slug === 'document-checklist' ?
        {
          key,
          completed_fields: 0,
          total_fields: key === 'financial-documents' ? 2 : 0,
          unit: 'documents',
          get waiting() {
            return checklist.waiting;
          },
        }
      : {
          key,
          completed_fields:
            step.slug !== 'company' ? 0
            : key === 'contact' ? 3
            : key === 'identification' ? 8
            : 0,
          total_fields: step.slug === 'company' ? 8 : 0,
        },
    ),
  })),
};

vi.mock('@/server/api', async () => ({
  ...(await import('@/test/related-party-matrix')).routeQueries(
    () => MATRICES.A,
  ),
  accountRequestQuery: (id: string) => ({
    queryKey: ['request', id],
    queryFn: () => Promise.resolve(request),
  }),
  requestProgressQuery: (id: string) => ({
    queryKey: ['progress', id],
    queryFn: () => Promise.resolve(progress),
  }),
  ...(await import('@/test/opening-sections')).openingQueries(),
}));

const { StepRail } = await import('..');

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

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>
    {children}
  </QueryClientProvider>
);

const renderRail = (path: string, query = '') => {
  mockPathname.mockReturnValue(path);
  mockSearch.mockReturnValue(new URLSearchParams(query));
  return render(<StepRail requestId={ID} />, { wrapper });
};

describe('StepRail', () => {
  beforeEach(() => {
    resetOpeningApi();
  });

  it('labels completed checklist blocks like the POC', async () => {
    renderRail(`/${ID}/document-checklist`);

    expect(await screen.findByText('Confirmado')).toBeDefined();
    expect(screen.getByText('2 documentos completos')).toBeDefined();
  });

  it('lists the checklist blocks waiting for the confirmation, with their counter, and hides empty people blocks', async () => {
    checklist.waiting = true;
    renderRail(`/${ID}/document-checklist`);

    expect(await screen.findByText('0/2 documentos')).toBeDefined();
    expect(
      screen.getByText(es.Steps.blocks['financial-documents']).closest('a'),
    ).toBeNull();
    expect(
      screen.getByText(es.Steps.blocks['document-declarations']).closest('a'),
    ).toBeNull();
    expect(screen.queryByText(es.Steps.blocks['board-documents'])).toBeNull();
    checklist.waiting = false;
  });

  it('links every other step in registry order', () => {
    renderRail(`/${ID}/bancanet`);
    const others = STEPS.filter((step) => step.slug !== 'bancanet');

    const stepLinks = others.map((step) =>
      screen.getByRole('link', {
        name: es.Steps[step.titleKey].title,
      }),
    );

    expect(stepLinks.map((link) => link.getAttribute('href'))).toEqual(
      others.map((step) => `/${ID}/${step.slug}`),
    );
  });

  it('does not link the current step to itself', () => {
    renderRail(`/${ID}/bancanet`);
    const title = es.Steps.bancanet.title;

    expect(screen.queryByRole('link', { name: title })).toBeNull();
    expect(
      screen.getByText(title).closest('[aria-current="step"]'),
    ).not.toBeNull();
  });

  it('opens the current step and highlights the current block', async () => {
    renderRail(`/${ID}/company`, 'block=contact');
    await screen.findByText(es.Steps.blocks.contact);

    const current = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-current') === 'step');

    expect(current.map((link) => link.getAttribute('href'))).toEqual([
      `/${ID}/company?block=contact`,
    ]);
    expect(
      screen.getByRole('link', {
        name: (name) => name.includes(es.Steps.blocks.contact),
      }).className,
    ).toContain('bg-lightest-primary-brand');
  });

  it('fills each line of a block title instead of balancing it (POC ListBox)', async () => {
    renderRail(`/${ID}/company`, 'block=contact');

    const blockTitle = await screen.findByText(es.Steps.blocks.contact);
    expect(blockTitle.className).toContain('text-wrap');
    expect(blockTitle.className).not.toContain('text-balance');
  });

  it('keeps the completion check tight to the title so it wraps on two lines', async () => {
    renderRail(`/${ID}/company`, 'block=contact');

    const blockTitle = await screen.findByText(es.Steps.blocks.contact);
    const blockLink = blockTitle.closest('a');
    expect(blockLink?.className.split(/\s+/)).toContain('gap-4');
  });

  it('hides the blocks that have no field for the request country', async () => {
    renderRail(`/${ID}/company`);

    expect(await screen.findByText(es.Steps.blocks.lawyer)).toBeDefined();
    expect(screen.queryByText(es.Steps.blocks.governance)).toBeNull();
    expect(screen.queryByText(es.Steps.blocks['parent-company'])).toBeNull();
    expect(screen.queryByText(es.Steps.blocks['tax-residence'])).toBeNull();
  });

  it('defaults the highlighted block to the first one', async () => {
    renderRail(`/${ID}/company`);
    await screen.findByText(es.Steps.blocks.lawyer);

    expect(
      screen
        .getByRole('link', {
          name: (name) => name.includes(es.Steps.blocks.identification),
        })
        .getAttribute('aria-current'),
    ).toBe('step');
  });

  it('shows the country, percent, step state and field counts', async () => {
    renderRail(`/${ID}/company`);

    expect(await screen.findByText('42%')).toBeDefined();
    expect(screen.getByText(es.Steps.rail.countries.NI)).toBeDefined();
    const railFlag = screen
      .getAllByRole('presentation')
      .find((node) => node.getAttribute('width') === '16');
    expect(railFlag?.getAttribute('src')).toBe(flagUrlOf('NI'));
    expect(railFlag?.getAttribute('width')).toBe('16');
    expect(screen.getByText(es.Steps.rail.state.in_progress)).toBeDefined();
    expect(screen.getByText('3/8 campos')).toBeDefined();
    // POC parity: a finished block reads "N campos completos" with a check.
    expect(screen.getByText('8 campos completos')).toBeDefined();
    expect(screen.getAllByLabelText(es.Steps.rail.blockComplete)).toHaveLength(
      1,
    );
  });

  it('lists the route blocks of related parties, the waiting ones unlinked with what they wait for', async () => {
    renderRail(`/${ID}/related-parties`, 'block=holder-listing');

    expect(
      await screen.findByRole('link', {
        name: (name) => name.includes(es.Steps.blocks['holder-listing']),
      }),
    ).toBeDefined();
    expect(screen.getByText(es.Steps.rail.waiting.default)).toBeDefined();
    expect(screen.getByText(es.Steps.rail.waiting.shareholders)).toBeDefined();
    expect(
      screen.queryByRole('link', {
        name: (name) => name.includes(es.Steps.blocks.shareholders),
      }),
    ).toBeNull();
    expect(
      screen.queryByText(es.Steps.blocks['trust-administrators']),
    ).toBeNull();
  });

  it('lists company sections from the opening-request API and links each one', async () => {
    openingApi.sections = [
      {
        code: 'identification',
        display_name: 'Información requerida de la empresa',
        display_order: 1,
      },
      {
        code: 'contact',
        display_name: 'Datos de contacto de la empresa',
        display_order: 2,
      },
    ];
    renderRail(`/${ID}/company`);

    expect(
      await screen.findByRole('link', {
        name: (name) => name.includes('Información requerida de la empresa'),
      }),
    ).toBeDefined();
    expect(
      screen
        .getByRole('link', {
          name: (name) => name.includes('Datos de contacto de la empresa'),
        })
        .getAttribute('href'),
    ).toBe(`/${ID}/company?block=contact`);
    expect(screen.queryByText(es.Steps.blocks.shares)).toBeNull();
  });

  it('shows filled versus total fields of each opening-request section', async () => {
    openingApi.sections = [
      {
        code: 'address',
        display_name: 'Dirección de la empresa',
        display_order: 1,
      },
    ];
    openingApi.details = [
      {
        step_code: 'company',
        section_code: 'address',
        display_name: 'Dirección de la empresa',
        display_order: 1,
        values: { address_country_id: 'PA' },
        fields: [
          {
            code: 'address_country_id',
            display_name: 'País',
            field_type: 'catalog',
            catalog_code: 'COUNTRY',
            is_required: true,
            display_order: 1,
          },
          {
            code: 'province_id',
            display_name: 'Provincia',
            field_type: 'catalog',
            catalog_code: 'PROVINCE',
            is_required: true,
            display_order: 2,
          },
          {
            code: 'district_id',
            display_name: 'Corregimiento',
            field_type: 'catalog',
            catalog_code: 'DISTRICT',
            is_required: true,
            display_order: 3,
          },
          {
            code: 'street',
            display_name: 'Calle',
            field_type: 'text',
            is_required: true,
            display_order: 4,
          },
          {
            code: 'address_detail',
            display_name: 'Dirección detallada',
            field_type: 'text',
            is_required: true,
            display_order: 5,
          },
        ],
      },
    ];
    renderRail(`/${ID}/company`, 'block=address');

    expect(
      await screen.findByRole('link', {
        name: (name) => name.includes('Dirección de la empresa'),
      }),
    ).toBeDefined();
    expect(await screen.findByText('1/5 campos')).toBeDefined();
  });

  it('counts the saved step answer and tags the company step complete', async () => {
    openingApi.sections = [
      {
        code: 'contact',
        display_name: 'Datos de contacto de la empresa',
        display_order: 1,
      },
    ];
    openingApi.details = [
      {
        step_code: 'company',
        section_code: 'contact',
        display_name: 'Datos de contacto de la empresa',
        display_order: 1,
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
            code: 'website_url',
            display_name: 'Sitio web',
            field_type: 'text',
            display_order: 2,
          },
        ],
      },
    ];
    openingApi.payload = { contact: { company_email: 'info@empresa.com' } };
    renderRail(`/${ID}/company`, 'block=contact');

    expect(await screen.findByText('1 campo completo')).toBeDefined();
    expect(screen.getByText(es.Steps.rail.state.complete)).toBeDefined();
  });

  it('keeps the company blocks on screen when the saved payload is not an object', async () => {
    caughtPayloadError = false;
    openingApi.sections = [
      {
        code: 'contact',
        display_name: 'Datos de contacto de la empresa',
        display_order: 1,
      },
    ];
    openingApi.details = [
      {
        step_code: 'company',
        section_code: 'contact',
        display_name: 'Datos de contacto de la empresa',
        display_order: 1,
        values: {},
        fields: [
          {
            code: 'company_email',
            display_name: 'Correo electrónico',
            field_type: 'email',
            is_required: true,
            display_order: 1,
          },
        ],
      },
    ];
    openingApi.answer.mockImplementation(() =>
      Promise.resolve({ payload: [], completed_at: null }),
    );
    mockPathname.mockReturnValue(`/${ID}/company`);
    mockSearch.mockReturnValue(new URLSearchParams('block=contact'));
    render(
      <QueryClientProvider client={new QueryClient()}>
        <PayloadBoundary>
          <StepRail requestId={ID} />
        </PayloadBoundary>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('0/1 campo')).toBeDefined();
    expect(caughtPayloadError).toBe(false);
  });

  it('grows the current section count when live values reveal dependents', async () => {
    openingApi.sections = [
      {
        code: 'declarations',
        display_name: 'Declaraciones por país',
        display_order: 1,
      },
    ];
    openingApi.details = [
      {
        step_code: 'company',
        section_code: 'declarations',
        display_name: 'Declaraciones por país',
        display_order: 1,
        values: {},
        fields: [
          {
            code: 'is_foreign_agent',
            display_name: '¿Es usted un agente extranjero?',
            field_type: 'yes_no',
            is_required: true,
            display_order: 1,
          },
          {
            code: 'nurae_number',
            display_name: 'Número Único de Registro de Agente Extranjero',
            field_type: 'integer',
            is_required: true,
            display_order: 2,
            visibility_rule: { field: 'is_foreign_agent', equals: true },
          },
          {
            code: 'nurae_issue_date',
            display_name: 'Fecha de emisión del NURAE',
            field_type: 'date',
            is_required: true,
            display_order: 3,
            visibility_rule: { field: 'is_foreign_agent', equals: true },
          },
          {
            code: 'nurae_expiry_date',
            display_name: 'Fecha de vencimiento del NURAE',
            field_type: 'date',
            is_required: true,
            display_order: 4,
            visibility_rule: { field: 'is_foreign_agent', equals: true },
          },
        ],
      },
    ];
    const { OpeningLiveValuesProvider, useRegisterOpeningLiveValues } =
      await import('../../opening-live-values');
    const revealed = { is_foreign_agent: true };
    const LiveValues = () => {
      useRegisterOpeningLiveValues('declarations', revealed);
      return null;
    };

    mockPathname.mockReturnValue(`/${ID}/company`);
    mockSearch.mockReturnValue(new URLSearchParams('block=declarations'));
    render(
      <QueryClientProvider client={new QueryClient()}>
        <OpeningLiveValuesProvider>
          <LiveValues />
          <StepRail requestId={ID} />
        </OpeningLiveValuesProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('1/4 campos')).toBeDefined();
  });

  it('expands and collapses a step on demand', async () => {
    renderRail(`/${ID}/company`);
    const title = es.Steps.economicActivity.title;
    // Registry-driven steps list their blocks once the request country is known.
    await screen.findByText(es.Steps.blocks.lawyer);

    expect(screen.queryByText(es.Steps.blocks.activity)).toBeNull();

    fireEvent.click(
      screen.getByRole('button', {
        name: es.Steps.rail.expand.replace('{step}', title),
      }),
    );
    expect(screen.getByText(es.Steps.blocks.activity)).toBeDefined();

    fireEvent.click(
      screen.getByRole('button', {
        name: es.Steps.rail.collapse.replace('{step}', title),
      }),
    );
    expect(screen.queryByText(es.Steps.blocks.activity)).toBeNull();
  });
});
