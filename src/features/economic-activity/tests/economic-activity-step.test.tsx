import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FormSession } from '@/shared/request/form-session';
import {
  openingApi,
  resetOpeningApi,
  summaryOf,
} from '@/test/opening-sections';
import { render, screen } from '@/test/render';

const activitySection = {
  step_code: 'economic-activity',
  section_code: 'activity',
  display_name: 'Giro y sector',
  display_order: 1,
  values: {},
  fields: [
    {
      code: 'corporate_purpose',
      display_name: 'Objeto social',
      field_type: 'textarea',
      is_required: true,
      display_order: 1,
    },
  ],
};

const mocks = vi.hoisted(() => ({
  search: vi.fn<() => URLSearchParams>(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/r1/economic-activity',
  useSearchParams: mocks.search,
}));

vi.mock('@/server/api', async () => ({
  ...(await import('@/test/opening-sections')).openingQueries(),
  accountRequestQuery: (id: string) => ({
    queryKey: ['request', id],
    queryFn: () =>
      Promise.resolve({
        request_id: id,
        bank_id: 'BLNI',
        profile: { person_type: 'legal', country: 'NI' },
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

const { EconomicActivityStep } = await import('../economic-activity-step');

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    <FormSession>{children}</FormSession>
  </QueryClientProvider>
);

describe('EconomicActivityStep', () => {
  beforeEach(() => {
    resetOpeningApi();
    openingApi.sections = [summaryOf(activitySection)];
    openingApi.details = [activitySection];
    mocks.search.mockReturnValue(new URLSearchParams({ block: 'activity' }));
  });

  it('renders the activity fields the opening-request API returns', async () => {
    render(<EconomicActivityStep requestId='r1' />, { wrapper });

    expect(await screen.findByText('Objeto social')).toBeDefined();
    expect(screen.getByText('Giro y sector')).toBeDefined();
  });
});
