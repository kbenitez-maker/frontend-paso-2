import type { AccountRequest } from '@/server/api/account-requests';
import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FormSession } from '@/shared/request/form-session';
import { useRegisterStepGate } from '@/shared/request/step-gate';
import { openingApi, resetOpeningApi } from '@/test/opening-sections';
import { MATRICES } from '@/test/related-party-matrix';
import { es, render, screen } from '@/test/render';

/**
 * Hoisted because `FormSession` imports `next/navigation` while this file loads,
 * and the mock factory runs before a plain `const` would exist.
 * `mockRequestMissing` covers drafts with no legacy `account-requests/{id}` detail.
 */
const {
  mockPathname,
  mockSearch,
  mockCountry,
  mockRequestMissing,
  mockPush,
  holdMatrix,
  failMatrix,
} = vi.hoisted(() => ({
  mockPathname: vi.fn<() => string>(),
  mockSearch: vi.fn<() => URLSearchParams>(),
  mockCountry: vi.fn<() => AccountRequest['profile']>(),
  mockRequestMissing: vi.fn<() => boolean>(() => false),
  mockPush: vi.fn<(href: string) => void>(),
  holdMatrix: { current: false },
  failMatrix: { current: false },
}));

vi.mock('next/navigation', () => ({
  usePathname: mockPathname,
  useSearchParams: mockSearch,
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/server/api', async () => ({
  ...(await import('@/test/related-party-matrix')).routeQueries(
    () => MATRICES.A,
  ),
  relatedPartyMatrixQuery: (bankId: string, type: string) => ({
    queryKey: ['matrix', bankId, type],
    retry: false,
    queryFn: () => {
      if (holdMatrix.current) return new Promise<never>(() => undefined);
      if (failMatrix.current) return Promise.reject(new Error('matrix down'));
      return Promise.resolve(MATRICES.A);
    },
  }),
  inquiriesQuery: (id: string) => ({
    queryKey: ['inquiries', id],
    queryFn: () => Promise.resolve([]),
  }),
  accountRequestQuery: (id: string) => ({
    queryKey: ['request', id],
    queryFn: () =>
      mockRequestMissing() ?
        Promise.reject(new Error('404'))
      : Promise.resolve({ profile: mockCountry() }),
    retry: false,
  }),
  requestProgressQuery: (id: string) => ({
    queryKey: ['progress', id],
    queryFn: () => Promise.resolve({ percent: 0, steps: [] }),
  }),
  ...(await import('@/test/opening-sections')).openingQueries(),
}));

const { FormFooter } = await import('..');

/** A step that is ready to continue and saves successfully (or not). */
const OpenStep = ({ saved }: { saved: boolean }) => {
  useRegisterStepGate({
    canContinue: true,
    isPending: false,
    onContinue: () => Promise.resolve(saved),
  });
  return null;
};

/** The last step: ready, with its own label for the footer button. */
const FinishStep = () => {
  useRegisterStepGate({
    canContinue: true,
    isPending: false,
    nextLabel: 'Finish',
    onContinue: () => Promise.resolve(true),
  });
  return null;
};

const ID = '0b9f6f1e-3c1d-4a53-9d0e-1f0f2f6a7b01';

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>
    <FormSession>{children}</FormSession>
  </QueryClientProvider>
);

const renderAt = (
  path: string,
  query = '',
  country = 'NI' as const,
  step?: ReactNode,
) => {
  mockPathname.mockReturnValue(path);
  mockSearch.mockReturnValue(new URLSearchParams(query));
  mockCountry.mockReturnValue({ person_type: 'legal', country });
  render(
    <>
      {step}
      <FormFooter requestId={ID} />
    </>,
    { wrapper },
  );
};

/** "Continue" once the step on screen has opened the gate. */
const enabledNext = async () => {
  const next = await screen.findByRole('button', {
    name: es.Steps.footer.next,
  });
  await waitFor(() => {
    expect(next.hasAttribute('disabled')).toBe(false);
  });
  return next;
};

const previous = () =>
  screen.findByRole('link', { name: es.Steps.footer.previous });

describe('FormFooter', () => {
  afterEach(() => {
    mockRequestMissing.mockReturnValue(false);
    holdMatrix.current = false;
    failMatrix.current = false;
    mockPush.mockClear();
    resetOpeningApi();
  });

  it('goes back to the base documents from the very first block', async () => {
    renderAt(`/${ID}/company`);

    expect((await previous()).getAttribute('href')).toBe(
      `/${ID}/base-documents`,
    );
  });

  it('goes back to the previous visible block inside a step', async () => {
    renderAt(`/${ID}/company`, 'block=contact');

    expect((await previous()).getAttribute('href')).toBe(
      `/${ID}/company?block=identification`,
    );
  });

  it('skips hidden blocks: NI has no governance block between contact and shares', async () => {
    renderAt(`/${ID}/company`, 'block=shares');

    expect((await previous()).getAttribute('href')).toBe(
      `/${ID}/company?block=contact`,
    );
  });

  it('crosses steps when going back', async () => {
    renderAt(`/${ID}/economic-activity`);

    expect((await previous()).getAttribute('href')).toBe(
      `/${ID}/company?block=lawyer`,
    );
  });

  it('keeps continue disabled and offers the help trigger', async () => {
    renderAt(`/${ID}/company`);
    await previous();

    expect(
      screen
        .getByRole('button', { name: es.Steps.footer.next })
        .hasAttribute('disabled'),
    ).toBe(true);
    expect(
      screen.getByRole('button', { name: es.Steps.footer.help }),
    ).toBeDefined();
  });

  it('saves through the step and then goes to the next visible block', async () => {
    renderAt(`/${ID}/company`, 'block=contact', 'NI', <OpenStep saved />);

    fireEvent.click(await enabledNext());

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(`/${ID}/company?block=shares`);
    });
  });

  it('stays put when the step could not save', async () => {
    mockPush.mockClear();
    renderAt(
      `/${ID}/company`,
      'block=contact',
      'NI',
      <OpenStep saved={false} />,
    );

    fireEvent.click(await enabledNext());

    await Promise.resolve();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('navigates the company sections of the opening-request API without a country', async () => {
    const user = userEvent.setup();
    mockPush.mockClear();
    mockRequestMissing.mockReturnValue(true);
    openingApi.sections = [
      { code: 'identification', display_name: 'Empresa', display_order: 1 },
      { code: 'address', display_name: 'Dirección', display_order: 2 },
      { code: 'contact', display_name: 'Contacto', display_order: 3 },
    ];
    renderAt(`/${ID}/company`, 'block=address', 'NI', <OpenStep saved />);

    expect((await previous()).getAttribute('href')).toBe(
      `/${ID}/company?block=identification`,
    );
    await user.click(await enabledNext());

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(`/${ID}/company?block=contact`);
    });
  });

  it('holds navigation while the company overview is loading', async () => {
    openingApi.sectionsPending = true;
    renderAt(
      `/${ID}/company`,
      'block=identification',
      'NI',
      <OpenStep saved />,
    );

    expect(
      (
        await screen.findByRole('button', { name: es.Steps.footer.previous })
      ).hasAttribute('disabled'),
    ).toBe(true);
    expect(
      screen
        .getByRole('button', { name: es.Steps.footer.next })
        .hasAttribute('disabled'),
    ).toBe(true);
  });

  it('keeps navigation on references while the company overview is loading', async () => {
    openingApi.sectionsPending = true;
    renderAt(
      `/${ID}/references-accounts`,
      'block=references',
      'NI',
      <OpenStep saved />,
    );

    expect((await previous()).hasAttribute('href')).toBe(true);
    expect(
      screen
        .getByRole('button', { name: es.Steps.footer.next })
        .hasAttribute('disabled'),
    ).toBe(false);
  });

  it('keeps back to company when the related-parties matrix fails', async () => {
    failMatrix.current = true;
    renderAt(`/${ID}/economic-activity`, '', 'NI', <OpenStep saved />);

    expect((await previous()).getAttribute('href')).toBe(
      `/${ID}/company?block=lawyer`,
    );
    expect(
      screen
        .getByRole('button', { name: es.Steps.footer.next })
        .hasAttribute('disabled'),
    ).toBe(false);
  });

  it('holds the last economic-activity block while the related-parties route loads', async () => {
    holdMatrix.current = true;
    renderAt(
      `/${ID}/economic-activity`,
      'block=counterparties',
      'NI',
      <OpenStep saved />,
    );

    expect(
      (
        await screen.findByRole('button', { name: es.Steps.footer.previous })
      ).hasAttribute('disabled'),
    ).toBe(true);
    expect(
      screen
        .getByRole('button', { name: es.Steps.footer.next })
        .hasAttribute('disabled'),
    ).toBe(true);
  });

  it('stays blocked when the request has no country', async () => {
    mockRequestMissing.mockReturnValue(true);
    renderAt(`/${ID}/company`, 'block=contact', 'NI', <OpenStep saved />);

    expect(
      (
        await screen.findByRole('button', { name: es.Steps.footer.previous })
      ).hasAttribute('disabled'),
    ).toBe(true);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('leaves the form for the survey from the very last block, with the label of the step', async () => {
    renderAt(`/${ID}/signature`, '', 'NI', <FinishStep />);

    fireEvent.click(await screen.findByRole('button', { name: 'Finish' }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(`/${ID}/survey`);
    });
  });
});
