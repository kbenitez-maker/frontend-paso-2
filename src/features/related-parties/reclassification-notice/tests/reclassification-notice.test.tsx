import type { ReclassificationTrace } from '@/server/api';
import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { es, render, screen } from '@/test/render';

import { ReclassificationNotice } from '..';

const progress = vi.hoisted(() => ({ completed: 0 }));

vi.mock('@/server/api', () => ({
  requestProgressQuery: (id: string) => ({
    queryKey: ['progress', id, progress.completed],
    queryFn: () =>
      Promise.resolve({
        percent: 50,
        steps: [
          {
            slug: 'related-parties',
            state: 'in_progress',
            blocks: [
              {
                key: 'trust-administrators',
                completed_fields: progress.completed,
                total_fields: 4,
              },
            ],
          },
        ],
      }),
  }),
  relatedPersonsQuery: (id: string) => ({
    queryKey: ['related-persons', id],
    queryFn: () => Promise.resolve({ results: [] }),
  }),
  catalogQuery: (bankId: string, name: string) => ({
    queryKey: ['catalog', bankId, name],
    queryFn: () =>
      Promise.resolve(
        name === 'legal-entity-types' ?
          { results: [{ code: 'trust', name: 'Fideicomisos' }], count: 1 }
        : name === 'trust-party-roles' ?
          { results: [{ code: 'settlor', name: 'Fideicomitente' }], count: 1 }
        : { results: [], count: 0 },
      ),
  }),
}));

const trace: ReclassificationTrace = {
  legal_entity_type_before: 'corporation',
  legal_entity_type_after: 'trust',
  scenario: 'route_change',
  removed_people: ['María López', 'Carlos Ruiz'],
  roles_added: ['settlor'],
  applied_at: '2026-10-07T10:00:00.000Z',
};

const renderNotice = () => {
  const client = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(
    <ReclassificationNotice
      requestId='r1'
      bankId='BLNI'
      trace={trace}
      block='trust-administrators'
    />,
    { wrapper },
  );
};

describe('ReclassificationNotice', () => {
  it('says who the change removed and which roles are now required', async () => {
    progress.completed = 1;
    renderNotice();

    expect(
      await screen.findByText(
        /Al pasar a «Fideicomisos» se eliminó María López y Carlos Ruiz\. La nueva clasificación exige Fideicomitente\./u,
      ),
    ).toBeDefined();
    expect(
      screen.getByText(es.RelatedParties.reclassification.message, {
        exact: false,
      }),
    ).toBeDefined();
  });

  it('hides once the block on screen is complete again', async () => {
    progress.completed = 4;
    const { container } = renderNotice();

    await vi.waitFor(() => {
      expect(container.textContent).toBe('');
    });
  });
});
