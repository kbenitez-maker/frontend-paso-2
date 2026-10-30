import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FormSession } from '../form-session';

const search = vi.hoisted(() => {
  const state: { bank: string | null } = { bank: 'BLCR' };
  return state;
});

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: (name: string) => (name === 'bank' ? search.bank : null),
  }),
}));

describe('FormSession preview cookie', () => {
  beforeEach(() => {
    search.bank = 'BLCR';
    document.cookie = 'fcj-form-bank=; path=/; Max-Age=0';
  });

  it('writes the preview bank cookie and clears it when the bank is gone', async () => {
    const view = render(
      <FormSession>
        <p>form</p>
      </FormSession>,
    );

    await waitFor(() => {
      expect(document.cookie).toContain('fcj-form-bank=BLCR');
    });
    expect(screen.getByText('form')).toBeTruthy();

    search.bank = null;
    view.rerender(
      <FormSession>
        <p>form</p>
      </FormSession>,
    );

    await waitFor(() => {
      expect(document.cookie).not.toContain('fcj-form-bank=BLCR');
    });
    expect(screen.getByText('form')).toBeTruthy();
  });
});
