import { act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  AutosaveProvider,
  useAutosaveReporter,
} from '@/shared/request/autosave-state';
import { es, render, screen } from '@/test/render';

import { AutosaveIndicator } from '..';

/** The active label is the only one not hidden from assistive tech (all share one cell). */
const isActive = (text: string) =>
  screen.getByText(text).getAttribute('aria-hidden') !== 'true';

describe('AutosaveIndicator', () => {
  it('starts as the static reassurance', () => {
    render(
      <AutosaveProvider>
        <AutosaveIndicator />
      </AutosaveProvider>,
    );

    expect(isActive(es.Request.autosave.idle)).toBe(true);
  });

  it('follows the save status', () => {
    let reporter: ReturnType<typeof useAutosaveReporter> | undefined;
    const Capture = () => {
      reporter = useAutosaveReporter();
      return <AutosaveIndicator />;
    };
    render(
      <AutosaveProvider>
        <Capture />
      </AutosaveProvider>,
    );

    act(() => {
      reporter?.saving();
    });
    expect(isActive(es.Request.autosave.saving)).toBe(true);
    expect(isActive(es.Request.autosave.idle)).toBe(false);

    act(() => {
      reporter?.saved();
    });
    // POC parity: the label stays static; the time lives in the tooltip.
    expect(isActive(es.Request.autosave.idle)).toBe(true);

    act(() => {
      reporter?.failed();
    });
    expect(isActive(es.Request.autosave.error)).toBe(true);
  });

  it('tells when it was last saved in the tooltip', async () => {
    let reporter: ReturnType<typeof useAutosaveReporter> | undefined;
    const Capture = () => {
      reporter = useAutosaveReporter();
      return <AutosaveIndicator />;
    };
    render(
      <AutosaveProvider>
        <Capture />
      </AutosaveProvider>,
    );

    act(() => {
      reporter?.saved();
    });
    act(() => {
      screen.getByRole('status').parentElement?.focus();
    });

    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip.textContent).toMatch(
      /^Guardado .+\. Puede salir cuando quiera/,
    );
  });
});
