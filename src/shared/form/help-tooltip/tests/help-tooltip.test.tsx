import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { es, render, screen } from '@/test/render';

import { HelpTooltip } from '../help-tooltip';

const label = es.NewRequest.baseData.legalName.label;
const helpText = es.NewRequest.tooltips.legalName;
const triggerLabel = es.Form.tooltipTrigger.replace('{label}', label);

const mockCoarsePointer = (coarse: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: coarse && query.includes('coarse'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

describe('HelpTooltip', () => {
  beforeEach(() => {
    mockCoarsePointer(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('opens flyout help on keyboard focus for fine pointers', async () => {
    const user = userEvent.setup();
    render(<HelpTooltip label={label} text={helpText} />);

    await user.tab();

    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip.textContent).toBe(helpText);
  });

  it('opens popover help on tap for coarse pointers', async () => {
    mockCoarsePointer(true);
    const user = userEvent.setup();
    render(<HelpTooltip label={label} text={helpText} />);

    await user.click(screen.getByRole('button', { name: triggerLabel }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog.textContent).toBe(helpText);
  });
});
