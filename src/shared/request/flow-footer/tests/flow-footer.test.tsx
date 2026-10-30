import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  StepGateProvider,
  useRegisterStepGate,
} from '@/shared/request/step-gate';
import { es, render, screen } from '@/test/render';

const mocks = vi.hoisted(() => ({
  pathname: vi.fn<() => string>(),
  push: vi.fn<(href: string) => void>(),
}));

vi.mock('next/navigation', () => ({
  usePathname: mocks.pathname,
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock('@/server/api', () => ({
  inquiriesQuery: (id: string) => ({
    queryKey: ['inquiries', id],
    queryFn: () => Promise.resolve([]),
  }),
}));

const { FlowFooter } = await import('..');

const ID = '0b9f6f1e-3c1d-4a53-9d0e-1f0f2f6a7b01';

/** Stands in for the base-documents screen: opens the gate with a label. */
const Screen = ({ canContinue }: { canContinue: boolean }) => {
  useRegisterStepGate({
    canContinue,
    isPending: false,
    nextLabel: 'Continuar con la solicitud',
    onContinue: () => Promise.resolve(true),
  });
  return null;
};

const renderAt = (screenName: string, canContinue = false) => {
  mocks.pathname.mockReturnValue(`/${ID}/${screenName}`);
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <StepGateProvider>
        <Screen canContinue={canContinue} />
        <FlowFooter requestId={ID} />
      </StepGateProvider>
    </QueryClientProvider>,
  );
};

describe('FlowFooter', () => {
  beforeEach(() => {
    mocks.push.mockReset();
  });

  it('goes back to the requests list and on to the base documents from the profile', async () => {
    renderAt('profile', true);

    expect(
      screen
        .getByRole('link', { name: es.Steps.footer.previous })
        .getAttribute('href'),
    ).toBe('/home/account-requests');

    fireEvent.click(
      screen.getByRole('button', { name: 'Continuar con la solicitud' }),
    );

    await waitFor(() => {
      expect(mocks.push).toHaveBeenCalledWith(`/${ID}/base-documents`);
    });
  });

  it('goes back to the profile from the base documents', () => {
    renderAt('base-documents');

    expect(
      screen
        .getByRole('link', { name: es.Steps.footer.previous })
        .getAttribute('href'),
    ).toBe(`/${ID}/profile`);
  });

  it('keeps the base documents closed until the screen opens the gate', () => {
    renderAt('base-documents');

    expect(
      screen
        .getByRole('button', { name: 'Continuar con la solicitud' })
        .hasAttribute('disabled'),
    ).toBe(true);
  });

  it('starts the form from the base documents once the gate is open', async () => {
    renderAt('base-documents', true);

    fireEvent.click(
      screen.getByRole('button', { name: 'Continuar con la solicitud' }),
    );

    await waitFor(() => {
      expect(mocks.push).toHaveBeenCalledWith(`/${ID}/company`);
    });
  });

  it.each(['survey', 'submitted'])('has no way back on %s', (name) => {
    renderAt(name, true);

    expect(
      screen
        .getByRole('button', { name: es.Steps.footer.previous })
        .hasAttribute('disabled'),
    ).toBe(true);
  });

  it('goes on from the survey to the rated submitted screen', async () => {
    renderAt('survey', true);

    fireEvent.click(
      screen.getByRole('button', { name: 'Continuar con la solicitud' }),
    );

    await waitFor(() => {
      expect(mocks.push).toHaveBeenCalledWith(`/${ID}/submitted?rated=1`);
    });
  });

  it('leaves the submitted screen for the requests list in home', async () => {
    const assign = vi.fn<(href: string) => void>();
    vi.stubGlobal('location', { assign });
    renderAt('submitted', true);

    fireEvent.click(
      screen.getByRole('button', { name: 'Continuar con la solicitud' }),
    );

    await waitFor(() => {
      expect(assign).toHaveBeenCalledWith('/home/account-requests');
    });
    expect(mocks.push).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('renders nothing outside the flow screens', () => {
    const { container } = renderAt('company');

    expect(container.querySelector('footer')).toBeNull();
  });
});
