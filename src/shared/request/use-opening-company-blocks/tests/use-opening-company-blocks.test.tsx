import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

interface OpeningStep {
  code: string;
  sections: {
    code: string;
    display_name: string;
    display_order: number;
  }[];
}

const opening = vi.hoisted(() => {
  const state: { mode: 'ready' | 'pending' | 'error'; steps: OpeningStep[] } = {
    mode: 'ready',
    steps: [],
  };
  return state;
});

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/server/api', () => ({
  accountOpeningSectionsQuery: (id: string, step: string) => ({
    queryKey: ['opening-sections', id, step],
    queryFn: () => {
      if (opening.mode === 'pending') {
        return new Promise<never>(() => undefined);
      }
      if (opening.mode === 'error') return Promise.reject(new Error('down'));
      return Promise.resolve({ steps: opening.steps });
    },
  }),
}));

const { useOpeningCompanyBlocks } = await import('..');

const ID = '0b9f6f1e-3c1d-4a53-9d0e-1f0f2f6a7b01';

const renderBlocks = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return {
    client,
    ...renderHook(() => useOpeningCompanyBlocks(ID), { wrapper }),
  };
};

const settled = async (client: QueryClient, status: 'success' | 'error') => {
  await waitFor(() => {
    expect(
      client
        .getQueryCache()
        .findAll()
        .some((query) => query.state.status === status),
    ).toBe(true);
  });
};

describe('useOpeningCompanyBlocks', { concurrent: false }, () => {
  beforeEach(() => {
    opening.mode = 'ready';
    opening.steps = [];
  });

  it('returns no blocks while the overview is pending', () => {
    opening.mode = 'pending';
    const { result } = renderBlocks();

    expect(result.current.sections).toEqual([]);
    expect(result.current.blocks).toEqual([]);
    expect(result.current.isPending).toBe(true);
    expect(result.current.isError).toBe(false);
  });

  it('returns no blocks when the overview fails', async () => {
    opening.mode = 'error';
    const { client, result } = renderBlocks();

    await settled(client, 'error');
    expect(result.current.sections).toEqual([]);
    expect(result.current.blocks).toEqual([]);
    expect(result.current.isPending).toBe(false);
    expect(result.current.isError).toBe(true);
  });

  it('returns no blocks when the overview has no company step', async () => {
    opening.steps = [
      {
        code: 'economic-activity',
        sections: [
          { code: 'activity', display_name: 'Actividad', display_order: 1 },
        ],
      },
    ];
    const { client, result } = renderBlocks();

    await settled(client, 'success');
    expect(result.current.sections).toEqual([]);
    expect(result.current.blocks).toEqual([]);
  });

  it('keeps the API section order in the rail blocks', async () => {
    opening.steps = [
      {
        code: 'company',
        sections: [
          { code: 'contact', display_name: 'Contacto', display_order: 2 },
          {
            code: 'identification',
            display_name: 'Identificación',
            display_order: 1,
          },
        ],
      },
    ];
    const { result } = renderBlocks();

    await waitFor(() => {
      expect(result.current.blocks).toEqual(['identification', 'contact']);
    });
    expect(result.current.sections.map((section) => section.code)).toEqual([
      'contact',
      'identification',
    ]);
  });
});
