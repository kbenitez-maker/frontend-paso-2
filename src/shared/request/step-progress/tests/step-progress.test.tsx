import type { RelatedPartyMatrix } from '@/server/api';
import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { MATRICES } from '@/test/related-party-matrix';
import { es, render, screen } from '@/test/render';

const mockPathname = vi.fn<() => string>();
const mockSearch = vi.fn<() => URLSearchParams>();
const mockMatrix = vi.fn<() => RelatedPartyMatrix>(() => MATRICES.A);

vi.mock('next/navigation', () => ({
  usePathname: mockPathname,
  useSearchParams: mockSearch,
}));

vi.mock('@/server/api', async () => ({
  ...(await import('@/test/related-party-matrix')).routeQueries(mockMatrix),
  accountRequestQuery: (id: string) => ({
    queryKey: ['request', id],
    queryFn: () => Promise.resolve({ bank_id: 'BLNI' }),
  }),
  accountOpeningSectionsQuery: (id: string, step: string) => ({
    queryKey: ['opening-sections', id, step],
    queryFn: () => Promise.resolve({ steps: [] }),
  }),
}));

const { StepProgress } = await import('..');

const ID = '0b9f6f1e-3c1d-4a53-9d0e-1f0f2f6a7b01';

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>
    {children}
  </QueryClientProvider>
);

describe('StepProgress', () => {
  it('shows the step counter and the step · block subtitle', () => {
    mockPathname.mockReturnValue(`/${ID}/company`);
    mockSearch.mockReturnValue(new URLSearchParams('block=lawyer'));
    render(<StepProgress requestId={ID} />, { wrapper });

    expect(
      screen.getByText(
        es.Steps.progress.replace('{current}', '1').replace('{total}', '7'),
      ),
    ).toBeDefined();
    expect(
      screen.getByText(
        es.Steps.subtitle
          .replace('{step}', es.Steps.company.title)
          .replace('{block}', es.Steps.blocks.lawyer),
      ),
    ).toBeDefined();
  });

  it('closes the title block with the autosave status', () => {
    mockPathname.mockReturnValue(`/${ID}/company`);
    mockSearch.mockReturnValue(new URLSearchParams('block=identification'));
    render(<StepProgress requestId={ID} />, { wrapper });

    const autosave = screen.getByText(es.Request.autosave.idle);
    const subtitle = screen.getByText(
      es.Steps.subtitle
        .replace('{step}', es.Steps.company.title)
        .replace('{block}', es.Steps.blocks.identification),
    );
    expect(subtitle.parentElement?.contains(autosave)).toBe(true);
  });

  it('falls back to the first block and renders nothing outside the form', () => {
    mockPathname.mockReturnValue(`/${ID}/bancanet`);
    mockSearch.mockReturnValue(new URLSearchParams('block=nope'));
    const { rerender, container } = render(<StepProgress requestId={ID} />, {
      wrapper,
    });

    expect(
      screen.getByText((text) => text.includes(es.Steps.blocks.superusers)),
    ).toBeDefined();

    mockPathname.mockReturnValue(`/${ID}/profile`);
    rerender(<StepProgress requestId={ID} />);
    expect(container.textContent).toBe('');
  });

  it('names the administrators block after the governing body on route B', async () => {
    mockMatrix.mockReturnValue(MATRICES.B);
    mockPathname.mockReturnValue(`/${ID}/related-parties`);
    mockSearch.mockReturnValue(new URLSearchParams('block=administrators'));
    render(<StepProgress requestId={ID} />, { wrapper });

    expect(
      await screen.findByText((text) =>
        text.includes(es.Steps.blocks['governing-body']),
      ),
    ).toBeDefined();
  });
});
