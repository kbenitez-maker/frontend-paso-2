import type { ReactNode } from 'react';

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NextIntlClientTestWrapper } from '@/test/next-intl';

import { AutosaveProvider, useAutosaveState } from '../autosave-state';
import { useAutosave } from '../use-autosave';

const mocks = vi.hoisted(() => ({ error: vi.fn() }));

vi.mock('@lafise/onyx-ui/status/toast', () => ({
  toast: { error: mocks.error },
}));

const wrapper = ({ children }: { children: ReactNode }) => (
  <NextIntlClientTestWrapper>
    <AutosaveProvider>{children}</AutosaveProvider>
  </NextIntlClientTestWrapper>
);

const setup = (save: (keys: string[]) => Promise<void>) =>
  renderHook(
    () => ({ autosave: useAutosave(save), state: useAutosaveState() }),
    { wrapper },
  );

describe('useAutosave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.error.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('saves once after the pause, with every key touched meanwhile', async () => {
    const save = vi.fn<(keys: string[]) => Promise<void>>().mockResolvedValue();
    const { result } = setup(save);

    act(() => {
      result.current.autosave.markDirty('identification');
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    act(() => {
      result.current.autosave.markDirty('location');
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(799);
    });
    expect(save).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(['identification', 'location']);
    expect(result.current.state.status).toBe('saved');
  });

  it('reports a failure, warns, and retries the key on the next change', async () => {
    const save = vi
      .fn<(keys: string[]) => Promise<void>>()
      .mockRejectedValueOnce(new Error('503'))
      .mockResolvedValue();
    const { result } = setup(save);

    act(() => {
      result.current.autosave.markDirty('location');
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });

    expect(result.current.state.status).toBe('error');
    expect(mocks.error).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.autosave.markDirty('identification');
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });

    expect(save).toHaveBeenLastCalledWith(['location', 'identification']);
    expect(result.current.state.status).toBe('saved');
  });

  it('drops a non-transient failure instead of retrying it', async () => {
    const save = vi
      .fn<(keys: string[]) => Promise<void>>()
      .mockRejectedValue(
        new TypeError('Opening step answer payload is not an object'),
      );
    const { result } = setup(save);

    act(() => {
      result.current.autosave.markDirty('location');
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });

    expect(result.current.state.status).toBe('error');
    expect(mocks.error).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.autosave.markDirty('identification');
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });

    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenLastCalledWith(['identification']);
  });

  it('flushes what is pending when the step unmounts', async () => {
    const save = vi.fn<(keys: string[]) => Promise<void>>().mockResolvedValue();
    const { result, unmount } = setup(save);

    act(() => {
      result.current.autosave.markDirty('location');
    });
    unmount();
    await Promise.resolve();

    expect(save).toHaveBeenCalledWith(['location']);
  });

  it('drops the queue on cancel', async () => {
    const save = vi.fn<(keys: string[]) => Promise<void>>().mockResolvedValue();
    const { result } = setup(save);

    act(() => {
      result.current.autosave.markDirty('location');
      result.current.autosave.cancel();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(save).not.toHaveBeenCalled();
  });
});
