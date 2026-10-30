import { fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { es, render, screen } from '@/test/render';

import { StepFooter } from '..';

const previous = es.Steps.footer.previous;
const next = es.Steps.footer.next;

describe('StepFooter', () => {
  it('disables both buttons by default', () => {
    render(<StepFooter />);

    expect(
      screen.getByRole('button', { name: previous }).hasAttribute('disabled'),
    ).toBe(true);
    expect(
      screen.getByRole('button', { name: next }).hasAttribute('disabled'),
    ).toBe(true);
  });

  it('keeps continue disabled until told otherwise, even with a target', () => {
    render(<StepFooter previousHref='/a' nextHref='/b' />);

    expect(
      screen.getByRole('link', { name: previous }).getAttribute('href'),
    ).toBe('/a');
    expect(screen.queryByRole('link', { name: next })).toBeNull();
    expect(
      screen.getByRole('button', { name: next }).hasAttribute('disabled'),
    ).toBe(true);
  });

  it('links both buttons when enabled', () => {
    render(<StepFooter previousHref='/a' nextHref='/b' nextDisabled={false} />);

    expect(screen.getByRole('link', { name: next }).getAttribute('href')).toBe(
      '/b',
    );
  });

  it('renders the help slot', () => {
    render(<StepFooter help={<button type='button'>Help</button>} />);

    expect(screen.getByRole('button', { name: 'Help' })).toBeDefined();
  });

  it('runs onNext instead of linking when it is given', () => {
    const onNext = vi.fn();
    render(
      <StepFooter
        previousHref='/a'
        nextHref='/b'
        nextDisabled={false}
        onNext={onNext}
      />,
    );

    expect(screen.queryByRole('link', { name: next })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: next }));

    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('keeps onNext from firing while disabled', () => {
    const onNext = vi.fn();
    render(<StepFooter nextHref='/b' onNext={onNext} />);

    fireEvent.click(screen.getByRole('button', { name: next }));

    expect(onNext).not.toHaveBeenCalled();
  });

  it('goes back to another zone with a plain anchor', () => {
    render(<StepFooter previousExternalHref='/home/account-requests' />);

    expect(
      screen.getByRole('link', { name: previous }).getAttribute('href'),
    ).toBe('/home/account-requests');
  });

  it('lets the screen replace the continue label and run it without a target', () => {
    const onNext = vi.fn();
    render(
      <StepFooter nextLabel='Verificar' nextDisabled={false} onNext={onNext} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Verificar' }));

    expect(onNext).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: next })).toBeNull();
  });
});
