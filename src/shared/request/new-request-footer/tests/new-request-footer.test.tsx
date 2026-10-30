import { fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  StepGateProvider,
  useRegisterStepGate,
} from '@/shared/request/step-gate';
import { es, render, screen } from '@/test/render';

import { NewRequestFooter } from '..';

const onContinue = vi.fn<() => Promise<boolean>>(() => Promise.resolve(false));

/** Stands in for the `/new` screen. */
const Screen = ({ canContinue }: { canContinue: boolean }) => {
  useRegisterStepGate({
    canContinue,
    isPending: false,
    nextLabel: 'Verificar empresa',
    onContinue,
  });
  return null;
};

const renderFooter = (canContinue: boolean) =>
  render(
    <StepGateProvider>
      <Screen canContinue={canContinue} />
      <NewRequestFooter />
    </StepGateProvider>,
  );

describe('NewRequestFooter', () => {
  it('goes back to the requests list of the home zone', () => {
    renderFooter(false);

    expect(
      screen
        .getByRole('link', { name: es.Steps.footer.previous })
        .getAttribute('href'),
    ).toContain('/account-requests');
  });

  it('shows the label the screen asks for and stays closed until it opens', () => {
    renderFooter(false);

    expect(
      screen
        .getByRole('button', { name: 'Verificar empresa' })
        .hasAttribute('disabled'),
    ).toBe(true);
  });

  it('runs what the screen registered when it is open', async () => {
    renderFooter(true);

    fireEvent.click(screen.getByRole('button', { name: 'Verificar empresa' }));

    await waitFor(() => {
      expect(onContinue).toHaveBeenCalledTimes(1);
    });
  });
});
