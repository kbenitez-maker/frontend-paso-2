import type { OpeningCurrentSection } from '@/server/api';
import type { RequestProgress } from '@/server/api/account-requests';
import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { STEPS } from '@/lib/constants/steps';
import {
  OpeningLiveValuesProvider,
  useRegisterOpeningLiveValues,
} from '@/shared/request/opening-live-values';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

const pending = new Set<string>();
const failed = new Set<string>();
const details = new Map<string, OpeningCurrentSection>();
let answerPayload: Record<string, unknown> = {};
let requestFailed = false;

const detailOf = (
  code: string,
  values: Record<string, unknown>,
): OpeningCurrentSection => ({
  step_code: 'company',
  section_code: code,
  display_name: code,
  display_order: 1,
  values,
  fields: [
    {
      code: 'legal_name',
      display_name: 'Razón social',
      field_type: 'text',
      is_required: true,
      display_order: 1,
    },
  ],
});

vi.mock('@/server/api', () => ({
  accountOpeningSectionsQuery: (
    id: string,
    step: string,
    section?: string,
  ) => ({
    queryKey: ['opening-sections', id, step, section],
    queryFn: () => {
      if (section !== undefined && pending.has(section)) {
        return new Promise<never>(() => undefined);
      }
      if (section !== undefined && failed.has(section)) {
        return Promise.reject(new Error('detail down'));
      }
      const custom = section === undefined ? undefined : details.get(section);
      return Promise.resolve({
        current_section:
          custom ??
          detailOf(section ?? 'contact', {
            legal_name: 'Empresa S.A.',
          }),
      });
    },
  }),
  accountOpeningStepAnswerQuery: (id: string, step: string) => ({
    queryKey: ['opening-answer', id, step],
    queryFn: () =>
      Promise.resolve({ payload: answerPayload, completed_at: null }),
  }),
  accountRequestQuery: (id: string) => ({
    queryKey: ['request', id],
    queryFn: () =>
      requestFailed ?
        Promise.reject(new Error('request down'))
      : Promise.resolve({
          bank_id: 'BLPA',
          profile: { person_type: 'legal', country: 'PA' },
        }),
  }),
}));

const { useOpeningCompanyProgress } =
  await import('../use-opening-company-progress');

const ID = '0b9f6f1e-3c1d-4a53-9d0e-1f0f2f6a7b01';

const summary = (code: string) => ({
  code,
  display_name: code,
  display_order: 1,
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

const companyPercent = Math.round(100 / STEPS.length);

const blankLegalName = { legal_name: '' };

const LiveAddress = () => {
  useRegisterOpeningLiveValues('address', blankLegalName);
  return null;
};

const withLiveValues = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    <OpeningLiveValuesProvider>
      <LiveAddress />
      {children}
    </OpeningLiveValuesProvider>
  </QueryClientProvider>
);

describe('useOpeningCompanyProgress', () => {
  afterEach(() => {
    pending.clear();
    failed.clear();
    details.clear();
    answerPayload = {};
    requestFailed = false;
  });

  it('keeps the company step in progress while a section detail is pending', async () => {
    pending.add('address');
    const { result } = renderHook(
      () =>
        useOpeningCompanyProgress(
          ID,
          [summary('contact'), summary('address')],
          undefined,
        ),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current?.steps[0]?.state).toBe('in_progress');
    });
  });

  it('keeps company in progress while a section detail fails', async () => {
    failed.add('address');
    const { result } = renderHook(
      () =>
        useOpeningCompanyProgress(
          ID,
          [summary('contact'), summary('address')],
          undefined,
        ),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current?.steps[0]?.state).toBe('in_progress');
    });
  });

  it('builds the percent from the company counts when the server has none', async () => {
    const { result } = renderHook(
      () => useOpeningCompanyProgress(ID, [summary('contact')], undefined),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current).toEqual({
        percent: companyPercent,
        steps: [
          {
            slug: 'company',
            state: 'complete',
            blocks: [{ key: 'contact', completed_fields: 1, total_fields: 1 }],
          },
        ],
      });
    });
  });

  it('keeps the server percent and prepends company when the progress omits it', async () => {
    const progress: RequestProgress = {
      percent: 42,
      steps: [{ slug: 'bancanet', state: 'not_started', blocks: [] }],
    };
    const { result } = renderHook(
      () => useOpeningCompanyProgress(ID, [summary('contact')], progress),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current?.percent).toBe(42);
      expect(result.current?.steps.map((step) => step.slug)).toEqual([
        'company',
        'bancanet',
      ]);
    });
  });

  it('returns the same progress when no section yields counts', async () => {
    const progress: RequestProgress = {
      percent: 42,
      steps: [{ slug: 'bancanet', state: 'not_started', blocks: [] }],
    };
    const { result } = renderHook(
      () => useOpeningCompanyProgress(ID, [], progress),
      { wrapper },
    );
    const { result: missing } = renderHook(
      () => useOpeningCompanyProgress(ID, [], undefined),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current).toBe(progress);
    });
    expect(missing.current).toBeUndefined();
  });

  it('replaces an existing company step instead of duplicating it', async () => {
    const progress: RequestProgress = {
      percent: 42,
      steps: [
        { slug: 'company', state: 'not_started', blocks: [] },
        { slug: 'bancanet', state: 'not_started', blocks: [] },
      ],
    };
    const { result } = renderHook(
      () => useOpeningCompanyProgress(ID, [summary('contact')], progress),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current?.steps).toEqual([
        {
          slug: 'company',
          state: 'complete',
          blocks: [{ key: 'contact', completed_fields: 1, total_fields: 1 }],
        },
        { slug: 'bancanet', state: 'not_started', blocks: [] },
      ]);
    });
    expect(result.current?.percent).toBe(42);
  });

  it('skips sections without fields or without a block', async () => {
    details.set('governance', {
      ...detailOf('governance', {}),
      fields: [],
    });
    const { result } = renderHook(
      () =>
        useOpeningCompanyProgress(
          ID,
          [summary('contact'), summary('governance'), summary('not-a-block')],
          undefined,
        ),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current?.steps[0]?.blocks).toEqual([
        { key: 'contact', completed_fields: 1, total_fields: 1 },
      ]);
    });
  });

  it('does not keep company in progress when the request fails', async () => {
    requestFailed = true;
    const contact = {
      ...detailOf('contact', { legal_name: 'Empresa S.A.' }),
      fields: [
        {
          code: 'legal_name',
          display_name: 'Razón social',
          field_type: 'text',
          is_required: true,
          display_order: 1,
        },
        {
          code: 'incorporation_country_id',
          display_name: 'País de constitución',
          field_type: 'catalog',
          catalog_code: 'COUNTRY',
          is_required: true,
          display_order: 2,
        },
        {
          code: 'company_phone',
          display_name: 'Teléfono',
          field_type: 'phone',
          is_required: true,
          display_order: 3,
        },
      ],
    };
    details.set('contact', contact);
    const { result } = renderHook(
      () => useOpeningCompanyProgress(ID, [summary('contact')], undefined),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current?.steps[0]).toEqual({
        slug: 'company',
        state: 'complete',
        blocks: [{ key: 'contact', completed_fields: 1, total_fields: 1 }],
      });
    });
  });

  it('overlays live values and the saved answer on the section values', async () => {
    details.set('contact', detailOf('contact', {}));
    details.set('address', detailOf('address', { legal_name: 'Empresa S.A.' }));
    answerPayload = { contact: { legal_name: 'Desde el guardado' } };
    const { result } = renderHook(
      () =>
        useOpeningCompanyProgress(
          ID,
          [summary('contact'), summary('address')],
          undefined,
        ),
      { wrapper: withLiveValues },
    );

    await waitFor(() => {
      expect(result.current?.steps[0]?.blocks).toEqual([
        { key: 'contact', completed_fields: 1, total_fields: 1 },
        { key: 'address', completed_fields: 0, total_fields: 1 },
      ]);
    });
  });
});
