import { fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { es, render, screen } from '@/test/render';

import { SummaryActions } from '../summary-actions';

const copy = es.RelatedParties.ownership.summary;

const setup = (props: Partial<Parameters<typeof SummaryActions>[0]> = {}) => {
  const onReopen = vi.fn();
  const onConfirm = vi.fn();
  render(
    <SummaryActions
      isCurrent={false}
      wasConfirmed={false}
      blocker={undefined}
      isReopening={false}
      isConfirming={false}
      onReopen={onReopen}
      onConfirm={onConfirm}
      {...props}
    />,
  );
  return { onReopen, onConfirm };
};

describe('SummaryActions', () => {
  it('confirms a ready structure', () => {
    const { onConfirm } = setup();

    expect(screen.getByText(copy.ready)).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: copy.confirm }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('reads "confirm again" for a structure calculated before', () => {
    setup({ wasConfirmed: true });

    expect(screen.getByRole('button', { name: copy.reconfirm })).toBeDefined();
  });

  it('shows what blocks the calculation and disables confirming', () => {
    setup({ blocker: 'Falta algo' });

    expect(screen.getByText('Falta algo')).toBeDefined();
    expect(
      screen
        .getByRole('button', { name: copy.confirm })
        .hasAttribute('disabled'),
    ).toBe(true);
  });

  it('disables confirming while the calculation runs', () => {
    setup({ isConfirming: true });

    expect(
      screen
        .getByRole('button', { name: copy.confirm })
        .hasAttribute('disabled'),
    ).toBe(true);
  });

  it('reopens a sealed structure, unless it is already reopening', () => {
    const { onReopen } = setup({ isCurrent: true });

    expect(screen.getByText(copy.sealedHint)).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: copy.reopen }));
    expect(onReopen).toHaveBeenCalledOnce();
  });

  it('disables reopening while it runs', () => {
    setup({ isCurrent: true, isReopening: true });

    expect(
      screen
        .getByRole('button', { name: copy.reopen })
        .hasAttribute('disabled'),
    ).toBe(true);
  });
});
