import { fireEvent, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { es, render, screen } from '@/test/render';

import { RequestLayout } from '..';

describe('RequestLayout', () => {
  it('renders the title and its content', () => {
    render(
      <RequestLayout title='Header title'>
        <p>Body</p>
      </RequestLayout>,
    );

    expect(screen.getByText('Header title')).toBeDefined();
    expect(screen.getByText('Body')).toBeDefined();
  });

  it('confirms before leaving to the home zone', async () => {
    const assign = vi.fn();
    vi.stubGlobal('location', { assign });
    render(<RequestLayout>Body</RequestLayout>);

    fireEvent.click(
      screen.getByRole('button', { name: es.Request.exit.label }),
    );
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog.className).toContain('w-480');
    fireEvent.click(
      within(dialog).getByRole('button', { name: es.Request.exit.label }),
    );

    expect(assign).toHaveBeenCalledWith('/home/account-requests');
    vi.unstubAllGlobals();
  });

  it('renders the rail and footer slots when given', () => {
    render(
      <RequestLayout rail={<nav>Rail</nav>} footer={<footer>Actions</footer>}>
        Body
      </RequestLayout>,
    );

    expect(screen.getByText('Rail')).toBeDefined();
    expect(screen.getByText('Actions')).toBeDefined();
  });
});
